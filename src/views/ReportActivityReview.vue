<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useActivityReportStore } from '../stores/activityReport'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { useMaterialStore } from '../stores/material'
import { supabase } from '../lib/supabase'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const activityReportStore = useActivityReportStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const materialStore = useMaterialStore()

// ✅ Get report_id from route params
const report_id = ref(route.params.report_id || null)

const loading = ref(true)
const processing = ref(false)
const error = ref(null)

const currentReport = ref(null) // Single report data
const revisionModal = ref({
  show: false,
  type: null, // 'type_damage' or 'activity'
  itemId: null,
  notes: ''
})

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  if (!report_id.value) {
    alert('⚠️ Report ID tidak ditemukan')
    router.push('/reportActivityList')
    return
  }

  await loadData()
})

const loadData = async () => {
  try {
    loading.value = true
    
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll()
    ])

    // ✅ FETCH REPORT BY report_id
    const { data: report, error: fetchError } = await supabase
      .from('gh_report')
      .select(`
        *,
        type_damages:gh_type_damage(*),
        activities:gh_activity(
          *,
          materials:gh_material_used(*)
        )
      `)
      .eq('report_id', report_id.value)
      .single()
    
    if (fetchError) throw fetchError

    if (!report) {
      throw new Error('Laporan tidak ditemukan')
    }

    currentReport.value = report
    console.log('✅ Loaded report:', report)
    
    // Load material stock for this location
    if (report.location_id) {
      await materialStore.fetchStock({ location_id: report.location_id })
    }
    
    // ✅ UPDATE REPORT STATUS BASED ON ITEMS
    await updateReportStatus()
    
  } catch (err) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
    alert('❌ Gagal memuat data: ' + err.message)
    router.push('/reportActivityList')
  } finally {
    loading.value = false
  }
}

// ✅ UPDATE REPORT STATUS LOGIC
const updateReportStatus = async () => {
  try {
    if (!currentReport.value) return
    
    const report = currentReport.value
    let hasNeedRevision = false
    let allApproved = true
    let totalItems = 0
    
    // Check type_damages
    if (report.type_damages && report.type_damages.length > 0) {
      totalItems += report.type_damages.length
      for (const td of report.type_damages) {
        if (td.status === 'needRevision') {
          hasNeedRevision = true
          allApproved = false
          break
        }
        if (td.status !== 'approved') {
          allApproved = false
        }
      }
    }
    
    // Check activities
    if (report.activities && report.activities.length > 0) {
      totalItems += report.activities.length
      for (const act of report.activities) {
        if (act.status === 'needRevision') {
          hasNeedRevision = true
          allApproved = false
          break
        }
        if (act.status !== 'approved') {
          allApproved = false
        }
      }
    }
    
    // Determine status
    let newStatus = 'onReview' // default
    if (hasNeedRevision) {
      newStatus = 'needRevision' // Priority 1: Ada yang perlu revisi
    } else if (allApproved && totalItems > 0) {
      newStatus = 'approved' // Priority 2: Semua sudah approved
    }
    
    // Update report status if changed
    if (report.report_status !== newStatus) {
      console.log(`🔄 Updating report ${report.report_id} status: ${report.report_status} → ${newStatus}`)
      
      const { error: updateErr } = await supabase
        .from('gh_report')
        .update({ report_status: newStatus })
        .eq('report_id', report.report_id)
      
      if (updateErr) {
        console.error('❌ Error updating report status:', updateErr)
      } else {
        console.log(`✅ Report ${report.report_id} status updated to ${newStatus}`)
        currentReport.value.report_status = newStatus
      }
    }
  } catch (err) {
    console.error('❌ Error in updateReportStatus:', err)
  }
}

// Helper functions
const getBatchName = (batchId) => {
  const batch = batchStore.batches.find(b => b.batch_id == batchId)
  return batch?.batch_name || `Batch ${batchId}`
}

const getLocationName = (locationId) => {
  const location = locationStore.locations.find(l => l.location_id == locationId)
  return location?.location || `Location ${locationId}`
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

// Computed properties
const reportInfo = computed(() => {
  if (!currentReport.value) return null
  
  const report = currentReport.value
  let totalTypeDamages = 0
  let approvedTypeDamages = 0
  let revisionTypeDamages = 0
  let totalActivities = 0
  let approvedActivities = 0
  let revisionActivities = 0
  
  if (report.type_damages) {
    totalTypeDamages = report.type_damages.length
    approvedTypeDamages = report.type_damages.filter(td => td.status === 'approved').length
    revisionTypeDamages = report.type_damages.filter(td => td.status === 'needRevision').length
  }
  if (report.activities) {
    totalActivities = report.activities.length
    approvedActivities = report.activities.filter(act => act.status === 'approved').length
    revisionActivities = report.activities.filter(act => act.status === 'needRevision').length
  }
  
  const hasRevision = revisionTypeDamages > 0 || revisionActivities > 0
  const allApproved = (approvedTypeDamages === totalTypeDamages) && (approvedActivities === totalActivities) && (totalTypeDamages + totalActivities > 0)
  
  return {
    report_id: report.report_id,
    location_id: report.location_id,
    location_name: getLocationName(report.location_id),
    batch_id: report.batch_id,
    batch_name: getBatchName(report.batch_id),
    report_date: report.report_date,
    report_status: report.report_status,
    totalTypeDamages,
    approvedTypeDamages,
    revisionTypeDamages,
    totalActivities,
    approvedActivities,
    revisionActivities,
    allApproved,
    hasRevision
  }
})

// ✅ APPROVE TYPE DAMAGE
const approveTypeDamage = async (typeDamageId) => {
  if (!confirm('✅ Approve data kerusakan tanaman ini?')) return

  try {
    processing.value = true
    
    const username = authStore.user?.username || authStore.user?.email || 'Admin'
    
    console.log('📋 Approving type_damage:', typeDamageId)
    
    // Update type_damage status
    const { error: updateErr } = await supabase
      .from('gh_type_damage')
      .update({
        status: 'approved',
        approved_by: username,
        approved_at: new Date().toISOString()
      })
      .eq('typedamage_id', typeDamageId)
    
    if (updateErr) throw updateErr
    
    console.log('✅ Type damage status updated to approved')
    
    // ✅ REFRESH DATA FROM DATABASE
    await loadData()
    
    alert('✅ Data kerusakan berhasil disetujui!')
    
  } catch (err) {
    console.error('❌ Error approving type damage:', err)
    alert('❌ Gagal approve: ' + err.message)
  } finally {
    processing.value = false
  }
}

// ✅ APPROVE ACTIVITY
const approveActivity = async (activityId) => {
  if (!confirm('✅ Approve aktivitas ini?\n\nMaterial yang digunakan akan dikurangi dari stock.')) return

  try {
    processing.value = true
    
    const username = authStore.user?.username || authStore.user?.email || 'Admin'
    
    // ✅ CEK STATUS ACTIVITY SEBELUM APPROVE - Hindari duplikasi pengurangan stock
    const { data: checkActivity, error: checkError } = await supabase
      .from('gh_activity')
      .select('status, activity_id')
      .eq('activity_id', activityId)
      .single()
    
    if (checkError) throw checkError
    
    // ❌ Jika sudah approved, jangan approve lagi (hindari pengurangan stock ganda)
    if (checkActivity.status === 'approved') {
      alert('⚠️ Activity ini sudah di-approve sebelumnya!')
      await loadData()
      return
    }
    
    console.log('📋 Activity to approve:', checkActivity)
    
    // Get activity with materials FRESH FROM DATABASE
    const { data: activityData, error: getError } = await supabase
      .from('gh_activity')
      .select(`
        *,
        materials:gh_material_used(*)
      `)
      .eq('activity_id', activityId)
      .single()
    
    if (getError) throw getError
    if (!activityData) throw new Error('Activity tidak ditemukan')
    
    // ✅ REDUCE MATERIAL STOCK DULU SEBELUM UPDATE STATUS
    let stockReduced = false
    if (activityData.materials && activityData.materials.length > 0) {
      console.log('📦 Processing materials:', activityData.materials.length)
      
      for (const material of activityData.materials) {
        if (material.qty > 0) {
          console.log(`🔄 Reducing stock: ${material.material_name} (-${material.qty}) at location ${currentReport.value.location_id}`)
          
          const result = await materialStore.reduceStock(
            material.material_name,
            material.qty,
            currentReport.value.location_id
          )
          
          if (result.error) {
            console.warn(`⚠️ Warning reducing stock for ${material.material_name}:`, result.error)
          } else {
            console.log(`✅ Stock reduced: ${material.material_name} (-${material.qty})`)
            stockReduced = true
          }
        }
      }
    }
    
    // ✅ UPDATE STATUS ACTIVITY SETELAH STOCK DIKURANGI
    const { error: updateErr } = await supabase
      .from('gh_activity')
      .update({
        status: 'approved',
        approved_by: username,
        approved_at: new Date().toISOString()
      })
      .eq('activity_id', activityId)
    
    if (updateErr) throw updateErr
    
    console.log('✅ Activity status updated to approved')
    
    // ✅ REFRESH DATA FROM DATABASE
    await loadData()
    
    const message = stockReduced 
      ? '✅ Aktivitas berhasil disetujui dan stock material dikurangi!'
      : '✅ Aktivitas berhasil disetujui! (Tidak ada material yang dikurangi)'
    
    alert(message)
    
  } catch (err) {
    console.error('❌ Error approving activity:', err)
    alert('❌ Gagal approve: ' + err.message)
  } finally {
    processing.value = false
  }
}

// ✅ APPROVE ALL TYPE DAMAGES
const approveAllTypeDamages = async () => {
  if (!reportInfo.value || !currentReport.value) return
  
  if (!confirm(`✅ Approve SEMUA (${reportInfo.value.totalTypeDamages}) data kerusakan tanaman?`)) return

  try {
    processing.value = true
    
    const username = authStore.user?.username || authStore.user?.email || 'Admin'
    const typeDamageIds = []
    
    if (currentReport.value.type_damages) {
      currentReport.value.type_damages.forEach(td => {
        if (!td.status || td.status === 'onReview') {
          typeDamageIds.push(td.typedamage_id)
        }
      })
    }
    
    if (typeDamageIds.length === 0) {
      alert('⚠️ Tidak ada data kerusakan yang perlu disetujui')
      return
    }
    
    console.log('📋 Approving type_damages:', typeDamageIds)
    
    // Bulk update
    const { error: updateErr } = await supabase
      .from('gh_type_damage')
      .update({
        status: 'approved',
        approved_by: username,
        approved_at: new Date().toISOString()
      })
      .in('typedamage_id', typeDamageIds)
    
    if (updateErr) throw updateErr
    
    console.log('✅ All type damages approved')
    
    // ✅ REFRESH DATA
    await loadData()
    alert(`✅ ${typeDamageIds.length} data kerusakan berhasil disetujui!`)
    
  } catch (err) {
    console.error('❌ Error:', err)
    alert('❌ Gagal approve: ' + err.message)
  } finally {
    processing.value = false
  }
}

// ✅ APPROVE ALL ACTIVITIES
const approveAllActivities = async () => {
  if (!reportInfo.value || !currentReport.value) return
  
  if (!confirm(`✅ Approve SEMUA (${reportInfo.value.totalActivities}) aktivitas?\n\nSemua material yang digunakan akan dikurangi dari stock.`)) return

  try {
    processing.value = true
    
    const username = authStore.user?.username || authStore.user?.email || 'Admin'
    
    // ✅ CEK DAN FILTER HANYA ACTIVITY YANG BELUM APPROVED
    const activitiesToApprove = []
    const materialsToReduce = []
    
    if (currentReport.value.activities) {
      for (const act of currentReport.value.activities) {
        // ✅ HANYA PROSES ACTIVITY YANG STATUS: null, undefined, atau 'onReview'
        if (!act.status || act.status === 'onReview') {
          // Double check dari database
          const { data: checkAct } = await supabase
            .from('gh_activity')
            .select('status')
            .eq('activity_id', act.activity_id)
            .single()
          
          // Pastikan belum approved di database
          if (checkAct && checkAct.status !== 'approved') {
            activitiesToApprove.push({
              activity_id: act.activity_id,
              materials: act.materials || []
            })
            
            // Collect materials untuk activity ini
            if (act.materials && act.materials.length > 0) {
              act.materials.forEach(mat => {
                if (mat.qty > 0) {
                  materialsToReduce.push({
                    material_name: mat.material_name,
                    qty: mat.qty,
                    location_id: currentReport.value.location_id,
                    activity_id: act.activity_id
                  })
                }
              })
            }
          } else {
            console.log(`⏭️ Skipping activity ${act.activity_id} - already approved`)
          }
        }
      }
    }
    
    if (activitiesToApprove.length === 0) {
      alert('⚠️ Tidak ada aktivitas yang perlu disetujui')
      return
    }
    
    console.log('📋 Activities to approve:', activitiesToApprove.length)
    console.log('📦 Materials to reduce:', materialsToReduce.length)
    
    // ✅ REDUCE MATERIAL STOCKS DULU
    let stockReductionCount = 0
    for (const mat of materialsToReduce) {
      console.log(`🔄 Reducing: ${mat.material_name} (-${mat.qty}) for activity ${mat.activity_id}`)
      
      const result = await materialStore.reduceStock(mat.material_name, mat.qty, mat.location_id)
      if (result.error) {
        console.warn(`⚠️ Warning: ${mat.material_name}`, result.error)
      } else {
        console.log(`✅ Stock reduced: ${mat.material_name} (-${mat.qty})`)
        stockReductionCount++
      }
    }
    
    // ✅ BULK UPDATE ACTIVITIES STATUS SETELAH STOCK DIKURANGI
    const activityIds = activitiesToApprove.map(a => a.activity_id)
    
    const { error: updateErr } = await supabase
      .from('gh_activity')
      .update({
        status: 'approved',
        approved_by: username,
        approved_at: new Date().toISOString()
      })
      .in('activity_id', activityIds)
    
    if (updateErr) throw updateErr
    
    console.log('✅ All activities status updated')
    
    // ✅ REFRESH DATA
    await loadData()
    
    alert(`✅ ${activitiesToApprove.length} aktivitas berhasil disetujui!\n📦 ${stockReductionCount} material dikurangi dari stock.`)
    
  } catch (err) {
    console.error('❌ Error:', err)
    alert('❌ Gagal approve: ' + err.message)
  } finally {
    processing.value = false
  }
}

// ✅ APPROVE EVERYTHING
const approveEverything = async () => {
  if (!reportInfo.value) return
  
  // ❌ CEGAH APPROVE JIKA MASIH ADA REVISION
  if (reportInfo.value.hasRevision) {
    alert('⚠️ Tidak bisa approve semua!\n\nMasih ada item yang memerlukan revisi:\n- ' + 
          reportInfo.value.revisionTypeDamages + ' data kerusakan\n- ' + 
          reportInfo.value.revisionActivities + ' aktivitas\n\nHarap selesaikan revisi terlebih dahulu.')
    return
  }
  
  const total = reportInfo.value.totalTypeDamages + reportInfo.value.totalActivities
  
  if (!confirm(`✅ Approve SEMUA (${total} items)?\n\n- ${reportInfo.value.totalTypeDamages} data kerusakan\n- ${reportInfo.value.totalActivities} aktivitas\n\nMaterial akan dikurangi dari stock.`)) return

  try {
    processing.value = true
    
    await approveAllTypeDamages()
    await approveAllActivities()
    
    alert('✅ Semua item berhasil disetujui!')
    router.push('/reportActivityList')
    
  } catch (err) {
    console.error('❌ Error:', err)
    alert('❌ Gagal approve semua: ' + err.message)
  } finally {
    processing.value = false
  }
}

// ✅ REQUEST REVISION
const openRevisionModal = (type, itemId) => {
  revisionModal.value = {
    show: true,
    type,
    itemId,
    notes: ''
  }
}

const closeRevisionModal = () => {
  revisionModal.value = {
    show: false,
    type: null,
    itemId: null,
    notes: ''
  }
}

const handleRevision = async () => {
  const { type, itemId, notes } = revisionModal.value
  
  if (!notes.trim() || notes.trim().length < 10) {
    alert('⚠️ Catatan revisi minimal 10 karakter')
    return
  }

  if (!confirm(`🔄 Kirim permintaan revisi untuk ${type === 'type_damage' ? 'data kerusakan' : 'aktivitas'} ini?`)) return

  try {
    processing.value = true
    
    const username = authStore.user?.username || authStore.user?.email || 'Admin'
    const table = type === 'type_damage' ? 'gh_type_damage' : 'gh_activity'
    const idField = type === 'type_damage' ? 'typedamage_id' : 'activity_id'
    
    const { error: updateErr } = await supabase
      .from(table)
      .update({
        status: 'needRevision',
        revision_notes: notes,
        revision_requested_by: username,
        revision_requested_at: new Date().toISOString()
      })
      .eq(idField, itemId)
    
    if (updateErr) throw updateErr
    
    await loadData()
    closeRevisionModal()
    alert('✅ Permintaan revisi berhasil dikirim!')
    
  } catch (err) {
    console.error('❌ Error:', err)
    alert('❌ Gagal mengirim revisi: ' + err.message)
  } finally {
    processing.value = false
  }
}

// Get status badge
const getStatusBadge = (status) => {
  const badges = {
    'onReview': {
      text: '⏳ Review',
      class: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    'needRevision': {
      text: '🔄 Revision',
      class: 'bg-red-100 text-red-800 border-red-200'
    },
    'approved': {
      text: '✅ Approved',
      class: 'bg-green-100 text-green-800 border-green-200'
    }
  }
  return badges[status || 'onReview'] || badges['onReview']
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button
              @click="router.push('/reportActivityList')"
              class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center text-white text-lg">
                  ⏳
                </span>
                Review Activity Report
              </h1>
              <p class="text-sm text-gray-500 mt-1">Report ID: #{{ report_id }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
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
      <template v-else-if="reportInfo && currentReport">
        
        <!-- Report Info -->
        <div class="mb-6">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📍 Lokasi</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo.location_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">🏷️ Batch</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo.batch_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📅 Tanggal</p>
                <p class="text-lg font-bold text-gray-900">{{ formatDate(reportInfo.report_date) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📊 Status</p>
                <span 
                  :class="getStatusBadge(reportInfo.report_status).class"
                  class="inline-block px-3 py-1 rounded-lg font-bold text-xs border-2"
                >
                  {{ getStatusBadge(reportInfo.report_status).text }}
                </span>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">🌾 Kerusakan Tanaman</p>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-gray-900">{{ reportInfo.approvedTypeDamages }}</span>
                  <span class="text-gray-500">/</span>
                  <span class="text-xl text-gray-600">{{ reportInfo.totalTypeDamages }}</span>
                  <span class="text-sm text-gray-500">approved</span>
                </div>
              </div>
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">⚙️ Aktivitas</p>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-gray-900">{{ reportInfo.approvedActivities }}</span>
                  <span class="text-gray-500">/</span>
                  <span class="text-xl text-gray-600">{{ reportInfo.totalActivities }}</span>
                  <span class="text-sm text-gray-500">approved</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div class="mb-6">
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-5">
            <p class="text-sm font-bold text-gray-700 mb-4">🚀 Bulk Actions</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                @click="approveAllTypeDamages"
                :disabled="processing || reportInfo.approvedTypeDamages === reportInfo.totalTypeDamages"
                class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>✅ Approve All Damages</span>
              </button>
              <button
                @click="approveAllActivities"
                :disabled="processing || reportInfo.approvedActivities === reportInfo.totalActivities"
                class="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>✅ Approve All Activities</span>
              </button>
              <button
                @click="approveEverything"
                :disabled="processing || reportInfo.allApproved"
                class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>✅ Approve Everything</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Report Content -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
          <!-- Report Header -->
          <div class="bg-gradient-to-r from-gray-50 to-white p-5 border-b-2 border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                #
              </div>
              <div>
                <p class="text-sm text-gray-500 font-semibold">Report ID</p>
                <p class="text-lg font-bold text-gray-900">#{{ currentReport.report_id }}</p>
              </div>
            </div>
          </div>

          <!-- Report Content -->
          <div class="p-6 space-y-6">
            
            <!-- Type Damages Section -->
            <div v-if="currentReport.type_damages && currentReport.type_damages.length > 0">
              <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span class="text-2xl">🌾</span>
                Kerusakan Tanaman ({{ currentReport.type_damages.length }})
              </h4>
              <div class="space-y-3">
                <div
                  v-for="damage in currentReport.type_damages"
                  :key="damage.typedamage_id"
                  class="bg-gray-50 rounded-xl p-5 border-2 border-gray-200"
                >
                  <div class="flex items-start justify-between gap-4 mb-4">
                    <div class="flex-1">
                      <p class="font-bold text-gray-900 text-lg mb-3">{{ damage.type_damage || 'Kerusakan' }}</p>
                      <div class="grid grid-cols-3 gap-3">
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">🟡 Kuning</p>
                          <p class="text-2xl font-bold text-gray-900">{{ damage.kuning || 0 }}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">🟠 Kutilang</p>
                          <p class="text-2xl font-bold text-gray-900">{{ damage.kutilang || 0 }}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">🔴 Busuk</p>
                          <p class="text-2xl font-bold text-gray-900">{{ damage.busuk || 0 }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                      <span 
                        :class="getStatusBadge(damage.status).class"
                        class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                      >
                        {{ getStatusBadge(damage.status).text }}
                      </span>
                      <button
                        v-if="!damage.status || damage.status === 'onReview'"
                        @click="approveTypeDamage(damage.typedamage_id)"
                        :disabled="processing"
                        class="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 text-sm"
                      >
                        ✅ Approve
                      </button>
                      <button
                        v-if="!damage.status || damage.status === 'onReview'"
                        @click="openRevisionModal('type_damage', damage.typedamage_id)"
                        :disabled="processing"
                        class="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 text-sm"
                      >
                        🔄 Revise
                      </button>
                    </div>
                  </div>
                  
                  <!-- Revision Info -->
                  <div v-if="damage.revision_notes" class="mt-3 bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <p class="text-xs text-red-600 font-semibold mb-1">Revision Notes:</p>
                    <p class="text-sm text-red-900">{{ damage.revision_notes }}</p>
                    <p class="text-xs text-red-600 mt-2">By: {{ damage.revision_requested_by }} • {{ formatDateTime(damage.revision_requested_at) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Activities Section -->
            <div v-if="currentReport.activities && currentReport.activities.length > 0">
              <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span class="text-2xl">⚙️</span>
                Aktivitas ({{ currentReport.activities.length }})
              </h4>
              <div class="space-y-4">
                <div
                  v-for="activity in currentReport.activities"
                  :key="activity.activity_id"
                  class="bg-gray-50 rounded-xl p-5 border-2 border-gray-200"
                >
                  <div class="flex items-start justify-between gap-4 mb-4">
                    <div class="flex-1">
                      <p class="font-bold text-gray-900 text-lg mb-3">{{ activity.act_name }}</p>
                      <div class="grid grid-cols-2 gap-3 mb-4">
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">CoA</p>
                          <p class="text-sm font-medium text-gray-900">{{ activity.CoA || '-' }}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">👷 Manpower</p>
                          <p class="text-sm font-medium text-gray-900">{{ activity.manpower || 0 }} pekerja</p>
                        </div>
                      </div>

                      <!-- Materials -->
                      <div v-if="activity.materials && activity.materials.length > 0" class="bg-white rounded-lg p-4">
                        <p class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <span class="text-base">📦</span>
                          Materials ({{ activity.materials.length }})
                        </p>
                        <div class="space-y-2">
                          <div
                            v-for="material in activity.materials"
                            :key="material.material_used_id"
                            class="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg"
                          >
                            <span class="text-sm font-medium text-gray-900">{{ material.material_name }}</span>
                            <span class="text-sm font-bold text-blue-700">{{ material.qty }} {{ material.uom }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex flex-col items-end gap-2">
                      <span 
                        :class="getStatusBadge(activity.status).class"
                        class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                      >
                        {{ getStatusBadge(activity.status).text }}
                      </span>
                      <button
                        v-if="!activity.status || activity.status === 'onReview'"
                        @click="approveActivity(activity.activity_id)"
                        :disabled="processing"
                        class="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 text-sm whitespace-nowrap"
                      >
                        ✅ Approve
                      </button>
                      <button
                        v-if="!activity.status || activity.status === 'onReview'"
                        @click="openRevisionModal('activity', activity.activity_id)"
                        :disabled="processing"
                        class="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 text-sm whitespace-nowrap"
                      >
                        🔄 Revise
                      </button>
                    </div>
                  </div>

                  <!-- Approval Info -->
                  <div v-if="activity.approved_at" class="mt-3 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                    <p class="text-xs text-green-600 font-semibold mb-1">✅ Approved</p>
                    <p class="text-sm text-green-900">By: {{ activity.approved_by }} • {{ formatDateTime(activity.approved_at) }}</p>
                  </div>
                  
                  <!-- Revision Info -->
                  <div v-if="activity.revision_notes" class="mt-3 bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <p class="text-xs text-red-600 font-semibold mb-1">Revision Notes:</p>
                    <p class="text-sm text-red-900">{{ activity.revision_notes }}</p>
                    <p class="text-xs text-red-600 mt-2">By: {{ activity.revision_requested_by }} • {{ formatDateTime(activity.revision_requested_at) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Box -->
        <div class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mt-6">
          <div class="flex items-start gap-3">
            <span class="text-2xl">💡</span>
            <div class="flex-1">
              <p class="font-bold text-blue-900 mb-2">Cara Review</p>
              <ul class="text-sm text-blue-800 space-y-1">
                <li>• <strong>Per Item:</strong> Klik "Approve" atau "Revise" pada setiap kerusakan tanaman atau aktivitas</li>
                <li>• <strong>Bulk Actions:</strong> Gunakan tombol di atas untuk approve semua sekaligus</li>
                <li>• <strong>Material Stock:</strong> Saat approve aktivitas, qty material akan otomatis dikurangi dari stock</li>
                <li>• <strong>Status Report:</strong> Report akan berstatus "Approved" hanya jika SEMUA item sudah approved</li>
                <li>• <strong>Revision:</strong> Item yang direquest revision akan dikembalikan ke staff untuk diperbaiki</li>
              </ul>
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
    <div v-if="revisionModal.show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
            Item Type
          </label>
          <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
            {{ revisionModal.type === 'type_damage' ? '🌾 Kerusakan Tanaman' : '⚙️ Aktivitas' }}
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Catatan Revisi <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="revisionModal.notes"
            rows="6"
            placeholder="Tuliskan dengan jelas apa yang perlu diperbaiki...&#10;&#10;Contoh untuk kerusakan:&#10;- Data kuning perlu diverifikasi ulang&#10;- Jumlah busuk tidak sesuai dengan kondisi aktual&#10;&#10;Contoh untuk aktivitas:&#10;- Material yang digunakan belum sesuai&#10;- Jumlah qty perlu diperbaiki&#10;- CoA salah"
            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0071f3] focus:outline-none transition resize-none"
            :disabled="processing"
          ></textarea>
          <p class="text-xs text-gray-500 mt-2">
            Minimal 10 karakter. Berikan penjelasan yang detail.
          </p>
          <div class="mt-3 flex items-center gap-2 text-sm">
            <span class="font-semibold" :class="revisionModal.notes.trim().length < 10 ? 'text-red-600' : 'text-green-600'">
              {{ revisionModal.notes.trim().length }} / 10
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
            :disabled="!revisionModal.notes.trim() || revisionModal.notes.trim().length < 10 || processing"
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
</style>