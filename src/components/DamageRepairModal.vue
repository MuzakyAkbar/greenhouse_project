<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  phase: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'success'])

//State
const loading = ref(false)
const repairableReports = ref([])
const selectedReports = ref([])
const repairForm = ref({
  repair_method: '',
  repair_notes: '',
  repaired_by: '',
  images: []
})

// Image upload state
const imagePreview = ref([])
const uploadingImages = ref(false)

// Computed
const totalSelected = computed(() => {
  return selectedReports.value.reduce((acc, report) => {
    acc.kuning += report.kuning_to_repair || 0
    acc.kutilang += report.kutilang_to_repair || 0
    return acc
  }, { kuning: 0, kutilang: 0 })
})

const canSubmit = computed(() => {
  return selectedReports.value.length > 0 &&
         (totalSelected.value.kuning > 0 || totalSelected.value.kutilang > 0) &&
         repairForm.value.repair_method &&
         repairForm.value.repaired_by
})

// Watch untuk load data saat modal dibuka
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.phase) {
    await loadRepairableReports()
  } else {
    resetForm()
  }
})

// --- LOGIC BARU: Query Data Lebih Simpel ---
const loadRepairableReports = async () => {
  loading.value = true
  try {
    // Menggunakan query optimasi dari source baru
    // Ambil summary yang nett-nya > 0
    const { data, error } = await supabase
      .from('gh_damage_summary')
      .select(`
        summary_id,
        report_id,
        kuning_nett,
        kutilang_nett,
        report_date,
        gh_report!inner(
          report_date,
          gh_batch(batch_name),
          gh_location(location),
          gh_phase!inner(phase_name)
        )
      `)
      .or('kuning_nett.gt.0,kutilang_nett.gt.0') // Filter nett > 0
      .order('report_date', { ascending: false })
      .limit(50)

    if (error) throw error

    // Filter Fase di JS (Logic Baru)
    const targetPhase = props.phase?.toLowerCase() || ''
    const filtered = data.filter(item => {
       const pName = item.gh_report?.gh_phase?.phase_name?.toLowerCase() || ''
       return pName.includes(targetPhase)
    })

    // Mapping ke struktur UI Lama agar tampilan tetap sesuai
    repairableReports.value = filtered.map(item => ({
      ...item,
      // Helper untuk UI Card
      gh_batch: item.gh_report?.gh_batch,
      gh_location: item.gh_report?.gh_location,
      
      kuning_to_repair: 0,
      kutilang_to_repair: 0,
      isSelected: false,
      isFullyRepaired: false // Karena query sudah filter > 0, maka pasti belum full repaired
    }))

  } catch (error) {
    console.error('Error loading repairable reports:', error)
    alert('Gagal memuat data laporan yang bisa diperbaiki')
  } finally {
    loading.value = false
  }
}

// --- LOGIC LAMA: UI Helper ---
const toggleSelectReport = (report) => {
  report.isSelected = !report.isSelected
  
  if (report.isSelected) {
    report.kuning_to_repair = report.kuning_nett
    report.kutilang_to_repair = report.kutilang_nett
    
    if (!selectedReports.value.find(r => r.summary_id === report.summary_id)) {
      selectedReports.value.push(report)
    }
  } else {
    report.kuning_to_repair = 0
    report.kutilang_to_repair = 0
    selectedReports.value = selectedReports.value.filter(r => r.summary_id !== report.summary_id)
  }
}

// --- LOGIC LAMA: Image Upload (Sesuai request agar bucket jalan) ---
const handleImageUpload = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  uploadingImages.value = true
  
  try {
    for (const file of files) {
      // Preview UI
      const reader = new FileReader()
      reader.onload = (e) => {
        imagePreview.value.push(e.target.result)
      }
      reader.readAsDataURL(file)

      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`
      const filePath = `repairs/${fileName}` 
      
      const { error } = await supabase.storage
        .from('gh-repair-images') 
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('gh-repair-images')
        .getPublicUrl(filePath)

      repairForm.value.images.push({
        url: publicUrl,
        path: filePath,
        bucket: 'gh-repair-images'
      })
    }
  } catch (error) {
    console.error('Error uploading images:', error)
    alert('Gagal upload gambar: ' + error.message)
  } finally {
    uploadingImages.value = false
  }
}

const removeImage = (index) => {
  imagePreview.value.splice(index, 1)
  repairForm.value.images.splice(index, 1)
}

// --- LOGIC BARU: Submit (Bulk Insert) ---
const submitRepair = async () => {
  if (!canSubmit.value) return

  loading.value = true
  
  try {
    // Mapping payload (menggunakan struktur baru yang lebih efisien)
    const payloads = selectedReports.value.map(report => {
        if (report.kuning_to_repair === 0 && report.kutilang_to_repair === 0) return null
        
        return {
          summary_id: report.summary_id,
          report_id: report.report_id,
          kuning_repaired: report.kuning_to_repair,
          kutilang_repaired: report.kutilang_to_repair,
          repair_date: new Date().toISOString().split('T')[0],
          repair_method: repairForm.value.repair_method,
          repair_notes: repairForm.value.repair_notes,
          repaired_by: repairForm.value.repaired_by,
          images: JSON.stringify(repairForm.value.images), // Simpan array gambar sebagai JSON string
          repair_status: 'completed' // Langsung completed atau pending approval tergantung trigger DB
        }
    }).filter(Boolean)

    if (payloads.length === 0) return

    const { error } = await supabase
        .from('gh_damage_repair')
        .insert(payloads)

    if (error) throw error

    alert('Perbaikan berhasil dicatat!')
    emit('success')
    resetForm()
    await loadRepairableReports()
    
  } catch (error) {
    console.error('Error submitting repair:', error)
    alert('Gagal menyimpan data perbaikan: ' + error.message)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  selectedReports.value = []
  repairableReports.value = []
  repairForm.value = {
    repair_method: '',
    repair_notes: '',
    repaired_by: '',
    images: []
  }
  imagePreview.value = []
}

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        
        <div class="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold flex items-center gap-3">
              <span class="text-3xl">🔧</span>
              Perbaikan Kerusakan - {{ phase?.toUpperCase() }}
            </h2>
            <p class="text-sm mt-1 opacity-90">Pilih laporan yang ingin diperbaiki</p>
          </div>
          <button
            @click="closeModal"
            class="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          
          <div v-if="loading && repairableReports.length === 0" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            <p class="mt-4 text-gray-600">Memuat data...</p>
          </div>

          <div v-else-if="repairableReports.length === 0" class="text-center py-12">
            <span class="text-6xl">✅</span>
            <h3 class="text-xl font-bold text-gray-700 mt-4">Tidak Ada Kerusakan</h3>
            <p class="text-gray-500 mt-2">Belum ada laporan kerusakan aktif untuk fase {{ phase }}</p>
          </div>

          <div v-else class="space-y-6">
            
            <div v-if="selectedReports.length > 0" 
                 class="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 transition-all">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-bold text-gray-900 mb-1">Total Dipilih untuk Diperbaiki</h3>
                  <div class="flex gap-4 text-sm">
                    <span class="text-yellow-700">
                      <strong>Kuning:</strong> {{ totalSelected.kuning.toLocaleString('id-ID') }}
                    </span>
                    <span class="text-yellow-700">
                      <strong>Kutilang:</strong> {{ totalSelected.kutilang.toLocaleString('id-ID') }}
                    </span>
                  </div>
                </div>
                <div class="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold">
                  {{ selectedReports.length }} Laporan
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="font-bold text-gray-700 text-sm uppercase tracking-wide">
                Daftar Laporan ({{ repairableReports.length }}) - Diurutkan berdasarkan Tanggal
              </h3>
              
              <div class="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                <div
                  v-for="report in repairableReports"
                  :key="report.summary_id"
                  class="border-2 rounded-xl p-4 transition-all cursor-pointer"
                  :class="[
                    report.isSelected ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                  ]"
                  @click="toggleSelectReport(report)"
                >
                  <div class="flex items-start gap-4">
                    <div class="flex-shrink-0 mt-1">
                      <div
                        class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all"
                        :class="report.isSelected ? 'bg-yellow-500 border-yellow-500' : 'border-gray-300'"
                      >
                        <svg v-if="report.isSelected" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    </div>

                    <div class="flex-1">
                      <div class="flex items-start justify-between mb-2">
                        <div>
                          <h4 class="font-bold text-gray-900">
                            {{ report.gh_batch?.batch_name || 'Unknown Batch' }}
                          </h4>
                          <p class="text-sm text-gray-600">
                            {{ report.gh_location?.location || 'Unknown Location' }} • 
                            {{ new Date(report.report_date).toLocaleDateString('id-ID') }}
                          </p>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                          <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Report #{{ report.report_id }}
                          </span>
                        </div>
                      </div>

                      <div class="flex gap-4 text-sm mb-3">
                        <div class="flex items-center gap-1">
                          <span class="w-3 h-3 bg-yellow-400 rounded-full"></span>
                          <span class="text-gray-600">Sisa Kuning:</span>
                          <strong>{{ report.kuning_nett }}</strong>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="w-3 h-3 bg-orange-400 rounded-full"></span>
                          <span class="text-gray-600">Sisa Kutilang:</span>
                          <strong>{{ report.kutilang_nett }}</strong>
                        </div>
                      </div>

                      <div v-if="report.isSelected" class="grid grid-cols-2 gap-3 pt-3 border-t border-yellow-200" @click.stop>
                        <div>
                          <label class="block text-xs font-semibold text-gray-700 mb-1">
                            Perbaiki Kuning
                          </label>
                          <input
                            v-model.number="report.kuning_to_repair"
                            type="number"
                            :max="report.kuning_nett"
                            min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-gray-700 mb-1">
                            Perbaiki Kutilang
                          </label>
                          <input
                            v-model.number="report.kutilang_to_repair"
                            type="number"
                            :max="report.kutilang_nett"
                            min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedReports.length > 0" class="bg-gray-50 rounded-xl p-6 space-y-4">
              <h3 class="font-bold text-gray-900 mb-4">Detail Perbaikan</h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Metode Perbaikan <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="repairForm.repair_method"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pilih metode...</option>
                    <option value="Pestisida Organik">Pestisida Organik</option>
                    <option value="Pestisida Kimia">Pestisida Kimia</option>
                    <option value="Manual Cleaning">Manual Cleaning</option>
                    <option value="Fungisida">Fungisida</option>
                    <option value="Treatment Khusus">Treatment Khusus</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Diperbaiki Oleh <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="repairForm.repaired_by"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Nama petugas"
                    required
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Catatan Perbaikan
                </label>
                <textarea
                  v-model="repairForm.repair_notes"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Deskripsi detail perbaikan yang dilakukan..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Dokumentasi Foto (Opsional)
                </label>
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    @change="handleImageUpload"
                    class="hidden"
                    id="imageUpload"
                  />
                  <label
                    for="imageUpload"
                    class="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span class="text-sm text-gray-600">
                      {{ uploadingImages ? 'Mengupload...' : 'Klik untuk upload foto' }}
                    </span>
                  </label>
                </div>

                <div v-if="imagePreview.length > 0" class="grid grid-cols-4 gap-2 mt-3">
                  <div
                    v-for="(img, index) in imagePreview"
                    :key="index"
                    class="relative group"
                  >
                    <img :src="img" class="w-full h-24 object-cover rounded-lg" />
                    <button
                      @click="removeImage(index)"
                      class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="border-t border-gray-200 p-6 bg-gray-50 flex justify-between items-center">
          <button
            @click="closeModal"
            class="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
          >
            Tutup
          </button>
          
          <button
            v-if="selectedReports.length > 0"
            @click="submitRepair"
            :disabled="!canSubmit || loading"
            class="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-else>🔧</span>
            {{ loading ? 'Menyimpan...' : 'Simpan Perbaikan' }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.9);
}
</style>