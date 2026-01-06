<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ModalView from '@/components/ModalView.vue'
import PotatoProgressBar from '@/components/PotatoProgressBar.vue'
import DamageRepairModal from '@/components/DamageRepairModal.vue'
import logoPG from '../assets/logoPG.svg'
import * as XLSX from 'xlsx'
import html2pdf from 'html2pdf.js'
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
  Filler
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
  Filler
)

import { useAuthStore } from '../stores/auth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const batchId = computed(() => {
  const rawId = route.params.batch_id || route.params.id
  return parseInt(rawId)
})

const batchDetail = ref(null) 
const locationInfo = ref(null)
const environmentData = ref(null)

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

// ✅ TAMBAHAN: State untuk data pekerja
const workerSummary = ref([])
const totalLaborCost = ref(0)

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

const chartData = ref({
  faseChart: null,
  kepemilikanChart: null,
  penjualanChart: null
})

const progres = computed(() => ({
  planletToG0: successRate.value.planlet.percentage,
  G0ToG1: successRate.value.g0.percentage,
  G1ToG2: successRate.value.g1.percentage,
}));

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
  await loadBatchDetailData()
}

const normalizePhase = (phaseName) => {
  const phase = phaseName?.toLowerCase() || '';
  
  if (phase.includes('planlet')) return 'Planlet';
  if (phase.includes('g0')) return 'G0';
  if (phase === 'g1' || phase.includes('g1')) return 'G1';
  if (phase === 'g2' || phase.includes('g2')) return 'G2';
  
  return null; 
}

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

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const formatTime = (timeString) => {
  if (!timeString) return '-'
  return timeString.substring(0, 5)
}

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
      console.log("Data lingkungan HARI INI tidak ditemukan, mereset tampilan.")
      environmentData.value = null;
    } else {
      environmentData.value = data
    }
    
  } catch (err) {
    console.error("Error loading environment data:", err)
    environmentData.value = null
  }
}

const loadBatchDetailData = async () => {
  if (isNaN(batchId.value)) return;

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
    return;
  }
  
  batchDetail.value = batch;
  locationInfo.value = batch.gh_location;

  await loadEnvironmentData(batch.location_id);
  
  Object.assign(batchSummary.value, { totalPlanlet: 0, g0Terjual: 0, g0Diproduksi: 0, g2Diproduksi: 0, g2Terjual: 0, pendapatan: 0, sukses: 0 });
  Object.keys(successRate.value).forEach(key => {
    Object.assign(successRate.value[key], { total: 0, kuning: 0, kutilang: 0, busuk: 0, damaged: 0, dead: 0, success: 0, percentage: 0 });
  });

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

  let grandTotalSuccess = 0;
  let grandTotalTotal = 0;

  Object.keys(successRate.value).forEach(key => {
    const phase = successRate.value[key];
    phase.success = Math.max(0, phase.total - phase.damaged - phase.dead);
    phase.percentage = phase.total > 0 
      ? ((phase.success / phase.total) * 100).toFixed(1) 
      : 0;
      
    grandTotalSuccess += phase.success;
    grandTotalTotal += phase.total;
  });

  batchSummary.value.sukses = grandTotalTotal > 0 
      ? ((grandTotalSuccess / grandTotalTotal) * 100).toFixed(1) 
      : 0;

  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("qty, price, category")
    .eq("batch_id", batchId.value);

  if (salesData) {
    batchSummary.value.pendapatan = salesData.reduce((total, item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.price) || 0;
      
      if (item.category?.toLowerCase().includes('g0')) {
          batchSummary.value.g0Terjual += qty;
      } else if (item.category?.toLowerCase().includes('g2')) {
          batchSummary.value.g2Terjual += qty;
      }

      return total + (qty * price);
    }, 0);
  }
  
  await loadActivityAndMaterialData(batch.batch_id);
  await initCharts();
}

const loadActivityAndMaterialData = async (batch_id) => {
  try {
    activityReport.value = []
    materialList.value = []
    totalMaterial.value = 0
    workerSummary.value = []
    totalLaborCost.value = 0

    // 1️⃣ Ambil REPORT APPROVED
    const { data: reports, error: reportError } = await supabase
      .from('gh_report')
      .select('report_id, report_date')
      .eq('batch_id', batch_id)
      .eq('report_status', 'approved')

    if (reportError || !reports?.length) return

    const reportMap = {}
    reports.forEach(r => {
      reportMap[r.report_id] = r.report_date
    })

    // 2️⃣ Ambil ACTIVITY + MATERIAL + WORKERS
    const { data: activities, error: activityError } = await supabase
      .from('gh_activity')
      .select(`
        activity_id,
        act_name,
        manpower,
        report_id,
        gh_material_used (
          material_name,
          qty,
          uom,
          unit_price
        ),
        gh_activity_worker (
          activity_worker_id,
          hours_worked,
          hourly_rate_snapshot,
          worker:gh_worker (
            name,
            role
          )
        )
      `)
      .in('report_id', reports.map(r => r.report_id))

    if (activityError || !activities?.length) return

    // 3️⃣ Mapping ACTIVITY dengan MATERIAL & WORKERS
    activityReport.value = activities.map(act => {
      const materials = act.gh_material_used || []
      const workers = act.gh_activity_worker || []

      // Hitung total material
      const materialTotal = materials.reduce((sum, m) => {
        const qty = Number(m.qty) || 0
        const price = Number(m.unit_price) || 0
        return qty > 0 ? sum + qty * price : sum
      }, 0)

      // Hitung total labor
      const laborTotal = workers.reduce((sum, w) => {
        const hours = Number(w.hours_worked) || 0
        const rate = Number(w.hourly_rate_snapshot) || 0
        return sum + (hours * rate)
      }, 0)

      return {
        activity_id: act.activity_id,
        tanggal: reportMap[act.report_id]
          ? new Date(reportMap[act.report_id]).toLocaleDateString('id-ID')
          : '-',
        Activity: act.act_name || '-',
        manpower: act.manpower ?? '-',
        materials,
        workers,
        material_total: materialTotal,
        labor_total: laborTotal,
        row_total: materialTotal + laborTotal // Total keseluruhan
      }
    })

    // 4️⃣ Ringkasan Material
    const materialMap = {}
    let grandMaterialTotal = 0

    activities.forEach(act => {
      act.gh_material_used?.forEach(mat => {
        const qty = Number(mat.qty) || 0
        const price = Number(mat.unit_price) || 0
        const total = qty * price

        grandMaterialTotal += total

        if (!materialMap[mat.material_name]) {
          materialMap[mat.material_name] = {
            material_name: mat.material_name,
            Qty: 0,
            UoM: mat.uom,
            total_harga: 0,
            total_unit_price: 0,
            price_count: 0
          }
        }

        materialMap[mat.material_name].Qty += qty
        materialMap[mat.material_name].total_harga += total

        if (price > 0) {
          materialMap[mat.material_name].total_unit_price += price
          materialMap[mat.material_name].price_count += 1
        }
      })
    })

    materialList.value = Object.values(materialMap).map(mat => ({
      material_name: mat.material_name,
      Qty: mat.Qty,
      UoM: mat.UoM,
      total_harga: mat.total_harga,
      harga_satuan: mat.Qty > 0
        ? Math.round(mat.total_harga / mat.Qty)
        : 0
    }))

    totalMaterial.value = grandMaterialTotal

    // 5️⃣ BARU: Ringkasan Pekerja
    const workerMap = {}
    let grandLaborTotal = 0

    activities.forEach(act => {
      act.gh_activity_worker?.forEach(aw => {
        const workerName = aw.worker?.name || 'Unknown'
        const workerRole = aw.worker?.role || '-'
        const hours = Number(aw.hours_worked) || 0
        const rate = Number(aw.hourly_rate_snapshot) || 0
        const total = hours * rate

        grandLaborTotal += total

        if (!workerMap[workerName]) {
          workerMap[workerName] = {
            worker_name: workerName,
            worker_role: workerRole,
            total_hours: 0,
            avg_hourly_rate: 0,
            total_cost: 0,
            rate_sum: 0,
            rate_count: 0
          }
        }

        workerMap[workerName].total_hours += hours
        workerMap[workerName].total_cost += total

        if (rate > 0) {
          workerMap[workerName].rate_sum += rate
          workerMap[workerName].rate_count += 1
        }
      })
    })

    workerSummary.value = Object.values(workerMap).map(worker => ({
      worker_name: worker.worker_name,
      worker_role: worker.worker_role,
      total_hours: worker.total_hours,
      avg_hourly_rate: worker.rate_count > 0
        ? Math.round(worker.rate_sum / worker.rate_count)
        : 0,
      total_cost: worker.total_cost
    }))

    totalLaborCost.value = grandLaborTotal

  } catch (err) {
    console.error('❌ loadActivityAndMaterialData:', err)
    activityReport.value = []
    materialList.value = []
    totalMaterial.value = 0
    workerSummary.value = []
    totalLaborCost.value = 0
  }
}

const initCharts = async () => {
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
    .eq("batch_id", batchId.value);

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
  const canvas = document.getElementById('keuanganChart');
  if (!canvas || isNaN(batchId.value)) return;

  if (chartData.value.penjualanChart) {
    chartData.value.penjualanChart.destroy();
  }

  const { data: salesData } = await supabase
    .from("gh_sales")
    .select("date, qty, price")
    .eq("batch_id", batchId.value)
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
    router.push('/dashboard'); 
    return;
  }
  await loadBatchDetailData();
});

const getPhaseColors = (phaseKey) => {
    const BROWN_START = '#D4A574'; 
    const BROWN_END = '#B88A5C';
    const REPAIR_BUTTON_BG = '#FFC107'; 
    const REPAIR_BUTTON_HOVER = '#FFA000';
    
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

// ✅ FUNGSI EXPORT TO EXCEL
const exportToExcel = () => {
  try {
    const wb = XLSX.utils.book_new()
    
    // Sheet 1: Ringkasan Batch
    const summaryData = [
      ['LAPORAN DETAIL BATCH'],
      ['Batch', batchDetail.value?.batch_name || '-'],
      ['Lokasi', locationInfo.value?.location || '-'],
      [''],
      ['RINGKASAN PRODUKSI'],
      ['Total Planlet', batchSummary.value.totalPlanlet],
      ['G0 Diproduksi', batchSummary.value.g0Diproduksi],
      ['G0 Terjual', batchSummary.value.g0Terjual],
      ['G2 Diproduksi', batchSummary.value.g2Diproduksi],
      ['G2 Terjual', batchSummary.value.g2Terjual],
      ['Tingkat Keberhasilan', batchSummary.value.sukses + '%'],
      [''],
      ['BIAYA PRODUKSI'],
      ['Total Material', `Rp ${totalMaterial.value.toLocaleString('id-ID')}`],
      ['Total Tenaga Kerja', `Rp ${totalLaborCost.value.toLocaleString('id-ID')}`],
      ['TOTAL BIAYA', `Rp ${(totalMaterial.value + totalLaborCost.value).toLocaleString('id-ID')}`]
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan')
    
    // Sheet 2: Material
    if (materialList.value.length > 0) {
      const materialData = [
        ['BAHAN BAKU YANG DIGUNAKAN'],
        [''],
        ['Nama Material', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total Harga']
      ]
      materialList.value.forEach(mat => {
        materialData.push([
          mat.material_name,
          mat.Qty,
          mat.UoM,
          mat.harga_satuan,
          mat.total_harga
        ])
      })
      materialData.push(['', '', '', 'TOTAL:', totalMaterial.value])
      const ws2 = XLSX.utils.aoa_to_sheet(materialData)
      XLSX.utils.book_append_sheet(wb, ws2, 'Material')
    }
    
    // Sheet 3: Tenaga Kerja
    if (workerSummary.value.length > 0) {
      const workerData = [
        ['TENAGA KERJA YANG DIGUNAKAN'],
        [''],
        ['Nama Pekerja', 'Jabatan', 'Total Jam', 'Upah/Jam', 'Total Biaya']
      ]
      workerSummary.value.forEach(worker => {
        workerData.push([
          worker.worker_name,
          worker.worker_role,
          worker.total_hours,
          worker.avg_hourly_rate,
          worker.total_cost
        ])
      })
      workerData.push(['', '', '', 'TOTAL:', totalLaborCost.value])
      const ws3 = XLSX.utils.aoa_to_sheet(workerData)
      XLSX.utils.book_append_sheet(wb, ws3, 'Tenaga Kerja')
    }
    
    // Sheet 4: Aktivitas
    if (activityReport.value.length > 0) {
      const activityData = [
        ['LAPORAN AKTIVITAS'],
        [''],
        ['Tanggal', 'Aktivitas', 'Material', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total Material', 'Pekerja', 'Total Labor', 'Total Biaya']
      ]
      activityReport.value.forEach(act => {
        const materialRows = act.materials?.length || 1
        const workerNames = act.workers?.map(w => `${w.worker?.name} (${w.hours_worked}h)`).join(', ') || '-'
        
        if (act.materials?.length > 0) {
          act.materials.forEach((mat, idx) => {
            activityData.push([
              idx === 0 ? act.tanggal : '',
              idx === 0 ? act.Activity : '',
              mat.material_name,
              mat.qty,
              mat.uom,
              mat.unit_price,
              idx === 0 ? act.material_total : '',
              idx === 0 ? workerNames : '',
              idx === 0 ? act.labor_total : '',
              idx === 0 ? act.row_total : ''
            ])
          })
        } else {
          activityData.push([
            act.tanggal,
            act.Activity,
            '-',
            0,
            '-',
            0,
            act.material_total,
            workerNames,
            act.labor_total,
            act.row_total
          ])
        }
      })
      
      const totalMaterialAct = activityReport.value.reduce((sum, item) => sum + (item.material_total || 0), 0)
      const totalLaborAct = activityReport.value.reduce((sum, item) => sum + (item.labor_total || 0), 0)
      const totalAct = activityReport.value.reduce((sum, item) => sum + (item.row_total || 0), 0)
      
      activityData.push(['', '', '', '', '', 'TOTAL:', totalMaterialAct, '', totalLaborAct, totalAct])
      const ws4 = XLSX.utils.aoa_to_sheet(activityData)
      XLSX.utils.book_append_sheet(wb, ws4, 'Aktivitas')
    }
    
    const fileName = `Batch_${batchDetail.value?.batch_name || batchId.value}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
    
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    alert('Gagal export ke Excel: ' + error.message)
  }
}

// ✅ FUNGSI EXPORT TO PDF
const exportToPDF = async () => {
  try {
    const element = document.getElementById('exportArea')
    if (!element) {
      alert('Area export tidak ditemukan')
      return
    }
    
    // Sembunyikan tombol export saat PDF
    const buttons = document.querySelectorAll('.export-hide')
    buttons.forEach(btn => btn.style.display = 'none')
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Batch_${batchDetail.value?.batch_name || batchId.value}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        scrollY: 0,
        windowHeight: element.scrollHeight
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }
    
    await html2pdf().set(opt).from(element).save()
    
    // Tampilkan kembali tombol
    buttons.forEach(btn => btn.style.display = '')
    
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    alert('Gagal export ke PDF: ' + error.message)
    
    // Pastikan tombol muncul kembali
    const buttons = document.querySelectorAll('.export-hide')
    buttons.forEach(btn => btn.style.display = '')
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
          <div class="flex items-center gap-3 export-hide">
            <button 
              @click="exportToExcel" 
              class="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border-2 border-gray-200 hover:border-green-500 transition font-medium text-xs sm:text-sm shadow-sm hover:shadow"
            >
              <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
              </svg>
              <span class="hidden sm:inline">Ekspor Excel</span>
              <span class="sm:hidden">Excel</span>
            </button>
            <button 
              @click="exportToPDF" 
              class="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition font-medium text-xs sm:text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd"/>
              </svg>
              <span class="hidden sm:inline">Ekspor PDF</span>
              <span class="sm:hidden">PDF</span>
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
                        <span class="font-bold text-gray-800 flex items-center gap-1">🌅 Pagi</span>
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
                        <span class="font-bold text-gray-800 flex items-center gap-1">☀️ Siang</span>
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
                        <span class="font-bold text-gray-800 flex items-center gap-1">🌥️ Sore</span>
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
                        <span class="font-bold text-gray-800 flex items-center gap-1">🌙 Malam</span>
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
        <div v-else class="bg-white rounded-xl border border-gray-200 border-dashed p-8 text-center">
          <p class="text-gray-400 text-sm italic">Tidak ada catatan lingkungan untuk hari ini</p>
        </div>
      </div>
      
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ringkasan Produksi</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <div class="bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-5 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
            <div class="relative">
              <p class="text-xs sm:text-sm font-semibold opacity-90 mb-1 sm:mb-2">Total Planlet</p>
              <h2 class="text-2xl sm:text-4xl font-bold mb-1">{{ batchSummary.totalPlanlet.toLocaleString('id-ID') }}</h2>
              <p class="text-xs opacity-75">🌱 Stok keseluruhan</p>
            </div>
          </div>

          <div class="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-xs sm:text-sm font-semibold text-gray-500 mb-1 sm:mb-2">G0 Terjual</p>
            <h2 class="text-2xl sm:text-4xl font-bold text-gray-900 mb-1">{{ batchSummary.g0Terjual.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">💰 Unit terjual</p>
          </div>

          <div class="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-xs sm:text-sm font-semibold text-gray-500 mb-1 sm:mb-2">G0 Diproduksi</p>
            <h2 class="text-2xl sm:text-4xl font-bold text-gray-900 mb-1">{{ batchSummary.g0Diproduksi.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">🏭 Unit produksi</p>
          </div>

          <div class="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-xs sm:text-sm font-semibold text-gray-500 mb-1 sm:mb-2">Total G2 Diproduksi</p>
            <h2 class="text-2xl sm:text-4xl font-bold text-gray-900 mb-1">{{ batchSummary.g2Diproduksi.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">✅ Produksi akhir</p>
          </div>

          <div class="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-xs sm:text-sm font-semibold text-gray-500 mb-1 sm:mb-2">Total G2 Terjual</p>
            <h2 class="text-2xl sm:text-4xl font-bold text-gray-900 mb-1">{{ batchSummary.g2Terjual.toLocaleString('id-ID') }}</h2>
            <p class="text-xs text-gray-500">📦 Distribusi selesai</p>
          </div>

          <div class="bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-5 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
            <div class="relative">
              <p class="text-xs sm:text-sm font-semibold opacity-90 mb-1 sm:mb-2">Tingkat Keberhasilan</p>
              <h2 class="text-2xl sm:text-4xl font-bold mb-1">{{ batchSummary.sukses }}%</h2>
              <p class="text-xs opacity-75">📊 Tingkat keberhasilan keseluruhan</p>
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
        
        <!-- Mobile Card View -->
        <div v-else class="block lg:hidden space-y-4">
          <div
            v-for="item in activityReport"
            :key="item.activity_id"
            class="bg-white rounded-xl border-2 border-gray-100 p-4 shadow-sm hover:shadow-lg transition-all"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="text-xs text-gray-500 mb-1">{{ item.tanggal || '-' }}</p>
                <h3 class="font-bold text-gray-900">{{ item.Activity }}</h3>
              </div>
            </div>
            
            <!-- Material Section -->
            <div v-if="item.materials?.length" class="mb-3">
              <p class="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <span>📦</span> Material
              </p>
              <div class="bg-green-50 rounded-lg p-2 space-y-1">
                <div v-for="(mat, index) in item.materials" :key="index" class="text-xs">
                  <div class="flex justify-between">
                    <span class="text-gray-600">{{ mat.material_name }}</span>
                    <span class="font-semibold">{{ Number(mat.qty ?? 0).toLocaleString('id-ID') }} {{ mat.uom }}</span>
                  </div>
                </div>
                <div class="pt-1 border-t border-green-200 flex justify-between font-bold text-green-700">
                  <span>Total Material:</span>
                  <span>Rp {{ (item.material_total || 0).toLocaleString('id-ID') }}</span>
                </div>
              </div>
            </div>
            
            <!-- Worker Section -->
            <div v-if="item.workers?.length" class="mb-3">
              <p class="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <span>👷</span> Pekerja
              </p>
              <div class="bg-orange-50 rounded-lg p-2 space-y-1">
                <div v-for="(worker, index) in item.workers" :key="index" class="text-xs">
                  <div class="flex justify-between">
                    <span class="text-gray-600">{{ worker.worker?.name }}</span>
                    <span class="font-semibold">{{ Number(worker.hours_worked || 0).toLocaleString('id-ID') }}h</span>
                  </div>
                </div>
                <div class="pt-1 border-t border-orange-200 flex justify-between font-bold text-orange-700">
                  <span>Total Labor:</span>
                  <span>Rp {{ (item.labor_total || 0).toLocaleString('id-ID') }}</span>
                </div>
              </div>
            </div>
            
            <!-- Total -->
            <div class="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span class="font-bold text-gray-900">Total Biaya:</span>
              <span class="text-lg font-bold text-blue-700">Rp {{ (item.row_total || 0).toLocaleString('id-ID') }}</span>
            </div>
          </div>
        </div>
        
        <!-- Desktop Table View -->
        <div v-if="activityReport.length > 0" class="hidden lg:block bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gradient-to-r from-[#0071f3] to-[#0060d1]">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Tanggal</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Aktivitas</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Bahan Baku</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Jumlah</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">UoM</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Harga satuan</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total Material</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Pekerja</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total Labor</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total Biaya</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="item in activityReport"
                  :key="item.activity_id"
                  class="hover:bg-blue-50 transition"
                >
                  <td class="px-6 py-4 text-sm text-gray-900">{{ item.tanggal || '-' }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ item.Activity }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">
                    <div v-if="item.materials?.length">
                      <div v-for="(mat, index) in item.materials" :key="index" class="text-xs">
                        • {{ mat.material_name }}
                      </div>
                    </div>
                    <div v-else>-</div>
                  </td>
                  <td class="px-6 py-4 text-sm font-semibold text-right">
                    <div v-if="item.materials?.length">
                      <div v-for="(mat, index) in item.materials" :key="index" class="text-xs">
                        {{ Number(mat.qty ?? 0).toLocaleString('id-ID') }}
                      </div>
                    </div>
                    <div v-else>0</div>
                  </td>
                  <td class="px-6 py-4 text-sm text-center text-gray-600">
                    <div v-if="item.materials?.length">
                      <div v-for="(mat, index) in item.materials" :key="index" class="text-xs">
                        {{ mat.uom || '-' }}
                      </div>
                    </div>
                    <div v-else>-</div>
                  </td>
                  <td class="px-6 py-4 text-sm text-right">
                    <div v-if="item.materials?.length">
                      <div v-for="(mat, index) in item.materials" :key="index" class="text-xs">
                        Rp {{ Number(mat.unit_price ?? 0).toLocaleString('id-ID') }}
                      </div>
                    </div>
                    <div v-else>Rp 0</div>
                  </td>
                  <td class="px-6 py-4 text-sm font-bold text-green-700 text-right">
                    Rp {{ (item.material_total || 0).toLocaleString('id-ID') }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-700">
                    <div v-if="item.workers?.length">
                      <div v-for="(worker, index) in item.workers" :key="index" class="text-xs">
                        • {{ worker.worker?.name }} ({{ Number(worker.hours_worked || 0).toLocaleString('id-ID') }}h)
                      </div>
                    </div>
                    <div v-else>-</div>
                  </td>
                  <td class="px-6 py-4 text-sm font-bold text-orange-700 text-right">
                    Rp {{ (item.labor_total || 0).toLocaleString('id-ID') }}
                  </td>
                  <td class="px-6 py-4 text-sm font-bold text-blue-700 text-right">
                    Rp {{ (item.row_total || 0).toLocaleString('id-ID') }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-gradient-to-r from-blue-50 to-white">
                  <td colspan="6" class="px-6 py-4 text-right text-sm font-bold text-gray-900">Total Biaya Material:</td>
                  <td class="px-6 py-4 text-sm font-bold text-green-600 text-right">
                    Rp {{ activityReport.reduce((sum, item) => sum + (item.material_total || 0), 0).toLocaleString('id-ID') }}
                  </td>
                  <td class="px-6 py-4 text-right text-sm font-bold text-gray-900">Total Biaya Labor:</td>
                  <td class="px-6 py-4 text-sm font-bold text-orange-600 text-right">
                    Rp {{ activityReport.reduce((sum, item) => sum + (item.labor_total || 0), 0).toLocaleString('id-ID') }}
                  </td>
                  <td class="px-6 py-4 text-sm font-bold text-blue-600 text-right">
                    Rp {{ activityReport.reduce((sum, item) => sum + (item.row_total || 0), 0).toLocaleString('id-ID') }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Bahan Baku yang Digunakan (Ringkasan)</h2>
        <div v-if="materialList.length === 0" class="bg-white rounded-2xl border-2 border-gray-100 p-8 text-center text-gray-500">
          Belum ada data bahan baku
        </div>
        <div v-else class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gradient-to-r from-[#0071f3] to-[#0060d1]">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Nama Material</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Jumlah Total</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">UoM</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Harga Satuan Rata-Rata</th>
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

      <!-- ✅ SECTION BARU: Ringkasan Tenaga Kerja -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tenaga Kerja yang Digunakan (Ringkasan)</h2>
        <div v-if="workerSummary.length === 0" class="bg-white rounded-2xl border-2 border-gray-100 p-8 text-center text-gray-500">
          Belum ada data tenaga kerja
        </div>
        <div v-else class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gradient-to-r from-orange-500 to-orange-600">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Nama Pekerja</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Jabatan</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total Jam Kerja</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Upah/Jam Rata-rata</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total Biaya</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="worker in workerSummary" :key="worker.worker_name" class="hover:bg-orange-50 transition">
                  <td class="px-6 py-4 text-sm text-gray-900 font-medium">{{ worker.worker_name }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ worker.worker_role }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">{{ worker.total_hours.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }} jam</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">Rp {{ worker.avg_hourly_rate.toLocaleString('id-ID') }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-bold text-right">Rp {{ worker.total_cost.toLocaleString('id-ID') }}</td>
                </tr>
                <tr class="bg-gradient-to-r from-orange-50 to-white">
                  <td colspan="4" class="px-6 py-4 text-right text-sm font-bold text-gray-900">Grand Total Labor Cost:</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#0071f3] text-right">Rp {{ totalLaborCost.toLocaleString('id-ID') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ✅ SECTION: Total Biaya Keseluruhan -->
      <div class="mb-8">
        <div class="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="flex-1">
              <p class="text-xs sm:text-sm font-semibold opacity-90 mb-2">TOTAL BIAYA PRODUKSI</p>
              <h2 class="text-3xl sm:text-5xl font-bold mb-2 sm:mb-0">Rp {{ (totalMaterial + totalLaborCost).toLocaleString('id-ID') }}</h2>
              <div class="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-3 sm:mt-4 text-sm opacity-90">
                <div>
                  <span class="block text-xs mb-1">Material</span>
                  <span class="font-bold">Rp {{ totalMaterial.toLocaleString('id-ID') }}</span>
                </div>
                <div>
                  <span class="block text-xs mb-1">Tenaga Kerja</span>
                  <span class="font-bold">Rp {{ totalLaborCost.toLocaleString('id-ID') }}</span>
                </div>
              </div>
            </div>
            <div class="text-right self-end sm:self-auto">
              <div class="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center text-3xl sm:text-4xl">
                💰
              </div>
            </div>
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

    <!-- Modals -->
    <ModalView v-if="isOpen" @close="closeModal">
      <h2 class="text-xl font-bold mb-4">Detail Informasi</h2>
      <p>Konten modal di sini...</p>
    </ModalView>

    <DamageRepairModal
      v-if="isRepairModalOpen"
      :phase="selectedPhaseForRepair"
      :batch-id="batchId"
      @close="closeRepairModal"
      @success="handleRepairSuccess"
    />
  </div>
</template>

<style scoped>
.ml-13 {
  margin-left: 3.25rem;
}
</style>