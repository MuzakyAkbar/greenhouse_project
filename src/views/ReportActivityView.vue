<script setup>
import html2pdf from 'html2pdf.js'
import { ref, onMounted, onUnmounted } from 'vue'
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
const sourcePage = ref(route.query.from || '/planningReportList')
const loading = ref(true)
const error = ref(null)
const currentReport = ref(null)
const phaseInfo = ref(null);

// --- Environment Log State ---
const envLogData = ref(null) 
const sessionLabels = {
  morning: { label: 'Pagi', icon: '🌅', colorClass: 'border-orange-200 bg-orange-50 text-orange-900' },
  noon: { label: 'Siang', icon: '☀️', colorClass: 'border-yellow-200 bg-yellow-50 text-yellow-900' },
  afternoon: { label: 'Sore', icon: '🌥️', colorClass: 'border-indigo-200 bg-indigo-50 text-indigo-900' },
  night: { label: 'Malam', icon: '🌙', colorClass: 'border-slate-200 bg-slate-50 text-slate-900' }
}
const paramLabels = {
  temp: { label: 'Suhu', unit: '°C' },
  humid: { label: 'Kelembapan', unit: '%' },
  co2: { label: 'CO2', unit: 'PPM' }
}

// ===========================================
// 1. IMAGE PREVIEW LOGIC
// ===========================================
const imagePreview = ref({ show: false, images: [], currentIndex: 0, title: '' })

const getImageUrl = (imageData) => {
  if (typeof imageData === 'string') return imageData
  return imageData?.url || imageData?.supabaseUrl || ''
}

const openImagePreview = (images, title, startIndex = 0) => {
  if (!images || images.length === 0) return
  imagePreview.value = { show: true, images: images, currentIndex: startIndex, title: title || 'Image Detail' }
  document.body.style.overflow = 'hidden'
}

const openEnvImagePreview = (imageUrl, title) => {
  if (!imageUrl) return
  openImagePreview([{ url: imageUrl }], title, 0)
}

const closeImagePreview = () => {
  imagePreview.value = { show: false, images: [], currentIndex: 0, title: '' }
  document.body.style.overflow = 'auto'
}

const nextImage = () => {
  if (imagePreview.value.currentIndex < imagePreview.value.images.length - 1) imagePreview.value.currentIndex++
  else imagePreview.value.currentIndex = 0
}

const prevImage = () => {
  if (imagePreview.value.currentIndex > 0) imagePreview.value.currentIndex--
  else imagePreview.value.currentIndex = imagePreview.value.images.length - 1
}

const downloadCurrentImage = async () => {
  const currentImgData = imagePreview.value.images[imagePreview.value.currentIndex]
  const url = getImageUrl(currentImgData)
  let rawTitle = imagePreview.value.title || 'evidence'
  const safeTitle = rawTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const fileName = `gh-evidence-${safeTitle}-${imagePreview.value.currentIndex + 1}.jpg`

  try {
    const response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-cache' })
    if (!response.ok) throw new Error('Network response was not ok')
    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl; link.download = fileName
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  } catch (err) { window.open(url, '_blank') }
}

const handleKeydown = (e) => {
  if (!imagePreview.value.show) return
  if (e.key === 'Escape') closeImagePreview()
  if (e.key === 'ArrowRight') nextImage()
  if (e.key === 'ArrowLeft') prevImage()
}

// ===========================================
// 2. DATA LOADING
// ===========================================
const loadPhaseInfo = async (phaseId) => {
  if (!phaseId) return null;
  try {
    const { data } = await supabase.from('gh_phase').select('phase_name').eq('phase_id', phaseId).single();
    return data?.phase_name || 'Unknown Phase';
  } catch (err) { return 'Unknown Phase'; }
};

const loadEnvironmentLog = async (locationId, dateStr) => {
  try {
    const { data } = await supabase.from('gh_environment_log').select('*').eq('location_id', locationId).eq('log_date', dateStr).maybeSingle()
    envLogData.value = data
  } catch (err) { console.error('Error fetching env log:', err) }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  if (!authStore.isLoggedIn) { router.push('/'); return }
  if (!report_id.value) { alert('⚠️ Report ID tidak ditemukan'); router.push(sourcePage.value); return }
  await loadData()
})

onUnmounted(() => { document.removeEventListener('keydown', handleKeydown) })

const loadData = async () => {
  try {
    loading.value = true
    await Promise.all([batchStore.getBatches(), locationStore.fetchAll()]);

    // ✅ FIX: Query dengan relasi lengkap & Hapus filter strict 'approved' agar data selalu tampil
    const { data: report, error: fetchError } = await supabase
      .from('gh_report')
      .select(`
        *,
        type_damages:gh_type_damage(*),
        activities:gh_activity(*, materials:gh_material_used(*))
      `)
      .eq('report_id', report_id.value)
      .single();
    
    if (fetchError) throw fetchError;
    if (!report) throw new Error('Laporan tidak ditemukan');

    currentReport.value = report;
    if (report.phase_id) phaseInfo.value = await loadPhaseInfo(report.phase_id);
    
    // Load Env Log
    if (report.location_id && report.report_date) {
      await loadEnvironmentLog(report.location_id, report.report_date)
    }
    
  } catch (err) {
    console.error('❌ Error loading data:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// Helpers
const getBatchName = (batchId) => batchStore.batches.find(b => b.batch_id == batchId)?.batch_name || `Batch ${batchId}`
const getLocationName = (locationId) => locationStore.locations.find(l => l.location_id == locationId)?.location || `Location ${locationId}`
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
const formatDateTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
const formatNumber = (value) => Number(value || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const formatCurrency = (value) => 'Rp ' + formatNumber(value)

const calculateActivityTotal = (materials) => {
  if (!materials) return 0
  return materials.reduce((sum, mat) => sum + (Number(mat.total_price) || 0), 0)
}
const calculateReportTotal = () => {
  if (!currentReport.value?.activities) return 0
  return currentReport.value.activities.reduce((sum, act) => sum + calculateActivityTotal(act.materials), 0)
}

// ===========================================
// 3. PRINT LOGIC
// ===========================================
const printReport = async () => {
  const element = document.getElementById('print-area')
  if (!element) return
  
  const originalTitle = document.title
  document.title = `Report_${currentReport.value.report_id}`
  
  element.classList.add('printing-mode')
  const opt = {
    margin: [10, 10],
    filename: `Report_${currentReport.value.report_id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }
  
  try {
    await html2pdf().set(opt).from(element).save()
  } catch (e) {
    alert('Gagal cetak: ' + e.message)
  } finally {
    element.classList.remove('printing-mode')
    document.title = originalTitle
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 no-print">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button @click="() => router.push(sourcePage)" class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center text-white text-lg">✅</span>
                View Activity Report
              </h1>
              <p class="text-sm text-gray-500 mt-1">Report ID: #{{ report_id }}</p>
            </div>
          </div>
          <button @click="printReport" class="flex items-center gap-2 bg-[#0071f3] hover:bg-[#0060d1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path d="M128 0C92.7 0 64 28.7 64 64l0 96 64 0 0-96 226.7 0L384 93.3l0 66.7 64 0 0-66.7c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0L128 0zM384 352l0 32 0 64-256 0 0-64 0-16 0-16 256 0zm64 32l32 0c17.7 0 32-14.3 32-32l0-96c0-35.3-28.7-64-64-64L64 192c-35.3 0-64 28.7-64 64l0 96c0 17.7 14.3 32 32 32l32 0 0 64c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-64zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/></svg> Cetak PDF
          </button>
        </div>
      </div>
    </div>

    <div id="print-area" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center"><div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div><p class="mt-4 text-gray-600 font-semibold">Memuat data laporan...</p></div>
      </div>

      <div v-else-if="error" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3"><span class="text-3xl">❌</span><div><p class="font-bold text-red-900">Terjadi Kesalahan</p><p class="text-sm text-red-700 mt-1">{{ error }}</p></div></div>
      </div>

      <template v-else-if="currentReport">
        
        <div class="mb-8 flex justify-center pdf-avoid-break-inside" v-if="currentReport.report_status === 'approved'">
           <div class="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-xl font-bold text-base shadow-sm border-2 border-green-200">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg> Laporan Telah Disetujui
          </div>
        </div>

        <div class="mb-8 pdf-avoid-break-inside">
           <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">📋 Informasi Dasar</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div class="flex flex-col"><label class="text-sm font-semibold text-gray-700 mb-2">🆔 Report ID</label><div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-bold">#{{ currentReport.report_id }}</div></div>
              <div class="flex flex-col"><label class="text-sm font-semibold text-gray-700 mb-2">📅 Tanggal</label><div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">{{ formatDate(currentReport.report_date) }}</div></div>
              <div class="flex flex-col"><label class="text-sm font-semibold text-gray-700 mb-2">📍 Lokasi</label><div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">{{ getLocationName(currentReport.location_id) }}</div></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div class="flex flex-col"><label class="text-sm font-semibold text-gray-700 mb-2">🏷️ Batch</label><div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">{{ getBatchName(currentReport.batch_id) }}</div></div>
              <div class="flex flex-col"><label class="text-sm font-semibold text-gray-700 mb-2">🌿 Fase</label><div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">{{ phaseInfo || 'Belum ditentukan' }}</div></div>
              <div class="flex flex-col"><label class="text-sm font-semibold text-gray-700 mb-2">📊 Status</label><div class="px-4 py-3 border-2 rounded-xl font-bold text-center capitalize" :class="currentReport.report_status === 'approved' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'">{{ currentReport.report_status }}</div></div>
            </div>
          </div>
        </div>

        <div v-if="envLogData" class="mb-8 pdf-avoid-break-inside">
           <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
             <span class="text-lg">🌡️</span> Environment Log
           </h2>
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div v-for="sessionKey in ['morning', 'noon', 'afternoon', 'night']" :key="sessionKey" class="rounded-xl border-2 overflow-hidden bg-white shadow-sm pdf-avoid-break-inside" :class="sessionLabels[sessionKey].colorClass">
                 <div class="p-3 border-b border-black/10 flex justify-between items-center font-bold">
                    <span class="flex items-center gap-2">{{ sessionLabels[sessionKey].icon }} {{ sessionLabels[sessionKey].label }}</span>
                    <span class="text-sm bg-white/50 px-2 py-0.5 rounded">{{ envLogData[`time_${sessionKey}`] || '--:--' }}</span>
                 </div>
                 <div class="p-4 space-y-3">
                    <div v-for="(param, pKey) in paramLabels" :key="pKey" class="flex justify-between items-start">
                       <div class="flex-1">
                          <p class="text-[10px] uppercase font-bold text-gray-400">{{ param.label }}</p>
                          <p class="text-sm font-bold text-gray-800">{{ envLogData[`${pKey}_${sessionKey}`] }} <span class="text-gray-400 text-xs font-normal" v-if="envLogData[`${pKey}_${sessionKey}`]">{{ param.unit }}</span><span class="text-gray-300" v-else>-</span></p>
                       </div>
                       <div v-if="envLogData[`img_${pKey}_${sessionKey}`]" class="w-10 h-10 rounded-lg border overflow-hidden cursor-pointer hover:opacity-80 transition shadow-sm bg-gray-50 flex-shrink-0 no-print-action" @click="openEnvImagePreview(envLogData[`img_${pKey}_${sessionKey}`], `${sessionLabels[sessionKey].label} - ${param.label}`)">
                         <img :src="envLogData[`img_${pKey}_${sessionKey}`]" class="w-full h-full object-cover">
                       </div>
                       <div v-else class="w-10 h-10 rounded-lg border border-dashed border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0"><span class="text-[10px] text-gray-300 italic">No Img</span></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div v-if="currentReport.type_damages && currentReport.type_damages.length > 0" class="mb-8 pdf-avoid-break-inside"> 
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">🌾 Kerusakan Tanaman</h2>
          <div class="space-y-4">
            <div v-for="damage in currentReport.type_damages" :key="damage.typedamage_id" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 pdf-avoid-break-inside">
              <h3 class="font-bold text-gray-900 text-lg mb-4">{{ damage.type_damage || 'Kerusakan' }}</h3>
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200"><p class="text-xs text-yellow-600 font-semibold mb-2">🟡 Kuning</p><p class="text-2xl font-bold text-yellow-900">{{ damage.kuning || 0 }}</p></div>
                <div class="bg-orange-50 rounded-lg p-4 border-2 border-orange-200"><p class="text-xs text-orange-600 font-semibold mb-2">🟠 Kutilang</p><p class="text-2xl font-bold text-orange-900">{{ damage.kutilang || 0 }}</p></div>
                <div class="bg-red-50 rounded-lg p-4 border-2 border-red-200"><p class="text-xs text-red-600 font-semibold mb-2">🔴 Busuk</p><p class="text-2xl font-bold text-red-900">{{ damage.busuk || 0 }}</p></div>
              </div>
              <div v-if="damage.images && damage.images.length > 0" class="mt-4">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📷 Bukti Foto</p>
                <div class="flex flex-wrap gap-3">
                  <div v-for="(img, idx) in damage.images" :key="idx" @click="openImagePreview(damage.images, damage.type_damage, idx)" class="relative w-24 h-24 rounded-lg overflow-hidden cursor-pointer border hover:opacity-90 transition no-print-action">
                    <img :src="getImageUrl(img)" class="w-full h-full object-cover" loading="lazy"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentReport.activities && currentReport.activities.length > 0" class="mb-8 pdf-page-break-before"> 
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">⚙️ Detail Aktivitas</h2>
          <div class="space-y-6">
            <div v-for="(activity, index) in currentReport.activities" :key="activity.activity_id" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 pdf-avoid-break-inside">
              <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div class="w-8 h-8 bg-[#0071f3] rounded-lg flex items-center justify-center text-white font-bold">{{ index + 1 }}</div>
                <div><h3 class="text-lg font-bold text-gray-900">{{ activity.act_name }}</h3></div>
              </div>
              <div class="space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label class="text-sm font-semibold text-gray-700 mb-2">CoA</label><div class="px-4 py-3 border-2 rounded-xl bg-gray-50 font-medium">{{ activity.CoA || '-' }}</div></div>
                  <div><label class="text-sm font-semibold text-gray-700 mb-2">Tenaga Kerja</label><div class="px-4 py-3 border-2 rounded-xl bg-gray-50 font-medium text-center">{{ activity.manpower || 0 }} pekerja</div></div>
                </div>
                <div v-if="activity.images && activity.images.length > 0" class="mb-2">
                  <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📷 Bukti Aktivitas</p>
                  <div class="flex flex-wrap gap-3">
                    <div v-for="(img, idx) in activity.images" :key="idx" @click="openImagePreview(activity.images, activity.act_name, idx)" class="relative w-24 h-24 rounded-lg overflow-hidden cursor-pointer border hover:opacity-90 transition no-print-action">
                      <img :src="getImageUrl(img)" class="w-full h-full object-cover" loading="lazy"/>
                    </div>
                  </div>
                </div>
                <div v-if="activity.materials && activity.materials.length > 0" class="bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
                  <h4 class="text-base font-bold text-blue-900 flex items-center gap-2 mb-4"><span class="text-lg">📦</span>Material ({{ activity.materials.length }})</h4>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead><tr class="border-b-2 border-blue-300"><th class="text-left py-2 px-3 font-semibold text-blue-900">Material</th><th class="text-right py-2 px-3 font-semibold text-blue-900">Qty</th><th class="text-center py-2 px-3 font-semibold text-blue-900">UOM</th><th class="text-right py-2 px-3 font-semibold text-blue-900">Total</th></tr></thead>
                      <tbody>
                        <tr v-for="mat in activity.materials" :key="mat.material_used_id" class="border-b border-blue-200 bg-white"><td class="py-3 px-3 font-semibold">{{ mat.material_name }}</td><td class="py-3 px-3 text-right">{{ formatNumber(mat.qty) }}</td><td class="py-3 px-3 text-center text-gray-600">{{ mat.uom }}</td><td class="py-3 px-3 text-right font-bold text-blue-700">{{ formatCurrency(mat.total_price || 0) }}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentReport.activities && currentReport.activities.some(a => a.materials && a.materials.length > 0)" class="mb-8 pdf-avoid-break-inside">
          <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-sm p-6 flex justify-between items-center">
            <div class="flex items-center gap-4"><div class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white text-2xl">💰</div><div><p class="text-sm text-green-600 font-semibold">Grand Total Cost</p><p class="text-xs text-green-700">Total biaya material</p></div></div>
            <p class="text-3xl font-bold text-green-700">{{ formatCurrency(calculateReportTotal()) }}</p>
          </div>
        </div>

      </template>
    </div>

    <div v-if="imagePreview.show" class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm no-print" @click.self="closeImagePreview">
      <div class="absolute top-6 right-6 flex gap-3">
        <button @click.stop="downloadCurrentImage" class="text-white hover:text-gray-300 p-2"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>
        <button @click="closeImagePreview" class="text-white hover:text-gray-300 p-2"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
      </div>
      <button v-if="imagePreview.images.length > 1" @click.stop="prevImage" class="absolute left-4 text-white hover:text-gray-300 p-3">‹</button>
      <div class="relative max-w-7xl max-h-[85vh] p-4 flex flex-col items-center">
        <img :src="getImageUrl(imagePreview.images[imagePreview.currentIndex])" class="max-w-full max-h-[80vh] rounded-lg shadow-xl object-contain"/>
        <div class="mt-4 text-center"><p class="text-white font-bold text-lg">{{ imagePreview.title }}</p><p class="text-gray-400 text-sm">Image {{ imagePreview.currentIndex + 1 }} of {{ imagePreview.images.length }}</p></div>
      </div>
      <button v-if="imagePreview.images.length > 1" @click.stop="nextImage" class="absolute right-4 text-white hover:text-gray-300 p-3">›</button>
    </div>
  </div>
</template>

<style scoped>
#print-area.printing-mode { font-size: 12px; }
@media print {
  .no-print { display: none !important; }
  .no-print-action { pointer-events: none; }
  #print-area { background: white !important; box-shadow: none !important; }
  body { background: white !important; }
  .pdf-avoid-break-inside { page-break-inside: avoid; }
  .pdf-page-break-before { page-break-before: always; }
}
</style>