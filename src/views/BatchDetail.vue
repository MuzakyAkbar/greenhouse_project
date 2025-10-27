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
  planletToG0: ((batch.value.planletDitanam / batch.value.totalPlanlet) * 100).toFixed(1),
  G0ToG1: ((batch.value.g1Hidup / batch.value.g0Dirawat) * 100).toFixed(1),
  G1ToG2: ((batch.value.g2Diproduksi / batch.value.g1Hidup) * 100).toFixed(1),
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
        borderColor: '#4C763B',
        backgroundColor: '#CFE9A8',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Perkembangan Fase Pertumbuhan Kentang', font: { size: 16 } }
      }
    }
  })

  // Distribusi G2
  new Chart(document.getElementById('kepemilikanChart'), {
    type: 'pie',
    data: {
      labels: ['Milik Mitra', 'Milik Petani'],
      datasets: [{
        data: [batch.value.g2Mitra, batch.value.g2Petani],
        backgroundColor: ['#4C763B', '#CFE9A8']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'Distribusi Kepemilikan G2', font: { size: 16 } }
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
        backgroundColor: ['#4C763B', '#E57373', '#B0CE88']
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } },
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Perbandingan Keuangan Batch', font: { size: 16 } },
        tooltip: {
          callbacks: {
            label: (ctx) => 'Rp ' + ctx.parsed.y.toLocaleString('id-ID')
          }
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
    ['Planlet ke G0 (%)', ((batch.value.g0 / batch.value.planlet) * 100).toFixed(1)],
    ['G0 ke G1 (%)', ((batch.value.g1 / batch.value.g0) * 100).toFixed(1)],
    ['G1 ke G2 (%)', ((batch.value.g2 / batch.value.g1) * 100).toFixed(1)],
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
  <div class="flex flex-col min-h-screen bg-[#FFFD8F] text-[#2F5320]">
    <div id="exportArea" class="flex-grow px-6 py-10">
      <!-- 🔹 Tombol Back -->
      <div class="absolute top-6 left-6 z-50">
        <router-link 
          to="/" 
          class="bg-[#4C763B] text-white px-4 py-2 rounded-lg hover:bg-[#3b5c2f] flex items-center gap-2 shadow-md"
        >
          <i class="fa-solid fa-arrow-left"></i> Kembali
        </router-link>
      </div>

      <h1 class="text-[40px] font-extrabold text-center mb-10">
        Detail Batch: {{ batch.nama }}
      </h1>

      <!-- 🔹 Tombol Export -->
      <div class="flex justify-center gap-4 mb-10">
        <button @click="exportToExcel" class="bg-[#4C763B] text-white px-6 py-2 rounded-lg hover:bg-[#3b5c2f] transition">
          📊 Export Excel
        </button>
        <button @click="exportToPDF" class="bg-[#E57373] text-white px-6 py-2 rounded-lg hover:bg-[#b45555] transition">
          📄 Export PDF
        </button>
      </div>

      <!-- 🔹 Statistik -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
  <!-- Baris 1 -->
  <div class="bg-[#4C763B] text-white rounded-xl p-4 text-center shadow">
    <p class="text-sm">Total Planlet</p>
    <h2 class="text-2xl font-bold">{{ batch.totalPlanlet }}</h2>
  </div>

  <div class="bg-[#4C763B] text-white rounded-xl p-4 text-center shadow">
    <p class="text-sm">G0 Terjual</p>
    <h2 class="text-2xl font-bold">{{ batch.g0Terjual }}</h2>
  </div>

  <div class="bg-[#4C763B] text-white rounded-xl p-4 text-center shadow">
    <p class="text-sm">G0 Diproduksi</p>
    <h2 class="text-2xl font-bold">{{ batch.g0Diproduksi }}</h2>
  </div>

  <!-- Baris 2 -->
  <div class="bg-[#CFE9A8] text-[#2F5320] rounded-xl p-4 text-center shadow">
    <p class="text-sm">Total G2 Diproduksi</p>
    <h2 class="text-2xl font-bold">{{ batch.g2Diproduksi }}</h2>
  </div>

  <div class="bg-[#CFE9A8] text-[#2F5320] rounded-xl p-4 text-center shadow">
    <p class="text-sm">Total G2 Diterjual</p>
    <h2 class="text-2xl font-bold">{{ batch.g2Terjual }}</h2>
  </div>

  <div class="bg-[#CFE9A8] text-[#2F5320] rounded-xl p-4 text-center shadow">
    <p class="text-sm">Keberhasilan</p>
    <h2 class="text-2xl font-bold">{{ batch.sukses }}%</h2>
  </div>

  <!-- Baris 3 -->
  <div class="bg-[#CFE9A8] rounded-xl text-center p-4 shadow">
    <p>Planlet → G0</p>
    <h2 class="text-2xl font-bold">
      {{ ((batch.g0 / batch.planlet) * 100).toFixed(1) }}%
    </h2>
    <p class="text-sm mt-1 text-gray-700">{{ batch.g0 }} / {{ batch.planlet }}</p>
  </div>

  <div class="bg-[#4C763B] text-white rounded-xl text-center p-4 shadow">
    <p>G0 → G1</p>
    <h2 class="text-2xl font-bold">
      {{ ((batch.g1 / batch.g0) * 100).toFixed(1) }}%
    </h2>
    <p class="text-sm mt-1 text-gray-200">{{ batch.g1 }} / {{ batch.g0 }}</p>
  </div>

  <div class="bg-[#CFE9A8] rounded-xl text-center p-4 shadow">
    <p>G1 → G2</p>
    <h2 class="text-2xl font-bold">
      {{ ((batch.g2 / batch.g1) * 100).toFixed(1) }}%
    </h2>
    <p class="text-sm mt-1 text-gray-700">{{ batch.g2 }} / {{ batch.g1 }}</p>
  </div>
</div>


      <!-- 🔹 Grafik -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div class="bg-white rounded-2xl shadow-lg p-6 col-span-2">
          <canvas id="faseChart"></canvas>
        </div>
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <canvas id="kepemilikanChart"></canvas>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-lg p-6 mb-10">
        <canvas id="keuanganChart"></canvas>
      </div>

      <!-- 🔹 Activity -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 class="text-xl font-bold mb-4">📋 Activity Report</h2>

        <!-- ✅ Tambahkan wrapper scroll -->
        <div class="overflow-x-auto">
          <table class="min-w-full border border-[#4C763B] text-left text-sm md:text-base">
            <thead class="bg-[#CFE9A8]">
              <tr>
                <th class="p-2 border border-[#4C763B] whitespace-nowrap">Lokasi</th>
                <th class="p-2 border border-[#4C763B] whitespace-nowrap">Aktivitas</th>
                <th class="p-2 border border-[#4C763B] whitespace-nowrap">Material</th>
                <th class="p-2 border border-[#4C763B] whitespace-nowrap">Qty</th>
                <th class="p-2 border border-[#4C763B] whitespace-nowrap">UoM</th>
                <th class="p-2 border border-[#4C763B] whitespace-nowrap">Manpower</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in activityReport" :key="item.report_id" class="hover:bg-[#F8FBEF]">
                <td class="p-2 border border-[#4C763B]">{{ item.location }}</td>
                <td class="p-2 border border-[#4C763B]">{{ item.Activity }}</td>
                <td class="p-2 border border-[#4C763B]">{{ item.material_name }}</td>
                <td class="p-2 border border-[#4C763B]">{{ item.Qty }}</td>
                <td class="p-2 border border-[#4C763B]">{{ item.UoM }}</td>
                <td class="p-2 border border-[#4C763B]">{{ item.manpower }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      <!-- 🔹 Material -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-10">
        <h2 class="text-xl font-bold mb-4">🧪 Material yang Digunakan</h2>
        <table class="w-full border border-[#4C763B] text-left">
          <thead class="bg-[#CFE9A8]">
            <tr>
              <th class="p-2 border border-[#4C763B]">Nama Material</th>
              <th class="p-2 border border-[#4C763B]">Qty</th>
              <th class="p-2 border border-[#4C763B]">UoM</th>
              <th class="p-2 border border-[#4C763B]">Harga Satuan (Rp)</th>
              <th class="p-2 border border-[#4C763B]">Total Harga (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mat in materialList" :key="mat.material_id" class="hover:bg-[#F8FBEF]">
              <td class="p-2 border border-[#4C763B]">{{ mat.material_name }}</td>
              <td class="p-2 border border-[#4C763B]">{{ mat.Qty }}</td>
              <td class="p-2 border border-[#4C763B]">{{ mat.UoM }}</td>
              <td class="p-2 border border-[#4C763B]">Rp {{ mat.harga_satuan.toLocaleString() }}</td>
              <td class="p-2 border border-[#4C763B]">Rp {{ (mat.Qty * mat.harga_satuan).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 🔹 Footer -->
    <footer class="bg-[#FFFD8F] text-center py-6 border-t border-[#CFE9A8]">
      <p class="text-[#2F5320] font-semibold text-lg">
        © GREENHOUSE 2025
      </p>
    </footer>
  </div>
</template>
