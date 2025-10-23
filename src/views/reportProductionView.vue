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
  <div class="min-h-screen bg-[#FFFCA9] flex flex-col items-center relative p-6">

    <!-- Back -->
    <div class="absolute top-6 left-6">
      <RouterLink to="/reportActivitylist" class="text-black text-2xl hover:text-gray-700 transition">
        <i class="fa-solid fa-arrow-left"></i>
      </RouterLink>
    </div>

    <!-- Title -->
    <h1 class="text-[40px] font-bold text-black mb-6">Production & Sales View</h1>

    <!-- Cards Approved -->
    <div class="w-full max-w-[1250px] flex flex-col items-center space-y-6">
      <div v-for="(item, index) in productionData" :key="index" class="w-full bg-[#69A851] border-2 border-[#4C763B] text-white rounded-[15px] px-6 py-4 shadow-md">
        <div class="flex justify-between items-center mb-3">
          <div>
            <p class="font-semibold text-[16px]">Tanggal: {{ item.date }}</p>
            <p class="text-[16px]">Batch: {{ item.batch }}</p>
          </div>
          <span class="bg-green-600 text-white font-semibold px-3 py-1 rounded-lg">Approved</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Produksi -->
          <div class="bg-[#9FD88B] p-4 rounded-lg">
            <p class="font-semibold mb-2">Produksi</p>
            <ul class="list-disc list-inside text-sm">
              <li v-for="(p, pi) in item.production" :key="pi">
                {{ p.category }} ({{ p.owner }}) — {{ p.quantity }}
              </li>
            </ul>
          </div>

          <!-- Penjualan -->
          <div class="bg-[#FFE18C] p-4 rounded-lg">
            <p class="font-semibold mb-2">Penjualan</p>
            <ul class="list-disc list-inside text-sm">
              <li v-for="(s, si) in item.sales" :key="si">
                {{ s.category }} — {{ s.quantity }} {{ s.unit }} × Rp{{ s.price.toLocaleString() }} = 
                Rp{{ (s.quantity * s.price).toLocaleString() }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
</style>
