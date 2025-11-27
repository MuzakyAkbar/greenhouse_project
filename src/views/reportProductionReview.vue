<script setup>
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProductionStore } from '../stores/production'
import { useSalesStore } from '../stores/sales'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { onMounted, computed, ref } from 'vue'

const authStore = useAuthStore()
const productionStore = useProductionStore()
const salesStore = useSalesStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const router = useRouter()
const route = useRoute()

const isLoading = ref(true)
const isSubmitting = ref(false)

// 🔗 Ambil data berdasarkan QUERY
const batchId = computed(() => Number(route.query.batch_id || 0))
const locationId = computed(() => Number(route.query.location_id || 0))
const reportDate = computed(() => route.query.date || '')

// 🔍 Ambil STATUS dari production (karena 1 report 1 status)
const reportStatus = computed(() => {
  const prod = productionStore.productions.find(
    p =>
      p.batch_id === batchId.value &&
      p.location_id === locationId.value &&
      p.date === reportDate.value
  )

  return prod?.status || "Waiting"
})

const isApproved = computed(() => reportStatus.value === "approved")
const isRevision = computed(() => reportStatus.value === "needRevision")
const isWaiting = computed(() => reportStatus.value === "Waiting" || reportStatus.value === "onReview")

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  if (!batchId.value || !locationId.value || !reportDate.value) {
    alert('⚠️ Data laporan tidak lengkap')
    router.push({ name: 'planningReportList' })
    return
  }

  try {
    if (batchStore.batches.length === 0) await batchStore.getBatches()
    if (locationStore.locations.length === 0) await locationStore.fetchAll()
    await productionStore.fetchAll()
    await salesStore.fetchAll()
  } catch (e) {
    console.error('❌ Error fetching data:', e)
  } finally {
    isLoading.value = false
  }
})

const getBatchName = (id) => {
  const batch = batchStore.batches.find(b => b.batch_id === id)
  return batch?.batch_name || `Batch ${id}`
}

const getLocationName = (id) => {
  const loc = locationStore.locations.find(l => l.location_id === id)
  return loc?.location || `Location ${id}`
}

const batchName = computed(() => getBatchName(batchId.value))
const locationName = computed(() => getLocationName(locationId.value))

// PRODUKSI
const productionItems = computed(() =>
  productionStore.productions
    .filter(p =>
      p.batch_id === batchId.value &&
      p.location_id === locationId.value &&
      p.date === reportDate.value
    )
)

// SALES
const salesItems = computed(() =>
  salesStore.sales
    .filter(s =>
      s.batch_id === batchId.value &&
      s.location_id === locationId.value &&
      s.date === reportDate.value
    )
)

const totalSalesAmount = computed(() =>
  salesItems.value.reduce((sum, s) => sum + s.qty * s.price, 0)
)

// APPROVE
const handleApprove = async () => {
  if (!confirm("Yakin ingin APPROVE laporan ini?")) return;

  isSubmitting.value = true;

  try {
    await productionStore.updateStatus(batchId.value, locationId.value, reportDate.value, "approved")
    await salesStore.updateStatus(batchId.value, locationId.value, reportDate.value, "approved")

    alert("Laporan berhasil di-approve!")
    router.push({ name: "planningReportList" })

  } catch (e) {
    alert("Gagal approve laporan.")
    console.error(e)

  } finally {
    isSubmitting.value = false
  }
}

// REVISION
const handleRevision = async () => {
  if (!confirm("Yakin ingin meminta revisi laporan ini?")) return;

  isSubmitting.value = true;

  try {
    await productionStore.updateStatus(batchId.value, locationId.value, reportDate.value, "needRevision")
    await salesStore.updateStatus(batchId.value, locationId.value, reportDate.value, "needRevision")

    alert("Laporan berhasil dikirim revisi!")
    router.push({ name: "planningReportList" })

  } catch (e) {
    alert("Gagal mengirim revisi.")
    console.error(e)

  } finally {
    isSubmitting.value = false
  }
}
</script>
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">

          <RouterLink
            :to="{ name: 'planningReportList' }"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H109.3l105.3-105.4c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </RouterLink>

          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center text-white text-lg">
                ⏳
              </span>
              Review Production & Sales
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">
              {{ batchName }} • {{ locationName }} • {{ reportDate }}
            </p>
          </div>

        </div>
      </div>
    </div>

    <!-- Main -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data laporan...</p>
        </div>
      </div>

      <div v-else>
        <!-- DETAIL REPORT -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Detail Laporan Produksi & Penjualan
          </h2>

          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">

            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-gray-100">

              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">📊</div>
                <div>
                  <p class="font-bold text-gray-900 text-lg">{{ batchName }}</p>
                  <p class="text-sm text-gray-500">{{ reportDate }} • {{ locationName }}</p>
                </div>
              </div>

              <!-- STATUS BADGE -->
              <span
                v-if="isWaiting"
                class="text-xs font-bold px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800"
              >
                ⏳ Waiting for Review
              </span>

              <span
                v-else-if="isApproved"
                class="text-xs font-bold px-4 py-2 rounded-lg bg-green-100 text-green-800"
              >
                ✅ Approved
              </span>

              <span
                v-else-if="isRevision"
                class="text-xs font-bold px-4 py-2 rounded-lg bg-red-100 text-red-800"
              >
                🔄 Need Revision
              </span>

            </div>

            <!-- Content Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

              <!-- Production -->
              <div class="bg-gradient-to-br from-[#0071f3] to-[#0060d1] text-white p-5 rounded-xl">
                <p class="font-bold text-base mb-4 flex items-center gap-2">
                  <span class="text-xl">🏭</span> Produksi
                </p>

                <ul v-if="productionItems.length > 0" class="space-y-3">
                  <li v-for="(p, pi) in productionItems" :key="pi" class="text-sm bg-white/10 rounded-lg p-3">
                    <div class="flex justify-between items-center">
                      <span>{{ p.category }}</span>
                      <span class="font-bold text-lg">{{ p.qty }}</span>
                    </div>
                    <p class="text-xs opacity-75 mt-1">Kepemilikan: {{ p.owner }}</p>
                  </li>
                </ul>

                <p v-else class="text-sm opacity-75 text-center py-4">Tidak ada data produksi</p>
              </div>

              <!-- Sales -->
              <div class="bg-gradient-to-br from-green-500 to-green-700 text-white p-5 rounded-xl">
                <p class="font-bold text-base mb-4 flex items-center gap-2">
                  <span class="text-xl">💰</span> Penjualan
                </p>

                <ul v-if="salesItems.length > 0" class="space-y-3">
                  <li v-for="(s, si) in salesItems" :key="si" class="text-sm bg-white/10 rounded-lg p-3">

                    <div class="flex justify-between items-center mb-1">
                      <span>{{ s.category }}</span>
                      <span class="font-bold">{{ s.qty }}</span>
                    </div>

                    <div class="flex justify-between items-center text-xs opacity-90">
                      <span>@ Rp{{ s.price.toLocaleString('id-ID') }}</span>
                      <span class="font-bold text-base">Rp{{ (s.qty * s.price).toLocaleString('id-ID') }}</span>
                    </div>

                  </li>
                </ul>

                <p v-else class="text-sm opacity-75 text-center py-4">Tidak ada data penjualan</p>

                <div class="mt-4 pt-3 border-t border-white/20">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold">Total Penjualan:</span>
                    <span class="font-bold text-lg">Rp{{ totalSalesAmount.toLocaleString('id-ID') }}</span>
                  </div>
                </div>

              </div>

            </div>

            <!-- Review Action Buttons -->
            <div
              v-if="isWaiting"
              class="bg-gray-50 rounded-xl p-5"
            >
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Review Action</h3>

              <div class="flex flex-col sm:flex-row gap-4">

                <!-- APPROVE -->
                <button
                  @click="handleApprove"
                  :disabled="isSubmitting"
                  class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path fill="currentColor" d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4z"/>
                  </svg>
                  Approve
                </button>

                <!-- REVISION -->
                <button
                  @click="handleRevision"
                  :disabled="isSubmitting"
                  class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path fill="currentColor" d="M142.9 142.9c-17.5 17.5-30.1 38-37.8 59.8c-5.9 16.7-24.2 25.4-40.8 19.5s-25.4-24.2-19.5-40.8c10.8-30.6 28.4-59.3 52.9-83.8c87.2-87.2 228.3-87.5 315.8-1L455 55c6.9-6.9 17.2-8.9 26.2-5.2s14.8 12.5 14.8 22.2v128c0 13.3-10.7 24-24 24H344c-9.7 0-18.5-5.8-22.2-14.8s-1.7-19.3 5.2-26.2l41.1-41.1c-62.6-61.5-163.1-61.2-225.3 1z"/>
                  </svg>
                  Request Revision
                </button>

              </div>
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
  </div>
</template>
<style scoped>
.ml-13 {
  margin-left: 3.25rem;
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}

/* ---- STATUS BADGES ---- */
.status-badge {
  @apply text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap;
}

.status-waiting {
  @apply bg-yellow-100 text-yellow-800;
}

.status-approved {
  @apply bg-green-100 text-green-800;
}

.status-revision {
  @apply bg-red-100 text-red-800;
}

/* ---- Review Section when approved/revision ---- */
.status-box {
  @apply bg-gray-50 border border-gray-200 rounded-xl p-5 text-center;
}

.status-icon {
  font-size: 34px;
  display: block;
  margin-bottom: 10px;
}
</style>
