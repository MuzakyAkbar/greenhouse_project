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
    
    // PERBAIKAN DI SINI:
    // Mengambil data dari 'gh_damage_summary' (tabel status terkini)
    // Mengambil kolom 'kuning_nett', 'kutilang_nett', 'busuk_nett' (sisa kerusakan)
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
        // PERBAIKAN DI SINI:
        // Mapping kolom _nett ke variabel lokal
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

// Chart Functions (Tetap Sama)
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
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-white text-lg p-1.5">
                <img :src="logoPG" alt="Potato Grow Logo" class="w-full h-full object-contain" />
              </span>
              Dashboard MHN Potato Grow
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
            Keluar
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Aksi Cepat</h2>
        <div class="flex flex-wrap gap-3">
          <button
            @click="bukaLaporanActivity"
            class="bg-white hover:bg-gray-50 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow"
          >
            📊 Daftar Planning & Laporan
          </button>
          <router-link
            to="/planningActivity"
            class="group bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-medium px-5 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <span class="flex items-center gap-2">
              📝 Form Perencanaan Aktivitas
            </span>
          </router-link>
          <button
            @click="bukaFormActivity"
            class="group bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-medium px-5 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <span class="flex items-center gap-2">
              📝 Form Laporan Aktivitas
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
            📍 Tambah Lokasi & Batch
          </router-link>
          <router-link
            to="/goodmovement"
            class="bg-white hover:bg-gray-50 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-gray-700 shadow-sm hover:shadow inline-flex items-center"
          >
            🚚 Perpindahan Barang
          </router-link>
          <router-link
            to="/environment-log-list" 
            class="bg-white hover:bg-gray-50 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-teal-500 shadow-sm hover:shadow inline-flex items-center gap-2"
          >
            <span class="text-lg">🌡️</span> 
            Environment Log
          </router-link>
        </div>
      </div>

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

      <div class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Tingkat Keberhasilan</h2>
        </div>
        
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
                gradient-start="#d4a574"
                gradient-end="#b88a5c"
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

            <button
              v-if="phase.damaged > 0"
              @click="openRepairModal(key)"
              class="w-full mt-6 bg-[#D4A017] hover:bg-[#B8860B] text-white font-semibold py-3 rounded-xl transition-all shadow-sm hover:shadow-md text-sm flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path>
              </svg>
              Perbaiki Kerusakan
            </button>
            <div
              v-else
              class="w-full mt-6 bg-gray-50 text-gray-400 font-medium py-3 rounded-xl text-sm text-center border border-gray-100"
            >
              Tidak ada kerusakan
            </div>
          </div>
        </div>
      </div>

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

      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Setiap Lokasi</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="loc in locationList"
          :key="loc.location_id"
          class="bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] hover:shadow-xl transition-all"
        >
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

      <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
           <span class="w-6 h-6 p-0.5">
             <img :src="logoPG" alt="Potato Grow Logo" class="w-full h-full object-contain" />
          </span>
          <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>
  </div>
  <ModalView :isOpen="isOpen" @close="closeModal" />
  
  <DamageRepairModal
    :isOpen="isRepairModalOpen"
    :phase="selectedPhaseForRepair"
    :damageData="selectedPhaseForRepair ? successRate[selectedPhaseForRepair] : null"
    @close="closeRepairModal"
    @success="handleRepairSuccess"
  />
</template>