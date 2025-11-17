<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useActivityReportStore } from '../stores/activityReport'
import { usePlanningStore } from '../stores/planning'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { onMounted, ref, computed, watch } from 'vue'

const authStore = useAuthStore()
const activityReportStore = useActivityReportStore()
const planningStore = usePlanningStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const router = useRouter()

const selectedReport = ref('activity')
const filterDate = ref('')
const filterDatePlanning = ref('')
const isRefreshing = ref(false)

// 🔁 Refresh semua data
const refreshData = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([
      activityReportStore.fetchAll(),
      planningStore.fetchAll(),
      batchStore.getBatches(),
      locationStore.fetchAll()
    ])
    console.log('✅ All data refreshed')
    console.log('📋 Total reports loaded:', activityReportStore.reports.length)
    console.log('📅 Total planning loaded:', planningStore.plannings.length)
  } catch (error) {
    console.error('❌ Error refreshing data:', error)
  } finally {
    isRefreshing.value = false
  }
}

// 🧭 Saat halaman pertama kali dibuka
onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }
  await refreshData()
})

// 🔙 Refresh otomatis ketika kembali dari halaman lain
watch(() => router.currentRoute.value, (newRoute, oldRoute) => {
  if (newRoute.name === 'reportActivityList') {
    const fromPages = ['reportActivityReview', 'reportActivityEdit', 'reportActivityView', 'planningReview', 'planningEdit', 'planningView']
    if (oldRoute && fromPages.includes(oldRoute.name)) {
      console.log('🔄 Auto-refreshing from:', oldRoute.name)
      setTimeout(refreshData, 300)
    }
  }
})

// Helper untuk nama batch & lokasi
const getBatchName = (batchId) => {
  const batch = batchStore.batches.find(b => b.batch_id === batchId)
  return batch?.batch_name || `Batch ${batchId}`
}

const getLocationName = (locationId) => {
  const location = locationStore.locations.find(l => l.location_id === locationId)
  return location?.location || `Location ${locationId}`
}

// 📋 Activity Reports
const activityReports = computed(() => {
  let reports = activityReportStore.reports.map(report => ({
    report_id: String(report.report_id),
    location_id: report.location_id,
    location_name: getLocationName(report.location_id),
    batch_id: report.batch_id,
    batch_name: getBatchName(report.batch_id),
    report_date: report.report_date,
    report_status: report.report_status,
    created_at: report.created_at,
    updated_at: report.updated_at
  }))
  
  if (filterDate.value) {
    reports = reports.filter(r => r.report_date === filterDate.value)
  }
  
  reports.sort((a, b) => {
    const dateCompare = new Date(b.report_date) - new Date(a.report_date)
    if (dateCompare !== 0) return dateCompare
    return Number(b.report_id) - Number(a.report_id)
  })
  
  return reports
})

const handleReportClick = (report) => {
  if (!report || !report.report_id) {
    alert("⚠️ Report ID tidak ditemukan!")
    return
  }

  let routeName = 'reportActivityReview'
  
  if (report.report_status === 'needRevision') {
    routeName = 'reportActivityEdit'
  } else if (report.report_status === 'approved') {
    routeName = 'reportActivityView'
  }

  router.push({
    name: routeName,
    params: { report_id: report.report_id }
  })
}

// 📅 Planning Reports
const planningReports = computed(() => {
  let plannings = planningStore.plannings.map(planning => ({
    planning_id: String(planning.planning_id),
    location_id: planning.location_id,
    location_name: getLocationName(planning.location_id),
    batch_id: planning.batch_id,
    batch_name: getBatchName(planning.batch_id),
    report_date: planning.report_date,
    phase_plan: planning.phase_plan || 'N/A',
    status: planning.status || 'draft',
    created_by: planning.created_by || 'N/A',
    created_at: planning.created_at,
    updated_at: planning.updated_at
  }))
  
  if (filterDatePlanning.value) {
    plannings = plannings.filter(p => p.report_date === filterDatePlanning.value)
  }
  
  plannings.sort((a, b) => {
    const dateCompare = new Date(b.report_date) - new Date(a.report_date)
    if (dateCompare !== 0) return dateCompare
    return Number(b.planning_id) - Number(a.planning_id)
  })
  
  return plannings
})

const handlePlanningClick = (planning) => {
  if (!planning || !planning.planning_id) {
    alert("⚠️ Planning ID tidak ditemukan!")
    return
  }

  let routeName = 'planningReview'
  
  if (planning.status === 'revision') {
    routeName = 'planningEdit'
  } else if (planning.status === 'approved') {
    routeName = 'planningView'
  }

  router.push({
    name: routeName,
    params: { planning_id: planning.planning_id }
  })
}

// Status helpers
const getStatusText = (dbStatus) => {
  const statusMap = {
    'onReview': '⏳ Waiting Review',
    'needRevision': '🔄 Need Revision',
    'approved': '✅ Approved'
  }
  return statusMap[dbStatus] || '❓ Unknown'
}

const getStatusColorClass = (dbStatus) => {
  const colorMap = {
    'onReview': 'bg-yellow-100 text-yellow-800',
    'needRevision': 'bg-red-100 text-red-800',
    'approved': 'bg-green-100 text-green-800'
  }
  return colorMap[dbStatus] || 'bg-gray-100 text-gray-800'
}

const getPlanningStatusText = (status) => {
  const statusMap = {
    'draft': '📝 Draft',
    'revision': '🔄 Revision',
    'approved': '✅ Approved'
  }
  return statusMap[status] || '❓ Unknown'
}

const getPlanningStatusColorClass = (status) => {
  const colorMap = {
    'draft': 'bg-gray-100 text-gray-800',
    'revision': 'bg-red-100 text-red-800',
    'approved': 'bg-green-100 text-green-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

const isLoading = computed(() =>
  activityReportStore.loading ||
  planningStore.loading ||
  batchStore.loading ||
  locationStore.loading
)

const getCurrentTime = () => {
  return new Date().toLocaleTimeString('id-ID')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <RouterLink 
              to="/dashboard"
              class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </RouterLink>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                  📊
                </span>
                Report List GreenHouse
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Laporan Aktivitas & Planning</p>
            </div>
          </div>

          <!-- Toggle Buttons Desktop -->
          <div class="hidden md:flex gap-3">
            <button 
              @click="selectedReport = 'activity'"
              :class="selectedReport === 'activity' 
                ? 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white shadow-md' 
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0071f3]'"
              class="px-5 py-2.5 rounded-lg font-semibold transition-all text-sm hover:shadow"
            >
              📋 Activity
            </button>
            <button 
              @click="selectedReport = 'planning'"
              :class="selectedReport === 'planning' 
                ? 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white shadow-md' 
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0071f3]'"
              class="px-5 py-2.5 rounded-lg font-semibold transition-all text-sm hover:shadow"
            >
              📅 Planning
            </button>
          </div>
        </div>

        <!-- Toggle Buttons Mobile -->
        <div class="flex md:hidden gap-3 mt-4">
          <button 
            @click="selectedReport = 'planning'"
            :class="selectedReport === 'planning' 
              ? 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white shadow-md' 
              : 'bg-white text-gray-700 border-2 border-gray-200'"
            class="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm"
          >
            📅 Planning
          </button>
          <button 
            @click="selectedReport = 'activity'"
            :class="selectedReport === 'activity' 
              ? 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white shadow-md' 
              : 'bg-white text-gray-700 border-2 border-gray-200'"
            class="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm"
          >
            📋 Activity
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Loading State -->
      <div v-if="isLoading && !isRefreshing" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data...</p>
        </div>
      </div>

      <!-- Report Activity List -->
      <div v-else-if="selectedReport === 'activity'">
        <!-- Filter & Action Bar -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter & Actions</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-5">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div class="flex items-center gap-3 flex-wrap">
                <label class="text-sm font-semibold text-gray-700">Filter Tanggal:</label>
                <div class="flex items-center gap-2 px-4 py-2 border-2 border-[#0071f3] rounded-lg bg-gray-50">
                  <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                  </svg>
                  <input 
                    type="date" 
                    v-model="filterDate"
                    class="outline-none text-gray-700 bg-transparent font-medium" 
                  />
                </div>
                
                <button
                  @click="refreshData"
                  :disabled="isRefreshing"
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg 
                    class="w-5 h-5" 
                    :class="{ 'animate-spin': isRefreshing }"
                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"
                  >
                    <path d="M142.9 142.9c-17.5 17.5-30.1 38-37.8 59.8c-5.9 16.7-24.2 25.4-40.8 19.5s-25.4-24.2-19.5-40.8C55.6 150.7 73.2 122 97.6 97.6c87.2-87.2 228.3-87.5 315.8-1L455 55c6.9-6.9 17.2-8.9 26.2-5.2s14.8 12.5 14.8 22.2l0 128c0 13.3-10.7 24-24 24l-8.4 0c0 0 0 0 0 0L344 224c-9.7 0-18.5-5.8-22.2-14.8s-1.7-19.3 5.2-26.2l41.1-41.1c-62.6-61.5-163.1-61.2-225.3 1zM16 312c0-13.3 10.7-24 24-24l7.6 0 .7 0L168 288c9.7 0 18.5 5.8 22.2 14.8s1.7 19.3-5.2 26.2l-41.1 41.1c62.6 61.5 163.1 61.2 225.3-1c17.5-17.5 30.1-38 37.8-59.8c5.9-16.7 24.2-25.4 40.8-19.5s25.4 24.2 19.5 40.8c-10.8 30.6-28.4 59.3-52.9 83.8c-87.2 87.2-228.3 87.5-315.8 1L57 457c-6.9 6.9-17.2 8.9-26.2 5.2S16 449.7 16 440l0-119.6 0-.7 0-7.6z"/>
                  </svg>
                  {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
                </button>
              </div>

              <router-link 
                to="/formReportActivity"
                class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
                </svg>
                Tambah Laporan Baru
              </router-link>
            </div>
          </div>
        </div>

        <!-- Activity Reports -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Laporan Aktivitas ({{ activityReports.length }})
            </h2>
            <div class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
              Last updated: {{ getCurrentTime() }}
            </div>
          </div>
          
          <div v-if="activityReports.length === 0" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-12 text-center">
            <div class="text-6xl mb-4">📋</div>
            <p class="text-gray-500 font-semibold">Belum ada laporan aktivitas</p>
            <p class="text-sm text-gray-400 mt-2">Klik tombol "Tambah Laporan Baru" untuk membuat laporan</p>
          </div>

          <div v-else class="grid grid-cols-1 gap-5">
            <div 
              v-for="report in activityReports" 
              :key="report.report_id"
              @click="handleReportClick(report)"
              class="group cursor-pointer"
            >
              <div 
                class="bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] shadow-sm hover:shadow-xl transition-all p-6 transform hover:-translate-y-1"
              >
                <div class="flex flex-col md:flex-row justify-between md:items-start gap-4">
                  <div class="flex-1 space-y-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0">
                        📋
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <p class="font-bold text-gray-900 text-lg">{{ report.location_name }}</p>
                          <span class="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                            #{{ report.report_id }}
                          </span>
                        </div>
                        <p class="text-sm text-gray-500">{{ report.batch_name }}</p>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      <div class="bg-gray-50 rounded-lg p-3">
                        <p class="text-xs text-gray-500 font-semibold mb-1">📅 Tanggal Laporan</p>
                        <p class="text-sm font-bold text-gray-900">{{ report.report_date }}</p>
                      </div>
                      <div class="bg-blue-50 rounded-lg p-3">
                        <p class="text-xs text-blue-600 font-semibold mb-1">🆔 Report ID</p>
                        <p class="text-sm font-bold text-blue-900">#{{ report.report_id }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col items-end gap-3">
                    <span 
                      class="text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap"
                      :class="getStatusColorClass(report.report_status)"
                    >
                      {{ getStatusText(report.report_status) }}
                    </span>
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-[#0071f3] transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor">
                      <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Planning List -->
      <div v-else-if="selectedReport === 'planning'">
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter & Actions</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-5">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div class="flex items-center gap-3 flex-wrap">
                <label class="text-sm font-semibold text-gray-700">Filter Tanggal:</label>
                <div class="flex items-center gap-2 px-4 py-2 border-2 border-[#0071f3] rounded-lg bg-gray-50">
                  <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                  </svg>
                  <input 
                    type="date" 
                    v-model="filterDatePlanning"
                    class="outline-none text-gray-700 bg-transparent font-medium" 
                  />
                </div>
                
                <button
                  @click="refreshData"
                  :disabled="isRefreshing"
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg 
                    class="w-5 h-5" 
                    :class="{ 'animate-spin': isRefreshing }"
                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"
                  >
                    <path d="M142.9 142.9c-17.5 17.5-30.1 38-37.8 59.8c-5.9 16.7-24.2 25.4-40.8 19.5s-25.4-24.2-19.5-40.8C55.6 150.7 73.2 122 97.6 97.6c87.2-87.2 228.3-87.5 315.8-1L455 55c6.9-6.9 17.2-8.9 26.2-5.2s14.8 12.5 14.8 22.2l0 128c0 13.3-10.7 24-24 24l-8.4 0c0 0 0 0 0 0L344 224c-9.7 0-18.5-5.8-22.2-14.8s-1.7-19.3 5.2-26.2l41.1-41.1c-62.6-61.5-163.1-61.2-225.3 1zM16 312c0-13.3 10.7-24 24-24l7.6 0 .7 0L168 288c9.7 0 18.5 5.8 22.2 14.8s1.7 19.3-5.2 26.2l-41.1 41.1c62.6 61.5 163.1 61.2 225.3-1c17.5-17.5 30.1-38 37.8-59.8c5.9-16.7 24.2-25.4 40.8-19.5s25.4 24.2 19.5 40.8c-10.8 30.6-28.4 59.3-52.9 83.8c-87.2 87.2-228.3 87.5-315.8 1L57 457c-6.9 6.9-17.2 8.9-26.2 5.2S16 449.7 16 440l0-119.6 0-.7 0-7.6z"/>
                  </svg>
                  {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
                </button>
              </div>

              <router-link 
                to="/formPlanning"
                class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
                </svg>
                Tambah Planning Baru
              </router-link>
            </div>
          </div>
        </div>

        <!-- Planning Reports -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Laporan Planning ({{ planningReports.length }})
            </h2>
            <div class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
              Last updated: {{ getCurrentTime() }}
            </div>
          </div>
          
          <div v-if="planningReports.length === 0" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-12 text-center">
            <div class="text-6xl mb-4">📅</div>
            <p class="text-gray-500 font-semibold">Belum ada planning</p>
            <p class="text-sm text-gray-400 mt-2">Klik tombol "Tambah Planning Baru" untuk membuat planning</p>
          </div>

          <div v-else class="grid grid-cols-1 gap-5">
            <div 
              v-for="planning in planningReports" 
              :key="planning.planning_id"
              @click="handlePlanningClick(planning)"
              class="group cursor-pointer"
            >
              <div 
                class="bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] shadow-sm hover:shadow-xl transition-all p-6 transform hover:-translate-y-1"
              >
                <div class="flex flex-col md:flex-row justify-between md:items-start gap-4">
                  <div class="flex-1 space-y-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0">
                        📅
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <p class="font-bold text-gray-900 text-lg">{{ planning.location_name }}</p>
                          <span class="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                            #{{ planning.planning_id }}
                          </span>
                        </div>
                        <p class="text-sm text-gray-500">{{ planning.batch_name }} • {{ planning.phase_plan }}</p>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                      <div class="bg-gray-50 rounded-lg p-3">
                        <p class="text-xs text-gray-500 font-semibold mb-1">📅 Tanggal</p>
                        <p class="text-sm font-bold text-gray-900">{{ planning.report_date }}</p>
                      </div>
                      <div class="bg-blue-50 rounded-lg p-3">
                        <p class="text-xs text-blue-600 font-semibold mb-1">🆔 Planning ID</p>
                        <p class="text-sm font-bold text-blue-900">#{{ planning.planning_id }}</p>
                      </div>
                      <div class="bg-purple-50 rounded-lg p-3">
                        <p class="text-xs text-purple-600 font-semibold mb-1">👤 Dibuat oleh</p>
                        <p class="text-sm font-bold text-purple-900">{{ planning.created_by }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col items-end gap-3">
                    <span 
                      class="text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap"
                      :class="getPlanningStatusColorClass(planning.status)"
                    >
                      {{ getPlanningStatusText(planning.status) }}
                    </span>
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-[#0071f3] transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor">
                      <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="text-center py-10 mt-8 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}
</style>