<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
import { supabase } from '@/lib/supabase'

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

const router = useRouter()
const route = useRoute()

const batchId = ref(null)

const batch = ref({
  id: 1,
  nama: 'Loading...',
  planlet: 0,
  g0: 0,
  g1: 0,
  g2: 0,
  sukses: 0,
  terjual: 0,
  pendapatan: 0,
  pengeluaran: 0,
  totalPlanlet: 0,
  g0Terjual: 0,
  g0Diproduksi: 0,
  g2Diproduksi: 0,
  g2Terjual: 0,
  g0Dirawat: 0,
  g1Hidup: 0,
  g1Mati: 0,
  g2Mitra: 0,
  g2Petani: 0
})

const progres = ref({
  planletToG0: 0,
  G0ToG1: 0,
  G1ToG2: 0,
})

const activityReport = ref([])
const materialList = ref([])
const totalMaterial = ref(0)

onMounted(async () => {
  // Parse batch_id dari route params
  const paramId = route.params.id
  console.log('🔍 Route params:', route.params)
  console.log('🔍 Param id:', paramId, 'Type:', typeof paramId)
  
  if (!paramId) {
    console.error('❌ No batch_id in route params')
    alert('Batch ID tidak ditemukan')
    router.push('/dashboard')
    return
  }
  
  batchId.value = parseInt(paramId, 10)
  
  if (isNaN(batchId.value)) {
    console.error('❌ Invalid batch_id (NaN)')
    alert('Batch ID tidak valid')
    router.push('/dashboard')
    return
  }
  
  console.log('✅ Valid batch_id:', batchId.value)
  
  await loadBatchData()
  await loadActivityReports()
  await loadMaterialData()
  
  // Inisialisasi charts setelah data dimuat
  setTimeout(() => {
    initCharts()
  }, 500)
})

const loadBatchData = async () => {
  console.log('📦 Loading batch data for ID:', batchId.value)
  
  // Ambil info batch
  const { data: batchData, error: batchError } = await supabase
    .from("gh_batch")
    .select("*")
    .eq("batch_id", batchId.value)
    .single()

  if (batchError) {
    console.error('❌ Error loading batch:', batchError)
    alert('Gagal memuat data batch')
    router.push('/dashboard')
    return
  }

  batch.value.nama = batchData.batch_name
  console.log('✅ Batch loaded:', batchData)

  // Ambil data produksi untuk batch ini
  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty")
    .eq("batch_id", batchId.value)

  console.log('📊 Production data:', productionData)

  if (productionData) {
    productionData.forEach(item => {
      const qty = parseFloat(item.qty) || 0
      const type = item.production_type?.toLowerCase() || ''

      if (type.includes('planlet')) {
        batch.value.totalPlanlet += qty
        batch.value.planlet += qty
      } else if (type.includes('g0')) {
        if (type.includes('terjual')) {
          batch.value.g0Terjual += qty
          batch.value.terjual += qty
        } else if (type.includes('diproduksi') || type.includes('produksi')) {
          batch.value.g0Diproduksi += qty
          batch.value.g0 += qty
        }
      } else if (type.includes('g1')) {
        batch.value.g1 += qty
        if (type.includes('hidup')) {
          batch.value.g1Hidup += qty
        } else if (type.includes('mati')) {
          batch.value.g1Mati += qty
        }
      } else if (type.includes('g2')) {
        if (type.includes('diproduksi') || type.includes('produksi')) {
          batch.value.g2Diproduksi += qty
          batch.value.g2 += qty
        } else if (type.includes('terjual')) {
          batch.value.g2Terjual += qty
        }
      }
    })
  }

  // Ambil data penjualan
  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("qty, price")
    .eq("batch_id", batchId.value)

  if (salesData) {
    batch.value.pendapatan = salesData.reduce((total, item) => {
      return total + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
    }, 0)
  }

  // Hitung progres
  progres.value.planletToG0 = batch.value.planlet > 0 
    ? ((batch.value.g0 / batch.value.planlet) * 100).toFixed(1) 
    : 0
  progres.value.G0ToG1 = batch.value.g0 > 0 
    ? ((batch.value.g1 / batch.value.g0) * 100).toFixed(1) 
    : 0
  progres.value.G1ToG2 = batch.value.g1 > 0 
    ? ((batch.value.g2 / batch.value.g1) * 100).toFixed(1) 
    : 0
  
  // Hitung success rate
  batch.value.sukses = batch.value.planlet > 0 
    ? ((batch.value.g2 / batch.value.planlet) * 100).toFixed(1) 
    : 0
}

const loadActivityReports = async () => {
  // Ambil reports untuk batch ini
  const { data: reportData } = await supabase
    .from("gh_report")
    .select("report_id, location_id")
    .eq("batch_id", batchId.value)
    .eq("report_status", "approved")

  if (!reportData || reportData.length === 0) {
    console.log('⚠️ No activity reports found')
    return
  }

  const reportIds = reportData.map(r => r.report_id)

  // Ambil activities
  const { data: activities } = await supabase
    .from("gh_activity")
    .select("activity_id, act_name, manpower, report_id")
    .in("report_id", reportIds)
    .eq("status", "approved")

  if (!activities) return

  // Ambil locations
  const locationIds = [...new Set(reportData.map(r => r.location_id))]
  const { data: locations } = await supabase
    .from("gh_location")
    .select("location_id, location")
    .in("location_id", locationIds)

  const locationMap = {}
  locations?.forEach(loc => {
    locationMap[loc.location_id] = loc.location
  })

  // ✅ PERUBAHAN: Ambil material used dengan field harga
  const activityIds = activities.map(a => a.activity_id)
  const { data: materialsUsed } = await supabase
    .from("gh_material_used")
    .select("material_name, qty, uom, unit_price, total_price, activity_id")
    .in("activity_id", activityIds)

  // ✅ PERUBAHAN: Map ke activity report dengan harga
  activityReport.value = activities.map(activity => {
    const report = reportData.find(r => r.report_id === activity.report_id)
    const materials = materialsUsed?.filter(m => m.activity_id === activity.activity_id) || []
    
    // Hitung total untuk activity ini
    const activityTotal = materials.reduce((sum, m) => sum + (Number(m.total_price) || 0), 0)
    
    // Untuk tampilan table, ambil material pertama (atau bisa di-loop nanti)
    const firstMaterial = materials[0]
    
    return {
      report_id: activity.report_id,
      location: locationMap[report.location_id] || 'Unknown',
      Activity: activity.act_name,
      material_name: firstMaterial?.material_name || '-',
      Qty: firstMaterial?.qty || 0,
      UoM: firstMaterial?.uom || '-',
      unit_price: firstMaterial?.unit_price || 0,
      total_price: firstMaterial?.total_price || 0,
      manpower: activity.manpower || 0,
      materials: materials, // ✅ Simpan semua materials
      activity_total: activityTotal // ✅ Total untuk activity ini
    }
  })

  console.log('✅ Activity reports loaded:', activityReport.value.length)
}

const loadMaterialData = async () => {
  // ✅ PERUBAHAN: Ambil dari gh_material_used yang sudah digunakan di activities
  const { data: reportData } = await supabase
    .from("gh_report")
    .select("report_id")
    .eq("batch_id", batchId.value)
    .eq("report_status", "approved")

  if (!reportData || reportData.length === 0) {
    console.log('⚠️ No reports for material data')
    return
  }

  const reportIds = reportData.map(r => r.report_id)

  const { data: activities } = await supabase
    .from("gh_activity")
    .select("activity_id")
    .in("report_id", reportIds)
    .eq("status", "approved")

  if (!activities || activities.length === 0) return

  const activityIds = activities.map(a => a.activity_id)

  // ✅ Ambil semua material yang digunakan dengan harga
  const { data: materialsUsed } = await supabase
    .from("gh_material_used")
    .select("material_name, qty, uom, unit_price, total_price")
    .in("activity_id", activityIds)

  if (materialsUsed && materialsUsed.length > 0) {
    // ✅ Group by material_name dan sum qty & total_price
    const materialMap = {}
    
    materialsUsed.forEach(m => {
      const name = m.material_name
      if (!materialMap[name]) {
        materialMap[name] = {
          material_name: name,
          Qty: 0,
          UoM: m.uom,
          unit_price: Number(m.unit_price) || 0,
          total_price: 0
        }
      }
      materialMap[name].Qty += Number(m.qty) || 0
      materialMap[name].total_price += Number(m.total_price) || 0
    })

    materialList.value = Object.values(materialMap).map((m, index) => ({
      material_id: index + 1,
      material_name: m.material_name,
      Qty: m.Qty,
      UoM: m.UoM,
      harga_satuan: m.unit_price,
      total_harga: m.total_price
    }))

    // ✅ Hitung total dari semua material
    totalMaterial.value = materialList.value.reduce((sum, m) => sum + m.total_harga, 0)
  }

  console.log('✅ Material data loaded:', materialList.value.length, 'Total:', totalMaterial.value)
}

const initCharts = () => {
  // Fase Pertumbuhan
  const faseCanvas = document.getElementById('faseChart')
  if (faseCanvas) {
    new Chart(faseCanvas, {
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
          legend: { display: false },
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
  }

  // Distribusi G2
  const kepemilikanCanvas = document.getElementById('kepemilikanChart')
  if (kepemilikanCanvas) {
    new Chart(kepemilikanCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Milik Mitra', 'Milik Petani'],
        datasets: [{
          data: [batch.value.g2Mitra || 180, batch.value.g2Petani || 130],
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
  }

  // Keuangan
  const keuanganCanvas = document.getElementById('keuanganChart')
  if (keuanganCanvas) {
    new Chart(keuanganCanvas, {
      type: 'bar',
      data: {
        labels: ['Pendapatan', 'Pengeluaran', 'Material Cost'],
        datasets: [{
          label: 'Nilai (Rp)',
          data: [batch.value.pendapatan, batch.value.pengeluaran || 4200000, totalMaterial.value],
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
  }
}

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
            <button
              @click="router.back()"
              class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-5 h-5 fill-current">
                <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z"/>
              </svg>
            </button>
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
        <div v-if="activityReport.length === 0" class="bg-white rounded-2xl border-2 border-gray-100 p-8 text-center text-gray-500">
          Belum ada laporan aktivitas untuk batch ini
        </div>
        <div v-else class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gradient-to-r from-[#0071f3] to-[#0060d1]">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Lokasi</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Aktivitas</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Material</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Qty</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">UoM</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Unit Price</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Manpower</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="item in activityReport" :key="item.report_id" class="hover:bg-blue-50 transition">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{{ item.location }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ item.Activity }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">
                    <div v-if="item.materials && item.materials.length > 1" class="space-y-1">
                      <div v-for="mat in item.materials" :key="mat.material_name" class="text-xs">
                        • {{ mat.material_name }}
                      </div>
                    </div>
                    <div v-else>{{ item.material_name }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">
                    <div v-if="item.materials && item.materials.length > 1" class="space-y-1">
                      <div v-for="mat in item.materials" :key="mat.material_name" class="text-xs">
                        {{ mat.qty }}
                      </div>
                    </div>
                    <div v-else>{{ item.Qty }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    <div v-if="item.materials && item.materials.length > 1" class="space-y-1">
                      <div v-for="mat in item.materials" :key="mat.material_name" class="text-xs">
                        {{ mat.uom }}
                      </div>
                    </div>
                    <div v-else>{{ item.UoM }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                    <div v-if="item.materials && item.materials.length > 1" class="space-y-1">
                      <div v-for="mat in item.materials" :key="mat.material_name" class="text-xs">
                        Rp {{ (mat.unit_price || 0).toLocaleString('id-ID') }}
                      </div>
                    </div>
                    <div v-else>Rp {{ (item.unit_price || 0).toLocaleString('id-ID') }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700 text-right">
                    Rp {{ (item.activity_total || 0).toLocaleString('id-ID') }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-center">{{ item.manpower }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-gradient-to-r from-blue-50 to-white">
                  <td colspan="6" class="px-6 py-4 text-right text-sm font-bold text-gray-900">Total Biaya Activities:</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                    Rp {{ activityReport.reduce((sum, item) => sum + (item.activity_total || 0), 0).toLocaleString('id-ID') }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Material List -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Material yang Digunakan (Summary)</h2>
        <div v-if="materialList.length === 0" class="bg-white rounded-2xl border-2 border-gray-100 p-8 text-center text-gray-500">
          Belum ada data material
        </div>
        <div v-else class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gradient-to-r from-[#0071f3] to-[#0060d1]">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Nama Material</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total Qty</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">UoM</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Avg Unit Price</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total Harga</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="mat in materialList" :key="mat.material_id" class="hover:bg-blue-50 transition">
                  <td class="px-6 py-4 text-sm text-gray-900 font-medium">{{ mat.material_name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">{{ mat.Qty.toLocaleString('id-ID') }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{{ mat.UoM }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">Rp {{ (mat.harga_satuan || 0).toLocaleString('id-ID') }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold text-right">Rp {{ (mat.total_harga || 0).toLocaleString('id-ID') }}</td>
                </tr>
                <tr class="bg-gradient-to-r from-green-50 to-white">
                  <td colspan="4" class="px-6 py-4 text-right text-sm font-bold text-gray-900">Grand Total Material Cost:</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#0071f3] text-right">Rp {{ totalMaterial.toLocaleString('id-ID') }}</td>
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