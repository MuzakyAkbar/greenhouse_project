<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "@/lib/supabase.js";
import { useRouter } from 'vue-router';

const router = useRouter();

// ======================
// STATE
// ======================
const planningReports = ref([]);
const isLoading = ref(false);
const selectedReport = ref(null);
const showDetailModal = ref(false);
const showReviseModal = ref(false);

// Detail data
const reportDetails = ref(null);
const activities = ref([]);
const materials = ref({});

// Revise state
const reviseData = ref({
  activities: []
});

// Filter state
const filterStatus = ref('onReview');
const filterDate = ref('');
const filterLocation = ref('');

// ======================
// COMPUTED
// ======================
const filteredReports = computed(() => {
  let filtered = planningReports.value;

  if (filterStatus.value) {
    filtered = filtered.filter(r => r.status === filterStatus.value);
  }

  if (filterDate.value) {
    filtered = filtered.filter(r => r.planning_date === filterDate.value);
  }

  if (filterLocation.value) {
    filtered = filtered.filter(r => 
      r.gh_location?.location?.toLowerCase().includes(filterLocation.value.toLowerCase())
    );
  }

  return filtered;
});

// ======================
// FETCH DATA
// ======================
const fetchPlanningReports = async () => {
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('gh_planning_report')
      .select(`
        *,
        gh_location:location_id(location_id, location),
        gh_batch:batch_id(batch_id, batch_name)
      `)
      .order('planning_id', { ascending: false }); // ✅ Sort by planning_id instead

    if (error) throw error;

    planningReports.value = data || [];
    console.log('✅ Planning reports loaded:', planningReports.value.length);
  } catch (err) {
    console.error('❌ Error fetching planning reports:', err);
    alert('Gagal memuat data planning');
  } finally {
    isLoading.value = false;
  }
};

// ======================
// DETAIL MODAL
// ======================
const viewDetail = async (report) => {
  selectedReport.value = report;
  reportDetails.value = report;
  
  try {
    // Fetch activities with materials
    const { data: activitiesData, error: actError } = await supabase
      .from('gh_planning_activity')
      .select('*')
      .eq('planning_id', report.planning_id)
      .order('order_index', { ascending: true });

    if (actError) throw actError;

    activities.value = activitiesData || [];

    // Fetch materials for each activity
    for (let activity of activities.value) {
      const { data: materialsData, error: matError } = await supabase
        .from('gh_planning_material')
        .select('*')
        .eq('activity_id', activity.activity_id);

      if (matError) throw matError;

      materials.value[activity.activity_id] = materialsData || [];
    }

    showDetailModal.value = true;
    console.log('✅ Detail loaded for planning:', report.planning_id);
  } catch (err) {
    console.error('❌ Error loading detail:', err);
    alert('Gagal memuat detail planning');
  }
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedReport.value = null;
  reportDetails.value = null;
  activities.value = [];
  materials.value = {};
};

// ======================
// APPROVE (Langsung tanpa revisi)
// ======================
const approvePlanning = async (planningId) => {
  if (!confirm('Apakah Anda yakin ingin menyetujui planning ini?')) return;

  try {
    // Update status to approved (updated_at auto-updated by trigger)
    const { error: updateError } = await supabase
      .from('gh_planning_report')
      .update({ status: 'approved' })
      .eq('planning_id', planningId);

    if (updateError) throw updateError;

    // Insert history
    const { error: historyError } = await supabase
      .from('gh_planning_history')
      .insert([{
        planning_id: planningId,
        changed_by: 'reviewer',
        changes: JSON.stringify({
          action: 'approve',
          status: 'approved',
          timestamp: new Date().toISOString()
        })
      }]);

    if (historyError) throw historyError;

    alert('✅ Planning berhasil disetujui!');
    closeDetailModal();
    await fetchPlanningReports();
  } catch (err) {
    console.error('❌ Error approving planning:', err);
    alert('Gagal menyetujui planning: ' + err.message);
  }
};

// ======================
// REVISE & APPROVE (Edit dalam modal, tetap approve)
// ======================
const openReviseModal = () => {
  // Copy current data to revise form
  reviseData.value = {
    activities: activities.value.map(act => ({
      activity_id: act.activity_id,
      act_name: act.act_name,
      coa: act.coa,
      manpower: act.manpower,
      order_index: act.order_index,
      materials: (materials.value[act.activity_id] || []).map(mat => ({
        material_id: mat.material_id,
        material_name: mat.material_name,
        qty: mat.qty,
        uom: mat.uom
      }))
    }))
  };

  showDetailModal.value = false;
  showReviseModal.value = true;
};

const closeReviseModal = () => {
  showReviseModal.value = false;
  reviseData.value = { activities: [] };
};

const saveRevision = async () => {
  if (!confirm('Simpan revisi dan setujui planning ini?')) return;

  try {
    const changes = [];

    // Update each activity
    for (let activity of reviseData.value.activities) {
      const { error: actError } = await supabase
        .from('gh_planning_activity')
        .update({
          act_name: activity.act_name,
          coa: activity.coa ? Number(activity.coa) : null,
          manpower: activity.manpower,
          updated_at: new Date().toISOString()
        })
        .eq('activity_id', activity.activity_id);

      if (actError) throw actError;

      changes.push({
        activity_id: activity.activity_id,
        updated_fields: ['act_name', 'coa', 'manpower']
      });

      // Update materials
      for (let material of activity.materials) {
        const { error: matError } = await supabase
          .from('gh_planning_material')
          .update({
            material_name: material.material_name,
            qty: parseFloat(material.qty),
            uom: material.uom,
            updated_at: new Date().toISOString()
          })
          .eq('material_id', material.material_id);

        if (matError) throw matError;

        changes.push({
          material_id: material.material_id,
          updated_fields: ['material_name', 'qty', 'uom']
        });
      }
    }

    // ✅ Update report status to approved (TETAP APPROVED, tidak jadi revision)
    const { error: updateError } = await supabase
      .from('gh_planning_report')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('planning_id', selectedReport.value.planning_id);

    if (updateError) throw updateError;

    // Insert history
    const { error: historyError } = await supabase
      .from('gh_planning_history')
      .insert([{
        planning_id: selectedReport.value.planning_id,
        changed_by: 'reviewer',
        changes: JSON.stringify({
          action: 'revise_and_approve',
          status: 'approved',
          changes: changes,
          timestamp: new Date().toISOString()
        })
      }]);

    if (historyError) throw historyError;

    alert('✅ Revisi berhasil disimpan dan planning disetujui!');
    closeReviseModal();
    await fetchPlanningReports();
  } catch (err) {
    console.error('❌ Error saving revision:', err);
    alert('Gagal menyimpan revisi: ' + err.message);
  }
};

// ======================
// HELPER FUNCTIONS
// ======================
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('id-ID').format(num || 0);
};

const getStatusBadge = (status) => {
  const badges = {
    'onReview': 'bg-yellow-100 text-yellow-700',
    'approved': 'bg-green-100 text-green-700'
  };
  return badges[status] || 'bg-gray-100 text-gray-700';
};

const getStatusText = (status) => {
  const texts = {
    'onReview': 'On Review',
    'approved': 'Approved'
  };
  return texts[status] || status;
};

// Material manipulation in revise form
const addMaterialRow = (activityIndex) => {
  reviseData.value.activities[activityIndex].materials.push({
    material_id: null,
    material_name: '',
    qty: 0,
    uom: ''
  });
};

const removeMaterialRow = (activityIndex, materialIndex) => {
  if (reviseData.value.activities[activityIndex].materials.length > 1) {
    reviseData.value.activities[activityIndex].materials.splice(materialIndex, 1);
  }
};

// ======================
// LIFECYCLE
// ======================
onMounted(async () => {
  await fetchPlanningReports();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <router-link
            to="/dashboard"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </router-link>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-lg">
                ✓
              </span>
              Review Activity Planning
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Review dan Approve Planning Daily GreenHouse</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Filters -->
      <div class="mb-6">
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Filters</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Status Filter -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                v-model="filterStatus"
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition appearance-none cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="onReview">On Review</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <!-- Date Filter -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input
                type="date"
                v-model="filterDate"
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
              />
            </div>

            <!-- Location Filter -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Location</label>
              <input
                type="text"
                v-model="filterLocation"
                placeholder="Search location..."
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Planning List -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600">Loading planning reports...</p>
      </div>

      <div v-else-if="filteredReports.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">📋</div>
        <p class="text-gray-600 text-lg">No planning reports found</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="report in filteredReports"
          :key="report.planning_id"
          class="bg-white rounded-2xl border-2 border-gray-100 hover:border-green-500 shadow-sm hover:shadow-lg transition-all p-6"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-bold text-gray-900">
                  Planning #{{ report.planning_id }}
                </h3>
                <span :class="getStatusBadge(report.status)" class="px-3 py-1 rounded-lg text-xs font-semibold">
                  {{ getStatusText(report.status) }}
                </span>
              </div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p class="text-gray-500">Date</p>
                  <p class="font-semibold text-gray-900">{{ formatDate(report.planning_date) }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Location</p>
                  <p class="font-semibold text-gray-900">{{ report.gh_location?.location || '-' }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Batch</p>
                  <p class="font-semibold text-gray-900">{{ report.gh_batch?.batch_name || '-' }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Phase</p>
                  <p class="font-semibold text-gray-900">{{ report.phase_plan || '-' }}</p>
                </div>
              </div>
            </div>

            <button
              v-if="report.status === 'onReview'"
              @click="viewDetail(report)"
              class="ml-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg"
            >
              View Detail
            </button>
            <button
              v-else-if="report.status === 'approved'"
              @click="router.push({ name: 'planningActivityView', params: { planning_id: report.planning_id } })"
              class="ml-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg"
            >
              View Report
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="showDetailModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white sticky top-0 z-10 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold">Planning Detail #{{ reportDetails?.planning_id }}</h2>
              <p class="text-sm text-green-100 mt-1">{{ formatDate(reportDetails?.planning_date) }}</p>
            </div>
            <button
              @click="closeDetailModal"
              class="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
            <div>
              <p class="text-xs text-gray-500 mb-1">Location</p>
              <p class="font-semibold text-gray-900">{{ reportDetails?.gh_location?.location }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Batch</p>
              <p class="font-semibold text-gray-900">{{ reportDetails?.gh_batch?.batch_name }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Phase</p>
              <p class="font-semibold text-gray-900">{{ reportDetails?.phase_plan }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Status</p>
              <span :class="getStatusBadge(reportDetails?.status)" class="inline-block px-3 py-1 rounded-lg text-xs font-semibold">
                {{ getStatusText(reportDetails?.status) }}
              </span>
            </div>
          </div>

          <!-- Activities -->
          <div>
            <h3 class="text-lg font-bold text-gray-900 mb-4">Activities</h3>
            <div class="space-y-4">
              <div
                v-for="(activity, index) in activities"
                :key="activity.activity_id"
                class="border-2 border-gray-200 rounded-xl p-5"
              >
                <div class="flex items-start gap-4 mb-4">
                  <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                    {{ index + 1 }}
                  </div>
                  <div class="flex-1">
                    <h4 class="font-bold text-gray-900 text-lg">{{ activity.act_name }}</h4>
                    <div class="grid grid-cols-2 gap-4 mt-2 text-sm">
                      <div>
                        <span class="text-gray-500">CoA:</span>
                        <span class="ml-2 font-semibold">{{ activity.coa || '-' }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500">Manpower:</span>
                        <span class="ml-2 font-semibold">{{ activity.manpower || '0' }} workers</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Materials -->
                <div v-if="materials[activity.activity_id]?.length > 0" class="mt-4 bg-gray-50 rounded-lg p-4">
                  <p class="text-sm font-semibold text-gray-700 mb-3">📦 Materials</p>
                  <div class="space-y-2">
                    <div
                      v-for="material in materials[activity.activity_id]"
                      :key="material.material_id"
                      class="flex justify-between items-center bg-white rounded-lg p-3 text-sm"
                    >
                      <span class="font-medium text-gray-900">{{ material.material_name }}</span>
                      <span class="font-semibold text-green-600">{{ formatNumber(material.qty) }} {{ material.uom }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div v-if="reportDetails?.status === 'onReview'" class="flex gap-3 pt-4 border-t-2 border-gray-200">
            <button
              @click="approvePlanning(reportDetails.planning_id)"
              class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl"
            >
              ✓ Approve
            </button>
            <button
              @click="openReviseModal"
              class="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl"
            >
              ✎ Revise & Approve
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Revise Modal -->
    <div
      v-if="showReviseModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white sticky top-0 z-10 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold">Revise Planning #{{ selectedReport?.planning_id }}</h2>
              <p class="text-sm text-yellow-100 mt-1">Edit dan setujui planning</p>
            </div>
            <button
              @click="closeReviseModal"
              class="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Revise Form -->
        <div class="p-6 space-y-6">
          <div
            v-for="(activity, actIndex) in reviseData.activities"
            :key="activity.activity_id"
            class="border-2 border-yellow-200 rounded-xl p-5 bg-yellow-50"
          >
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
                {{ actIndex + 1 }}
              </div>
              <h4 class="font-bold text-gray-900 text-lg">Activity {{ actIndex + 1 }}</h4>
            </div>

            <!-- Activity Fields -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div class="flex flex-col">
                <label class="text-xs font-semibold text-gray-700 mb-2">Activity Name</label>
                <input
                  v-model="activity.act_name"
                  type="text"
                  class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-xs font-semibold text-gray-700 mb-2">CoA</label>
                <input
                  v-model="activity.coa"
                  type="number"
                  class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-xs font-semibold text-gray-700 mb-2">Manpower</label>
                <input
                  v-model="activity.manpower"
                  type="text"
                  class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition"
                />
              </div>
            </div>

            <!-- Materials -->
            <div class="bg-white rounded-lg p-4">
              <div class="flex justify-between items-center mb-3">
                <p class="text-sm font-semibold text-gray-700">📦 Materials</p>
                <button
                  @click="addMaterialRow(actIndex)"
                  class="text-xs bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  + Add Material
                </button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(material, matIndex) in activity.materials"
                  :key="matIndex"
                  class="flex gap-3 items-end"
                >
                  <div class="flex-1 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Material Name</label>
                    <input
                      v-model="material.material_name"
                      type="text"
                      class="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition"
                    />
                  </div>

                  <div class="w-28 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                    <input
                      v-model="material.qty"
                      type="number"
                      step="0.01"
                      class="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition"
                    />
                  </div>

                  <div class="w-24 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                    <input
                      v-model="material.uom"
                      type="text"
                      class="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition"
                    />
                  </div>

                  <button
                    v-if="activity.materials.length > 1"
                    @click="removeMaterialRow(actIndex, matIndex)"
                    class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4 border-t-2 border-gray-200">
            <button
              @click="closeReviseModal"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              @click="saveRevision"
              class="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl"
            >
              💾 Save Revision & Approve
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="text-center py-10 mt-8 border-t border-gray-200">
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="text-2xl">🌱</span>
        <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
      </div>
      <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
    </footer>
  </div>
</template>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}

select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>