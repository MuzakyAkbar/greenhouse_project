<script setup>
import { ref, onMounted } from 'vue'
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
  BarElement
} from 'chart.js'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
  BarElement
)

const batch = ref({
  id: 1,
  nama: 'Batch Planlet Kentang A',
  planlet: 500,
  g0: 420,
  g1: 360,
  g2: 310,
  sukses: 74,
  terjual: 120,
  pendapatan: 6500000,
  pengeluaran: 4200000,
  totalPlanlet: 2500,
  g0Terjual: 200,
  g0Diproduksi: 400,
  g2Diproduksi: 300,
  g2Terjual: 150,
  g0Dirawat: 220,
  g1Hidup: 180,
  g1Mati: 40,
  g2Mitra: 180,
  g2Petani: 130
})

const progres = ref({
  planletToG0: ((batch.value.g0 / batch.value.planlet) * 100).toFixed(1),
  G0ToG1: ((batch.value.g1 / batch.value.g0) * 100).toFixed(1),
  G1ToG2: ((batch.value.g2 / batch.value.g1) * 100).toFixed(1),
})

const activityReport = ref([
  { report_id: 1, location: 'Greenhouse 1', Activity: 'Sterilisasi botol media', material_name: 'Botol Kultur', Qty: 50, UoM: 'pcs', manpower: 2 },
  { report_id: 2, location: 'Greenhouse 1', Activity: 'Penanaman Planlet', material_name: 'Agar-agar', Qty: 2, UoM: 'kg', manpower: 3 },
  { report_id: 3, location: 'Greenhouse 1', Activity: 'Pemeliharaan G0', material_name: 'Pupuk Cair', Qty: 5, UoM: 'liter', manpower: 2 },
  { report_id: 4, location: 'Greenhouse 1', Activity: 'Panen G0', material_name: 'Label Batch', Qty: 100, UoM: 'pcs', manpower: 2 }
])

const materialList = ref([
  { material_id: 1, material_name: 'Botol Kultur', Qty: 100, UoM: 'pcs', harga_satuan: 2500 },
  { material_id: 2, material_name: 'Agar-agar', Qty: 2, UoM: 'kg', harga_satuan: 150000 },
  { material_id: 3, material_name: 'Pupuk Cair', Qty: 5, UoM: 'liter', harga_satuan: 50000 },
  { material_id: 4, material_name: 'Label Batch', Qty: 100, UoM: 'pcs', harga_satuan: 1000 }
])

const totalMaterial = ref(0)

onMounted(() => {
  totalMaterial.value = materialList.value.reduce((sum, m) => sum + m.Qty * m.harga_satuan, 0)

  // Fase Pertumbuhan
  new Chart(document.getElementById('faseChart'), {
    type: 'line',
    data: {
      labels: ['Planlet', 'G0', 'G1', 'G2'],
      datasets: [{
        label: batch.value.nama,
        data: [batch.value.planlet, batch.value.g0, batch.value.g1, batch.value.g2],
        borderColor: '#0071f3',
        backgroundColor: 'rgba(0, 113, 243, 0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#0071f3',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false
        },
        title: { 
          display: true, 
          text: 'Perkembangan Fase Pertumbuhan Kentang',
          font: { size: 15, weight: '600' },
          color: '#1f2937',
          padding: { bottom: 20 }
        }
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
    }
  })

  // Distribusi G2
  new Chart(document.getElementById('kepemilikanChart'), {
    type: 'doughnut',
    data: {
      labels: ['Milik Mitra', 'Milik Petani'],
      datasets: [{
        data: [batch.value.g2Mitra, batch.value.g2Petani],
        backgroundColor: ['#0071f3', '#8FABD4'],
        borderWidth: 0,
        hoverOffset: 8,
      }]
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
        }
      }
    }
  })

  // Keuangan
  new Chart(document.getElementById('keuanganChart'), {
    type: 'bar',
    data: {
      labels: ['Pendapatan', 'Pengeluaran', 'Material Cost'],
      datasets: [{
        label: 'Nilai (Rp)',
        data: [batch.value.pendapatan, batch.value.pengeluaran, totalMaterial.value],
        backgroundColor: ['#0071f3', '#374151', '#8FABD4'],
        borderRadius: 8,
        borderSkipped: false,
      }]
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
        legend: { display: false },
        title: { 
          display: true, 
          text: 'Perbandingan Keuangan Batch',
          font: { size: 15, weight: '600' },
          color: '#1f2937',
          padding: { bottom: 20 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `Rp ${ctx.parsed.y.toLocaleString('id-ID')}`
          },
          backgroundColor: '#1f2937',
          padding: 12,
          cornerRadius: 8,
        }
      }
    }
  })
})

function exportToExcel() {
  const wb = XLSX.utils.book_new()

  const stats = [
    ['Nama Batch', batch.value.nama],
    ['Keberhasilan (%)', batch.value.sukses],
    ['Planlet ke G0 (%)', progres.value.planletToG0],
    ['G0 ke G1 (%)', progres.value.G0ToG1],
    ['G1 ke G2 (%)', progres.value.G1ToG2],
    ['Terjual', batch.value.terjual],
    ['Pendapatan (Rp)', batch.value.pendapatan],
    ['Pengeluaran (Rp)', batch.value.pengeluaran],
    ['Total Material (Rp)', totalMaterial.value]
  ]
  const wsStats = XLSX.utils.aoa_to_sheet(stats)
  XLSX.utils.book_append_sheet(wb, wsStats, 'Statistik Batch')

  const wsActivity = XLSX.utils.json_to_sheet(activityReport.value)
  XLSX.utils.book_append_sheet(wb, wsActivity, 'Activity Report')

  const wsMaterial = XLSX.utils.json_to_sheet(
    materialList.value.map((m) => ({
      'Nama Material': m.material_name,
      Qty: m.Qty,
      UoM: m.UoM,
      'Harga Satuan (Rp)': m.harga_satuan,
      'Total Harga (Rp)': m.Qty * m.harga_satuan
    }))
  )
  XLSX.utils.book_append_sheet(wb, wsMaterial, 'Material')

  XLSX.writeFile(wb, `${batch.value.nama}_Detail.xlsx`)
}

async function exportToPDF() {
  const element = document.getElementById('exportArea')
  const canvas = await html2canvas(element, { scale: 2 })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(`${batch.value.nama}_Detail.pdf`)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <router-link
              to="/dashboard"
              class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-5 h-5 fill-current">
                <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z"/>
              </svg>
            </router-link>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                  🥔
                </span>
                Detail Batch: {{ batch.nama }}
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Informasi lengkap produksi batch</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button 
              @click="exportToExcel" 
              class="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg border-2 border-gray-200 hover:border-green-500 transition font-medium text-sm shadow-sm hover:shadow"
            >
              <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
              </svg>
              Export Excel
            </button>
            <button 
              @click="exportToPDF" 
              class="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2.5 rounded-lg transition font-medium text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd"/>
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div id="exportArea" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Stats Overview -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ringkasan Produksi</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div class="bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div class="relative">
              <p class="text-sm font-semibold opacity-90 mb-2">Total Planlet</p>
              <h2 class="text-4xl font-bold mb-1">{{ batch.totalPlanlet.toLocaleString('id-ID') }}</h2>
              <p class="text-xs opacity-75">🌱 Stok keseluruhan</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">G0 Terjual</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ batch.g0Terjual.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">💰 Unit terjual</p>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">G0 Diproduksi</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ batch.g0Diproduksi.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">🏭 Unit produksi</p>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total G2 Diproduksi</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ batch.g2Diproduksi.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">✅ Produksi akhir</p>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total G2 Terjual</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ batch.g2Terjual.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">📦 Distribusi selesai</p>
          </div>

          <div class="bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div class="relative">
              <p class="text-sm font-semibold opacity-90 mb-2">Tingkat Keberhasilan</p>
              <h2 class="text-4xl font-bold mb-1">{{ batch.sukses }}%</h2>
              <p class="text-xs opacity-75">📊 Success rate</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Stats -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tingkat Keberhasilan Fase</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:shadow-lg transition-all">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-semibold text-gray-600">Planlet → G0</p>
              <span class="text-2xl">🌱</span>
            </div>
            <h2 class="text-5xl font-bold text-gray-900 mb-2">{{ progres.planletToG0 }}%</h2>
            <p class="text-sm text-gray-500 mb-3">{{ batch.g0 }} / {{ batch.planlet }} unit</p>
            <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-[#0071f3] to-[#8FABD4] rounded-full transition-all duration-500" :style="`width: ${progres.planletToG0}%`"></div>
            </div>
          </div>
          <div class="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:shadow-lg transition-all">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-semibold text-gray-600">G0 → G1</p>
              <span class="text-2xl">🌿</span>
            </div>
            <h2 class="text-5xl font-bold text-gray-900 mb-2">{{ progres.G0ToG1 }}%</h2>
            <p class="text-sm text-gray-500 mb-3">{{ batch.g1 }} / {{ batch.g0 }} unit</p>
            <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-[#0071f3] to-[#8FABD4] rounded-full transition-all duration-500" :style="`width: ${progres.G0ToG1}%`"></div>
            </div>
          </div>
          <div class="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:shadow-lg transition-all">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-semibold text-gray-600">G1 → G2</p>
              <span class="text-2xl">🥔</span>
            </div>
            <h2 class="text-5xl font-bold text-gray-900 mb-2">{{ progres.G1ToG2 }}%</h2>
            <p class="text-sm text-gray-500 mb-3">{{ batch.g2 }} / {{ batch.g1 }} unit</p>
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
        <canvas id="keuanganChart"></canvas>
      </div>

      <!-- Activity Report -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Laporan Aktivitas</h2>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gradient-to-r from-[#0071f3] to-[#0060d1]">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Lokasi</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Aktivitas</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Material</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Qty</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">UoM</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Manpower</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="item in activityReport" :key="item.report_id" class="hover:bg-blue-50 transition">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{{ item.location }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ item.Activity }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ item.material_name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{{ item.Qty }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ item.UoM }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{{ item.manpower }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Material List -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Material yang Digunakan</h2>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gradient-to-r from-[#0071f3] to-[#0060d1]">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Nama Material</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Qty</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">UoM</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Harga Satuan</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Total Harga</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="mat in materialList" :key="mat.material_id" class="hover:bg-blue-50 transition">
                  <td class="px-6 py-4 text-sm text-gray-900 font-medium">{{ mat.material_name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{{ mat.Qty }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ mat.UoM }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">Rp {{ mat.harga_satuan.toLocaleString('id-ID') }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">Rp {{ (mat.Qty * mat.harga_satuan).toLocaleString('id-ID') }}</td>
                </tr>
                <tr class="bg-gradient-to-r from-blue-50 to-white">
                  <td colspan="4" class="px-6 py-4 text-right text-sm font-bold text-gray-900">Total Biaya Material:</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#0071f3]">Rp {{ totalMaterial.toLocaleString('id-ID') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
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
</template>