<script setup>
import html2pdf from 'html2pdf.js'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { supabase } from '../lib/supabase'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()

const report_id = ref(route.params.report_id || null)
const loading = ref(true)
const error = ref(null)
const currentReport = ref(null)

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  if (!report_id.value) {
    alert('⚠️ Report ID tidak ditemukan')
    router.push('/reportActivityList')
    return
  }

  await loadData()
})

const loadData = async () => {
  try {
    loading.value = true
    
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll()
    ])

    const { data: report, error: fetchError } = await supabase
      .from('gh_report')
      .select(`
        *,
        type_damages:gh_type_damage(*),
        activities:gh_activity(
          *,
          materials:gh_material_used(*)
        )
      `)
      .eq('report_id', report_id.value)
      .eq('report_status', 'approved')
      .single()
    
    if (fetchError) throw fetchError

    if (!report) {
      throw new Error('Laporan tidak ditemukan atau belum disetujui')
    }

    currentReport.value = report
    console.log('✅ Loaded approved report:', report)
    
  } catch (err) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
    alert('❌ Gagal memuat data: ' + err.message)
    router.push('/reportActivityList')
  } finally {
    loading.value = false
  }
}

// Helper functions
const getBatchName = (batchId) => {
  const batch = batchStore.batches.find(b => b.batch_id == batchId)
  return batch?.batch_name || `Batch ${batchId}`
}

const getLocationName = (locationId) => {
  const location = locationStore.locations.find(l => l.location_id == locationId)
  return location?.location || `Location ${locationId}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ✅ PERBAIKAN: Fungsi printReport diperbarui
const printReport = async () => {
  const loadingText = document.createElement('div')
  loadingText.textContent = '📄 Mempersiapkan PDF...'
  loadingText.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255,255,255,0.95);
    padding: 20px 40px;
    border-radius: 10px;
    z-index: 9999;
    font-weight: bold;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `
  document.body.appendChild(loadingText)

  setTimeout(async () => {
    const element = document.getElementById('print-area')
    if (!element) {
      alert('❌ Elemen laporan tidak ditemukan')
      document.body.removeChild(loadingText)
      return
    }

    loadingText.textContent = '📄 Sedang membuat PDF...'

    const hiddenElements = element.querySelectorAll('.no-print')
    hiddenElements.forEach(el => (el.style.display = 'none'))

    // ✅ PERBAIKAN: Tambahkan kelas untuk mode cetak (mengecilkan font)
    element.classList.add('printing-mode')

    const filename = `ReportActivity_${currentReport.value?.report_id}_${currentReport.value?.report_date || 'Report'}.pdf`

    const options = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { 
        // ✅ PERBAIKAN: Hapus 'scale: 2' agar font profesional
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { 
        mode: ['css', 'avoid-all'], 
        before: '.pdf-page-break-before', // Ini akan kita gunakan
        after: '.pdf-page-break-after',
        inside: '.pdf-avoid-break-inside' 
      }
    }

    try {
      await html2pdf().from(element).set(options).save()
      alert('✅ PDF berhasil dibuat!')
    } catch (err) {
      console.error('❌ Gagal membuat PDF:', err)
      alert('❌ Gagal membuat PDF: ' + err.message)
    } finally {
      // ✅ PERBAIKAN: Hapus kelas mode cetak setelah selesai
      element.classList.remove('printing-mode')

      hiddenElements.forEach(el => (el.style.display = ''))
      document.body.removeChild(loadingText)
    }
  }, 100)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 no-print">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between gap-4">
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
              <p class="text-sm text-gray-500 mt-1">Report ID: #{{ report_id }}</p>
            </div>
          </div>
          
          <button
            @click="printReport"
            class="flex items-center gap-2 bg-[#0071f3] hover:bg-[#0060d1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M128 0C92.7 0 64 28.7 64 64l0 96 64 0 0-96 226.7 0L384 93.3l0 66.7 64 0 0-66.7c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0L128 0zM384 352l0 32 0 64-256 0 0-64 0-16 0-16 256 0zm64 32l32 0c17.7 0 32-14.3 32-32l0-96c0-35.3-28.7-64-64-64L64 192c-35.3 0-64 28.7-64 64l0 96c0 17.7 14.3 32 32 32l32 0 0 64c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-64zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
            </svg>
            Cetak PDF
          </button>
        </div>
      </div>
    </div>

    <div id="print-area" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data laporan...</p>
        </div>
      </div>

      <div v-else-if="error" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <template v-else-if="currentReport">
        
        <div class="mb-8 flex justify-center pdf-avoid-break-inside">
           <div class="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-xl font-bold text-base shadow-sm border-2 border-green-200">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
            </svg>
            Laporan Telah Disetujui
          </div>
        </div>

        <div class="mb-8 pdf-avoid-break-inside">
           <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">📋 Informasi Dasar</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="text-lg">🆔</span>
                  Report ID
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-bold">
                  #{{ currentReport.report_id }}
                </div>
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg class="w-4 h-4 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                  </svg>
                  Tanggal
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                  {{ formatDate(currentReport.report_date) }}
                </div>
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="text-lg">📍</span>
                  Lokasi
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                  {{ getLocationName(currentReport.location_id) }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
  <div class="flex flex-col">
    <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
      <span class="text-lg">🏷️</span>
      Batch
    </label>
    <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
      {{ getBatchName(currentReport.batch_id) }}
    </div>
  </div>

  <!-- ✅ Tambahkan kolom baru: Fase Tumbuhan -->
  <div class="flex flex-col">
    <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
      <span class="text-lg">🌿</span>
      Fase Tumbuhan
    </label>
    <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
      {{ currentReport.phase || 'Belum ditentukan' }}
    </div>
  </div>

  <div class="flex flex-col">
    <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
      <span class="text-lg">📊</span>
      Status
    </label>
    <div class="px-4 py-3 border-2 border-green-200 rounded-xl bg-green-50 text-green-800 font-bold text-center">
      ✅ Approved
    </div>
  </div>
            </div>
          </div>
        </div>

        <div v-if="currentReport.type_damages && currentReport.type_damages.length > 0" class="mb-8 pdf-avoid-break-inside"> 
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">🌾 Kerusakan Tanaman</h2>
          <div class="space-y-4">
            <div
              v-for="damage in currentReport.type_damages"
              :key="damage.typedamage_id"
              class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 pdf-avoid-break-inside"
            >
              <h3 class="font-bold text-gray-900 text-lg mb-4">{{ damage.type_damage || 'Kerusakan' }}</h3>
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
                  <p class="text-xs text-yellow-600 font-semibold mb-2 flex items-center gap-1">
                    <span class="text-base">🟡</span>
                    Kuning
                  </p>
                  <p class="text-2xl font-bold text-yellow-900">{{ damage.kuning || 0 }}</p>
                </div>
                <div class="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
                  <p class="text-xs text-orange-600 font-semibold mb-2 flex items-center gap-1">
                    <span class="text-base">🟠</span>
                    Kutilang
                  </p>
                  <p class="text-2xl font-bold text-orange-900">{{ damage.kutilang || 0 }}</p>
                </div>
                <div class="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <p class="text-xs text-red-600 font-semibold mb-2 flex items-center gap-1">
                    <span class="text-base">🔴</span>
                    Busuk
                  </p>
                  <p class="text-2xl font-bold text-red-900">{{ damage.busuk || 0 }}</p>
                </div>
              </div>

              <div v-if="damage.approved_at" class="mt-4 pt-4 border-t-2 border-gray-100">
                <div class="bg-green-50 rounded-lg p-3">
                  <p class="text-xs text-green-600 font-semibold mb-1">✅ Disetujui</p>
                  <p class="text-sm text-green-900">
                    <strong>By:</strong> {{ damage.approved_by }}<br>
                    <strong>At:</strong> {{ formatDateTime(damage.approved_at) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentReport.activities && currentReport.activities.length > 0" class="mb-8 pdf-page-break-before"> 
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">⚙️ Detail Aktivitas</h2>
          <div class="space-y-6">
            <div
              v-for="(activity, index) in currentReport.activities"
              :key="activity.activity_id"
              class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 pdf-avoid-break-inside" 
            >
              <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                  {{ index + 1 }}
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900">{{ activity.act_name }}</h3>
                </div>
              </div>

              <div class="space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="flex flex-col">
                    <label class="text-sm font-semibold text-gray-700 mb-2">Chart of Account (CoA)</label>
                    <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                      {{ activity.CoA || '-' }}
                    </div>
                  </div>

                  <div class="flex flex-col">
                    <label class="text-sm font-semibold text-gray-700 mb-2">👷 Tenaga Kerja</label>
                    <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium text-center">
                      {{ activity.manpower || 0 }} pekerja
                    </div>
                  </div>
                </div>

                <div v-if="activity.materials && activity.materials.length > 0" class="bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
                  <h4 class="text-base font-bold text-blue-900 flex items-center gap-2 mb-4">
                    <span class="text-lg">📦</span>
                    Material yang Digunakan ({{ activity.materials.length }})
                  </h4>
                  <div class="space-y-3">
                    <div
                      v-for="(mat) in activity.materials"
                      :key="mat.material_used_id"
                      class="flex items-center justify-between bg-white rounded-lg p-4 border border-blue-200"
                    >
                      <div class="flex-1">
                        <p class="font-semibold text-gray-900">{{ mat.material_name }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-lg font-bold text-blue-700">{{ mat.qty }}</span>
                        <span class="text-sm text-blue-600">{{ mat.uom }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="activity.approved_at" class="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <p class="text-xs text-green-600 font-semibold mb-2 flex items-center gap-2">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                      <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
                    </svg>
                    Aktivitas Disetujui
                  </p>
                  <p class="text-sm text-green-900">
                    <strong>By:</strong> {{ activity.approved_by }}<br>
                    <strong>At:</strong> {{ formatDateTime(activity.approved_at) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-8 pdf-avoid-break-inside"> 
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">✅ Informasi Approval Report</h2>
          <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200 shadow-sm p-6">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white text-2xl flex-shrink-0">
                ✓
              </div>
              <div class="flex-1">
                <p class="font-bold text-green-900 text-lg mb-2">Laporan Telah Disetujui</p>
                <div class="space-y-1 text-sm text-green-800">
                  <p><strong>Disetujui oleh:</strong> {{ currentReport.approved_by || 'Admin' }}</p>
                  <p><strong>Tanggal approval:</strong> {{ formatDateTime(currentReport.approved_at) }}</p>
                  <p><strong>Report ID:</strong> #{{ currentReport.report_id }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-3 justify-center mb-8 no-print">
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

      <footer class="text-center py-10 mt-8 border-t border-gray-200 pdf-avoid-break-inside">
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
/* ✅ PERBAIKAN: Tambahkan kelas ini untuk html2pdf.js */
#print-area.printing-mode {
  font-size: 12px;
}

@media print {
  .no-print {
    display: none !important;
  }
  
  #print-area {
    background: white !important;
    box-shadow: none !important;
  }
  
  body {
    background: white !important;
  }

  /* ✅ PERBAIKAN: Tambahkan juga di sini untuk print native browser */
  #print-area.printing-mode {
    font-size: 12px;
  }

  .pdf-avoid-break-inside {
    page-break-inside: avoid;
  }

  .pdf-page-break-before {
    page-break-before: always;
  }

  .pdf-page-break-after {
    page-break-after: always;
  }
}
</style>