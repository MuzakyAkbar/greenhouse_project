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
    phase_plan: "",  // ✅ Sudah benar
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
// WATCHERS
// ======================

// Watch selectedPhase untuk auto-sync ke semua sections
watch(selectedPhase, (newPhase) => {
  formSections.value.forEach(section => {
    section.phase_plan = newPhase;  // ✅ Ubah dari phase ke phase_plan
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
    availableMaterials.value = []
    return
  }

  try {
    console.log('🏢 Finding warehouse for location:', locationName)

    // 1. Get warehouse by location name dari Openbravo
    const warehouseRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Warehouse',
      { 
        params: { 
          _where: `name='${locationName}'`,
          _selectedProperties: 'id,name'
        } 
      }
    )

    const warehouses = warehouseRes?.data?.response?.data || []
    if (!warehouses.length) {
      console.warn('⚠️ Warehouse not found for location:', locationName)
      selectedWarehouse.value = null
      selectedBin.value = null
      availableMaterials.value = []
      return
    }

    const warehouse = warehouses[0]
    selectedWarehouse.value = warehouse
    console.log('✅ Warehouse found:', warehouse.name, '(ID:', warehouse.id, ')')

    // 2. Get first bin (locator) untuk warehouse ini
    const binRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Locator',
      { 
        params: { 
          _where: `warehouse.id='${warehouse.id}'`,
          _selectedProperties: 'id,searchKey'
        } 
      }
    )

    const bins = binRes?.data?.response?.data || []
    if (!bins.length) {
      console.warn('⚠️ Bin not found for warehouse:', warehouse.name)
      selectedBin.value = null
      availableMaterials.value = []
      return
    }

    selectedBin.value = bins[0]
    console.log('✅ Bin found:', bins[0].searchKey, '(ID:', bins[0].id, ')')

    // 3. Load materials untuk bin ini
    await loadMaterialsByBin(bins[0].id)

  } catch (err) {
    console.error('❌ Error loading warehouse/bin:', err.response?.data || err.message)
    selectedWarehouse.value = null
    selectedBin.value = null
    availableMaterials.value = []
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
          _where: `storageBin.id='${binId}' AND quantityOnHand > 0`,
          _selectedProperties: 'product.id,product.name,uOM.id,uOM.name,quantityOnHand'
        }
      }
    )

    const rows = materialsRes?.data?.response?.data || []
    console.log('📊 Raw materials data:', rows)

    availableMaterials.value = rows.map((r) => ({
      productId: r.product?.id || r.product,
      material_name: r.product?.name || r['product$_identifier'] || '(Tanpa Nama Produk)',
      uomId: r.uOM?.id || r.uOM,
      uom: r.uOM?.name || r['uOM$_identifier'] || 'Unit',
      stock: parseFloat(r.quantityOnHand) || 0,
    }))

    console.log(`✅ Loaded ${availableMaterials.value.length} materials:`, availableMaterials.value)

  } catch (err) {
    console.error('❌ Error loading materials:', err.response?.data || err.message)
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
    phase_plan: selectedPhase.value,  // ✅ Ubah dari phase ke phase_plan
    activity_id: "",
    coa: "",
    materials: [{ material_name: "", qty: "", uom: "" }],
    workers: [{ qty: "" }],
  });
}

// ======================
// VALIDATION FUNCTIONS
// ======================
const validateMaterialStock = () => {
  const errors = [];
  
  formSections.value.forEach((section, sectionIndex) => {
    section.materials.forEach((material, matIndex) => {
      if (material.material_name && material.qty) {
        const selectedMaterial = availableMaterials.value.find(
          (m) => m.material_name === material.material_name
        );
        
        if (selectedMaterial) {
          const requestedQty = parseFloat(material.qty);
          const availableStock = parseFloat(selectedMaterial.stock);
          
          if (requestedQty > availableStock) {
            errors.push({
              sectionIndex: sectionIndex + 1,
              materialName: material.material_name,
              requestedQty: requestedQty,
              availableStock: availableStock,
              uom: material.uom
            });
          }
        }
      }
    });
  });
  
  return errors;
};

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
const submitPlanning = async () => {
  // ✅ Validasi 1: Cek semua field wajib termasuk tanggal
  if (!selectedDate.value) {
    alert("⚠️ Pilih tanggal terlebih dahulu!");
    return;
  }

  if (!selectedLocation.value || !selectedBatch.value || !selectedPhase.value) {
    alert("⚠️ Isi lokasi, batch, dan phase terlebih dahulu!");
    return;
  }

  // ✅ VALIDASI STOCK MATERIAL
  const stockErrors = validateMaterialStock();
  
  if (stockErrors.length > 0) {
    let errorMessage = "❌ Tidak bisa melebihi stock qty material!\n\n";
    
    stockErrors.forEach((error, index) => {
      errorMessage += `${index + 1}. Activity ${error.sectionIndex}:\n`;
      errorMessage += `   Material: ${error.materialName}\n`;
      errorMessage += `   Qty diminta: ${formatNumber(error.requestedQty)} ${error.uom}\n`;
      errorMessage += `   Stock tersedia: ${formatNumber(error.availableStock)} ${error.uom}\n\n`;
    });
    
    alert(errorMessage);
    return;
  }

  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    console.log("📤 Menyimpan planning...");

    // ✅ FIX: Format tanggal dengan benar (tanpa timezone shift)
    // Gunakan format YYYY-MM-DD yang sudah ada di selectedDate
    const reportDate = selectedDate.value; // Ini sudah format YYYY-MM-DD dari input type="date"
    
    console.log("📅 Tanggal yang dipilih:", reportDate);

    // ==========================================
    // 1. INSERT ke gh_planning_report
    // ==========================================
    const reportPayload = {
      created_at: `${selectedDate.value}T00:00:00Z`, // ✅ Tambahkan waktu midnight UTC
      location_id: Number(selectedLocation.value),
      batch_id: Number(selectedBatch.value),
      phase_plan: selectedPhase.value,
      created_by: "manager",
      status: "pending"
    };

    console.log("📦 Payload yang akan disimpan:", reportPayload);

    const { data: reportData, error: reportErr } = await supabase
      .from("gh_planning_report")
      .insert([reportPayload])
      .select()
      .single();

    if (reportErr) throw reportErr;

    const planning_id = reportData.planning_id;
    console.log("🟩 Planning report created:", planning_id);
    console.log("📅 Report date saved:", reportData.created_at);

    // ==========================================
    // 2. INSERT ke gh_planning_activity (LOOP)
    // ==========================================
    for (let i = 0; i < formSections.value.length; i++) {
      const section = formSections.value[i];

      const selectedAct = potatoActivities.value.find(
        (a) => a.activity_id == section.activity_id
      );

      const manpowerTotal = section.workers.reduce(
        (sum, w) => sum + (parseInt(w.qty) || 0),
        0
      );

      const activityPayload = {
        planning_id,
        act_name: selectedAct?.activity || "",
        coa: section.coa ? Number(section.coa) : null,
        manpower: manpowerTotal,
        order_index: i + 1,
      };

      const { data: actData, error: actErr } = await supabase
        .from("gh_planning_activity")
        .insert([activityPayload])
        .select()
        .single();

      if (actErr) throw actErr;

      const activity_id = actData.activity_id;
      console.log("🟩 Activity created:", activity_id);

      // ==========================================
      // 3. INSERT ke gh_planning_material (LOOP)
      // ==========================================
      const validMaterials = section.materials.filter(
        (m) => m.material_name && m.qty && parseFloat(m.qty) > 0
      );

      if (validMaterials.length > 0) {
        const materialPayloads = validMaterials.map((m) => ({
          activity_id,
          material_name: m.material_name,
          qty: parseFloat(m.qty),
          uom: m.uom || null,
        }));

        const { error: matErr } = await supabase
          .from("gh_planning_material")
          .insert(materialPayloads);

        if (matErr) throw matErr;

        console.log("📦 Materials inserted:", materialPayloads.length);
      }
    }

    // ==========================================
    // 4. INSERT ke gh_planning_history
    // ==========================================
    const historyPayload = {
      planning_id,
      changed_by: "manager",
      changes: JSON.stringify({
        action: "create_planning",
        created_at: reportDate, // ✅ Gunakan reportDate yang sudah benar
        ...reportPayload
      }),
      changed_at: new Date().toISOString(), // Timestamp saat submit (untuk audit)
    };

    await supabase.from("gh_planning_history").insert([historyPayload]);
    console.log("📝 History saved.");

    alert("✅ Planning berhasil disimpan!");
    resetForm();
    
  } catch (err) {
    console.error("❌ Error:", err);
    alert("❌ Gagal menyimpan: " + err.message);
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
  selectedWarehouse.value = null;
  selectedBin.value = null;
  availableMaterials.value = [];
  
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
      phase_plan: "",  // ✅ Ubah dari phase ke phase_plan
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

const filteredBatches = computed(() => {
  if (!selectedLocation.value) return [];
  return batches.value.filter(
    (b) => Number(b.location_id) === Number(selectedLocation.value)
  );
});

watch(selectedLocation, () => {
  selectedBatch.value = "";
});

watch(selectedLocation, async (newVal) => {
  if (!newVal) return;

  const loc = locations.value.find(l => l.location_id == newVal);
  if (!loc) return;

  await loadWarehouseAndBin(loc.location); // gunakan nama lokasi, bukan ID
});

// Watcher untuk validasi stock real-time
watch(
  formSections,
  (sections) => {
    sections.forEach((section) => {
      section.materials.forEach((material) => {
        if (material.material_name && material.qty) {
          const selectedMaterial = availableMaterials.value.find(
            (m) => m.material_name === material.material_name
          );
          
          if (selectedMaterial) {
            const requestedQty = parseFloat(material.qty);
            const availableStock = parseFloat(selectedMaterial.stock);
            
            if (requestedQty > availableStock) {
              console.warn(`⚠️ Qty ${material.material_name} exceeding stock!`);
            }
          }
        }
      });
    });
  },
  { deep: true }
);

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
              Form Activity Planning
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Input Planning Daily GreenHouse</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Date, Phase, Location & Batch Section -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Information</h2>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all p-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
            <!-- Date Picker -->
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

            <!-- Phase -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 h-6">
                <span class="text-lg leading-none">🌱</span>
                Phase
              </label>
              <select
                v-model="selectedPhase"
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer"
              >
                <option value="" disabled>Select Phase</option>
                <option>Planlet</option>
                <option>Planlet Stek</option>
                <option>G0</option>
                <option>G1</option>
                <option>G2</option>
              </select>
            </div>

            <!-- Location -->
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

            <!-- Batch -->
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

      <!-- Form Sections -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity Details</h2>
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
                    <label class="text-xs font-semibold text-gray-600 mb-2"> Material Name</label>
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
                + Add Material
              </button>
            </div>

            <!-- Workers Section -->
            <div class="bg-gray-50 rounded-xl p-5">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span class="text-lg">👷</span>
                  Number of Workers
                </h4>
                <button
                  @click="addWorkerRow(index)"
                  class="text-sm bg-[#0071f3] hover:bg-[#0060d1] text-white px-3 py-1.5 rounded-lg transition font-semibold"
                >
                  + Add
                </button>
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

      <!-- Add Activity Button -->
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

      <!-- Submit Button -->
      <div class="flex justify-center mb-8">
        <button
          @click.prevent="submitPlanning"
          :disabled="isSubmitting"
          :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }"
          class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-bold px-12 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-lg"
        >
          <span v-if="isSubmitting">⏳ Save...</span>
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