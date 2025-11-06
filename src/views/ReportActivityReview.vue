<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useActivityReportStore } from '../stores/activityReport'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { usePotatoActivityStore } from '../stores/potatoActivity'
import { useMaterialStore } from '../stores/material'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const activityReportStore = useActivityReportStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const potatoActivityStore = usePotatoActivityStore()
const materialStore = useMaterialStore()

const reportId = ref(route.query.id || null)
const loading = ref(true)
const processing = ref(false)
const error = ref(null)

const reportData = ref(null)
const groupedReports = ref([])
const revisionNotes = ref('')
const showRevisionModal = ref(false)

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  if (!reportId.value) {
    alert('Report ID tidak ditemukan')
    router.push('/reportActivityList')
    return
  }

  try {
    loading.value = true
    
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll(),
      potatoActivityStore.fetchAll(),
      materialStore.fetchAll()
    ])

    const { data, error: fetchError } = await activityReportStore.fetchById(reportId.value)
    
    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (!data) {
      throw new Error('Laporan tidak ditemukan')
    }

    // Check status
    if (data.report_status === 'approved') {
      alert('⚠️ Laporan ini sudah disetujui dan tidak dapat direview lagi')
      router.push('/reportActivityList')
      return
    } else if (data.report_status === 'needRevision') {
      alert('⚠️ Laporan ini sedang dalam proses revisi oleh staff')
      router.push('/reportActivityList')
      return
    } else if (data.report_status !== 'onReview') {
      alert('⚠️ Status laporan tidak valid untuk direview')
      router.push('/reportActivityList')
      return
    }

    reportData.value = data
    
    // Fetch all related reports (same batch, date, location - TANPA filter typedamage_id)
    const { data: allReports } = await activityReportStore.fetchAll()
    
    const relatedReports = allReports.filter(r => 
      r.batch_id === data.batch_id &&
      r.report_date === data.report_date &&
      r.location === data.location &&
      r.report_status === 'onReview'
    )

    // Group by activity
    const grouped = relatedReports.reduce((acc, report) => {
      const activityId = report.activity_id
      if (!acc[activityId]) {
        acc[activityId] = {
          activity_id: activityId,
          CoA: report.CoA,
          manpower: report.manpower,
          materials: []
        }
      }
      
      if (report.material_id) {
        acc[activityId].materials.push({
          material_id: report.material_id,
          qty: report.qty,
          UoM: report.UoM
        })
      }
      
      return acc
    }, {})

    groupedReports.value = Object.values(grouped)
    
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err.message
    alert('❌ Gagal memuat data: ' + err.message)
    router.push('/reportActivityList')
  } finally {
    loading.value = false
  }
})

// Helper functions
const getBatchName = (batchId) => {
  const batch = batchStore.batches.find(b => b.batch_id === batchId)
  return batch?.batch_name || 'Unknown'
}

const getActivityName = (activityId) => {
  const activity = potatoActivityStore.activities.find(a => a.activity_id === activityId)
  return activity?.activity || 'Unknown'
}

const getActivitySubactivity = (activityId) => {
  const activity = potatoActivityStore.activities.find(a => a.activity_id === activityId)
  return activity?.subactivity || ''
}

const getMaterialName = (materialId) => {
  if (!materialId) return '-'
  const material = materialStore.materials.find(m => m.material_id === materialId)
  return material?.material_name || '-'
}

// ✅ UPDATED: Read from columns instead of gh_type_damage table
const getDamageInfo = () => {
  if (!reportData.value) return []
  
  const damages = []
  
  if (reportData.value.type_damage_kuning > 0) {
    damages.push({
      type: 'Kuning',
      qty: reportData.value.type_damage_kuning
    })
  }
  
  if (reportData.value.type_damage_kutilang > 0) {
    damages.push({
      type: 'Kutilang',
      qty: reportData.value.type_damage_kutilang
    })
  }
  
  if (reportData.value.type_damage_busuk > 0) {
    damages.push({
      type: 'Busuk',
      qty: reportData.value.type_damage_busuk
    })
  }
  
  return damages
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleApprove = async () => {
  if (!confirm('✅ Apakah Anda yakin ingin menyetujui laporan ini?\n\nLaporan yang sudah disetujui tidak dapat diubah lagi.')) return

  try {
    processing.value = true
    
    // Update all related reports (same batch, date, location)
    const { data: allReports } = await activityReportStore.fetchAll()
    
    const relatedReports = allReports.filter(r => 
      r.batch_id === reportData.value.batch_id &&
      r.report_date === reportData.value.report_date &&
      r.location === reportData.value.location &&
      r.report_status === 'onReview'
    )

    // Approve all related reports using the approve function
    for (const report of relatedReports) {
      await activityReportStore.approve(
        report.report_id, 
        authStore.user?.username || authStore.user?.email || 'Admin'
      )
    }
    
    alert('✅ Laporan berhasil disetujui!')
    router.push('/reportActivityList')
  } catch (err) {
    console.error('Error approving report:', err)
    alert('❌ Gagal menyetujui laporan: ' + err.message)
  } finally {
    processing.value = false
  }
}

const openRevisionModal = () => {
  revisionNotes.value = ''
  showRevisionModal.value = true
}

const closeRevisionModal = () => {
  showRevisionModal.value = false
  revisionNotes.value = ''
}

const handleRevision = async () => {
  const notes = revisionNotes.value.trim()
  
  if (!notes) {
    alert('⚠️ Mohon masukkan catatan revisi')
    return
  }

  if (notes.length < 10) {
    alert('⚠️ Catatan revisi terlalu singkat. Mohon berikan penjelasan yang lebih detail (minimal 10 karakter)')
    return
  }

  if (!confirm('🔄 Kirim permintaan revisi?\n\nLaporan akan dikembalikan ke staff untuk diperbaiki.')) return

  try {
    processing.value = true
    
    // Update all related reports
    const { data: allReports } = await activityReportStore.fetchAll()
    
    const relatedReports = allReports.filter(r => 
      r.batch_id === reportData.value.batch_id &&
      r.report_date === reportData.value.report_date &&
      r.location === reportData.value.location &&
      r.report_status === 'onReview'
    )

    const updatePayload = {
      report_status: 'needRevision',
      revision_notes: notes,
      revision_requested_by: authStore.user?.username || authStore.user?.email || 'Admin',
      revision_requested_at: new Date().toISOString(),
      approved_by: null,
      approved_at: null
    }

    // Update all related reports
    for (const report of relatedReports) {
      await activityReportStore.update(report.report_id, updatePayload)
    }
    
    alert('✅ Permintaan revisi berhasil dikirim!')
    router.push('/reportActivityList')
  } catch (err) {
    console.error('Error requesting revision:', err)
    alert('❌ Gagal mengirim permintaan revisi: ' + err.message)
  } finally {
    processing.value = false
    closeRevisionModal()
  }
}

const statusBadge = computed(() => {
  const status = reportData.value?.report_status
  const badges = {
    'onReview': {
      text: '⏳ Waiting Review',
      class: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }
  return badges[status] || badges['onReview']
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/reportActivityList')"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center text-white text-lg">
                ⏳
              </span>
              Review Activity Report
            </h1>
            <p class="text-sm text-gray-500 mt-1">Tinjau & Approve Laporan Aktivitas</p>
          </div>
          <div v-if="reportData && !loading">
            <span 
              :class="statusBadge.class"
              class="px-4 py-2 rounded-lg font-bold text-sm border-2"
            >
              {{ statusBadge.text }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data laporan...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <template v-else-if="reportData">
        <!-- Report Info Banner -->
        <div class="mb-6">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5">
            <div class="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">Report ID</p>
                <p class="text-2xl font-bold text-gray-900">#{{ reportData.report_id }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600 font-semibold mb-1">Submitted</p>
                <p class="text-sm text-gray-900">{{ formatDateTime(reportData.created_at || reportData.report_date) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Basic Info Section -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Informasi Dasar</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <!-- Date -->
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg class="w-4 h-4 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                  </svg>
                  Tanggal
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                  {{ formatDate(reportData.report_date) }}
                </div>
              </div>

              <!-- Location -->
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="text-lg">📍</span>
                  Lokasi
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                  {{ reportData.location || '-' }}
                </div>
              </div>

              <!-- Batch -->
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="text-lg">🏷️</span>
                  Batch
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                  {{ getBatchName(reportData.batch_id) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Damage Types Section -->
        <div class="mb-8" v-if="getDamageInfo().length > 0">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Jenis Kerusakan Tanaman</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div v-for="damage in getDamageInfo()" :key="damage.type" class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span v-if="damage.type === 'Kuning'" class="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs">🟡</span>
                  <span v-else-if="damage.type === 'Kutilang'" class="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs">🟠</span>
                  <span v-else-if="damage.type === 'Busuk'" class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs">🔴</span>
                  {{ damage.type }}
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium text-center">
                  {{ damage.qty || 0 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activities Section -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Detail Aktivitas</h2>
          <div class="space-y-6">
            <div
              v-for="(activity, index) in groupedReports"
              :key="index"
              class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6"
            >
              <!-- Activity Header -->
              <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                  {{ index + 1 }}
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900">{{ getActivityName(activity.activity_id) }}</h3>
                  <p v-if="getActivitySubactivity(activity.activity_id)" class="text-sm text-gray-500">
                    {{ getActivitySubactivity(activity.activity_id) }}
                  </p>
                </div>
              </div>

              <div class="space-y-5">
                <!-- CoA -->
                <div class="flex flex-col">
                  <label class="text-sm font-semibold text-gray-700 mb-2">Chart of Account (CoA)</label>
                  <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                    {{ activity.CoA || '-' }}
                  </div>
                </div>

                <!-- Materials Section -->
                <div v-if="activity.materials.length > 0" class="bg-gray-50 rounded-xl p-5">
                  <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <span class="text-lg">📦</span>
                    Material
                  </h4>
                  <div class="space-y-3">
                    <div
                      v-for="(mat, matIdx) in activity.materials"
                      :key="matIdx"
                      class="flex flex-col sm:flex-row gap-4 bg-white rounded-lg p-4 border border-gray-200"
                    >
                      <div class="flex-1 flex flex-col">
                        <label class="text-xs font-semibold text-gray-600 mb-2">Nama Material</label>
                        <div class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium">
                          {{ getMaterialName(mat.material_id) }}
                        </div>
                      </div>
                      <div class="w-full sm:w-32 flex flex-col">
                        <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                        <div class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium text-center">
                          {{ mat.qty || 0 }}
                        </div>
                      </div>
                      <div class="w-full sm:w-32 flex flex-col">
                        <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                        <div class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium text-center">
                          {{ mat.UoM || '-' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Manpower Section -->
                <div class="bg-gray-50 rounded-xl p-5">
                  <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <span class="text-lg">👷</span>
                    Tenaga Kerja
                  </h4>
                  <div class="bg-white rounded-lg p-4 border border-gray-200">
                    <div class="flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Jumlah Pekerja</label>
                      <div class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium text-center">
                        {{ activity.manpower || 0 }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mb-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Review Action</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <div class="flex flex-col sm:flex-row gap-4">
              <button
                @click="handleApprove"
                :disabled="processing"
                class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
                </svg>
                {{ processing ? 'Processing...' : ' Approve Report' }}
              </button>

              <button
                @click="openRevisionModal"
                :disabled="processing"
                class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M142.9 142.9c-17.5 17.5-30.1 38-37.8 59.8c-5.9 16.7-24.2 25.4-40.8 19.5s-25.4-24.2-19.5-40.8C55.6 150.7 73.2 122 97.6 97.6c87.2-87.2 228.3-87.5 315.8-1L455 55c6.9-6.9 17.2-8.9 26.2-5.2s14.8 12.5 14.8 22.2l0 128c0 13.3-10.7 24-24 24l-8.4 0c0 0 0 0 0 0L344 224c-9.7 0-18.5-5.8-22.2-14.8s-1.7-19.3 5.2-26.2l41.1-41.1c-62.6-61.5-163.1-61.2-225.3 1zM16 312c0-13.3 10.7-24 24-24l7.6 0 .7 0L168 288c9.7 0 18.5 5.8 22.2 14.8s1.7 19.3-5.2 26.2l-41.1 41.1c62.6 61.5 163.1 61.2 225.3-1c17.5-17.5 30.1-38 37.8-59.8c5.9-16.7 24.2-25.4 40.8-19.5s25.4 24.2 19.5 40.8c-10.8 30.6-28.4 59.3-52.9 83.8c-87.2 87.2-228.3 87.5-315.8 1L57 457c-6.9 6.9-17.2 8.9-26.2 5.2S16 449.7 16 440l0-119.6 0-.7 0-7.6z"/>
                </svg>
                Request Revision
              </button>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-200">
              <p class="text-sm text-gray-600 text-center">
                <span class="font-semibold">💡 Tip:</span> Pastikan semua data sudah benar sebelum menyetujui. 
                Jika ada yang perlu diperbaiki, gunakan <span class="font-semibold text-red-600">"Request Revision"</span> 
                dengan catatan yang jelas.
              </p>
            </div>
          </div>
        </div>
      </template>

      <!-- Footer -->
      <footer class="text-center py-10 mt-8 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>

    <!-- Revision Modal -->
    <div v-if="showRevisionModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span class="text-2xl">🔄</span>
            Request Revision
          </h3>
          <button 
            @click="closeRevisionModal" 
            class="text-gray-400 hover:text-gray-600 transition"
            :disabled="processing"
          >
            <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
            </svg>
          </button>
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Catatan Revisi <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="revisionNotes"
            rows="5"
            placeholder="Tuliskan dengan jelas apa yang perlu diperbaiki...&#10;&#10;Contoh:&#10;- Material yang digunakan belum sesuai&#10;- Jumlah qty perlu diperbaiki&#10;- Tanggal laporan salah"
            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0071f3] focus:outline-none transition resize-none"
            :disabled="processing"
          ></textarea>
          <p class="text-xs text-gray-500 mt-2">
            Minimal 10 karakter. Berikan penjelasan yang detail agar staff dapat memperbaiki dengan tepat.
          </p>
          <div class="mt-3 flex items-center gap-2 text-sm">
            <span class="font-semibold" :class="revisionNotes.trim().length < 10 ? 'text-red-600' : 'text-green-600'">
              {{ revisionNotes.trim().length }} / 10
            </span>
            <span class="text-gray-500">karakter</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="closeRevisionModal"
            :disabled="processing"
            class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            @click="handleRevision"
            :disabled="!revisionNotes.trim() || revisionNotes.trim().length < 10 || processing"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="processing" class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ processing ? 'Mengirim...' : 'Kirim Revisi' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}
</style>