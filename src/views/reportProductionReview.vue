<script setup>
// ... (Bagian imports dan state tetap sama)
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLocationStore } from '../stores/location'
import { useBatchStore } from '../stores/batch'
import { supabase } from '../lib/supabase'
import logoPG from '../assets/logoPG.svg'

// ===========================================
// 2. STORES & ROUTER
// ===========================================
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const locationStore = useLocationStore()
const batchStore = useBatchStore()

// ===========================================
// 3. REFS (STATE)
// ===========================================
const record_id = ref(route.params.record_id || null) // ID dari gh_approve_record
const sourcePage = ref(route.query.from || '/planningReportList')
const approvalProgress = ref([])
const currentUserLevel = ref(null) 
const canApproveCurrentLevel = ref(false)
const loading = ref(true)
const processing = ref(false)
const error = ref(null)

const productionData = ref([])
const salesData = ref([])
const baseReportInfo = ref(null) // Menyimpan info dasar (location, batch, date)

const revisionModal = ref({
  show: false,
  notes: ''
})

// ===========================================
// 4. HELPER FUNCTIONS (UTILITY)
// ===========================================
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
    'onReview': { text: '⏳ Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'needRevision': { text: '🔄 Revision', class: 'bg-red-100 text-red-800 border-red-200' },
    'approved': { text: '✅ Approved', class: 'bg-green-100 text-green-800 border-green-200' },
    'rejected': { text: '❌ Rejected', class: 'bg-gray-100 text-gray-800 border-gray-200' }
  }
  return badges[status || 'onReview'] || badges['onReview']
}


// ===========================================
// 5. DATA LOADERS
// ===========================================

const loadApprovalProgress = async (flowId, currentLevelOrder) => {
    try {
        console.log('📊 Loading approval progress...');

        const { data: levelStatuses, error: statusErr } = await supabase
            .from('gh_approval_level_status')
            .select(`
                level_status_id, level_order, level_name, status,
                approved_by, approved_at, revision_notes, revision_requested_by, revision_requested_at
            `)
            .eq('record_id', record_id.value)
            .order('level_order', { ascending: true });

        if (statusErr) throw statusErr;

        // Ambil last_level dari flow
        const { data: flowData } = await supabase
            .from('gh_approval_flow')
            .select('last_level')
            .eq('flow_id', flowId)
            .single();
        
        const lastLevel = flowData?.last_level;
        
        // ✅ PERBAIKAN ReferenceError: s is not defined
        const approverIds = [
            ...levelStatuses.map(levelStatus => levelStatus.approved_by),
            ...levelStatuses.map(levelStatus => levelStatus.revision_requested_by)
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
        
        // Cek apakah user punya hak approve di level saat ini
        const currentLevelStatus = levelStatuses.find(s => s.level_order === currentLevelOrder);
        
        const { data: userLevel } = await supabase
            .from('gh_user_approval_level')
            .select('level_order, flow_id')
            .eq('user_id', authStore.user.user_id)
            .eq('flow_id', flowId)
            .eq('level_order', currentLevelOrder)
            .eq('is_active', true)
            .maybeSingle();

        canApproveCurrentLevel.value = 
            !!userLevel && 
            currentLevelStatus?.status === 'pending' &&
            baseReportInfo.value?.overall_status === 'onReview'; // Hanya bisa approve jika overall_status onReview
        
        currentUserLevel.value = {
            level_order: currentLevelOrder,
            level_name: currentLevelStatus?.level_name || `Level ${currentLevelOrder}`,
            is_final_level: currentLevelOrder === lastLevel,
        };
        
    } catch (err) {
        console.error('❌ Error loading approval progress:', err);
        // Mengganti throw err menjadi throw custom error message yang bisa ditangkap loadData
        throw new Error('Gagal memuat progress approval: ' + err.message); 
    }
};

const loadData = async () => {
    try {
        loading.value = true;
        
        await Promise.all([
            batchStore.getBatches(),
            locationStore.fetchAll()
        ]);
        
        // 1. Ambil Approval Record
        const { data: record, error: recordErr } = await supabase
            .from('gh_approve_record')
            .select(`
                *,
                gh_approval_flow(code_name)
            `)
            .eq('record_id', record_id.value)
            .single();

        if (recordErr) throw recordErr;
        if (!record) throw new Error('Approval Record tidak ditemukan');
        
        baseReportInfo.value = {
            overall_status: record.overall_status,
            current_level_order: record.current_level_order,
            reference_type: record.reference_type,
            reference_id: record.reference_id,
            flow_id: record.flow_id,
            flow_code: record.gh_approval_flow?.code_name
        };
        
        if (baseReportInfo.value.flow_code !== 'production_sales_report') {
            throw new Error(`Report type mismatch. Expected 'production_sales_report', got ${baseReportInfo.value.flow_code}`);
        }

        // 2. Ambil Production & Sales Data
        const { data: production, error: prodErr } = await supabase
            .from('gh_production')
            .select('*')
            .eq('approval_record_id', record_id.value);

        if (prodErr) throw prodErr;
        productionData.value = production;

        const { data: sales, error: salesErr } = await supabase
            .from('gh_sales')
            .select('*')
            .eq('approval_record_id', record_id.value);
            
        if (salesErr) throw salesErr;
        salesData.value = sales;
        
        // Tentukan info dasar report (location, batch, date) dari salah satu item (asumsi sama semua)
        if (production.length > 0) {
            baseReportInfo.value.location_id = production[0].location_id;
            baseReportInfo.value.batch_id = production[0].batch_id;
            baseReportInfo.value.report_date = production[0].date;
        } else if (sales.length > 0) {
            baseReportInfo.value.location_id = sales[0].location_id;
            baseReportInfo.value.batch_id = sales[0].batch_id;
            baseReportInfo.value.report_date = sales[0].date;
        } else {
            throw new Error('Tidak ada data Production maupun Sales terkait record ini.');
        }

        baseReportInfo.value.location_name = getLocationName(baseReportInfo.value.location_id);
        baseReportInfo.value.batch_name = getBatchName(baseReportInfo.value.batch_id);

        // 3. Muat Approval Progress
        await loadApprovalProgress(baseReportInfo.value.flow_id, baseReportInfo.value.current_level_order);

    } catch (err) {
        console.error('❌ Error loading data:', err);
        // Error message ditangkap dengan aman di sini.
        error.value = err.message;
        alert('❌ Gagal memuat data: ' + err.message);
        router.push(sourcePage.value);
    } finally {
        loading.value = false;
    }
};


// ===========================================
// 6. APPROVAL ACTIONS
// ===========================================

const approveCurrentLevel = async () => {
  if (!canApproveCurrentLevel.value) {
    alert('⚠️ Anda tidak memiliki akses untuk approve di level ini');
    return;
  }

  const levelName = currentUserLevel.value.level_name;
  
  if (!confirm(`✅ Approve report ini untuk level "${levelName}"?\n\nReport akan ${currentUserLevel.value.is_final_level ? 'FULLY APPROVED' : 'dilanjutkan ke level berikutnya'}.`)) {
    return;
  }

  try {
    processing.value = true;
    
    const currentLevelOrder = currentUserLevel.value.level_order;
    const username = authStore.user?.username || authStore.user?.email || 'Admin';
    const now = new Date().toISOString();
    
    // 1. Update level status
    const { error: updateLevelErr } = await supabase
      .from('gh_approval_level_status')
      .update({ status: 'approved', approved_by: authStore.user.user_id, approved_at: now })
      .eq('record_id', record_id.value)
      .eq('level_order', currentLevelOrder);

    if (updateLevelErr) throw updateLevelErr;

    // 2. Insert history
    const { error: historyErr } = await supabase
      .from('gh_approval_history')
      .insert({
        record_id: record_id.value,
        flow_id: baseReportInfo.value.flow_id,
        user_id: authStore.user.user_id,
        level_order: currentLevelOrder,
        level_name: levelName,
        action: 'approved',
        comment: `Approved by ${username} at level ${levelName}`
      });

    if (historyErr) console.error('❌ Error inserting history (non-critical):', historyErr);

    // 3. Check final level & Update overall status/next level
    if (currentUserLevel.value.is_final_level) {
      console.log('🎯 Final level approval - Updating overall status...');

      // Update approval record status ke 'approved'
      const { error: recordErr } = await supabase
        .from('gh_approve_record')
        .update({ overall_status: 'approved', completed_at: now, updated_at: now })
        .eq('record_id', record_id.value);
      if (recordErr) throw recordErr;

      // Update status item production
      const { error: prodUpdateErr } = await supabase
        .from('gh_production')
        .update({ status: 'approved' })
        .eq('approval_record_id', record_id.value);
      if (prodUpdateErr) console.error('❌ Error updating gh_production status:', prodUpdateErr);

      // Update status item sales
      const { error: salesUpdateErr } = await supabase
        .from('gh_sales')
        .update({ status: 'approved' })
        .eq('approval_record_id', record_id.value);
      if (salesUpdateErr) console.error('❌ Error updating gh_sales status:', salesUpdateErr);
      
      alert(`✅ Report berhasil disetujui di level terakhir dan status item diubah menjadi 'approved'!`);

    } else {
      // Increment current_level_order
      const { error: recordErr } = await supabase
        .from('gh_approve_record')
        .update({ current_level_order: currentLevelOrder + 1, updated_at: now })
        .eq('record_id', record_id.value);

      if (recordErr) throw recordErr;

      alert(`✅ Report berhasil disetujui untuk level "${levelName}"!\n\nReport akan dilanjutkan ke level berikutnya.`);
    }

    // Refresh data setelah aksi
    await loadData();
    router.push(sourcePage.value);
    
  } catch (err) {
    console.error('❌ Error approving level:', err);
    alert('❌ Gagal approve: ' + err.message);
  } finally {
    processing.value = false;
  }
};


const requestRevisionForLevel = async () => {
  if (!canApproveCurrentLevel.value) {
    alert('⚠️ Anda tidak memiliki akses untuk request revision di level ini');
    return;
  }

  if (!revisionModal.value.notes || revisionModal.value.notes.trim().length < 10) {
    alert('⚠️ Catatan revisi minimal 10 karakter');
    return;
  }

  if (!confirm('🔄 Kirim permintaan revisi report?\n\nReport akan dikembalikan ke staff dan status approval akan direset.')) {
    return;
  }

  try {
    processing.value = true;
    
    const currentLevel = currentUserLevel.value;
    const username = authStore.user?.username || authStore.user?.email || 'Admin';
    const now = new Date().toISOString();
    
    // 1. Update level status jadi 'needRevision'
    const { error: updateLevelErr } = await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'needRevision',
        revision_notes: revisionModal.value.notes,
        revision_requested_by: authStore.user.user_id,
        revision_requested_at: now,
        updated_at: now
      })
      .eq('record_id', record_id.value)
      .eq('level_order', currentLevel.level_order);

    if (updateLevelErr) throw updateLevelErr;

    // 2. Insert history
    const { error: historyErr } = await supabase
      .from('gh_approval_history')
      .insert({
        record_id: record_id.value,
        flow_id: baseReportInfo.value.flow_id,
        user_id: authStore.user.user_id,
        level_order: currentLevel.level_order,
        level_name: currentLevel.level_name,
        action: 'revision_requested',
        comment: revisionModal.value.notes
      });

    if (historyErr) console.error('❌ Error inserting history (non-critical):', historyErr);

    // 3. Update approve_record overall_status dan reset current_level_order
    const { error: recordErr } = await supabase
      .from('gh_approve_record')
      .update({ 
          overall_status: 'needRevision', 
          current_level_order: 1, // Reset ke level 1
          updated_at: now
        })
      .eq('record_id', record_id.value);

    if (recordErr) throw recordErr;
    
    // 4. Reset semua level status kembali ke pending
    const { error: resetErr } = await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'pending', 
        approved_by: null, 
        approved_at: null,
        revision_notes: null, 
        revision_requested_by: null, 
        revision_requested_at: null,
        updated_at: now
      })
      .eq('record_id', record_id.value)
      .neq('level_order', currentLevel.level_order); // Kecuali level yang request revision

    if (resetErr) console.error('❌ Error resetting level status (non-critical):', resetErr);

    // 5. Update status item production/sales ke needRevision
    const { error: prodUpdateErr } = await supabase
        .from('gh_production')
        .update({ status: 'needRevision' })
        .eq('approval_record_id', record_id.value);
    if (prodUpdateErr) console.error('❌ Error updating gh_production status:', prodUpdateErr);

    const { error: salesUpdateErr } = await supabase
        .from('gh_sales')
        .update({ status: 'needRevision' })
        .eq('approval_record_id', record_id.value);
    if (salesUpdateErr) console.error('❌ Error updating gh_sales status:', salesUpdateErr);
    
    await loadData();
    closeRevisionModal();
    
    alert('✅ Permintaan revisi berhasil dikirim! Status report dikembalikan ke needRevision.');
    router.push(sourcePage.value);
    
  } catch (err) {
    console.error('❌ Error requesting revision:', err);
    alert('❌ Gagal mengirim revisi: ' + err.message);
  } finally {
    processing.value = false;
  }
};


// ===========================================
// 7. MODAL HANDLERS
// ===========================================

const handleRevision = async () => {
    await requestRevisionForLevel();
}

const openRevisionModal = () => {
  if (!canApproveCurrentLevel.value) {
    alert('⚠️ Anda tidak memiliki akses untuk melakukan aksi ini di level saat ini.');
    return;
  }

  revisionModal.value = {
    show: true,
    notes: ''
  }
}

const closeRevisionModal = () => {
  revisionModal.value = {
    show: false,
    notes: ''
  }
}


// ===========================================
// 8. COMPUTED PROPERTIES
// ===========================================

const reportInfo = computed(() => {
  if (!baseReportInfo.value) return null;
  
  const info = baseReportInfo.value;
  
  const revisionLevel = approvalProgress.value.find(p => p.level_status === 'needRevision');

  return {
    ...info,
    totalProduction: productionData.value.length,
    totalSales: salesData.value.length,
    current_level_name: currentUserLevel.value?.level_name || 'Level 1',
    can_approve: canApproveCurrentLevel.value,
    is_final_level: currentUserLevel.value?.is_final_level || false,
    revision_notes: revisionLevel?.revision_notes,
    revisor_name: revisionLevel?.revisor_name,
    revision_requested_at: revisionLevel?.revision_requested_at,
  };
});

const totalSalesValue = computed(() => {
  return salesData.value.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0);
});

// ===========================================
// 9. ON MOUNTED (Startup)
// ===========================================

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  if (!record_id.value) {
    alert('⚠️ Approval Record ID tidak ditemukan')
    router.push(sourcePage.value)
    return
  }

  await loadData()
})
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
                  📊
                </span>
                Review Production & Sales Report
              </h1>
              <p class="text-sm text-gray-500 mt-1">Record ID: #{{ record_id }}</p>
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

      <template v-else-if="reportInfo">
        
        <div class="mb-6">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📍 Lokasi</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo.location_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">🏷️ Batch</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo.batch_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📅 Tanggal</p>
                <p class="text-lg font-bold text-gray-900">{{ formatDate(reportInfo.report_date) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📊 Overall Status</p>
                <span 
                  :class="getStatusBadge(reportInfo.overall_status).class"
                  class="inline-block px-3 py-1 rounded-lg font-bold text-xs border-2"
                >
                  {{ getStatusBadge(reportInfo.overall_status).text }}
                </span>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">🏭 Total Produksi</p>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-gray-900">{{ reportInfo.totalProduction }}</span>
                  <span class="text-sm text-gray-500">items</span>
                </div>
              </div>
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">💰 Total Penjualan</p>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-gray-900">{{ reportInfo.totalSales }}</span>
                  <span class="text-sm text-gray-500">items</span>
                </div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                <p class="text-sm text-green-600 font-semibold mb-2">💵 Total Nilai Penjualan</p>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold text-green-700">
                    {{ formatCurrency(totalSalesValue) }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="reportInfo.overall_status === 'needRevision'" class="mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p class="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                  <span class="text-lg">🔄</span>
                  Catatan Revisi Report
                </p>
                <p class="text-sm text-red-900 whitespace-pre-wrap">
                  {{ reportInfo.revision_notes || 'Revisi diminta.' }}
                </p>
                <p class="text-xs text-red-600 mt-2">
                  Requested by: {{ reportInfo.revisor_name || 'System' }} 
                  • {{ formatDateTime(reportInfo.revision_requested_at) }}
                </p>
              </div>
            </div>
            

            <div v-if="reportInfo.overall_status === 'approved'" class="mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p class="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                  <span class="text-lg">✅</span>
                  Report Fully Approved
                </p>
                <p class="text-sm text-green-900">
                  Semua item Production dan Sales telah disetujui.
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
                  <p class="font-bold text-gray-900">{{ level.level_name || `Level ${level.level_order}` }}</p>
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
                  :class="getStatusBadge(level.status).class">
                  {{ getStatusBadge(level.status).text }}
                </span>
              </div>
            </div>
            
            <div v-if="canApproveCurrentLevel && reportInfo.overall_status === 'onReview'" class="mt-6 pt-6 border-t-2 border-gray-100">
              <div class="flex flex-col sm:flex-row gap-3">
                <button
                  @click="approveCurrentLevel"
                  :disabled="processing"
                  class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                  
                >
                  ✅ Approve Level {{ currentUserLevel.level_order }}
                </button>
                <button
                  @click="openRevisionModal"
                  :disabled="processing"
                  class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                >
                  🔄 Request Revision Report
                </button>
              </div>
            </div>
            </div>
        </div>
        
        <div v-if="productionData.length > 0" class="mb-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">🏭</span>
              Data Produksi ({{ productionData.length }})
            </h2>
            <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead>
                            <tr class="border-b-2 border-gray-200 bg-gray-50">
                                <th class="text-left py-3 px-4 font-bold text-gray-700">No.</th>
                                <th class="text-left py-3 px-4 font-bold text-gray-700">Kategori</th>
                                <th class="text-left py-3 px-4 font-bold text-gray-700">Kepemilikan</th>
                                <th class="text-right py-3 px-4 font-bold text-gray-700">Kuantitas</th>
                                <th class="text-center py-3 px-4 font-bold text-gray-700">Status Item</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr 
                                v-for="(prod, index) in productionData" 
                                :key="prod.production_id" 
                                class="border-b border-gray-100 hover:bg-blue-50 transition"
                            >
                                <td class="py-3 px-4 text-gray-600">{{ index + 1 }}</td>
                                <td class="py-3 px-4 font-medium text-gray-900">{{ prod.category }}</td>
                                <td class="py-3 px-4 text-gray-700">{{ prod.owner }}</td>
                                <td class="py-3 px-4 text-right font-bold text-gray-900">{{ formatNumber(prod.qty) }}</td>
                                <td class="py-3 px-4 text-center">
                                    <span 
                                        :class="getStatusBadge(prod.status).class"
                                        class="inline-block px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                                    >
                                        {{ getStatusBadge(prod.status).text }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div v-if="salesData.length > 0" class="mb-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">💰</span>
              Data Penjualan ({{ salesData.length }})
            </h2>
            <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead>
                            <tr class="border-b-2 border-gray-200 bg-gray-50">
                                <th class="text-left py-3 px-4 font-bold text-gray-700">No.</th>
                                <th class="text-left py-3 px-4 font-bold text-gray-700">Kategori</th>
                                <th class="text-right py-3 px-4 font-bold text-gray-700">Kuantitas</th>
                                <th class="text-center py-3 px-4 font-bold text-gray-700">Satuan</th>
                                <th class="text-right py-3 px-4 font-bold text-gray-700">Harga Satuan</th>
                                <th class="text-right py-3 px-4 font-bold text-gray-700">Total Harga</th>
                                <th class="text-center py-3 px-4 font-bold text-gray-700">Status Item</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr 
                                v-for="(sale, index) in salesData" 
                                :key="sale.sales_id" 
                                class="border-b border-gray-100 hover:bg-blue-50 transition"
                            >
                                <td class="py-3 px-4 text-gray-600">{{ index + 1 }}</td>
                                <td class="py-3 px-4 font-medium text-gray-900">{{ sale.category }}</td>
                                <td class="py-3 px-4 text-right font-bold text-gray-900">{{ formatNumber(sale.qty) }}</td>
                                <td class="py-3 px-4 text-center text-gray-700">{{ sale.unit || '-' }}</td>
                                <td class="py-3 px-4 text-right text-gray-700">{{ formatCurrency(sale.price) }}</td>
                                <td class="py-3 px-4 text-right font-bold text-green-700">
                                  {{ formatCurrency(Number(sale.qty) * Number(sale.price)) }}
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <span 
                                        :class="getStatusBadge(sale.status).class"
                                        class="inline-block px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                                    >
                                        {{ getStatusBadge(sale.status).text }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr class="border-t-2 border-gray-300 bg-gray-50">
                                <td colspan="5" class="py-3 px-4 text-right font-bold text-gray-700">Grand Total Penjualan:</td>
                                <td class="py-3 px-4 text-right font-bold text-green-700 text-base">
                                    {{ formatCurrency(totalSalesValue) }}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>

        <div v-if="salesData.length === 0 && productionData.length === 0" class="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
            <div class="flex items-center gap-3">
              <span class="text-3xl">⚠️</span>
              <div>
                <p class="font-bold text-yellow-900">Tidak Ada Data</p>
                <p class="text-sm text-yellow-700 mt-1">Tidak ditemukan data Production maupun Sales terkait Approval Record ini.</p>
              </div>
            </div>
        </div>

      </template>

      <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
           <span class="w-6 h-6 p-0.5">
             <img :src="logoPG" alt="Potato Grow Logo" class="w-full h-full object-contain" />
          </span>
          <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
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
            📋 Production & Sales Report (Level {{ currentUserLevel?.level_order }})
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Catatan Revisi <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="revisionModal.notes"
            rows="6"
            placeholder="Tuliskan dengan jelas apa yang perlu diperbaiki...&#10;&#10;Contoh:&#10;- Quantity produksi G1 terlalu besar, mohon cek ulang.&#10;- Harga jual G0 tidak sesuai dengan kesepakatan."
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>