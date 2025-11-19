<script setup>
<<<<<<< HEAD
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProductionStore } from '../stores/production'
import { useSalesStore } from '../stores/sales'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { useMaterialStore } from '../stores/material'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const productionStore = useProductionStore()
const salesStore = useSalesStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const materialStore = useMaterialStore()
=======
import { ref, onMounted, computed } from "vue"; 
import { useProductionStore } from "@/stores/production.js";
import { useSalesStore } from "@/stores/sales.js";
import { supabase } from "@/lib/supabase.js";

const productionStore = useProductionStore();
const salesStore = useSalesStore();

// state
const locations = ref([]);
const batches = ref([]);
const message = ref("");

// ambil semua lokasi
const fetchLocations = async () => {
  try {
    const { data, error } = await supabase
      .from("gh_location")
      .select("location_id, location")
      .order("location_id", { ascending: true });

    if (error) throw error;
    locations.value = data;
    console.log("✅ Lokasi dimuat:", data);
  } catch (err) {
    console.error("❌ Error ambil lokasi:", err);
  }
};

// ambil semua batch
const fetchBatches = async () => {
  try {
    const { data, error } = await supabase
      .from("gh_batch")
      .select("batch_id, batch_name, location_id, tanggal_mulai, tanggal_selesai")
      .order("batch_id", { ascending: true });

    if (error) throw error;
    batches.value = data;
    console.log("✅ Batch dimuat:", data);
  } catch (err) {
    console.error("❌ Error ambil batch:", err);
  }
};

// Jalankan fungsi ambil data saat komponen dimuat
onMounted(async () => {
  await Promise.all([fetchLocations(), fetchBatches()]);
});

// data laporan
const report = ref({
  location: null,
  batch: null,
  date: ""
});

// computed untuk batch sesuai lokasi yang dipilih
const filteredBatches = computed(() => {
  if (!report.value.location) return [];
  return batches.value.filter(
    (batch) => Number(batch.location_id) === Number(report.value.location)
  );
});

const productionCategories = ["Planlet", "G0", "G1", "G2"];
>>>>>>> 8175f7ff635de1c79113717bf65c6b1c8a4a7f39

const batchId = ref(parseInt(route.params.batchId))
const dateParam = ref(route.params.date)
const loading = ref(true)
const saving = ref(false)
const error = ref(null)

<<<<<<< HEAD
// Productions and Sales lists
const productions = ref([])
const sales = ref([])

const revisionNotes = ref('Mohon perbaiki data produksi dan penjualan')

// Categories
const productionCategories = ['Planlet G0', 'Planlet G1', 'Planlet G2', 'Planlet G3', 'Minituber']
const salesCategories = ['Planlet G0', 'Planlet G1', 'Planlet G2', 'Planlet G3', 'Minituber']
const ownerOptions = ['Petani', 'Mitra', 'Internal', 'Lainnya']

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  try {
    loading.value = true
    
    // Fetch all reference data
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll(),
      materialStore.fetchAll(),
      productionStore.fetchAll(batchId.value),
      salesStore.fetchAll(batchId.value)
    ])

    // Filter productions and sales by date and batch
    productions.value = productionStore.productions
      .filter(p => p.batch_id === batchId.value && p.date === dateParam.value)
      .map(p => ({ ...p, isNew: false }))

    sales.value = salesStore.sales
      .filter(s => s.batch_id === batchId.value && s.date === dateParam.value)
      .map(s => ({ ...s, isNew: false }))

    // If no data, add default entries
    if (productions.value.length === 0) {
      addProduction()
    }
    if (sales.value.length === 0) {
      addSale()
    }

  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
})

const selectedBatch = computed(() => {
  return batchStore.batches.find(b => b.batch_id === batchId.value)
})

const selectedLocation = computed(() => {
  return locationStore.locations.find(l => l.location_id === selectedBatch.value?.location_id)
})

// Add/Remove Productions
const addProduction = () => {
  productions.value.push({
    production_id: null,
    location_id: selectedBatch.value?.location_id || null,
    batch_id: batchId.value,
    category: '',
    owner: '',
    qty: null,
    date: dateParam.value,
    isNew: true
  })
}

const removeProduction = (index) => {
  if (confirm('Hapus item produksi ini?')) {
    productions.value.splice(index, 1)
=======
const isSubmitting = ref(false);

function addProduction() {
  productionList.value.push({ category: "", owner: "", quantity: 0 });
}

function removeProduction(index) {
  if (productionList.value.length > 1) {
    productionList.value.splice(index, 1);
>>>>>>> 8175f7ff635de1c79113717bf65c6b1c8a4a7f39
  }
}

// Add/Remove Sales
const addSale = () => {
  sales.value.push({
    sales_id: null,
    location_id: selectedBatch.value?.location_id || null,
    batch_id: batchId.value,
    category: '',
    qty: null,
    material_id: null,
    price: null,
    date: dateParam.value,
    isNew: true
  })
}

<<<<<<< HEAD
const removeSale = (index) => {
  if (confirm('Hapus item penjualan ini?')) {
    sales.value.splice(index, 1)
  }
}

// Filter materials by batch
const filteredMaterials = computed(() => {
  return materialStore.materials.filter(m => m.batch_id === batchId.value)
})

const handleSubmit = async () => {
  try {
    saving.value = true
    error.value = null

    // Validate
    if (productions.value.length === 0 && sales.value.length === 0) {
      throw new Error('Minimal harus ada 1 data produksi atau penjualan')
    }

    // Save productions
    for (const prod of productions.value) {
      if (!prod.category || !prod.owner || !prod.qty) continue

      const payload = {
        location_id: prod.location_id,
        batch_id: prod.batch_id,
        category: prod.category,
        owner: prod.owner,
        qty: prod.qty,
        date: prod.date
      }

      if (prod.isNew || !prod.production_id) {
        await productionStore.create(payload)
      } else {
        await productionStore.update(prod.production_id, payload)
      }
    }

    // Save sales
    for (const sale of sales.value) {
      if (!sale.category || !sale.qty || !sale.price) continue

      const payload = {
        location_id: sale.location_id,
        batch_id: sale.batch_id,
        category: sale.category,
        qty: sale.qty,
        material_id: sale.material_id,
        price: sale.price,
        date: sale.date
      }

      if (sale.isNew || !sale.sales_id) {
        await salesStore.create(payload)
      } else {
        await salesStore.update(sale.sales_id, payload)
      }
    }

    alert('✅ Laporan produksi & penjualan berhasil diperbarui!')
    router.push('/planningReportList')
  } catch (err) {
    console.error('Error updating report:', err)
    error.value = err.message
    alert('❌ Gagal memperbarui laporan: ' + err.message)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  if (confirm('Batalkan perubahan? Data yang belum disimpan akan hilang.')) {
    router.push('/planningReportList')
  }
=======
function removeSale(index) {
  if (salesList.value.length > 1) {
    salesList.value.splice(index, 1);
  }
}

async function submitReport() {
  if (!report.value.date || !report.value.location || !report.value.batch) {
    alert("⚠️ Harap isi tanggal, lokasi, dan batch terlebih dahulu!");
    return;
  }

  // cari batch yang sesuai
  const selectedBatch = batches.value.find(
    (b) => Number(b.batch_id) === Number(report.value.batch)
  );

  if (!selectedBatch) {
    alert("⚠️ Batch tidak ditemukan!");
    console.error("selectedBatch undefined:", report.value);
    return;
  }

  const locationId = selectedBatch.location_id;
  const batchId = selectedBatch.batch_id;

  console.log("✅ Lokasi ditemukan:", locationId);
  console.log("✅ Batch ditemukan:", batchId);

  isSubmitting.value = true;

  try {
    // SIMPAN DATA PRODUKSI
    for (let item of productionList.value) {
      if (!item.category || !item.owner || item.quantity <= 0) continue;

      const payload = {
        location_id: locationId,
        batch_id: batchId,
        category: item.category,
        owner: item.owner,
        qty: parseInt(item.quantity),
        date: report.value.date,
      };

      console.log("📦 Menyimpan produksi:", payload);

      const { error } = await supabase
        .from("gh_production")
        .insert([payload]);

      if (error) throw error;
    }

    // SIMPAN DATA PENJUALAN
    for (let sale of salesList.value) {
      if (!sale.category || !sale.unit || sale.quantity <= 0 || sale.price <= 0) continue;

      const payload = {
        location_id: locationId,
        batch_id: batchId,
        category: sale.category,
        qty: parseInt(sale.quantity),
        material_id: null,
        price: parseFloat(sale.price),
        date: report.value.date,
      };

      console.log("💰 Menyimpan penjualan:", payload);

      const { error } = await supabase
        .from("gh_sales")
        .insert([payload]);

      if (error) throw error;
    }

    alert("✅ Laporan berhasil disimpan ke database!");
  } catch (err) {
    console.error("❌ Error saat menyimpan:", err);
    alert(`❌ Gagal menyimpan laporan: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  report.value = { date: "", location: null, batch: null };
  productionList.value = [{ category: "", owner: "", quantity: 0 }];
  salesList.value = [{ category: "", quantity: 0, unit: "", price: 0 }];
  message.value = "";
>>>>>>> 8175f7ff635de1c79113717bf65c6b1c8a4a7f39
}
</script>


<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button 
            @click="handleCancel"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white text-lg">
                🔄
              </span>
              Edit Laporan Produksi & Penjualan
            </h1>
            <p class="text-sm text-gray-500 mt-1">Perbaiki laporan berdasarkan catatan revisi</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <!-- Revision Notice -->
      <div v-if="!loading && !error" class="mb-6">
        <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl flex-shrink-0">
              🔄
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-red-900 text-lg mb-2">Catatan Revisi</h3>
              <p class="text-red-700">{{ revisionNotes }}</p>
              <div class="mt-3 flex flex-wrap gap-4 text-sm text-red-600">
                <div><strong>Batch:</strong> {{ selectedBatch?.batch_name }}</div>
                <div><strong>Lokasi:</strong> {{ selectedLocation?.location }}</div>
                <div><strong>Tanggal:</strong> {{ dateParam }}</div>
=======
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
>>>>>>> 8175f7ff635de1c79113717bf65c6b1c8a4a7f39
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

      <!-- Form -->
      <form v-if="!loading && !error" @submit.prevent="handleSubmit" class="space-y-6">
        
        <!-- Productions Section -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span class="text-xl">🏭</span>
              Data Produksi
            </h2>
            <button
              type="button"
              @click="addProduction"
              class="px-4 py-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white font-semibold rounded-lg hover:shadow-md transition-all text-sm flex items-center gap-2"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
              </svg>
              Tambah Item
            </button>
          </div>

          <div class="space-y-4">
            <div 
              v-for="(prod, index) in productions" 
              :key="index"
              class="bg-gradient-to-r from-blue-50 to-white border-2 border-blue-100 rounded-xl p-5"
            >
              <div class="flex items-start justify-between mb-4">
                <h3 class="font-bold text-gray-700">Item #{{ index + 1 }}</h3>
                <button
                  v-if="productions.length > 1"
                  type="button"
                  @click="removeProduction(index)"
                  class="text-red-500 hover:text-red-700 transition"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Kategori <span class="text-red-500">*</span>
                  </label>
                  <select 
                    v-model="prod.category" 
                    required
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  >
                    <option value="">Pilih Kategori</option>
                    <option v-for="cat in productionCategories" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Pemilik <span class="text-red-500">*</span>
                  </label>
                  <select 
                    v-model="prod.owner" 
                    required
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  >
                    <option value="">Pilih Pemilik</option>
                    <option v-for="owner in ownerOptions" :key="owner" :value="owner">{{ owner }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Kuantitas <span class="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    v-model.number="prod.qty"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sales Section -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span class="text-xl">💰</span>
              Data Penjualan
            </h2>
            <button
              type="button"
              @click="addSale"
              class="px-4 py-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white font-semibold rounded-lg hover:shadow-md transition-all text-sm flex items-center gap-2"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
              </svg>
              Tambah Item
            </button>
          </div>

          <div class="space-y-4">
            <div 
              v-for="(sale, index) in sales" 
              :key="index"
              class="bg-gradient-to-r from-green-50 to-white border-2 border-green-100 rounded-xl p-5"
            >
              <div class="flex items-start justify-between mb-4">
                <h3 class="font-bold text-gray-700">Item #{{ index + 1 }}</h3>
                <button
                  v-if="sales.length > 1"
                  type="button"
                  @click="removeSale(index)"
                  class="text-red-500 hover:text-red-700 transition"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Kategori <span class="text-red-500">*</span>
                  </label>
                  <select 
                    v-model="sale.category" 
                    required
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  >
                    <option value="">Pilih Kategori</option>
                    <option v-for="cat in salesCategories" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Material (Opsional)
                  </label>
                  <select 
                    v-model="sale.material_id" 
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  >
                    <option :value="null">Pilih Material</option>
                    <option v-for="mat in filteredMaterials" :key="mat.material_id" :value="mat.material_id">
                      {{ mat.material_name }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Kuantitas <span class="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    v-model.number="sale.qty"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Harga <span class="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    v-model.number="sale.price"
                    required
                    min="0"
                    step="0.01"
                    placeholder="Rp 0"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  />
                </div>
              </div>

              <!-- Total -->
              <div v-if="sale.qty && sale.price" class="mt-4 pt-4 border-t-2 border-green-200">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Total Penjualan:</span>
                  <span class="text-lg font-bold text-green-600">
                    Rp {{ (sale.qty * sale.price).toLocaleString('id-ID') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            @click="handleCancel"
            class="flex-1 px-6 py-3.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            <svg v-if="saving" class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ saving ? 'Menyimpan...' : '💾 Simpan Perubahan' }}</span>
          </button>
        </div>
<<<<<<< HEAD
      </form>
=======
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
>>>>>>> 8175f7ff635de1c79113717bf65c6b1c8a4a7f39

      <!-- Footer -->
      <footer class="text-center py-10 mt-8 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>
  </div>
<<<<<<< HEAD
</template>
=======
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
>>>>>>> 8175f7ff635de1c79113717bf65c6b1c8a4a7f39
