<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase.js'
import { usePhaseStore } from "@/stores/phase";

const phaseStore = usePhaseStore();

const router = useRouter()

const selectedDate = ref("");

const loadTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  selectedDate.value = `${year}-${month}-${day}`;
};

onMounted(() => {
  fetchLocations();
  loadTodayDate();
});

const formData = ref({
  location: '',
  batch: '',
  phase_name: '',
})

const locations = ref([])
const batches = ref([])

const addPhase = async () => {
  if (!formData.value.phase_name || !formData.value.batch) {
    alert("Location, Batch, dan Phase wajib diisi!");
    return;
  }

  // 1️⃣ Insert phase ke tabel gh_phase
  const { data: newPhase, error: phaseError } = await supabase
    .from("gh_phase")
    .insert([
      {
        phase_name: formData.value.phase_name,
        created_at: new Date().toISOString(),
      }
    ])
    .select()
    .single();

  if (phaseError) {
    console.error("Gagal insert phase:", phaseError);
    alert("Gagal membuat phase");
    return;
  }

  console.log("Phase sukses dibuat:", newPhase);

  // 2️⃣ Masukkan relasi batch ↔ phase ke tabel gh_batch_phase
  const { error: relError } = await supabase
    .from("gh_batch_phase")
    .insert([
      {
        batch_id: formData.value.batch,
        phase_id: newPhase.phase_id,
        created_at: new Date().toISOString()
      }
    ]);

  if (relError) {
    console.error("Gagal membuat relasi batch-phase:", relError);
    alert("Phase dibuat, tapi gagal menghubungkan ke batch");
    return;
  }

  alert("Phase berhasil ditambahkan!");

  // Reset form
  formData.value.phase_name = "";
  formData.value.location = "";
  formData.value.batch = "";
  batches.value = [];
};


onMounted(() => {
  phaseStore.fetchPhases();
});


// ======================================================
// 1. Fetch lokasi dari gh_location
// ======================================================
const fetchLocations = async () => {
  const { data, error } = await supabase
    .from('gh_location')
    .select('location_id, location')

  if (error) {
    console.error('Error fetch locations:', error)
    return
  }

  locations.value = data.map((l) => ({
    id: l.location_id,
    name: l.location,
  }))
}

// ======================================================
// 2. Fetch batch berdasarkan location_id
// ======================================================
const fetchBatchesByLocation = async (locationId) => {
  if (!locationId) {
    batches.value = []
    return
  }

  const { data, error } = await supabase
    .from('gh_batch')
    .select('batch_id, batch_name')
    .eq('location_id', locationId)

  if (error) {
    console.error('Error fetch batches:', error)
    return
  }

  batches.value = data.map((b) => ({
    id: b.batch_id,
    name: b.batch_name,
  }))
}

// ======================================================
// 3. Watcher — batch berubah ketika location berubah
// ======================================================
watch(
  () => formData.value.location,
  (newLocationId) => {
    formData.value.batch = ''
    fetchBatchesByLocation(newLocationId)
  }
)

onMounted(() => {
  fetchLocations()
})

const submitForm = () => {
  if (!formData.value.location || !formData.value.batch || !formData.value.phase) {
    alert('Mohon lengkapi semua field!')
    return
  }

  console.log(formData.value)
  alert('Data berhasil disimpan!')
}

const resetForm = () => {
  formData.value = { location: '', batch: '', phase_name: '' }
}

const goBack = () => {
  router.push('/')
}
</script>


<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center relative">
          <!-- Back Button - Left -->
          <router-link
            to="/location" 
            class="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg border border-gray-300 transition font-medium text-sm shadow-sm hover:shadow"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
            Kembali
          </router-link>
          
          <!-- Title - Center -->
          <div class="absolute left-1/2 transform -translate-x-1/2 text-center">
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3 justify-center">
              <span class="w-10 h-10 bg-gradient-to-br from-white to-white rounded-lg flex items-center justify-center text-2xl">
                🌱
              </span>
              Formulir Masukan Data
            </h1>
            <p class="text-sm text-gray-500 mt-1">Tambah data produksi Potato Grow</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Form Card -->
      <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-lg p-8">
        <div class="mb-6">
          <h2 class="text-xl font-bold text-gray-900 mb-2">Form Data Produksi</h2>
          <p class="text-sm text-gray-500">Lengkapi semua field yang diperlukan</p>
        </div>

        <div class="space-y-6">
          <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                </svg>
                Tanggal
              </label>
              <input 
                type="date" 
                disabled 
                v-model="selectedDate" 
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
              />
            </div>

          <!-- Location Field -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Location
              <span class="text-red-500 ml-1">*</span>
            </label>
            <div class="relative">
              <select
                v-model="formData.location"
                class="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 font-medium focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition appearance-none cursor-pointer hover:border-gray-300"
              >
                    <option value="" disabled>Pilih Lokasi</option>
                    <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                    {{ loc.name }}
                    </option>
              </select>
              <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Batch Field -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Batch
              <span class="text-red-500 ml-1">*</span>
            </label>
            <div class="relative">
              <select
                v-model="formData.batch"
                class="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 font-medium focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition appearance-none cursor-pointer hover:border-gray-300"
              >
                    <option value="" disabled>Pilih Batch</option>
                    <option v-for="b in batches" :key="b.id" :value="b.id">
                        {{ b.name }}
                    </option>
              </select>
              <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Phase Field -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Phase
              <span class="text-red-500 ml-1">*</span>
            </label>
            <input
                v-model="formData.phase_name"
                type="text"
                placeholder="Masukkan nama phase"
                class="w-full px-4 py-3 bg-gray-50 border rounded-lg mb-4"
            />
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              @click="resetForm"
              type="button"
              class="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3.5 rounded-xl border-2 border-gray-300 transition-all hover:border-gray-400 shadow-sm hover:shadow"
            >
              Reset
            </button>
            <button
              @click="addPhase"
              class="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Simpan Data
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>