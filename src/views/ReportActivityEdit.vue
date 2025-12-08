// ReportActivityEdit.vue - COMPLETE VERSION WITH IMAGE UPLOAD/DELETE
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { usePotatoActivityStore } from '../stores/potatoActivity'
import { useMaterialStore } from '../stores/material'
import { supabase } from '../lib/supabase'
import openbravoApi from '@/lib/openbravo'
import ImageUploadComponent from '@/components/ImageUploadComponent.vue'
import { updateMultipleImagesInDB, deleteImage } from '@/lib/imageUpload'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const potatoActivityStore = usePotatoActivityStore()
const materialStore = useMaterialStore()

const report_id = ref(route.params.report_id || route.params.id || null)

console.log('🔍 Route Debug Info:')
console.log('  - route.params:', route.params)
console.log('  - report_id extracted:', report_id.value)

const phaseInfo = ref(null)
const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const currentReport = ref(null)
const revisionNotes = ref([])

// Form data
const form = ref({
  location_id: null,
  batch_id: null,
  report_date: ''
})

// Type damages data with images
const typeDamages = ref([])
const typeDamageImages = ref({})

// Activities data with images
const activities = ref([])
const activityImages = ref({})

// Warehouse info for materials
const warehouseInfo = ref({
  warehouse: null,
  bin: null,
  location_name: null
})
const availableMaterials = ref([])
const materialLoading = ref(false)

// ===================================
// LOAD PHASE INFO
// ===================================
const loadPhaseInfo = async (phaseId) => {
  if (!phaseId) return null
  
  try {
    const { data, error } = await supabase
      .from('gh_phase')
      .select('phase_name')
      .eq('phase_id', phaseId)
      .single()
    
    if (error) throw error
    return data?.phase_name || 'Unknown Phase'
  } catch (err) {
    console.error('Error loading phase:', err)
    return 'Unknown Phase'
  }
}

// ===================================
// LOAD WAREHOUSE AND MATERIALS
// ===================================
const loadWarehouseAndBin = async (locationId) => {
  try {
    const location = locationStore.locations.find(l => l.location_id == locationId)
    if (!location) {
      console.warn('⚠️ Location not found:', locationId)
      return
    }

    const locationName = location.location
    warehouseInfo.value.location_name = locationName
    
    console.log('🔍 Searching warehouse for location:', locationName)

    const warehouseRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Warehouse',
      { 
        params: { 
          _where: `name='${locationName}'`,
          _selectedProperties: 'id,name,organization,client'
        } 
      }
    )

    const warehouses = warehouseRes?.data?.response?.data || []
    if (!warehouses.length) {
      console.error('❌ Warehouse not found for location:', locationName)
      return
    }

    const warehouse = warehouses[0]
    warehouseInfo.value.warehouse = warehouse
    
    const binRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Locator',
      { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } }
    )

    const bins = binRes?.data?.response?.data || []
    if (!bins.length) {
      console.warn('⚠️ Bin not found for warehouse:', warehouse.name)
      return
    }

    warehouseInfo.value.bin = bins[0]
    await loadMaterialsByBin(bins[0].id)

  } catch (err) {
    console.error('❌ Error loading warehouse/bin:', err)
  }
}

const loadMaterialsByBin = async (binId) => {
  if (!binId) {
    availableMaterials.value = []
    return
  }
  
  materialLoading.value = true
  try {
    const materialsRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail',
      { params: { _where: `M_Locator_ID='${binId}' AND quantityOnHand > 0` } }
    )
    
    const rows = materialsRes?.data?.response?.data || []
    const materialsWithPrice = await Promise.all(rows.map(async (r) => {
      const price = await getMaterialPrice(r['product$_identifier'], r.product)
      return {
        productId: r.product,
        material_name: r['product$_identifier'] || '(Tanpa Nama Produk)',
        uomId: r.uOM,
        uom: r['uOM$_identifier'] || null,
        stock: r.quantityOnHand ?? 0,
        unit_price: price
      }
    }))
    
    availableMaterials.value = materialsWithPrice
    console.log('✅ Loaded materials:', materialsWithPrice.length)
    
  } catch (err) {
    console.error('❌ Error loading materials:', err)
    availableMaterials.value = []
  } finally {
    materialLoading.value = false
  }
}

const getMaterialPrice = async (materialName) => {
  try {
    const stockItem = availableMaterials.value.find(m => m.material_name === materialName)
    if (!stockItem || !stockItem.productId) return 0
    
    const costingRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtCosting',
      { params: { _where: `product='${stockItem.productId}'`, _orderBy: 'updated desc', _maxResults: 50 } }
    )
    
    const costings = costingRes?.data?.response?.data || []
    if (costings.length > 0) {
      const latestCosting = costings[0]
      return parseFloat(latestCosting.price) || 0
    }
    return 0
  } catch (err) {
    console.error(`❌ Error fetching price:`, err)
    return 0
  }
}

// ===================================
// IMAGE HANDLERS
// ===================================
const handleTypeDamageImageUpload = (event) => {
  const { recordId, allImages } = event
  typeDamageImages.value[recordId] = allImages || []
  console.log('✅ Type Damage images:', recordId, allImages.length)
}

const handleActivityImageUpload = (event) => {
  const { recordId, allImages } = event
  activityImages.value[recordId] = allImages || []
  console.log('✅ Activity images:', recordId, allImages.length)
}

const handleImageDelete = async (event, type) => {
  const { recordId, imagePath, index } = event
  
  // ✅ PREVENT DEFAULT FORM SUBMISSION (DEFENSIVE CHECK)
  if (event?.originalEvent) {
    event.originalEvent.preventDefault?.()
    event.originalEvent.stopPropagation?.()
  } else {
    // Fallback if event is passed directly without wrapper
    if (event.preventDefault) event.preventDefault()
    if (event.stopPropagation) event.stopPropagation()
  }
  
  try {
    await deleteImage(imagePath, type, recordId)
    
    if (type === 'type_damage' && typeDamageImages.value[recordId]) {
      typeDamageImages.value[recordId].splice(index, 1)
      if (typeDamageImages.value[recordId].length === 0) {
        delete typeDamageImages.value[recordId]
      }
    } else if (activityImages.value[recordId]) {
      activityImages.value[recordId].splice(index, 1)
      if (activityImages.value[recordId].length === 0) {
        delete activityImages.value[recordId]
      }
    }
    
    console.log('✅ Image deleted successfully from local state')
    // ❌ JANGAN alert di sini - biarkan user terus edit tanpa interupsi
  } catch (error) {
    console.error('❌ Error deleting image:', error)
    alert(`Gagal menghapus gambar: ${error.message}`)
  }
}

const handleImagesUpdated = () => {}
const handleImageUploadError = (event) => { 
  alert(`❌ Error: ${event.error}`) 
}

// ===================================
// LOAD DATA
// ===================================
onMounted(async () => {
  console.log('═══════════════════════════════════════════')
  console.log('🚀 ReportActivityEdit.vue MOUNTED')
  console.log('═══════════════════════════════════════════')
  
  if (!authStore.isLoggedIn) {
    console.log('❌ User not logged in - Redirecting to login')
    router.push('/')
    return
  }

  if (!report_id.value) {
    alert('⚠️ Report ID tidak ditemukan')
    router.replace('/planningReportList')
    return
  }

  await loadData()
})

const loadData = async () => {
  try {
    loading.value = true
    
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll(),
      potatoActivityStore.fetchAll()
    ])
    
    console.log('📋 Master Data Loaded')

    // Fetch report with images
    const { data: report, error: fetchError } = await supabase
      .from('gh_report')
      .select(`
        *,
        type_damages:gh_type_damage(typedamage_id, type_damage, kuning, kutilang, busuk, images),
        activities:gh_activity(
          activity_id, act_name, CoA, manpower, images,
          materials:gh_material_used(*)
        )
      `)
      .eq('report_id', report_id.value)
      .single()
    
    if (fetchError) throw fetchError
    if (!report) throw new Error('Laporan tidak ditemukan')

    console.log('✅ Report fetched:', report)

    // Check approval status
    if (!report.approval_record_id) {
      alert('⚠️ Laporan ini belum masuk ke flow approval.')
      router.replace('/planningReportList')
      return
    }

    const { data: approvalRecord, error: approvalErr } = await supabase
      .from('gh_approve_record')
      .select('overall_status, current_level_order')
      .eq('record_id', report.approval_record_id)
      .single()

    if (approvalErr) throw new Error('Gagal mengambil status approval')

    if (approvalRecord?.overall_status !== 'needRevision') {
      alert(`⚠️ Laporan ini tidak dalam status Need Revision.\n\nStatus saat ini: ${approvalRecord?.overall_status || 'Unknown'}`)
      router.replace('/planningReportList')
      return
    }

    currentReport.value = report

    // Load phase
    if (report.phase_id) {
      phaseInfo.value = await loadPhaseInfo(report.phase_id)
    }

    // Set form data
    form.value = {
      location_id: report.location_id,
      batch_id: report.batch_id,
      report_date: report.report_date
    }

    // Load warehouse and materials
    if (report.location_id) {
      const locationName = getLocationName(report.location_id)
      await loadWarehouseAndBin(report.location_id)
    }

    // Load type damages with images
    if (report.type_damages && report.type_damages.length > 0) {
      typeDamages.value = report.type_damages.map(td => ({
        typedamage_id: td.typedamage_id,
        type_damage: td.type_damage || '',
        kuning: td.kuning || 0,
        kutilang: td.kutilang || 0,
        busuk: td.busuk || 0,
        editable: true
      }))
      
      // Load existing images
      report.type_damages.forEach(td => {
        if (td.images && td.images.length > 0) {
          typeDamageImages.value[td.typedamage_id] = td.images
        }
      })
      
      console.log(`✅ Loaded ${typeDamages.value.length} type damages`)
    }

    // Load activities with images
    if (report.activities && report.activities.length > 0) {
      activities.value = report.activities.map(act => {
        const masterActivity = potatoActivityStore.activities.find(a => 
          a.activity?.toLowerCase().trim() === act.act_name?.toLowerCase().trim() ||
          a.act_name?.toLowerCase().trim() === act.act_name?.toLowerCase().trim()
        )
        
        return {
          gh_activity_id: act.activity_id,
          master_activity_id: masterActivity?.activity_id || null,
          act_name: act.act_name,
          CoA: act.CoA || masterActivity?.CoA_code,
          manpower: act.manpower || 0,
          materials: act.materials && act.materials.length > 0
            ? act.materials.map(mat => ({
                material_used_id: mat.material_used_id,
                material_name: mat.material_name,
                qty: mat.qty || 0,
                uom: mat.uom || ''
              }))
            : [{ material_used_id: null, material_name: '', qty: 0, uom: '' }],
          editable: true
        }
      })
      
      // Load existing images
      report.activities.forEach(act => {
        if (act.images && act.images.length > 0) {
          activityImages.value[act.activity_id] = act.images
        }
      })
      
      console.log(`✅ Loaded ${activities.value.length} activities`)
    }
    
  } catch (err) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
    alert('❌ Gagal memuat data: ' + err.message)
    router.replace('/planningReportList')
  } finally {
    loading.value = false
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

const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0)

// Watch for activity changes to auto-fill CoA
watch(() => activities.value, (acts) => {
  acts.forEach((act) => {
    if (act.master_activity_id) {
      const selected = potatoActivityStore.activities.find(a => a.activity_id == act.master_activity_id)
      if (selected) {
        if (selected.CoA_code) act.CoA = selected.CoA_code
        if (selected.activity || selected.act_name) act.act_name = selected.activity || selected.act_name
      }
    }
  })
}, { deep: true })

// Material change handler - AUTO-FILL UOM
const onMaterialChange = (activityIndex, materialIndex, materialName) => {
  console.log(`🔄 Material changed:`, { activityIndex, materialIndex, materialName })
  
  if (!materialName) {
    const material = activities.value[activityIndex].materials[materialIndex]
    material.material_name = ''
    material.uom = ''
    return
  }
  
  const selectedMaterial = availableMaterials.value.find(m => m.material_name === materialName)
  
  if (selectedMaterial) {
    const material = activities.value[activityIndex].materials[materialIndex]
    material.material_name = selectedMaterial.material_name
    material.uom = selectedMaterial.uom || ''
    
    console.log(`✅ Material SAVED:`, {
      material_name: material.material_name,
      qty: material.qty,
      uom: material.uom
    })
    
    activities.value = [...activities.value]
  }
}

// Material handlers
const addMaterialRow = (activityIndex) => {
  activities.value[activityIndex].materials.push({
    material_used_id: null,
    material_name: '',
    qty: 0,
    uom: ''
  })
}

const removeMaterialRow = (activityIndex, materialIndex) => {
  if (activities.value[activityIndex].materials.length > 1) {
    activities.value[activityIndex].materials.splice(materialIndex, 1)
  }
}

// ===================================
// SUBMIT HANDLER
// ===================================
const handleSubmit = async () => {
  try {
    saving.value = true
    error.value = null

    if (!form.value.location_id || !form.value.batch_id || !form.value.report_date) {
      throw new Error('Lokasi, Batch, dan Tanggal wajib diisi')
    }

    const username = authStore.user?.username || authStore.user?.email || 'Staff'
    const now = new Date().toISOString()

    console.log('📤 Starting submit process...')

    // 1. UPDATE TYPE DAMAGES
    if (typeDamages.value && typeDamages.value.length > 0) {
      console.log(`📝 Updating ${typeDamages.value.length} type damages`)
      
      for (const td of typeDamages.value) {
        const { error: updateErr } = await supabase
          .from('gh_type_damage')
          .update({
            type_damage: td.type_damage,
            kuning: parseInt(td.kuning) || 0,
            kutilang: parseInt(td.kutilang) || 0,
            busuk: parseInt(td.busuk) || 0
          })
          .eq('typedamage_id', td.typedamage_id)
        
        if (updateErr) throw new Error(`Gagal update kerusakan: ${updateErr.message}`)
        
        // Update images
        if (typeDamageImages.value[td.typedamage_id]) {
          const imagesToUpdate = typeDamageImages.value[td.typedamage_id].map(img => ({
            path: img.path || '',
            url: img.supabaseUrl || img.url || '',
            bucket: img.bucket || ''
          }))
          await updateMultipleImagesInDB(td.typedamage_id, 'type_damage', imagesToUpdate)
        }
      }
      
      console.log(`✅ Successfully updated ${typeDamages.value.length} type damages`)
    }

    // 2. DELETE & INSERT ACTIVITIES
    if (activities.value && activities.value.length > 0) {
      console.log(`📝 Processing ${activities.value.length} activities`)
      
      for (const act of activities.value) {
        if (!act.gh_activity_id) throw new Error('ID aktivitas tidak valid')
        if (!act.act_name || act.act_name.trim() === '') throw new Error('Nama aktivitas wajib diisi')

        // DELETE old materials
        await supabase.from('gh_material_used').delete().eq('activity_id', act.gh_activity_id)

        // DELETE old activity
        await supabase.from('gh_activity').delete().eq('activity_id', act.gh_activity_id)

        // INSERT new activity
        const { data: newActivity, error: insertActErr } = await supabase
          .from('gh_activity')
          .insert({
            report_id: report_id.value,
            act_name: act.act_name,
            CoA: act.CoA ? parseFloat(act.CoA) : null,
            manpower: parseInt(act.manpower) || 0,
            images: []
          })
          .select()
          .single()
        
        if (insertActErr) throw new Error(`Gagal insert aktivitas: ${insertActErr.message}`)

        const newActivityId = newActivity.activity_id

        // Update images
        if (activityImages.value[act.gh_activity_id]) {
          const imagesToUpdate = activityImages.value[act.gh_activity_id].map(img => ({
            path: img.path || '',
            url: img.supabaseUrl || img.url || '',
            bucket: img.bucket || ''
          }))
          await updateMultipleImagesInDB(newActivityId, 'activity', imagesToUpdate)
        }

        // INSERT materials
        const validMaterials = act.materials.filter(mat => 
          mat.material_name && mat.qty && parseFloat(mat.qty) > 0
        )

        if (validMaterials.length > 0) {
          const materialPayloads = await Promise.all(
            validMaterials.map(async (mat) => {
              const qty = parseFloat(mat.qty)
              const unitPrice = await getMaterialPrice(mat.material_name)
              const totalPrice = qty * unitPrice

              return {
                activity_id: newActivityId,
                material_name: mat.material_name,
                qty: qty,
                uom: mat.uom || null,
                unit_price: unitPrice,
                total_price: totalPrice
              }
            })
          )

          const { error: matErr } = await supabase
            .from('gh_material_used')
            .insert(materialPayloads)

          if (matErr) throw new Error(`Gagal insert material: ${matErr.message}`)
        }
      }
    }

    // 3. UPDATE REPORT STATUS
    await supabase
      .from('gh_report')
      .update({ report_status: 'onReview', updated_at: now })
      .eq('report_id', report_id.value)

    // 4. RESET APPROVAL
    if (currentReport.value.approval_record_id) {
      await supabase
        .from('gh_approve_record')
        .update({ current_level_order: 1, overall_status: 'onReview', updated_at: now })
        .eq('record_id', currentReport.value.approval_record_id)

      await supabase
        .from('gh_approval_level_status')
        .update({
          status: 'pending',
          approved_by: null,
          approved_at: null,
          revision_notes: null,
          revision_requested_by: null,
          revision_requested_at: null,
          updated_at: now
        })
        .eq('record_id', currentReport.value.approval_record_id)

      const { data: flowData } = await supabase
        .from('gh_approve_record')
        .select('flow_id')
        .eq('record_id', currentReport.value.approval_record_id)
        .single()

      await supabase
        .from('gh_approval_history')
        .insert({
          record_id: currentReport.value.approval_record_id,
          flow_id: flowData.flow_id,
          user_id: authStore.user.user_id,
          level_order: 0,
          level_name: 'Staff',
          action: 'submitted',
          comment: `Report revised and resubmitted by ${username}`
        })
    }

    alert('✅ Laporan berhasil diperbarui dan dikirim untuk review ulang!')
    router.replace('/planningReportList')
    
  } catch (err) {
    console.error('❌ Error saving:', err)
    error.value = err.message
    alert('❌ Gagal menyimpan: ' + err.message)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  if (confirm('❓ Batalkan perubahan?\n\nData yang belum disimpan akan hilang.')) {
    router.replace('/planningReportList')
  }
}

const filteredActivities = computed(() => potatoActivityStore.activities)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button 
            @click="handleCancel"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white text-lg">
                📝
              </span>
              Edit Laporan Aktivitas
            </h1>
            <p class="text-sm text-gray-500 mt-1">Perbaiki item yang memerlukan revisi - Report ID: #{{ report_id }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data...</p>
        </div>
      </div>

      <div v-else-if="error && !saving" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <template v-else-if="!loading">
        
        <form @submit.prevent="handleSubmit" class="space-y-6">
          
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-xl">📋</span>
              Informasi Dasar (Read Only)
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Lokasi</label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ getLocationName(form.location_id) }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Batch</label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ getBatchName(form.batch_id) }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Phase</label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ phaseInfo || '-' }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Tanggal</label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ form.report_date }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="typeDamages.length > 0" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-xl">🌾</span>
              Kerusakan Tanaman ({{ typeDamages.length }})
            </h2>
            
            <div class="space-y-4">
              <div
                v-for="(td, index) in typeDamages"
                :key="td.typedamage_id"
                class="rounded-xl p-5 border-2 bg-red-50 border-red-200"
              >
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm font-bold text-gray-600">Kerusakan #{{ index + 1 }}</span>
                </div>

                <ImageUploadComponent
                  v-if="td.typedamage_id" 
                  type="type_damage"
                  :recordId="td.typedamage_id"
                  :existingImages="typeDamageImages[td.typedamage_id] || []"
                  @upload-success="handleTypeDamageImageUpload"
                  @upload-error="handleImageUploadError"
                  @delete="(e) => handleImageDelete(e, 'type_damage')"
                  @images-updated="handleImagesUpdated"
                  :multiple="true"
                  class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
                />

                <div class="mb-3">
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Jenis Kerusakan
                  </label>
                  <input
                    v-model="td.type_damage"
                    type="text"
                    placeholder="Contoh: Hama Tikus"
                    class="w-full px-4 py-3 border-2 rounded-lg transition border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white"
                  />
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span class="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs">🟡</span>
                      Kuning
                    </label>
                    <input
                      v-model="td.kuning"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-full px-4 py-3 border-2 rounded-lg transition border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span class="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs">🟠</span>
                      Kutilang
                    </label>
                    <input
                      v-model="td.kutilang"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-full px-4 py-3 border-2 rounded-lg transition border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs">🔴</span>
                      Busuk
                    </label>
                    <input
                      v-model="td.busuk"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-full px-4 py-3 border-2 rounded-lg transition border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activities.length > 0" class="space-y-6">
            <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span class="text-xl">⚙️</span>
                Aktivitas ({{ activities.length }})
              </h2>
              <p class="text-sm text-gray-500">Edit aktivitas yang memerlukan perbaikan</p>
            </div>

            <div
              v-for="(activity, index) in activities"
              :key="activity.gh_activity_id"
              class="rounded-2xl border-2 shadow-sm p-6 bg-white border-red-200"
            >
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                    {{ index + 1 }}
                  </div>
                  <h3 class="text-lg font-bold text-gray-900">
                    {{ activity.act_name || `Activity ${index + 1}` }}
                  </h3>
                </div>
              </div>

              <ImageUploadComponent
                v-if="activity.gh_activity_id"
                type="activity"
                :recordId="activity.gh_activity_id"
                :existingImages="activityImages[activity.gh_activity_id] || []"
                @upload-success="handleActivityImageUpload"
                @upload-error="handleImageUploadError"
                @delete="(e) => handleImageDelete(e, 'activity')"
                @images-updated="handleImagesUpdated"
                :multiple="true"
                class="mb-6 p-4 bg-green-50 rounded-lg border border-green-200"
              />

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Pilih Activity <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="activity.master_activity_id"
                    required
                    class="w-full px-4 py-3 border-2 rounded-lg transition border-gray-200 focus:border-[#0071f3] bg-white"
                  >
                    <option :value="null">{{ activity.act_name || 'Pilih Activity' }}</option>
                    <option
                      v-for="a in filteredActivities"
                      :key="a.activity_id"
                      :value="a.activity_id"
                    >
                      {{ a.activity || a.act_name }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Chart of Account (CoA)
                  </label>
                  <input
                    v-model="activity.CoA"
                    type="text"
                    placeholder="Auto-filled"
                    readonly
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed text-gray-700"
                  />
                </div>
              </div>

              <div class="mb-6 bg-gray-50 rounded-xl p-5">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <span class="text-lg">📦</span>
                  Material
                </h4>
                <div class="space-y-3">
                  <div
                    v-for="(material, matIndex) in activity.materials"
                    :key="matIndex"
                    class="flex flex-col md:flex-row gap-3 items-end bg-white rounded-lg p-4 border border-gray-200"
                  >
                    <div class="flex-1 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Nama Material</label>
                      <select
                        v-model="material.material_name"
                        @change="onMaterialChange(index, matIndex, material.material_name)"
                        :disabled="materialLoading"
                        class="w-full px-4 py-2.5 border-2 rounded-lg transition border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white text-gray-900"
                      >
                        <option :value="''">
                          {{ materialLoading ? '⏳ Loading...' : 'Pilih Material' }}
                        </option>
                        <option
                          v-for="mat in availableMaterials"
                          :key="mat.material_name"
                          :value="mat.material_name"
                        >
                          {{ mat.material_name }} (Stok: {{ formatNumber(mat.stock) }} {{ mat.uom }})
                        </option>
                      </select>
                    </div>

                    <div class="w-full md:w-32 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                      <input
                        v-model="material.qty"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        class="w-full px-4 py-2.5 border-2 rounded-lg transition border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white"
                      />
                    </div>

                    <div class="w-full md:w-32 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                      <input
                        v-model="material.uom"
                        type="text"
                        placeholder="kg"
                        readonly
                        class="w-full px-4 py-2.5 border-2 rounded-lg transition border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600"
                      />
                    </div>

                    <button
                      type="button"
                      @click="removeMaterialRow(index, matIndex)"
                      v-show="activity.materials.length > 1"
                      class="w-full md:w-auto px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition shadow-sm hover:shadow"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  @click="addMaterialRow(index)"
                  class="w-full mt-3 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-4 py-2.5 rounded-lg transition shadow-md hover:shadow-lg text-sm"
                >
                  + Tambah Material
                </button>
              </div>

              <div class="bg-gray-50 rounded-xl p-5">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <span class="text-lg">👷</span>
                  Tenaga Kerja
                </h4>
                <div class="bg-white rounded-lg p-4 border border-gray-200">
                  <div class="flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Jumlah Pekerja</label>
                    <input
                      type="number"
                      v-model="activity.manpower"
                      min="0"
                      placeholder="0"
                      class="w-full px-4 py-2.5 border-2 rounded-lg transition border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              @click="handleCancel"
              :disabled="saving"
              class="flex-1 px-6 py-3.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              <svg v-if="saving" class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ saving ? 'Menyimpan...' : '✅ Simpan Perubahan' }}</span>
            </button>
          </div>

          <div class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
            <div class="flex items-start gap-3">
              <span class="text-2xl">💡</span>
              <div class="flex-1">
                <p class="font-bold text-blue-900 mb-2">Panduan Edit</p>
                <ul class="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Upload Gambar:</strong> Klik area upload untuk menambah foto bukti</li>
                  <li>• <strong>Hapus Gambar:</strong> Klik tombol hapus (×) di pojok gambar</li>
                  <li>• <strong>Material:</strong> UOM akan otomatis terisi saat memilih material</li>
                  <li>• <strong>Perbaiki data</strong> sesuai dengan catatan revisi dari admin</li>
                  <li>• Setelah simpan, status akan berubah menjadi <strong>"On Review"</strong> untuk direview ulang</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </template>

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
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}

select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}
</style>