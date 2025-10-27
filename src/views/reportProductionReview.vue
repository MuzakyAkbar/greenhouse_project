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
  <div class="min-h-screen bg-[#FFFD8F] flex flex-col items-center p-4 sm:p-6 md:p-10 rounded-2xl relative">

    <!-- Back -->
    <div class="absolute top-6 left-6">
      <RouterLink to="/reportActivityList" class="text-black text-2xl hover:text-gray-700 transition" title="Kembali ke Report List">
        <i class="fa-solid fa-arrow-left"></i>
      </RouterLink>
    </div>

    <!-- Judul -->
    <div class="flex w-full justify-center items-center mb-6 mt-6">
      <h1 class="text-3xl sm:text-4xl font-bold text-black">Review Production & Sales</h1>
    </div>

    <!-- Cards -->
    <div class="w-full max-w-3xl flex flex-col gap-6">
      <div v-for="(item, index) in productionData" :key="index" class="bg-[#4D734D] p-6 rounded-2xl shadow-md space-y-4">

        <!-- Header Tanggal & Batch -->
        <div class="flex justify-between items-center">
          <div>
            <p class="text-white font-semibold text-lg">Tanggal: {{ item.date }}</p>
            <p class="text-white font-semibold text-lg">Batch: {{ item.batch }}</p>
          </div>
          <span class="bg-yellow-400 text-black font-semibold px-3 py-1 rounded-lg">Waiting</span>
        </div>

        <!-- Produksi & Penjualan -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Produksi -->
          <div class="bg-[#B5D78D] p-4 rounded-xl">
            <p class="font-semibold mb-2">Produksi</p>
            <ul class="list-disc list-inside text-sm">
              <li v-for="(p, pi) in item.production" :key="pi">
                {{ p.category }} ({{ p.owner }}) — {{ p.quantity }}
              </li>
            </ul>
          </div>

          <!-- Penjualan -->
          <div class="bg-[#FFD580] p-4 rounded-xl">
            <p class="font-semibold mb-2">Penjualan</p>
            <ul class="list-disc list-inside text-sm">
              <li v-for="(s, si) in item.sales" :key="si">
                {{ s.category }} — {{ s.quantity }} {{ s.unit }} × Rp{{ s.price.toLocaleString() }} = 
                Rp{{ (s.quantity * s.price).toLocaleString() }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 mt-4">
          <router-link
            to="/reportActivityList"
            class="flex-1 bg-[#69A851] hover:bg-[#5B9546] text-white font-semibold py-3 rounded-lg border border-[#4D734D] transition-all text-center"
          >
            Approve
          </router-link>
          <router-link
            to="/reportActivityList"
            class="flex-1 bg-[#E8473C] hover:bg-[#D43D34] text-white font-semibold py-3 rounded-lg border border-[#A62820] transition-all text-center"
          >
            Revision
          </router-link>
        </div>

         <!-- 🔹 Footer -->
        <footer class="bg-[#FFFD8F] text-center py-6 mt-12">
          <p class="text-[#2F5320] font-semibold text-lg">
            © GREENHOUSE 2025
          </p>
        </footer>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
</style>
