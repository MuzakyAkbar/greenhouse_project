<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useActivityReportStore } from '../stores/activityReport'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { usePotatoActivityStore } from '../stores/potatoActivity'
import { useMaterialStore } from '../stores/material'
import { useTypeDamageStore } from '../stores/typeDamage'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const activityReportStore = useActivityReportStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const potatoActivityStore = usePotatoActivityStore()
const materialStore = useMaterialStore()
const typeDamageStore = useTypeDamageStore()

const reportId = ref(route.params.id)
const loading = ref(true)
const saving = ref(false)
const error = ref(null)

// Form data
const form = ref({
  location: '',
  batch_id: null,
  activity_id: null,
  material_id: null,
  qty: null,
  CoA: null,
  UoM: '',
  manpower: null,
  typedamage_id: null,
  report_date: ''
})

const revisionNotes = ref('')

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  try {
    loading.value = true
    
    // Fetch all reference data
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll(),
      potatoActivityStore.fetchAll(),
      materialStore.fetchAll(),
      typeDamageStore.fetchAll()
    ])

    // Fetch report data
    const { data, error: fetchError } = await activityReportStore.fetchById(reportId.value)
    
    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (data) {
      // Check if report status is needRevision
      if (data.report_status !== 'needRevision') {
        alert('Laporan ini tidak memerlukan revisi')
        router.push('/reportActivityList')
        return
      }

      // Load revision notes
      revisionNotes.value = data.revision_notes || 'Tidak ada catatan revisi'
      
      // Load form data
      form.value = {
        location: data.location || '',
        batch_id: data.batch_id || null,
        activity_id: data.activity_id || null,
        material_id: data.material_id || null,
        qty: data.qty || null,
        CoA: data.CoA || null,
        UoM: data.UoM || '',
        manpower: data.manpower || null,
        typedamage_id: data.typedamage_id || null,
        report_date: data.report_date || ''
      }
    }
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err.message
    alert('Gagal memuat data: ' + err.message)
  } finally {
    loading.value = false
  }
})

// Filter activities by selected batch
const filteredActivities = computed(() => {
  if (!form.value.batch_id) return []
  return potatoActivityStore.activities.filter(a => a.batch_id === form.value.batch_id)
})

// Filter materials by selected batch
const filteredMaterials = computed(() => {
  if (!form.value.batch_id) return []
  return materialStore.materials.filter(m => m.batch_id === form.value.batch_id)
})

const handleSubmit = async () => {
  try {
    saving.value = true
    error.value = null

    // Validate form
    if (!form.value.location || !form.value.batch_id || !form.value.activity_id) {
      throw new Error('Mohon lengkapi semua field yang wajib diisi')
    }

    // Update report data and reset status to onReview
    const updatePayload = {
      ...form.value,
      report_status: 'onReview',  // Reset status ke onReview
      revision_notes: null,       // Clear revision notes
      revision_requested_by: null,
      revision_requested_at: null,
      revised_by: authStore.user?.username || 'Staff',
      revised_at: new Date().toISOString()
    }

    const { error: updateError } = await activityReportStore.update(reportId.value, updatePayload)

    if (updateError) {
      throw new Error(updateError.message)
    }

    alert('✅ Laporan berhasil diperbarui dan dikirim untuk review ulang!')
    router.push('/reportActivityList')
  } catch (err) {
    console.error('Error updating report:', err)
    error.value = err.message
    alert('❌ Gagal memperbarui laporan: ' + err.message)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  if (confirm('Batalkan perubahan? Data yang belum disimpan akan hilang.')) {
    router.push('/reportActivityList')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button 
            @click="handleCancel"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white text-lg">
                🔄
              </span>
              Edit Laporan Aktivitas
            </h1>
            <p class="text-sm text-gray-500 mt-1">Perbaiki laporan berdasarkan catatan revisi</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Revision Notice -->
      <div v-if="!loading && !error && revisionNotes" class="mb-6">
        <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl flex-shrink-0">
              🔄
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-red-900 text-lg mb-2">Catatan Revisi</h3>
              <p class="text-red-700 whitespace-pre-wrap">{{ revisionNotes }}</p>
              <p class="text-sm text-red-600 mt-3">
                <strong>Report ID:</strong> #{{ reportId }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form v-if="!loading && !error" @submit.prevent="handleSubmit" class="space-y-6">
        
        <!-- Basic Information -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span class="text-xl">📋</span>
            Informasi Dasar
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Location -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Lokasi <span class="text-red-500">*</span>
              </label>
              <select 
                v-model="form.location" 
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              >
                <option value="">Pilih Lokasi</option>
                <option v-for="loc in locationStore.locations" :key="loc.location_id" :value="loc.location">
                  {{ loc.location }}
                </option>
              </select>
            </div>

            <!-- Batch -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Batch <span class="text-red-500">*</span>
              </label>
              <select 
                v-model="form.batch_id" 
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              >
                <option :value="null">Pilih Batch</option>
                <option v-for="batch in batchStore.batches" :key="batch.batch_id" :value="batch.batch_id">
                  {{ batch.batch_name }}
                </option>
              </select>
            </div>

            <!-- Report Date -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Tanggal Laporan <span class="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                v-model="form.report_date"
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              />
            </div>

            <!-- Activity -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Aktivitas <span class="text-red-500">*</span>
              </label>
              <select 
                v-model="form.activity_id" 
                required
                :disabled="!form.batch_id"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition disabled:bg-gray-100"
              >
                <option :value="null">{{ form.batch_id ? 'Pilih Aktivitas' : 'Pilih Batch terlebih dahulu' }}</option>
                <option v-for="activity in filteredActivities" :key="activity.activity_id" :value="activity.activity_id">
                  {{ activity.activity }} - {{ activity.subactivity }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Material & Quantity -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span class="text-xl">📦</span>
            Material & Kuantitas
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Material -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Material
              </label>
              <select 
                v-model="form.material_id" 
                :disabled="!form.batch_id"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition disabled:bg-gray-100"
              >
                <option :value="null">{{ form.batch_id ? 'Pilih Material (Opsional)' : 'Pilih Batch terlebih dahulu' }}</option>
                <option v-for="material in filteredMaterials" :key="material.material_id" :value="material.material_id">
                  {{ material.material_name }}
                </option>
              </select>
            </div>

            <!-- Quantity -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Kuantitas
              </label>
              <input 
                type="number" 
                v-model.number="form.qty"
                min="0"
                step="0.01"
                placeholder="0"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              />
            </div>

            <!-- UoM -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Unit of Measure (UoM)
              </label>
              <input 
                type="text" 
                v-model="form.UoM"
                placeholder="kg, liter, pcs, dll"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              />
            </div>

            <!-- CoA -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Chart of Account (CoA)
              </label>
              <input 
                type="number" 
                v-model.number="form.CoA"
                placeholder="Kode CoA"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span class="text-xl">👥</span>
            Informasi Tambahan
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Manpower -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Jumlah Tenaga Kerja
              </label>
              <input 
                type="number" 
                v-model.number="form.manpower"
                min="0"
                placeholder="Jumlah orang"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              />
            </div>

            <!-- Type Damage -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Tipe Kerusakan
              </label>
              <select 
                v-model="form.typedamage_id" 
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              >
                <option :value="null">Tidak Ada Kerusakan</option>
                <option v-for="damage in typeDamageStore.typeDamages" :key="damage.typedamage_id" :value="damage.typedamage_id">
                  {{ damage.type_damage }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            @click="handleCancel"
            class="flex-1 px-6 py-3.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            <svg v-if="saving" class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ saving ? 'Menyimpan...' : '💾 Simpan & Kirim untuk Review' }}</span>
          </button>
        </div>
      </form>

      <!-- Footer -->
      <footer class="text-center py-10 mt-8 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>
  </div>
</template>