
<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { onMounted, ref } from 'vue'

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.push('/')
  }
})

// Dummy data approved
const productionData = ref([
  {
    date: '2025-10-23',
    batch: 'Batch 1',
    production: [
      { category: 'Planlet G0', owner: 'Petani', quantity: 100 },
      { category: 'Planlet G1', owner: 'Mitra', quantity: 50 },
    ],
    sales: [
      { category: 'Planlet G0', quantity: 30, unit: 'perkg', price: 20000 },
      { category: 'Planlet G1', quantity: 20, unit: 'perkg', price: 25000 },
    ],
  },
])
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
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
              View Production & Sales
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Laporan Produksi & Penjualan yang Telah Disetujui</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Status Badge -->
      <div class="mb-8 flex justify-center">
        <div class="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-xl font-bold text-base shadow-sm">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
            <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
          </svg>
          Approved Reports
        </div>
      </div>

      <!-- Reports Section -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Laporan yang Disetujui ({{ productionData.length }})
        </h2>
        <div class="space-y-6">
          <div 
            v-for="(item, index) in productionData" 
            :key="index" 
            class="bg-white rounded-2xl border-2 border-green-200 shadow-sm hover:shadow-lg transition-all p-6"
          >
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b-2 border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center text-white text-lg">
                  📊
                </div>
                <div>
                  <p class="font-bold text-gray-900 text-lg">{{ item.batch }}</p>
                  <p class="text-sm text-gray-500">{{ item.date }}</p>
                </div>
              </div>
              <span class="bg-green-100 text-green-800 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
                </svg>
                Approved
              </span>
            </div>

            <!-- Content Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
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
                    <p class="text-xs opacity-75 mt-1">Kepemilikan: {{ p.owner }}</p>
                  </li>
                </ul>
                <div class="mt-4 pt-3 border-t border-white/20">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold">Total Produksi:</span>
                    <span class="font-bold text-lg">
                      {{ item.production.reduce((sum, p) => sum + p.quantity, 0) }} unit
                    </span>
                  </div>
                </div>
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
                <div class="mt-4 pt-3 border-t border-white/20">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold">Total Penjualan:</span>
                    <span class="font-bold text-lg">
                      Rp{{ item.sales.reduce((sum, s) => sum + (s.quantity * s.price), 0).toLocaleString() }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Summary Stats -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div class="bg-blue-50 rounded-xl p-4 text-center border-2 border-blue-100">
                <p class="text-xs text-blue-600 font-semibold mb-1">Total Item Produksi</p>
                <p class="text-2xl font-bold text-blue-900">
                  {{ item.production.reduce((sum, p) => sum + p.quantity, 0) }}
                </p>
              </div>
              <div class="bg-green-50 rounded-xl p-4 text-center border-2 border-green-100">
                <p class="text-xs text-green-600 font-semibold mb-1">Total Item Terjual</p>
                <p class="text-2xl font-bold text-green-900">
                  {{ item.sales.reduce((sum, s) => sum + s.quantity, 0) }}
                </p>
              </div>
              <div class="bg-yellow-50 rounded-xl p-4 text-center border-2 border-yellow-100">
                <p class="text-xs text-yellow-600 font-semibold mb-1">Revenue</p>
                <p class="text-xl font-bold text-yellow-900">
                  Rp{{ (item.sales.reduce((sum, s) => sum + (s.quantity * s.price), 0) / 1000).toFixed(0) }}K
                </p>
              </div>
            </div>

            <!-- Approval Info -->
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-5">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white text-2xl flex-shrink-0">
                  ✓
                </div>
                <div class="flex-1">
                  <p class="font-bold text-green-900 text-base mb-1">Laporan Telah Disetujui</p>
                  <p class="text-sm text-green-700">
                    Disetujui oleh: <span class="font-semibold">Admin GreenHouse</span>
                  </p>
                  <p class="text-sm text-green-700">
                    Tanggal approval: <span class="font-semibold">{{ item.date }} - 14:30 WIB</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="flex justify-center mb-8">
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
</style>
