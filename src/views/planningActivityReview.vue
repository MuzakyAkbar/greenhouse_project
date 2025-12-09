<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBatchStore } from '@/stores/batch'
import { useLocationStore } from '@/stores/location'
import { supabase } from '@/lib/supabase'
import logoPG from '../assets/logoPG.svg'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()

const report_id = ref(route.params.planning_id || null)
const sourcePage = ref(route.query.from || '/planningReportList')

// State
const approvalProgress = ref([])
const currentUserLevel = ref(null) 
const canApproveCurrentLevel = ref(false)
const loading = ref(true)
const processing = ref(false)
const error = ref(null)
const phaseInfo = ref(null)
const currentReport = ref(null)

// Modal State (Untuk Revisi Langsung)
const editModal = ref({
  show: false,
  activities: [], // Data editable clone
  notes: ''
})

// === LOAD DATA ===
onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }
  if (!report_id.value) {
    alert('⚠️ Planning ID tidak ditemukan')
    router.push(sourcePage.value)
    return
  }
  await loadData()
})

const loadData = async () => {
  try {
    loading.value = true;
    
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll()
    ]);

    // Query ke gh_planning_report
    const { data: planning, error: fetchError } = await supabase
      .from('gh_planning_report')
      .select(`
        *,
        activities:gh_planning_activity(
          activity_id, planning_id, act_name, coa, manpower,
          materials:gh_planning_material(*) 
        )
      `)
      .eq('planning_id', report_id.value)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    if (!planning) throw new Error(`Data Planning #${report_id.value} tidak ditemukan.`);

    // Sorting activities & materials agar urutan konsisten
    if (planning.activities) {
      planning.activities.sort((a, b) => a.activity_id - b.activity_id);
      planning.activities.forEach(act => {
        if (act.materials) act.materials.sort((a, b) => a.material_id - b.material_id);
      });
    }

    // Mapping Data
    currentReport.value = {
      ...planning,
      report_id: planning.planning_id,
      report_status: planning.status,
      report_date: planning.planning_date,
      approval_record_id: planning.approval_record_id
    };

    // Load Phase Name
    if (planning.phase_plan && !isNaN(planning.phase_plan)) {
      const { data } = await supabase.from('gh_phase').select('phase_name').eq('phase_id', planning.phase_plan).single();
      phaseInfo.value = data?.phase_name || 'Unknown Phase';
    } else {
      phaseInfo.value = planning.phase_plan || '-';
    }
    
    // Load Approval Flow
    if (planning.approval_record_id) {
        await loadApprovalProgress();
    }
    
  } catch (err) {
    console.error('❌ Error loading data:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const loadApprovalProgress = async () => {
  if (!currentReport.value?.approval_record_id) return;

  try {
    const { data: recordData } = await supabase
      .from('gh_approve_record')
      .select(`current_level_order, overall_status, flow_id, gh_approval_flow!inner(last_level, first_level)`)
      .eq('record_id', currentReport.value.approval_record_id)
      .single();

    if (!recordData) return;

    // Fetch Level Statuses
    const { data: levelStatuses } = await supabase
      .from('gh_approval_level_status')
      .select(`*`)
      .eq('record_id', currentReport.value.approval_record_id)
      .order('level_order', { ascending: true });

    // Fetch User Names
    const userIds = [
      ...levelStatuses.map(s => s.approved_by),
      ...levelStatuses.map(s => s.revision_requested_by)
    ].filter(Boolean);

    let userMap = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase.from('user').select('user_id, username').in('user_id', userIds);
      if (users) userMap = Object.fromEntries(users.map(u => [u.user_id, u.username]));
    }

    approvalProgress.value = levelStatuses.map(level => ({
      ...level,
      approver_name: userMap[level.approved_by],
      revisor_name: userMap[level.revision_requested_by],
      is_final_level: level.level_order === recordData.gh_approval_flow.last_level,
      level_status: level.status
    }));

    // Check Access Permission
    const { data: userLevel } = await supabase
      .from('gh_user_approval_level')
      .select('level_order')
      .eq('user_id', authStore.user.user_id)
      .eq('flow_id', recordData.flow_id)
      .eq('level_order', recordData.current_level_order)
      .eq('is_active', true)
      .maybeSingle();

    const currentLevelStatus = levelStatuses.find(s => s.level_order === recordData.current_level_order);
    
    canApproveCurrentLevel.value = 
      !!userLevel && 
      currentLevelStatus?.status === 'pending' &&
      recordData.overall_status === 'onReview';
    
    currentUserLevel.value = {
      level_order: recordData.current_level_order,
      level_name: currentLevelStatus?.level_name || `Level ${recordData.current_level_order}`,
      is_final_level: recordData.current_level_order === recordData.gh_approval_flow.last_level,
    };
    
    currentReport.value.report_status = recordData.overall_status;
    
  } catch (err) {
    console.error('❌ Error approval progress:', err);
  }
};

// === HELPER FUNCTIONS ===
const getBatchName = (id) => batchStore.batches.find(b => b.batch_id == id)?.batch_name || `Batch ${id}`
const getLocationName = (id) => locationStore.locations.find(l => l.location_id == id)?.location || `Location ${id}`
const formatDate = (str) => str ? new Date(str).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
const formatDateTime = (str) => str ? new Date(str).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' }) : '-'
const formatNumber = (n) => Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })

const reportInfo = computed(() => {
  if (!currentReport.value) return null;
  return {
    ...currentReport.value,
    location_name: getLocationName(currentReport.value.location_id),
    batch_name: getBatchName(currentReport.value.batch_id),
    phase_name: phaseInfo.value,
    can_approve: canApproveCurrentLevel.value
  };
});

const getStatusBadge = (status) => {
  const badges = {
    'onReview': { text: '⏳ Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'needRevision': { text: '🔄 Revision', class: 'bg-red-100 text-red-800 border-red-200' },
    'approved': { text: '✅ Approved', class: 'bg-green-100 text-green-800 border-green-200' },
    'draft': { text: '📝 Draft', class: 'bg-gray-100 text-gray-800 border-gray-200' }
  }
  return badges[status] || badges['draft']
}

// === ACTIONS ===

// 1. APPROVE & FINALIZE (Level 2 - Final)
const approveAndFinalize = async () => {
  if (!confirm(`✅ Approve & Finalize Planning ini?\n\nStatus akan berubah menjadi APPROVED dan proses selesai.`)) return;

  try {
    processing.value = true;
    const lvl = currentUserLevel.value;
    const recordId = currentReport.value.approval_record_id;
    const username = authStore.user.username || authStore.user.email || 'User';

    // 1. Update Table Level Status
    await supabase.from('gh_approval_level_status').update({
      status: 'approved',
      approved_by: authStore.user.user_id,
      approved_at: new Date().toISOString()
    }).eq('record_id', recordId).eq('level_order', lvl.level_order);

    // 2. Insert History
    await supabase.from('gh_approval_history').insert({
      record_id: recordId,
      user_id: authStore.user.user_id,
      level_order: lvl.level_order,
      level_name: lvl.level_name,
      action: 'approved',
      comment: `Approved & Finalized by ${username}`
    });

    // 3. Update Record Global
    await supabase.from('gh_approve_record').update({
      overall_status: 'approved',
      completed_at: new Date().toISOString()
    }).eq('record_id', recordId);

    // 4. Update Report Status
    await supabase.from('gh_planning_report')
      .update({ status: 'approved' })
      .eq('planning_id', currentReport.value.report_id);

    alert('✅ Planning berhasil di-approve!');
    router.push(sourcePage.value);

  } catch (err) {
    console.error(err);
    alert('Gagal approve: ' + err.message);
  } finally {
    processing.value = false;
  }
};

// 2. MODAL LOGIC (DIRECT REVISION)
const openEditModal = () => {
  // Deep clone activities to avoid direct mutation
  editModal.value = {
    show: true,
    activities: JSON.parse(JSON.stringify(currentReport.value.activities || [])),
    notes: ''
  }
}

const closeEditModal = () => {
  editModal.value = { show: false, activities: [], notes: '' }
}

const saveDirectRevision = async () => {
  const notes = editModal.value.notes.trim();
  if (!notes || notes.length < 5) {
    alert('⚠️ Mohon tuliskan alasan koreksi/revisi (min 5 karakter).');
    return;
  }

  if (!confirm('🔄 Simpan perubahan data? Koreksi akan langsung diterapkan.')) return;

  try {
    processing.value = true;
    const username = authStore.user.username || authStore.user.email;

    // 1. Update Data (Activity & Materials)
    for (const act of editModal.value.activities) {
        // Update Activity (Manpower)
        await supabase.from('gh_planning_activity')
            .update({ manpower: act.manpower })
            .eq('activity_id', act.activity_id);
        
        // Update Materials (Qty)
        if (act.materials && act.materials.length > 0) {
            for (const mat of act.materials) {
                await supabase.from('gh_planning_material')
                    .update({ qty: mat.qty })
                    .eq('material_id', mat.material_id);
            }
        }
    }

    // 2. Insert History Log (Catat bahwa Manager melakukan koreksi)
    // Kita gunakan action 'revision_requested' tapi tanpa mengubah status flow, 
    // atau gunakan action custom jika ada enum, tapi aman pakai comment jelas.
    const lvl = currentUserLevel.value;
    await supabase.from('gh_approval_history').insert({
      record_id: currentReport.value.approval_record_id,
      user_id: authStore.user.user_id,
      level_order: lvl.level_order,
      level_name: lvl.level_name,
      action: 'revision_requested', // Atau 'submitted' jika dianggap koreksi
      comment: `[DIRECT CORRECTION] ${notes}. Data updated directly by Manager.`
    });

    alert('✅ Data berhasil dikoreksi.');
    closeEditModal();
    await loadData(); // Reload data UI

  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan koreksi: ' + err.message);
  } finally {
    processing.value = false;
  }
};

</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24"> <div class="bg-white border-b sticky top-0 z-30 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button @click="router.push(sourcePage)" class="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
             <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div>
            <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span class="text-2xl">📋</span>
              Review Planning #{{ report_id }}
            </h1>
          </div>
        </div>
        <div v-if="currentReport">
           <span :class="getStatusBadge(currentReport.report_status).class" class="px-3 py-1 rounded-full text-sm font-bold border animate-pulse">
             {{ getStatusBadge(currentReport.report_status).text }}
           </span>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" v-if="currentReport">

      <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div class="flex items-start gap-3">
            <span class="text-2xl">📅</span>
            <div><p class="text-xs text-gray-500 font-bold mb-1">TANGGAL</p><p class="font-medium text-gray-900">{{ formatDate(reportInfo.report_date) }}</p></div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-2xl">🌱</span>
            <div><p class="text-xs text-gray-500 font-bold mb-1">FASE</p><p class="font-medium text-gray-900">{{ reportInfo.phase_name }}</p></div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-2xl">🏷️</span>
            <div><p class="text-xs text-gray-500 font-bold mb-1">BATCH</p><p class="font-medium text-gray-900">{{ reportInfo.batch_name }}</p></div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-2xl">📍</span>
            <div><p class="text-xs text-gray-500 font-bold mb-1">LOKASI</p><p class="font-medium text-gray-900">{{ reportInfo.location_name }}</p></div>
          </div>
        </div>
      </div>

      <div v-if="approvalProgress.length" class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><span class="text-xl">📊</span> Approval Progress</h3>
        <div class="space-y-3">
          <div v-for="level in approvalProgress" :key="level.level_order"
               class="flex items-center gap-4 p-3 rounded-lg border transition-all duration-200"
               :class="{
                 'bg-green-50 border-green-200': level.level_status === 'approved',
                 'bg-blue-50 border-blue-300 shadow-sm': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                 'bg-red-50 border-red-200': level.level_status === 'needRevision',
                 'bg-gray-50 border-gray-200': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
               }">
            <div class="w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-white"
                 :class="{
                   'bg-green-500': level.level_status === 'approved',
                   'bg-blue-500 ring-4 ring-blue-100': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                   'bg-red-500': level.level_status === 'needRevision',
                   'bg-gray-300': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
                 }">
              {{ level.level_order }}
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-bold text-gray-900">{{ level.level_name }}</p>
                  <p class="text-sm text-gray-600 mt-0.5">
                    <span v-if="level.level_status === 'approved'">✅ Approved by {{ level.approver_name || 'Unknown' }}</span>
                    <span v-else-if="level.level_status === 'needRevision'">🔄 Revision requested by {{ level.revisor_name || 'Unknown' }}</span>
                    <span v-else-if="level.level_order === currentUserLevel?.level_order" class="text-blue-600 font-medium">⏳ Menunggu Approval Anda</span>
                    <span v-else>⏳ Pending</span>
                  </p>
                </div>
                <div class="text-xs text-gray-500 text-right" v-if="level.approved_at || level.revision_requested_at">
                  <p>{{ formatDateTime(level.approved_at || level.revision_requested_at) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><span class="text-xl">⚙️</span> Planned Activities ({{ currentReport.activities.length }})</h3>

        <div class="grid gap-4">
          <div v-for="(act, index) in currentReport.activities" :key="act.activity_id" class="border border-gray-200 rounded-xl overflow-hidden">
            <div class="bg-gray-50 p-4 flex items-start gap-3 border-b border-gray-200">
              <div class="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm">{{ index + 1 }}</div>
              <div>
                 <h4 class="font-bold text-gray-900 text-lg">{{ act.act_name }}</h4>
                 <div class="flex gap-4 text-sm text-gray-600 mt-1">
                    <span class="flex items-center gap-1">👥 Workers: <b>{{ act.manpower }}</b></span>
                    <span class="text-gray-300">|</span>
                    <span class="flex items-center gap-1">🔢 CoA: <b>{{ act.coa || '-' }}</b></span>
                  </div>
              </div>
            </div>

            <div class="p-4">
               <p class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">📦 Materials Used</p>
               <div v-if="act.materials?.length" class="border rounded-lg overflow-hidden">
                  <table class="w-full text-sm text-left">
                    <thead class="bg-gray-100 text-gray-600">
                      <tr>
                        <th class="p-3 font-semibold">Material Name</th>
                        <th class="p-3 text-right font-semibold">Qty</th>
                        <th class="p-3 text-center font-semibold">Unit</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y">
                      <tr v-for="mat in act.materials" :key="mat.material_id" class="hover:bg-gray-50">
                        <td class="p-3 font-medium text-gray-900">{{ mat.material_name }}</td>
                        <td class="p-3 text-right font-bold text-blue-600">{{ formatNumber(mat.qty) }}</td>
                        <td class="p-3 text-center text-gray-500">{{ mat.uom }}</td>
                      </tr>
                    </tbody>
                  </table>
               </div>
               <div v-else class="text-sm text-gray-400 italic p-2 bg-gray-50 rounded border border-dashed text-center">
                 Tidak ada material yang digunakan untuk aktivitas ini.
               </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div v-if="loading" class="fixed inset-0 bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm">
      <div class="flex flex-col items-center">
        <div class="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
        <p class="text-gray-600 font-medium">Memuat Data...</p>
      </div>
    </div>

    <div v-if="reportInfo?.can_approve && reportInfo.report_status !== 'approved'" 
         class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div class="max-w-7xl mx-auto flex justify-center gap-4">

        <button @click="openEditModal" :disabled="processing"
                class="px-6 py-3 bg-blue-100 text-blue-700 font-bold rounded-xl hover:bg-blue-200 transition-colors flex items-center gap-2 disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          <span>Koreksi Data</span>
        </button>

        <button @click="approveAndFinalize" :disabled="processing"
                class="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
          <svg v-if="!processing" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
          </svg>
          <svg v-else class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ processing ? 'Processing...' : 'Approve & Finalize' }}</span>
        </button>

      </div>
    </div>

    <div v-if="editModal.show" class="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity animate-fade-in" aria-hidden="true" @click="!processing && closeEditModal()"></div>

        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full animate-scale-in">

          <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-blue-600">✏️</span> Koreksi Data Planning
            </h3>
            
            <div class="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
              <div v-for="(act, idx) in editModal.activities" :key="act.activity_id" class="border rounded-xl p-4 bg-gray-50">
                <div class="flex justify-between items-center mb-3">
                  <h4 class="font-bold text-gray-800">#{{ idx + 1 }} {{ act.act_name }}</h4>
                </div>
                
                <div class="mb-4">
                  <label class="block text-xs font-bold text-gray-500 mb-1">Total Workers</label>
                  <input type="text" v-model="act.manpower" class="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                </div>

                <div v-if="act.materials && act.materials.length">
                  <p class="text-xs font-bold text-gray-500 mb-2">Materials</p>
                  <div v-for="mat in act.materials" :key="mat.material_id" class="flex items-center gap-3 mb-2">
                    <span class="flex-1 text-sm text-gray-700 bg-white p-2 border rounded">{{ mat.material_name }}</span>
                    <div class="w-24">
                      <input type="number" v-model="mat.qty" class="w-full border border-gray-300 rounded-lg p-2 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Qty">
                    </div>
                    <span class="w-12 text-xs text-gray-500">{{ mat.uom }}</span>
                  </div>
                </div>
                <div v-else class="text-xs text-gray-400 italic">No materials.</div>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t">
              <label class="block text-sm font-bold text-gray-700 mb-2">Catatan Koreksi (Wajib)</label>
              <textarea v-model="editModal.notes" rows="2" class="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Alasan perubahan data..."></textarea>
            </div>
          </div>

          <div class="bg-gray-100 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            <button type="button" @click="saveDirectRevision" :disabled="processing"
                    class="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
              <span v-if="processing">Saving...</span>
              <span v-else>Simpan Koreksi</span>
            </button>
            <button type="button" @click="closeEditModal" :disabled="processing"
                    class="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
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
</template>

<style scoped>
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in { animation: fade-in 0.2s ease-out; }
.animate-scale-in { animation: scale-in 0.2s ease-out; }
</style>