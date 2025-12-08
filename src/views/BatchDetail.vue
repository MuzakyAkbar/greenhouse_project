<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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

// import logoPG from '../assets/logoPG.svg' // Tidak digunakan di template yang diberikan

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// --- Data Spesifik Batch & Lingkungan ---
// Mengambil ID Batch dari URL
const batchId = computed(() => {
  const rawId = route.params.batch_id || route.params.id
  return parseInt(rawId)
})

// State untuk Detail Batch yang Diperbaiki
const batchDetail = ref(null) 
const locationInfo = ref(null) // Menyimpan info lokasi terkait
const environmentData = ref(null) // Data lingkungan

// Data yang sebelumnya ada di dashboard, kini dihitung ulang untuk batch spesifik
const batchSummary = ref({
  totalPlanlet: 0,
  g0Terjual: 0,
  g0Diproduksi: 0,
  g2Diproduksi: 0,
  g2Terjual: 0,
  pendapatan: 0,
  sukses: 0,
})

const activityReport = ref([])
const materialList = ref([])
const totalMaterial = ref(0)

// Struktur successRate Baru (Dipertahankan seperti sebelumnya, namun diisi data batch spesifik)
const successRate = ref({
  planlet: {
    total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0
  },
  g0: {
    total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0
  },
  g1: {
    total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0
  },
  g2: {
    total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0
  }
})

// ✅ PERBAIKAN: Definisikan chartData di sini agar tidak 'undefined'
const chartData = ref({
  faseChart: null,
  kepemilikanChart: null,
  penjualanChart: null
})


// Persentase progres (dihitung dari successRate)
const progres = computed(() => ({
  planletToG0: successRate.value.planlet.percentage,
  G0ToG1: successRate.value.g0.percentage,
  G1ToG2: successRate.value.g1.percentage,
}));

// --- State Modal (Dipertahankan) ---
const isOpen = ref(false)
const isRepairModalOpen = ref(false)
const selectedPhaseForRepair = ref(null)

const openModal = () => { isOpen.value = true }
const closeModal = () => { isOpen.value = false }
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
  await loadBatchDetailData() // Refresh data batch setelah perbaikan
}
// ------------------------------------

// Helper function untuk normalize phase name (Dipertahankan)
const normalizePhase = (phaseName) => {
  const phase = phaseName?.toLowerCase() || '';
  
  if (phase.includes('planlet')) return 'Planlet';
  if (phase.includes('g0')) return 'G0';
  if (phase === 'g1' || phase.includes('g1')) return 'G1';
  if (phase === 'g2' || phase.includes('g2')) return 'G2';
  
  return null; 
}

// Navigasi (Dipertahankan)
const goToDetail = (batchId) => router.push(`/batch/${batchId}`)
const tambahBatch = () => router.push('/tambah-batch')
const bukaFormActivity = () => router.push('/formReportActivity')
const bukaLaporanActivity = () => router.push('/planningReportList')

const logout = async () => {
  const is_validate = await authStore.logout()
  if (is_validate) {
    router.push('/')
    return
  }
  alert('Logout failed. Please try again.')
}

// Formatters (Dipertahankan)
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const formatTime = (timeString) => {
  if (!timeString) return '-'
  return timeString.substring(0, 5)
}

// --------------------------------------------------------------------------------------
// NEW: Fungsi Load Data Detail Batch
// --------------------------------------------------------------------------------------

const loadBatchDetailData = async () => {
  if (isNaN(batchId.value)) return;

  // 1. Ambil Detail Batch & Info Lokasi
  const { data: batch, error: batchError } = await supabase
    .from("gh_batch")
    .select(`
      *,
      gh_location(location)
    `)
    .eq("batch_id", batchId.value)
    .maybeSingle();

  if (batchError || !batch) {
    console.error("Error loading batch detail:", batchError);
    // Mungkin redirect ke halaman error atau dashboard jika batch tidak ditemukan
    return;
  }
  
  batchDetail.value = batch;
  locationInfo.value = batch.gh_location;

  // Muat data lingkungan setelah mendapatkan location_id
  await loadEnvironmentData(batch.location_id);
  
  // Reset summary & successRate
  Object.assign(batchSummary.value, { totalPlanlet: 0, g0Terjual: 0, g0Diproduksi: 0, g2Diproduksi: 0, g2Terjual: 0, pendapatan: 0, sukses: 0 });
  Object.keys(successRate.value).forEach(key => {
    Object.assign(successRate.value[key], { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 });
  });

  // 2. Ambil data produksi spesifik batch ini
  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty, location_id")
    .eq("batch_id", batchId.value);
  
  if (productionData) {
    productionData.forEach(item => {
      const qty = parseFloat(item.qty) || 0;
      const normalizedType = normalizePhase(item.production_type);

      if (normalizedType === 'Planlet') {
        batchSummary.value.totalPlanlet += qty;
        successRate.value.planlet.total += qty;
      } else if (normalizedType === 'G0') {
        batchSummary.value.g0Diproduksi += qty;
        successRate.value.g0.total += qty;
      } else if (normalizedType === 'G1') {
        successRate.value.g1.total += qty;
      } else if (normalizedType === 'G2') {
        batchSummary.value.g2Diproduksi += qty;
        successRate.value.g2.total += qty;
      }
    });
  }
  
  // 3. Ambil report approved & damage spesifik batch ini
  const { data: reportData } = await supabase
    .from("gh_report")
    .select(`
      report_id,
      phase_id,
      report_status,
      gh_phase!inner(phase_name)
    `)
    .eq("report_status", "approved")
    .eq("batch_id", batchId.value);
    
  if (reportData && reportData.length > 0) {
    const approvedReportIds = reportData.map(r => r.report_id);
    
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
        const kuning = parseInt(damage.kuning_nett) || 0;
        const kutilang = parseInt(damage.kutilang_nett) || 0;
        const busuk = parseInt(damage.busuk_nett) || 0;
        
        const phaseName = reportPhaseMap[damage.report_id];
        
        if (phaseName) {
          const normalizedPhase = normalizePhase(phaseName);
          const phaseRate = successRate.value[normalizedPhase.toLowerCase()];
          
          if (phaseRate) {
            phaseRate.kuning += kuning;
            phaseRate.kutilang += kutilang;
            phaseRate.busuk += busuk;
            phaseRate.damaged += (kuning + kutilang);
            phaseRate.dead += busuk;
          }
        }
      });
    }
  }

  // Hitung Success & Percentage
  let grandTotalSuccess = 0;
  let grandTotalTotal = 0;

  Object.keys(successRate.value).forEach(key => {
    const phase = successRate.value[key];
    phase.success = Math.max(0, phase.total - phase.damaged - phase.dead);
    phase.percentage = phase.total > 0 
      ? ((phase.success / phase.total) * 100).toFixed(1) 
      : 0;
      
    // Hitung grand total untuk success rate keseluruhan
    grandTotalSuccess += phase.success;
    grandTotalTotal += phase.total;
  });

  batchSummary.value.sukses = grandTotalTotal > 0 
      ? ((grandTotalSuccess / grandTotalTotal) * 100).toFixed(1) 
      : 0;


  // 4. Ambil data penjualan spesifik batch ini & hitung total
  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("qty, price, category")
    .eq("batch_id", batchId.value);

  if (salesData) {
    batchSummary.value.pendapatan = salesData.reduce((total, item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.price) || 0;
      
      // Update G0/G2 Terjual (sederhana: anggap G0/G2 adalah kategori penjualan)
      if (item.category?.toLowerCase().includes('g0')) {
          batchSummary.value.g0Terjual += qty;
      } else if (item.category?.toLowerCase().includes('g2')) {
          batchSummary.value.g2Terjual += qty;
      }

      return total + (qty * price);
    }, 0);
  }
  
  // 5. Load Activity Report & Material List (Jika diperlukan untuk tabel)
  await loadActivityAndMaterialData(batch.batch_id);

  await initCharts();
}

// NEW: Fungsi Load Environment Data (mirip LocationDetail.vue)
const loadEnvironmentData = async (location_id) => {
  if (!location_id) return;
  try {
    const today = new Date().toISOString().split('T')[0]
    
    let { data, error } = await supabase
      .from('gh_environment_log')
      .select('*')
      .eq('location_id', location_id)
      .eq('log_date', today)
      .maybeSingle()
    
    if (!data) {
      const { data: lastData } = await supabase
        .from('gh_environment_log')
        .select('*')
        .eq('location_id', location_id)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      data = lastData
    }
    
    environmentData.value = data
  } catch (err) {
    console.error("Error loading environment data:", err)
    environmentData.value = null
  }
}

// NEW: Fungsi Load Activity & Material Data (MENGGUNAKAN gh_activity)
const loadActivityAndMaterialData = async (batch_id) => {
    // 1. Ambil Activity Reports
    // ✅ PERBAIKAN: Menggunakan gh_activity karena gh_report_activity tidak ada relasi langsung ke gh_report
    const { data: activities, error: activityError } = await supabase
        .from('gh_activity')
        .select(`
            *,
            gh_report(location:gh_location(location), activity_total, manpower),
            gh_material_used(material_name, unit_price, qty, uom)
        `)
        .eq('batch_id', batch_id); // Asumsi gh_activity memiliki batch_id, jika tidak, harus join ke gh_report

    if (activityError) {
        // Jika error PGRST200 tetap muncul, kemungkinan `gh_activity` tidak punya Foreign Key ke `gh_report`
        // atau `batch_id` di `gh_activity` tidak ada (menurut skema, gh_activity punya FK ke gh_report, dan gh_report punya FK ke gh_batch)
        console.error("Error loading activity reports:", activityError);
        activityReport.value = [];
        materialList.value = [];
        return;
    }
    
    // Asumsi: Kita harus melakukan *join* secara manual di frontend karena tidak ada relasi langsung dari gh_activity ke gh_batch
    // Berdasarkan skema, gh_activity -> gh_report -> gh_batch. Query di atas sudah mengandalkan *join* otomatis.
    // Jika Supabase tidak bisa *auto-join* lebih dari satu level, kita harus membatasi select.

    // Namun, mencoba memperbaiki format data berdasarkan struktur query yang diinginkan:

    // Mengelompokkan aktivitas
    const groupedActivities = activities.reduce((acc, current) => {
        const reportId = current.report_id;
        
        // Ambil data material dari array gh_material_used
        const materialsData = current.gh_material_used.map(mat => ({
             material_name: mat.material_name,
             qty: parseFloat(mat.qty) || 0,
             uom: mat.uom,
             unit_price: parseFloat(mat.unit_price) || 0,
             total_price: (parseFloat(mat.qty) || 0) * (parseFloat(mat.unit_price) || 0)
        }));
        
        // Gabungkan report data dengan activity data
        const reportData = current.gh_report;
        const locationName = reportData?.location?.location;
        const activityTotal = reportData?.activity_total;
        const manpower = reportData?.manpower;

        // Key unik adalah activity_id (bukan report_id, karena satu report bisa banyak activity)
        const activityId = current.activity_id; 

        if (!acc[activityId]) {
            acc[activityId] = {
                report_id: reportId,
                activity_id: activityId,
                location: locationName,
                Activity: current.act_name, // Menggunakan act_name dari gh_activity
                activity_total: activityTotal,
                manpower: manpower,
                materials: materialsData,
                // Fallback untuk tabel satu baris
                material_name: materialsData.length === 1 ? materialsData[0].material_name : '',
                Qty: materialsData.length === 1 ? materialsData[0].qty : 0,
                UoM: materialsData.length === 1 ? materialsData[0].uom : '',
                unit_price: materialsData.length === 1 ? materialsData[0].unit_price : 0,
            };
        }
        return acc;
    }, {});
    
    // Konversi kembali ke array
    activityReport.value = Object.values(groupedActivities).map(item => {
        // Karena ada kolom activity_total di gh_report, kita bisa pakai itu untuk total biaya activity
        return item;
    });


    // 2. Hitung Summary Material (Menggunakan gh_material_used)
    const { data: materialUsedData, error: materialUsedError } = await supabase
        .from('gh_material_used')
        .select(`
            *,
            gh_activity!inner(activity_id, report_id, batch_id)
        `)
        .eq('gh_activity.batch_id', batch_id); // Filter via join

    if (materialUsedError) {
        console.error("Error loading material used data:", materialUsedError);
        materialList.value = [];
        totalMaterial.value = 0;
        return;
    }

    const materialSummary = {};
    let grandTotal = 0;

    materialUsedData.forEach(item => {
        const matName = item.material_name;
        const qty = parseFloat(item.qty) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const totalHarga = qty * unitPrice;
        grandTotal += totalHarga;

        if (!materialSummary[matName]) {
            materialSummary[matName] = {
                material_name: matName,
                Qty: 0,
                UoM: item.uom,
                total_harga: 0,
                // Untuk menghitung rata-rata harga
                unit_price_sum: 0,
                count: 0
            };
        }
        
        materialSummary[matName].Qty += qty;
        materialSummary[matName].total_harga += totalHarga;
        materialSummary[matName].unit_price_sum += unitPrice;
        materialSummary[matName].count += 1;
    });

    materialList.value = Object.values(materialSummary).map(mat => {
        mat.harga_satuan = mat.count > 0 ? mat.unit_price_sum / mat.count : 0;
        return mat;
    });
    
    totalMaterial.value = grandTotal;
}


// --------------------------------------------------------------------------------------
// Chart Functions (Diperbarui untuk menggunakan data batch spesifik)
// --------------------------------------------------------------------------------------
const initCharts = async () => {
  // ✅ PERBAIKAN: chartData sudah didefinisikan sebagai ref di atas
  await initFaseChart();
  await initKepemilikanChart();
  await initPenjualanChart();
};

const initFaseChart = async () => {
  const canvas = document.getElementById('faseChart');
  if (!canvas || isNaN(batchId.value)) return;
  
  if (chartData.value.faseChart) {
    chartData.value.faseChart.destroy();
  }

  const { data: productionData } = await supabase
    .from("gh_data_production")
    .select("production_type, qty")
    .eq("batch_id", batchId.value); // Filter berdasarkan batchId

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
        title: { display: true, text: `Produksi Per Fase Batch ${batchDetail.value?.batch_name || batchId.value}`, font: { size: 16, weight: 'bold' } }
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
  if (!canvas || isNaN(batchId.value)) return;

  if (chartData.value.kepemilikanChart) {
    chartData.value.kepemilikanChart.destroy();
  }

  // Hanya ambil data production yang sudah diringkas (gh_production) yang relevan dengan batch ini
  const { data: productionData } = await supabase
    .from("gh_production")
    .select("owner, qty, category")
    .eq("batch_id", batchId.value); 

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
        title: { display: true, text: `Distribusi Kepemilikan Batch ${batchDetail.value?.batch_name || batchId.value}`, font: { size: 16, weight: 'bold' } },
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
  const canvas = document.getElementById('keuanganChart'); // Menggunakan ID yang ada di template
  if (!canvas || isNaN(batchId.value)) return;

  if (chartData.value.penjualanChart) {
    chartData.value.penjualanChart.destroy();
  }

  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("date, qty, price")
    .eq("batch_id", batchId.value) // Filter berdasarkan batchId
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
        title: { display: true, text: `Penjualan & Pendapatan Bulanan Batch ${batchDetail.value?.batch_name || batchId.value}`, font: { size: 16, weight: 'bold' } }
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


onMounted(async () => {
  if (isNaN(batchId.value)) {
    console.error('Invalid Batch ID.');
    // Redirect ke dashboard jika ID tidak valid
    router.push('/dashboard'); 
    return;
  }
  await loadBatchDetailData();
});

// Helper untuk mendapatkan warna gradient per fase (disesuaikan dengan gambar referensi)
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
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
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
                  🌱
                </span>
                Detail Batch: {{ batchDetail?.batch_name || 'Memuat...' }}
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">
                <span v-if="locationInfo">Lokasi: {{ locationInfo.location }}</span>
                <span v-else>Informasi lengkap produksi batch</span>
              </p>
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

    <div id="exportArea" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div class="mb-10">
        <div class="flex justify-between items-end mb-4">
           <div>
              <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Kondisi Lingkungan Terkini</h2>
              <p v-if="environmentData" class="text-xs text-gray-400 mt-1">Data Tanggal: {{ formatDate(environmentData.log_date) }}</p>
           </div>
           <router-link to="/environment-log/add" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
              Update Kondisi <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
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
                        <div class="flex justify-between"><span>Temp</span> <b class="text-gray-900">{{ environmentData.temp_morning || '-' }}°C</b></div>
                        <div class="flex justify-between"><span>Humid</span> <b class="text-gray-900">{{ environmentData.humid_morning || '-' }}%</b></div>
                        <div class="flex justify-between"><span>CO2</span> <b class="text-gray-900">{{ environmentData.co2_morning || '-' }} ppm</b></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl border-t-4 border-t-yellow-400 p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-bold text-gray-800 flex items-center gap-1"> Siang</span>
                        <span class="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{{ formatTime(environmentData.time_noon) }}</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Temp</span> <b class="text-gray-900">{{ environmentData.temp_noon || '-' }}°C</b></div>
                        <div class="flex justify-between"><span>Humid</span> <b class="text-gray-900">{{ environmentData.humid_noon || '-' }}%</b></div>
                        <div class="flex justify-between"><span>CO2</span> <b class="text-gray-900">{{ environmentData.co2_noon || '-' }} ppm</b></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl border-t-4 border-t-indigo-400 p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-bold text-gray-800 flex items-center gap-1"> Sore</span>
                        <span class="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{{ formatTime(environmentData.time_afternoon) }}</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Temp</span> <b class="text-gray-900">{{ environmentData.temp_afternoon || '-' }}°C</b></div>
                        <div class="flex justify-between"><span>Humid</span> <b class="text-gray-900">{{ environmentData.humid_afternoon || '-' }}%</b></div>
                        <div class="flex justify-between"><span>CO2</span> <b class="text-gray-900">{{ environmentData.co2_afternoon || '-' }} ppm</b></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl border-t-4 border-t-slate-500 p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-bold text-gray-800 flex items-center gap-1"> Malam</span>
                        <span class="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{{ formatTime(environmentData.time_night) }}</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Temp</span> <b class="text-gray-900">{{ environmentData.temp_night || '-' }}°C</b></div>
                        <div class="flex justify-between"><span>Humid</span> <b class="text-gray-900">{{ environmentData.humid_night || '-' }}%</b></div>
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
              <h2 class="text-4xl font-bold mb-1">{{ batchSummary.totalPlanlet.toLocaleString('id-ID') }}</h2>
              <p class="text-xs opacity-75">🌱 Stok keseluruhan</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">G0 Terjual</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ batchSummary.g0Terjual.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">💰 Unit terjual</p>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">G0 Diproduksi</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ batchSummary.g0Diproduksi.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">🏭 Unit produksi</p>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total G2 Diproduksi</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ batchSummary.g2Diproduksi.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">✅ Produksi akhir</p>
          </div>

          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total G2 Terjual</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">{{ batchSummary.g2Terjual.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">📦 Distribusi selesai</p>
          </div>

          <div class="bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div class="relative">
              <p class="text-sm font-semibold opacity-90 mb-2">Tingkat Keberhasilan</p>
              <h2 class="text-4xl font-bold mb-1">{{ batchSummary.sukses }}%</h2>
              <p class="text-xs opacity-75">📊 Success rate keseluruhan</p>
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

            <button
              v-if="phase.damaged > 0"
              @click="openRepairModal(key)"
              :class="`w-full mt-6 text-white font-semibold py-3 rounded-xl transition-all shadow-sm hover:shadow-md text-sm flex items-center justify-center gap-2 
                       bg-gradient-to-r from-[${getPhaseColors(key).button_bg}] to-[${getPhaseColors(key).button_hover}] hover:opacity-90`"
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
        <canvas id="keuanganChart"></canvas>
      </div>

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
                <tr v-for="item in activityReport" :key="item.activity_id" class="hover:bg-blue-50 transition">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{{ item.location }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ item.Activity }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">
                    <div v-if="item.materials && item.materials.length > 1" class="space-y-1">
                      <div v-for="(mat, index) in item.materials" :key="index" class="text-xs">
                        • {{ mat.material_name }}
                      </div>
                    </div>
                    <div v-else>{{ item.material_name }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">
                    <div v-if="item.materials && item.materials.length > 1" class="space-y-1">
                      <div v-for="(mat, index) in item.materials" :key="index" class="text-xs">
                        {{ mat.qty.toLocaleString('id-ID') }}
                      </div>
                    </div>
                    <div v-else>{{ item.Qty.toLocaleString('id-ID') }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    <div v-if="item.materials && item.materials.length > 1" class="space-y-1">
                      <div v-for="(mat, index) in item.materials" :key="index" class="text-xs">
                        {{ mat.uom }}
                      </div>
                    </div>
                    <div v-else>{{ item.UoM }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                    <div v-if="item.materials && item.materials.length > 1" class="space-y-1">
                      <div v-for="(mat, index) in item.materials" :key="index" class="text-xs">
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
                <tr v-for="mat in materialList" :key="mat.material_name" class="hover:bg-blue-50 transition">
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

      <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.ml-13 {
  margin-left: 3.25rem;
}
</style>