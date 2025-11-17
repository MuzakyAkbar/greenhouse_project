<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { supabase } from "@/lib/supabase.js";
import { Html5Qrcode } from "html5-qrcode";
import openbravoApi from '@/lib/openbravo'

// Import stores
import { useLocationStore } from "@/stores/location";
import { useBatchStore } from "@/stores/batch";
import { useMaterialStore } from "@/stores/material";
import { usePotatoActivityStore } from "@/stores/potatoActivity";
import { useActivityReportStore } from "@/stores/activityReport";
import { useActivityStore } from "@/stores/activity";
import { useTypeDamageStore } from "@/stores/typeDamage";

// Initialize stores
const locationStore = useLocationStore();
const batchStore = useBatchStore();
const materialStore = useMaterialStore();
const potatoActivityStore = usePotatoActivityStore();
const activityReportStore = useActivityReportStore();
const activityStore = useActivityStore();
const typeDamageStore = useTypeDamageStore();

// ======================
// STATE
// ======================
const selectedDate = ref("");
const selectedLocation = ref("");
const selectedBatch = ref("");
const selectedPhase = ref("");

// Planning data state
const planningData = ref(null);
const loadingPlanning = ref(false);
const showPlanningSection = ref(false);

const typeDamages = ref([
  {
    type_damage: '',
    kuning: 0,
    kutilang: 0,
    busuk: 0
  }
])

// ===== MATERIAL STATE (dari Openbravo)
const availableMaterials = ref([])
const materialLoading = ref(false)

// Warehouse & Bin untuk tracking
const selectedWarehouse = ref(null)
const selectedBin = ref(null)

// QR Scanner
const showScanner = ref(false);
const isScanning = ref(false);
let html5QrCode = null;

// Dynamic form
const formSections = ref([
  {
    id: Date.now(),
    phase: "",
    activity_id: "",
    coa: "",
    materials: [{ material_name: "", qty: "", uom: "" }],
    workers: [{ qty: "" }],
  },
]);

// Computed properties untuk data dari stores
const locations = computed(() => locationStore.locations);
const batches = computed(() => batchStore.batches);
const materialStocks = computed(() => materialStore.materialStock);
const potatoActivities = computed(() => potatoActivityStore.activities);

// Loading states
const isSubmitting = ref(false);

// ===== UTIL: Format Number
const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0)

// ======================
// FETCH PLANNING DATA
// ======================
const fetchPlanningData = async () => {
  if (!selectedLocation.value || !selectedBatch.value) {
    planningData.value = null;
    showPlanningSection.value = false;
    return;
  }

  loadingPlanning.value = true;
  try {
    console.log('🔍 Fetching planning data for:', {
      location: selectedLocation.value,
      batch: selectedBatch.value,
      date: selectedDate.value
    });

    // Fetch planning report dengan activities dan materials (hanya yang approved)
    const { data, error } = await supabase
      .from('gh_planning_report')
      .select(`
        planning_id,
        planning_date,
        phase_plan,
        status,
        gh_planning_activity (
          activity_id,
          act_name,
          coa,
          manpower,
          order_index,
          gh_planning_material (
            material_id,
            material_name,
            qty,
            uom
          )
        )
      `)
      .eq('location_id', selectedLocation.value)
      .eq('batch_id', selectedBatch.value)
      .eq('planning_date', selectedDate.value)
      .eq('status', 'approved')
      .order('planning_id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error fetching planning:', error);
      throw error;
    }

    if (data && data.length > 0) {
      planningData.value = data[0];
      showPlanningSection.value = true;
      
      // Auto-fill phase dari planning
      if (planningData.value.phase_plan) {
        selectedPhase.value = planningData.value.phase_plan;
      }

      console.log('✅ Planning data loaded:', planningData.value);
    } else {
      planningData.value = null;
      showPlanningSection.value = false;
      console.log('ℹ️ No planning found for selected date, location, and batch');
    }
  } catch (err) {
    console.error('❌ Error in fetchPlanningData:', err);
    planningData.value = null;
    showPlanningSection.value = false;
  } finally {
    loadingPlanning.value = false;
  }
};

// ======================
// WATCHERS
// ======================

// Watch untuk trigger fetch planning data
watch([selectedLocation, selectedBatch, selectedDate], () => {
  fetchPlanningData();
});

// Watch selectedPhase untuk auto-sync ke semua sections
watch(selectedPhase, (newPhase) => {
  formSections.value.forEach(section => {
    section.phase = newPhase;
  });
});

// Watcher - Auto-fill CoA
watch(
  formSections,
  (sections) => {
    sections.forEach((s) => {
      const selected = potatoActivities.value.find(
        (a) => a.activity_id == s.activity_id
      );
      s.coa = selected ? selected.CoA_code : "";
    });
  },
  { deep: true }
);

// Watcher untuk auto-fill UoM
watch(
  formSections,
  (sections) => {
    sections.forEach((section) => {
      section.materials.forEach((material) => {
        if (material.material_name) {
          const selectedMaterial = availableMaterials.value.find(
            (m) => m.material_name === material.material_name
          );
          
          if (selectedMaterial) {
            material.uom = selectedMaterial.uom || "";
          }
          
          console.log("🔍 Auto-fill UoM:", {
            material_name: material.material_name,
            uom: material.uom
          });
        } else {
          material.uom = "";
        }
      });
    });
  },
  { deep: true }
);

// ======================
// LIFECYCLE HOOKS
// ======================
onMounted(async () => {
  console.log("🚀 Memuat data awal...");
  selectedDate.value = new Date().toISOString().split("T")[0];

  try {
    await Promise.all([
      locationStore.fetchAll(),
      batchStore.getBatches(),
      potatoActivityStore.fetchAll(),
    ]);

    console.log("✅ Data berhasil dimuat");
    console.log("Activities:", potatoActivities.value);
  } catch (error) {
    console.error("❌ Gagal memuat data:", error);
    alert("Gagal memuat data. Silakan refresh halaman.");
  }
});

onUnmounted(() => {
  stopScanner();
});

// ======================
// LOAD WAREHOUSE & BIN BY LOCATION NAME
// ======================
const loadWarehouseAndBin = async (locationName) => {
  if (!locationName) {
    selectedWarehouse.value = null
    selectedBin.value = null
    return
  }

  try {
    console.log('🏢 Finding warehouse for location:', locationName)

    // 1. Get warehouse by location name dari Openbravo
    const warehouseRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Warehouse',
      { params: { _where: `name='${locationName}'` } }
    )

    const warehouses = warehouseRes?.data?.response?.data || []
    if (!warehouses.length) {
      console.warn('⚠️ Warehouse not found for location:', locationName)
      selectedWarehouse.value = null
      selectedBin.value = null
      return
    }

    const warehouse = warehouses[0]
    selectedWarehouse.value = warehouse
    console.log('✅ Warehouse found:', warehouse.name)

    // 2. Get first bin (locator) untuk warehouse ini
    const binRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Locator',
      { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } }
    )

    const bins = binRes?.data?.response?.data || []
    if (!bins.length) {
      console.warn('⚠️ Bin not found for warehouse:', warehouse.name)
      selectedBin.value = null
      return
    }

    selectedBin.value = bins[0]
    console.log('✅ Bin found:', bins[0].name)

    // 3. Load materials untuk bin ini
    await loadMaterialsByBin(bins[0].id)

  } catch (err) {
    console.error('❌ Error loading warehouse/bin:', err)
    selectedWarehouse.value = null
    selectedBin.value = null
  }
}

// ======================
// LOAD MATERIALS BY BIN
// ======================
const loadMaterialsByBin = async (binId) => {
  if (!binId) {
    availableMaterials.value = []
    return
  }

  materialLoading.value = true
  try {
    console.log('📦 Loading materials for bin:', binId)

    const materialsRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail',
      {
        params: {
          _where: `M_Locator_ID='${binId}' AND quantityOnHand > 0`
        }
      }
    )

    const rows = materialsRes?.data?.response?.data || []

    availableMaterials.value = rows.map((r) => ({
      productId: r.product,
      material_name: r['product$_identifier'] || '(Tanpa Nama Produk)',
      uomId: r.uOM,
      uom: r['uOM$_identifier'] || null,
      stock: r.quantityOnHand ?? 0,
    }))

    console.log(`✅ Loaded ${rows.length} materials`)
  } catch (err) {
    console.error('❌ Error loading materials:', err)
    availableMaterials.value = []
  } finally {
    materialLoading.value = false
  }
}

// ======================
// QR SCANNER FUNCTIONS
// ======================
const startScanner = async () => {
  showScanner.value = true;
  isScanning.value = true;

  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const element = document.getElementById("qr-reader");
    if (!element) {
      console.error("Element qr-reader not found in DOM");
      alert("Error: Scanner element not found");
      stopScanner();
      return;
    }

    html5QrCode = new Html5Qrcode("qr-reader");

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanError
    );
  } catch (err) {
    console.error("Error starting scanner:", err);
    alert("Gagal membuka kamera. Pastikan izin kamera telah diberikan dan gunakan HTTPS atau localhost.");
    stopScanner();
  }
};

const onScanSuccess = async (decodedText) => {
  console.log("📸 QR Code detected:", decodedText);

  try {
    const data = JSON.parse(decodedText);
    console.log("✅ Parsed QR data:", data);

    const locationId = Number(data.location_id);
    const batchId = Number(data.batch_id);

    selectedLocation.value = locationId;
    selectedBatch.value = batchId;

    let locationItem = locations.value.find(l => Number(l.location_id) === locationId);
    const locationName = locationItem?.location || "Lokasi tidak ditemukan";

    let batchItem = batches.value.find(b => Number(b.batch_id) === batchId);

    if (!batchItem) {
      console.log("⏳ Fetching batch name from Supabase...");
      const { data: batchData, error } = await supabase
        .from("gh_batch")
        .select("batch_id, batch_name, location_id, location")
        .eq("batch_id", batchId)
        .single();

      if (error) {
        console.error("❌ Gagal ambil batch dari Supabase:", error.message);
      } else if (batchData) {
        console.log("✅ Batch ditemukan di DB:", batchData);
        batches.value.push(batchData);
        batchItem = batchData;
      }
    }

    const batchName = batchItem?.batch_name || "Batch tidak ditemukan";

    alert(`✅ QR Code berhasil di-scan!\n📍 Lokasi: ${locationName}\n🏷️ Batch: ${batchName}`);

    await loadWarehouseAndBin(locationName)

    stopScanner();
  } catch (err) {
    console.error("❌ Invalid QR data:", err);
    alert("❌ QR Code tidak valid atau tidak sesuai format JSON!");
  }
};

const onScanError = (errorMessage) => {
  // Tidak log setiap error untuk menghindari spam
};

const stopScanner = () => {
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode
      .stop()
      .then(() => {
        console.log("Scanner stopped");
        html5QrCode.clear();
        html5QrCode = null;
        showScanner.value = false;
        isScanning.value = false;
      })
      .catch((err) => {
        console.error("Error stopping scanner:", err);
        showScanner.value = false;
        isScanning.value = false;
      });
  } else {
    showScanner.value = false;
    isScanning.value = false;
  }
};

// ======================
// TYPE DAMAGE FUNCTIONS
// ======================
function addTypeDamageRow() {
  typeDamages.value.push({
    id: Date.now(),
    type_damage: "",
    kuning: 0,
    kutilang: 0,
    busuk: 0
  });
}

function removeTypeDamageRow(index) {
  if (typeDamages.value.length > 1) {
    typeDamages.value.splice(index, 1);
  }
}

// ======================
// FORM HANDLERS
// ======================
function addFormSection() {
  formSections.value.push({
    id: Date.now(),
    phase: selectedPhase.value,
    activity_id: "",
    coa: "",
    materials: [{ material_name: "", qty: "", uom: "" }],
    workers: [{ qty: "" }],
  });
}

function removeFormSection(index) {
  if (formSections.value.length > 1) {
    formSections.value.splice(index, 1);
  }
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
// SUBMIT TO DATABASE
// ======================
const submitActivityReport = async () => {
  if (!selectedBatch.value || !selectedLocation.value) {
    alert("⚠️ Pilih lokasi dan batch terlebih dahulu!");
    return;
  }
  
  if (!selectedPhase.value) {
    alert("⚠️ Pilih Phase terlebih dahulu!");
    return;
  }
  
  if (isSubmitting.value) {
    console.log("⚠️ Submission already in progress, ignoring...");
    return;
  }

  // Validasi form activities
  for (const section of formSections.value) {
    if (!section.activity_id) {
      alert("⚠️ Harap pilih Activity untuk setiap form!");
      return;
    }
  }

  // Batch validate ALL materials
  const allMaterials = [];

  for (const section of formSections.value) {
    for (const mat of section.materials) {
      if (mat.material_name && mat.qty && parseFloat(mat.qty) > 0) {
        allMaterials.push({
          material_name: mat.material_name,
          qty: mat.qty,
          uom: mat.uom
        });
      }
    }
  }

  // Validasi qty vs stock dari availableMaterials
  if (allMaterials.length > 0) {
    for (const material of allMaterials) {
      const stockItem = availableMaterials.value.find(
        m => m.material_name === material.material_name
      );

      if (!stockItem) {
        alert(`⚠️ Material "${material.material_name}" tidak ditemukan!`);
        return;
      }

      if (parseFloat(material.qty) > stockItem.stock) {
        alert(`⚠️ Stock "${material.material_name}" tidak cukup!\nDibutuhkan: ${material.qty} ${material.uom}\nTersedia: ${stockItem.stock}`);
        return;
      }
    }
  }

  isSubmitting.value = true;

  try {
    console.log("📤 Menyimpan laporan aktivitas...");

    // 1. Create gh_report
    const reportPayload = {
      batch_id: Number(selectedBatch.value),
      location_id: Number(selectedLocation.value),
      report_date: selectedDate.value,
      report_status: 'onReview',
      phase: selectedPhase.value || null
    };

    console.log("📋 Creating report:", reportPayload);

    const { data: reportData, error: reportErr } = await supabase
      .from('gh_report')
      .insert([reportPayload])
      .select()
      .single();

    if (reportErr) throw reportErr;

    const report_id = reportData.report_id;
    console.log("✅ Report created with ID:", report_id);

    // 2. Create type_damages
    const validDamages = typeDamages.value.filter(damage => {
      const hasKuning = damage.kuning && parseFloat(damage.kuning) > 0;
      const hasKutilang = damage.kutilang && parseFloat(damage.kutilang) > 0;
      const hasBusuk = damage.busuk && parseFloat(damage.busuk) > 0;
      return hasKuning || hasKutilang || hasBusuk;
    });

    if (validDamages.length > 0) {
      const damagePayloads = validDamages.map(damage => ({
        report_id,
        type_damage: damage.type_damage || null,
        kuning: damage.kuning ? parseInt(damage.kuning) : null,
        kutilang: damage.kutilang ? parseInt(damage.kutilang) : null,
        busuk: damage.busuk ? parseInt(damage.busuk) : null
      }));

      console.log("🔍 Creating type damages:", damagePayloads);

      const { error: tdErr } = await supabase
        .from('gh_type_damage')
        .insert(damagePayloads);

      if (tdErr) {
        console.error("⚠️ Error creating type_damages:", tdErr);
        throw tdErr;
      }
      
      console.log(`✅ ${damagePayloads.length} Type damage(s) created`);
    }

    // 3. Create activities + material_used
    console.log("🔄 Processing form sections:", formSections.value.length);
    
    for (const section of formSections.value) {
      const manpowerTotal = section.workers.reduce(
        (sum, w) => sum + (parseInt(w.qty) || 0),
        0
      );

      const selectedActivity = potatoActivities.value.find(
        a => a.activity_id == section.activity_id
      );

      const activityPayload = {
        report_id,
        act_name: selectedActivity?.activity || "",
        CoA: section.coa ? parseFloat(section.coa) : null,
        manpower: manpowerTotal.toString(),
        status: 'onReview'
      };

      console.log("📝 Creating activity:", activityPayload);

      const { data: activityData, error: actErr } = await supabase
        .from('gh_activity')
        .insert([activityPayload])
        .select()
        .single();

      if (actErr) {
        console.error("❌ Error creating activity:", actErr);
        throw actErr;
      }

      const activity_id = activityData.activity_id;
      console.log("✅ Activity created with ID:", activity_id);

      // 4. CREATE MATERIAL_USED
      console.log("🔍 CHECKING MATERIALS FOR ACTIVITY:", activity_id);
      console.log("   - section.materials:", section.materials);
      
      if (section.materials && section.materials.length > 0) {
        console.log("   - Total materials in section:", section.materials.length);
        
        const validMaterials = section.materials.filter(mat => {
          const isValid = mat.material_name && mat.qty && parseFloat(mat.qty) > 0;
          console.log(`   - Material: ${mat.material_name}, Qty: ${mat.qty}, Valid: ${isValid}`);
          return isValid;
        });

        console.log("   - Valid materials count:", validMaterials.length);

        if (validMaterials.length > 0) {
          const materialPayloads = validMaterials.map(mat => ({
            activity_id,
            material_name: mat.material_name,
            qty: parseFloat(mat.qty),
            uom: mat.uom || null
          }));

          console.log("📦 INSERTING MATERIAL USED RECORDS:", JSON.stringify(materialPayloads, null, 2));

          const { data: matData, error: matErr } = await supabase
            .from('gh_material_used')
            .insert(materialPayloads)
            .select();

          if (matErr) {
            console.error("❌ ERROR CREATING MATERIAL USED:", matErr);
            console.error("   - Error details:", JSON.stringify(matErr, null, 2));
            throw matErr;
          }

          console.log(`✅ ${matData.length} Material used record(s) created`);
          console.log("   - Created records:", JSON.stringify(matData, null, 2));
        } else {
          console.log("⚠️ NO VALID MATERIALS to insert for activity:", activity_id);
        }
      } else {
        console.log("⚠️ NO MATERIALS ARRAY or EMPTY for activity:", activity_id);
      }
    }

    alert("✅ Data berhasil disimpan ke database!");
    console.log("📊 SUMMARY:");
    console.log(`   - Report ID: ${report_id}`);
    console.log(`   - Phase: ${selectedPhase.value}`);
    console.log(`   - Damages: ${validDamages.length}`);
    console.log(`   - Activities: ${formSections.value.length}`);
    console.log("   - Status: onReview (menunggu approval)");
    
    resetForm();

  } catch (err) {
    console.error("❌ Gagal menyimpan report:", err);
    alert(`❌ Terjadi kesalahan: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
};

// ======================
// RESET FORM
// ======================
function resetForm() {
  selectedLocation.value = "";
  selectedBatch.value = "";
  selectedPhase.value = "";
  selectedWarehouse.value = null
  selectedBin.value = null
  availableMaterials.value = []
  planningData.value = null
  showPlanningSection.value = false
  
  typeDamages.value = [
    {
      id: Date.now(),
      type_damage: "",
      kuning: 0,
      kutilang: 0,
      busuk: 0
    }
  ];
  
  formSections.value = [
    {
      id: Date.now(),
      phase: "",
      activity_id: "",
      coa: "",
      materials: [{ material_name: "", qty: "", uom: "" }],
      workers: [{ qty: "" }],
    },
  ];
  selectedDate.value = new Date().toISOString().split("T")[0];
}

// Helper functions
function getLocationName(locationId) {
  const location = locations.value.find(l => l.location_id == locationId);
  return location ? location.location : "";
}

function getBatchName(batchId) {
  const batch = batches.value.find(b => b.batch_id == batchId);
  return batch ? batch.batch_name : "";
}

// Format date untuk display
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

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
              <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                📝
              </span>
              Form Activity Report
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Input Aktivitas Harian GreenHouse</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Date, Phase, Location & Batch Section -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Informasi Dasar</h2>
          <button
            @click="startScanner"
            class="flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white px-4 py-2 rounded-lg transition font-medium text-sm shadow-md hover:shadow-lg"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/>
            </svg>
            Scan QR Code
          </button>
        </div>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all p-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
            <!-- Date Picker -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                </svg>
                Tanggal
              </label>
              <input 
                type="date" 
                disabled 
                v-model="selectedDate" 
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
              />
            </div>

            <!-- Phase -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="text-lg">🌱</span>
                Phase
              </label>
              <select
                v-model="selectedPhase"
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer"
              >
                <option value="" disabled>Pilih Phase</option>
                <option>Planlet</option>
                <option>Planlet Stek</option>
                <option>G0</option>
                <option>G1</option>
                <option>G2</option>
              </select>
            </div>

            <!-- Location -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="text-lg">📍</span>
                Lokasi
              </label>
              <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium min-h-[48px] flex items-center">
                {{ selectedLocation ? getLocationName(selectedLocation) : 'Scan QR Code untuk mengisi lokasi' }}
              </div>
            </div>

            <!-- Batch -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="text-lg">🏷️</span>
                Batch
              </label>
              <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium min-h-[48px] flex items-center">
                {{ selectedBatch ? getBatchName(selectedBatch) : 'Scan QR Code untuk mengisi batch' }}
              </div>
            </div>
          </div>

          <!-- Success notification after scan -->
          <div v-if="selectedLocation && selectedBatch" class="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-3">
            <p class="text-sm text-green-700 font-semibold flex items-center gap-2">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/>
              </svg>
              Lokasi: {{ getLocationName(selectedLocation) }} | Batch: {{ getBatchName(selectedBatch) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Planning Data Section -->
      <div v-if="showPlanningSection && planningData" class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span class="text-lg">📋</span>
          Planning Hari Ini
        </h2>
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-lg p-6">
          <!-- Planning Header -->
          <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-blue-200">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
                <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM112 256l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-gray-900">Planning Activities</h3>
                <p class="text-sm text-gray-600">{{ formatDate(planningData.planning_date) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                Phase: {{ planningData.phase_plan }}
              </span>
              <span class="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                {{ planningData.status }}
              </span>
            </div>
          </div>

          <!-- Activities List -->
          <div class="space-y-4">
            <div 
              v-for="(activity, idx) in planningData.gh_planning_activity" 
              :key="activity.activity_id"
              class="bg-white rounded-xl border-2 border-blue-100 p-5 hover:shadow-md transition-all"
            >
              <!-- Activity Header -->
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {{ idx + 1 }}
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 text-lg">{{ activity.act_name }}</h4>
                    <div class="flex items-center gap-4 mt-1">
                      <span class="text-sm text-gray-600">
                        <span class="font-semibold">CoA:</span> {{ activity.coa || 'N/A' }}
                      </span>
                      <span class="text-sm text-gray-600 flex items-center gap-1">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                          <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z"/>
                        </svg>
                        <span class="font-semibold">Manpower:</span> {{ activity.manpower }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Materials Table -->
              <div v-if="activity.gh_planning_material && activity.gh_planning_material.length > 0" class="mt-4">
                <h5 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                    <path d="M234.5 5.7c13.9-5 29.1-5 43.1 0l192 68.6C495 83.4 512 107.5 512 134.6l0 242.9c0 27-17 51.2-42.5 60.3l-192 68.6c-13.9 5-29.1 5-43.1 0l-192-68.6C17 428.6 0 404.5 0 377.4L0 134.6c0-27 17-51.2 42.5-60.3l192-68.6zM256 66L82.3 128 256 190l173.7-62L256 66zm32 368.6l160-57.1 0-188L288 246.6l0 188z"/>
                  </svg>
                  Materials Needed
                </h5>
                <div class="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                  <table class="w-full">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Material</th>
                        <th class="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                        <th class="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Unit</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      <tr v-for="material in activity.gh_planning_material" :key="material.material_id" class="hover:bg-blue-50 transition">
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ material.material_name }}</td>
                        <td class="px-4 py-3 text-sm text-center font-semibold text-gray-700">{{ formatNumber(material.qty) }}</td>
                        <td class="px-4 py-3 text-sm text-center text-gray-600">{{ material.uom }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- No Materials Message -->
              <div v-else class="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p class="text-sm text-gray-500 text-center">Tidak ada material untuk aktivitas ini</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Planning -->
      <div v-if="loadingPlanning" class="mb-8">
        <div class="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-8">
          <div class="flex items-center justify-center gap-3">
            <svg class="w-6 h-6 text-blue-600 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M304 48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zm0 416a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM48 304a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm464-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM142.9 437A48 48 0 1 0 75 369.1 48 48 0 1 0 142.9 437zm0-294.2A48 48 0 1 0 75 75a48 48 0 1 0 67.9 67.9zM369.1 437A48 48 0 1 0 437 369.1 48 48 0 1 0 369.1 437z"/>
            </svg>
            <span class="text-gray-600 font-medium">Memuat data planning...</span>
          </div>
        </div>
      </div>

      <!-- No Planning Message -->
      <div v-if="!loadingPlanning && selectedLocation && selectedBatch && !planningData" class="mb-8">
        <div class="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480L40 480c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24l0 112c0 13.3 10.7 24 24 24s24-10.7 24-24l0-112c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>
            </svg>
            <div>
              <h3 class="font-bold text-yellow-800 mb-1">Tidak Ada Planning Untuk Hari Ini</h3>
              <p class="text-sm text-yellow-700">
                Tidak ditemukan planning untuk tanggal <span class="font-semibold">{{ formatDate(selectedDate) }}</span> 
                di lokasi <span class="font-semibold">{{ getLocationName(selectedLocation) }}</span>.
                Silakan isi form aktivitas secara manual.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Jenis Kerusakan Tanaman -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Jenis Kerusakan Tanaman</h2>
        </div>
        <div class="space-y-4">
          <div 
            v-for="(damage, index) in typeDamages" 
            :key="damage.id"
            class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all p-6 relative"
          >
            <!-- Delete Button -->
            <button
              @click="removeTypeDamageRow(index)"
              v-if="typeDamages.length > 1"
              class="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-lg flex items-center justify-center transition shadow-md hover:shadow-lg"
              title="Hapus Row"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
              </svg>
            </button>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
              <!-- Type Damage (Optional Description) -->
              <div class="flex flex-col md:col-span-1">
                <label class="text-sm font-semibold text-gray-700 mb-2">
                  Jenis/Catatan (Opsional)
                </label>
                <input
                  v-model="damage.type_damage"
                  type="text"
                  placeholder="Misal: Hama, Penyakit, dll"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                />
              </div>

              <!-- Kuning -->
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs">🟡</span>
                  Kuning (Qty)
                </label>
                <input
                  v-model="damage.kuning"
                  type="number"
                  placeholder="0"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                />
              </div>

              <!-- Kutilang -->
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs">🟠</span>
                  Kutilang (Qty)
                </label>
                <input
                  v-model="damage.kutilang"
                  type="number"
                  placeholder="0"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                />
              </div>

              <!-- Busuk -->
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs">🔴</span>
                  Busuk (Qty)
                </label>
                <input
                  v-model="damage.busuk"
                  type="number"
                  placeholder="0"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Sections -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Detail Aktivitas</h2>
        <div class="space-y-6">
          <div
            v-for="(section, index) in formSections"
            :key="section.id"
            class="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] shadow-sm hover:shadow-xl transition-all p-6"
          >
            <!-- Delete Button -->
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

            <!-- Activity Header -->
            <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                {{ index + 1 }}
              </div>
              <h3 class="text-lg font-bold text-gray-900">Activity {{ index + 1 }}</h3>
              <span v-if="selectedPhase" class="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                Phase: {{ selectedPhase }}
              </span>
            </div>

            <!-- Activity & CoA -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2">Pilih Activity</label>
                <select
                  v-model="section.activity_id"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer"
                >
                  <option value="" disabled>Pilih Activity</option>
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

            <!-- Materials Section -->
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
                  class="flex flex-col md:flex-row gap-3 items-end bg-white rounded-lg p-4 border border-gray-200"
                >
                  <!-- Material Name - Dropdown dari availableMaterials -->
                  <div class="flex-1 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Nama Material</label>
                    <select
                      v-model="material.material_name"
                      :disabled="materialLoading"
                      class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        {{ materialLoading ? '⏳ Loading materials...' : 'Pilih Material' }}
                      </option>
                      <option
                        v-for="mat in availableMaterials"
                        :key="mat.productId"
                        :value="mat.material_name"
                      >
                        {{ mat.material_name }} (Stok: {{ formatNumber(mat.stock) }} {{ mat.uom }})
                      </option>
                    </select>
                  </div>

                  <!-- Qty - Input number -->
                  <div class="w-full md:w-32 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                    <input
                      v-model="material.qty"
                      type="number"
                      step="0.01"
                      placeholder="0"
                      class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                    />
                  </div>

                  <!-- Unit - Auto-filled dari availableMaterials -->
                  <div class="w-full md:w-32 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                    <input
                      v-model="material.uom"
                      placeholder="Auto-filled"
                      readonly
                      class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium cursor-not-allowed"
                    />
                  </div>

                  <!-- Delete Button -->
                  <button
                    @click="removeMaterialRow(index, matIndex)"
                    v-if="section.materials.length > 1"
                    class="w-full md:w-auto px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition shadow-sm hover:shadow"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <!-- Add Material Row Button -->
              <button
                @click="addMaterialRow(index)"
                class="w-full mt-3 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-4 py-2.5 rounded-lg transition shadow-md hover:shadow-lg text-sm"
              >
                + Tambah Material
              </button>
            </div>

            <!-- Workers Section -->
            <div class="bg-gray-50 rounded-xl p-5">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span class="text-lg">👷</span>
                  Jumlah Tenaga Kerja
                </h4>
                <button
                  @click="addWorkerRow(index)"
                  class="text-sm bg-[#0071f3] hover:bg-[#0060d1] text-white px-3 py-1.5 rounded-lg transition font-semibold"
                >
                  + Tambah
                </button>
              </div>
              <div class="space-y-3">
                <div
                  v-for="(worker, workerIndex) in section.workers"
                  :key="workerIndex"
                  class="flex gap-3 items-end bg-white rounded-lg p-4 border border-gray-200"
                >
                  <div class="flex-1 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Jumlah Pekerja</label>
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
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Activity Button -->
      <div class="flex justify-center mb-8">
        <button
          @click="addFormSection"
          class="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
            <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
          </svg>
          Tambah Aktivitas Baru
        </button>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-center mb-8">
        <button
          @click.prevent="submitActivityReport"
          :disabled="isSubmitting"
          :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }"
          class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-bold px-12 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-lg"
        >
          <span v-if="isSubmitting">⏳ Menyimpan...</span>
          <span v-else>📤 Submit Report</span>
        </button>
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

    <!-- QR Scanner Modal -->
    <div
      v-if="showScanner"
      class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-2xl max-w-md w-full overflow-hidden">
        <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6 text-white">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-bold">Scan QR Code</h2>
            <button
              @click="stopScanner"
              class="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
              </svg>
            </button>
          </div>
          <p class="text-sm text-blue-100">Arahkan kamera ke QR Code</p>
        </div>
        
        <div class="p-6">
          <div class="relative bg-black rounded-xl overflow-hidden mb-4" style="min-height: 350px;">
            <!-- QR Reader Container -->
            <div id="qr-reader" style="width: 100%; height: 100%;"></div>
            
            <!-- Scanning Indicator -->
            <div v-if="isScanning" class="absolute top-4 left-4 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 z-10">
              <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Scanning...
            </div>
            
            <!-- Scan Frame Overlay -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="w-64 h-64 border-4 border-white rounded-2xl opacity-30"></div>
            </div>
          </div>
          
          <div class="space-y-2">
            <button
              @click="stopScanner"
              class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
            >
              ✕ Tutup Scanner
            </button>
            
            <p class="text-xs text-gray-500 text-center">
              💡 Pastikan QR Code berada dalam frame putih dan pencahayaan cukup
            </p>
          </div>
        </div>
      </div>
    </div>
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

/* QR Scanner styles */
#qr-reader {
  border: none;
}

#qr-reader__dashboard,
#qr-reader__dashboard_section {
  display: none !important;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>