<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ModalView from '@/components/ModalView.vue'
import PotatoProgressBar from '@/components/PotatoProgressBar.vue'
import DamageRepairModal from '@/components/DamageRepairModal.vue'
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

import logoPG from '../assets/logoPG.svg' 

// Helper function untuk normalize phase name
const normalizePhase = (phaseName) => {
  const phase = phaseName?.toLowerCase() || '';
  
  if (phase.includes('planlet')) return 'Planlet';
  if (phase.includes('g0')) return 'G0';
  if (phase === 'g1' || phase.includes('g1')) return 'G1';
  if (phase === 'g2' || phase.includes('g2')) return 'G2';
  
  return null; 
}

const locationBatches = ref({});
const locationList = ref([]);
const authStore = useAuthStore()
const isOpen = ref(false)

// State Baru untuk Repair
const isRepairModalOpen = ref(false)
const selectedPhaseForRepair = ref(null)

const openModal = () => {
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

// Function Baru untuk Repair
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
  await loadDashboardData()
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

// Data ringkasan
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

// Struktur successRate Baru
const successRate = ref({
  planlet: {
    total: 0,
    kuning: 0,
    kutilang: 0,
    busuk: 0,
    damaged: 0,     // rusak (bisa diperbaiki)
    dead: 0,        // mati (tidak bisa diperbaiki)
    success: 0,
    percentage: 0
  },
  g0: {
    total: 0,
    kuning: 0,
    kutilang: 0,
    busuk: 0,
    damaged: 0,
    dead: 0,
    success: 0,
    percentage: 0
  },
  g1: {
    total: 0,
    kuning: 0,
    kutilang: 0,
    busuk: 0,
    damaged: 0,
    dead: 0,
    success: 0,
    percentage: 0
  },
  g2: {
    total: 0,
    kuning: 0,
    kutilang: 0,
    busuk: 0,
    damaged: 0,
    dead: 0,
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

// Fungsi utama load data
const loadDashboardData = async () => {
  const { data: locData } = await supabase
    .from("gh_location")
    .select("*");

  locationList.value = locData || [];

  const { data: batchData } = await supabase
    .from("gh_batch")
    .select("batch_id, batch_name, location_id, tanggal_mulai");

  const grouped = {};

  batchData?.forEach(b => {
    if (!grouped[b.location_id]) grouped[b.location_id] = [];
    grouped[b.location_id].push(b);
  });

  locationBatches.value = grouped;

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
    planlet: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 },
    g0: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 },
    g1: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 },
    g2: { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 }
  };

  // 1. Ambil data produksi
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

  // 2. Ambil report approved
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

  // 3. Ambil kerusakan (UPDATED: Menggunakan gh_damage_summary agar data NETT)
  if (reportData && reportData.length > 0) {
    const approvedReportIds = reportData.map(r => r.report_id);
    
    // PERBAIKAN: Ambil dari gh_damage_summary, bukan gh_type_damage
    // Agar mendapatkan nilai *_nett yang sudah dikurangi repair
    const { data: damageSummaryData } = await supabase
      .from("gh_damage_summary")
      .select("kuning_nett, kutilang_nett, busuk_nett, report_id")
      .in("report_id", approvedReportIds);

    const reportPhaseMap = {};
    reportData.forEach(report => {
      if (report.gh_phase && report.gh_phase.phase_name) {
        reportPhaseMap[report.report_id] = report.gh_phase.phase_name;
      }
    });

    if (damageSummaryData) {
      damageSummaryData.forEach(damage => {
        // PERBAIKAN: Gunakan kolom _nett
        const kuning = parseInt(damage.kuning_nett) || 0;
        const kutilang = parseInt(damage.kutilang_nett) || 0;
        const busuk = parseInt(damage.busuk_nett) || 0;
        
        const phaseName = reportPhaseMap[damage.report_id];
        
        if (phaseName) {
          const normalizedPhase = normalizePhase(phaseName);
          
          if (normalizedPhase === 'Planlet') {
            successRate.value.planlet.kuning += kuning;
            successRate.value.planlet.kutilang += kutilang;
            successRate.value.planlet.busuk += busuk;
            successRate.value.planlet.damaged += (kuning + kutilang);
            successRate.value.planlet.dead += busuk;
          } else if (normalizedPhase === 'G0') {
            successRate.value.g0.kuning += kuning;
            successRate.value.g0.kutilang += kutilang;
            successRate.value.g0.busuk += busuk;
            successRate.value.g0.damaged += (kuning + kutilang);
            successRate.value.g0.dead += busuk;
          } else if (normalizedPhase === 'G1') {
            successRate.value.g1.kuning += kuning;
            successRate.value.g1.kutilang += kutilang;
            successRate.value.g1.busuk += busuk;
            successRate.value.g1.damaged += (kuning + kutilang);
            successRate.value.g1.dead += busuk;
          } else if (normalizedPhase === 'G2') {
            successRate.value.g2.kuning += kuning;
            successRate.value.g2.kutilang += kutilang;
            successRate.value.g2.busuk += busuk;
            successRate.value.g2.damaged += (kuning + kutilang);
            successRate.value.g2.dead += busuk;
          }
        }
      });
    }
  }

  // Hitung Success & Percentage
  Object.keys(successRate.value).forEach(key => {
    const phase = successRate.value[key];
    phase.success = Math.max(0, phase.total - phase.damaged - phase.dead);
    phase.percentage = phase.total > 0 
      ? ((phase.success / phase.total) * 100).toFixed(1) 
      : 0;
  });

  progres.value.planletToG0 = successRate.value.planlet.percentage;
  progres.value.G0ToG1 = successRate.value.g0.percentage;
  progres.value.G1ToG2 = successRate.value.g1.percentage;

  // 5. Pendapatan
  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("qty, price");

  if (salesData) {
    summary.value.pendapatan = salesData.reduce((total, item) => {
      return total + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
    }, 0);
  }

  await initCharts();
}

onMounted(async () => {
  await loadDashboardData();
});

// Chart Functions (Sama seperti sebelumnya)
const initCharts = async () => {
  await initFaseChart();
  await initKepemilikanChart();
  await initPenjualanChart();
};

const initFaseChart = async () => {
  const canvas = document.getElementById('faseChart');
  if (!canvas) return;
  
  if (chartData.value.faseChart) {
    chartData.value.faseChart.destroy();
  }

  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty");

  const faseData = { planlet: 0, g0: 0, g1: 0, g2: 0 };

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
        legend: { display: true, position: 'top' },
        title: { display: true, text: 'Produksi Per Fase', font: { size: 16, weight: 'bold' } }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: function(value) { return value.toLocaleString('id-ID'); } }
        }
      }
    }
  });
};

const initKepemilikanChart = async () => {
  const canvas = document.getElementById('kepemilikanChart');
  if (!canvas) return;

  if (chartData.value.kepemilikanChart) {
    chartData.value.kepemilikanChart.destroy();
  }

  const { data: productionData } = await supabase
    .from("gh_production")
    .select("owner, qty, category");

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
        legend: { display: true, position: 'bottom' },
        title: { display: true, text: 'Distribusi Kepemilikan Kentang', font: { size: 16, weight: 'bold' } },
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

const initPenjualanChart = async () => {
  const canvas = document.getElementById('penjualanChart');
  if (!canvas) return;

  if (chartData.value.penjualanChart) {
    chartData.value.penjualanChart.destroy();
  }

  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("date, qty, price, category")
    .order("date", { ascending: true });

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
  const revenueData = labels.map(month => monthlyData[month].revenue / 1000000);

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
          ticks: { callback: function(value) { return value.toLocaleString('id-ID'); } }
        },
        y1: {
          type: 'linear', display: true, position: 'right',
          title: { display: true, text: 'Pendapatan (Juta Rp)' },
          grid: { drawOnChartArea: false },
          ticks: { callback: function(value) { return 'Rp ' + value.toFixed(1) + 'M'; } }
        }
      }
    }
  });
};

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