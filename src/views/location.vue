<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <router-link
              to="/dashboard"
              class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-5 h-5 fill-current">
                <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z"/>
              </svg>
            </router-link>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                  📍
                </span>
                Manajemen Lokasi & Batch
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Kelola lokasi kebun dan batch produksi</p>
            </div>
          </div>
          <router-link
            to="/add-location"
            class="flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white px-5 py-2.5 rounded-lg transition font-medium text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
            </svg>
            Tambah Lokasi
          </router-link>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Stats Overview -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Ringkasan</h2>
          <button
            @click="downloadAllQRPDF"
            :disabled="isGenerating || locationStore.locations.length === 0"
            class="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition font-medium text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="!isGenerating" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
              <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM216 232V334.1l31-31c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-72 72c-9.4 9.4-24.6 9.4-33.9 0l-72-72c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l31 31V232c0-13.3 10.7-24 24-24s24 10.7 24 24z"/>
            </svg>
            <div v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ isGenerating ? 'Generating...' : 'Download All QR (PDF)' }}
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total Lokasi</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ locationStore.locations.length }}</h2>
            <p class="text-xs text-gray-500">🏡 Kebun aktif</p>
          </div>
          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total Batch</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ batchStore.batches.length }}</h2>
            <p class="text-xs text-gray-500">📦 Batch terdaftar</p>
          </div>
          <div class="bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div class="relative">
              <p class="text-sm font-semibold opacity-90 mb-2">Rata-rata Batch/Lokasi</p>
              <h2 class="text-4xl font-bold mb-1">{{ avgBatchPerLocation }}</h2>
              <p class="text-xs opacity-75">📊 Efisiensi distribusi</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="locationStore.loading || batchStore.loading" class="text-center py-12">
        <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-500 mt-4">Memuat data...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="locationStore.locations.length === 0" class="text-center py-16">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-5xl">📍</span>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Belum Ada Lokasi</h3>
        <p class="text-gray-500 mb-6">Tambahkan lokasi pertama Anda untuk memulai</p>
        <router-link
          to="/add-location"
          class="inline-block bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white px-6 py-3 rounded-lg transition font-medium shadow-md hover:shadow-lg"
        >
          Tambah Lokasi
        </router-link>
      </div>

      <!-- Location List -->
      <div v-else>
        <div class="mb-4">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Daftar Lokasi</h2>
        </div>

        <div class="space-y-6">
          <div
            v-for="location in locationStore.locations"
            :key="location.location_id"
            class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden"
          >
            <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-4">
                  <div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                    🏡
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold text-white mb-1">{{ location.location }}</h2>
                    <p class="text-sm text-blue-100">{{ getBatchesByLocation(location.location_id).length }} Batch Aktif</p>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="openAddBatchModal(location)"
                    class="bg-white hover:bg-gray-50 text-[#0071f3] font-medium px-4 py-2.5 rounded-xl transition-all text-sm shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                    </svg>
                    Batch
                  </button>
                </div>
              </div>
            </div>
            
            <div class="p-6">
              <div v-if="getBatchesByLocation(location.location_id).length === 0" class="text-center py-8 text-gray-500">
                Belum ada batch di lokasi ini
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="batch in getBatchesByLocation(location.location_id)"
                  :key="batch.batch_id"
                  class="group bg-gray-50 hover:bg-blue-50 rounded-xl p-4 transition-all border-2 border-transparent hover:border-[#0071f3]"
                >
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="flex items-center gap-3 flex-1">
                      <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {{ batch.batch_name?.charAt(0) || 'B' }}
                      </div>
                      <div class="flex-1">
                        <p class="font-semibold text-gray-900 group-hover:text-[#0071f3] transition">{{ batch.batch_name }}</p>
                        <p class="text-xs text-gray-500 mt-0.5">Status: {{ batch.status || 'Aktif' }}</p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button
                        @click="generateQR(location.location, batch.batch_name)"
                        class="bg-white hover:bg-gray-700 text-gray-700 hover:text-white border-2 border-gray-200 hover:border-gray-700 font-medium px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow text-sm flex items-center gap-2"
                      >
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clip-rule="evenodd"/>
                        </svg>
                        QR
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>

    <!-- Add/Edit Location Modal -->
    <div
      v-if="showLocationModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeLocationModal"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">
          {{ editingLocation ? 'Edit Lokasi' : 'Tambah Lokasi' }}
        </h2>
        <form @submit.prevent="submitLocation">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Nama Lokasi</label>
            <input
              v-model="locationForm.location_name"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0071f3] focus:border-transparent"
              placeholder="Contoh: Kebun 1"
            />
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              @click="closeLocationModal"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="locationStore.loading"
              class="flex-1 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {{ locationStore.loading ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add/Edit Batch Modal -->
    <div
      v-if="showBatchModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeBatchModal"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">
          {{ editingBatch ? 'Edit Batch' : 'Tambah Batch' }}
        </h2>
        <form @submit.prevent="submitBatch">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Lokasi</label>
            <select
              v-model="batchForm.location_id"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0071f3] focus:border-transparent"
            >
              <option value="">Pilih Lokasi</option>
              <option v-for="loc in locationStore.locations" :key="loc.location_id" :value="loc.location_id">
                {{ loc.location }}
              </option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Nama Batch</label>
            <input
              v-model="batchForm.batch_name"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0071f3] focus:border-transparent"
              placeholder="Contoh: Batch Planlet Kentang A"
            />
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              @click="closeBatchModal"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="batchStore.loading"
              class="flex-1 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {{ batchStore.loading ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- QR Code Modal -->
    <div
      v-if="showQRModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showQRModal = false"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6 relative">
        <button
          @click="showQRModal = false"
          class="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition"
        >
          <svg class="w-5 h-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
            <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
          </svg>
        </button>
        
        <div class="text-center">
          <div class="w-12 h-12 bg-gradient-to-br from-[#0071f3] to-[#0060d1] rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clip-rule="evenodd"/>
            </svg>
          </div>
          
          <h2 class="text-2xl font-bold text-gray-900 mb-2">QR Code</h2>
          <p class="text-sm text-gray-500 mb-6">Scan untuk auto-fill lokasi & batch</p>
          
          <div class="bg-gray-50 rounded-xl p-6 mb-6">
            <canvas ref="qrCanvas" class="mx-auto border-4 border-white shadow-lg rounded-lg"></canvas>
            <div class="mt-4 space-y-1">
              <p class="text-sm font-semibold text-gray-700">📍 {{ selectedQRInfo?.location }}</p>
              <p class="text-sm font-semibold text-gray-700">🏷️ {{ selectedQRInfo?.batch }}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              @click="downloadPDF"
              :disabled="isGenerating"
              class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg v-if="!isGenerating" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM216 232V334.1l31-31c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-72 72c-9.4 9.4-24.6 9.4-33.9 0l-72-72c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l31 31V232c0-13.3 10.7-24 24-24s24 10.7 24 24z"/>
              </svg>
              <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isGenerating ? 'Generating...' : 'Download PDF' }}
            </button>
            <button
              @click="downloadQR"
              class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold py-3 rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
              </svg>
              Download PNG
            </button>
            <button
              @click="showQRModal = false"
              class="sm:col-span-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useLocationStore } from '../stores/location'
import { useBatchStore } from '../stores/batch'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'

const locationStore = useLocationStore()
const batchStore = useBatchStore()

// Modal states
const showLocationModal = ref(false)
const showBatchModal = ref(false)
const showQRModal = ref(false)

// Form states
const locationForm = ref({
  location_name: ''
})

const batchForm = ref({
  location_id: '',
  batch_name: ''
})

const editingLocation = ref(null)
const editingBatch = ref(null)

// QR Code states
const qrCanvas = ref(null)
const qrDataURL = ref('')
const selectedQRInfo = ref(null)
const isGenerating = ref(false)

// Computed
const avgBatchPerLocation = computed(() => {
  if (locationStore.locations.length === 0) return '0.0'
  const avg = batchStore.batches.length / locationStore.locations.length
  return avg.toFixed(1)
})

// Methods
const getBatchesByLocation = (locationId) => {
  return batchStore.batches.filter(b => b.location_id === locationId)
}

// Location CRUD
const openAddLocationModal = () => {
  editingLocation.value = null
  locationForm.value = { location_name: '' }
  showLocationModal.value = true
}

const openEditLocationModal = (location) => {
  editingLocation.value = location
  locationForm.value = { location_name: location.location } // ✅ mapping dari DB
  showLocationModal.value = true
}

const closeLocationModal = () => {
  showLocationModal.value = false
  editingLocation.value = null
  locationForm.value = { location_name: '' }
}

const submitLocation = async () => {
  try {
    if (editingLocation.value) {
      const { error } = await locationStore.update(
        editingLocation.value.location_id,
        locationForm.value
      )
      if (error) throw error
      alert('✅ Lokasi berhasil diupdate!')
    } else {
      const { error } = await locationStore.create(locationForm.value)
      if (error) throw error
      alert('✅ Lokasi berhasil ditambahkan!')
    }
    closeLocationModal()
  } catch (err) {
    alert('❌ Gagal menyimpan lokasi: ' + err.message)
  }
}

const confirmDeleteLocation = async (location) => {
  const batches = getBatchesByLocation(location.location_id)
  if (batches.length > 0) {
    alert(`❌ Tidak dapat menghapus lokasi. Masih ada ${batches.length} batch di lokasi ini.`)
    return
  }
  
  if (confirm(`Yakin ingin menghapus lokasi "${location.location}"?`)) {
    try {
      const { error } = await locationStore.remove(location.location_id)
      if (error) throw error
      alert('✅ Lokasi berhasil dihapus!')
    } catch (err) {
      alert('❌ Gagal menghapus lokasi: ' + err.message)
    }
  }
}

// Batch CRUD
const openAddBatchModal = (location) => {
  editingBatch.value = null
  batchForm.value = {
    location_id: location.location_id,
    batch_name: ''
  }
  showBatchModal.value = true
}

const openEditBatchModal = (batch, location) => {
  editingBatch.value = batch
  batchForm.value = {
    location_id: batch.location_id,
    batch_name: batch.batch_name
  }
  showBatchModal.value = true
}

const closeBatchModal = () => {
  showBatchModal.value = false
  editingBatch.value = null
  batchForm.value = { location_id: '', batch_name: '' }
}

const submitBatch = async () => {
  try {
    if (editingBatch.value) {
      const { error } = await batchStore.updateBatch(
        editingBatch.value.batch_id,
        batchForm.value
      )
      if (error) throw error
      alert('✅ Batch berhasil diupdate!')
    } else {
      const { error } = await batchStore.addBatch(batchForm.value)
      if (error) throw error
      alert('✅ Batch berhasil ditambahkan!')
    }
    closeBatchModal()
  } catch (err) {
    alert('❌ Gagal menyimpan batch: ' + err.message)
  }
}

const confirmDeleteBatch = async (batch) => {
  if (confirm(`Yakin ingin menghapus batch "${batch.batch_name}"?`)) {
    try {
      const { error } = await batchStore.deleteBatch(batch.batch_id)
      if (error) throw error
      alert('✅ Batch berhasil dihapus!')
    } catch (err) {
      alert('❌ Gagal menghapus batch: ' + err.message)
    }
  }
}

// QR Code Generation
const generateQR = async (location, batch) => {
  selectedQRInfo.value = { location, batch }
  showQRModal.value = true
  
  await nextTick()
  
  const qrData = JSON.stringify({ 
    location_id: locationStore.locations.find(l => l.location === location)?.location_id,
    location, 
    batch 
  })
  
  try {
    await QRCode.toCanvas(qrCanvas.value, qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    })
    
    qrDataURL.value = qrCanvas.value.toDataURL('image/png')
  } catch (err) {
    console.error('Error generating QR:', err)
    alert('Gagal generate QR Code')
  }
}

const downloadQR = () => {
  const link = document.createElement('a')
  link.download = `QR-${selectedQRInfo.value.location}-${selectedQRInfo.value.batch}.png`
  link.href = qrDataURL.value
  link.click()
}

const downloadPDF = async () => {
  if (!selectedQRInfo.value || !qrDataURL.value) return
  
  isGenerating.value = true
  
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    
    // Header
    pdf.setFillColor(0, 113, 243)
    pdf.rect(0, 0, pageWidth, 45, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(28)
    pdf.setFont('helvetica', 'bold')
    pdf.text('GREENHOUSE', pageWidth / 2, 22, { align: 'center' })
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text('QR Code Lokasi & Batch', pageWidth / 2, 35, { align: 'center' })
    
    pdf.setTextColor(0, 0, 0)
    
    let yPos = 60
    
    // Lokasi Box
    pdf.setFillColor(240, 245, 255)
    pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 20, 3, 3, 'F')
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Lokasi:', margin + 5, yPos + 8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(selectedQRInfo.value.location, margin + 5, yPos + 15)
    
    yPos += 25
    
    // Batch Box
    pdf.setFillColor(240, 255, 245)
    pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 20, 3, 3, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('Batch:', margin + 5, yPos + 8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(selectedQRInfo.value.batch, margin + 5, yPos + 15)
    
    yPos += 30
    
    // QR Code
    const qrSize = 100
    const qrX = (pageWidth - qrSize) / 2
    
    pdf.setDrawColor(0, 113, 243)
    pdf.setLineWidth(1.5)
    pdf.roundedRect(qrX - 4, yPos - 4, qrSize + 8, qrSize + 8, 3, 3)
    
    pdf.addImage(qrDataURL.value, 'PNG', qrX, yPos, qrSize, qrSize)
    
    yPos += qrSize + 15
    
    // Instructions
    pdf.setFillColor(255, 250, 240)
    pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 42, 3, 3, 'F')
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Cara Menggunakan:', margin + 5, yPos + 8)
    
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text('1. Buka aplikasi GreenHouse', margin + 5, yPos + 16)
    pdf.text('2. Pilih menu "Form Activity Report"', margin + 5, yPos + 23)
    pdf.text('3. Klik tombol "Scan QR Code"', margin + 5, yPos + 30)
    
    // Footer
    const footerY = pageHeight - 35
    
    pdf.setDrawColor(220, 220, 220)
    pdf.setLineWidth(0.5)
    pdf.line(margin, footerY, pageWidth - margin, footerY)
    
    pdf.setFontSize(8)
    pdf.setTextColor(120, 120, 120)
    pdf.setFont('helvetica', 'italic')
    
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long', 
      year: 'numeric'
    })
    
    pdf.text(`Generated: ${currentDate}`, pageWidth / 2, footerY + 6, { align: 'center' })
    pdf.text('GreenHouse Management System © 2025', pageWidth / 2, footerY + 12, { align: 'center' })
    
    // Warning
    pdf.setFillColor(255, 240, 240)
    pdf.roundedRect(margin, footerY + 16, pageWidth - (margin * 2), 14, 3, 3, 'F')
    
    pdf.setFontSize(8)
    pdf.setTextColor(220, 38, 38)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PENTING: Jangan lipat atau rusak QR Code ini', pageWidth / 2, footerY + 22, { align: 'center' })
    pdf.text('Simpan di tempat yang mudah terlihat dan terlindung', pageWidth / 2, footerY + 27, { align: 'center' })
    
    const filename = `QR-${selectedQRInfo.value.location}-${selectedQRInfo.value.batch}.pdf`
    pdf.save(filename)
    
    alert('✅ PDF berhasil di-download!')
    
  } catch (err) {
    console.error('Error generating PDF:', err)
    alert('❌ Gagal generate PDF: ' + err.message)
  } finally {
    isGenerating.value = false
  }
}

const downloadAllQRPDF = async () => {
  isGenerating.value = true
  
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const allBatches = []
    locationStore.locations.forEach(location => {
      const batches = getBatchesByLocation(location.location_id)
      batches.forEach(batch => {
        allBatches.push({
          location: location.location, // ✅ Gunakan 'location' bukan 'location_name'
          batch: batch.batch_name
        })
      })
    })
    
    if (allBatches.length === 0) {
      alert('❌ Tidak ada batch untuk di-generate')
      return
    }
    
    for (let i = 0; i < allBatches.length; i++) {
      if (i > 0) pdf.addPage()
      
      const { location, batch } = allBatches[i]
      const qrData = JSON.stringify({ location, batch })
      
      const tempCanvas = document.createElement('canvas')
      await QRCode.toCanvas(tempCanvas, qrData, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'H'
      })
      const qrImage = tempCanvas.toDataURL('image/png')
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20
      
      // Header
      pdf.setFillColor(0, 113, 243)
      pdf.rect(0, 0, pageWidth, 45, 'F')
      
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(28)
      pdf.setFont('helvetica', 'bold')
      pdf.text('GREENHOUSE', pageWidth / 2, 22, { align: 'center' })
      
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text('QR Code Lokasi & Batch', pageWidth / 2, 35, { align: 'center' })
      
      pdf.setTextColor(0, 0, 0)
      
      let yPos = 60
      
      // Lokasi Box
      pdf.setFillColor(240, 245, 255)
      pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 20, 3, 3, 'F')
      
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Lokasi:', margin + 5, yPos + 8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(location, margin + 5, yPos + 15)
      
      yPos += 25
      
      // Batch Box
      pdf.setFillColor(240, 255, 245)
      pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 20, 3, 3, 'F')
      
      pdf.setFont('helvetica', 'bold')
      pdf.text('Batch:', margin + 5, yPos + 8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(batch, margin + 5, yPos + 15)
      
      yPos += 30
      
      // QR Code
      const qrSize = 100
      const qrX = (pageWidth - qrSize) / 2
      
      pdf.setDrawColor(0, 113, 243)
      pdf.setLineWidth(1.5)
      pdf.roundedRect(qrX - 4, yPos - 4, qrSize + 8, qrSize + 8, 3, 3)
      
      pdf.addImage(qrImage, 'PNG', qrX, yPos, qrSize, qrSize)
      
      yPos += qrSize + 15
      
      // Instructions
      pdf.setFillColor(255, 250, 240)
      pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 42, 3, 3, 'F')
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Cara Menggunakan:', margin + 5, yPos + 8)
      
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text('1. Buka aplikasi GreenHouse', margin + 5, yPos + 16)
      pdf.text('2. Pilih menu "Form Activity Report"', margin + 5, yPos + 23)
      pdf.text('3. Klik tombol "Scan QR Code"', margin + 5, yPos + 30)
      
      // Footer
      const footerY = pageHeight - 35
      
      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.5)
      pdf.line(margin, footerY, pageWidth - margin, footerY)
      
      pdf.setFontSize(8)
      pdf.setTextColor(120, 120, 120)
      pdf.setFont('helvetica', 'italic')
      
      const currentDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      
      pdf.text(`Generated: ${currentDate}`, pageWidth / 2, footerY + 6, { align: 'center' })
      pdf.text('GreenHouse Management System © 2025', pageWidth / 2, footerY + 12, { align: 'center' })
      
      // Warning
      pdf.setFillColor(255, 240, 240)
      pdf.roundedRect(margin, footerY + 16, pageWidth - (margin * 2), 14, 3, 3, 'F')
      
      pdf.setFontSize(8)
      pdf.setTextColor(220, 38, 38)
      pdf.setFont('helvetica', 'bold')
      pdf.text('PENTING: Jangan lipat atau rusak QR Code ini', pageWidth / 2, footerY + 22, { align: 'center' })
      pdf.text('Simpan di tempat yang mudah terlihat dan terlindung', pageWidth / 2, footerY + 27, { align: 'center' })
    }
    
    pdf.save('QR-All-Batches.pdf')
    alert(`✅ PDF dengan ${allBatches.length} QR Code berhasil di-download!`)
    
  } catch (err) {
    console.error('Error:', err)
    alert('❌ Gagal generate PDF: ' + err.message)
  } finally {
    isGenerating.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await locationStore.fetchAll()
  await batchStore.getBatches()
})
</script>