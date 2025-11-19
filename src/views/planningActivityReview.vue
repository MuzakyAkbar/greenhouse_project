<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "@/lib/supabase.js";
import { useRouter, useRoute } from 'vue-router';
import openbravoApi from "@/lib/openbravo";


// ======================
// STATE
// ======================
const isLoading = ref(false);
const reportDetails = ref(null);
const activities = ref([]);
const materials = ref({});
const showReviseModal = ref(false);
const activityOptions = ref([]);
const materialOptions = ref([]);
const selectedWarehouse = ref(null);
const selectedBin = ref(null);
const materialLoading = ref(false);
const router = useRouter();
const route = useRoute();
// Revise state
const reviseData = ref({activities: []});
// Tambahkan di bagian STATE (setelah reviseData)
const materialUsage = ref({});

// Tambahkan setelah computed getMaterialOptionsForActivity
const calculateMaterialUsage = () => {
  const usage = {};
  
  reviseData.value.activities.forEach(activity => {
    activity.materials.forEach(material => {
      if (material.material_name) {
        if (!usage[material.material_name]) {
          usage[material.material_name] = 0;
        }
        usage[material.material_name] += parseFloat(material.qty) || 0;
      }
    });
  });
  
  materialUsage.value = usage;
  return usage;
};

const getMaterialStockInfo = computed(() => (materialName) => {
  if (!materialName) return null;

  const materialFromOpenbravo = materialOptions.value.find(
    m => m.name === materialName
  );

  const usedToday = materialUsage.value[materialName] || 0;
  const openbravoStock = materialFromOpenbravo?.stock || 0;
  const remaining = openbravoStock - usedToday;

  return {
    openbravoStock,
    usedToday,
    remaining,
    uom: materialFromOpenbravo?.uom || ''
  };
});


const getStockColorClass = (remaining) => {
  if (remaining <= 0) return 'text-red-600';
  if (remaining <= 3) return 'text-orange-600';
  return 'text-green-600';
};

// Update function onMaterialSelected yang sudah ada
const onMaterialSelected = (materialObj) => {
  const selected = materialOptions.value.find(
    (m) => m.name === materialObj.material_name
  );

  if (selected) {
    materialObj.uom = selected.uom;
  }
  
  // Recalculate usage
  calculateMaterialUsage();
};

// ======================
// AUTO-LOAD DETAIL SAAT HALAMAN DIBUKA
// ======================
onMounted(async () => {
  const planningId = route.params.planning_id;
  
  if (!planningId) {
    alert('⚠️ Planning ID tidak ditemukan!');
    router.push('/planningReportList');
    return;
  }

  console.log('📂 Auto-loading planning detail:', planningId);
  await loadPlanningDetail(planningId);
});

onMounted(async () => {
  await loadActivityOptions();
});

const loadActivityOptions = async () => {
  const { data, error } = await supabase
    .from("gh_potato_activity")
    .select("activity_id, activity, CoA_code");

  if (!error) activityOptions.value = data;
};


const loadWarehouseByLocation = async (locationName) => {
  const res = await openbravoApi.get(
    "/org.openbravo.service.json.jsonrest/Warehouse",
    {
      params: {
        _where: `name='${locationName}'`,
        _selectedProperties: "id,name",
      },
    }
  );

  return res?.data?.response?.data?.[0] || null;
};

// Tambahkan function yang hilang (letakkan setelah loadWarehouseByLocation)
const loadLocatorByWarehouse = async (warehouseId) => {
  try {
    const res = await openbravoApi.get(
      "/org.openbravo.service.json.jsonrest/Locator",
      {
        params: {
          _where: `warehouse.id='${warehouseId}'`,
          _selectedProperties: "id,searchKey,warehouse",
          _orderBy: "searchKey"
        },
      }
    );

    return res?.data?.response?.data?.[0] || null;
  } catch (error) {
    console.error('Error loading locator:', error);
    return null;
  }
};

// Perbaiki loadMaterialsByBin dengan error handling
const loadMaterialsByBin = async (binId) => {
  materialLoading.value = true;

  try {
    const res = await openbravoApi.get(
      "/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail",
      {
        params: {
          _where: `storageBin.id='${binId}' AND quantityOnHand > 0`,
        },
      }
    );

    const rows = res?.data?.response?.data || [];

    materialOptions.value = rows.map((r) => ({
      productId: r.product?.id || r.product,
      name: r.product?.name || r["product$_identifier"] || r.product_name || "Unknown Material",
      uom: r.uOM?.name || r["uOM$_identifier"] || r.uom_name || "Unit",
      stock: r.quantityOnHand || r.qtyonhand || 0,
    }));
  } catch (error) {
    console.error('Error loading materials:', error);
    materialOptions.value = [];
  } finally {
    materialLoading.value = false;
  }
};

// ============================================
// TAMBAHKAN FUNCTIONS INI KE SCRIPT ANDA
// ============================================

const openReviseModal = () => {
  reviseData.value = {
    activities: activities.value.map(act => ({
      activity_id: act.activity_id,        // PK internal, biarkan saja
      act_name: act.act_name,              // ⬅️ ini yang dipakai di select
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

  calculateMaterialUsage();   // sekalian hitung awal
  showReviseModal.value = true;
};

// 2. TAMBAHKAN function baru untuk check stock shortage
const checkStockShortage = () => {
  const shortageList = [];
  
  reviseData.value.activities.forEach((activity, actIndex) => {
    activity.materials.forEach((material) => {
      if (material.material_name) {
        const stockInfo = getMaterialStockInfo(material.material_name);
        
        if (stockInfo && stockInfo.remaining < 0) {
          shortageList.push({
            activityIndex: actIndex + 1,
            activityName: activity.act_name,
            materialName: material.material_name,
            needed: Math.abs(stockInfo.remaining),
            uom: stockInfo.uom
          });
        }
      }
    });
  });
  
  return shortageList;
};

// 3. GANTI saveRevision yang lama dengan ini (dengan stock check)
const saveRevision = async () => {
  // ✅ Check stock shortage sebelum save
  const shortages = checkStockShortage();
  
  if (shortages.length > 0) {
    const shortageMessage = shortages
      .map(s => `• Activity ${s.activityIndex} (${s.activityName}):\n  ${s.materialName} - Kurang ${s.needed} ${s.uom}`)
      .join('\n\n');
    
    const confirmRedirect = confirm(
      `⚠️ STOK TIDAK MENCUKUPI!\n\n` +
      `Material berikut kekurangan stok:\n\n${shortageMessage}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Apakah Anda ingin membuat Good Movement untuk menambah stok?\n\n` +
      `• OK → Ke halaman Good Movement\n` +
      `• Cancel → Tetap lanjutkan`
    );
    
    if (confirmRedirect) {
      closeReviseModal();
      router.push('/goodmovement');
      return;
    }
    
    const confirmSave = confirm(
      '⚠️ Anda yakin ingin melanjutkan approval meskipun stok tidak mencukupi?\n\n' +
      'Planning akan tetap disetujui meskipun material kurang.'
    );
    
    if (!confirmSave) {
      return;
    }
  }
  
  if (!confirm('Simpan revisi dan setujui planning ini?')) return;

  try {
    const changes = [];

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

      for (let material of activity.materials) {
        if (String(material.material_id).startsWith('temp_')) {
          const { error: matInsertError } = await supabase
            .from('gh_planning_material')
            .insert({
              activity_id: activity.activity_id,
              material_name: material.material_name,
              qty: parseFloat(material.qty),
              uom: material.uom,
              created_at: new Date().toISOString()
            });

          if (matInsertError) throw matInsertError;

          changes.push({
            material: material.material_name,
            action: 'added'
          });
        } else {
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
    }

    const { error: updateError } = await supabase
      .from('gh_planning_report')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('planning_id', reportDetails.value.planning_id);

    if (updateError) throw updateError;

    const { error: historyError } = await supabase
      .from('gh_planning_history')
      .insert([{
        planning_id: reportDetails.value.planning_id,
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
    router.push('/planningReportList');
  } catch (err) {
    console.error('❌ Error saving revision:', err);
    alert('Gagal menyimpan revisi: ' + err.message);
  }
};

// 4. GANTI onActivitySelected yang lama dengan ini
const onActivitySelected = (activityObj) => {
  const selected = activityOptions.value.find(
    (a) => a.activity === activityObj.act_name
  );

  if (selected) {
    activityObj.coa = selected.CoA_code;  // CoA auto-fill
    // activityObj.act_name sudah keisi dari v-model
  }
};


// Tambahkan computed property untuk menggabungkan material options
const getMaterialOptionsForActivity = computed(() => (activityIndex) => {
  if (!reviseData.value.activities[activityIndex]) return materialOptions.value;
  
  const existingMaterials = reviseData.value.activities[activityIndex].materials || [];
  const existingNames = existingMaterials.map(m => m.material_name).filter(Boolean);
  
  // Gabungkan: material dari Openbravo + material yang sudah ada
  const combined = [
    ...materialOptions.value,
    ...existingMaterials
      .filter(m => m.material_name && !materialOptions.value.find(opt => opt.name === m.material_name))
      .map(m => ({
        productId: null,
        name: m.material_name,
        uom: m.uom,
        stock: 0
      }))
  ];
  
  // Hilangkan duplikat berdasarkan nama
  const unique = Array.from(
    new Map(combined.map(item => [item.name, item])).values()
  );
  
  return unique.sort((a, b) => a.name.localeCompare(b.name));
});

// Perbaiki addMaterialRow - gunakan temporary ID
const addMaterialRow = (activityIndex) => {
  reviseData.value.activities[activityIndex].materials.push({
    material_id: `temp_${Date.now()}`,  // Temporary ID untuk material baru
    material_name: '',
    qty: 0,
    uom: ''
  });
};

const loadMaterialOptions = async () => {
  if (!reportDetails.value) return;

  const locationName = reportDetails.value.gh_location.location;

  const warehouse = await loadWarehouseByLocation(locationName);
  if (!warehouse) return;

  selectedWarehouse.value = warehouse;

  const locator = await loadLocatorByWarehouse(warehouse.id);
  if (!locator) return;

  selectedBin.value = locator;

  await loadMaterialsByBin(locator.id);
};



// ======================
// LOAD PLANNING DETAIL
// ======================
const loadPlanningDetail = async (planningId) => {
  isLoading.value = true;
  
  try {
    // Fetch planning report
    const { data: planningData, error: planningError } = await supabase
      .from('gh_planning_report')
      .select(`
        *,
        gh_location:location_id(location_id, location),
        gh_batch:batch_id(batch_id, batch_name)
      `)
      .eq('planning_id', planningId)
      .single();

    if (planningError) throw planningError;
    if (!planningData) {
      alert('⚠️ Planning tidak ditemukan!');
      router.push('/planningReportList');
      return;
    }

    reportDetails.value = planningData;

    // Fetch activities
    const { data: activitiesData, error: actError } = await supabase
      .from('gh_planning_activity')
      .select('*')
      .eq('planning_id', planningId)
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

    console.log('✅ Planning detail loaded successfully');
  } catch (err) {
    console.error('❌ Error loading planning detail:', err);
    alert('Gagal memuat detail planning: ' + err.message);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  const planningId = route.params.planning_id;

  await loadPlanningDetail(planningId);
  await loadActivityOptions();
  await loadMaterialOptions();
});

// ======================
// APPROVE
// ======================
const approvePlanning = async () => {
  if (!reportDetails.value) return;
  if (!confirm('Apakah Anda yakin ingin menyetujui planning ini?')) return;

  try {
    const { error: updateError } = await supabase
      .from('gh_planning_report')
      .update({ status: 'approved' })
      .eq('planning_id', reportDetails.value.planning_id);

    if (updateError) throw updateError;

    const { error: historyError } = await supabase
      .from('gh_planning_history')
      .insert([{
        planning_id: reportDetails.value.planning_id,
        changed_by: 'reviewer',
        changes: JSON.stringify({
          action: 'approve',
          status: 'approved',
          timestamp: new Date().toISOString()
        })
      }]);

    if (historyError) throw historyError;

    alert('✅ Planning berhasil disetujui!');
    router.push('/planningReportList');
  } catch (err) {
    console.error('❌ Error approving:', err);
    alert('Gagal menyetujui planning: ' + err.message);
  }
};

const closeReviseModal = () => {
  showReviseModal.value = false;
  reviseData.value = { activities: [] };
};

// ======================
// HELPERS
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

const removeMaterialRow = (activityIndex, materialIndex) => {
  if (reviseData.value.activities[activityIndex].materials.length > 1) {
    reviseData.value.activities[activityIndex].materials.splice(materialIndex, 1);
  }
};

</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/planningReportList')"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-[#0071f3] rounded-lg flex items-center justify-center text-white text-lg">
                ✓
              </span>
              Review Activity Planning
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Review dan Approve Planning Daily GreenHouse</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="max-w-7xl mx-auto px-4 py-20 text-center">
      <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-gray-600">Loading planning details...</p>
    </div>

    <!-- Planning Detail Content -->
    <div v-else-if="reportDetails" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Planning Header Card -->
      <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Planning #{{ reportDetails.planning_id }}</h2>
            <p class="text-sm text-gray-500 mt-1">{{ formatDate(reportDetails.planning_date) }}</p>
          </div>
          <span :class="getStatusBadge(reportDetails.status)" class="px-4 py-2 rounded-lg text-sm font-semibold">
            {{ getStatusText(reportDetails.status) }}
          </span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
          <div>
            <p class="text-xs text-gray-500 mb-1">Location</p>
            <p class="font-semibold text-gray-900">{{ reportDetails.gh_location?.location }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1">Batch</p>
            <p class="font-semibold text-gray-900">{{ reportDetails.gh_batch?.batch_name }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1">Phase</p>
            <p class="font-semibold text-gray-900">{{ reportDetails.phase_plan }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1">Created By</p>
            <p class="font-semibold text-gray-900">{{ reportDetails.created_by || '-' }}</p>
          </div>
        </div>
      </div>

      <!-- Activities -->
      <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Activities</h3>
        <div class="space-y-4">
          <div
            v-for="(activity, index) in activities"
            :key="activity.activity_id"
            class="border-2 border-gray-200 rounded-xl p-5"
          >
            <div class="flex items-start gap-4 mb-4">
              <div class="w-10 h-10 bg-[#0071f3] rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
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
                  <span class="font-semibold text-[#0071f3]">{{ formatNumber(material.qty) }} {{ material.uom }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="reportDetails.status === 'onReview'" class="flex gap-3 mt-6">
        <button
          @click="approvePlanning"
          class="flex-1 bg-gradient-to-br from-green-500 to-emerald-600 hover:border-[#0071f3] text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl"
        >
          ✓ Approve
        </button>
        <button
          @click="openReviseModal"
          class="flex-1 bg-[#0071f3] hover:[#0071f3] text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl"
        >
          ✎ Revision & Approve
        </button>
      </div>
    </div>

    <!-- Revise Modal -->
    <div
      v-if="showReviseModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6 text-white sticky top-0 z-10 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold">Revision Planning #{{ reportDetails?.planning_id }}</h2>
              <p class="text-sm text-white mt-1">Edit and Approve the plan</p>
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
        
        <div class="p-6 space-y-6">
          <div
            v-for="(activity, actIndex) in reviseData.activities"
            :key="activity.activity_id"
            class="border-2 border-blue-200 rounded-xl p-5 bg-blue-50"
          >
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#0060d1] rounded-lg flex items-center justify-center text-white font-bold">
                {{ actIndex + 1 }}
              </div>
              <h4 class="font-bold text-gray-900 text-lg">Activity {{ actIndex + 1 }}</h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div class="flex flex-col">
                <label class="text-xs font-semibold text-gray-700 mb-2">Activity Name</label>
               <select
                  v-model="activity.act_name"
                  @change="onActivitySelected(activity)"
                  class="px-4 py-2 border rounded-lg"
                >
                <option value="" disabled>Select Activity</option>
                <option
                  v-for="a in activityOptions"
                  :key="a.activity_id"
                  :value="a.activity">
                    {{ a.activity }}
                </option>
              </select>
              </div>
              <div class="flex flex-col">
                <label class="text-xs font-semibold text-gray-700 mb-2">CoA</label>
                <input
                  v-model="activity.coa"
                  type="text"
                  readonly
                  class="px-4 py-2 border bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-xs font-semibold text-gray-700 mb-2">Manpower</label>
                <input
                  v-model="activity.manpower"
                  type="text"
                  class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </div>
            <!-- GANTI seluruh bagian Materials di dalam modal revision (mulai dari <div class="bg-white rounded-lg p-4">) -->
            <div class="bg-white rounded-lg p-4">
              <div class="flex justify-between items-center mb-3">
                <p class="text-sm font-semibold text-gray-700">📦 Materials</p>
                <button
                  @click="addMaterialRow(actIndex)"
                  class="text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  + Add Material
                </button>
              </div>

              <div class="space-y-4">
                <div
                  v-for="(material, matIndex) in activity.materials"
                  :key="matIndex"
                  class="space-y-2"
                >
                  <!-- Material Input Row -->
                  <div class="flex gap-3 items-end">
                    <!-- Material Name Dropdown -->
                    <div class="flex-1 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Material Name</label>
                      <select
                        v-model="material.material_name"
                        @change="onMaterialSelected(material)"
                        class="px-4 py-2 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option disabled value="">
                          {{ materialLoading ? "Loading..." : "Select Material" }}
                        </option>
                        <option 
                          v-for="m in getMaterialOptionsForActivity(actIndex)"
                          :key="m.productId || m.name"
                          :value="m.name"
                        >
                          {{ m.name }}{{ m.stock > 0 ? ` (Stok Openbravo: ${formatNumber(m.stock)} ${m.uom})` : '' }}
                        </option>
                      </select>
                    </div>

                    <!-- Qty Input -->
                    <div class="w-28 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                      <input
                        v-model="material.qty"
                        @input="calculateMaterialUsage"
                        type="number"
                        step="0.01"
                        class="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>

                    <!-- Unit (auto-fill, readonly) -->
                    <div class="w-24 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                      <input
                        v-model="material.uom"
                        readonly
                        class="px-3 py-2 border rounded-lg bg-gray-50"
                      />
                    </div>

                    <!-- Delete Button -->
                    <button
                      v-if="activity.materials.length > 1"
                      @click="removeMaterialRow(actIndex, matIndex); calculateMaterialUsage();"
                      class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition"
                    >
                      Delete
                    </button>
                  </div>

                  <!-- Stock Information Box -->
                  <div 
                    v-if="material.material_name && getMaterialStockInfo(material.material_name)"
                    class="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-3 ml-1 shadow-sm"
                  >
                    <div class="grid grid-cols-3 gap-4 text-xs">
                      <!-- Stok Openbravo -->
                      <div>
                        <p class="text-gray-600 mb-1 font-medium">Stok Openbravo:</p>
                        <p class="font-bold text-gray-800 text-sm">
                          {{ formatNumber(getMaterialStockInfo(material.material_name).openbravoStock) }} 
                          {{ getMaterialStockInfo(material.material_name).uom }}
                        </p>
                      </div>

                      <!-- Sudah digunakan hari ini -->
                      <div>
                        <p class="text-gray-600 mb-1 font-medium">Sudah digunakan hari ini:</p>
                        <p class="font-bold text-orange-600 text-sm">
                          {{ formatNumber(getMaterialStockInfo(material.material_name).usedToday) }} 
                          {{ getMaterialStockInfo(material.material_name).uom }}
                        </p>
                      </div>

                      <!-- Tersedia -->
                      <div>
                        <p class="text-gray-600 mb-1 font-medium">Tersedia:</p>
                        <p 
                          class="font-bold text-sm"
                          :class="getStockColorClass(getMaterialStockInfo(material.material_name).remaining)"
                        >
                          {{ formatNumber(getMaterialStockInfo(material.material_name).remaining) }} 
                          {{ getMaterialStockInfo(material.material_name).uom }}
                        </p>
                      </div>
                    </div>

                    <!-- Warning jika stock tidak cukup -->
                    <div 
                      v-if="getMaterialStockInfo(material.material_name).remaining < 0"
                      class="mt-3 flex items-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs font-semibold"
                    >
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                      </svg>
                      <span>⚠️ Stock tidak mencukupi! Kurang {{ Math.abs(getMaterialStockInfo(material.material_name).remaining) }} {{ getMaterialStockInfo(material.material_name).uom }}</span>
                    </div>

                    <!-- Info jika stock menipis -->
                    <div 
                      v-else-if="getMaterialStockInfo(material.material_name).remaining > 0 && getMaterialStockInfo(material.material_name).remaining <= 3"
                      class="mt-3 flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-2 rounded-lg text-xs font-semibold"
                    >
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                      </svg>
                      <span>💡 Stock menipis! Segera lakukan restocking</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-4 border-t-2 border-gray-200">
            <button
              @click="closeReviseModal"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              @click="saveRevision"
              class="flex-1 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:[#0071f3] text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl"
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
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>