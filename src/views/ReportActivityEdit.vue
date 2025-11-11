<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { usePotatoActivityStore } from '../stores/potatoActivity'
import { useMaterialStore } from '../stores/material'
import { supabase } from '../lib/supabase'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const potatoActivityStore = usePotatoActivityStore()
const materialStore = useMaterialStore()

// ✅ Get report_id from route params
const report_id = ref(route.params.report_id || route.params.id || null)

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

// Type damages data
const typeDamages = ref([])

// Activities data
const activities = ref([])

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
  // 🧩 Sinkronisasi act_name ke act_id agar dropdown terisi otomatis saat revisi
activities.value.forEach((act) => {
  // kalau act_id belum ada tapi act_name sudah terisi
  if (!act.act_id && act.act_name) {
    // cari activity di master berdasarkan nama (case insensitive)
    const matched = potatoActivityStore.activities.find(a => 
      a.activity?.toLowerCase().trim() === act.act_name.toLowerCase().trim() ||
      a.act_name?.toLowerCase().trim() === act.act_name.toLowerCase().trim()
    )

    if (matched) {
      act.act_id = matched.activity_id
      act.CoA = act.CoA || matched.CoA_code
      console.log(`✅ Auto-linked activity "${act.act_name}" to master ID ${matched.activity_id}`)
    } else {
      console.warn(`⚠️ Tidak ditemukan activity di master untuk "${act.act_name}"`)
    }
  }
})

})

const loadData = async () => {
  try {
    loading.value = true
    
    // ✅ Load master data terlebih dahulu
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll(),
      potatoActivityStore.fetchAll(),
      materialStore.fetchStock()
    ])
    
    console.log('📋 Master Data Loaded:')
    console.log('  - Activities:', potatoActivityStore.activities.length)
    console.log('  - Materials:', materialStore.materialStock.length)

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
    if (!report) throw new Error('Laporan tidak ditemukan')

    // ✅ Check if report has items that need revision
    const hasRevisionItems = 
      (report.type_damages && report.type_damages.some(td => td.status === 'needRevision')) ||
      (report.activities && report.activities.some(act => act.status === 'needRevision'))

    if (!hasRevisionItems) {
      alert('⚠️ Laporan ini tidak memiliki item yang memerlukan revisi.')
      router.push('/reportActivityList')
      return
    }

    currentReport.value = report
    console.log('✅ Loaded report:', report)

    // Set basic form data
    form.value = {
      location_id: report.location_id,
      batch_id: report.batch_id,
      report_date: report.report_date
    }

    // ✅ Load ALL type damages
    if (report.type_damages) {
      typeDamages.value = report.type_damages.map(td => ({
        typedamage_id: td.typedamage_id,
        type_damage: td.type_damage,
        kuning: td.kuning || 0,
        kutilang: td.kutilang || 0,
        busuk: td.busuk || 0,
        status: td.status,
        revision_notes: td.revision_notes,
        approved_by: td.approved_by,
        approved_at: td.approved_at,
        editable: td.status === 'needRevision'
      }))
      
      // Collect revision notes from type damages
      report.type_damages.forEach(td => {
        if (td.revision_notes) {
          revisionNotes.value.push({
            type: 'Type Damage',
            item: td.type_damage,
            notes: td.revision_notes,
            by: td.revision_requested_by,
            at: td.revision_requested_at
          })
        }
      })
    }

    // ✅ Load ALL activities dengan mapping ke master data
    if (report.activities) {
      activities.value = report.activities.map(act => {
        // 🔍 Cari nama activity dari master data
        const masterActivity = potatoActivityStore.activities.find(a => a.activity_id == act.act_id)
        
        console.log(`📌 Mapping activity #${act.activity_id}:`, {
          act_id: act.act_id,
          db_name: act.act_name,
          master_name: masterActivity?.activity || masterActivity?.act_name
        })
        
        return {
          activity_id: act.activity_id,
          act_id: act.act_id,
          act_name: masterActivity?.activity || masterActivity?.act_name || act.act_name,
          CoA: act.CoA,
          qty: act.qty || 1,              
          unit: act.unit || 'unit',
          manpower: act.manpower || 0,
          status: act.status,
          materials: act.materials && act.materials.length > 0
            ? act.materials.map(mat => {
                // 🔍 Cari material di stock untuk mendapatkan material_id
                const stockMaterial = materialStore.materialStock.find(
                  m => m.material_name.toLowerCase().trim() === mat.material_name.toLowerCase().trim()
                )
                
                console.log(`📦 Mapping material "${mat.material_name}":`, {
                  found: !!stockMaterial,
                  material_id: stockMaterial?.material_id,
                  uom: mat.uom || stockMaterial?.uom
                })
                
                return {
                  material_used_id: mat.material_used_id,
                  material_id: stockMaterial?.material_id || mat.material_id,
                  material_name: mat.material_name,
                  qty: mat.qty || 0,
                  uom: mat.uom || stockMaterial?.uom || ''
                }
              })
            : [{ material_used_id: null, material_id: null, material_name: '', qty: 0, uom: '' }],
          revision_notes: act.revision_notes,
          approved_by: act.approved_by,
          approved_at: act.approved_at,
          editable: act.status === 'needRevision'
        }
      })
      
      // Collect revision notes from activities
      report.activities.forEach(act => {
        if (act.revision_notes) {
          revisionNotes.value.push({
            type: 'Activity',
            item: act.act_name,
            notes: act.revision_notes,
            by: act.revision_requested_by,
            at: act.revision_requested_at
          })
        }
      })
      
      console.log('✅ Loaded activities with materials:', activities.value)
    }

    // Load material stock for this location
    if (report.location_id) {
      await materialStore.fetchStock({ location_id: report.location_id })
    }
    
  } catch (err) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
    alert('❌ Gagal memuat data: ' + err.message)
    router.push('/reportActivityList')
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

// ✅ Watch for activity changes to auto-fill CoA dan act_name
watch(() => activities.value, (acts) => {
  acts.forEach((act) => {
    if (act.act_id) {
      const selected = potatoActivityStore.activities.find(a => a.activity_id == act.act_id)
      if (selected) {
        // Auto-fill CoA jika belum ada
        if (selected.CoA_code && !act.CoA) {
          act.CoA = selected.CoA_code
        }
        // Auto-fill act_name
        if (selected.activity || selected.act_name) {
          act.act_name = selected.activity || selected.act_name
        }
      }
    }
  })
}, { deep: true })

// ✅ Handler untuk material change - auto fill uom
const onMaterialChange = (activityIndex, materialIndex, material_id) => {
  if (!material_id) return
  
  const selectedMaterial = materialStore.materialStock.find(m => m.material_id == material_id)
  if (selectedMaterial) {
    const material = activities.value[activityIndex].materials[materialIndex]
    material.material_name = selectedMaterial.material_name
    material.uom = selectedMaterial.uom || material.uom
    
    console.log(`✅ Material changed:`, {
      material_id,
      material_name: selectedMaterial.material_name,
      uom: selectedMaterial.uom
    })
  }
}

// Material handlers
const addMaterialRow = (activityIndex) => {
  activities.value[activityIndex].materials.push({
    material_used_id: null,
    material_id: null,
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

// Form submission
const handleSubmit = async () => {
  try {
    saving.value = true
    error.value = null

    // Validate
    if (!form.value.location_id || !form.value.batch_id || !form.value.report_date) {
      throw new Error('Lokasi, Batch, dan Tanggal wajib diisi')
    }

    const username = authStore.user?.username || authStore.user?.email || 'Staff'
    const now = new Date().toISOString()

    // ✅ UPDATE ONLY TYPE DAMAGES WITH needRevision STATUS
    const editableTypeDamages = typeDamages.value.filter(td => td.editable)
    if (editableTypeDamages.length > 0) {
      for (const td of editableTypeDamages) {
        const { error: updateErr } = await supabase
          .from('gh_type_damage')
          .update({
            type_damage: td.type_damage,
            kuning: parseInt(td.kuning) || 0,
            kutilang: parseInt(td.kutilang) || 0,
            busuk: parseInt(td.busuk) || 0,
            status: 'onReview',
            revision_notes: null,
            revision_requested_by: null,
            revision_requested_at: null,
            revised_by: username,
            revised_at: now
          })
          .eq('typedamage_id', td.typedamage_id)
        
        if (updateErr) {
          console.error('Error updating type damage:', updateErr)
          throw new Error(`Gagal update kerusakan: ${updateErr.message}`)
        }
      }
      console.log(`✅ Updated ${editableTypeDamages.length} type damages`)
    }

    // ✅ UPDATE ONLY ACTIVITIES WITH needRevision STATUS
    const editableActivities = activities.value.filter(act => act.editable)
    if (editableActivities.length > 0) {
      for (const act of editableActivities) {
        // Validate activity
        if (!act.act_id) {
          throw new Error('Semua aktivitas wajib dipilih')
        }
        
        // 🔍 Get activity name from master data
        const masterActivity = potatoActivityStore.activities.find(a => a.activity_id == act.act_id)
        const activityName = masterActivity?.activity || masterActivity?.act_name || act.act_name

        console.log(`🔄 Updating activity ${act.activity_id}:`, {
          act_id: act.act_id,
          act_name: activityName,
          CoA: act.CoA,
          manpower: act.manpower
        })

        // Update activity
        const { error: updateActErr } = await supabase
          .from('gh_activity')
          .update({
            act_id: parseInt(act.act_id),
            act_name: activityName,
            CoA: act.CoA ? parseFloat(act.CoA) : null,
            manpower: parseInt(act.manpower) || 0,
            status: 'onReview',
            revision_notes: null,
            revision_requested_by: null,
            revision_requested_at: null,
            revised_by: username,
            revised_at: now
          })
          .eq('activity_id', act.activity_id)
        
        if (updateActErr) {
          console.error('Error updating activity:', updateActErr)
          throw new Error(`Gagal update aktivitas: ${updateActErr.message}`)
        }

        // Delete old materials
        const { error: deleteMatErr } = await supabase
          .from('gh_material_used')
          .delete()
          .eq('activity_id', act.activity_id)
        
        if (deleteMatErr) {
          console.error('Error deleting materials:', deleteMatErr)
          throw new Error(`Gagal hapus material lama: ${deleteMatErr.message}`)
        }

        // Insert new materials
        if (act.materials && act.materials.length > 0) {
          const validMaterials = act.materials.filter(m => m.material_id && m.qty > 0)
          
          if (validMaterials.length > 0) {
            const materialsToInsert = validMaterials.map(mat => {
              const stockMaterial = materialStore.materialStock.find(m => m.material_id == mat.material_id)
              
              console.log(`📦 Inserting material:`, {
                material_id: mat.material_id,
                material_name: stockMaterial?.material_name || mat.material_name,
                qty: mat.qty,
                uom: mat.uom || stockMaterial?.uom
              })
              
              return {
                activity_id: act.activity_id,
                material_id: parseInt(mat.material_id),
                material_name: stockMaterial?.material_name || mat.material_name,
                qty: parseFloat(mat.qty) || 0,
                uom: mat.uom || stockMaterial?.uom || ''
              }
            })

            const { error: insertMatErr } = await supabase
              .from('gh_material_used')
              .insert(materialsToInsert)
            
            if (insertMatErr) {
              console.error('Error inserting materials:', insertMatErr)
              throw new Error(`Gagal tambah material: ${insertMatErr.message}`)
            }
            
            console.log(`✅ Inserted ${materialsToInsert.length} materials`)
          }
        }
      }
      console.log(`✅ Updated ${editableActivities.length} activities`)
    }

    // ✅ CHECK IF ALL ITEMS ARE NOW APPROVED OR ONREVIEW
    const stillHasRevision = 
      typeDamages.value.some(td => td.status === 'needRevision' && !td.editable) ||
      activities.value.some(act => act.status === 'needRevision' && !act.editable)
    
    const newReportStatus = stillHasRevision ? 'needRevision' : 'onReview'
    
    // ✅ UPDATE REPORT STATUS
    const { error: updateReportErr } = await supabase
      .from('gh_report')
      .update({
        report_status: newReportStatus
      })
      .eq('report_id', report_id.value)
    
    if (updateReportErr) {
      console.error('Error updating report:', updateReportErr)
      throw new Error(`Gagal update status report: ${updateReportErr.message}`)
    }

    alert('✅ Laporan berhasil diperbarui dan dikirim untuk review ulang!')
    await router.push('/reportActivityList')
    
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
    router.push('/reportActivityList')
  }
}

// Computed
const filteredActivities = computed(() => {
  const activities = potatoActivityStore.activities
  if (!activities || activities.length === 0) {
    console.warn('⚠️ No activities loaded')
    return []
  }
  console.log('⚙️ Available activities:', activities.map(a => ({
    id: a.activity_id,
    name: a.activity || a.act_name
  })))
  return activities
})

const filteredMaterials = computed(() => {
  const materials = materialStore.materialStock
  if (!materials || materials.length === 0) {
    console.warn('⚠️ No materials loaded in materialStore.materialStock')
    return []
  }
  console.log('📦 Available materials for dropdown:', materials.map(m => ({
    id: m.material_id,
    name: m.material_name,
    uom: m.uom
  })))
  return materials
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
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
                🔄
              </span>
              Edit Laporan Aktivitas
            </h1>
            <p class="text-sm text-gray-500 mt-1">Perbaiki item yang memerlukan revisi - Report ID: #{{ report_id }}</p>
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
          <p class="mt-4 text-gray-600 font-semibold">Memuat data...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error && !saving" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <template v-else-if="!loading">
        
        <!-- Revision Notices -->
        <div v-if="revisionNotes.length > 0" class="mb-6 space-y-3">
          <div
            v-for="(note, idx) in revisionNotes"
            :key="idx"
            class="bg-red-50 border-2 border-red-200 rounded-2xl p-5"
          >
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl flex-shrink-0">
                🔄
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg">
                    {{ note.type }}
                  </span>
                  <span class="text-sm font-bold text-red-900">{{ note.item }}</span>
                </div>
                <div class="bg-white rounded-lg p-4 border-2 border-red-200">
                  <p class="text-red-700 whitespace-pre-wrap font-medium">{{ note.notes }}</p>
                </div>
                <p class="text-xs text-red-600 mt-2">By: {{ note.by }} • {{ formatDateTime(note.at) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
          
          <!-- Basic Information (Read Only) -->
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-xl">📋</span>
              Informasi Dasar (Read Only)
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Lokasi
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ getLocationName(form.location_id) }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Batch
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ getBatchName(form.batch_id) }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal
                </label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ form.report_date }}
                </div>
              </div>
            </div>
          </div>

          <!-- Type Damages Section -->
          <div v-if="typeDamages.length > 0" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-xl">🌾</span>
              Kerusakan Tanaman ({{ typeDamages.length }})
            </h2>
            
            <div class="space-y-4">
              <div
                v-for="(td, index) in typeDamages"
                :key="td.typedamage_id"
                :class="[
                  'rounded-xl p-5 border-2',
                  td.editable ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                ]"
              >
                <!-- Status Badge -->
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm font-bold text-gray-600">Kerusakan #{{ index + 1 }}</span>
                  <span 
                    :class="[
                      'px-3 py-1 rounded-lg font-bold text-xs border-2',
                      td.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                      td.status === 'needRevision' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-yellow-100 text-yellow-800 border-yellow-200'
                    ]"
                  >
                    {{ td.status === 'approved' ? '✅ Approved' : 
                       td.status === 'needRevision' ? '🔄 Need Revision' : 
                       '⏳ On Review' }}
                  </span>
                </div>

                <!-- Revision Note (if any) -->
                <div v-if="td.revision_notes && td.editable" class="mb-4 bg-red-100 border-2 border-red-300 rounded-lg p-3">
                  <p class="text-xs text-red-600 font-semibold mb-1">📝 Catatan Revisi:</p>
                  <p class="text-sm text-red-900">{{ td.revision_notes }}</p>
                </div>

                <!-- Approved Info (if approved) -->
                <div v-if="td.status === 'approved' && td.approved_at" class="mb-4 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                  <p class="text-xs text-green-600 font-semibold mb-1">✅ Sudah Disetujui</p>
                  <p class="text-sm text-green-900">By: {{ td.approved_by }} • {{ formatDateTime(td.approved_at) }}</p>
                </div>

                <div class="mb-3">
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Jenis Kerusakan
                  </label>
                  <input
                    v-model="td.type_damage"
                    type="text"
                    placeholder="Contoh: Hama Tikus"
                    :readonly="!td.editable"
                    :class="[
                      'w-full px-4 py-3 border-2 rounded-lg transition',
                      td.editable 
                        ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                        : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                    ]"
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
                      :readonly="!td.editable"
                      :class="[
                        'w-full px-4 py-3 border-2 rounded-lg transition',
                        td.editable 
                          ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                      ]"
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
                      :readonly="!td.editable"
                      :class="[
                        'w-full px-4 py-3 border-2 rounded-lg transition',
                        td.editable 
                          ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                      ]"
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
                      :readonly="!td.editable"
                      :class="[
                        'w-full px-4 py-3 border-2 rounded-lg transition',
                        td.editable 
                          ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                      ]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Activities Section -->
          <div v-if="activities.length > 0" class="space-y-6">
            <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span class="text-xl">⚙️</span>
                Aktivitas ({{ activities.length }})
              </h2>
              <p class="text-sm text-gray-500">Item dengan border merah bisa diedit, yang abu-abu sudah approved</p>
            </div>

            <div
              v-for="(activity, index) in activities"
              :key="activity.activity_id"
              :class="[
                'rounded-2xl border-2 shadow-sm p-6',
                activity.editable ? 'bg-white border-red-200' : 'bg-gray-50 border-gray-200'
              ]"
            >
              <!-- Status Badge -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                    {{ index + 1 }}
                  </div>
                  <h3 class="text-lg font-bold text-gray-900">
                    {{ activity.act_name || `Activity ${index + 1}` }}
                  </h3>
                </div>
                <span 
                  :class="[
                    'px-3 py-1 rounded-lg font-bold text-xs border-2',
                    activity.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                    activity.status === 'needRevision' ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-yellow-100 text-yellow-800 border-yellow-200'
                  ]"
                >
                  {{ activity.status === 'approved' ? '✅ Approved' : 
                     activity.status === 'needRevision' ? '🔄 Need Revision' : 
                     '⏳ On Review' }}
                </span>
              </div>

              <!-- Revision Note (if any) -->
              <div v-if="activity.revision_notes && activity.editable" class="mb-4 bg-red-50 border-2 border-red-300 rounded-lg p-3">
                <p class="text-xs text-red-600 font-semibold mb-1">📝 Catatan Revisi:</p>
                <p class="text-sm text-red-900">{{ activity.revision_notes }}</p>
              </div>

              <!-- Approved Info (if approved) -->
              <div v-if="activity.status === 'approved' && activity.approved_at" class="mb-4 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                <p class="text-xs text-green-600 font-semibold mb-1">✅ Sudah Disetujui</p>
                <p class="text-sm text-green-900">By: {{ activity.approved_by }} • {{ formatDateTime(activity.approved_at) }}</p>
              </div>

              <!-- Activity & CoA -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Pilih Activity 
                    <span v-if="activity.editable" class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="activity.act_id"
                    :required="activity.editable"
                    :disabled="!activity.editable"
                    class="w-full px-4 py-3 border-2 rounded-lg transition"
                    :class="activity.editable ? 'border-gray-200 focus:border-[#0071f3] bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'"
                    style="color: #111827 !important; -webkit-text-fill-color: #111827 !important; color-scheme: light !important;"
                  >
                    <option :value="null" style="color: #111827 !important; background-color: #ffffff !important;">
                      Pilih Activity
                    </option>
                    <option
                      v-for="a in filteredActivities"
                      :key="a.activity_id"
                      :value="a.activity_id"
                      style="color: #111827 !important; background-color: #ffffff !important;">
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

              <!-- Materials -->
              <div class="mb-6 bg-gray-50 rounded-xl p-5">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <span class="text-lg">📦</span>
                  Material
                  <span v-if="!activity.editable" class="ml-auto text-xs text-gray-500 font-normal">(Read Only)</span>
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
                        v-model="material.material_id"
                        :disabled="!activity.editable"
                        :class="[
                          'w-full px-4 py-2.5 border-2 rounded-lg transition',
                          activity.editable 
                            ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white text-gray-900' 
                            : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                        ]"
                      >
                        <option :value="null" class="text-gray-900">{{ material.material_name || 'Pilih Material' }}</option>
                        <option
                          v-for="mat in filteredMaterials"
                          :key="mat.material_id"
                          :value="mat.material_id"
                          class="text-gray-900"
                        >
                          {{ mat.material_name }}
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
                        :readonly="!activity.editable"
                        :class="[
                          'w-full px-4 py-2.5 border-2 rounded-lg transition',
                          activity.editable 
                            ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                            : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                        ]"
                      />
                    </div>

                    <div class="w-full md:w-32 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                      <input
                        v-model="material.uom"
                        type="text"
                        placeholder="kg"
                        :readonly="!activity.editable"
                        :class="[
                          'w-full px-4 py-2.5 border-2 rounded-lg transition',
                          activity.editable 
                            ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                            : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                        ]"
                      />
                    </div>

                    <button
                      v-if="activity.editable"
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
                  v-if="activity.editable"
                  type="button"
                  @click="addMaterialRow(index)"
                  class="w-full mt-3 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-4 py-2.5 rounded-lg transition shadow-md hover:shadow-lg text-sm"
                >
                  + Tambah Material
                </button>
              </div>

              <!-- Manpower -->
              <div class="bg-gray-50 rounded-xl p-5">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <span class="text-lg">👷</span>
                  Tenaga Kerja
                  <span v-if="!activity.editable" class="ml-auto text-xs text-gray-500 font-normal">(Read Only)</span>
                </h4>
                <div class="bg-white rounded-lg p-4 border border-gray-200">
                  <div class="flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Jumlah Pekerja</label>
                    <input
                      type="number"
                      v-model="activity.manpower"
                      min="0"
                      placeholder="0"
                      :readonly="!activity.editable"
                      :class="[
                        'w-full px-4 py-2.5 border-2 rounded-lg transition',
                        activity.editable 
                          ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                      ]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No Revision Items -->
          <div v-if="typeDamages.length === 0 && activities.length === 0" class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
            <div class="flex items-center gap-3">
              <span class="text-3xl">ℹ️</span>
              <div>
                <p class="font-bold text-blue-900">Tidak Ada Item</p>
                <p class="text-sm text-blue-700 mt-1">Laporan ini tidak memiliki data kerusakan atau aktivitas.</p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-4" v-if="typeDamages.some(td => td.editable) || activities.some(act => act.editable)">
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

          <!-- Info if no editable items -->
          <div v-else class="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
            <div class="flex items-center gap-3">
              <span class="text-3xl">⚠️</span>
              <div>
                <p class="font-bold text-yellow-900">Tidak Ada Item yang Bisa Diedit</p>
                <p class="text-sm text-yellow-700 mt-1">Semua item sudah approved atau sedang direview. Hanya item dengan status "Need Revision" yang bisa diedit.</p>
              </div>
            </div>
            <button
              type="button"
              @click="router.push('/reportActivityList')"
              class="mt-4 w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition"
            >
              Kembali ke List
            </button>
          </div>
        </form>

        <!-- Info Box -->
        <div class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mt-6">
          <div class="flex items-start gap-3">
            <span class="text-2xl">💡</span>
            <div class="flex-1">
              <p class="font-bold text-blue-900 mb-2">Panduan Edit</p>
              <ul class="text-sm text-blue-800 space-y-1">
                <li>• <strong>Perbaiki data</strong> sesuai dengan catatan revisi dari admin</li>
                <li>• Hanya item dengan status <strong>"Need Revision"</strong> yang bisa diedit</li>
                <li>• Setelah simpan, status akan berubah menjadi <strong>"On Review"</strong> untuk direview ulang</li>
                <li>• Informasi dasar (Lokasi, Batch, Tanggal) tidak bisa diubah</li>
                <li>• Pastikan semua data sudah benar sebelum menyimpan</li>
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
  </div>
</template>

<style scoped>
/* Hapus panah default di input number */
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
  color: #111827 !important;
  background-color: #ffffff !important;
  color-scheme: light !important; /* PAKSA LIGHT MODE */
}

/* Paksa opsi dropdown */
:deep(option) {
  color: #111827 !important;
  background-color: #ffffff !important;
  -webkit-text-fill-color: #111827 !important;
}

/* Fallback untuk browser yang tidak support :deep */
select option {
  color: #111827 !important;
  background: #ffffff !important;
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}
</style>