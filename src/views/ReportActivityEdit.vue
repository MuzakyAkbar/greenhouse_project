<script setup>
import { ref, onMounted, computed, watch } from 'vue'
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

const reportId = ref(route.params.id)
const loading = ref(true)
const saving = ref(false)
const error = ref(null)

// Form data
const form = ref({
  location: '',
  batch_id: null,
  report_date: ''
})

// ✅ UPDATED: Type damage stored as simple object
const typeDamage = ref({
  kuning: 0,
  kutilang: 0,
  busuk: 0
})

const formSections = ref([
  {
    id: Date.now(),
    activity_id: null,
    CoA: null,
    materials: [{ material_id: null, qty: null, uom: '' }],
    manpower: null
  }
])

const revisionNotes = ref('')
const originalData = ref(null)

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
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

    if (data.report_status !== 'needRevision') {
      alert('⚠️ Laporan ini tidak memerlukan revisi.\n\nStatus saat ini: ' + data.report_status)
      router.push('/reportActivityList')
      return
    }

    originalData.value = { ...data }
    revisionNotes.value = data.revision_notes || 'Tidak ada catatan revisi'

    // Load basic form
    form.value = {
      location: data.location || '',
      batch_id: data.batch_id ? Number(data.batch_id) : null,
      report_date: data.report_date || ''
    }

    // ✅ UPDATED: Load damage types from columns
    typeDamage.value = {
      kuning: data.type_damage_kuning || 0,
      kutilang: data.type_damage_kutilang || 0,
      busuk: data.type_damage_busuk || 0
    }

    // Fetch all related reports
    const { data: allReports } = await activityReportStore.fetchAll()
    const relatedReports = allReports.filter(r => 
      r.batch_id === data.batch_id &&
      r.report_date === data.report_date &&
      r.location === data.location &&
      r.report_status === 'needRevision'
    )

    // Group by activity
    const grouped = relatedReports.reduce((acc, report) => {
      const activityId = report.activity_id
      if (!acc[activityId]) {
        acc[activityId] = {
          activity_id: activityId,
          CoA: report.CoA || report.CoA,  // Handle both cases
          manpower: report.manpower,
          materials: []
        }
      }
      
      if (report.material_id) {
        acc[activityId].materials.push({
          material_id: report.material_id,
          qty: report.qty,
          uom: report.uom || report.uom  // Handle both cases
        })
      }
      
      return acc
    }, {})

    formSections.value = Object.values(grouped).map((activity, idx) => ({
      id: Date.now() + idx,
      activity_id: activity.activity_id,
      CoA: activity.CoA,
      materials: activity.materials.length > 0 
        ? activity.materials 
        : [{ material_id: null, qty: null, uom: '' }],
      manpower: activity.manpower
    }))

  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err.message
    alert('❌ Gagal memuat data: ' + err.message)
    router.push('/reportActivityList')
  } finally {
    loading.value = false
  }
})

// Computed
const filteredActivities = computed(() => {
  const activities = potatoActivityStore.activities
  if (!activities || activities.length === 0) return []
  return activities
})

const filteredMaterials = computed(() => {
  const materials = materialStore.materials
  if (!materials || materials.length === 0) return []
  return materials
})

// Watch for activity changes to auto-fill CoA
watch(() => formSections.value, (sections) => {
  sections.forEach((s) => {
    const selected = potatoActivityStore.activities.find(a => a.activity_id == s.activity_id)
    if (selected?.CoA_code) {
      s.CoA = selected.CoA_code
    }
  })
}, { deep: true })

// Form handlers
function addFormSection() {
  formSections.value.push({
    id: Date.now(),
    activity_id: null,
    CoA: null,
    materials: [{ material_id: null, qty: null, uom: '' }],
    manpower: null
  })
}

function removeFormSection(index) {
  if (formSections.value.length > 1) {
    formSections.value.splice(index, 1)
  }
}

function addMaterialRow(sectionIndex) {
  formSections.value[sectionIndex].materials.push({ material_id: null, qty: null, uom: '' })
}

function removeMaterialRow(sectionIndex, matIndex) {
  if (formSections.value[sectionIndex].materials.length > 1) {
    formSections.value[sectionIndex].materials.splice(matIndex, 1)
  }
}

const handleSubmit = async () => {
  try {
    saving.value = true
    error.value = null

    // Validate
    if (!form.value.location || !form.value.batch_id || !form.value.report_date) {
      throw new Error('Lokasi, Batch, dan Tanggal wajib diisi')
    }

    const hasEmptyActivity = formSections.value.some(s => !s.activity_id)
    if (hasEmptyActivity) {
      throw new Error('Semua aktivitas wajib dipilih')
    }

    // 1. Get all old reports yang perlu di-update
    const { data: oldReports } = await activityReportStore.fetchAll()
    const reportsToUpdate = oldReports.filter(r => 
      r.batch_id === originalData.value.batch_id &&
      r.report_date === originalData.value.report_date &&
      r.location === originalData.value.location &&
      r.report_status === 'needRevision'
    )

    console.log('📋 Old reports to update:', reportsToUpdate.length)

    // 2. Build array of all new report payloads
    const newReportPayloads = []
    
    for (const section of formSections.value) {
      if (section.materials.length === 0 || !section.materials[0].material_id) {
        newReportPayloads.push({
          location: form.value.location,
          batch_id: parseInt(form.value.batch_id),
          activity_id: parseInt(section.activity_id),
          material_id: null,
          qty: 0,
          uom: null,
          manpower: parseInt(section.manpower) || 0,
          CoA: section.CoA ? parseFloat(section.CoA) : null,
          type_damage_kuning: parseInt(typeDamage.value.kuning) || 0,
          type_damage_kutilang: parseInt(typeDamage.value.kutilang) || 0,
          type_damage_busuk: parseInt(typeDamage.value.busuk) || 0,
          report_date: form.value.report_date,
          report_status: 'onReview',
          revision_notes: null,
          revision_requested_by: null,
          revision_requested_at: null,
          revised_by: authStore.user?.username || authStore.user?.email || 'Staff',
          revised_at: new Date().toISOString()
        })
      } else {
        for (const mat of section.materials) {
          if (!mat.material_id) continue

          newReportPayloads.push({
            location: form.value.location,
            batch_id: parseInt(form.value.batch_id),
            activity_id: parseInt(section.activity_id),
            material_id: parseInt(mat.material_id),
            qty: parseFloat(mat.qty) || 0,
            uom: mat.uom || null,
            manpower: parseInt(section.manpower) || 0,
            CoA: section.CoA ? parseFloat(section.CoA) : null,
            type_damage_kuning: parseInt(typeDamage.value.kuning) || 0,
            type_damage_kutilang: parseInt(typeDamage.value.kutilang) || 0,
            type_damage_busuk: parseInt(typeDamage.value.busuk) || 0,
            report_date: form.value.report_date,
            report_status: 'onReview',
            revision_notes: null,
            revision_requested_by: null,
            revision_requested_at: null,
            revised_by: authStore.user?.username || authStore.user?.email || 'Staff',
            revised_at: new Date().toISOString()
          })
        }
      }
    }

    console.log('📝 New payloads to save:', newReportPayloads.length)

    // 3. UPDATE existing reports or DELETE extra ones
    for (let i = 0; i < reportsToUpdate.length; i++) {
      if (i < newReportPayloads.length) {
        // UPDATE existing report dengan data baru
        console.log(`🔄 Updating report_id ${reportsToUpdate[i].report_id}`)
        const { error: updateError } = await activityReportStore.update(
          reportsToUpdate[i].report_id, 
          newReportPayloads[i]
        )
        
        if (updateError) {
          console.error('Update error:', updateError)
          throw new Error(`Gagal update laporan #${reportsToUpdate[i].report_id}: ${updateError.message}`)
        }
      } else {
        // DELETE extra old reports (jika jumlah berkurang)
        console.log(`🗑️ Deleting extra report_id ${reportsToUpdate[i].report_id}`)
        await activityReportStore.remove(reportsToUpdate[i].report_id)
      }
    }

    // 4. CREATE new reports jika ada penambahan
    if (newReportPayloads.length > reportsToUpdate.length) {
      for (let i = reportsToUpdate.length; i < newReportPayloads.length; i++) {
        console.log(`➕ Creating new report (${i + 1})`)
        const { error: createError } = await activityReportStore.create(newReportPayloads[i])
        
        if (createError) {
          console.error('Create error:', createError)
          throw new Error(`Gagal membuat laporan baru: ${createError.message}`)
        }
      }
    }

    alert('✅ Laporan berhasil diperbarui dan dikirim untuk review ulang!')
    await router.replace('/reportActivityList')
  } catch (err) {
    console.error('Error updating report:', err)
    error.value = err.message
    alert('❌ Gagal memperbarui laporan: ' + err.message)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  if (confirm('❓ Batalkan perubahan?\n\nData yang belum disimpan akan hilang.')) {
    router.push('/reportActivityList')
  }
}
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
            <p class="text-sm text-gray-500 mt-1">Perbaiki laporan berdasarkan catatan revisi</p>
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

      <!-- Revision Notice -->
      <div v-if="!loading && !error && revisionNotes" class="mb-6">
        <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl flex-shrink-0">
              🔄
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-red-900 text-lg mb-2">Catatan Revisi dari Admin</h3>
              <div class="bg-white rounded-lg p-4 border-2 border-red-200">
                <p class="text-red-700 whitespace-pre-wrap font-medium">{{ revisionNotes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form v-if="!loading" @submit.prevent="handleSubmit" class="space-y-6">
        
        <!-- Basic Information -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span class="text-xl">📋</span>
            Informasi Dasar
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <!-- Date -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Tanggal <span class="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                v-model="form.report_date"
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              />
            </div>

            <!-- Location -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Lokasi <span class="text-red-500">*</span>
              </label>
              <select 
                v-model="form.location" 
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              >
                <option value="">Pilih Lokasi</option>
                <option v-for="loc in locationStore.locations" :key="loc.location_id" :value="loc.location">
                  {{ loc.location }}
                </option>
              </select>
            </div>

            <!-- Batch -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Batch <span class="text-red-500">*</span>
              </label>
              <select 
                v-model="form.batch_id" 
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              >
                <option :value="null">Pilih Batch</option>
                <option v-for="batch in batchStore.batches" :key="batch.batch_id" :value="batch.batch_id">
                  {{ batch.batch_name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Damage Types -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span class="text-xl">🌱</span>
            Jenis Kerusakan Tanaman
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs">🟡</span>
                Kuning
              </label>
              <input
                v-model="typeDamage.kuning"
                type="number"
                min="0"
                placeholder="0"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs">🟠</span>
                Kutilang
              </label>
              <input
                v-model="typeDamage.kutilang"
                type="number"
                min="0"
                placeholder="0"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs">🔴</span>
                Busuk
              </label>
              <input
                v-model="typeDamage.busuk"
                type="number"
                min="0"
                placeholder="0"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        <!-- Activity Sections -->
        <div class="space-y-6">
          <div
            v-for="(section, index) in formSections"
            :key="section.id"
            class="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] shadow-sm hover:shadow-xl transition-all p-6"
          >
            <!-- Delete Button -->
            <button
              type="button"
              @click="removeFormSection(index)"
              v-if="formSections.length > 1"
              class="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-lg flex items-center justify-center transition shadow-md hover:shadow-lg z-10"
              title="Hapus Aktivitas"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
              </svg>
            </button>

            <!-- Activity Header -->
            <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                {{ index + 1 }}
              </div>
              <h3 class="text-lg font-bold text-gray-900">Activity {{ index + 1 }}</h3>
            </div>

            <!-- Activity & CoA -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Pilih Activity <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="section.activity_id"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                >
                  <option :value="null">Pilih Activity</option>
                  <option
                    v-for="a in filteredActivities"
                    :key="a.activity_id"
                    :value="a.activity_id"
                  >
                    {{ a.activity }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Chart of Account (CoA)
                </label>
                <input
                  v-model="section.CoA"
                  type="text"
                  placeholder="Auto-filled"
                  readonly
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>

            <!-- Materials -->
            <div class="mb-6 bg-gray-50 rounded-xl p-5">
              <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                <span class="text-lg">📦</span>
                Material
              </h4>
              <div class="space-y-3">
                <div
                  v-for="(material, matIndex) in section.materials"
                  :key="matIndex"
                  class="flex flex-col md:flex-row gap-3 items-end bg-white rounded-lg p-4 border border-gray-200"
                >
                  <div class="flex-1 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Nama Material</label>
                    <select
                      v-model="material.material_id"
                      class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                    >
                      <option :value="null">Pilih Material</option>
                      <option
                        v-for="mat in filteredMaterials"
                        :key="mat.material_id"
                        :value="mat.material_id"
                      >
                        {{ mat.material_name || mat.name || 'Material' }}
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
                      class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                    />
                  </div>

                  <div class="w-full md:w-32 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                    <input
                      v-model="material.uom"
                      type="text"
                      placeholder="kg"
                      class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                    />
                  </div>

                  <button
                    type="button"
                    @click="removeMaterialRow(index, matIndex)"
                    v-if="section.materials.length > 1"
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

            <!-- Manpower -->
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
                    v-model="section.manpower"
                    min="0"
                    placeholder="0"
                    class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Activity Button -->
        <div class="flex justify-center">
          <button
            type="button"
            @click="addFormSection"
            class="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow-lg transition-all flex items-center gap-2"
          >
            <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
            </svg>
            Tambah Aktivitas Baru
          </button>
        </div>

        <!-- Action Buttons -->
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
            class="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            <svg v-if="saving" class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ saving ? 'Menyimpan...' : '💾 Simpan & Kirim untuk Review' }}</span>
          </button>
        </div>
      </form>

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
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}
</style>