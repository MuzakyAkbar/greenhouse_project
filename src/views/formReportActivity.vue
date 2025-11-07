<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { supabase } from "@/lib/supabase.js";
import { Html5Qrcode } from "html5-qrcode";

// Import stores
import { useLocationStore } from "@/stores/location";
import { useBatchStore } from "@/stores/batch";
import { useMaterialStore } from "@/stores/material";
import { usePotatoActivityStore } from "@/stores/potatoActivity";
import { useActivityReportStore } from "@/stores/activityReport";
import { useTypeDamageStore } from "@/stores/typeDamage";


// ======================
// LOAD MATERIAL & ACTIVITY
// ======================
async function loadMaterialAndActivity() {
  try {
    console.log("⏳ Memuat data material & activity...");

    // Ambil data dari Supabase melalui store
    const [{ data: matData, error: matError }, { data: actData, error: actError }] = await Promise.all([
      materialStore.fetchAll(),
      potatoActivityStore.fetchAll(),
    ]);

    if (matError) throw matError;
    if (actError) throw actError;

    materials.value = matData || [];
    potatoActivities.value = actData || [];

    console.log("✅ Material:", materials.value);
    console.log("✅ Activity:", potatoActivities.value);
  } catch (err) {
    console.error("❌ Gagal memuat data:", err.message);
    alert("Gagal memuat data material atau activity dari database.");
  }
}

onMounted(async () => {
  await materialStore.fetchAll(); // <- penting
});


// Initialize stores
const locationStore = useLocationStore();
const batchStore = useBatchStore();
const materialStore = useMaterialStore();
const potatoActivityStore = usePotatoActivityStore();
const activityReportStore = useActivityReportStore();
const typeDamageStore = useTypeDamageStore();

// ======================
// STATE
// ======================
const selectedDate = ref("");
const selectedLocation = ref("");
const selectedBatch = ref("");

const typeDamage = ref({
  kuning: 0,
  kutilang: 0,
  busuk: 0,
});

// QR Scanner
const showScanner = ref(false);
const isScanning = ref(false);
let html5QrCode = null;

// Dynamic form
const formSections = ref([
  {
    id: Date.now(),
    activity_id: "",
    coa: "",
    materials: [{ material_id: "", qty: "", unit: "" }],
    workers: [{ qty: "" }],
  },
]);

// Computed properties untuk data dari stores
const locations = computed(() => locationStore.locations);
const batches = computed(() => batchStore.batches);
const materials = computed(() => materialStore.materials);
const potatoActivities = computed(() => potatoActivityStore.activities);

// Loading states
const isSubmitting = ref(false);

// ======================
// LIFECYCLE HOOKS
// ======================
onMounted(async () => {
  console.log("🚀 Memuat data awal...");
  selectedDate.value = new Date().toISOString().split("T")[0];

  try {
    // ✅ load semua data dari store (termasuk material dari Supabase)
    await Promise.all([
      locationStore.fetchAll(),
      batchStore.getBatches(),
      materialStore.fetchAll(),          // ambil data material dari tabel gh_material
      potatoActivityStore.fetchAll(),    // ambil data activity dari tabel gh_potato_activity
    ]);

    console.log("✅ Data berhasil dimuat");
    console.log("Materials:", materials.value);
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

    // Set lokasi
    selectedLocation.value = locationId;
    selectedBatch.value = batchId;

    // Cari nama lokasi dari store
    let locationItem = locations.value.find(l => Number(l.location_id) === locationId);
    const locationName = locationItem?.location || "Lokasi tidak ditemukan";

    // 🔍 Coba cari batch di store dulu
    let batchItem = batches.value.find(b => Number(b.batch_id) === batchId);

    // Kalau tidak ada, ambil dari Supabase
    if (!batchItem) {
      console.log("⏳ Fetching batch name from Supabase...");
      const { data: batchData, error } = await supabase
        .from("gh_batch")
        .select("batch_id, batch_name, location_id")
        .eq("batch_id", batchId)
        .single();

      if (error) {
        console.error("❌ Gagal ambil batch dari Supabase:", error.message);
      } else if (batchData) {
        console.log("✅ Batch ditemukan di DB:", batchData);
        batches.value.push(batchData); // Tambahkan ke store agar reaktif
        batchItem = batchData;
      }
    }

    const batchName = batchItem?.batch_name || "Batch tidak ditemukan";

    alert(`✅ QR Code berhasil di-scan!\n📍 Lokasi: ${locationName}\n🏷️ Batch: ${batchName}`);

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
// FORM HANDLERS
// ======================
function addFormSection() {
  formSections.value.push({
    id: Date.now(),
    activity_id: "",
    coa: "",
    materials: [{ material_id: "", qty: "", unit: "" }],
    workers: [{ qty: "" }],
  });
}

function removeFormSection(index) {
  if (formSections.value.length > 1) {
    formSections.value.splice(index, 1);
  }
}

function addMaterialRow(i) {
  formSections.value[i].materials.push({ material_id: "", qty: "", unit: "" });
}

function removeMaterialRow(sectionIndex, matIndex) {
  if (formSections.value[sectionIndex].materials.length > 1) {
    formSections.value[sectionIndex].materials.splice(matIndex, 1);
  }
}

// ======================
// WATCHER - Auto-fill CoA
// ======================
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

// Tambahkan watcher - unit material
watch(
  formSections,
  (sections) => {
    sections.forEach((section) => {
      // Auto-fill CoA dari activity
      const selectedActivity = potatoActivities.value.find(
        (a) => a.activity_id == section.activity_id
      );
      section.coa = selectedActivity ? selectedActivity.CoA_code : "";

      // Auto-fill unit dari material
        section.materials.forEach((material) => {
        if (material.material_id) {
          const selectedMaterial = materials.value.find(
            (m) => m.material_id == material.material_id
          );
          
          if (selectedMaterial) {
            // Kolom di database adalah 'uom' (huruf kecil)
            material.unit = selectedMaterial.uom || "";
          }
          
          console.log("🔍 Auto-fill unit (watcher):", {
            material_id: material.material_id,
            selectedMaterial: selectedMaterial,
            unit: material.unit
          });
        } else {
          material.unit = "";
        }
      });
    });
  },
  { deep: true }
);

function onMaterialChange(sectionIndex, materialIndex) {
  const material = formSections.value[sectionIndex].materials[materialIndex];
  
  console.log("=" .repeat(50));
  console.log("🔍 onMaterialChange DIPANGGIL!");
  console.log("Section:", sectionIndex, "Material:", materialIndex);
  console.log("Material ID dipilih:", material.material_id);
  console.log("Semua materials:", materials.value);
  
  if (material.material_id) {
    const selectedMaterial = materials.value.find(
      (m) => m.material_id == material.material_id
    );
    
    console.log("✅ Material ditemukan:", selectedMaterial);
    
    if (selectedMaterial) {
      // Coba semua kemungkinan nama kolom
      const unitValue = selectedMaterial.uom || 
                        selectedMaterial.UoM || 
                        selectedMaterial.unit || 
                        selectedMaterial.satuan || "";
      
      console.log("Nilai unit yang ditemukan:", unitValue);
      console.log("Keys material:", Object.keys(selectedMaterial));
      
      material.unit = unitValue;
      
      console.log("✅ Unit BERHASIL di-set ke:", material.unit);
      console.log("=" .repeat(50));
    } else {
      console.warn("⚠️ Material tidak ditemukan di array!");
    }
  } else {
    material.unit = "";
    console.log("Material ID kosong, unit di-reset");
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

  // Validasi isi form sederhana
  for (const section of formSections.value) {
    if (!section.activity_id) {
      alert("⚠️ Harap pilih Activity untuk setiap form!");
      return;
    }
    for (const mat of section.materials) {
      if (!mat.material_id) {
        alert("⚠️ Harap pilih Material!");
        return;
      }
      if (!mat.qty || parseFloat(mat.qty) <= 0) {
        alert("⚠️ Qty Material harus lebih dari 0!");
        return;
      }
    }
  }

  isSubmitting.value = true;

  try {
    console.log("📤 Menyimpan laporan aktivitas ke gh_activity_report...");

    for (const section of formSections.value) {
      const manpowerTotal = section.workers.reduce(
        (sum, w) => sum + (parseInt(w.qty) || 0),
        0
      );

      for (const mat of section.materials) {
        const payload = {
          location: selectedLocation.value,
          batch_id: Number(selectedBatch.value),
          activity_id: Number(section.activity_id),
          material_id: Number(mat.material_id),
          qty: parseFloat(mat.qty),
          uom: mat.unit || null,
          manpower: manpowerTotal,
          CoA: section.coa ? parseFloat(section.coa) : null,
          report_date: selectedDate.value,
        };

        console.log("📦 Insert payload:", payload);
        const { error } = await supabase.from("gh_activity_report").insert([payload]);
        if (error) throw error;
      }
    }

    alert("✅ Data berhasil disimpan ke database!");
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
  typeDamage.value = {
    kuning: 0,
    kutilang: 0,
    busuk: 0,
  };
  formSections.value = [
    {
      id: Date.now(),
      activity_id: "",
      coa: "",
      materials: [{ material_id: "", qty: "", unit: "" }],
      workers: [{ qty: "" }],
    },
  ];
  selectedDate.value = new Date().toISOString().split("T")[0];
}

// Helper untuk mendapatkan nama lokasi
function getLocationName(locationId) {
  const location = locations.value.find(l => l.location_id == locationId);
  return location ? location.location : "";
}

// Helper untuk mendapatkan nama batch
function getBatchName(batchId) {
  const batch = batches.value.find(b => b.batch_id == batchId);
  return batch ? batch.batch_name : "";
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
      
      <!-- Date, Location & Batch Section -->
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
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
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

      <!-- Jenis Kerusakan Tanaman -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Jenis Kerusakan Tanaman</h2>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs">🟡</span>
                Kuning
              </label>
              <input
                v-model="typeDamage.kuning"
                type="number"
                placeholder="0"
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
              />
            </div>
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs">🟠</span>
                Kutilang
              </label>
              <input
                v-model="typeDamage.kutilang"
                type="number"
                placeholder="0"
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
              />
            </div>
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs">🔴</span>
                Busuk
              </label>
              <input
                v-model="typeDamage.busuk"
                type="number"
                placeholder="0"
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
              />
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
                  <div class="flex-1 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Nama Material</label>
                    <select
                      v-model="material.material_id"
                      class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Pilih Material</option>
                      <option
                      v-for="mat in materials"
                      :key="mat.material_id"
                      :value="mat.material_id"
                    >
                      {{ mat.material_name }}
                    </option>
                    </select>
                  </div>

                  <div class="w-full md:w-32 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                    <input
                      v-model="material.qty"
                      type="number"
                      placeholder="0"
                      class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                    />
                  </div>

                  <div class="w-full md:w-32 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                    <input
                      v-model="material.unit"
                      placeholder="Auto-filled"
                      readonly
                      class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                    />
                  </div>

                  <button
                    @click="removeMaterialRow(index, matIndex)"
                    v-if="section.materials.length > 1"
                    class="w-full md:w-auto px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition shadow-sm hover:shadow"
                  >
                    Hapus
                  </button>
                </div>
              </div>

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

      <!-- Footer -->
      <footer class="text-center py-10 mt-8 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>

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

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>