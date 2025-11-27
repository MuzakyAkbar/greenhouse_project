<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ModalView from '@/components/ModalView.vue'
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

import { useAuthStore } from '../stores/auth'
import { supabase } from '@/lib/supabase'

// Helper function untuk normalize phase name
const normalizePhase = (phaseName) => {
  const phase = phaseName?.toLowerCase() || '';
  
  if (phase.includes('planlet')) return 'Planlet';
  if (phase.includes('g0') || phase.includes('g0')) return 'G0';
  if (phase === 'g1' || phase.includes('g1')) return 'G1';
  if (phase === 'g2' || phase.includes('g2')) return 'G2';
  
  return null; // Abaikan data yang tidak termasuk 4 kategori
}

const locationBatches = ref({});
const locationList = ref([]);
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
const bukaLaporanActivity = () => router.push('/planningReportList')

// Data ringkasan - akan diisi dari database
const summary = ref({
  totalPlanlet: 0,
  planletBagus: 0,
  planletJelek: 0,
  planletDitanam: 0,
  g0Terjual: 0,
  g0Diproduksi: 0,
  g0Dirawat: 0,
  g1Hidup: 0,
  g1Mati: 0,
  g2Diproduksi: 0,
  g2Mitra: 0,
  g2Petani: 0,
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
  },
  g2: {
    total: 0,
    damaged: 0,
    success: 0,
    percentage: 0
  }
})

// Persentase progres
const progres = ref({
  planletToG0: 0,
  G0ToG1: 0,
  G1ToG2: 0,
})

// Data untuk charts
const chartData = ref({
  faseChart: null,
  kepemilikanChart: null,
  penjualanChart: null
})

onMounted(async () => {

  // Ambil semua lokasi
  const { data: locData } = await supabase
    .from("gh_location")
    .select("*");

  locationList.value = locData || [];

  // Ambil semua batch & kelompokkan berdasarkan lokasi
  const { data: batchData } = await supabase
    .from("gh_batch")
    .select("batch_id, batch_name, location_id");

  const grouped = {};

  batchData?.forEach(b => {
    if (!grouped[b.location_id]) grouped[b.location_id] = [];
    grouped[b.location_id].push(b);
  });

  locationBatches.value = grouped;

  // Reset summary dan success rate
  summary.value = {
    totalPlanlet: 0,
    planletBagus: 0,
    planletJelek: 0,
    planletDitanam: 0,
    g0Terjual: 0,
    g0Diproduksi: 0,
    g0Dirawat: 0,
    g1Hidup: 0,
    g1Mati: 0,
    g2Diproduksi: 0,
    g2Mitra: 0,
    g2Petani: 0,
    g2Terjual: 0,
    pendapatan: 0,
  };

  successRate.value = {
    planlet: { total: 0, damaged: 0, success: 0, percentage: 0 },
    g0: { total: 0, damaged: 0, success: 0, percentage: 0 },
    g1: { total: 0, damaged: 0, success: 0, percentage: 0 },
    g2: { total: 0, damaged: 0, success: 0, percentage: 0 }
  };

  // 1. Ambil data produksi dari gh_data_production
  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty, location_id");

  if (productionData) {
    productionData.forEach(item => {
      const qty = parseFloat(item.qty) || 0;
      const normalizedType = normalizePhase(item.production_type);

      if (normalizedType === 'Planlet') {
        summary.value.totalPlanlet += qty;
        successRate.value.planlet.total += qty;
      } else if (normalizedType === 'G0') {
        summary.value.g0Diproduksi += qty;
        successRate.value.g0.total += qty;
      } else if (normalizedType === 'G1') {
        successRate.value.g1.total += qty;
      } else if (normalizedType === 'G2') {
        summary.value.g2Diproduksi += qty;
        successRate.value.g2.total += qty;
      }
    });
  }

  // 2. Ambil HANYA report yang approved
  const { data: reportData } = await supabase
    .from("gh_report")
    .select(`
      report_id,
      location_id,
      batch_id,
      phase_id,
      report_status,
      gh_phase!inner(phase_name)
    `)
    .eq("report_status", "approved");

  // 3. Ambil kerusakan yang terkait dengan report approved
  if (reportData && reportData.length > 0) {
    const approvedReportIds = reportData.map(r => r.report_id);
    
    const { data: damageData } = await supabase
      .from("gh_type_damage")
      .select("kuning, kutilang, busuk, report_id, status")
      .in("report_id", approvedReportIds)
      .eq("status", "approved");

    // Buat map report_id -> phase_name
    const reportPhaseMap = {};
    reportData.forEach(report => {
      if (report.gh_phase && report.gh_phase.phase_name) {
        reportPhaseMap[report.report_id] = report.gh_phase.phase_name;
      }
    });

    // Hitung kerusakan per fase
    if (damageData) {
      damageData.forEach(damage => {
        // Jumlahkan kuning + kutilang + busuk
        const totalDamage = (parseInt(damage.kuning) || 0) + 
                          (parseInt(damage.kutilang) || 0) + 
                          (parseInt(damage.busuk) || 0);
        
        // Cari phase dari report_id
        const phaseName = reportPhaseMap[damage.report_id];
        
        if (phaseName) {
          const normalizedPhase = normalizePhase(phaseName);
          
          if (normalizedPhase === 'Planlet') {
            successRate.value.planlet.damaged += totalDamage;
          } else if (normalizedPhase === 'G0') {
            successRate.value.g0.damaged += totalDamage;
          } else if (normalizedPhase === 'G1') {
            successRate.value.g1.damaged += totalDamage;
          } else if (normalizedPhase === 'G2') {
            successRate.value.g2.damaged += totalDamage;
          }
        }
      });
    }
  }

  // 4. Hitung success dan percentage untuk setiap fase
  Object.keys(successRate.value).forEach(key => {
    const phase = successRate.value[key];
    phase.success = Math.max(0, phase.total - phase.damaged);
    phase.percentage = phase.total > 0 
      ? ((phase.success / phase.total) * 100).toFixed(1) 
      : 0;
  });

  // Update progres dengan data success rate
  progres.value.planletToG0 = successRate.value.planlet.percentage;
  progres.value.G0ToG1 = successRate.value.g0.percentage;
  progres.value.G1ToG2 = successRate.value.g1.percentage;

  // 5. Ambil data penjualan untuk hitung pendapatan
  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("qty, price");

  if (salesData) {
    summary.value.pendapatan = salesData.reduce((total, item) => {
      return total + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
    }, 0);
  }

  // Inisialisasi charts setelah data dimuat
  await initCharts();
});

// Fungsi untuk inisialisasi semua charts
const initCharts = async () => {
  // 1. Chart Fase Produksi (Line Chart)
  await initFaseChart();
  
  // 2. Chart Kepemilikan G2 (Pie Chart)
  await initKepemilikanChart();
  
  // 3. Chart Penjualan (Bar Chart)
  await initPenjualanChart();
};

// Chart 1: Fase Produksi
const initFaseChart = async () => {
  const canvas = document.getElementById('faseChart');
  if (!canvas) return;

  // Ambil data produksi per fase
  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty");

  // Aggregate data per fase
  const faseData = {
    planlet: 0,
    g0: 0,
    g1: 0,
    g2: 0
  };

  productionData?.forEach(item => {
    const qty = parseFloat(item.qty) || 0;
    const type = item.production_type?.toLowerCase() || '';
    
    if (type.includes('planlet')) faseData.planlet += qty;
    else if (type.includes('g0')) faseData.g0 += qty;
    else if (type.includes('g1')) faseData.g1 += qty;
    else if (type.includes('g2')) faseData.g2 += qty;
  });

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
              return value.toLocaleString('id-ID');
            }
          }
        }
      }
    }
  });
};

// Chart 2: Distribusi Kepemilikan Kentang (Pie Chart)
const initKepemilikanChart = async () => {
  const canvas = document.getElementById('kepemilikanChart');
  if (!canvas) return;

  // Kembali ke gh_production untuk owner
  const { data: productionData } = await supabase
    .from("gh_production")
    .select("owner, qty, category");

  // Aggregate berdasarkan owner
  const ownerData = {};
  productionData?.forEach(item => {
    const owner = item.owner || 'Tidak Diketahui';
    const qty = parseFloat(item.qty) || 0;
    ownerData[owner] = (ownerData[owner] || 0) + qty;
  });

  const labels = Object.keys(ownerData);
  const data = Object.values(ownerData);
  const colors = ['#0071f3', '#00a8e8', '#ff6b6b', '#4ecdc4', '#ffd93d', '#a29bfe'];

  chartData.value.kepemilikanChart = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Distribusi Kepemilikan Kentang',
          font: { size: 16, weight: 'bold' }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value.toLocaleString('id-ID')} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
};

// Chart 3: Penjualan per Bulan (Bar Chart)
const initPenjualanChart = async () => {
  const canvas = document.getElementById('penjualanChart');
  if (!canvas) return;

  // Ambil data penjualan
  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("date, qty, price, category")
    .order("date", { ascending: true });

  // Group by bulan
  const monthlyData = {};
  salesData?.forEach(item => {
    if (!item.date) return;
    const date = new Date(item.date);
    const monthYear = `${date.toLocaleString('id-ID', { month: 'short' })} ${date.getFullYear()}`;
    
    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = { qty: 0, revenue: 0 };
    }
    
    monthlyData[monthYear].qty += parseFloat(item.qty) || 0;
    monthlyData[monthYear].revenue += (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
  });

  const labels = Object.keys(monthlyData);
  const qtyData = labels.map(month => monthlyData[month].qty);
  const revenueData = labels.map(month => monthlyData[month].revenue / 1000000); // dalam juta

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
              return value.toLocaleString('id-ID');
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
              return 'Rp ' + value.toFixed(1) + 'M';
            }
          }
        }
      }
    }
  });
};

// Helper function untuk menampilkan batch
const getBatchesDisplay = (locationId) => {
  const batches = locationBatches.value[locationId] || []
  if (batches.length === 0) return 'Tidak ada batch'
  if (batches.length <= 2) {
    return batches.map(b => b.batch_name).join(', ')
  }
  return batches.slice(0, 2).map(b => b.batch_name).join(', ') + ', ...'
}

const getBatchCount = (locationId) => {
  return locationBatches.value[locationId]?.length || 0
}

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
            @click="bukaLaporanActivity"
            class="bg-white hover:bg-gray-50 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow"
          >
            📊 Planning & Report List
          </button>
          <router-link
            to="/planningActivity"
            class="group bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-medium px-5 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <span class="flex items-center gap-2">
              📝 Form Activity Planning
            </span>
          </router-link>
          <button
            @click="bukaFormActivity"
            class="group bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-medium px-5 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <span class="flex items-center gap-2">
              📝 Form Activity Report
            </span>
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

      <!-- Progress Stats with Potato -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tingkat Keberhasilan</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PotatoProgressBar
            :percentage="parseFloat(successRate.planlet?.percentage || 0)"
            label="Planlet"
            :success="successRate.planlet?.success || 0"
            :total="successRate.planlet?.total || 0"
            :damaged="successRate.planlet?.damaged || 0"
            gradient-start="#d4a574"
            gradient-end="#b88a5c"
          />
          
          <PotatoProgressBar
            :percentage="parseFloat(successRate.g0?.percentage || 0)"
            label="G0"
            :success="successRate.g0?.success || 0"
            :total="successRate.g0?.total || 0"
            :damaged="successRate.g0?.damaged || 0"
            gradient-start="#d4a574"
            gradient-end="#b88a5c"
          />
          
          <PotatoProgressBar
            :percentage="parseFloat(successRate.g1?.percentage || 0)"
            label="G1"
            :success="successRate.g1?.success || 0"
            :total="successRate.g1?.total || 0"
            :damaged="successRate.g1?.damaged || 0"
            gradient-start="#d4a574"
            gradient-end="#b8965c"
          />
          
          <PotatoProgressBar
            :percentage="parseFloat(successRate.g2?.percentage || 0)"
            label="G2"
            :success="successRate.g2?.success || 0"
            :total="successRate.g2?.total || 0"
            :damaged="successRate.g2?.damaged || 0"
            gradient-start="#d4a574"
            gradient-end="#b8865c"
          />
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

      <!-- Location Cards dengan Batch List -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Setiap Location</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="loc in locationList"
          :key="loc.location_id"
          class="bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] hover:shadow-xl transition-all"
        >
          <!-- Header Location -->
          <div class="p-6 border-b border-gray-100">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 mb-1">{{ loc.location }}</h3>
                <p class="text-xs text-gray-500">{{ getBatchCount(loc.location_id) }} Batch</p>
              </div>
              <div class="w-12 h-12 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
                📍
              </div>
            </div>
          </div>

          <!-- Batch List -->
          <div class="p-4">
            <div v-if="getBatchCount(loc.location_id) === 0" class="text-center py-8 text-gray-400 text-sm">
              Belum ada batch
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="batch in locationBatches[loc.location_id]"
                :key="batch.batch_id"
                class="bg-gray-50 rounded-lg p-4 hover:bg-blue-50 transition-all group/batch"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <h4 class="font-semibold text-gray-900 text-sm mb-1">{{ batch.batch_name }}</h4>
                    <p class="text-xs text-gray-500">
                      {{ batch.tanggal_mulai ? new Date(batch.tanggal_mulai).toLocaleDateString('id-ID') : 'Tanggal tidak tersedia' }}
                    </p>
                  </div>
                  <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {{ batch.batch_name?.charAt(0) || 'B' }}
                  </div>
                </div>
                
                <button
                  @click="router.push(`/batch/${batch.batch_id}`)"
                  class="w-full bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white py-2.5 rounded-lg font-semibold hover:shadow-md transition-all text-xs group-hover/batch:shadow-lg"
                >
                  Lihat Detail Batch →
                </button>
              </div>
            </div>
          </div>

          <!-- Footer Button untuk Lihat Detail Lokasi -->
          <div class="p-4 pt-0">
            <button
              class="w-full bg-white hover:bg-gray-50 text-[#0071f3] py-3 rounded-xl font-semibold border-2 border-[#0071f3] hover:shadow-md transition-all text-sm"
              @click="router.push(`/locationdetail/${loc.location_id}`)"
            >
              📊 Lihat Detail Lokasi
            </button>
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
  <ModalView :isOpen="isOpen" @close="closeModal" />
</template>