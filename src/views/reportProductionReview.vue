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

// Dummy data produksi & penjualan (status Waiting)
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
  {
    date: '2025-10-24',
    batch: 'Batch 2',
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
        <div class="flex items-center gap-4">
          <RouterLink
            to="/reportActivityList"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </RouterLink>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center text-white text-lg">
                ⏳
              </span>
              Review Production & Sales
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Tinjau & Approve Laporan Produksi & Penjualan</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Reports Section -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Laporan Pending Review ({{ productionData.length }})
        </h2>
        <div class="space-y-6">
          <div 
            v-for="(item, index) in productionData" 
            :key="index" 
            class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all p-6"
          >
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
              <span class="bg-yellow-100 text-yellow-800 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/>
                </svg>
                Waiting for Review
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

            <!-- Action Buttons -->
            <div class="bg-gray-50 rounded-xl p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Review Action</h3>
              <div class="flex flex-col sm:flex-row gap-4">
                <router-link
                  to="/reportActivityList"
                  class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
                  </svg>
                  Approve
                </router-link>

                <router-link
                  to="/reportActivityList"
                  class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                    <path d="M142.9 142.9c-17.5 17.5-30.1 38-37.8 59.8c-5.9 16.7-24.2 25.4-40.8 19.5s-25.4-24.2-19.5-40.8C55.6 150.7 73.2 122 97.6 97.6c87.2-87.2 228.3-87.5 315.8-1L455 55c6.9-6.9 17.2-8.9 26.2-5.2s14.8 12.5 14.8 22.2l0 128c0 13.3-10.7 24-24 24l-8.4 0c0 0 0 0 0 0L344 224c-9.7 0-18.5-5.8-22.2-14.8s-1.7-19.3 5.2-26.2l41.1-41.1c-62.6-61.5-163.1-61.2-225.3 1zM16 312c0-13.3 10.7-24 24-24l7.6 0 .7 0L168 288c9.7 0 18.5 5.8 22.2 14.8s1.7 19.3-5.2 26.2l-41.1 41.1c62.6 61.5 163.1 61.2 225.3-1c17.5-17.5 30.1-38 37.8-59.8c5.9-16.7 24.2-25.4 40.8-19.5s25.4 24.2 19.5 40.8c-10.8 30.6-28.4 59.3-52.9 83.8c-87.2 87.2-228.3 87.5-315.8 1L57 457c-6.9 6.9-17.2 8.9-26.2 5.2S16 449.7 16 440l0-119.6 0-.7 0-7.6z"/>
                  </svg>
                  Request Revision
                </router-link>
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
</style>