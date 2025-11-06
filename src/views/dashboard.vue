<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ModalView from '../components/ModalView.vue'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  PieController,
  ArcElement,
  Tooltip,
  Legend,
  BarController,
  BarElement,
} from 'chart.js'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  PieController,
  ArcElement,
  Tooltip,
  Legend,
  BarController,
  BarElement,
)

import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const isOpen = ref(false)

const openModal = () => {
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

const logout = async () => {
  const is_validate = await authStore.logout()
  if (is_validate) {
    router.push('/')
    return
  }
  alert('Logout failed. Please try again.')
}

const router = useRouter()

// Navigasi halaman
const goToDetail = (batchId) => router.push(`/batch/${batchId}`)
const tambahBatch = () => router.push('/tambah-batch')
const bukaFormActivity = () => router.push('/formReportActivity')
const bukaLaporanActivity = () => router.push('/reportActivityList')

// Data ringkasan
const summary = ref({
  totalPlanlet: 2500,
  planletBagus: 2100,
  planletJelek: 400,
  planletDitanam: 1900,
  g0Terjual: 350,
  g0Diproduksi: 1700,
  g0Dirawat: 1550,
  g1Hidup: 1200,
  g1Mati: 200,
  g2Diproduksi: 950,
  g2Mitra: 500,
  g2Petani: 450,
  g2Terjual: 800,
  pendapatan: 52500000,
})

// Persentase progres
const progres = ref({
  planletToG0: ((summary.value.planletDitanam / summary.value.totalPlanlet) * 100).toFixed(1),
  G0ToG1: ((summary.value.g1Hidup / summary.value.g0Dirawat) * 100).toFixed(1),
  G1ToG2: ((summary.value.g2Diproduksi / summary.value.g1Hidup) * 100).toFixed(1),
})

// Dummy batch data
const batchList = ref([
  {
    id: 1,
    nama: 'Batch Planlet Kentang 1',
    planlet: 500,
    g0: 420,
    g1: 360,
    g2: 310,
    sukses: 74,
    terjual: 120,
    pendapatan: 6500000,
    pengeluaran: 4200000,
  },
  {
    id: 2,
    nama: 'Batch Planlet Stek Kentang ',
    planlet: 600,
    g0: 510,
    g1: 460,
    g2: 410,
    sukses: 68,
    terjual: 150,
    pendapatan: 7800000,
    pengeluaran: 5000000,
  },
])

onMounted(() => {
  // Chart garis fase
  new Chart(document.getElementById('faseChart'), {
    type: 'line',
    data: {
      labels: ['Planlet', 'G0', 'G1', 'G2'],
      datasets: [
        {
          label: 'Batch A',
          data: [500, 420, 360, 310],
          borderColor: '#0071f3',
          backgroundColor: 'rgba(0, 113, 243, 0.08)',
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#0071f3',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
        {
          label: 'Batch B',
          data: [600, 510, 460, 410],
          borderColor: '#8FABD4',
          backgroundColor: 'rgba(143, 171, 212, 0.08)',
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#8FABD4',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'bottom',
          labels: {
            padding: 15,
            font: { size: 12, weight: '500' },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        title: {
          display: true,
          text: 'Perkembangan Fase Kentang per Batch',
          font: { size: 15, weight: '600' },
          color: '#1f2937',
          padding: { bottom: 20 }
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f3f4f6', drawBorder: false },
          ticks: { color: '#6b7280', font: { size: 11 } }
        },
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: '#6b7280', font: { size: 11 } }
        }
      }
    },
  })

  // Chart pie kepemilikan
  new Chart(document.getElementById('kepemilikanChart'), {
    type: 'doughnut',
    data: {
      labels: ['Milik Mitra', 'Milik Petani'],
      datasets: [
        {
          data: [summary.value.g2Mitra, summary.value.g2Petani],
          backgroundColor: ['#0071f3', '#8FABD4'],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { 
          position: 'bottom',
          labels: {
            padding: 15,
            font: { size: 12, weight: '500' },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        title: {
          display: true,
          text: 'Distribusi Kepemilikan G2',
          font: { size: 15, weight: '600' },
          color: '#1f2937',
          padding: { bottom: 20 }
        },
      },
    },
  })

  // Chart bar pendapatan vs pengeluaran
  new Chart(document.getElementById('penjualanChart'), {
    type: 'bar',
    data: {
      labels: batchList.value.map((b) => b.nama),
      datasets: [
        {
          label: 'Pendapatan (Rp)',
          data: batchList.value.map((b) => b.pendapatan),
          backgroundColor: '#0071f3',
          borderRadius: 8,
          borderSkipped: false,
        },
        {
          label: 'Pengeluaran (Rp)',
          data: batchList.value.map((b) => b.pengeluaran),
          backgroundColor: '#374151',
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { 
          beginAtZero: true,
          grid: { color: '#f3f4f6', drawBorder: false },
          ticks: { color: '#6b7280', font: { size: 11 } }
        },
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: '#6b7280', font: { size: 11 } }
        }
      },
      plugins: {
        legend: { 
          position: 'bottom',
          labels: {
            padding: 15,
            font: { size: 12, weight: '500' },
            usePointStyle: true,
            pointStyle: 'rect'
          }
        },
        title: {
          display: true,
          text: 'Perbandingan Pemasukan & Pengeluaran per Batch',
          font: { size: 15, weight: '600' },
          color: '#1f2937',
          padding: { bottom: 20 }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`
            },
          },
          backgroundColor: '#1f2937',
          padding: 12,
          cornerRadius: 8,
        },
      },
    },
  })
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-[#ffffff] to-[#ffffff] rounded-lg flex items-center justify-center text-white text-lg">
                🌱
              </span>
              Dashboard MHN GreenHouse
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Monitoring & Analisis Produksi</p>
          </div>
          <button
            @click="logout"
            class="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg border border-gray-300 transition font-medium text-sm shadow-sm hover:shadow"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M505 273c9.4-9.4 9.4-24.6 0-33.9L361 95c-6.9-6.9-17.2-8.9-26.2-5.2S320 102.3 320 112l0 80-112 0c-26.5 0-48 21.5-48 48l0 32c0 26.5 21.5 48 48 48l112 0 0 80c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2L505 273zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"/>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Action Buttons -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div class="flex flex-wrap gap-3">
          <button
            @click="bukaFormActivity"
            class="group bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-medium px-5 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <span class="flex items-center gap-2">
              📝 Isi Form Aktivitas
            </span>
          </button>
          <button
            @click="bukaLaporanActivity"
            class="bg-white hover:bg-gray-50 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow"
          >
            📊 Lihat Laporan
          </button>
          <router-link
            to="/report-production"
            class="bg-white hover:bg-gray-50 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow inline-flex items-center"
          >
            📈 Laporan Produksi
          </router-link>
          <router-link
            to="/location"
            class="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-medium px-5 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 inline-flex items-center"
          >
            📍 Add Location & Batch
          </router-link>
          <router-link
            to="/goodmovement"
            class="bg-white hover:bg-gray-50 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-gray-700 shadow-sm hover:shadow inline-flex items-center"
          >
            🚚 Good Movement
          </router-link>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ringkasan Produksi</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <button @click="openModal" class="group bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div class="relative">
              <p class="text-sm font-semibold opacity-90 mb-2">Total Planlet</p>
              <h2 class="text-4xl font-bold mb-1">{{ summary.totalPlanlet.toLocaleString('id-ID') }}</h2>
              <p class="text-xs opacity-75">🌱 Stok keseluruhan</p>
            </div>
          </button>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">G0 Terjual</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ summary.g0Terjual.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">💰 Unit terjual</p>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">G0 Diproduksi</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ summary.g0Diproduksi.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">🏭 Unit produksi</p>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total G2 Diproduksi</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ summary.g2Diproduksi.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">✅ Produksi akhir</p>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total G2 Terjual</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ summary.g2Terjual.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">📦 Distribusi selesai</p>
          </div>

          <div class="bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div class="relative">
              <p class="text-sm font-semibold opacity-90 mb-2">Pendapatan Total</p>
              <h2 class="text-4xl font-bold mb-1">Rp {{ (summary.pendapatan / 1000000).toFixed(1) }}M</h2>
              <p class="text-xs opacity-75">💵 Revenue keseluruhan</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Stats -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tingkat Keberhasilan</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:shadow-lg transition-all">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-semibold text-gray-600">Planlet → G0</p>
              <span class="text-2xl">🌱</span>
            </div>
            <h2 class="text-5xl font-bold text-gray-900 mb-3">{{ progres.planletToG0 }}%</h2>
            <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-[#0071f3] to-[#8FABD4] rounded-full transition-all duration-500" :style="`width: ${progres.planletToG0}%`"></div>
            </div>
          </div>
          <div class="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:shadow-lg transition-all">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-semibold text-gray-600">G0 → G1</p>
              <span class="text-2xl">🌿</span>
            </div>
            <h2 class="text-5xl font-bold text-gray-900 mb-3">{{ progres.G0ToG1 }}%</h2>
            <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-[#0071f3] to-[#8FABD4] rounded-full transition-all duration-500" :style="`width: ${progres.G0ToG1}%`"></div>
            </div>
          </div>
          <div class="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:shadow-lg transition-all">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-semibold text-gray-600">G1 → G2</p>
              <span class="text-2xl">🥔</span>
            </div>
            <h2 class="text-5xl font-bold text-gray-900 mb-3">{{ progres.G1ToG2 }}%</h2>
            <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-[#0071f3] to-[#8FABD4] rounded-full transition-all duration-500" :style="`width: ${progres.G1ToG2}%`"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Analisis & Visualisasi</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="bg-white rounded-2xl border-2 border-gray-100 p-6 col-span-2 shadow-sm hover:shadow-lg transition-all" style="height: 400px;">
            <canvas id="faseChart"></canvas>
          </div>
          <div class="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all" style="height: 400px;">
            <canvas id="kepemilikanChart"></canvas>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-8 shadow-sm hover:shadow-lg transition-all" style="height: 400px;">
        <canvas id="penjualanChart"></canvas>
      </div>

      <!-- Batch Cards -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Setiap Batch</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="batch in batchList"
          :key="batch.id"
          class="group bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-[#0071f3] hover:shadow-xl transition-all transform hover:-translate-y-1"
        >
          <div class="flex items-start justify-between mb-4">
            <h3 class="text-lg font-bold text-gray-900 flex-1">{{ batch.nama }}</h3>
            <div class="w-12 h-12 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
              🥔
            </div>
          </div>
          
          <div class="space-y-3 mb-6">
            <div class="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
              <span class="text-gray-600 font-medium">Planlet</span>
              <span class="font-bold text-gray-900">{{ batch.planlet }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-center bg-blue-50 px-2 py-2 rounded-lg">
                <p class="text-xs text-blue-600 font-semibold mb-1">G0</p>
                <p class="text-lg font-bold text-blue-900">{{ batch.g0 }}</p>
              </div>
              <div class="text-center bg-blue-50 px-2 py-2 rounded-lg">
                <p class="text-xs text-blue-600 font-semibold mb-1">G1</p>
                <p class="text-lg font-bold text-blue-900">{{ batch.g1 }}</p>
              </div>
              <div class="text-center bg-blue-50 px-2 py-2 rounded-lg">
                <p class="text-xs text-blue-600 font-semibold mb-1">G2</p>
                <p class="text-lg font-bold text-blue-900">{{ batch.g2 }}</p>
              </div>
            </div>
            <div class="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
              <span class="text-gray-600 font-medium">Terjual</span>
              <span class="font-bold text-gray-900">{{ batch.terjual }} unit</span>
            </div>
            
            <div class="border-t-2 border-gray-100 pt-3 mt-3 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600 font-medium">💰 Pendapatan</span>
                <span class="font-bold text-green-600">Rp {{ (batch.pendapatan / 1000000).toFixed(1) }}M</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600 font-medium">💸 Pengeluaran</span>
                <span class="font-bold text-red-600">Rp {{ (batch.pengeluaran / 1000000).toFixed(1) }}M</span>
              </div>
              <div class="flex justify-between items-center pt-2 border-t border-gray-100">
                <span class="text-sm text-gray-600 font-medium">Keberhasilan</span>
                <div class="flex items-center gap-2">
                  <div class="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-[#0071f3] to-[#8FABD4]" :style="`width: ${batch.sukses}%`"></div>
                  </div>
                  <span class="text-lg font-bold text-[#0071f3]">{{ batch.sukses }}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            class="w-full bg-gradient-to-r from-[#0071f3] to-[#0060d1] group-hover:from-[#0060d1] group-hover:to-[#0050b1] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
            @click="goToDetail(batch.id)"
          >
            Lihat Detail →
          </button>
        </div>
      </div>

      <!-- Footer -->
      <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>
  </div>
  <ModalView :isOpen="isOpen" @close="closeModal" />
</template>