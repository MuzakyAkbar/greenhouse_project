<script setup>
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { onMounted, ref, computed } from 'vue'
import { supabase } from '../lib/supabase' // Import Supabase

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const batchStore = useBatchStore()
const locationStore = useLocationStore()

// ✅ Mengambil record_id dari route params
const record_id = ref(route.params.record_id || null)

const loading = ref(true)
const error = ref(null)

// Data Utama
const productionData = ref([])
const salesData = ref([])
const baseReportInfo = ref(null) // Menyimpan info dasar (location, batch, date, overall_status)

// Helper: Format Number
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0'
  return 'Rp ' + Number(value).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

// Helper: Get Location/Batch Name
const getLocationName = (locationId) => {
  const location = locationStore.locations.find(l => l.location_id == locationId)
  return location?.location || `Location ${locationId}`
}

const getBatchName = (batchId) => {
  const batch = batchStore.batches.find(b => b.batch_id == batchId)
  return batch?.batch_name || `Batch ${batchId}`
}

// Helper: Format Date
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
}


onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }
  if (!record_id.value) {
    alert('⚠️ Approval Record ID tidak ditemukan')
    router.push('/planningReportList')
    return
  }

  await loadData()
})

const loadData = async () => {
  try {
    loading.value = true
    
    // Fetch all reference data
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll(),
    ])

    // 1. Ambil Approval Record & cek status
    const { data: record, error: recordErr } = await supabase
        .from('gh_approve_record')
        .select('*, completed_at')
        .eq('record_id', record_id.value)
        .single();

    if (recordErr) throw recordErr;
    if (!record) throw new Error('Approval Record tidak ditemukan');

    if (record.overall_status !== 'approved') {
        alert(`⚠️ Laporan ini belum disetujui. Status saat ini: ${record.overall_status}`);
        router.replace('/planningReportList');
        return;
    }
    
    // 2. Ambil Production & Sales Data
    const { data: production, error: prodErr } = await supabase
        .from('gh_production')
        .select('*')
        .eq('approval_record_id', record_id.value);
    if (prodErr) throw prodErr;
    productionData.value = production;

    const { data: salesResult, error: salesErr } = await supabase
        .from('gh_sales')
        .select('*')
        .eq('approval_record_id', record_id.value);
        
    if (salesErr) throw salesErr;
    salesData.value = salesResult;

    // Tentukan info dasar report (location, batch, date) dari salah satu item (asumsi sama semua)
    let firstItem = productionData.value[0] || salesData.value[0];
    if (firstItem) {
        baseReportInfo.value = {
            location_id: firstItem.location_id,
            batch_id: firstItem.batch_id,
            report_date: firstItem.date,
            overall_status: record.overall_status,
            approved_at: record.completed_at,
            location_name: getLocationName(firstItem.location_id),
            batch_name: getBatchName(firstItem.batch_id),
        };
    } else {
        throw new Error('Tidak ada data Production maupun Sales terkait record ini.');
    }

  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err.message
    alert('❌ Gagal memuat data: ' + err.message)
    router.replace('/planningReportList')
  } finally {
    loading.value = false
  }
}

// Computed properties
const totalProductionQty = computed(() => {
  return productionData.value.reduce((sum, p) => sum + p.qty, 0)
})

const totalSalesQty = computed(() => {
  return salesData.value.reduce((sum, s) => sum + s.qty, 0)
})

const totalSalesValue = computed(() => {
  return salesData.value.reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0)
})

</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <RouterLink
            to="/planningReportList"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </RouterLink>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center text-white text-lg">
                ✅
              </span>
              Detail Laporan Produksi & Penjualan
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Report ID: #{{ record_id }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data laporan...</p>
        </div>
      </div>

      <div v-else-if="error" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <div v-else-if="baseReportInfo" class="mb-8">
        
        <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📍 Lokasi</p>
                <p class="text-lg font-bold text-gray-900">{{ baseReportInfo.location_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">🏷️ Batch</p>
                <p class="text-lg font-bold text-gray-900">{{ baseReportInfo.batch_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📅 Tanggal Laporan</p>
                <p class="text-lg font-bold text-gray-900">{{ formatDate(baseReportInfo.report_date) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">✅ Disetujui Pada</p>
                <p class="text-lg font-bold text-green-700">{{ formatDate(baseReportInfo.approved_at) }}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t-2 border-green-200">
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">🏭 Total Produksi</p>
                <span class="text-2xl font-bold text-gray-900">{{ totalProductionQty.toLocaleString('id-ID') }}</span>
              </div>
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">💰 Total Penjualan</p>
                <span class="text-2xl font-bold text-gray-900">{{ totalSalesQty.toLocaleString('id-ID') }}</span>
              </div>
              <div class="bg-white rounded-lg p-4 border-2 border-blue-100">
                <p class="text-sm text-blue-600 font-semibold mb-2">💵 Total Revenue</p>
                <span class="text-2xl font-bold text-blue-700">
                    {{ formatCurrency(totalSalesValue) }}
                </span>
              </div>
            </div>
        </div>

        <div class="space-y-6">
          
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6" v-if="productionData.length > 0">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-xl">🏭</span>
              Detail Produksi ({{ productionData.length }})
            </h2>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="border-b-2 border-gray-200 bg-gray-50">
                    <th class="text-left py-3 px-4 font-bold text-gray-700">No.</th>
                    <th class="text-left py-3 px-4 font-bold text-gray-700">Kategori</th>
                    <th class="text-left py-3 px-4 font-bold text-gray-700">Kepemilikan</th>
                    <th class="text-right py-3 px-4 font-bold text-gray-700">Kuantitas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                      v-for="(prod, index) in productionData" 
                      :key="prod.production_id" 
                      class="border-b border-gray-100 hover:bg-blue-50 transition"
                  >
                      <td class="py-3 px-4 text-gray-600">{{ index + 1 }}</td>
                      <td class="py-3 px-4 font-medium text-gray-900">{{ prod.category }}</td>
                      <td class="py-3 px-4 text-gray-700">{{ prod.owner }}</td>
                      <td class="py-3 px-4 text-right font-bold text-gray-900">{{ prod.qty.toLocaleString('id-ID') }}</td>
                  </tr>
                </tbody>
                <tfoot>
                    <tr class="border-t-2 border-gray-300 bg-gray-50">
                        <td colspan="3" class="py-3 px-4 text-right font-bold text-gray-700">Total:</td>
                        <td class="py-3 px-4 text-right font-bold text-gray-900 text-base">
                            {{ totalProductionQty.toLocaleString('id-ID') }}
                        </td>
                    </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6" v-if="salesData.length > 0">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-xl">💰</span>
              Detail Penjualan ({{ salesData.length }})
            </h2>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                    <tr class="border-b-2 border-gray-200 bg-gray-50">
                        <th class="text-left py-3 px-4 font-bold text-gray-700">No.</th>
                        <th class="text-left py-3 px-4 font-bold text-gray-700">Kategori</th>
                        <th class="text-right py-3 px-4 font-bold text-gray-700">Kuantitas</th>
                        <th class="text-center py-3 px-4 font-bold text-gray-700">Satuan</th>
                        <th class="text-right py-3 px-4 font-bold text-gray-700">Harga Satuan</th>
                        <th class="text-right py-3 px-4 font-bold text-gray-700">Total Harga</th>
                    </tr>
                </thead>
                <tbody>
                    <tr 
                        v-for="(sale, index) in salesData" 
                        :key="sale.sales_id" 
                        class="border-b border-gray-100 hover:bg-blue-50 transition"
                    >
                        <td class="py-3 px-4 text-gray-600">{{ index + 1 }}</td>
                        <td class="py-3 px-4 font-medium text-gray-900">{{ sale.category }}</td>
                        <td class="py-3 px-4 text-right font-bold text-gray-900">{{ sale.qty.toLocaleString('id-ID') }}</td>
                        <td class="py-3 px-4 text-center text-gray-700">{{ sale.unit || '-' }}</td>
                        <td class="py-3 px-4 text-right text-gray-700">{{ formatCurrency(sale.price) }}</td>
                        <td class="py-3 px-4 text-right font-bold text-green-700">
                          {{ formatCurrency(Number(sale.qty) * Number(sale.price)) }}
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr class="border-t-2 border-gray-300 bg-gray-50">
                        <td colspan="5" class="py-3 px-4 text-right font-bold text-gray-700">Grand Total Penjualan:</td>
                        <td class="py-3 px-4 text-right font-bold text-green-700 text-base">
                            {{ formatCurrency(totalSalesValue) }}
                        </td>
                    </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div v-else class="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
              <p class="font-bold text-yellow-900">Tidak Ada Item</p>
              <p class="text-sm text-yellow-700">Laporan ini tidak memiliki data Production maupun Sales.</p>
          </div>
        </div>

      </div>
      
      <div class="flex justify-center mb-8 mt-8">
        <router-link
          to="/planningReportList"
          class="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3 rounded-xl border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
            <path d="M40 48C26.7 48 16 58.7 16 72l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24L40 48zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM16 232l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0z"/>
          </svg>
          Kembali ke List
        </router-link>
      </div>

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

<style scoped>
.ml-13 {
  /* Match the 4rem from w-10+gap-3 in header */
  margin-left: calc(2.5rem + 0.75rem); 
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}
</style>