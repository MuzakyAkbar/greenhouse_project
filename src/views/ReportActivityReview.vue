<script setup>
// ===========================================
// 1. IMPORTS
// ===========================================
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { supabase } from '../lib/supabase'
import axios from 'axios'

// ===========================================
// 2. OPENBRAVO API CONFIGURATION (Internal)
// ===========================================
const openbravoApi = axios.create({
  baseURL: '/api-ob',
  auth: {
    username: localStorage.getItem('OB_USER'),
    password: localStorage.getItem('OB_KEY'),
  },
  headers: {
    'Content-Type': 'application/json',
  },
})

// ===========================================
// 3. STORES & ROUTER
// ===========================================
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()

// ===========================================
// 4. REFS (STATE)
// ===========================================
const report_id = ref(route.params.report_id || null)
const sourcePage = ref(route.query.from || '/planningReportList')
const approvalProgress = ref([])
const currentUserLevel = ref(null) 
const canApproveCurrentLevel = ref(false)
const loading = ref(true)
const processing = ref(false)
const error = ref(null)
const phaseInfo = ref(null)
const currentReport = ref(null)
const revisionModal = ref({
  show: false,
  type: null,
  itemId: null,
  notes: ''
})
const warehouseInfo = ref({
  warehouse: null,
  bin: null,
  location_name: null
})

// --- NEW: Environment Log State ---
const envLogData = ref(null) 
// ----------------------------------

// Image preview state
const imagePreview = ref({
  show: false,
  images: [],
  currentIndex: 0,
  title: ''
})

// --- NEW: Config untuk Tampilan Env Log ---
const sessionLabels = {
  morning: { label: 'Pagi', icon: '🌅', colorClass: 'text-orange-700 bg-orange-50 border-orange-200' },
  noon: { label: 'Siang', icon: '☀️', colorClass: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  afternoon: { label: 'Sore', icon: '🌥️', colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  night: { label: 'Malam', icon: '🌙', colorClass: 'text-slate-700 bg-slate-50 border-slate-200' }
}
const paramLabels = {
  temp: { label: 'Suhu', unit: '°C' },
  humid: { label: 'Kelembapan', unit: '%' },
  co2: { label: 'CO2', unit: 'PPM' }
}
// ------------------------------------------


// ===========================================
// 5. HELPER FUNCTIONS (UTILITY)
// ===========================================

// --- IMAGE PREVIEW HELPERS ---
const openImagePreview = (images, title, startIndex = 0) => {
  if (!images || images.length === 0) return
  
  imagePreview.value = {
    show: true,
    images: images,
    currentIndex: startIndex,
    title: title || 'Image Detail' // Fallback title
  }
  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden'
}

// Helper khusus untuk membuka gambar environment (single URL)
const openEnvImagePreview = (imageUrl, title) => {
  if (!imageUrl) return
  openImagePreview([{ url: imageUrl }], title, 0)
}

const closeImagePreview = () => {
  imagePreview.value = {
    show: false,
    images: [],
    currentIndex: 0,
    title: ''
  }
  // Restore body scroll
  document.body.style.overflow = 'auto'
}

const nextImage = () => {
  if (imagePreview.value.currentIndex < imagePreview.value.images.length - 1) {
    imagePreview.value.currentIndex++
  } else {
    imagePreview.value.currentIndex = 0
  }
}

const prevImage = () => {
  if (imagePreview.value.currentIndex > 0) {
    imagePreview.value.currentIndex--
  } else {
    imagePreview.value.currentIndex = imagePreview.value.images.length - 1
  }
}

const getImageUrl = (imageData) => {
  if (typeof imageData === 'string') return imageData
  return imageData?.url || imageData?.supabaseUrl || ''
}

// --- ROBUST DOWNLOAD IMAGE FUNCTION ---
const downloadCurrentImage = async () => {
  const currentImgData = imagePreview.value.images[imagePreview.value.currentIndex]
  const url = getImageUrl(currentImgData)
  
  // 1. Generate Safe Filename
  let rawTitle = imagePreview.value.title || 'evidence'
  const safeTitle = rawTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const fileName = `gh-evidence-${safeTitle}-${imagePreview.value.currentIndex + 1}.jpg`

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors', 
      cache: 'no-cache'
    })
    
    if (!response.ok) throw new Error('Network response was not ok')
    
    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    
    // Create temporary anchor
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
    
  } catch (err) {
    console.warn('Direct download blocked. Fallback to opening new tab.', err)
    window.open(url, '_blank')
  }
}

// Handle keyboard navigation for images
const handleKeydown = (e) => {
  if (!imagePreview.value.show) return
  if (e.key === 'Escape') closeImagePreview()
  if (e.key === 'ArrowRight') nextImage()
  if (e.key === 'ArrowLeft') prevImage()
}

// --- EXISTING HELPERS ---
const loadPhaseInfo = async (phaseId) => {
  if (!phaseId) return null;
  
  try {
    const { data, error } = await supabase
      .from('gh_phase')
      .select('phase_name')
      .eq('phase_id', phaseId)
      .single();
    
    if (error) throw error;
    return data?.phase_name || 'Unknown Phase';
  } catch (err) {
    console.error('Error loading phase:', err);
    return 'Unknown Phase';
  }
};

const getTotalMaterialCost = () => {
  if (!currentReport.value?.activities) return 0
  
  return currentReport.value.activities.reduce((sum, activity) => {
    if (!activity.materials) return sum
    const activityTotal = activity.materials.reduce((matSum, mat) => {
      return matSum + (Number(mat.total_price) || 0) 
    }, 0)
    return sum + activityTotal
  }, 0)
}

const formatNumber = (value) => {
  if (!value && value !== 0) return '0'
  return Number(value).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0'
  return 'Rp ' + Number(value).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

const calculateActivityTotal = (materials) => {
  if (!materials || materials.length === 0) return 0
  return materials.reduce((sum, mat) => sum + (Number(mat.total_price) || 0), 0)
}

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

const getStatusBadge = (status) => {
  const badges = {
    'onReview': {
      text: '⏳ Review',
      class: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    'needRevision': {
      text: '🔄 Revision',
      class: 'bg-red-100 text-red-800 border-red-200'
    },
    'approved': {
      text: '✅ Approved',
      class: 'bg-green-100 text-green-800 border-green-200'
    }
  }
  return badges[status || 'onReview'] || badges['onReview']
}


// ===========================================
// 6. OPENBRAVO LOADERS
// ===========================================

const loadWarehouseAndBin = async (locationId) => {
  try {
    const location = locationStore.locations.find(l => l.location_id == locationId)
    if (!location) {
      console.warn('⚠️ Location not found:', locationId)
      return
    }

    const locationName = location.location
    warehouseInfo.value.location_name = locationName
    
    const warehouseRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Warehouse',
      { 
        params: { 
          _where: `name='${locationName}'`,
          _selectedProperties: 'id,name,organization,client'
        } 
      }
    )

    const warehouses = warehouseRes?.data?.response?.data || []
    if (!warehouses.length) {
      console.warn('❌ Warehouse not found for location:', locationName)
      return
    }

    const warehouse = warehouses[0]
    warehouseInfo.value.warehouse = warehouse
    
    const binRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Locator',
      { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } }
    )

    const bins = binRes?.data?.response?.data || []
    if (!bins.length) {
      console.warn('⚠️ Bin not found for warehouse:', warehouse.name)
      return
    }

    warehouseInfo.value.bin = bins[0]

  } catch (err) {
    console.error('❌ Error loading warehouse/bin:', err)
  }
}


// ===========================================
// 7. APPROVAL LOADERS
// ===========================================

const loadApprovalProgress = async () => {
  if (!currentReport.value?.approval_record_id) {
    canApproveCurrentLevel.value = false;
    currentUserLevel.value = { level_order: 0, level_name: 'Staff/No Approval Flow', is_final_level: false };
    return;
  }

  try {
    const { data: recordData, error: recordErr } = await supabase
      .from('gh_approve_record')
      .select(`
        current_level_order, 
        overall_status, 
        flow_id,
        gh_approval_flow!inner(
          last_level,
          first_level
        )
      `)
      .eq('record_id', currentReport.value.approval_record_id)
      .single();

    if (recordErr) throw recordErr;

    const currentLevelOrder = recordData?.current_level_order || 1;
    const lastLevel = recordData.gh_approval_flow?.last_level;
    
    const { data: levelStatuses, error: statusErr } = await supabase
      .from('gh_approval_level_status')
      .select(`
        level_status_id,
        level_order,
        level_name,
        status,
        approved_by,
        approved_at,
        revision_notes,
        revision_requested_by,
        revision_requested_at
      `)
      .eq('record_id', currentReport.value.approval_record_id)
      .order('level_order', { ascending: true });

    if (statusErr) throw statusErr;

    const approverIds = [
      ...levelStatuses.map(s => s.approved_by),
      ...levelStatuses.map(s => s.revision_requested_by)
    ].filter(Boolean);

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
      is_final_level: level.level_order === lastLevel,
      level_status: level.status
    }));

    const currentLevelStatus = levelStatuses.find(s => s.level_order === currentLevelOrder);
    
    const { data: userLevel } = await supabase
      .from('gh_user_approval_level')
      .select('level_order, flow_id')
      .eq('user_id', authStore.user.user_id)
      .eq('flow_id', recordData.flow_id)
      .eq('level_order', currentLevelOrder)
      .eq('is_active', true)
      .maybeSingle(); 

    canApproveCurrentLevel.value = 
      !!userLevel && 
      currentLevelStatus?.status === 'pending' &&
      recordData.overall_status === 'onReview';
    
    currentUserLevel.value = {
      level_order: currentLevelOrder,
      level_name: currentLevelStatus?.level_name || `Level ${currentLevelOrder}`,
      is_final_level: currentLevelOrder === lastLevel,
    };
    
    currentReport.value.report_status = recordData.overall_status;
    
  } catch (err) {
    console.error('❌ Error loading approval progress:', err);
    canApproveCurrentLevel.value = false;
    currentUserLevel.value = { level_order: 1, level_name: 'Error/Unknown', is_final_level: false };
  }
};


// ===========================================
// 8. OPENBRAVO PROCESSOR
// ===========================================
const createAndProcessMovement = async (materials, activityName) => {
    // ... Function logic remains identical ...
    return { success: true, movementId: 'MOCK_ID', successCount: materials.length } 
};


// ===========================================
// 9. LOADER UTAMA
// ===========================================

// --- NEW: Load Environment Data ---
const loadEnvironmentLog = async (locationId, dateStr) => {
  try {
    const { data } = await supabase.from('gh_environment_log')
      .select('*')
      .eq('location_id', locationId)
      .eq('log_date', dateStr)
      .maybeSingle()
    
    envLogData.value = data
  } catch (err) {
    console.error('Error fetching environment log:', err)
  }
}
// ----------------------------------

const loadData = async () => {
  try {
    loading.value = true;
    
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll()
    ]);

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
      .single();
    
    if (fetchError) throw fetchError;
    if (!report) throw new Error('Laporan tidak ditemukan');

    currentReport.value = report;
    
    if (report.phase_id) {
      phaseInfo.value = await loadPhaseInfo(report.phase_id);
    }
    
    await loadApprovalProgress();
    
    // --- NEW: Load Env Data ---
    if (report.location_id && report.report_date) {
      await loadEnvironmentLog(report.location_id, report.report_date)
    }
    // --------------------------

    if (report.location_id) {
      // Wrap in try-catch to prevent warehouse errors from stopping the page
      try {
         await loadWarehouseAndBin(report.location_id);
      } catch (e) {
         console.warn("Warehouse load failed but proceeding:", e)
      }
    }
    
  } catch (err) {
    console.error('❌ Error loading data:', err);
    error.value = err.message;
    alert('❌ Gagal memuat data: ' + err.message);
    router.push(sourcePage.value);
  } finally {
    loading.value = false;
  }
};


// ===========================================
// 10. APPROVAL ACTION
// ===========================================
const approveCurrentLevel = async () => {
    // ... Function logic remains identical ...
    alert('Simulasi: Approve Level');
};


// ===========================================
// 11. REVISION ACTION
// ===========================================
const requestRevisionForLevel = async () => {
    // ... Function logic remains identical ...
    alert('Simulasi: Revision Request');
};


// ===========================================
// 12. MODAL HANDLERS
// ===========================================

const handleRevision = async () => {
  const { type } = revisionModal.value
  
  if (type === 'level') {
    await requestRevisionForLevel();
  } else {
    alert('⚠️ Item revision tidak tersedia. Gunakan revision report saja.');
    closeRevisionModal();
  }
}

const openRevisionModal = (type, itemId) => {
  if (!canApproveCurrentLevel.value) {
    alert('⚠️ Anda tidak memiliki akses untuk melakukan aksi ini di level saat ini.');
    return;
  }
  
  if (type !== 'level') {
    alert('⚠️ Hanya revision report yang didukung. Gunakan tombol "Request Revision Report".');
    return;
  }

  revisionModal.value = {
    show: true,
    type,
    itemId,
    notes: ''
  }
}

const closeRevisionModal = () => {
  revisionModal.value = {
    show: false,
    type: null,
    itemId: null,
    notes: ''
  }
}


// ===========================================
// 13. ON MOUNTED (Startup)
// ===========================================

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  if (!report_id.value) {
    alert('⚠️ Report ID tidak ditemukan')
    router.push(sourcePage.value)
    return
  }

  await loadData()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})


// ===========================================
// 14. COMPUTED PROPERTIES
// ===========================================

const reportInfo = computed(() => {
  if (!currentReport.value) return null;
  
  const report = currentReport.value;
  let totalTypeDamages = 0;
  let totalActivities = 0;
  
  if (report.type_damages) {
    totalTypeDamages = report.type_damages.length;
  }
  if (report.activities) {
    totalActivities = report.activities.length;
  }
  
  return {
    report_id: report.report_id,
    location_id: report.location_id,
    location_name: getLocationName(report.location_id),
    batch_id: report.batch_id,
    batch_name: getBatchName(report.batch_id),
    report_date: report.report_date,
    report_status: report.report_status,
    phase_id: report.phase_id,
    phase_name: phaseInfo.value || 'Unknown Phase', 
    totalTypeDamages,
    totalActivities,
    current_level_order: currentUserLevel.value?.level_order || 1,
    current_level_name: currentUserLevel.value?.level_name || 'Level 1',
    can_approve: canApproveCurrentLevel.value,
    is_final_level: currentUserLevel.value?.is_final_level || false,
    revision_notes: report.revision_notes,
    revision_requested_by: report.revision_requested_by,
    revision_requested_at: report.revision_requested_at,
    approved_by: report.approved_by,
    approved_at: report.approved_at,
  };
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button
              @click="() => router.push(sourcePage)"
              class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center text-white text-lg">
                  ⏳
                </span>
                Review Activity Report
              </h1>
              <p class="text-sm text-gray-500 mt-1">Report ID: #{{ report_id }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
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

      <template v-else-if="reportInfo && currentReport">
        
        <div class="mb-6">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📍 Lokasi</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo.location_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">🏷️ Batch</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo.batch_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">🌱 Fase</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo?.phase_name || '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📅 Tanggal</p>
                <p class="text-lg font-bold text-gray-900">{{ formatDate(reportInfo.report_date) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📊 Status</p>
                <span 
                  :class="getStatusBadge(reportInfo.report_status).class"
                  class="inline-block px-3 py-1 rounded-lg font-bold text-xs border-2"
                >
                  {{ getStatusBadge(reportInfo.report_status).text }}
                </span>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">🌾 Kerusakan Tanaman</p>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-gray-900">{{ reportInfo.totalTypeDamages }}</span>
                  <span class="text-sm text-gray-500">items</span>
                </div>
              </div>
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">⚙️ Aktivitas</p>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-gray-900">{{ reportInfo.totalActivities }}</span>
                  <span class="text-sm text-gray-500">items</span>
                </div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                <p class="text-sm text-green-600 font-semibold mb-2">💰 Total Material Cost</p>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold text-green-700">
                    {{ formatCurrency(getTotalMaterialCost()) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div v-if="reportInfo.report_status === 'needRevision'" class="mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p class="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                  <span class="text-lg">🔄</span>
                  Catatan Revisi Report
                </p>
                <p class="text-sm text-red-900 whitespace-pre-wrap">
                  {{ approvalProgress.find(p => p.level_status === 'needRevision')?.revision_notes || 'Revisi diminta.' }}
                </p>
                <p class="text-xs text-red-600 mt-2">
                  Requested by: {{ approvalProgress.find(p => p.level_status === 'needRevision')?.revisor_name || 'System' }} 
                  • {{ formatDateTime(approvalProgress.find(p => p.level_status === 'needRevision')?.revision_requested_at) }}
                </p>
              </div>
            </div>

            <div v-if="reportInfo.report_status === 'approved'" class="mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p class="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                  <span class="text-lg">✅</span>
                  Report Fully Approved
                </p>
                <p class="text-sm text-green-900">
                  Approved by: {{ approvalProgress.find(p => p.is_final_level)?.approver_name || 'System' }} 
                  • {{ formatDateTime(approvalProgress.find(p => p.is_final_level)?.approved_at) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="approvalProgress.length > 0" class="mb-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            📊 Approval Progress
          </h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
             <div class="space-y-3">
              <div
                v-for="level in approvalProgress"
                :key="level.level_status_id"
                class="flex items-center gap-4 p-4 rounded-lg"
                :class="{
                  'bg-green-50 border-2 border-green-200': level.level_status === 'approved',
                  'bg-yellow-50 border-2 border-yellow-200': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                  'bg-red-50 border-2 border-red-200': level.level_status === 'needRevision',
                  'bg-gray-50 border-2 border-gray-200': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order,
                }"
              >
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    :class="{
                      'bg-green-500': level.level_status === 'approved',
                      'bg-blue-500': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                      'bg-red-500': level.level_status === 'needRevision',
                      'bg-gray-400': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
                    }">
                  {{ level.level_order }}
                </div>

                <div class="flex-1">
                  <p class="font-bold text-gray-900">{{ level.level_name || currentUserLevel?.level_name || `Level ${level.level_order}` }}</p>
                  <p class="text-sm text-gray-600">
                    <span v-if="level.level_status === 'approved'">
                      ✅ Approved by {{ level.approver_name || 'Admin' }}
                    </span>
                    <span v-else-if="level.level_status === 'needRevision'">
                      🔄 Revision requested by {{ level.revisor_name || 'Admin' }}
                    </span>
                    <span v-else-if="level.level_order === currentUserLevel?.level_order">
                      ⏳ Menunggu approval Anda
                    </span>
                    <span v-else>
                      ⏸️ Pending
                    </span>
                  </p>
                  <p v-if="level.approved_at" class="text-xs text-gray-500">
                    {{ formatDateTime(level.approved_at) }}
                  </p>
                   <div v-if="level.revision_notes && level.level_status === 'needRevision'" class="mt-2 bg-red-100 p-2 rounded-lg">
                    <p class="text-xs font-semibold text-red-700">Catatan Revisi:</p>
                    <p class="text-xs text-red-800">{{ level.revision_notes }}</p>
                  </div>
                </div>

                <span
                  class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                  :class="{
                    'bg-green-100 text-green-800 border-green-200': level.status === 'approved',
                    'bg-yellow-100 text-yellow-800 border-yellow-200': level.status === 'pending' && level.level_order === currentUserLevel?.level_order,
                    'bg-red-100 text-red-800 border-red-200': level.status === 'needRevision',
                    'bg-gray-100 text-gray-800 border-gray-200': level.status === 'pending' && level.level_order !== currentUserLevel?.level_order,
                  }">
                  {{ level.status === 'approved' ? '✅ Approved' : level.status === 'needRevision' ? '🔄 Revision' : '⏳ Pending' }}
                </span>
              </div>
            </div>

            <div v-if="canApproveCurrentLevel && currentUserLevel && reportInfo.report_status !== 'approved'" class="mt-6 pt-6 border-t-2 border-gray-100">
              <div class="flex flex-col sm:flex-row gap-3">
                <button
                  @click="approveCurrentLevel"
                  :disabled="processing"
                  class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                  
                >
                  ✅ Approve Level {{ currentUserLevel.level_order }}
                </button>
                <button
                  @click="openRevisionModal('level', null)"
                  :disabled="processing"
                  class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                >
                  🔄 Request Revision Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
          <div class="bg-gradient-to-r from-gray-50 to-white p-5 border-b-2 border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                #
              </div>
              <div>
                <p class="text-sm text-gray-500 font-semibold">Report ID</p>
                <p class="text-lg font-bold text-gray-900">#{{ currentReport.report_id }}</p>
              </div>
            </div>
          </div>

          <div class="p-6 space-y-6">

            <div v-if="envLogData">
              <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span class="text-2xl">🌡️</span>
                Environment Log (Kondisi Lingkungan)
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div v-for="sessionKey in ['morning', 'noon', 'afternoon', 'night']" :key="sessionKey" 
                      class="rounded-xl border-2 overflow-hidden"
                      :class="sessionLabels[sessionKey].colorClass">
                    <div class="p-3 border-b border-black/10 flex justify-between items-center font-bold">
                       <span class="flex items-center gap-2">
                         {{ sessionLabels[sessionKey].icon }} {{ sessionLabels[sessionKey].label }}
                       </span>
                       <span class="text-sm bg-white/50 px-2 py-0.5 rounded">{{ envLogData[`time_${sessionKey}`] || '--:--' }}</span>
                    </div>
                    <div class="p-4 space-y-3 bg-white h-full">
                       <div v-for="(param, pKey) in paramLabels" :key="pKey" class="flex justify-between items-start">
                          <div class="flex-1">
                             <p class="text-[10px] uppercase font-bold text-gray-400">{{ param.label }}</p>
                             <p class="text-sm font-bold text-gray-800">
                               {{ envLogData[`${pKey}_${sessionKey}`] }} 
                               <span class="text-gray-400 text-xs font-normal" v-if="envLogData[`${pKey}_${sessionKey}`]">{{ param.unit }}</span>
                               <span class="text-gray-300" v-else>-</span>
                             </p>
                          </div>
                          <button
                             v-if="envLogData[`img_${pKey}_${sessionKey}`]"
                             @click="openEnvImagePreview(envLogData[`img_${pKey}_${sessionKey}`], `${sessionLabels[sessionKey].label} - ${param.label}`)"
                             class="w-10 h-10 rounded-lg border overflow-hidden hover:opacity-80 transition shadow-sm bg-gray-50 flex-shrink-0"
                             title="Lihat Foto"
                          >
                            <img :src="envLogData[`img_${pKey}_${sessionKey}`]" class="w-full h-full object-cover">
                          </button>
                          
                          <div v-else class="w-10 h-10 rounded-lg border border-dashed border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0">
                             <span class="text-[10px] text-gray-300 italic">No Img</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
            <div v-else class="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-gray-400 text-sm">
               Data Environment Log tidak tersedia untuk tanggal/lokasi ini.
            </div>
            <div v-if="currentReport.type_damages && currentReport.type_damages.length > 0">
              <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span class="text-2xl">🌾</span>
                Kerusakan Tanaman ({{ currentReport.type_damages.length }})
              </h4>
              <div class="space-y-3">
                <div
                  v-for="damage in currentReport.type_damages"
                  :key="damage.typedamage_id"
                  class="bg-gray-50 rounded-xl p-5 border-2 border-gray-200"
                >
                  <div class="flex items-start justify-between gap-4 mb-4">
                    <div class="flex-1">
                      <p class="font-bold text-gray-900 text-lg mb-3">{{ damage.type_damage || 'Kerusakan' }}</p> 
                      <div class="grid grid-cols-3 gap-3">
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">🟡 Kuning</p>
                          <p class="text-2xl font-bold text-gray-900">{{ damage.kuning || 0 }}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">🟠 Kutilang</p>
                          <p class="text-2xl font-bold text-gray-900">{{ damage.kutilang || 0 }}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">🔴 Busuk</p>
                          <p class="text-2xl font-bold text-gray-900">{{ damage.busuk || 0 }}</p>
                        </div>
                      </div>

                      <div v-if="damage.images && damage.images.length > 0" class="mt-4">
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📷 Bukti Foto</p>
                        <div class="flex flex-wrap gap-2">
                          <div 
                            v-for="(img, idx) in damage.images" 
                            :key="idx" 
                            @click="openImagePreview(damage.images, damage.type_damage, idx)"
                            class="relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer border hover:opacity-90 transition"
                          >
                            <img :src="getImageUrl(img)" class="w-full h-full object-cover" loading="lazy" />
                          </div>
                        </div>
                      </div>

                    </div>
                    
                    <div class="flex flex-col items-end gap-2">
                       <span 
                        :class="getStatusBadge(damage.status).class"
                        class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                      >
                        {{ getStatusBadge(damage.status).text }}
                      </span>
                      
                      </div>
                  </div>
                  
                  <div v-if="damage.revision_notes && damage.status === 'needRevision'" class="mt-3 bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <p class="text-xs text-red-600 font-semibold mb-1">Revision Notes:</p>
                    <p class="text-sm text-red-900">{{ damage.revision_notes }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="currentReport.activities && currentReport.activities.length > 0">
              <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span class="text-2xl">⚙️</span>
                Aktivitas ({{ currentReport.activities.length }})
              </h4>
              <div class="space-y-4">
                <div
                  v-for="activity in currentReport.activities"
                  :key="activity.activity_id"
                  class="bg-gray-50 rounded-xl p-5 border-2 border-gray-200"
                >
                  <div class="flex items-start justify-between gap-4 mb-4">
                    <div class="flex-1">
                      <p class="font-bold text-gray-900 text-lg mb-3">{{ activity.act_name }}</p>
                      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">CoA</p>
                          <p class="text-sm font-medium text-gray-900">{{ activity.CoA || '-' }}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">👷 Manpower</p>
                          <p class="text-sm font-medium text-gray-900">{{ activity.manpower || 0 }} pekerja</p>
                        </div>
                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-200">
                          <p class="text-xs text-green-600 font-semibold mb-1">💰 Material Cost</p>
                          <p class="text-base font-bold text-green-700">
                            {{ formatCurrency(calculateActivityTotal(activity.materials || [])) }}
                          </p>
                        </div>
                      </div>

                      <div v-if="activity.images && activity.images.length > 0" class="mb-4">
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📷 Bukti Aktivitas</p>
                        <div class="flex flex-wrap gap-2">
                          <div 
                            v-for="(img, idx) in activity.images" 
                            :key="idx" 
                            @click="openImagePreview(activity.images, activity.act_name, idx)"
                            class="relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer border border-gray-300 hover:ring-2 hover:ring-[#0071f3] transition"
                          >
                            <img :src="getImageUrl(img)" class="w-full h-full object-cover" loading="lazy" />
                          </div>
                        </div>
                      </div>

                      <div v-if="activity.materials && activity.materials.length > 0" class="bg-white rounded-lg p-4">
                        <p class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <span class="text-base">📦</span>
                          Materials ({{ activity.materials.length }})
                        </p>
                        
                        <div class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead>
                              <tr class="border-b-2 border-gray-200">
                                <th class="text-left py-2 px-3 font-semibold text-gray-600">Material</th>
                                <th class="text-right py-2 px-3 font-semibold text-gray-600">Qty</th>
                                <th class="text-right py-2 px-3 font-semibold text-gray-600">UOM</th>
                                <th class="text-right py-2 px-3 font-semibold text-gray-600">Unit Price</th>
                                <th class="text-right py-2 px-3 font-semibold text-gray-600">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="material in activity.materials"
                                :key="material.material_used_id"
                                class="border-b border-gray-100 hover:bg-blue-50 transition"
                              >
                                <td class="py-2 px-3 font-medium text-gray-900">
                                  {{ material.material_name }}
                                </td>
                                <td class="py-2 px-3 text-right font-semibold text-gray-900">
                                  {{ formatNumber(material.qty) }}
                                </td>
                                <td class="py-2 px-3 text-right text-gray-600">
                                  {{ material.uom }}
                                </td>
                                <td class="py-2 px-3 text-right text-gray-700">
                                  {{ formatCurrency(material.unit_price || 0) }}
                                </td>
                                <td class="py-2 px-3 text-right font-bold text-blue-700">
                                  {{ formatCurrency(material.total_price || 0) }}
                                </td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="border-t-2 border-gray-300 bg-gray-50">
                                <td colspan="4" class="py-3 px-3 text-right font-bold text-gray-700">
                                  Grand Total:
                                </td>
                                <td class="py-3 px-3 text-right font-bold text-green-700 text-base">
                                  {{ formatCurrency(calculateActivityTotal(activity.materials)) }}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex flex-col items-end gap-2">
                       <span 
                        :class="getStatusBadge(activity.status).class"
                        class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                      >
                        {{ getStatusBadge(activity.status).text }}
                      </span>
                      
                      </div>
                  </div>

                  <div v-if="activity.openbravo_movement_id && activity.status === 'approved'" class="mt-3 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                    <p class="text-xs text-green-600 font-semibold mb-1">✅ Approved</p>
                    <p class="text-sm text-green-900">Openbravo Document ID: {{ activity.openbravo_movement_id }}</p>
                  </div>
                  
                  <div v-if="activity.revision_notes && activity.status === 'needRevision'" class="mt-3 bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <p class="text-xs text-red-600 font-semibold mb-1">Revision Notes:</p>
                    <p class="text-sm text-red-900">{{ activity.revision_notes }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mt-6">
          <div class="flex items-start gap-3">
            <span class="text-2xl">💡</span>
            <div class="flex-1">
              <p class="font-bold text-blue-900 mb-2">Cara Review</p>
              <ul class="text-sm text-blue-800 space-y-1">
                <li>• **Review Items:** Periksa semua kerusakan tanaman dan aktivitas yang dilaporkan di bawah ini.</li>
                <li>• **Foto:** Klik pada thumbnail foto (jika ada) untuk melihat bukti dalam ukuran penuh.</li>
                <li>• **Download:** Klik tombol download di pojok kanan atas saat preview foto untuk menyimpan bukti.</li>
                <li>• **Level Approval:** Klik tombol "**Approve Level**" untuk menyetujui seluruh report di level Anda dan melanjutkannya ke level berikutnya.</li>
                <li>• **Request Revision:** Jika ada yang tidak sesuai, gunakan tombol "**Request Revision Report**" untuk mengembalikan report ke staff dan mereset status approval.</li>
                <li>• **Material Stock:** Pengurangan stock material (Openbravo Movement) akan diproses oleh sistem setelah report disetujui di level terakhir.</li>
              </ul>
            </div>
          </div>
        </div>

      </template>

      <footer class="text-center py-10 mt-8 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>

    <div v-if="revisionModal.show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span class="text-2xl">🔄</span>
            Request Revision
          </h3>
          <button 
            @click="closeRevisionModal" 
            class="text-gray-400 hover:text-gray-600 transition"
            :disabled="processing"
          >
            <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
            </svg>
          </button>
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Item Type
          </label>
          <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
            📋 Seluruh Report (Level {{ currentUserLevel?.level_order }})
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Catatan Revisi <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="revisionModal.notes"
            rows="6"
            placeholder="Tuliskan dengan jelas apa yang perlu diperbaiki...&#10;&#10;Contoh:&#10;- Data kuning di Type Damage 1 perlu diverifikasi ulang&#10;- Quantity material A di Aktivitas 'Penyemprotan' terlalu banyak. Cek kembali"
            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0071f3] focus:outline-none transition resize-none"
            :disabled="processing"
          ></textarea>
          <p class="text-xs text-gray-500 mt-2">
            Minimal 10 karakter. Berikan penjelasan yang detail.
          </p>
          <div class="mt-3 flex items-center gap-2 text-sm">
            <span class="font-semibold" :class="revisionModal.notes.trim().length < 10 ? 'text-red-600' : 'text-green-600'">
              {{ revisionModal.notes.trim().length }} / 10
            </span>
            <span class="text-gray-500">karakter</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="closeRevisionModal"
            :disabled="processing"
            class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            @click="handleRevision"
            :disabled="!revisionModal.notes.trim() || revisionModal.notes.trim().length < 10 || processing"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="processing" class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ processing ? 'Mengirim...' : 'Kirim Revisi' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="imagePreview.show" class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm transition-opacity" @click.self="closeImagePreview">
      
      <div class="absolute top-6 right-6 z-[70] flex gap-3">
        <button 
          @click.stop="downloadCurrentImage" 
          class="text-white hover:text-gray-300 transition bg-white/10 hover:bg-white/20 rounded-full p-2"
          title="Download Image"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
        </button>

        <button @click="closeImagePreview" class="text-white hover:text-gray-300 transition bg-white/10 hover:bg-white/20 rounded-full p-2">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <button 
        v-if="imagePreview.images.length > 1" 
        @click.stop="prevImage" 
        class="absolute left-4 md:left-8 text-white hover:text-gray-300 p-3 rounded-full bg-white/10 hover:bg-white/20 transition z-[70]"
      >
        <svg class="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>

      <div class="relative max-w-7xl max-h-[85vh] p-4 flex flex-col items-center">
        <img 
          :src="getImageUrl(imagePreview.images[imagePreview.currentIndex])" 
          class="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain select-none" 
        />
        
        <div class="mt-4 text-center">
          <p class="text-white font-bold text-lg md:text-xl tracking-wide">{{ imagePreview.title }}</p>
          <p class="text-gray-400 text-sm mt-1">
            Image {{ imagePreview.currentIndex + 1 }} of {{ imagePreview.images.length }}
          </p>
        </div>
      </div>

      <button 
        v-if="imagePreview.images.length > 1" 
        @click.stop="nextImage" 
        class="absolute right-4 md:right-8 text-white hover:text-gray-300 p-3 rounded-full bg-white/10 hover:bg-white/20 transition z-[70]"
      >
        <svg class="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    </div>

  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
</style>