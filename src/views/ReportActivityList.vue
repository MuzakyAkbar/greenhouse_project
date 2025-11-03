<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { onMounted, ref } from 'vue'

const authStore = useAuthStore()
const router = useRouter()

// Toggle state untuk memilih report
const selectedReport = ref('activity') // 'activity' atau 'production'

onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.push('/')
  }
})

// Dummy data untuk Report Activity
const activityReports = ref([
  { date: '2025-10-23', location: 'Lokasi A', batch: 'Batch 1', coa: 'CoA 001', activity: 'Pekerjaan A', status: 'Waiting' },
  { date: '2025-10-23', location: 'Lokasi B', batch: 'Batch 2', coa: 'CoA 002', activity: 'Pekerjaan B', status: 'Approved' },
  { date: '2025-10-24', location: 'Lokasi C', batch: 'Batch 3', coa: 'CoA 003', activity: 'Pekerjaan C', status: 'Revision' },
])

// Dummy data untuk Report Production & Sales
const productionSalesList = ref([
  {
    date: '2025-10-23',
    batch: 'Batch 1',
    status: 'Waiting',
    production: [
      { category: 'Planlet G0', owner: 'Petani', quantity: 100 },
      { category: 'Planlet G1', owner: 'Mitra', quantity: 50 },
    ],
    sales: [
      { category: 'Planlet G0', quantity: 30, unit: 'perkg', price: 20000 },
      { category: 'Planlet G1', quantity: 20, unit: 'perkg', price: 25000 },
    ],
  },
  {
    date: '2025-10-24',
    batch: 'Batch 2',
    status: 'Approved',
    production: [
      { category: 'Planlet G0', owner: 'Petani', quantity: 80 },
      { category: 'Planlet G1', owner: 'Mitra', quantity: 40 },
    ],
    sales: [
      { category: 'Planlet G0', quantity: 50, unit: 'perkg', price: 20000 },
      { category: 'Planlet G1', quantity: 10, unit: 'perkg', price: 25000 },
    ],
  },
])
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <RouterLink 
              to="/dashboard"
              class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </RouterLink>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                  📊
                </span>
                Report List GreenHouse
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Laporan Aktivitas & Produksi</p>
            </div>
          </div>

          <!-- Toggle Buttons Desktop -->
          <div class="hidden md:flex gap-3">
            <button 
              @click="selectedReport = 'activity'"
              :class="selectedReport === 'activity' 
                ? 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white shadow-md' 
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0071f3]'"
              class="px-5 py-2.5 rounded-lg font-semibold transition-all text-sm hover:shadow"
            >
              📋 Activity
            </button>
            <button 
              @click="selectedReport = 'production'"
              :class="selectedReport === 'production' 
                ? 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white shadow-md' 
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0071f3]'"
              class="px-5 py-2.5 rounded-lg font-semibold transition-all text-sm hover:shadow"
            >
              📈 Production & Sales
            </button>
          </div>
        </div>

        <!-- Toggle Buttons Mobile -->
        <div class="flex md:hidden gap-3 mt-4">
          <button 
            @click="selectedReport = 'activity'"
            :class="selectedReport === 'activity' 
              ? 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white shadow-md' 
              : 'bg-white text-gray-700 border-2 border-gray-200'"
            class="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm"
          >
            📋 Activity
          </button>
          <button 
            @click="selectedReport = 'production'"
            :class="selectedReport === 'production' 
              ? 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white shadow-md' 
              : 'bg-white text-gray-700 border-2 border-gray-200'"
            class="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm"
          >
            📈 Production
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Report Activity List -->
      <div v-if="selectedReport === 'activity'">
        <!-- Filter & Action Bar -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter & Actions</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-5">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <!-- Date Filter -->
              <div class="flex items-center gap-3">
                <label class="text-sm font-semibold text-gray-700">Filter Tanggal:</label>
                <div class="flex items-center gap-2 px-4 py-2 border-2 border-[#0071f3] rounded-lg bg-gray-50">
                  <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                  </svg>
                  <input type="date" class="outline-none text-gray-700 bg-transparent font-medium" />
                </div>
              </div>

              <!-- Add New Button -->
              <router-link 
                to="/formReportActivity"
                class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
                </svg>
                Tambah Laporan Baru
              </router-link>
            </div>
          </div>
        </div>

        <!-- Activity Reports -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Laporan Aktivitas ({{ activityReports.length }})
          </h2>
          <div class="grid grid-cols-1 gap-5">
            <RouterLink 
              v-for="(report, index) in activityReports" 
              :key="index"
              :to="{
                Waiting: '/reportActivityReview',
                Approved: '/reportActivityView',
                Revision: '/formReportActivity'
              }[report.status]"
              class="group"
            >
              <div 
                class="bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] shadow-sm hover:shadow-xl transition-all p-6 transform hover:-translate-y-1"
              >
                <div class="flex flex-col md:flex-row justify-between md:items-start gap-4">
                  <div class="flex-1 space-y-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0">
                        📋
                      </div>
                      <div>
                        <p class="font-bold text-gray-900 text-lg">{{ report.activity }}</p>
                        <p class="text-sm text-gray-500">{{ report.coa }}</p>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                      <div class="bg-gray-50 rounded-lg p-3">
                        <p class="text-xs text-gray-500 font-semibold mb-1">Tanggal</p>
                        <p class="text-sm font-bold text-gray-900">{{ report.date }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-3">
                        <p class="text-xs text-gray-500 font-semibold mb-1">Lokasi</p>
                        <p class="text-sm font-bold text-gray-900">{{ report.location }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-3">
                        <p class="text-xs text-gray-500 font-semibold mb-1">Batch</p>
                        <p class="text-sm font-bold text-gray-900">{{ report.batch }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col items-end gap-3">
                    <span 
                      class="text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap"
                      :class="{
                        'bg-yellow-100 text-yellow-800': report.status === 'Waiting',
                        'bg-green-100 text-green-800': report.status === 'Approved',
                        'bg-red-100 text-red-800': report.status === 'Revision'
                      }"
                    >
                      {{ report.status === 'Waiting' ? '⏳ Waiting Review' : report.status === 'Approved' ? '✅ Approved' : '🔄 Revision' }}
                    </span>
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-[#0071f3] transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor">
                      <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Report Production & Sales List -->
      <div v-if="selectedReport === 'production'">
        <!-- Filter Bar -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-5">
            <div class="flex items-center gap-3">
              <label class="text-sm font-semibold text-gray-700">Filter Tanggal:</label>
              <div class="flex items-center gap-2 px-4 py-2 border-2 border-[#0071f3] rounded-lg bg-gray-50">
                <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                </svg>
                <input type="date" class="outline-none text-gray-700 bg-transparent font-medium" />
              </div>
            </div>
          </div>
        </div>

        <!-- Production & Sales Reports -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Laporan Produksi & Penjualan ({{ productionSalesList.length }})
          </h2>
          <div class="grid grid-cols-1 gap-6">
            <RouterLink 
              v-for="(item, index) in productionSalesList" 
              :key="index"
              :to="{
                Waiting: '/reportProductionReview',
                Approved: '/reportProductionView',
                Revision: '/reportProductionReview'
              }[item.status]"
              class="group"
            >
              <div class="bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] shadow-sm hover:shadow-xl transition-all p-6 transform hover:-translate-y-1">
                <!-- Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b-2 border-gray-100">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                      📊
                    </div>
                    <div>
                      <p class="font-bold text-gray-900 text-lg">{{ item.batch }}</p>
                      <p class="text-sm text-gray-500">{{ item.date }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span 
                      class="text-xs font-bold px-4 py-2 rounded-lg"
                      :class="{
                        'bg-yellow-100 text-yellow-800': item.status === 'Waiting',
                        'bg-green-100 text-green-800': item.status === 'Approved',
                        'bg-red-100 text-red-800': item.status === 'Revision'
                      }"
                    >
                      {{ item.status === 'Waiting' ? '⏳ Waiting' : item.status === 'Approved' ? '✅ Approved' : '🔄 Revision' }}
                    </span>
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-[#0071f3] transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor">
                      <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/>
                    </svg>
                  </div>
                </div>

                <!-- Content Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <!-- Produksi -->
                  <div class="bg-gradient-to-br from-[#0071f3] to-[#0060d1] text-white p-5 rounded-xl">
                    <p class="font-bold text-base mb-4 flex items-center gap-2">
                      <span class="text-xl">🏭</span>
                      Produksi
                    </p>
                    <ul class="space-y-3">
                      <li v-for="(p, pi) in item.production" :key="pi" class="text-sm bg-white/10 rounded-lg p-3">
                        <div class="flex justify-between items-center">
                          <span>{{ p.category }}</span>
                          <span class="font-bold text-lg">{{ p.quantity }}</span>
                        </div>
                        <p class="text-xs opacity-75 mt-1">{{ p.owner }}</p>
                      </li>
                    </ul>
                  </div>

                  <!-- Penjualan -->
                  <div class="bg-gradient-to-br from-[#8FABD4] to-[#7a9bc4] text-white p-5 rounded-xl">
                    <p class="font-bold text-base mb-4 flex items-center gap-2">
                      <span class="text-xl">💰</span>
                      Penjualan
                    </p>
                    <ul class="space-y-3">
                      <li v-for="(s, si) in item.sales" :key="si" class="text-sm bg-white/10 rounded-lg p-3">
                        <div class="flex justify-between items-center mb-1">
                          <span>{{ s.category }}</span>
                          <span class="font-bold">{{ s.quantity }} {{ s.unit }}</span>
                        </div>
                        <div class="flex justify-between items-center text-xs opacity-90">
                          <span>@ Rp{{ s.price.toLocaleString() }}</span>
                          <span class="font-bold text-base">Rp{{ (s.quantity * s.price).toLocaleString() }}</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </RouterLink>
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
@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}
</style>