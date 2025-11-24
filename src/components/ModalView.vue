<script setup>
import { ref, onMounted, watch } from "vue";
import { supabase } from "@/lib/supabase";
import { useBatchStore } from "@/stores/batch";
import { useBatchPhaseStore } from "@/stores/batchPhase";

defineProps({ isOpen: Boolean });
const emit = defineEmits(["close"]);

const batchStore = useBatchStore();

// STATE
const locations = ref([]);
const batches = ref([]);
const filteredBatches = ref([]);
const selectedLocation = ref("");
const selectedBatch = ref("");
const productionType = ref("");
const qty = ref(0);
const damage = ref(0);
const isSubmitting = ref(false);
// --- Data produksi yang diambil dari database ---
const productionData = ref([]);
const batchPhaseStore = useBatchPhaseStore();
const phaseList = ref([]);
const selectedPhase = ref("");   // untuk dropdown

watch([selectedLocation, selectedBatch], async () => {
  if (!selectedLocation.value || !selectedBatch.value) {
    phaseList.value = [];
    return;
  }

  phaseList.value = await batchPhaseStore.fetchPhasesForBatch(
    selectedBatch.value
  );
});

watch([selectedLocation, selectedBatch], fetchProductionData);

// --- Fungsi fetch data dari DB berdasarkan lokasi & batch ---
async function fetchProductionData() {
  if (!selectedLocation.value || !selectedBatch.value) {
    productionData.value = [];
    return;
  }

  console.log("🔍 Fetching production data...");

  const { data, error } = await supabase
    .from("gh_data_production")
    .select("*")
    .eq("location_id", Number(selectedLocation.value))
    .eq("batch_id", Number(selectedBatch.value))
    .order("production_id", { ascending: false })


  if (error) {
    console.error("❌ Error fetching production:", error.message);
    productionData.value = [];
    return;
  }

  productionData.value = data;
  console.log("📦 Data produksi ditemukan:", data);
}

// --- Watcher untuk update data otomatis ---
watch([selectedLocation, selectedBatch], () => {
  fetchProductionData();
});


// ✅ Ambil data lokasi & semua batch saat awal
onMounted(async () => {
  console.log("📍 Memuat data lokasi...");
  const { data: locationData, error: locationError } = await supabase
    .from("gh_location")
    .select("*")
    .order("location_id", { ascending: true });

  if (locationError) {
    console.error("❌ Gagal memuat lokasi:", locationError.message);
  } else {
    locations.value = locationData;
    console.log("✅ Lokasi berhasil dimuat:", locations.value);
  }

  console.log("📦 Memuat data batch...");
  await batchStore.getBatches();
  batches.value = batchStore.batches;
  console.log("✅ Semua batch berhasil dimuat:", batches.value);
});

// ✅ Filter batch berdasarkan lokasi yang dipilih
watch(selectedLocation, (newLocationId) => {
  if (!newLocationId) {
    filteredBatches.value = [];
    selectedBatch.value = "";
    return;
  }

  filteredBatches.value = batches.value.filter(
    (b) => b.location_id === Number(newLocationId)
  );

  console.log(`🎯 Batch untuk lokasi #${newLocationId}:`, filteredBatches.value);
  selectedBatch.value = ""; // reset batch setiap kali ganti lokasi
});

// ✅ Submit data produksi
async function submitDataProduction() {
  if (
    !selectedLocation.value ||
    !selectedBatch.value ||
    !productionType.value ||
    qty.value <= 0
  ) {
    alert("⚠️ Harap isi semua data dengan benar sebelum submit!");
    return;
  }

  isSubmitting.value = true;

  try {
    // Cari phase_name berdasarkan phase_id yang dipilih
    const selectedPhaseObj = phaseList.value.find(
      (p) => p.phase_id === productionType.value
    );
    const phaseNameToSave = selectedPhaseObj ? selectedPhaseObj.phase_name : productionType.value;

    const payload = {
      location_id: Number(selectedLocation.value),
      batch_id: Number(selectedBatch.value),
      production_type: phaseNameToSave, // Simpan phase_name, bukan phase_id
      qty: Number(qty.value),
    };

    console.log("📤 Mengirim data ke gh_data_production:", payload);

    const { data, error } = await supabase
      .from("gh_data_production")
      .insert([payload])
      .select();

    if (error) {
      console.error("❌ Error Supabase:", error.message);
      alert(`❌ Gagal menyimpan data: ${error.message}`);
      return;
    }

    console.log("✅ Data berhasil disimpan:", data);
    alert("✅ Data berhasil disimpan ke database!");
    resetForm();
    emit("close");
  } catch (err) {
    console.error("❌ Gagal submit:", err);
    alert(`❌ Gagal submit: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  selectedLocation.value = "";
  selectedBatch.value = "";
  productionType.value = "";
  qty.value = 0;
  damage.value = 0;
}
</script>



<template>
  <!-- Overlay full screen -->
  <div
    v-if="isOpen"
    class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 p-4 transition-opacity duration-300"
    @click.self="$emit('close')"
  >
    <!-- Kotak modal -->
    <div
      class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 border-2 border-gray-100"
    >
      <!-- Header Modal -->
      <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6 rounded-t-2xl relative overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
        <div class="flex justify-between items-center relative">
          <div>
            <h2 class="text-xl font-bold text-white mb-1">Input Data Produksi</h2>
            <p class="text-sm text-blue-100">Lengkapi formulir di bawah ini</p>
          </div>
          <button 
            @click="$emit('close')" 
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition text-white hover:rotate-90 transform duration-300"
            title="Tutup"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content Modal -->
      <div class="p-6 space-y-5">
        <!-- Input Pilih location -->
        <!-- Input Pilih Location -->
<div class="space-y-2">
  <label class="text-sm font-semibold text-gray-700 block">Pilih Lokasi</label>
  <div class="relative">
    <select
      v-model="selectedLocation"
      class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 font-medium 
             focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3] focus:ring-opacity-20 
             transition appearance-none cursor-pointer hover:border-gray-300"
    >
      <option value="" selected disabled>Pilih lokasi</option>
      <option
        v-for="location in locations"
        :key="location.location_id"
        :value="location.location_id"
      >
        {{ location.location }}
      </option>
    </select>
    <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
  </div>
</div>

<!-- Input Pilih Batch (filtered berdasarkan lokasi) -->
<div class="space-y-2">
  <label class="text-sm font-semibold text-gray-700 block">Pilih Batch</label>
  <div class="relative">
    <select
      v-model="selectedBatch"
      :disabled="filteredBatches.length === 0"
      class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 font-medium 
             focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3] focus:ring-opacity-20 
             transition appearance-none cursor-pointer hover:border-gray-300 
             disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <option value="" selected disabled>
        {{ filteredBatches.length > 0 ? "Pilih Batch" : "Pilih lokasi terlebih dahulu" }}
      </option>
      <option
        v-for="batch in filteredBatches"
        :key="batch.batch_id"
        :value="batch.batch_id"
      >
        {{ batch.batch_name }}
      </option>
    </select>
    <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
  </div>
</div>

        
        <!-- Input Jenis Produksi -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-gray-700 block">Jenis Produksi</label>
          <div class="relative">
            <select 
            v-model="productionType"
            class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3] focus:ring-opacity-20 transition appearance-none cursor-pointer hover:border-gray-300">
              <option value="" disabled>Input Total Planlet</option>
              <option
                v-for="p in phaseList"
                :key="p.phase_id"
                :value="p.phase_id"
              >
                {{ p.phase_name }}
              </option>
            </select>
            <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Input Quantity -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-gray-700 block">Jumlah (Qty)</label>
          <div class="relative">
            <input
              v-model.number="qty"
              type="number"
              placeholder="Masukkan jumlah"
              class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3] focus:ring-opacity-20 transition hover:border-gray-300"
              min="0"
            />
            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
              unit
            </div>
          </div>
        </div>

        <!-- Info Box -->
        <div class="bg-blue-50 border-2 border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <div class="flex-shrink-0 w-5 h-5 text-[#0071f3] mt-0.5">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-700 font-medium">Pastikan data yang diinput sudah benar</p>
            <p class="text-xs text-gray-500 mt-1">Data akan tersimpan di database produksi</p>
          </div>
        </div>
      </div>

      <!-- Footer Modal -->
      <div class="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t-2 border-gray-100">
        <button
          @click="$emit('close')"
          class="bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-2.5 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow"
        >
          Batal
        </button>
        <button
          @click.prevent="submitDataProduction"
          :disabled="isSubmitting"
          class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-medium px-6 py-2.5 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <span v-if="!isSubmitting" class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Submit Data
          </span>
        </button>
      </div>
    </div>
  </div>
</template>