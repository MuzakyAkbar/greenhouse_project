<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { supabase } from "@/lib/supabase.js";
import { Html5Qrcode } from "html5-qrcode";
import openbravoApi from '@/lib/openbravo'
import { useRouter } from 'vue-router';
import { useAuthStore } from "@/stores/auth"; 
import logoPG from '../assets/logoPG.svg'

// Initialize router & auth
const router = useRouter();
const authStore = useAuthStore();

// Import stores
import { useLocationStore } from "@/stores/location";
import { useBatchStore } from "@/stores/batch";
import { useMaterialStore } from "@/stores/material";
import { usePotatoActivityStore } from "@/stores/potatoActivity";
import { useActivityReportStore } from "@/stores/activityReport";
import { useActivityStore } from "@/stores/activity";
import { useTypeDamageStore } from "@/stores/typeDamage";
import { useBatchPhaseStore } from "@/stores/batchPhase";

// Initialize stores
const locationStore = useLocationStore();
const batchStore = useBatchStore();
const materialStore = useMaterialStore();
const potatoActivityStore = usePotatoActivityStore();
const activityReportStore = useActivityReportStore();
const activityStore = useActivityStore();
const typeDamageStore = useTypeDamageStore();
const batchPhaseStore = useBatchPhaseStore();

// ======================
// STATE - DECLARE ALL VARIABLES FIRST
// ======================
const selectedDate = ref("");
const selectedLocation = ref("");
const selectedBatch = ref("");
const selectedPhase = ref("");
const phaseList = ref([]);

const formData = ref({
  location_id: "",
  batch_id: "",
  phase_id: ""
});

const typeDamages = ref([
  {
    type_damage: '',
    kuning: 0,
    kutilang: 0,
    busuk: 0
  }
]);

// ===== MATERIAL STATE (dari Openbravo)
const availableMaterials = ref([]);
const materialLoading = ref(false);

// Warehouse & Bin untuk tracking
const selectedWarehouse = ref(null);
const selectedBin = ref(null);

// QR Scanner
const showScanner = ref(false);
const isScanning = ref(false);
let html5QrCode = null;

// Dynamic form
const formSections = ref([
  {
    id: Date.now(),
    phase_plan: "",
    activity_id: "",
    coa: "",
    materials: [{ material_name: "", qty: "", uom: "" }],
    workers: [{ qty: "" }],
  },
]);

// Loading states
const isSubmitting = ref(false);

// ======================
// CACHE UNTUK MATERIAL USAGE
// ======================
const materialUsageCache = ref(new Map());
const cacheTimestamp = ref(null);
const CACHE_DURATION = 30000; // 30 detik

// Computed properties untuk data dari stores
const locations = computed(() => locationStore.locations);
const batches = computed(() => batchStore.batches);
const materialStocks = computed(() => materialStore.materialStock);
const potatoActivities = computed(() => potatoActivityStore.activities);

const filteredBatches = computed(() => {
  if (!selectedLocation.value) return [];
  return batches.value.filter(
    (b) => Number(b.location_id) === Number(selectedLocation.value)
  );
});

// ===== UTIL: Format Number
const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0);

// ======================
// FUNGSI UNTUK CEK MATERIAL YANG SUDAH DIGUNAKAN
// ======================
const getUsedMaterialsByLocationAndDate = async (locationId, date, materialName) => {
  try {
    const cacheKey = `${locationId}-${date}-${materialName}`;
    const now = Date.now();
    
    if (cacheTimestamp.value && (now - cacheTimestamp.value) < CACHE_DURATION) {
      const cached = materialUsageCache.value.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }
    
    const currentDateTime = new Date();
    
    const { data, error } = await supabase
      .from('gh_planning_material')
      .select(`
        qty,
        gh_planning_report!inner(
          planning_date,
          location_id,
          status
        )
      `)
      .eq('material_name', materialName)
      .eq('gh_planning_report.location_id', locationId)
      .neq('gh_planning_report.status', 'cancelled')
      .lte('updated_at', currentDateTime.toISOString())
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching used materials:', error);
      return 0;
    }

    const totalUsed = data.reduce((sum, item) => sum + parseFloat(item.qty || 0), 0);
    
    materialUsageCache.value.set(cacheKey, totalUsed);
    cacheTimestamp.value = now;
    
    return totalUsed;
  } catch (err) {
    console.error('❌ Error in getUsedMaterialsByLocationAndDate:', err);
    return 0;
  }
};

// ======================
// CLEAR CACHE
// ======================
const clearMaterialCache = () => {
  materialUsageCache.value.clear();
  cacheTimestamp.value = null;
};

// ======================
// HELPER: Update Display
// ======================
const updateMaterialDisplay = (sectionIndex, matIndex, material, usageMap, currentFormUsage) => {
  const usedElement = document.getElementById(`used-${sectionIndex}-${matIndex}`);
  const availableElement = document.getElementById(`available-${sectionIndex}-${matIndex}`);
  
  if (!usedElement || !availableElement) return;
  
  const selectedMaterial = availableMaterials.value.find(
    (m) => m.material_name === material.material_name
  );
  
  if (!selectedMaterial) return;
  
  const stockFromOpenbravo = parseFloat(selectedMaterial.stock);
  const usedQtyFromDB = usageMap.get(material.material_name) || 0;
  const usedInPreviousActivities = currentFormUsage.get(material.material_name) || 0;
  const totalUsed = usedQtyFromDB + usedInPreviousActivities;
  const availableStock = stockFromOpenbravo - totalUsed;
  const uom = material.uom || selectedMaterial.uom;
  
  if (usedInPreviousActivities > 0) {
    usedElement.innerHTML = `
      <div class="space-y-0.5">
        <div>${formatNumber(usedQtyFromDB)} ${uom} <span class="text-xs text-gray-500">(dari DB)</span></div>
        <div class="text-orange-700">+ ${formatNumber(usedInPreviousActivities)} ${uom} <span class="text-xs">(activity sebelumnya)</span></div>
        <div class="border-t border-orange-300 pt-0.5 font-semibold">${formatNumber(totalUsed)} ${uom}</div>
      </div>
    `;
  } else {
    usedElement.textContent = `${formatNumber(usedQtyFromDB)} ${uom}`;
  }
  
  availableElement.textContent = `${formatNumber(availableStock)} ${uom}`;
  
  if (material.qty && parseFloat(material.qty) > availableStock) {
    availableElement.classList.add('text-red-600');
    availableElement.classList.remove('text-green-700');
  } else {
    availableElement.classList.add('text-green-700');
    availableElement.classList.remove('text-red-600');
  }
};

const updateAllMaterialDisplay = async () => {
  if (!selectedLocation.value || availableMaterials.value.length === 0) return;
  
  const uniqueMaterials = new Set();
  formSections.value.forEach(section => {
    section.materials.forEach(material => {
      if (material.material_name) {
        uniqueMaterials.add(material.material_name);
      }
    });
  });
  
  if (uniqueMaterials.size === 0) return;
  
  const usagePromises = Array.from(uniqueMaterials).map(async (materialName) => {
    const usedQty = await getUsedMaterialsByLocationAndDate(
      selectedLocation.value,
      selectedDate.value,
      materialName
    );
    return { materialName, usedQty };
  });
  
  const usageResults = await Promise.all(usagePromises);
  const usageMap = new Map(usageResults.map(r => [r.materialName, r.usedQty]));
  
  const currentFormUsage = new Map();
  
  for (let sectionIndex = 0; sectionIndex < formSections.value.length; sectionIndex++) {
    const section = formSections.value[sectionIndex];
    for (let matIndex = 0; matIndex < section.materials.length; matIndex++) {
      const material = section.materials[matIndex];
      if (material.material_name) {
        updateMaterialDisplay(sectionIndex, matIndex, material, usageMap, currentFormUsage);
        if (material.qty && parseFloat(material.qty) > 0) {
          const currentUsage = currentFormUsage.get(material.material_name) || 0;
          currentFormUsage.set(material.material_name, currentUsage + parseFloat(material.qty));
        }
      }
    }
  }
};

// ======================
// LOAD WAREHOUSE & BIN
// ======================
const loadWarehouseAndBin = async (locationName) => {
  if (!locationName) {
    selectedWarehouse.value = null;
    selectedBin.value = null;
    availableMaterials.value = [];
    return;
  }

  try {
    const warehouseRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Warehouse',
      { 
        params: { 
          _where: `name='${locationName}'`,
          _selectedProperties: 'id,name'
        } 
      }
    );

    const warehouses = warehouseRes?.data?.response?.data || [];
    if (!warehouses.length) {
      selectedWarehouse.value = null;
      selectedBin.value = null;
      availableMaterials.value = [];
      return;
    }

    const warehouse = warehouses[0];
    selectedWarehouse.value = warehouse;

    const binRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Locator',
      { 
        params: { 
          _where: `warehouse.id='${warehouse.id}'`,
          _selectedProperties: 'id,searchKey'
        } 
      }
    );

    const bins = binRes?.data?.response?.data || [];
    if (!bins.length) {
      selectedBin.value = null;
      availableMaterials.value = [];
      return;
    }

    selectedBin.value = bins[0];
    await loadMaterialsByBin(bins[0].id);

  } catch (err) {
    console.error('❌ Error loading warehouse/bin:', err);
    selectedWarehouse.value = null;
    selectedBin.value = null;
    availableMaterials.value = [];
  }
};

// ======================
// LOAD MATERIALS
// ======================
const loadMaterialsByBin = async (binId) => {
  if (!binId) {
    availableMaterials.value = [];
    return;
  }

  materialLoading.value = true;
  try {
    const materialsRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail',
      {
        params: {
          _where: `storageBin.id='${binId}' AND quantityOnHand > 0`
        }
      }
    );

    const rows = materialsRes?.data?.response?.data || [];
    availableMaterials.value = rows.map((r) => {
      const productId = r.product?.id || r.product || r.m_Product_ID;
      const productName = r.product?.name || r['product$_identifier'] || '(Tanpa Nama)';
      const uomName = r.uOM?.name || r['uOM$_identifier'] || 'Unit';
      const stock = parseFloat(r.quantityOnHand || 0);

      return {
        productId,
        material_name: productName,
        uom: uomName,
        stock
      };
    });

  } catch (err) {
    console.error('❌ Error loading materials:', err);
    availableMaterials.value = [];
  } finally {
    materialLoading.value = false;
  }
};

// ======================
// QR SCANNER
// ======================
const startScanner = async () => {
  showScanner.value = true;
  isScanning.value = true;
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    html5QrCode = new Html5Qrcode("qr-reader");
    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      () => {}
    );
  } catch (err) {
    console.error("Error scanner:", err);
    alert("Gagal membuka kamera.");
    stopScanner();
  }
};

const onScanSuccess = async (decodedText) => {
  try {
    const data = JSON.parse(decodedText);
    const locationId = Number(data.location_id);
    const batchId = Number(data.batch_id);

    selectedLocation.value = locationId;
    selectedBatch.value = batchId;

    let locationItem = locations.value.find(l => Number(l.location_id) === locationId);
    if (locationItem) await loadWarehouseAndBin(locationItem.location);

    stopScanner();
    alert(`✅ Scan Berhasil: ${locationItem?.location}`);
  } catch (err) {
    alert("❌ QR Code tidak valid!");
  }
};

const stopScanner = () => {
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      showScanner.value = false;
      isScanning.value = false;
    }).catch(() => {
      showScanner.value = false;
      isScanning.value = false;
    });
  }
};

// ======================
// FORM ACTIONS
// ======================
function addFormSection() {
  formSections.value.push({
    id: Date.now(),
    phase_plan: selectedPhase.value,
    activity_id: "",
    coa: "",
    materials: [{ material_name: "", qty: "", uom: "" }],
    workers: [{ qty: "" }],
  });
}

function removeFormSection(index) {
  if (formSections.value.length > 1) formSections.value.splice(index, 1);
}

function addMaterialRow(i) {
  formSections.value[i].materials.push({ material_name: "", qty: "", uom: "" });
}

function removeMaterialRow(sectionIndex, matIndex) {
  if (formSections.value[sectionIndex].materials.length > 1) {
    formSections.value[sectionIndex].materials.splice(matIndex, 1);
  }
}

function addWorkerRow(sectionIndex) {
  formSections.value[sectionIndex].workers.push({ qty: "" });
}

function removeWorkerRow(sectionIndex, workerIndex) {
  if (formSections.value[sectionIndex].workers.length > 1) {
    formSections.value[sectionIndex].workers.splice(workerIndex, 1);
  }
}

// ======================
// VALIDATION
// ======================
const validateMaterialStock = async () => {
  if (!selectedLocation.value || !selectedDate.value) return [];

  const errors = [];
  const materialRequests = new Map();
  
  formSections.value.forEach((section, sectionIndex) => {
    section.materials.forEach((material, matIndex) => {
      if (material.material_name && material.qty) {
        const key = material.material_name;
        const requestedQty = parseFloat(material.qty);
        
        if (!materialRequests.has(key)) {
          materialRequests.set(key, {
            materialName: material.material_name,
            uom: material.uom,
            totalRequested: 0,
            sections: []
          });
        }
        
        const data = materialRequests.get(key);
        data.totalRequested += requestedQty;
        data.sections.push({ sectionIndex: sectionIndex + 1, qty: requestedQty });
      }
    });
  });
  
  const validationPromises = Array.from(materialRequests.entries()).map(async ([materialName, data]) => {
    const selectedMaterial = availableMaterials.value.find(m => m.material_name === materialName);
    if (!selectedMaterial) return null;
    
    const stockFromOpenbravo = parseFloat(selectedMaterial.stock);
    const usedQty = await getUsedMaterialsByLocationAndDate(selectedLocation.value, selectedDate.value, materialName);
    const availableStock = stockFromOpenbravo - usedQty;
    
    if (data.totalRequested > availableStock) {
      return { ...data, stockFromOpenbravo, usedQty, availableStock };
    }
    return null;
  });
  
  const results = await Promise.all(validationPromises);
  results.forEach(result => { if (result) errors.push(result); });
  return errors;
};

// ======================
// SUBMIT PLANNING (UPDATED)
// ======================
const submitPlanning = async () => {
  if (!selectedDate.value || !selectedLocation.value || !selectedBatch.value || !selectedPhase.value) {
    alert("⚠️ Lengkapi form terlebih dahulu!");
    return;
  }

  const stockErrors = await validateMaterialStock();
  if (stockErrors.length > 0) {
    alert("❌ Stock material tidak mencukupi! Silakan lakukan Good Movement.");
    router.push('/goodmovement');
    return;
  }

  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    console.log("📤 Menyimpan planning...");

    // 1. GET FLOW ID 'PLANNING_FLOW'
    const { data: flowData, error: flowErr } = await supabase
      .from('gh_approval_flow')
      .select('flow_id, first_level, last_level')
      .eq('code_name', 'PLANNING_FLOW')
      .single();

    if (flowErr || !flowData) throw new Error("Flow approval 'PLANNING_FLOW' tidak ditemukan.");

    const reportDate = selectedDate.value;
    const reportPayload = {
      planning_date: reportDate,
      location_id: Number(selectedLocation.value),
      batch_id: Number(selectedBatch.value),
      phase_plan: selectedPhase.value,
      created_by: authStore.user?.username || "user",
      status: "onReview" // Status awal onReview
    };

    // 2. INSERT Planning Report
    const { data: reportData, error: reportErr } = await supabase
      .from("gh_planning_report")
      .insert([reportPayload])
      .select()
      .single();

    if (reportErr) throw reportErr;
    const planning_id = reportData.planning_id;

    // 3. INSERT Activities & Materials
    for (let i = 0; i < formSections.value.length; i++) {
      const section = formSections.value[i];
      const selectedAct = potatoActivities.value.find(a => a.activity_id == section.activity_id);
      const manpowerTotal = section.workers.reduce((sum, w) => sum + (parseInt(w.qty) || 0), 0);

      const activityPayload = {
        planning_id,
        act_name: selectedAct?.activity || "",
        coa: section.coa ? Number(section.coa) : null,
        manpower: manpowerTotal.toString(),
        order_index: i + 1,
      };

      const { data: actData, error: actErr } = await supabase
        .from("gh_planning_activity")
        .insert([activityPayload])
        .select()
        .single();

      if (actErr) throw actErr;

      const validMaterials = section.materials.filter(m => m.material_name && m.qty > 0);
      if (validMaterials.length > 0) {
        const materialPayloads = validMaterials.map(m => ({
          planning_id,
          activity_id: actData.activity_id,
          material_name: m.material_name,
          qty: parseFloat(m.qty),
          uom: m.uom || null,
        }));

        await supabase.from("gh_planning_material").insert(materialPayloads);
      }
    }

    // 4. INSERT Approval Record (Start at First Level which is 2)
    const { data: recordData, error: recordErr } = await supabase
      .from('gh_approve_record')
      .insert({
        flow_id: flowData.flow_id,
        reference_type: 'gh_planning',
        reference_id: planning_id,
        current_level_order: flowData.first_level, // Starts at 2
        overall_status: 'onReview',
        submitted_by: authStore.user?.user_id,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (recordErr) throw recordErr;

    // 5. INSERT Approval Level Statuses (Only for existing levels in flow)
    const { data: flowLevels } = await supabase
      .from('gh_approval_flow_level')
      .select('*')
      .eq('flow_id', flowData.flow_id);

    // Loop from first_level (2) to last_level (2)
    const levelStatuses = [];
    for (let i = flowData.first_level; i <= flowData.last_level; i++) {
        const levelDetail = flowLevels.find(l => l.level_order === i);
        if (levelDetail) {
             levelStatuses.push({
                record_id: recordData.record_id,
                level_order: i,
                level_name: levelDetail.level_name,
                status: 'pending',
                flow_level_id: levelDetail.flow_level_id
            });
        }
    }

    await supabase.from('gh_approval_level_status').insert(levelStatuses);

    // 6. UPDATE Planning with approval_record_id
    await supabase
      .from('gh_planning_report')
      .update({ approval_record_id: recordData.record_id })
      .eq('planning_id', planning_id);

    // 7. INSERT History
    await supabase.from("gh_approval_history").insert({
        record_id: recordData.record_id,
        flow_id: flowData.flow_id,
        user_id: authStore.user?.user_id,
        level_order: 1, // Created by Level 1 / Staff
        action: 'submitted',
        comment: 'Planning submitted for approval to Level 2'
    });

    alert("✅ Planning berhasil disimpan dan dikirim ke Manager (Level 2)!");
    resetForm();
    router.push('/dashboard');
    
  } catch (err) {
    console.error("❌ Error:", err);
    alert("❌ Gagal menyimpan: " + err.message);
  } finally {
    isSubmitting.value = false;
  }
};

function resetForm() {
  selectedLocation.value = "";
  selectedBatch.value = "";
  selectedPhase.value = "";
  selectedWarehouse.value = null;
  selectedBin.value = null;
  availableMaterials.value = [];
  formSections.value = [{
    id: Date.now(),
    phase_plan: "",
    activity_id: "",
    coa: "",
    materials: [{ material_name: "", qty: "", uom: "" }],
    workers: [{ qty: "" }],
  }];
  selectedDate.value = new Date().toISOString().split("T")[0];
}

// Watchers
watch(selectedLocation, async (loc) => {
  formData.value.location_id = loc;
  formData.value.batch_id = ""; 
  phaseList.value = [];
  selectedBatch.value = "";
  clearMaterialCache();
  if (loc) {
    const l = locations.value.find(x => x.location_id == loc);
    if(l) loadWarehouseAndBin(l.location);
  }
});

watch(selectedBatch, async (batch) => {
  formData.value.batch_id = batch;
  if (batch) {
    phaseList.value = await batchPhaseStore.fetchPhasesForBatch(batch);
  } else {
    phaseList.value = [];
  }
});

watch(selectedPhase, (newPhase) => {
  formSections.value.forEach(section => { section.phase_plan = newPhase; });
});

watch(formSections, (sections) => {
  sections.forEach((s) => {
    const selected = potatoActivities.value.find(a => a.activity_id == s.activity_id);
    s.coa = selected ? selected.CoA_code : "";
  });
}, { deep: true });

watch(formSections, (sections) => {
  sections.forEach((section) => {
    section.materials.forEach((material) => {
      if (material.material_name) {
        const selectedMaterial = availableMaterials.value.find(m => m.material_name === material.material_name);
        if (selectedMaterial) material.uom = selectedMaterial.uom || "";
      }
    });
  });
}, { deep: true });

watch(() => formSections.value.flatMap(s => s.materials.map(m => ({ name: m.material_name, qty: m.qty }))), async () => {
    if (window.materialUpdateTimeout) clearTimeout(window.materialUpdateTimeout);
    window.materialUpdateTimeout = setTimeout(async () => { await updateAllMaterialDisplay(); }, 300);
  }, { deep: true });

watch(selectedDate, () => {
  clearMaterialCache();
  setTimeout(() => updateAllMaterialDisplay(), 500);
});

// Lifecycle
onMounted(async () => {
  selectedDate.value = new Date().toISOString().split("T")[0];
  try {
    await Promise.all([
      locationStore.fetchAll(),
      batchStore.getBatches(),
      potatoActivityStore.fetchAll(),
    ]);
  } catch (error) {
    console.error("Gagal memuat data:", error);
  }
});

onUnmounted(() => { stopScanner(); });
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
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
              <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                📝
              </span>
              Form Activity Planning
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Input Planning Daily GreenHouse</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Information</h2>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all p-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 h-6">
                <svg class="w-4 h-4 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                </svg>
                Date
              </label>
              <input 
                type="date"  
                v-model="selectedDate" 
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
              />
            </div>

            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 h-6">
                <span class="text-lg leading-none">🌱</span>
                Phase
              </label>
              <select v-model="selectedPhase" class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer">
                <option value="">Pilih Phase</option>
                <option v-for="p in phaseList" :key="p.phase_id" :value="p.phase_id">
                  {{ p.phase_name }}
                </option>
              </select>
            </div>

            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 h-6">
                <span class="text-lg leading-none">📍</span>
                Location
              </label>
              <select  
                v-model="selectedLocation"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium 
                      focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none"
              >
                <option disabled value="">Select Location</option>
                <option
                  v-for="loc in locations"
                  :key="loc.location_id"
                  :value="loc.location_id"
                >
                  {{ loc.location }}
                </option>
              </select>
            </div>

            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 h-6">
                <span class="text-lg leading-none">🏷️</span>
                Batch
              </label>
              <select  
                v-model="selectedBatch"
                :disabled="filteredBatches.length === 0"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium 
                      focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none
                      disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <option disabled value="">
                  {{ filteredBatches.length === 0 ? "Select Location First" : "Select Batch" }}
                </option>
                <option
                  v-for="b in filteredBatches"
                  :key="b.batch_id"
                  :value="b.batch_id"
                >
                  {{ b.batch_name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity Details</h2>
        <div class="space-y-6">
          <div
            v-for="(section, index) in formSections"
            :key="section.id"
            class="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] shadow-sm hover:shadow-xl transition-all p-6"
          >
            <button
              @click="removeFormSection(index)"
              v-if="formSections.length > 1"
              class="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-lg flex items-center justify-center transition shadow-md hover:shadow-lg z-10"
              title="Hapus Aktivitas"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
              </svg>
            </button>

            <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                {{ index + 1 }}
              </div>
              <h3 class="text-lg font-bold text-gray-900">Activity {{ index + 1 }}</h3>
              <span v-if="selectedPhase" class="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                Phase: {{ selectedPhase }}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2">Select Activity</label>
                <select
                  v-model="section.activity_id"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Activity</option>
                  <option
                    v-for="a in potatoActivities"
                    :key="a.activity_id"
                    :value="a.activity_id"
                  >
                    {{ a.activity }}
                  </option>
                </select>
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2">Chart of Account (CoA)</label>
                <input
                  v-model="section.coa"
                  type="text"
                  placeholder="Auto-filled"
                  readonly
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div class="mb-6 bg-gray-50 rounded-xl p-5">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span class="text-lg">📦</span>
                  Material
                </h4>
              </div>
              <div class="space-y-3">
                <div
                  v-for="(material, matIndex) in section.materials"
                  :key="matIndex"
                  class="flex flex-col gap-3 bg-white rounded-lg p-4 border border-gray-200"
                >
                  <div class="flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Material Name</label>
                    <select
                      v-model="material.material_name"
                      :disabled="materialLoading"
                      class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        {{ materialLoading ? '⏳ Loading materials...' : 'Select Material' }}
                      </option>
                      <option
                        v-for="mat in availableMaterials"
                        :key="mat.productId"
                        :value="mat.material_name"
                      >
                        {{ mat.material_name }} (Stok Openbravo: {{ formatNumber(mat.stock) }} {{ mat.uom }})
                      </option>
                    </select>
                    
                    <div v-if="material.material_name" class="mt-2 text-xs">
                      <div class="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1">
                        <div class="flex justify-between">
                          <span class="text-gray-600">Stok Openbravo:</span>
                          <span class="font-semibold text-gray-800">
                            {{ formatNumber(availableMaterials.find(m => m.material_name === material.material_name)?.stock || 0) }} 
                            {{ material.uom }}
                          </span>
                        </div>
                        <div class="flex justify-between text-orange-600">
                          <span>Sudah digunakan hari ini:</span>
                          <span class="font-semibold" :id="`used-${index}-${matIndex}`">Calculating...</span>
                        </div>
                        <div class="flex justify-between border-t border-blue-300 pt-1">
                          <span class="text-green-700 font-semibold">Tersedia:</span>
                          <span class="font-bold text-green-700" :id="`available-${index}-${matIndex}`">Calculating...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 sm:flex sm:gap-3 sm:items-end gap-3">
                    
                    <div class="col-span-1 sm:flex-1 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                      <input
                        v-model="material.qty"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                      />
                    </div>

                    <div class="col-span-1 sm:flex-1 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                      <input
                        v-model="material.uom"
                        placeholder="Auto-filled"
                        readonly
                        class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium cursor-not-allowed"
                      />
                    </div>

                    <button
                      @click="removeMaterialRow(index, matIndex)"
                      v-if="section.materials.length > 1"
                      class="col-span-2 sm:w-auto px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition shadow-sm hover:shadow"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>

              <button
                @click="addMaterialRow(index)"
                class="w-full mt-3 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-4 py-2.5 rounded-lg transition shadow-md hover:shadow-lg text-sm"
              >
                + Add Material
              </button>
            </div>

            <div class="bg-gray-50 rounded-xl p-5">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span class="text-lg">👷</span>
                  Number of Workers
                </h4>
              </div>
              <div class="space-y-3">
                <div
                  v-for="(worker, workerIndex) in section.workers"
                  :key="workerIndex"
                  class="flex gap-3 items-end bg-white rounded-lg p-4 border border-gray-200"
                >
                  <div class="flex-1 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Number of Workers</label>
                    <input
                      type="number"
                      v-model="worker.qty"
                      placeholder="0"
                      class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                    />
                  </div>

                  <button
                    @click="removeWorkerRow(index, workerIndex)"
                    v-if="section.workers.length > 1"
                    class="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition shadow-sm hover:shadow"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-center mb-8">
        <button
          @click="addFormSection"
          class="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
            <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
          </svg>
          Add New Activity
        </button>
      </div>

      <div class="flex justify-center mb-8">
        <button
          @click.prevent="submitPlanning"
          :disabled="isSubmitting"
          :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }"
          class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-bold px-12 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-lg"
        >
          <span v-if="isSubmitting">⏳ Saving...</span>
          <span v-else>📤 Submit Planning</span>
        </button>
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
</style>