<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PotatoProgressBar from '@/components/PotatoProgressBar.vue'
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

const locationId = computed(() => {
  // Router menggunakan 'location_id', bukan 'id'
  const id = parseInt(route.params.location_id)
  console.log('Location ID from route:', route.params.location_id, 'Parsed:', id)
  return id
})
const locationInfo = ref(null)
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

// Data untuk tingkat keberhasilan
const successRate = ref({
  planlet: {
    total: 0,
    damaged: 0,
    success: 0,
    percentage: 0
  },
  g0: {
    total: 0,
    damaged: 0,
    success: 0,
    percentage: 0
  },
  g1: {
    total: 0,
    damaged: 0,
    success: 0,
    percentage: 0
  }
})

// Data untuk charts
const chartData = ref({
  faseChart: null,
  batchComparisonChart: null,
  penjualanChart: null
})

onMounted(async () => {
  // Validasi locationId sebelum load data
  if (isNaN(locationId.value)) {
    console.error('Invalid location ID:', route.params.id)
    return
  }
  
  await loadLocationData()
  await loadProductionData()
  await initCharts()
})

const loadLocationData = async () => {
  // Ambil info lokasi
  const { data: locData } = await supabase
    .from("gh_location")
    .select("*")
    .eq("location_id", locationId.value)
    .single()

  locationInfo.value = locData

  // Ambil batch di lokasi ini
  const { data: batchData } = await supabase
    .from("gh_batch")
    .select("*")
    .eq("location_id", locationId.value)

  batchList.value = batchData || []
}

const loadProductionData = async () => {
  // Ambil data produksi per lokasi
  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty")
    .eq("location_id", locationId.value)

  // Ambil data kerusakan
  const { data: damageData } = await supabase
    .from("gh_type_damage")
    .select("kuning, kutilang, busuk, report_id")
    .eq("status", "approved")

  // Ambil data report untuk lokasi ini
  const { data: reportData } = await supabase
    .from("gh_report")
    .select("report_id, phase, location_id, batch_id")
    .eq("report_status", "approved")
    .eq("location_id", locationId.value)

  if (productionData) {
    // Reset
    summary.value = {
      totalPlanlet: 0,
      g0Terjual: 0,
      g0Diproduksi: 0,
      g2Diproduksi: 0,
      g2Terjual: 0,
      pendapatan: 0,
    }

    successRate.value = {
      planlet: { total: 0, damaged: 0, success: 0, percentage: 0 },
      g0: { total: 0, damaged: 0, success: 0, percentage: 0 },
      g1: { total: 0, damaged: 0, success: 0, percentage: 0 }
    }

    // Aggregate data
    productionData.forEach(item => {
      const qty = parseFloat(item.qty) || 0
      const type = item.production_type?.toLowerCase() || ''

      if (type.includes('planlet')) {
        summary.value.totalPlanlet += qty
        successRate.value.planlet.total += qty
      } else if (type.includes('g0')) {
        if (type.includes('terjual')) {
          summary.value.g0Terjual += qty
        } else if (type.includes('diproduksi') || type.includes('produksi')) {
          summary.value.g0Diproduksi += qty
          successRate.value.g0.total += qty
        }
      } else if (type.includes('g1')) {
        successRate.value.g1.total += qty
      } else if (type.includes('g2')) {
        if (type.includes('diproduksi') || type.includes('produksi')) {
          summary.value.g2Diproduksi += qty
        } else if (type.includes('terjual')) {
          summary.value.g2Terjual += qty
        }
      }
    })

    // Hitung kerusakan
    if (damageData && reportData) {
      damageData.forEach(damage => {
        const totalDamage = (parseInt(damage.kuning) || 0) + 
                           (parseInt(damage.kutilang) || 0) + 
                           (parseInt(damage.busuk) || 0)
        
        const report = reportData.find(r => r.report_id === damage.report_id)
        
        if (report && report.phase) {
          const phase = report.phase.toLowerCase()
          
          if (phase.includes('planlet') || phase === 'planlet') {
            successRate.value.planlet.damaged += totalDamage
          } else if (phase.includes('g0') || phase === 'g0') {
            successRate.value.g0.damaged += totalDamage
          } else if (phase.includes('g1') || phase === 'g1') {
            successRate.value.g1.damaged += totalDamage
          }
        }
      })
    }

    // Hitung success rate
    Object.keys(successRate.value).forEach(key => {
      const phase = successRate.value[key]
      phase.success = phase.total - phase.damaged
      phase.percentage = phase.total > 0 
        ? ((phase.success / phase.total) * 100).toFixed(1) 
        : 0
    })
  }

  // Ambil pendapatan dari penjualan lokasi ini
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

const initCharts = async () => {
  await initFaseChart()
  await initBatchComparisonChart()
  await initPenjualanChart()
}

// Chart 1: Fase Produksi per Lokasi
const initFaseChart = async () => {
  const canvas = document.getElementById('faseChart')
  if (!canvas) return

  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty")
    .eq("location_id", locationId.value)

  const faseData = {
    planlet: 0,
    g0: 0,
    g1: 0,
    g2: 0
  }

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
        legend: {
          display: true,
          position: 'top'
        },
        title: {
          display: true,
          text: 'Produksi Per Fase',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString('id-ID')
            }
          }
        }
      }
    }
  })
}

// Chart 2: Perbandingan Batch
const initBatchComparisonChart = async () => {
  const canvas = document.getElementById('batchComparisonChart')
  if (!canvas) return

  if (batchList.value.length === 0) return

  // Ambil data produksi per batch
  const batchIds = batchList.value.map(b => b.batch_id)
  
  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("batch_id, qty")
    .in("batch_id", batchIds)

  // Aggregate per batch
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
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Perbandingan Produksi Per Batch',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString('id-ID')
            }
          }
        }
      }
    }
  })
}

// Chart 3: Penjualan Bulanan
const initPenjualanChart = async () => {
  const canvas = document.getElementById('penjualanChart')
  if (!canvas) return

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
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        title: {
          display: true,
          text: 'Penjualan & Pendapatan Bulanan',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Jumlah Unit'
          },
          ticks: {
            callback: function(value) {
              return value.toLocaleString('id-ID')
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Pendapatan (Juta Rp)'
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: function(value) {
              return 'Rp ' + value.toFixed(1) + 'M'
            }
          }
        }
      }
    }
  })
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
                  📍
                </span>
                {{ locationInfo?.location || 'Loading...' }}
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Detail Produksi & Monitoring Lokasi</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Stats Grid -->
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
              <p class="text-xs opacity-75">💵 Revenue lokasi</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Stats with Potato -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tingkat Keberhasilan</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PotatoProgressBar
            :percentage="parseFloat(successRate.planlet.percentage)"
            label="Planlet"
            :success="successRate.planlet.success"
            :total="successRate.planlet.total"
            :damaged="successRate.planlet.damaged"
            gradient-start="#10b981"
            gradient-end="#059669"
          />
          
          <PotatoProgressBar
            :percentage="parseFloat(successRate.g0.percentage)"
            label="G0"
            :success="successRate.g0.success"
            :total="successRate.g0.total"
            :damaged="successRate.g0.damaged"
            gradient-start="#0071f3"
            gradient-end="#0060d1"
          />
          
          <PotatoProgressBar
            :percentage="parseFloat(successRate.g1.percentage)"
            label="G1"
            :success="successRate.g1.success"
            :total="successRate.g1.total"
            :damaged="successRate.g1.damaged"
            gradient-start="#f59e0b"
            gradient-end="#d97706"
          />
        </div>
      </div>

      <!-- Charts -->
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

      <!-- Batch List -->
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