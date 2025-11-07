<script setup>
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useActivityReportStore } from '../stores/activityReport'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { usePotatoActivityStore } from '../stores/potatoActivity'
import { useMaterialStore } from '../stores/material'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const activityReportStore = useActivityReportStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const potatoActivityStore = usePotatoActivityStore()
const materialStore = useMaterialStore()

const reportId = ref(route.query.id || null)
const loading = ref(true)
const error = ref(null)

const reportData = ref(null)
const groupedReports = ref([])

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  if (!reportId.value) {
    alert('Report ID tidak ditemukan')
    router.push('/reportActivityList')
    return
  }

  try {
    loading.value = true
    
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll(),
      potatoActivityStore.fetchAll(),
      materialStore.fetchAll()
    ])

    const { data, error: fetchError } = await activityReportStore.fetchById(reportId.value)
    
    if (fetchError) {
      throw new Error(fetchError.message)
    }

    reportData.value = data

    // Fetch all related reports
    const { data: allReports } = await activityReportStore.fetchAll()
    
    const relatedReports = allReports.filter(r => 
      r.batch_id === data.batch_id &&
      r.report_date === data.report_date &&
      r.location === data.location &&
      r.report_status === 'approved'
    )

    // Group by activity
    const grouped = relatedReports.reduce((acc, report) => {
      const activityId = report.activity_id
      if (!acc[activityId]) {
        acc[activityId] = {
          activity_id: activityId,
          CoA: report.CoA,
          manpower: report.manpower,
          materials: []
        }
      }
      
      if (report.material_id) {
        acc[activityId].materials.push({
          material_id: report.material_id,
          qty: report.qty,
          UoM: report.UoM
        })
      }
      
      return acc
    }, {})

    groupedReports.value = Object.values(grouped)
    
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err.message
    alert('Gagal memuat data: ' + err.message)
  } finally {
    loading.value = false
  }
})

// Helper functions
const getBatchName = (batchId) => {
  const batch = batchStore.batches.find(b => b.batch_id === batchId)
  return batch?.batch_name || 'Unknown'
}

const getActivityName = (activityId) => {
  const activity = potatoActivityStore.activities.find(a => a.activity_id === activityId)
  return activity?.activity || 'Unknown'
}

const getActivitySubactivity = (activityId) => {
  const activity = potatoActivityStore.activities.find(a => a.activity_id === activityId)
  return activity?.subactivity || ''
}

const getMaterialName = (materialId) => {
  if (!materialId) return '-'
  const material = materialStore.materials.find(m => m.material_id === materialId)
  return material?.material_name || '-'
}

// ✅ UPDATED: Read from columns instead of gh_type_damage table
const getDamageInfo = () => {
  if (!reportData.value) return []
  
  const damages = []
  
  if (reportData.value.type_damage_kuning > 0) {
    damages.push({
      type: 'Kuning',
      qty: reportData.value.type_damage_kuning
    })
  }
  
  if (reportData.value.type_damage_kutilang > 0) {
    damages.push({
      type: 'Kutilang',
      qty: reportData.value.type_damage_kutilang
    })
  }
  
  if (reportData.value.type_damage_busuk > 0) {
    damages.push({
      type: 'Busuk',
      qty: reportData.value.type_damage_busuk
    })
  }
  
  return damages
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }) + ' WIB'
}

const printReport = async () => {
  const element = document.getElementById('print-area')
  if (!element) {
    alert('Elemen laporan tidak ditemukan')
    return
  }

  // Tambahkan loading sementara
  const loadingText = document.createElement('div')
  loadingText.textContent = 'Sedang membuat PDF...'
  loadingText.style.position = 'fixed'
  loadingText.style.top = '50%'
  loadingText.style.left = '50%'
  loadingText.style.transform = 'translate(-50%, -50%)'
  loadingText.style.background = 'rgba(255,255,255,0.9)'
  loadingText.style.padding = '20px 40px'
  loadingText.style.borderRadius = '10px'
  loadingText.style.zIndex = '9999'
  document.body.appendChild(loadingText)

  try {
    // Sembunyikan tombol yang tidak ingin dicetak
    const hiddenElements = element.querySelectorAll('.no-print')
    hiddenElements.forEach(el => el.style.display = 'none')

    // Tangkap tampilan dengan html2canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')

    // Hitung ukuran A4
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()

    // Rasio gambar agar proporsional di 1 halaman
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * pdfWidth) / canvas.width
    const scaleFactor = Math.min(1, pdfHeight / imgHeight)
    const finalHeight = imgHeight * scaleFactor

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight)
    pdf.save(`ReportActivity_${reportData.value?.report_date || 'Laporan'}.pdf`)
  } catch (err) {
    console.error('Gagal membuat PDF:', err)
    alert('Gagal membuat PDF')
  } finally {
    // Tampilkan kembali tombol
    const hiddenElements = element.querySelectorAll('.no-print')
    hiddenElements.forEach(el => (el.style.display = ''))

    document.body.removeChild(loadingText)
  }
}
</script>

<template>
  <div id="print-area" class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/reportActivityList')"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center text-white text-lg">
                ✅
              </span>
              View Activity Report
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Laporan yang Telah Disetujui</p>
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

      <!-- Content -->
      <template v-else-if="reportData">
        <!-- Status Badge -->
        <div class="mb-8 flex justify-center">
          <div class="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-xl font-bold text-base shadow-sm">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
            </svg>
            Approved
          </div>
        </div>

        <!-- Basic Info Section -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Informasi Dasar</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <!-- Date -->
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg class="w-4 h-4 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                  </svg>
                  Tanggal
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                  {{ formatDate(reportData.report_date) }}
                </div>
              </div>

              <!-- Location -->
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="text-lg">📍</span>
                  Lokasi
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                  {{ reportData.location || '-' }}
                </div>
              </div>

              <!-- Batch -->
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="text-lg">🏷️</span>
                  Batch
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                  {{ getBatchName(reportData.batch_id) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Damage Types Section -->
        <div class="mb-8" v-if="getDamageInfo().length > 0">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Jenis Kerusakan Tanaman</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div v-for="damage in getDamageInfo()" :key="damage.type" class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span v-if="damage.type === 'Kuning'" class="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs">🟡</span>
                  <span v-else-if="damage.type === 'Kutilang'" class="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs">🟠</span>
                  <span v-else-if="damage.type === 'Busuk'" class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs">🔴</span>
                  {{ damage.type }}
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium text-center">
                  {{ damage.qty || 0 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activities Section -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Detail Aktivitas</h2>
          <div class="space-y-6">
            <div
              v-for="(activity, index) in groupedReports"
              :key="index"
              class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6"
            >
              <!-- Activity Header -->
              <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                  {{ index + 1 }}
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900">{{ getActivityName(activity.activity_id) }}</h3>
                  <p v-if="getActivitySubactivity(activity.activity_id)" class="text-sm text-gray-500">
                    {{ getActivitySubactivity(activity.activity_id) }}
                  </p>
                </div>
              </div>

              <div class="space-y-5">
                <!-- CoA -->
                <div class="flex flex-col">
                  <label class="text-sm font-semibold text-gray-700 mb-2">Chart of Account (CoA)</label>
                  <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                    {{ activity.CoA || '-' }}
                  </div>
                </div>

                <!-- Materials Section -->
                <div v-if="activity.materials.length > 0" class="bg-gray-50 rounded-xl p-5">
                  <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <span class="text-lg">📦</span>
                    Material
                  </h4>
                  <div class="space-y-3">
                    <div
                      v-for="(mat, matIdx) in activity.materials"
                      :key="matIdx"
                      class="flex flex-col sm:flex-row gap-4 bg-white rounded-lg p-4 border border-gray-200"
                    >
                      <div class="flex-1 flex flex-col">
                        <label class="text-xs font-semibold text-gray-600 mb-2">Nama Material</label>
                        <div class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium">
                          {{ getMaterialName(mat.material_id) }}
                        </div>
                      </div>
                      <div class="w-full sm:w-32 flex flex-col">
                        <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                        <div class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium text-center">
                          {{ mat.qty || 0 }}
                        </div>
                      </div>
                      <div class="w-full sm:w-32 flex flex-col">
                        <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                        <div class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium text-center">
                          {{ mat.UoM || '-' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Manpower Section -->
                <div class="bg-gray-50 rounded-xl p-5">
                  <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <span class="text-lg">👷</span>
                    Tenaga Kerja
                  </h4>
                  <div class="bg-white rounded-lg p-4 border border-gray-200">
                    <div class="flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Jumlah Pekerja</label>
                      <div class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium text-center">
                        {{ activity.manpower || 0 }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Approval Info -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Informasi Approval</h2>
          <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200 shadow-sm p-6">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white text-2xl flex-shrink-0">
                ✓
              </div>
              <div class="flex-1">
                <p class="font-bold text-green-900 text-lg mb-1">Laporan Telah Disetujui</p>
                <p class="text-sm text-green-700">
                  Disetujui oleh: <span class="font-semibold">{{ reportData.approved_by || 'Admin' }}</span>
                </p>
                <p class="text-sm text-green-700">
                  Tanggal approval: <span class="font-semibold">{{ formatDateTime(reportData.approved_at) }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-3 justify-center mb-8">
          <button
            @click="printReport"
            class="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-xl transition-all"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M128 0C92.7 0 64 28.7 64 64l0 96 64 0 0-96 226.7 0L384 93.3l0 66.7 64 0 0-66.7c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0L128 0zM384 352l0 32 0 64-256 0 0-64 0-16 0-16 256 0zm64 32l32 0c17.7 0 32-14.3 32-32l0-96c0-35.3-28.7-64-64-64L64 192c-35.3 0-64 28.7-64 64l0 96c0 17.7 14.3 32 32 32l32 0 0 64c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-64zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
            </svg>
            Cetak
          </button>
          <button
            @click="router.push('/reportActivityList')"
            class="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3 rounded-xl border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow-lg transition-all flex items-center gap-2"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M40 48C26.7 48 16 58.7 16 72l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24L40 48zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM16 232l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0z"/>
            </svg>
            Kembali ke List
          </button>
        </div>
      </template>

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


<style scoped>
.ml-13 {
  margin-left: 3.25rem;
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}
#print-area {
  background: white;
  padding: 10mm;
}

@media print {
  #print-area {
    box-shadow: none !important;
    background: white !important;
  }
}


</style>