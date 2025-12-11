<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PotatoProgressBar from '@/components/PotatoProgressBar.vue'
import DamageRepairModal from '@/components/DamageRepairModal.vue' 
import logoPG from '../assets/logoPG.svg'

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

import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()

// --- PERBAIKAN: Parsing ID agar lebih aman (bisa baca :id atau :location_id) ---
const locationId = computed(() => {
  const rawId = route.params.location_id || route.params.id
  const id = parseInt(rawId)
  console.log('Location ID Parsed:', id)
  return id
})
// -----------------------------------------------------------------------------

const locationInfo = ref(null)
const environmentData = ref(null) 
const batchList = ref([])

// Data ringkasan
const summary = ref({
  totalPlanlet: 0,
  g0Terjual: 0,
  g0Diproduksi: 0,
  g2Diproduksi: 0,
  g2Terjual: 0,
  pendapatan: 0,
})

// Data untuk tingkat keberhasilan (Diperbarui dengan detail kerusakan dan G2)
const successRate = ref({
  planlet: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 },
  g0: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 },
  g1: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 },
  g2: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 }
})

// Data untuk charts
const chartData = ref({
  faseChart: null,
  batchComparisonChart: null,
  penjualanChart: null
})

// --- State Modal untuk Perbaikan (Disinkronkan dari BatchDetail) ---
const isRepairModalOpen = ref(false)
const selectedPhaseForRepair = ref(null)

const openRepairModal = (phase) => {
  selectedPhaseForRepair.value = phase
  isRepairModalOpen.value = true
}

const closeRepairModal = () => {
  isRepairModalOpen.value = false
  selectedPhaseForRepair.value = null
}

const handleRepairSuccess = async () => {
  closeRepairModal()
  await loadProductionData() // Refresh data setelah perbaikan
}
// -------------------------------------------------------------------

// Helper function untuk normalize phase name (Disalin dari BatchDetail)
const normalizePhase = (phaseName) => {
  const phase = phaseName?.toLowerCase() || '';
  
  if (phase.includes('planlet')) return 'Planlet';
  if (phase.includes('g0')) return 'G0';
  if (phase === 'g1' || phase.includes('g1')) return 'G1';
  if (phase === 'g2' || phase.includes('g2')) return 'G2';
  
  return null; 
}

// Helper untuk mendapatkan warna gradient per fase (Disalin dari BatchDetail)
const getPhaseColors = (phaseKey) => {
    // Warna Cokelat/Krem dari gambar referensi (Potato/Kartu)
    const BROWN_START = '#D4A574'; 
    const BROWN_END = '#B88A5C';

    // Warna Kuning/Emas untuk tombol Repair (dari gambar referensi)
    const REPAIR_BUTTON_BG = '#FFC107'; 
    const REPAIR_BUTTON_HOVER = '#FFA000';
    
    // Warna untuk progress bar, menggunakan gradient cokelat/krem sesuai gambar
    switch (phaseKey) {
        case 'planlet':
        case 'g0':
        case 'g1':
        case 'g2':
            return { 
                start: BROWN_START, 
                end: BROWN_END,
                button_bg: REPAIR_BUTTON_BG,
                button_hover: REPAIR_BUTTON_HOVER
            };
        default:
            return { 
                start: BROWN_START, 
                end: BROWN_END,
                button_bg: REPAIR_BUTTON_BG,
                button_hover: REPAIR_BUTTON_HOVER
            };
    }
}

onMounted(async () => {
  if (isNaN(locationId.value)) {
    console.error('Invalid location ID. Route params:', route.params)
    return
  }
  
  await loadLocationData()
  await loadEnvironmentData() 
  await loadProductionData()
  await initCharts()
})

const loadLocationData = async () => {
  const { data: locData } = await supabase
    .from("gh_location")
    .select("*")
    .eq("location_id", locationId.value)
    .single()

  locationInfo.value = locData

  const { data: batchData } = await supabase
    .from("gh_batch")
    .select("batch_id, batch_name, tanggal_mulai") // Ambil detail batch
    .eq("location_id", locationId.value)

  batchList.value = batchData || []
}

const loadProductionData = async () => {
  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty")
    .eq("location_id", locationId.value)

  // 1. Ambil semua report approved di lokasi ini
  const { data: reportData } = await supabase
    .from("gh_report")
    .select(`
      report_id, 
      report_status,
      gh_phase!inner(phase_name)
    `)
    .eq("report_status", "approved")
    .eq("location_id", locationId.value)

  // 2. Ambil kerusakan NETT (sudah dikurangi perbaikan) dari gh_damage_summary
  let damageSummaryData = null
  if (reportData && reportData.length > 0) {
    const approvedReportIds = reportData.map(r => r.report_id)
    const { data } = await supabase
      .from("gh_damage_summary")
      .select("kuning_nett, kutilang_nett, busuk_nett, report_id")
      .in("report_id", approvedReportIds)
    damageSummaryData = data
  }


  // Reset dan Inisialisasi
  summary.value = {
    totalPlanlet: 0,
    g0Terjual: 0,
    g0Diproduksi: 0,
    g2Diproduksi: 0,
    g2Terjual: 0,
    pendapatan: 0,
  }

  successRate.value = {
    planlet: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 },
    g0: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 },
    g1: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 },
    g2: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 }
  }


  // A. Hitung Total Produksi
  if (productionData) {
    productionData.forEach(item => {
      const qty = parseFloat(item.qty) || 0
      const normalizedType = normalizePhase(item.production_type)

      if (normalizedType === 'Planlet') {
        summary.value.totalPlanlet += qty
        successRate.value.planlet.total += qty
      } else if (normalizedType === 'G0') {
        if (item.production_type?.toLowerCase().includes('terjual')) {
          summary.value.g0Terjual += qty
        } else {
          summary.value.g0Diproduksi += qty
          successRate.value.g0.total += qty
        }
      } else if (normalizedType === 'G1') {
        successRate.value.g1.total += qty
      } else if (normalizedType === 'G2') {
        if (item.production_type?.toLowerCase().includes('terjual')) {
          summary.value.g2Terjual += qty
        } else {
          summary.value.g2Diproduksi += qty
          successRate.value.g2.total += qty
        }
      }
    })
  }

  // B. Hitung Kerusakan NETT
  if (damageSummaryData && reportData) {
    const reportPhaseMap = {}
    reportData.forEach(r => reportPhaseMap[r.report_id] = r.gh_phase?.phase_name)

    damageSummaryData.forEach(damage => {
      const kuning = parseInt(damage.kuning_nett) || 0
      const kutilang = parseInt(damage.kutilang_nett) || 0
      const busuk = parseInt(damage.busuk_nett) || 0
      
      const phaseName = reportPhaseMap[damage.report_id]
      
      if (phaseName) {
        const normalizedPhase = normalizePhase(phaseName)
        const phaseKey = normalizedPhase ? normalizedPhase.toLowerCase() : null
        const phaseRate = successRate.value[phaseKey]
        
        if (phaseRate) {
          phaseRate.kuning += kuning
          phaseRate.kutilang += kutilang
          phaseRate.busuk += busuk
          phaseRate.damaged += (kuning + kutilang) // Kerusakan yang bisa diperbaiki (kuning, kutilang)
          phaseRate.dead += busuk // Kerusakan mati (busuk)
        }
      }
    })
  }

  // C. Finalisasi Success Rate
  Object.keys(successRate.value).forEach(key => {
    const phase = successRate.value[key]
    phase.success = Math.max(0, phase.total - phase.damaged - phase.dead)
    phase.percentage = phase.total > 0 
      ? ((phase.success / phase.total) * 100).toFixed(1) 
      : 0
  })


  // D. Hitung Total Penjualan
  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("qty, price")
    .eq("location_id", locationId.value)

  if (salesData) {
    summary.value.pendapatan = salesData.reduce((total, item) => {
      return total + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
    }, 0)
  }
}

// --------------------------------------------------------------------------------------
// NEW: Fungsi Load Environment Data (Diperbaiki agar hanya menampilkan data HARI INI)
// --------------------------------------------------------------------------------------
const loadEnvironmentData = async () => {
  if (!locationId.value) return;
  try {
    const today = new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
    
    // 1. Coba ambil data TEPAT HARI INI
    let { data, error } = await supabase
      .from('gh_environment_log')
      .select('*')
      .eq('location_id', locationId.value)
      .eq('log_date', today)
      .maybeSingle()
    
    // 2. Jika data hari ini TIDAK ADA, JANGAN ambil data terakhir/kemarin. Cukup set null.
    if (!data) {
      console.log("Data lingkungan HARI INI (9/12/2025) tidak ditemukan, mereset tampilan.")
      environmentData.value = null; // Kunci: Reset ke null jika data hari ini kosong
    } else {
      environmentData.value = data
    }
    
  } catch (err) {
    console.error("Error loading environment data:", err)
    environmentData.value = null
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const formatTime = (timeString) => {
  if (!timeString) return '-'
  return timeString.substring(0, 5)
}

const initCharts = async () => {
  await initFaseChart()
  await initBatchComparisonChart()
  await initPenjualanChart()
}

const initFaseChart = async () => {
  const canvas = document.getElementById('faseChart')
  if (!canvas) return

  // Hapus chart lama jika ada
  if (chartData.value.faseChart) {
    chartData.value.faseChart.destroy()
  }

  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty")
    .eq("location_id", locationId.value)

  const faseData = { planlet: 0, g0: 0, g1: 0, g2: 0 }

  productionData?.forEach(item => {
    const qty = parseFloat(item.qty) || 0
    const type = item.production_type?.toLowerCase() || ''
    
    if (type.includes('planlet')) faseData.planlet += qty
    else if (type.includes('g0')) faseData.g0 += qty
    else if (type.includes('g1')) faseData.g1 += qty
    else if (type.includes('g2')) faseData.g2 += qty
  })

  chartData.value.faseChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['Planlet', 'G0', 'G1', 'G2'],
      datasets: [{
        label: 'Jumlah Produksi',
        data: [faseData.planlet, faseData.g0, faseData.g1, faseData.g2],
        borderColor: '#0071f3',
        backgroundColor: 'rgba(0, 113, 243, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#0071f3',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { display: true, text: 'Produksi Per Fase', font: { size: 16, weight: 'bold' } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: function(value) { return value.toLocaleString('id-ID') } } }
      }
    }
  })
}

const initBatchComparisonChart = async () => {
  const canvas = document.getElementById('batchComparisonChart')
  if (!canvas) return
  if (batchList.value.length === 0) return

  // Hapus chart lama jika ada
  if (chartData.value.batchComparisonChart) {
    chartData.value.batchComparisonChart.destroy()
  }
  
  const batchIds = batchList.value.map(b => b.batch_id)
  
  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("batch_id, qty")
    .in("batch_id", batchIds)

  const batchProduction = {}
  productionData?.forEach(item => {
    const batchId = item.batch_id
    const qty = parseFloat(item.qty) || 0
    batchProduction[batchId] = (batchProduction[batchId] || 0) + qty
  })

  const labels = batchList.value.map(b => b.batch_name)
  const data = batchList.value.map(b => batchProduction[b.batch_id] || 0)

  chartData.value.batchComparisonChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Produksi',
        data: data,
        backgroundColor: 'rgba(0, 113, 243, 0.8)',
        borderColor: '#0071f3',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Perbandingan Produksi Per Batch', font: { size: 16, weight: 'bold' } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: function(value) { return value.toLocaleString('id-ID') } } }
      }
    }
  })
}

const initPenjualanChart = async () => {
  const canvas = document.getElementById('penjualanChart')
  if (!canvas) return

  // Hapus chart lama jika ada
  if (chartData.value.penjualanChart) {
    chartData.value.penjualanChart.destroy()
  }

  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("date, qty, price")
    .eq("location_id", locationId.value)
    .order("date", { ascending: true })

  const monthlyData = {}
  salesData?.forEach(item => {
    if (!item.date) return
    const date = new Date(item.date)
    const monthYear = `${date.toLocaleString('id-ID', { month: 'short' })} ${date.getFullYear()}`
    
    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = { qty: 0, revenue: 0 }
    }
    
    monthlyData[monthYear].qty += parseFloat(item.qty) || 0
    monthlyData[monthYear].revenue += (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
  })

  const labels = Object.keys(monthlyData)
  const qtyData = labels.map(month => monthlyData[month].qty)
  const revenueData = labels.map(month => monthlyData[month].revenue / 1000000)

  chartData.value.penjualanChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Jumlah Terjual',
          data: qtyData,
          backgroundColor: 'rgba(0, 113, 243, 0.8)',
          borderColor: '#0071f3',
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: 'Pendapatan (Juta Rp)',
          data: revenueData,
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: '#ff9f40',
          borderWidth: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top' },
        title: { display: true, text: 'Penjualan & Pendapatan Bulanan', font: { size: 16, weight: 'bold' } }
      },
      scales: {
        y: {
          type: 'linear', display: true, position: 'left',
          title: { display: true, text: 'Jumlah Unit' },
          ticks: { callback: function(value) { return value.toLocaleString('id-ID') } }
        },
        y1: {
          type: 'linear', display: true, position: 'right',
          title: { display: true, text: 'Pendapatan (Juta Rp)' },
          grid: { drawOnChartArea: false },
          ticks: { callback: function(value) { return 'Rp ' + value.toFixed(1) + 'M' } }
        }
      }
    }
  })
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <DamageRepairModal
        :isOpen="isRepairModalOpen"
        :phase="selectedPhaseForRepair"
        :damageData="selectedPhaseForRepair ? successRate[selectedPhaseForRepair] : null"
        @close="closeRepairModal"
        @success="handleRepairSuccess"
    />
    
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
                  📍
                </span>
                {{ locationInfo?.location || 'Memuat...' }}
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Detail Produksi & Pemantauan Lokasi</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div class="mb-10">
        <div class="flex justify-between items-end mb-4">
           <div>
              <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Kondisi Lingkungan Terkini</h2>
              <p v-if="environmentData" class="text-xs text-gray-400 mt-1">Data Tanggal: {{ formatDate(environmentData.log_date) }}</p>
           </div>
           <router-link to="/environment-log/add" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
              Perbarui Kondisi <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
           </router-link>
        </div>

        <div v-if="environmentData">
            <div class="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm flex justify-between items-center">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl shadow-sm">
                        🌤️
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase font-bold tracking-wide">Cuaca Harian</p>
                        <p class="text-xl font-bold text-gray-900 capitalize">{{ environmentData.weather || '-' }}</p>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div class="bg-white rounded-xl border-t-4 border-t-orange-400 p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-bold text-gray-800 flex items-center gap-1"> Pagi</span>
                        <span class="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{{ formatTime(environmentData.time_morning) }}</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Suhu</span> <b class="text-gray-900">{{ environmentData.temp_morning || '-' }}°C</b></div>
                        <div class="flex justify-between"><span>Kelembapan</span> <b class="text-gray-900">{{ environmentData.humid_morning || '-' }}%</b></div>
                        <div class="flex justify-between"><span>CO2</span> <b class="text-gray-900">{{ environmentData.co2_morning || '-' }} ppm</b></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl border-t-4 border-t-yellow-400 p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-bold text-gray-800 flex items-center gap-1"> Siang</span>
                        <span class="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{{ formatTime(environmentData.time_noon) }}</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Suhu</span> <b class="text-gray-900">{{ environmentData.temp_noon || '-' }}°C</b></div>
                        <div class="flex justify-between"><span>Kelembapan</span> <b class="text-gray-900">{{ environmentData.humid_noon || '-' }}%</b></div>
                        <div class="flex justify-between"><span>CO2</span> <b class="text-gray-900">{{ environmentData.co2_noon || '-' }} ppm</b></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl border-t-4 border-t-indigo-400 p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-bold text-gray-800 flex items-center gap-1"> Sore</span>
                        <span class="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{{ formatTime(environmentData.time_afternoon) }}</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Suhu</span> <b class="text-gray-900">{{ environmentData.temp_afternoon || '-' }}°C</b></div>
                        <div class="flex justify-between"><span>Kelembapan</span> <b class="text-gray-900">{{ environmentData.humid_afternoon || '-' }}%</b></div>
                        <div class="flex justify-between"><span>CO2</span> <b class="text-gray-900">{{ environmentData.co2_afternoon || '-' }} ppm</b></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl border-t-4 border-t-slate-500 p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-bold text-gray-800 flex items-center gap-1"> Malam</span>
                        <span class="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{{ formatTime(environmentData.time_night) }}</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Suhu</span> <b class="text-gray-900">{{ environmentData.temp_night || '-' }}°C</b></div>
                        <div class="flex justify-between"><span>Kelembapan</span> <b class="text-gray-900">{{ environmentData.humid_night || '-' }}%</b></div>
                        <div class="flex justify-between"><span>CO2</span> <b class="text-gray-900">{{ environmentData.co2_night || '-' }} ppm</b></div>
                    </div>
                </div>
            </div>
        </div>
        </div>
      
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ringkasan Produksi</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div class="bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div class="relative">
              <p class="text-sm font-semibold opacity-90 mb-2">Total Planlet</p>
              <h2 class="text-4xl font-bold mb-1">{{ summary.totalPlanlet.toLocaleString('id-ID') }}</h2>
              <p class="text-xs opacity-75">🌱 Stok keseluruhan</p>
            </div>
          </div>

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
              <p class="text-xs opacity-75">💵 Pendapatan lokasi</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tingkat Keberhasilan Fase</h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"> 
          <div v-for="(phase, key) in successRate" :key="key" 
               class="bg-white rounded-2xl border-2 border-gray-100 hover:border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
            
            <div>
              <PotatoProgressBar
                :percentage="parseFloat(phase.percentage)"
                :label="key.toUpperCase()"
                :success="phase.success"
                :total="phase.total"
                :damaged="phase.damaged + phase.dead" 
                :gradient-start="getPhaseColors(key).start"
                :gradient-end="getPhaseColors(key).end"
                class="mb-6"
              />

              <div class="space-y-3">
                <div class="flex justify-between items-center text-sm">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    <span class="text-gray-600">Sehat</span>
                  </div>
                  <span class="font-bold text-gray-900">{{ phase.success.toLocaleString('id-ID') }}</span>
                </div>

                <div class="flex justify-between items-center text-sm">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    <span class="text-gray-600">Rusak</span>
                  </div>
                  <span class="font-bold text-yellow-600">{{ phase.damaged.toLocaleString('id-ID') }}</span>
                </div>

                <div class="pl-6 space-y-1 text-xs text-gray-500">
                  <div class="flex justify-between items-center">
                    <span>• Kuning</span>
                    <span>{{ phase.kuning.toLocaleString('id-ID') }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span>• Kutilang</span>
                    <span>{{ phase.kutilang.toLocaleString('id-ID') }}</span>
                  </div>
                </div>

                <div class="flex justify-between items-center text-sm">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span class="text-gray-600">Mati (Busuk)</span>
                  </div>
                  <span class="font-bold text-red-600">{{ phase.dead.toLocaleString('id-ID') }}</span>
                </div>

                <div class="pt-3 border-t border-gray-100 flex justify-between items-center font-bold text-gray-900 text-sm">
                  <span>Total</span>
                  <span>{{ phase.total.toLocaleString('id-ID') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Analisis & Visualisasi</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all" style="height: 400px;">
            <canvas id="faseChart"></canvas>
          </div>
          <div class="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all" style="height: 400px;">
            <canvas id="batchComparisonChart"></canvas>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-8 shadow-sm hover:shadow-lg transition-all" style="height: 400px;">
        <canvas id="penjualanChart"></canvas>
      </div>

      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Daftar Batch di Lokasi Ini</h2>
        <div v-if="batchList.length === 0" class="text-center py-8 text-gray-500 bg-white rounded-2xl border-2 border-gray-100">
          Belum ada batch di lokasi ini
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="batch in batchList"
            :key="batch.batch_id"
            class="bg-white rounded-xl p-4 border-2 border-gray-100 hover:border-[#0071f3] hover:shadow-lg transition-all"
          >
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {{ batch.batch_name?.charAt(0) || 'B' }}
              </div>
              <div class="flex-1">
                <p class="font-semibold text-gray-900">{{ batch.batch_name }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ batch.tanggal_mulai ? new Date(batch.tanggal_mulai).toLocaleDateString('id-ID') : '-' }}</p>
              </div>
            </div>
            
            <router-link
                :to="`/batch/${batch.batch_id}`"
                class="w-full mt-4 inline-block text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold text-sm transition"
            >
                Lihat Detail Batch
            </router-link>
          </div>
        </div>
      </div>

      <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
           <span class="w-6 h-6 p-0.5">
             <img :src="logoPG" alt="Logo Potato Grow" class="w-full h-full object-contain" />
          </span>
          <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>
  </div>
</template>