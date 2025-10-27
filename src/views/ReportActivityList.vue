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
    status: 'Waiting', // Waiting / Approved / Revision
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
  <div class="min-h-screen bg-[#FFFD8F] mx-auto flex flex-col items-center relative p-6">

    <!-- Tombol Back ke Dashboard -->
    <div class="absolute top-6 left-6">
      <RouterLink to="/dashboard" class="text-black text-2xl hover:text-gray-700 transition" title="Kembali ke Dashboard">
        <i class="fa-solid fa-arrow-left"></i>
      </RouterLink>
    </div>

    <!-- Judul -->
    <h1 class="text-[40px] font-bold text-black text-center mb-6">Report</h1>

    <!-- Toggle Buttons -->
    <div class="flex gap-4 mb-6">
      <button @click="selectedReport = 'activity'"
        :class="selectedReport === 'activity' ? 'bg-[#4D734D] text-white' : 'bg-white text-black border border-black'"
        class="px-6 py-2 rounded-lg font-semibold transition">
        Report Activity
      </button>
      <button @click="selectedReport = 'production'"
        :class="selectedReport === 'production' ? 'bg-[#4D734D] text-white' : 'bg-white text-black border border-black'"
        class="px-6 py-2 rounded-lg font-semibold transition">
        Report Production & Sales
      </button>
    </div>

    <!-- Report Activity List -->
    <div v-if="selectedReport === 'activity'" class="w-full max-w-[1250px] flex flex-col items-center">
      <!-- Filter Tanggal -->
      <div class="w-full flex justify-start mb-6">
        <div class="flex items-center gap-3 bg-white border-2 border-black rounded-lg px-4 py-2">
          <input type="date" class="outline-none text-gray-700" />
        </div>
      </div>

      <!-- Activity Cards -->
      <div v-for="(report, index) in activityReports" :key="index" class="w-full px-6">
        <RouterLink :to="{
          Waiting: '/reportActivityReview',
          Approved: '/reportActivityView',
          Revision: '/formReportActivity'
        }[report.status]">
          <div class="w-full h-[120px] rounded-[15px] px-[20px] py-[14px] mb-6 flex flex-col justify-between transition hover:shadow-md"
            :class="{
              'bg-white border-2 border-black text-black': report.status === 'Waiting',
              'bg-[#69A851] border-2 border-[#4C763B] text-white': report.status === 'Approved',
              'bg-[#E8473C] border-2 border-[#9B0F0F] text-white': report.status === 'Revision'
            }">
            <div class="flex justify-between items-start">
              <div class="text-left">
                <p class="font-semibold text-[16px]">Tanggal: {{ report.date }}</p>
                <p class="text-[16px]">Lokasi: {{ report.location }}</p>
                <p class="text-[16px]">Batch: {{ report.batch }}</p>
                <p class="text-[16px]">CoA - Activity: {{ report.coa }} - {{ report.activity }}</p>
              </div>
              <span class="text-[16px] font-medium">
                {{ report.status === 'Waiting' ? 'Waiting for review' : report.status }}
              </span>
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- Tombol Form Baru -->
      <div class="w-full flex justify-end mb-6">
        <router-link to="/formReportActivity"
          class="bg-[#B0CE88] hover:bg-[#A1C77D] text-black font-semibold text-[16px] px-[24px] py-[8px] rounded-[15px] border-2 border-[#4C763B] transition-all">
          + Form
        </router-link>
      </div>
    </div>

    <!-- Report Production & Sales List -->
    <div v-if="selectedReport === 'production'" class="w-full max-w-[1250px] flex flex-col items-center">
      <!-- Tanggal Filter -->
      <div class="w-full flex justify-start mb-6">
        <div class="flex items-center gap-3 bg-white border-2 border-black rounded-lg px-4 py-2">
          <input type="date" class="outline-none text-gray-700" />
        </div>
      </div>

      <!-- Production & Sales Cards -->
      <div v-for="(item, index) in productionSalesList" :key="index" class="w-full px-6">
        <RouterLink :to="{
          Waiting: '/reportProductionReview',
          Approved: '/reportProductionView',
          Revision: '/reportProductionReview'
        }[item.status]">
          <div class="w-full bg-white border-2 border-black rounded-[15px] px-[20px] py-[14px] mb-6 shadow-md">
            <div class="flex justify-between items-center mb-3">
              <div>
                <p class="font-semibold text-[16px]">Tanggal: {{ item.date }}</p>
                <p class="text-[16px]">Batch: {{ item.batch }}</p>
                <p class="text-[16px] font-semibold">Status: {{ item.status }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Produksi -->
              <div class="bg-[#B5D78D] p-3 rounded-lg">
                <p class="font-semibold mb-2">Produksi</p>
                <ul class="text-sm list-disc list-inside">
                  <li v-for="(p, pi) in item.production" :key="pi">
                    {{ p.category }} ({{ p.owner }}) — {{ p.quantity }}
                  </li>
                </ul>
              </div>

              <!-- Penjualan -->
              <div class="bg-[#FFD580] p-3 rounded-lg">
                <p class="font-semibold mb-2">Penjualan</p>
                <ul class="text-sm list-disc list-inside">
                  <li v-for="(s, si) in item.sales" :key="si">
                    {{ s.category }} — {{ s.quantity }} {{ s.unit }} × Rp{{ s.price.toLocaleString() }} = 
                    Rp{{ (s.quantity * s.price).toLocaleString() }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
     <!-- 🔹 Footer -->
    <footer class="bg-[#FFFD8F] text-center py-6 mt-12">
      <p class="text-[#2F5320] font-semibold text-lg">
        © GREENHOUSE 2025
      </p>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

@media (max-width: 640px) {
  .text-left p {
    font-size: 0.9rem;
  }
}
</style>
