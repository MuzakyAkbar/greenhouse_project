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
  g0Dirawat: 1550,
  g1Hidup: 1200,
  g1Mati: 200,
  g2Diproduksi: 950,
  g2Mitra: 500,
  g2Petani: 450,
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
          borderColor: '#4C763B',
          backgroundColor: '#CFE9A8',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Batch B',
          data: [600, 510, 460, 410],
          borderColor: '#9AC75E',
          backgroundColor: '#E5F6C3',
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: 'Perkembangan Fase Kentang per Batch',
          font: { size: 16 },
        },
      },
    },
  })

  // Chart pie kepemilikan
  new Chart(document.getElementById('kepemilikanChart'), {
    type: 'pie',
    data: {
      labels: ['Milik Mitra', 'Milik Petani'],
      datasets: [
        {
          data: [summary.value.g2Mitra, summary.value.g2Petani],
          backgroundColor: ['#4C763B', '#CFE9A8'],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: 'Distribusi Kepemilikan G2 (Kentang)',
          font: { size: 16 },
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
          backgroundColor: '#4C763B',
        },
        {
          label: 'Pengeluaran (Rp)',
          data: batchList.value.map((b) => b.pengeluaran),
          backgroundColor: '#E57373',
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true },
      },
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: 'Perbandingan Pemasukan & Pengeluaran per Batch Kentang',
          font: { size: 16 },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`
            },
          },
        },
      },
    },
  })
})
</script>

<template>
  <div class="min-h-screen bg-[#FFFD8F] px-6 py-10 text-[#2F5320]">
    <!-- Header -->
    <div class="w-full flex justify-end mb-4 relative z-50">
      <button
        @click="logout"
        class="flex items-center gap-2 text-[#2F5320] bg-[#CFE9A8] hover:bg-[#b9d48f] px-4 py-2 rounded-lg shadow font-semibold border border-[#4C763B] transition"
      >
        <svg class="w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path
            d="M505 273c9.4-9.4 9.4-24.6 0-33.9L361 95c-6.9-6.9-17.2-8.9-26.2-5.2S320 102.3 320 112l0 80-112 0c-26.5 0-48 21.5-48 48l0 32c0 26.5 21.5 48 48 48l112 0 0 80c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2L505 273zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"
          />
        </svg>
      </button>
    </div>
    <div class="flex flex-col md:flex-row justify-between items-center mb-10">
      <!-- Judul -->
      <h1
        class="text-[42px] sm:text-[56px] font-extrabold text-[#2F5320] leading-tight text-center md:text-left"
      >
        Dashboard Kentang<br class="sm:hidden" />
        GreenHouse
      </h1>

      <!-- Tombol Aksi -->
      <div class="flex flex-wrap justify-center md:justify-end gap-3 mt-6 md:mt-0">
        <!-- Tombol Isi Form Aktivitas -->
        <button
          @click="bukaFormActivity"
          class="bg-[#4C763B] hover:bg-[#3b5c2f] text-white font-semibold px-5 py-2 rounded-lg shadow transition"
        >
          📝 Isi Form Aktivitas
        </button>

        <!-- Tombol Lihat Laporan Aktivitas -->
        <button
          @click="bukaLaporanActivity"
          class="bg-[#CFE9A8] hover:bg-[#b9d48f] text-[#2F5320] font-semibold px-5 py-2 rounded-lg shadow border border-[#4C763B] transition"
        >
          📋 Lihat Laporan
        </button>

        <router-link
          to="/report-production"
          class="bg-[#4C763B] hover:bg-[#3b5c2f] text-white font-semibold px-5 py-2 rounded-lg shadow transition"
        >
          + Laporan Produksi
        </router-link>

        <!-- Tombol Tambah Batch -->
        <router-link
          to="/add-batch"
          class="bg-[#CFE9A8] hover:bg-[#b9d48f] text-[#2F5320] font-semibold px-5 py-2 rounded-lg shadow border border-[#4C763B] transition"
        >
          ➕ Tambah Batch
        </router-link>
      </div>
    </div>

    <!-- Statistik -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <button @click="openModal" class="bg-[#4C763B] text-white rounded-xl p-4 text-center">
        <p class="text-sm">Total Planlet</p>
        <h2 class="text-2xl font-bold">{{ summary.totalPlanlet }}</h2>
      </button>
      <div class="bg-[#CFE9A8] text-[#2F5320] rounded-xl p-4 text-center">
        <p class="text-sm">Total G2 Diproduksi</p>
        <h2 class="text-2xl font-bold">{{ summary.g2Diproduksi }}</h2>
      </div>
      <div class="bg-[#4C763B] text-white rounded-xl p-4 text-center">
        <p class="text-sm">G0 Terjual</p>
        <h2 class="text-2xl font-bold">{{ summary.g0Terjual }}</h2>
      </div>
      <div class="bg-[#CFE9A8] text-[#2F5320] rounded-xl p-4 text-center">
        <p class="text-sm">Pendapatan Total</p>
        <h2 class="text-2xl font-bold">Rp {{ summary.pendapatan.toLocaleString('id-ID') }}</h2>
      </div>
    </div>

    <!-- Statistik Progres -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
      <div class="bg-white border-l-4 border-[#4C763B] rounded-lg p-4 shadow">
        <p class="text-gray-700 font-semibold">Planlet → G0</p>
        <h2 class="text-2xl font-bold text-[#4C763B]">{{ progres.planletToG0 }}%</h2>
      </div>
      <div class="bg-white border-l-4 border-[#4C763B] rounded-lg p-4 shadow">
        <p class="text-gray-700 font-semibold">G0 → G1</p>
        <h2 class="text-2xl font-bold text-[#4C763B]">{{ progres.G0ToG1 }}%</h2>
      </div>
      <div class="bg-white border-l-4 border-[#4C763B] rounded-lg p-4 shadow">
        <p class="text-gray-700 font-semibold">G1 → G2</p>
        <h2 class="text-2xl font-bold text-[#4C763B]">{{ progres.G1ToG2 }}%</h2>
      </div>
    </div>

    <!-- Chart -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
      <div class="bg-white rounded-2xl shadow-lg p-6 col-span-2">
        <canvas id="faseChart"></canvas>
      </div>
      <div class="bg-white rounded-2xl shadow-lg p-6">
        <canvas id="kepemilikanChart"></canvas>
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow-lg p-6 mb-10">
      <canvas id="penjualanChart"></canvas>
    </div>

    <!-- Batch Cards -->
    <h2 class="text-2xl font-bold mb-6">Data Setiap Batch Kentang</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div
        v-for="batch in batchList"
        :key="batch.id"
        class="bg-[#CFE9A8] rounded-2xl shadow-lg p-6 border-2 border-[#4C763B] hover:shadow-xl transition-all"
      >
        <h3 class="text-xl font-bold mb-4">{{ batch.nama }}</h3>
        <p><strong>Planlet:</strong> {{ batch.planlet }}</p>
        <p><strong>G0:</strong> {{ batch.g0 }}</p>
        <p><strong>G1:</strong> {{ batch.g1 }}</p>
        <p><strong>G2:</strong> {{ batch.g2 }}</p>
        <p><strong>Terjual:</strong> {{ batch.terjual }}</p>
        <p><strong>Pendapatan:</strong> Rp {{ batch.pendapatan.toLocaleString('id-ID') }}</p>
        <p><strong>Pengeluaran:</strong> Rp {{ batch.pengeluaran.toLocaleString('id-ID') }}</p>
        <p>
          <strong>Keberhasilan:</strong>
          <span class="font-semibold text-[#4C763B]">{{ batch.sukses }}%</span>
        </p>
        <button
          class="mt-6 w-full bg-[#4C763B] text-white py-2 rounded-lg font-medium hover:bg-[#3b5c2f] transition"
          @click="goToDetail(batch.id)"
        >
          Lihat Detail
        </button>
      </div>
    </div>
  </div>
  <ModalView :isOpen="isOpen" @close="closeModal" />
</template>
