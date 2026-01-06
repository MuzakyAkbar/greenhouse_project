<script setup>
import html2pdf from 'html2pdf.js'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { supabase } from '../lib/supabase'
import logoPG from '../assets/logoPG.svg'

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

// --- Approval History State ---
const approvalProgress = ref([])
const approvalHistory = ref([])

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

// --- Approval Logic ---
const loadApprovalProgress = async (recordId) => {
  try {
    const { data: recordData, error: recordErr } = await supabase
      .from('gh_approve_record')
      .select(`current_level_order, overall_status, flow_id, gh_approval_flow!inner(last_level, first_level)`)
      .eq('record_id', recordId)
      .single();
    
    if (recordErr) throw recordErr;

    const { data: levelStatuses, error: statusErr } = await supabase
      .from('gh_approval_level_status')
      .select(`level_status_id, level_order, level_name, status, approved_by, approved_at, revision_notes, revision_requested_by, revision_requested_at`)
      .eq('record_id', recordId)
      .order('level_order', { ascending: true });
    
    if (statusErr) throw statusErr;

    const approverIds = [...levelStatuses.map(s => s.approved_by), ...levelStatuses.map(s => s.revision_requested_by)].filter(Boolean);
    let approverNames = {};
    
    if (approverIds.length > 0) {
      const { data: users } = await supabase
        .from('user')
        .select('user_id, username, email')
        .in('user_id', approverIds);
      
      if (users) {
        approverNames = users.reduce((acc, user) => {
          acc[user.user_id] = user.username || user.email;
          return acc;
        }, {});
      }
    }

    approvalProgress.value = levelStatuses.map(level => ({
      ...level,
      approver_name: level.approved_by ? approverNames[level.approved_by] : null,
      revisor_name: level.revision_requested_by ? approverNames[level.revision_requested_by] : null,
      is_final_level: level.level_order === recordData.gh_approval_flow.last_level,
      level_status: level.status
    }));
    
  } catch (err) {
    console.error('Error loading approval progress:', err);
  }
};

const loadApprovalHistory = async (recordId) => {
  try {
    const { data, error } = await supabase
      .from('gh_approval_history')
      .select('*')
      .eq('record_id', recordId)
      .order('action_at', { ascending: true });
    
    if (error) throw error;
    
    const userIds = [...new Set(data.map(h => h.user_id).filter(Boolean))];
    let userNames = {};
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('user')
        .select('user_id, username, email')
        .in('user_id', userIds);
      
      if (users) {
        userNames = users.reduce((acc, user) => {
          acc[user.user_id] = user.username || user.email;
          return acc;
        }, {});
      }
    }
    
    approvalHistory.value = data.map(h => ({
      ...h,
      user_name: h.user_id ? (userNames[h.user_id] || 'Unknown') : 'System'
    }));
    
  } catch (err) {
    console.error('Error loading approval history:', err);
    approvalHistory.value = [];
  }
};

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

    const { data: report, error: fetchError } = await supabase
      .from('gh_report')
      .select(`
        *,
        type_damages:gh_type_damage(*),
        activities:gh_activity(
          *, 
          materials:gh_material_used(*),
          workers:gh_activity_worker(*, worker:gh_worker(name, role, hourly_salary))
        )
      `)
      .eq('report_id', report_id.value)
      .single();
    
    if (fetchError) throw fetchError;
    if (!report) throw new Error('Laporan tidak ditemukan');

    currentReport.value = report;
    if (report.phase_id) phaseInfo.value = await loadPhaseInfo(report.phase_id);
    
    // 2. Load Env Log
    if (report.location_id && report.report_date) {
      await loadEnvironmentLog(report.location_id, report.report_date)
    }

    // 3. Load Approval Record & History
    const { data: recordData } = await supabase
      .from('gh_approve_record')
      .select('record_id')
      .eq('entity_id', report.report_id)
      .eq('table_name', 'gh_report')
      .maybeSingle();

    if (recordData) {
      await loadApprovalProgress(recordData.record_id);
      await loadApprovalHistory(recordData.record_id);
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
const formatNumber = (value) => Number(value || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const formatCurrency = (value) => 'Rp ' + formatNumber(value)

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const calculateActivityTotal = (materials) => {
  if (!materials) return 0
  return materials.reduce((sum, mat) => sum + (Number(mat.total_price) || 0), 0)
}

// Calculate labor cost
const calculateLaborCost = (workers) => {
  if (!workers || workers.length === 0) return 0
  return workers.reduce((sum, w) => {
    const hours = Number(w.hours_worked) || 0
    const salary = Number(w.hourly_rate_snapshot || w.worker?.hourly_salary) || 0
    return sum + (hours * salary)
  }, 0)
}

// Calculate total activity cost (materials + labor)
const calculateActivityTotalCost = (activity) => {
  const materialCost = calculateActivityTotal(activity.materials || [])
  const laborCost = calculateLaborCost(activity.workers || [])
  return materialCost + laborCost
}

// Calculate grand total including labor
const calculateReportTotal = () => {
  if (!currentReport.value?.activities) return 0
  return currentReport.value.activities.reduce((sum, act) => sum + calculateActivityTotalCost(act), 0)
}

// Calculate total material cost
const calculateReportMaterialTotal = () => {
  if (!currentReport.value?.activities) return 0
  return currentReport.value.activities.reduce((sum, act) => sum + calculateActivityTotal(act.materials), 0)
}

// Calculate total labor cost
const calculateReportLaborTotal = () => {
  if (!currentReport.value?.activities) return 0
  return currentReport.value.activities.reduce((sum, act) => sum + calculateLaborCost(act.workers), 0)
}

// ===========================================
// 3. PRINT LOGIC
// ===========================================
const printReport = async () => {
  const element = document.getElementById('print-area')
  if (!element) return
  
  const originalTitle = document.title
  document.title = `Report_${currentReport.value.report_id}`
  
  element.classList.add('printing-mode') // Class penting untuk styling
  
  const opt = {
    margin: [10, 10, 10, 10], // Margin atas, kiri, bawah, kanan (mm)
    filename: `Report_${currentReport.value.report_id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
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
  <div class="min-h-screen bg-gray-50">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 no-print">
      <div class="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button @click="() => router.push(sourcePage)" class="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
             <svg class="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 448 512"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>
          </button>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Laporan Aktivitas #{{ report_id }}</h1>
          </div>
        </div>
        <button @click="printReport" class="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700">
          🖨️ Cetak PDF
        </button>
      </div>
    </div>

    <div id="print-area" class="max-w-5xl mx-auto px-6 py-8 bg-white">
      
      <div v-if="loading" class="text-center py-10 no-print">Loading...</div>
      <div v-else-if="error" class="p-4 bg-red-50 text-red-700 border border-red-200 rounded no-print">{{ error }}</div>

      <template v-else-if="currentReport">
        
        <div class="mb-6 border-b-2 border-gray-800 pb-4">
          <div class="flex justify-between items-end">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 uppercase tracking-wider">Laporan Aktivitas</h1>
              <p class="text-sm text-gray-500 mt-1">Potato Grow Management System</p>
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold text-gray-200">#{{ currentReport.report_id }}</div>
              <div class="text-sm font-bold" :class="currentReport.report_status === 'approved' ? 'text-green-600' : 'text-yellow-600'">
                {{ currentReport.report_status === 'approved' ? 'APPROVED' : currentReport.report_status.toUpperCase() }}
              </div>
            </div>
          </div>
        </div>

        <div class="mb-6 pdf-avoid-break-inside">
          <h2 class="section-title">Informasi Dasar</h2>
          <div class="grid grid-cols-3 gap-4 border border-gray-200 rounded-lg p-4 bg-gray-50 print-bg-none">
            <div><label class="label-text">Tanggal</label><div class="value-text">{{ formatDate(currentReport.report_date) }}</div></div>
            <div><label class="label-text">Lokasi</label><div class="value-text">{{ getLocationName(currentReport.location_id) }}</div></div>
            <div><label class="label-text">Batch & Fase</label><div class="value-text">{{ getBatchName(currentReport.batch_id) }} - {{ phaseInfo }}</div></div>
          </div>
        </div>

        <div class="mb-6 pdf-avoid-break-inside">
           <h2 class="section-title">Catatan Lingkungan</h2>
           
           <div v-if="envLogData" class="grid grid-cols-4 gap-3">
              <div v-for="sessionKey in ['morning', 'noon', 'afternoon', 'night']" :key="sessionKey" class="border border-gray-200 rounded p-2 text-center print-border-gray">
                 <div class="font-bold text-xs uppercase mb-1 border-b pb-1 bg-gray-50 print-bg-none flex justify-between px-1">
                    <span>{{ sessionLabels[sessionKey].label }}</span>
                    <span class="text-[10px] text-gray-500 font-normal">{{ envLogData[`time_${sessionKey}`] || '--:--' }}</span>
                 </div>
                 
                 <div class="space-y-1 text-left px-1">
                    <div v-for="(param, pKey) in paramLabels" :key="pKey" class="flex justify-between items-center text-xs">
                       <span class="text-gray-500">{{ param.label }}</span>
                       <div class="flex items-center gap-1">
                          <span class="font-bold">{{ envLogData[`${pKey}_${sessionKey}`] || '-' }}</span>
                          <span v-if="envLogData[`${pKey}_${sessionKey}`]" class="text-[9px] font-normal text-gray-400">{{ param.unit }}</span>
                          <span v-if="envLogData[`img_${pKey}_${sessionKey}`]" class="text-[8px] cursor-pointer no-print" @click="openEnvImagePreview(envLogData[`img_${pKey}_${sessionKey}`], `${sessionLabels[sessionKey].label} - ${param.label}`)">📷</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div v-else class="border border-gray-200 border-dashed rounded-lg p-4 text-center text-gray-400 text-sm italic bg-gray-50 print-bg-none">
             Tidak ada catatan data lingkungan untuk tanggal ini.
           </div>
        </div>

        <div v-if="currentReport.activities && currentReport.activities.length > 0">
          <h2 class="section-title mb-4">Detail Aktivitas</h2>
          
          <div class="space-y-6">
            <div v-for="(activity, index) in currentReport.activities" :key="activity.activity_id" class="activity-card mb-6 border-b-2 border-dashed border-gray-300 pb-6">
              
              <div class="flex items-start gap-3 mb-3 pdf-avoid-break-inside">
                <span class="bg-gray-800 text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold mt-0.5">{{ index + 1 }}</span>
                <div class="flex-1">
                  <h3 class="text-lg font-bold text-gray-900 leading-tight">{{ activity.act_name }}</h3>
                  <div class="flex gap-4 mt-1 text-xs text-gray-600">
                    <span>CoA: <b>{{ activity.CoA || '-' }}</b></span>
                    <span>Tenaga: <b>{{ activity.manpower || '0' }} Org</b></span>
                  </div>
                </div>
                <div class="text-right">
                   <span class="block text-xs text-gray-500">Total Biaya</span>
                   <span class="text-lg font-bold text-gray-900">{{ formatCurrency(calculateActivityTotalCost(activity)) }}</span>
                </div>
              </div>

              <div class="pl-9 space-y-4">
                <div v-if="activity.materials && activity.materials.length > 0" class="pdf-avoid-break-inside">
                  <div class="text-xs font-bold text-gray-500 uppercase mb-1 border-l-4 border-blue-500 pl-2">Material</div>
                  <table class="w-full text-xs border-collapse">
                    <thead class="bg-gray-100 print-bg-gray">
                      <tr>
                        <th class="p-2 text-left border border-gray-300 w-1/2">Item</th>
                        <th class="p-2 text-right border border-gray-300">Qty</th>
                        <th class="p-2 text-right border border-gray-300">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="mat in activity.materials" :key="mat.material_used_id" class="pdf-avoid-break-inside">
                        <td class="p-2 border border-gray-300">{{ mat.material_name }} <span class="text-gray-400 text-[10px]">({{ mat.uom }})</span></td>
                        <td class="p-2 border border-gray-300 text-right">{{ formatNumber(mat.qty) }}</td>
                        <td class="p-2 border border-gray-300 text-right font-medium">{{ formatCurrency(mat.total_price) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-if="activity.workers && activity.workers.length > 0" class="pdf-avoid-break-inside">
                  <div class="text-xs font-bold text-gray-500 uppercase mb-1 border-l-4 border-orange-500 pl-2">Tenaga Kerja</div>
                  <table class="w-full text-xs border-collapse">
                    <thead class="bg-gray-100 print-bg-gray">
                      <tr>
                        <th class="p-2 text-left border border-gray-300 w-1/2">Nama</th>
                        <th class="p-2 text-right border border-gray-300">Jam</th>
                        <th class="p-2 text-right border border-gray-300">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="w in activity.workers" :key="w.activity_worker_id" class="pdf-avoid-break-inside">
                        <td class="p-2 border border-gray-300">
                          {{ w.worker?.name }} 
                          <span class="block text-[10px] text-gray-500">{{ w.worker?.role }}</span>
                        </td>
                        <td class="p-2 border border-gray-300 text-right">{{ formatNumber(w.hours_worked) }}</td>
                        <td class="p-2 border border-gray-300 text-right font-medium">
                          {{ formatCurrency((w.hours_worked || 0) * (w.hourly_rate_snapshot || w.worker?.hourly_salary || 0)) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div class="mt-4 border-t-4 border-gray-800 pt-4 pdf-avoid-break-inside">
          <div class="flex justify-end">
            <div class="w-full md:w-1/2">
              <div class="flex justify-between py-2 border-b border-gray-200">
                <span class="text-sm text-gray-600">Total Material</span>
                <span class="font-bold">{{ formatCurrency(calculateReportMaterialTotal()) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-gray-200">
                <span class="text-sm text-gray-600">Total Tenaga Kerja</span>
                <span class="font-bold">{{ formatCurrency(calculateReportLaborTotal()) }}</span>
              </div>
              <div class="flex justify-between py-3 items-center mt-2">
                <span class="text-base font-bold text-gray-900 uppercase">Grand Total</span>
                <span class="text-2xl font-bold text-gray-900 bg-yellow-100 px-2 print-bg-none">{{ formatCurrency(calculateReportTotal()) }}</span>
              </div>
            </div>
          </div>
        </div>

      </template>
    </div>
    
    <div v-if="imagePreview.show" class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm no-print" @click.self="closeImagePreview">
      <div class="absolute top-6 right-6 flex gap-3">
        <button @click.stop="downloadCurrentImage" class="text-white hover:text-gray-300 p-2 bg-white/10 hover:bg-white/20 rounded-full transition" title="Download">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </button>
        <button @click="closeImagePreview" class="text-white hover:text-gray-300 p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <button v-if="imagePreview.images.length > 1" @click.stop="prevImage" class="absolute left-4 md:left-8 text-white hover:text-gray-300 p-3 rounded-full bg-white/10 hover:bg-white/20 transition text-4xl">‹</button>
      <div class="relative max-w-7xl max-h-[85vh] p-4 flex flex-col items-center">
        <img :src="getImageUrl(imagePreview.images[imagePreview.currentIndex])" class="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain select-none"/>
        <div class="mt-4 text-center">
          <p class="text-white font-bold text-lg md:text-xl">{{ imagePreview.title }}</p>
          <p class="text-gray-400 text-sm mt-1">Gambar {{ imagePreview.currentIndex + 1 }} dari {{ imagePreview.images.length }}</p>
        </div>
      </div>
      <button v-if="imagePreview.images.length > 1" @click.stop="nextImage" class="absolute right-4 md:right-8 text-white hover:text-gray-300 p-3 rounded-full bg-white/10 hover:bg-white/20 transition text-4xl">›</button>
    </div>

  </div>
</template>

<style scoped>
/* GENERAL STYLES */
.section-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 4px;
  margin-bottom: 12px;
}
.label-text {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  display: block;
}
.value-text {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

/* PRINTING MODE STYLES */
/* Style ini aktif saat class 'printing-mode' ditambahkan oleh JS */
#print-area.printing-mode {
  background-color: white !important;
  color: black !important;
  font-family: Arial, sans-serif;
  padding: 0 !important;
}

/* Menghilangkan Shadow dan Background saat Print agar bersih */
#print-area.printing-mode .shadow-sm,
#print-area.printing-mode .shadow-md,
#print-area.printing-mode .shadow-lg {
  box-shadow: none !important;
}

#print-area.printing-mode .bg-gray-50,
#print-area.printing-mode .bg-blue-50,
#print-area.printing-mode .bg-yellow-50 {
  background-color: transparent !important; /* Hemat tinta */
}

/* Force border visible saat print */
#print-area.printing-mode .print-bg-gray {
  background-color: #f3f4f6 !important;
  -webkit-print-color-adjust: exact; 
}

/* PAGE BREAK CONTROL - SANGAT PENTING */
.pdf-avoid-break-inside {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}

tr {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}

/* Pastikan tabel tidak terpotong header-nya */
thead {
  display: table-header-group; 
}
tfoot {
  display: table-footer-group;
}

/* Mengatur ukuran font khusus saat print agar muat lebih banyak */
#print-area.printing-mode {
  font-size: 12px; 
}
#print-area.printing-mode h1 { font-size: 20px; }
#print-area.printing-mode h2 { font-size: 14px; }
#print-area.printing-mode h3 { font-size: 14px; }
#print-area.printing-mode table { font-size: 10px; }

@media print {
  .no-print { display: none !important; }
}
</style>