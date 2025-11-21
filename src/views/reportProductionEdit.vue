<script setup>
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

const batchId = ref(parseInt(route.params.batchId))
const dateParam = ref(route.params.date)
const loading = ref(true)
const saving = ref(false)
const error = ref(null)

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
              </div>
            </div>
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
      </form>

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
</template>