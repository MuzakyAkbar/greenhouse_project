<template>
  <div
    class="relative inline-block"
    @mouseenter="open = true"
    @mouseleave="open = false"
  >
    <button
      class="inline-flex items-center justify-center text-white bg-blue-600 box-border border border-transparent hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 shadow-md font-medium leading-5 rounded-lg text-sm px-5 py-2.5 focus:outline-none transition-all duration-200 hover:shadow-lg active:scale-95"
      type="button"
      @click="open = !open"
    >
      <span>{{
        selectedItem ? selectedItem._identifier : "Semua Lokasi"
      }}</span>
      <svg
        class="w-4 h-4 ms-2 -me-0.5 transition-transform duration-300"
        :class="{ 'rotate-180': open }"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m19 9-7 7-7-7"
        />
      </svg>
    </button>

    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-show="open"
        class="absolute right-0 mt-2 z-10 bg-white border border-gray-200 rounded-lg shadow-xl w-56 overflow-hidden"
      >
        <ul
          class="p-2 text-sm text-gray-700 font-medium max-h-64 overflow-y-auto"
        >
          <li v-if="loading" class="space-y-2">
            <div
              v-for="i in 3"
              :key="i"
              class="animate-pulse flex items-center space-x-2 p-2"
            >
              <div class="h-4 bg-gray-200 rounded flex-1"></div>
            </div>
          </li>

          <li
            v-else-if="error"
            class="p-3 text-red-600 text-xs flex items-center space-x-2 bg-red-50 rounded-lg"
          >
            <span>{{ error }}</span>
          </li>

          <li
            v-else-if="menuItems.length === 0"
            class="p-3 text-center text-gray-500 text-xs"
          >
            Tidak ada data
          </li>

          <template v-else>
            <li class="mb-1 border-b border-gray-100 pb-1">
              <button
                @click="resetSelection"
                class="inline-flex items-center w-full p-2.5 text-left rounded-lg transition-all duration-150 group"
                :class="[
                  selectedItem === null
                    ? 'bg-blue-100 text-blue-700 font-bold'
                    : 'hover:bg-gray-100 text-gray-700',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  :class="
                    selectedItem === null ? 'text-blue-600' : 'text-gray-400'
                  "
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>

                <span class="truncate flex-1">Tampil Semuanya</span>

                <svg
                  v-if="selectedItem === null"
                  class="w-4 h-4 ml-2 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </li>

            <li
              v-for="(item, index) in menuItems"
              :key="item.id"
              class="transition-all duration-150"
              :style="{ transitionDelay: `${index * 30}ms` }"
            >
              <button
                @click="selectItem(item)"
                class="inline-flex items-center w-full p-2.5 text-left rounded-lg transition-all duration-150 group"
                :class="[
                  selectedItem?.id === item.id
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2 transition-colors duration-150"
                  :class="[
                    selectedItem?.id === item.id
                      ? 'text-blue-600'
                      : 'text-gray-400 group-hover:text-gray-600',
                  ]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>

                <span class="truncate flex-1">{{ item._identifier }}</span>

                <svg
                  v-if="selectedItem?.id === item.id"
                  class="w-4 h-4 ml-2 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </li>
          </template>
        </ul>

        <div
          v-if="!loading && !error && menuItems.length > 0"
          class="border-t border-gray-200 px-3 py-2 text-xs text-gray-500 bg-gray-50"
        >
          {{ menuItems.length }} lokasi tersedia
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import openbravoApi from "@/lib/openbravo";

const open = ref(false);
const menuItems = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedItem = ref(null);
const emit = defineEmits(["select"]);

// Function untuk memilih item spesifik
function selectItem(item) {
  selectedItem.value = item;
  emit("select", item); // Mengirim object item
  open.value = false;
  console.log("Item dipilih:", item);
}

// Function BARU untuk mereset pilihan (Tampil Semuanya)
function resetSelection() {
  selectedItem.value = null;
  emit("select", null); // Mengirim null ke parent agar filter dimatikan
  open.value = false;
  console.log("Filter di-reset: Tampil Semuanya");
}

async function fetchMenu() {
  try {
    loading.value = true;
    error.value = null;

    const res = await openbravoApi.get(
      "/org.openbravo.service.json.jsonrest/Warehouse"
    );

    menuItems.value = res.data?.response?.data || [];
  } catch (err) {
    console.error(err);
    error.value = "Gagal mengambil data";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchMenu();
});
</script>
