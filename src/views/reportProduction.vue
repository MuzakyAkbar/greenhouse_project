<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useProductionStore } from "@/stores/production.js";
import { useSalesStore } from "@/stores/sales.js";
import { useAuthStore } from "@/stores/auth"; 
import { supabase } from "@/lib/supabase.js";
import logoPG from '../assets/logoPG.svg'

const productionStore = useProductionStore();
const salesStore = useSalesStore();
const authStore = useAuthStore(); // ✅ TAMBAHAN

/* -----------------------------------------------------
   STATE
----------------------------------------------------- */
const locations = ref([]);
const batches = ref([]);
const message = ref("");

const report = ref({
  location: null,
  batch: null,
  date: "",
});

// ✅ TAMBAHAN: Approval Flow Configuration
const APPROVAL_FLOW_CODE = ref('production_sales_report');
const flowId = ref(null);
const flowLastLevel = ref(null);

/* -----------------------------------------------------
   DINAMIS CATEGORY DARI PHASE
----------------------------------------------------- */
const productionCategories = ref([]);

async function fetchCategoriesByBatch(batchId) {
  if (!batchId) {
    productionCategories.value = [];
    return;
  }

  try {
    const { data, error } = await supabase
      .from("gh_batch_phase")
      .select(`
        phase_id,
        gh_phase ( phase_name )
      `)
      .eq("batch_id", batchId);

    if (error) throw error;

    productionCategories.value = data.map(p => p.gh_phase?.phase_name);
    console.log("📌 CATEGORY LOADED:", productionCategories.value);
  } catch (err) {
    console.error("❌ Error Fetch Category:", err);
    productionCategories.value = [];
  }
}

watch(() => report.value.batch, async (batchId) => {
  await fetchCategoriesByBatch(batchId);
});

/* -----------------------------------------------------
   LIMIT G0
----------------------------------------------------- */
const g0TotalProduction = ref(0);
const g0TotalSales = ref(0);
const g0MaxSales = ref(0);

/* -----------------------------------------------------
   LIST DATA
----------------------------------------------------- */
const productionList = ref([{ category: "", owner: "", quantity: 0 }]);
const salesList = ref([{ category: "", quantity: 0, unit: "", price: 0 }]);

const isSubmitting = ref(false);

/* -----------------------------------------------------
   ✅ LOAD APPROVAL FLOW INFO
----------------------------------------------------- */
const loadApprovalFlowInfo = async () => {
  try {
    const { data, error } = await supabase
      .from('gh_approval_flow')
      .select('flow_id, last_level')
      .eq('code_name', APPROVAL_FLOW_CODE.value)
      .single();

    if (error) throw error;

    flowId.value = data.flow_id;
    flowLastLevel.value = data.last_level;
    console.log(`✅ Approval Flow Info loaded: ID=${flowId.value}, LastLevel=${flowLastLevel.value}`);

  } catch (err) {
    console.error('❌ Error loading approval flow info:', err);
    alert('Gagal memuat konfigurasi Approval Flow. Harap hubungi Admin.');
  }
};

/* -----------------------------------------------------
   FETCH BASIC DATA
----------------------------------------------------- */
async function fetchLocations() {
  try {
    const { data, error } = await supabase
      .from("gh_location")
      .select("location_id, location")
      .order("location_id");

    if (error) throw error;
    locations.value = data;
  } catch (err) {
    console.error("❌ Error lokasi:", err);
  }
}

async function fetchBatches() {
  try {
    const { data, error } = await supabase
      .from("gh_batch")
      .select("batch_id, batch_name, location_id")
      .order("batch_id");

    if (error) throw error;
    batches.value = data;
  } catch (err) {
    console.error("❌ Error batch:", err);
  }
}

onMounted(async () => {
  await Promise.all([
    fetchLocations(), 
    fetchBatches(),
    loadApprovalFlowInfo() // ✅ TAMBAHAN
  ]);
});

/* -----------------------------------------------------
   FILTER BATCH BERDASARKAN LOCATION
----------------------------------------------------- */
const filteredBatches = computed(() => {
  if (!report.value.location) return [];
  return batches.value.filter(
    (b) => Number(b.location_id) === Number(report.value.location)
  );
});

/* -----------------------------------------------------
   G0 LIMIT
----------------------------------------------------- */
async function loadG0Limits(batchId, locationId) {
  if (!batchId || !locationId) return;

  try {
    const { data: prodData } = await supabase
      .from("gh_production")
      .select("qty")
      .eq("category", "G0")
      .eq("batch_id", batchId)
      .eq("location_id", locationId);

    g0TotalProduction.value = prodData?.reduce((s, x) => s + x.qty, 0) || 0;

    const { data: salesData } = await supabase
      .from("gh_sales")
      .select("qty")
      .eq("category", "G0")
      .eq("batch_id", batchId)
      .eq("location_id", locationId);

    g0TotalSales.value = salesData?.reduce((s, x) => s + x.qty, 0) || 0;

    const sisa = g0TotalProduction.value - g0TotalSales.value;
    g0MaxSales.value = Math.floor(sisa * 0.9);
  } catch (err) {
    console.error("❌ Error G0 limit:", err);
  }
}

watch(
  () => [report.value.batch, report.value.location],
  async ([batch, location]) => {
    if (batch && location) await loadG0Limits(batch, location);
  }
);

/* -----------------------------------------------------
   VALIDASI SAAT INPUT G0
----------------------------------------------------- */
function validateG0Sale(index) {
  const sale = salesList.value[index];
  if (sale.category !== "G0") return;

  if (sale.quantity > g0MaxSales.value) {
    alert(`❌ Maksimal penjualan G0 hanya ${g0MaxSales.value}`);
    sale.quantity = g0MaxSales.value;
  }
}

/* -----------------------------------------------------
   ADD / REMOVE ITEMS
----------------------------------------------------- */
function addProduction() {
  productionList.value.push({ category: "", owner: "", quantity: 0 });
}
function removeProduction(i) {
  if (productionList.value.length > 1) productionList.value.splice(i, 1);
}

function addSale() {
  salesList.value.push({ category: "", quantity: 0, unit: "", price: 0 });
}
function removeSale(i) {
  if (salesList.value.length > 1) salesList.value.splice(i, 1);
}

/* -----------------------------------------------------
   ✅ SUBMIT LAPORAN DENGAN APPROVAL FLOW
----------------------------------------------------- */
async function submitReport() {
  if (isSubmitting.value) return;

  if (!report.value.date || !report.value.location || !report.value.batch) {
    return alert("⚠️ Lengkapi semua data laporan!");
  }

  const batchId = report.value.batch;
  const locationId = report.value.location;

  isSubmitting.value = true;

  try {
    // ✅ 1. Initialize Approval Record DULU
    console.log("📄 Initializing approval flow...");
    
    const { data: recordId, error: initErr } = await supabase.rpc('initialize_approval_record', {
      p_flow_code_name: APPROVAL_FLOW_CODE.value,
      p_reference_id: null, // Kita isi nanti setelah production/sales dibuat
      p_reference_type: 'gh_production_sales',
      p_submitted_by: authStore.user.user_id
    });

    if (initErr) {
      console.error("❌ ERROR Initializing approval record:", initErr);
      alert(`⚠️ Gagal membuat Approval Flow. Detail: ${initErr.message}`);
      return;
    }

    console.log("✅ Approval Record created with ID:", recordId);

    // ✅ 2. Insert Production dengan approval_record_id
    const prodPayload = productionList.value
      .filter((x) => x.category && x.owner && x.quantity > 0)
      .map((x) => ({
        batch_id: batchId,
        location_id: locationId,
        category: x.category,
        owner: x.owner,
        qty: x.quantity,
        date: report.value.date,
        status: "onReview",
        approval_record_id: recordId // ✅ TAMBAHAN
      }));

    if (prodPayload.length > 0) {
      const { error: prodErr } = await supabase.from("gh_production").insert(prodPayload);
      if (prodErr) throw prodErr;
      console.log(`✅ ${prodPayload.length} Production record(s) created`);
    }

    // ✅ 3. Insert Sales dengan approval_record_id
    const salesPayload = salesList.value
      .filter((x) => x.category && x.unit && x.quantity > 0 && x.price > 0)
      .map((x) => ({
        batch_id: batchId,
        location_id: locationId,
        category: x.category,
        qty: x.quantity,
        price: x.price,
        date: report.value.date,
        status: "onReview",
        approval_record_id: recordId // ✅ TAMBAHAN
      }));

    // VALIDASI G0
    for (const sale of salesPayload) {
      if (sale.category === "G0" && sale.qty > g0MaxSales.value) {
        alert(
          `❌ Penjualan G0 melewati batas! Max: ${g0MaxSales.value}, Input: ${sale.qty}`
        );
        isSubmitting.value = false;
        return;
      }
    }

    if (salesPayload.length > 0) {
      const { error: salesErr } = await supabase.from("gh_sales").insert(salesPayload);
      if (salesErr) throw salesErr;
      console.log(`✅ ${salesPayload.length} Sales record(s) created`);
    }

    alert("✅ Data laporan berhasil disimpan dan masuk ke approval flow!");
    resetForm();

  } catch (err) {
    console.error(err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

/* -----------------------------------------------------
   RESET FORM
----------------------------------------------------- */
function resetForm() {
  report.value = { date: "", location: null, batch: null };
  productionList.value = [{ category: "", owner: "", quantity: 0 }];
  salesList.value = [{ category: "", quantity: 0, unit: "", price: 0 }];
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <router-link
            to="/dashboard"
            class="inline-flex items-center gap-2 text-gray-700 hover:text-[#0071f3] font-medium transition-colors group"
          >
            <div class="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </div>
            <span class="text-sm">Kembali ke Dashboard</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Title Section -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-2xl mb-4 shadow-lg">
          <span class="text-3xl">📊</span>
        </div>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">
          Laporan Produksi & Penjualan
        </h1>
        <p class="text-gray-500 text-sm font-medium">Input data produksi dan penjualan harian</p>
      </div>

      <!-- Date & Batch Section -->
      <div class="mb-8">
        <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <span class="text-lg">📅</span>
            </div>
            <h2 class="text-lg font-bold text-gray-900">Informasi Laporan</h2>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Date Picker -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Tanggal Laporan</label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                  </svg>
                </div>
                <input 
                  type="date" 
                  v-model="report.date" 
                  class="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            <!-- location -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Pilih Location</label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                    <path d="M0 192l256 0 0 256-192 0c-35.3 0-64-28.7-64-64L0 192zm0-64C0 57.3 28.7 32 64 32l384 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64l-128 0 0-256L0 160l0-32z"/>
                  </svg>
                </div>
                <select
                  v-model.number="report.location"
                  class="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option :value="null" disabled>Pilih Location</option>
                  <option v-for="loc in locations" :key="loc.location_id" :value="loc.location_id">
                    {{ loc.location }}
                  </option>
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor">
                    <path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Batch -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Pilih Batch</label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                    <path d="M0 192l256 0 0 256-192 0c-35.3 0-64-28.7-64-64L0 192zm0-64C0 57.3 28.7 32 64 32l384 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64l-128 0 0-256L0 160l0-32z"/>
                  </svg>
                </div>
                <select
                  v-model.number="report.batch"
                  class="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option :value="null" disabled>
                    {{ report.location ? "Pilih Batch" : "Pilih Location Terlebih Dahulu" }}
                  </option>
                  <option
                    v-for="batch in filteredBatches"
                    :key="batch.batch_id"
                    :value="batch.batch_id"
                  >
                    {{ batch.batch_name }}
                  </option>
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor">
                    <path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Info jika location kosong -->
          <div v-if="batches.length === 0" class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p class="text-sm text-yellow-800">⚠️ Belum ada location tersedia. Silakan buat location terlebih dahulu.</p>
          </div>

          <!-- Info location terpilih -->
          <div v-if="report.location" class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p class="text-sm text-blue-800" v-if="locations && locations.length && report.location">
              ✅ Lokasi terpilih:
              <strong>{{ locations.find(l => l.location_id === report.location)?.location }}</strong>
            </p>

          </div>

          <!-- Info jika batch kosong -->
          <div v-if="batches.length === 0" class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p class="text-sm text-yellow-800">⚠️ Belum ada batch tersedia. Silakan buat batch terlebih dahulu.</p>
          </div>

          <!-- Info batch terpilih -->
          <div v-if="report.batch" class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p class="text-sm text-blue-800" v-if="batches && batches.length && report.batch">
              ✅ Batch terpilih:
              <strong>{{ batches.find(b => b.batch_id === report.batch)?.batch_name }}</strong>
            </p>

          </div>
        </div>
      </div>

      <!-- PRODUKSI CARD -->
      <div class="mb-8">
        <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6">
          <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-xl flex items-center justify-center shadow-sm">
                <span class="text-xl">🏭</span>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">Data Produksi</h2>
                <p class="text-xs text-gray-500">Input hasil produksi harian</p>
              </div>
            </div>
            <div class="bg-blue-50 px-3 py-1 rounded-full">
              <span class="text-xs font-bold text-[#0071f3]">{{ productionList.length }} Item</span>
            </div>
          </div>

          <div class="space-y-4">
            <div
              v-for="(item, index) in productionList"
              :key="index"
              class="relative bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 border border-gray-200 hover:border-[#0071f3] transition-all"
            >
              <button
                @click.prevent="removeProduction(index)"
                v-if="productionList.length > 1"
                class="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-md hover:shadow-lg z-10 transform hover:scale-110"
                title="Hapus Produksi"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
                </svg>
              </button>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>📦</span> Kategori Produk
                  </label>
                  <select
                    v-model="item.category"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    <option v-for="cat in productionCategories" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>👤</span> Kepemilikan
                  </label>
                  <select
                    v-model="item.owner"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Pilih Kepemilikan</option>
                    <option>Perusahaan</option>
                    <option>Mitra</option>
                  </select>
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>🔢</span> Jumlah Produksi
                  </label>
                  <input
                    type="number"
                    v-model.number="item.quantity"
                    min="0"
                    placeholder="Masukkan jumlah"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            @click.prevent="addProduction"
            class="w-full mt-5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-[#0071f3] hover:to-[#0060d1] text-gray-700 hover:text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-transparent shadow-sm hover:shadow-md"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
            </svg>
            Tambah Data Produksi
          </button>
        </div>
      </div>

      <!-- PENJUALAN CARD -->
      <div class="mb-8">
        <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6">
          <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                <span class="text-xl">💰</span>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">Data Penjualan</h2>
                <p class="text-xs text-gray-500">Input transaksi penjualan</p>
              </div>
            </div>
            <div class="bg-gray-100 px-3 py-1 rounded-full">
              <span class="text-xs font-bold text-gray-700">{{ salesList.length }} Item</span>
            </div>
          </div>

          <div class="space-y-4">
            <div
              v-for="(sale, index) in salesList"
              :key="index"
              class="relative bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 border border-gray-200 hover:border-gray-700 transition-all"
            >
              <button
                @click.prevent="removeSale(index)"
                v-if="salesList.length > 1"
                class="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-md hover:shadow-lg z-10 transform hover:scale-110"
                title="Hapus Penjualan"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
                </svg>
              </button>

              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>📦</span> Kategori
                  </label>
                  <select
                    v-model="sale.category"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    <option v-for="cat in productionCategories" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>🔢</span> Jumlah
                  </label>
                  <input
                    type="number"
                    v-model.number="sale.quantity"
                    @input="validateG0Sale(index)"
                    min="0"
                    placeholder="0"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all"
                  />
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>⚖️</span> Satuan
                  </label>
                  <select
                    v-model="sale.unit"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Pilih Satuan</option>
                    <option>Per Kg</option>
                    <option>Per Bibit</option>
                  </select>
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>💵</span> Harga Satuan
                  </label>
                  <input
                    type="number"
                    v-model.number="sale.price"
                    min="0"
                    placeholder="Rp"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            @click.prevent="addSale"
            class="w-full mt-5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-700 hover:to-gray-800 text-gray-700 hover:text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-transparent shadow-sm hover:shadow-md"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
            </svg>
            Tambah Data Penjualan
          </button>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="flex flex-col sm:flex-row gap-4">
        <button
          @click.prevent="resetForm"
          :disabled="isSubmitting"
          class="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-bold py-4 rounded-xl shadow-sm border-2 border-gray-200 hover:border-gray-300 transition-all text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
            <path d="M125.7 160l50.3 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L48 224c-17.7 0-32-14.3-32-32L16 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 51.2L97.6 97.6c87.5-87.5 229.3-87.5 316.8 0s87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3s-163.8-62.5-226.3 0L125.7 160z"/>
          </svg>
          Reset Form
        </button>
        <button
          @click.prevent="submitReport"
          :disabled="isSubmitting"
          class="flex-1 sm:flex-[2] bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <svg v-if="!isSubmitting" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
            <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
          </svg>
          <svg v-else class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSubmitting ? 'Menyimpan...' : 'Simpan Laporan' }}
        </button>
      </div>

      <!-- Footer -->
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

/* Custom select arrow hide */
select {
  background-image: none;
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