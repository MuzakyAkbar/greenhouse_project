<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-5 h-5 fill-current">
              <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                ✏️
              </span>
              Edit Movement
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13" v-if="createdByName">
              Dibuat oleh: <span class="font-semibold">{{ createdByName || '-' }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Alert Messages -->
      <div v-if="blockedMessage" class="mb-6 rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24l0 112c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-112c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
          </svg>
          <p class="text-sm text-yellow-800 font-medium">{{ blockedMessage }}</p>
        </div>
      </div>

      <div v-if="successMsg" class="mb-6 rounded-xl border-2 border-green-300 bg-green-50 p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/>
          </svg>
          <p class="text-sm text-green-800 font-medium">{{ successMsg }}</p>
        </div>
      </div>

      <!-- Main Card -->
      <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 sm:p-8">
        <!-- Header dengan Status -->
        <div class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h2 class="text-xl font-bold text-gray-900">{{ movementName || 'Edit Movement' }}</h2>
            <p class="text-sm text-gray-500 mt-1">{{ fmtDateID(selectedDate) }}</p>
          </div>
          <span 
            v-if="headerStatusText"
            class="text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap"
            :class="headerStatusText === 'Approved' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'"
          >
            {{ headerStatusText === 'Approved' ? '✅ Approved' : '⏳ On Review' }}
          </span>
        </div>

        <!-- Divider -->
        <div class="my-6 border-t border-gray-200"></div>

        <!-- Loading State -->
        <div v-if="loading" class="space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
            <div class="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
          <div class="h-40 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>

        <template v-else>
          <!-- Form Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <!-- Tanggal -->
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <label class="block text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                </svg>
                Tanggal Movement
              </label>
              <input
                type="date"
                v-model="selectedDate"
                :disabled="isApproved"
                class="w-full text-sm font-bold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 disabled:opacity-60 p-0"
              />
            </div>

            <!-- No. Referensi -->
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <label class="block text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM112 256l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
                </svg>
                No. Referensi
              </label>
              <p class="text-sm font-bold text-gray-900">{{ movementName || '-' }}</p>
            </div>
          </div>

          <!-- Warehouse Selection -->
          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-900 mb-3">Pilih Gudang</label>
            <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <!-- Gudang Asal -->
              <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <p class="text-xs text-gray-500 font-semibold mb-2">Gudang Asal</p>
                <select
                  v-model="fromWarehouse"
                  :disabled="isApproved"
                  class="w-full bg-transparent border-0 text-sm font-bold text-gray-900 focus:outline-none focus:ring-0 disabled:opacity-60 p-0"
                >
                  <option disabled value="">Pilih Gudang Asal</option>
                  <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse">
                    {{ warehouse.name }}
                  </option>
                </select>
              </div>

              <!-- Arrow Icon -->
              <div class="hidden sm:flex items-center justify-center">
                <svg class="w-6 h-6 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/>
                </svg>
              </div>

              <!-- Gudang Tujuan -->
              <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <p class="text-xs text-gray-500 font-semibold mb-2">Gudang Tujuan</p>
                <select
                  v-model="toWarehouse"
                  :disabled="isApproved"
                  class="w-full bg-transparent border-0 text-sm font-bold text-gray-900 focus:outline-none focus:ring-0 disabled:opacity-60 p-0"
                >
                  <option disabled value="">Pilih Gudang Tujuan</option>
                  <option
                    v-for="warehouse in toWarehouseOptions"
                    :key="warehouse.id"
                    :value="warehouse"
                  >
                    {{ warehouse.name }}
                  </option>
                </select>
              </div>
            </div>

            <p
              v-if="fromWarehouse && toWarehouse && fromWarehouse.id === toWarehouse.id"
              class="text-sm text-red-600 mt-3 flex items-center gap-2"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24l0 112c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-112c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
              </svg>
              Gudang asal dan tujuan tidak boleh sama.
            </p>
          </div>

          <!-- Divider -->
          <div class="my-6 border-t border-gray-200"></div>

          <!-- Material Section -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M50.7 58.5L0 160l208 0 0-128L93.7 32C75.5 32 58.9 42.3 50.7 58.5zM240 160l208 0L397.3 58.5C389.1 42.3 372.5 32 354.3 32L240 32l0 128zm208 32L0 192 0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-224z"/>
                </svg>
                Daftar Material
              </h3>
              <button
                :disabled="!selectedBinId || modalLoading || isApproved"
                @click="openMaterialModal"
                class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                :class="!selectedBinId || modalLoading || isApproved
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white shadow-md hover:shadow-lg'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>
                Tambah Material
              </button>
            </div>

            <!-- Material List -->
            <div v-if="materials.length === 0" class="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
              <p class="text-gray-500 text-sm">Belum ada material</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(item, index) in materials"
                :key="index"
                class="bg-gray-50 border rounded-xl p-4 transition-all"
                :class="item.stock != null && item.amount > item.stock
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-200 hover:border-[#0071f3]'"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-center gap-3 flex-1">
                    <div
                      class="w-12 h-12 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    >
                      {{ (item.name || '?').charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1">
                      <p class="font-bold text-gray-900">{{ item.name || '-' }}</p>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                          {{ item.uom || '-' }}
                        </span>
                        <span v-if="item.stock != null" class="text-xs text-gray-500">
                          Stock: {{ formatNumber(item.stock) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Quantity Input -->
                  <div class="flex items-center gap-3">
                    <input
                      v-model.number="item.amount"
                      type="number"
                      min="0"
                      :disabled="isApproved"
                      class="w-24 border-2 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 transition disabled:opacity-50 disabled:bg-gray-100"
                      :class="item.stock != null && item.amount > item.stock
                        ? 'border-red-500 text-red-600 focus:ring-red-500'
                        : 'border-gray-300 text-gray-900 focus:ring-[#0071f3] focus:border-[#0071f3]'"
                      placeholder="0"
                    />
                    <button
                      @click="removeMaterial(index)"
                      :disabled="isApproved"
                      class="text-red-500 hover:text-red-700 transition disabled:opacity-50"
                    >
                      <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                        <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="my-8 border-t border-gray-200"></div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3 justify-end">
            <button
              @click="goBack"
              class="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              @click="submitUpdate"
              :disabled="submitLoading || isApproved"
              class="flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="!submitLoading" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-242.7c0-17-6.7-33.3-18.7-45.3L352 50.7C340 38.7 323.7 32 306.7 32L64 32z"/>
              </svg>
              <div v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ submitLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <footer class="text-center py-10 mt-8 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>

    <!-- Modal Pilih Material -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6 relative">
        <button
          @click="showModal = false"
          class="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition"
        >
          <svg class="w-5 h-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
            <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
          </svg>
        </button>
        
        <div class="text-center">
          <div class="w-12 h-12 bg-gradient-to-br from-[#0071f3] to-[#0060d1] rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M50.7 58.5L0 160l208 0 0-128L93.7 32C75.5 32 58.9 42.3 50.7 58.5zM240 160l208 0L397.3 58.5C389.1 42.3 372.5 32 354.3 32L240 32l0 128zm208 32L0 192 0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-224z"/>
            </svg>
          </div>
          
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Pilih Material</h2>
          <p class="text-sm text-gray-500 mb-6">Pilih material dari gudang asal</p>
          
          <!-- Search -->
          <div class="relative mb-4">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Cari material..."
              class="w-full border-2 border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-[#0071f3]"
            />
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
            </svg>
          </div>

          <!-- List -->
          <div class="max-h-96 overflow-y-auto">
            <div v-if="modalLoading" class="text-center py-8 text-gray-500">
              <div class="w-8 h-8 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Memuat data...
            </div>

            <div v-else-if="availableItems.length === 0" class="text-center py-8 text-gray-500">
              Tidak ada material tersedia
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(item, index) in filteredItems"
                :key="index"
                @click="selectItem(item)"
                class="flex items-center gap-3 border-2 border-gray-200 rounded-xl p-3 cursor-pointer hover:border-[#0071f3] hover:bg-blue-50 transition-all"
              >
                <div
                  class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                >
                  {{ item.name.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 text-left">
                  <p class="font-semibold text-gray-900 truncate">{{ item.name }}</p>
                  <p class="text-xs text-gray-500">
                    Stock: {{ formatNumber(item.stock) }} {{ item.uom || '' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import openbravoApi from '@/lib/openbravo'

// ===== Props dari route
const props = defineProps({
  id: { type: String, required: true },
})

const router = useRouter()

// ===== STATE
const loading = ref(true)
const submitLoading = ref(false)
const successMsg = ref('')
const blockedMessage = ref('')

// header & status
const movementName = ref('')
const isApproved = ref(false)
const headerStatusText = ref('')
const createdByName = ref('')

// tanggal
const selectedDate = ref('')

// warehouses & bins
const warehouses = ref([])
const fromWarehouse = ref('')
const toWarehouse = ref('')

const binsFrom = ref([]) // daftar bin gudang asal
const binsTo = ref([]) // daftar bin gudang tujuan
const selectedBinId = ref('') // bin (locator) asal
const selectedBinIdTo = ref('') // bin (locator) tujuan
const binLoading = ref(false)
const binLoadingTo = ref(false)

// materials
const materials = ref([]) // { productId, name, uomId, uom, amount, stock?, color }
const availableItems = ref([]) // untuk modal ambil dari bin

// modal
const showModal = ref(false)
const modalLoading = ref(false)
const searchQuery = ref('')

// ===== UTIL
const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0)
const randColor = () => {
  const palette = ['#CDB4DB', '#BDE0FE', '#FFC8DD', '#A2D2FF', '#CFE9A8', '#FFEE93']
  return palette[Math.floor(Math.random() * palette.length)]
}
const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const fmtDateID = (yyyyMmDd) => {
  if (!yyyyMmDd) return '-'
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1, 10, 0, 0)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dt)
}

// ===== Status badge (samakan dengan Detail)
const statusBadgeClass = (status) => {
  if (status === 'Approved') return 'bg-[#00c03d] text-white border-[#00c03d]'
  if (status === 'Rejected') return 'bg-[#ecf2ff] text-[#2465bc] border-[#ecf2ff]'
  return 'bg-[#004492] text-white border-[#004492] shadow-xl'
}

// ===== API helpers
const computeStatus = (row) => {
  const posted = (row.posted ?? '').toString().trim().toUpperCase()
  const processed = !!row.processed
  if (processed && (posted === 'Y' || posted === 'D')) return 'Approved'
  return 'On Review'
}

const fetchMovementHeader = async (id) => {
  const { data } = await openbravoApi.get(
    '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovement',
    {
      params: {
        _where: `id='${id}'`,
        _startRow: 0,
        _endRow: 1,
        _noCount: true,
        _selectedProperties: 'id,name,movementDate,processed,posted,createdBy',
      },
    },
  )
  return data?.response?.data?.[0] || null
}

const fetchMovementLines = async (id) => {
  const { data } = await openbravoApi.get(
    '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine',
    {
      params: {
        _where: `movement='${id}'`,
        _noCount: true,
        _selectedProperties:
          'id,product,product$_identifier,movementQuantity,uOM,uOM$_identifier,storageBin,newStorageBin,storageBin$_identifier,newStorageBin$_identifier',
      },
    },
  )
  return data?.response?.data || []
}

const fetchLocatorWarehouse = async (locatorId) => {
  if (!locatorId) return { warehouseId: null, warehouseName: null, locatorName: null }
  const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', {
    params: {
      _where: `id='${locatorId}'`,
      _selectedProperties: 'id,warehouse,warehouse$_identifier,searchKey',
      _noCount: true,
      _startRow: 0,
      _endRow: 1,
    },
  })
  const row = data?.response?.data?.[0]
  return {
    warehouseId: row?.warehouse ?? null,
    warehouseName: row?.['warehouse$_identifier'] ?? null,
    locatorName: row?.searchKey ?? null,
  }
}

const loadWarehouses = async () => {
  const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Warehouse', {
    params: { _noCount: true, _selectedProperties: 'id,name,client,organization' },
  })
  warehouses.value = (data?.response?.data || []).map((w) => ({
    id: w.id,
    name: w.name,
    clientId: w.client,
    organizationId: w.organization,
  }))
}

const loadBinsForWarehouse = async (warehouseId) => {
  if (!warehouseId) return []
  const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', {
    params: {
      _where: `M_Warehouse_ID='${warehouseId}'`,
      _noCount: true,
      _selectedProperties: 'id,searchKey',
    },
  })
  const rows = data?.response?.data || []
  return rows.map((r) => ({ id: r.id, name: r.searchKey || r._identifier || 'Bin' }))
}

const loadMaterialsByBin = async (locatorId) => {
  if (!locatorId) {
    availableItems.value = []
    return
  }
  modalLoading.value = true
  try {
    const { data } = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail',
      { params: { _where: `M_Locator_ID='${locatorId}' AND quantityOnHand > 0`, _noCount: true } },
    )
    const rows = data?.response?.data || []
    availableItems.value = rows.map((r) => ({
      productId: r.product,
      name: r['product$_identifier'] || '(Tanpa Nama Produk)',
      uomId: r.uOM,
      uom: r['uOM$_identifier'] || null,
      stock: r.quantityOnHand ?? 0,
      storageBin: r.storageBin,
      color: randColor(),
    }))
  } finally {
    modalLoading.value = false
  }
}

// ===== INIT
onMounted(async () => {
  loading.value = true
  try {
    await loadWarehouses()

    // Header
    const head = await fetchMovementHeader(props.id)
    if (!head) {
      blockedMessage.value = 'Dokumen tidak ditemukan.'
      return
    }
    movementName.value = head.name || '-'
    selectedDate.value = head.movementDate || formatDate(new Date())
    createdByName.value = head?.['createdBy$_identifier'] || '-'

    const statusText = computeStatus(head)
    headerStatusText.value = statusText
    isApproved.value = statusText === 'Approved'
    if (isApproved.value) {
      blockedMessage.value =
        'Dokumen sudah Approved (processed + posted). Perubahan tidak diperbolehkan.'
    }

    // Lines
    const lines = await fetchMovementLines(props.id)
    if (lines.length > 0) {
      // deteksi gudang asal/tujuan dari locator baris pertama
      const first = lines[0]
      const [fromWh, toWh] = await Promise.all([
        fetchLocatorWarehouse(first.storageBin),
        fetchLocatorWarehouse(first.newStorageBin),
      ])

      // set warehouses
      fromWarehouse.value = warehouses.value.find((w) => w.id === fromWh.warehouseId) || ''
      toWarehouse.value = warehouses.value.find((w) => w.id === toWh.warehouseId) || ''

      // load daftar bin untuk kedua gudang
      binLoading.value = true
      binLoadingTo.value = true
      try {
        binsFrom.value = await loadBinsForWarehouse(fromWarehouse.value?.id)
        binsTo.value = await loadBinsForWarehouse(toWarehouse.value?.id)
      } finally {
        binLoading.value = false
        binLoadingTo.value = false
      }

      // set selected bin (asal/tujuan)
      selectedBinId.value = first.storageBin || ''
      selectedBinIdTo.value = first.newStorageBin || ''

      // map materials dari semua lines
      materials.value = lines.map((r) => ({
        lineId: r.id,
        productId: r.product,
        name: r['product$_identifier'] || '(Tanpa Nama Produk)',
        amount: r.movementQuantity ?? 0,
        uomId: r.uOM,
        uom: r['uOM$_identifier'] || null,
        stock: null, // bisa diload dari storage detail jika perlu
        color: randColor(),
      }))
    }
  } catch (e) {
    blockedMessage.value = 'Gagal memuat data. Periksa koneksi atau log server.'
    console.error(e)
  } finally {
    loading.value = false
  }
})

// ===== WATCH
watch(fromWarehouse, async (fw, old) => {
  // Jika gudang asal berubah, kosongkan material agar tidak tercampur
  if ((fw && old && fw.id !== old.id) || (!fw && old)) {
    materials.value = []
    availableItems.value = []
    searchQuery.value = ''
    showModal.value = false
  }

  if (!fw) {
    binsFrom.value = []
    selectedBinId.value = ''
    return
  }

  // Muat ulang bin untuk gudang asal yang baru
  binsFrom.value = await loadBinsForWarehouse(fw.id)

  // Pilih default bin asal (atau kosongkan jika tidak ada)
  if (!binsFrom.value.find((b) => b.id === selectedBinId.value)) {
    selectedBinId.value = binsFrom.value[0]?.id || ''
  }
})

watch(toWarehouse, async (tw) => {
  if (!tw) {
    binsTo.value = []
    selectedBinIdTo.value = ''
    return
  }
  binsTo.value = await loadBinsForWarehouse(tw.id)
  if (!binsTo.value.find((b) => b.id === selectedBinIdTo.value)) {
    selectedBinIdTo.value = binsTo.value[0]?.id || ''
  }
})

// tujuan: semua warehouse kecuali asal
const toWarehouseOptions = computed(() =>
  warehouses.value.filter((w) => !fromWarehouse.value || w.id !== fromWarehouse.value.id),
)

// modal filter
const filteredItems = computed(() =>
  availableItems.value.filter((item) =>
    item.name.toLowerCase().includes((searchQuery.value || '').toLowerCase()),
  ),
)

// ===== MODAL actions
const openMaterialModal = async () => {
  if (!selectedBinId.value) return
  showModal.value = true
  await loadMaterialsByBin(selectedBinId.value)
}
const selectItem = (item) => {
  const idx = materials.value.findIndex((m) => m.productId === item.productId)
  if (idx >= 0) {
    showModal.value = false
    return
  }
  materials.value.push({
    productId: item.productId,
    name: item.name,
    uomId: item.uomId,
    uom: item.uom,
    stock: item.stock,
    amount: 0,
    color: item.color,
  })
  showModal.value = false
}
const removeMaterial = (index) => {
  materials.value.splice(index, 1)
}

// ===== VALIDASI
const validateBeforeSave = () => {
  if (!fromWarehouse.value || !toWarehouse.value)
    return 'Pilih gudang asal dan tujuan terlebih dulu.'
  if (fromWarehouse.value.id === toWarehouse.value.id)
    return 'Gudang asal dan tujuan tidak boleh sama.'
  if (!selectedBinId.value) return 'Bin dari gudang asal tidak ditemukan.'
  if (!selectedBinIdTo.value) return 'Bin dari gudang tujuan tidak ditemukan.'
  if (materials.value.length === 0) return 'Tambahkan minimal 1 material.'
  if (materials.value.some((m) => !m.amount || m.amount <= 0))
    return 'Jumlah material harus lebih dari 0.'
  const over = materials.value.find((m) => m.stock != null && m.amount > m.stock)
  if (over) return `Jumlah untuk ${over.name} melebihi stok tersedia!`
  return ''
}

// ===== SUBMIT (UPDATE)
const submitUpdate = async () => {
  if (isApproved.value) return
  const err = validateBeforeSave()
  if (err) {
    alert(err)
    return
  }

  submitLoading.value = true
  successMsg.value = ''
  try {
    // 1) Update header
    await openbravoApi.put(
      `/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovement/${props.id}`,
      {
        data: [{ movementDate: selectedDate.value }],
      },
    )

    // 2) Ambil semua lines lama
    const old = await fetchMovementLines(props.id)
    const oldIds = (old || []).map((x) => x.id)

    // 3) Hapus semua lines lama (simple strategy)
    for (const lid of oldIds) {
      await openbravoApi.delete(
        `/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine/${lid}`,
      )
    }

    // 4) Buat lines baru dari form
    const lines = materials.value.map((m) => ({
      _entityName: 'MaterialMgmtInternalMovementLine',
      movement: props.id,
      storageBin: selectedBinId.value,
      newStorageBin: selectedBinIdTo.value,
      product: m.productId,
      movementQuantity: m.amount,
      uOM: m.uomId || undefined,
    }))
    await openbravoApi.post(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine',
      { data: lines },
    )

    successMsg.value = 'Perubahan berhasil disimpan.'
  } catch (e) {
    console.error('Update gagal:', e)
    alert('Gagal menyimpan perubahan. Lihat console untuk detail.')
  } finally {
    submitLoading.value = false
  }
}

// ===== NAV
const goBack = () => router.back()
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: #0071f3;
  border-radius: 10px;
}
</style>
