<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Parameter URL adalah record_id (Approval ID)
const record_id = route.params.record_id
const loading = ref(true)
const submitting = ref(false)

// State Mode
const isRepair = ref(false) // True jika yang diedit adalah Repair Request

// Data
const damageData = ref(null) // Menyimpan info Header (Batch, Lokasi, dll)
const revisionNotes = ref([])

// Form Data Report (Untuk Edit Laporan Kerusakan Awal)
const typeDamageList = ref([])

// Form Data Repair (Untuk Edit Perbaikan)
const repairForm = ref({
  repair_id: null,
  repair_method: '',
  repair_notes: '',
  repaired_by: '',
  kuning_repaired: 0,
  kutilang_repaired: 0,
  images: []
})

// --- Computed Helper ---
const pageTitle = computed(() => isRepair.value ? 'Revisi Perbaikan (Repair)' : 'Revisi Laporan Kerusakan')
const pageColor = computed(() => isRepair.value ? 'blue' : 'orange') // Blue untuk Repair, Orange untuk Report

onMounted(async () => {
  if (!record_id) {
    alert('Invalid Record ID')
    router.push('/planningReportList')
    return
  }
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    // 1. Cek tipe record approval
    const { data: approval, error: appError } = await supabase
      .from('gh_approve_record')
      .select('reference_type')
      .eq('record_id', record_id)
      .single()

    if (appError) throw appError

    if (approval.reference_type === 'damage_repair') {
        isRepair.value = true
        await loadRepairData()
    } else {
        isRepair.value = false
        await loadReportData()
    }

    // Load History Revisi
    await loadRevisionNotes()

  } catch (error) {
    console.error('Error loading data:', error)
    alert('Gagal memuat data: ' + error.message)
    router.push('/planningReportList')
  } finally {
    loading.value = false
  }
}

// --- LOGIC: Load Report (Summary) ---
const loadReportData = async () => {
    const { data: summaryData, error } = await supabase
      .from('gh_damage_summary')
      .select(`
        *,
        gh_report!inner(
          report_id,
          report_date,
          batch_id,
          location_id,
          phase_id,
          gh_batch(batch_name),
          gh_location(location),
          gh_phase(phase_name)
        )
      `)
      .eq('approval_record_id', record_id)
      .single()

    if (error) throw error
    
    // Mapping Header Info
    damageData.value = {
        summary_id: summaryData.summary_id,
        report_id: summaryData.report_id,
        location: summaryData.gh_report?.gh_location?.location,
        batch: summaryData.gh_report?.gh_batch?.batch_name,
        phase: summaryData.gh_report?.gh_phase?.phase_name,
        date: summaryData.report_date
    }

    // Load Tipe Kerusakan
    const { data: typeDamageData } = await supabase
      .from('gh_type_damage')
      .select('*')
      .eq('report_id', summaryData.report_id)

    if (typeDamageData) {
      typeDamageList.value = typeDamageData.map(td => ({
        typedamage_id: td.typedamage_id,
        type_damage: td.type_damage || '',
        kuning: td.kuning || 0,
        kutilang: td.kutilang || 0,
        busuk: td.busuk || 0,
        images: td.images ? JSON.parse(td.images) : []
      }))
    }
}

// --- LOGIC: Load Repair ---
const loadRepairData = async () => {
    const { data: repairData, error } = await supabase
      .from('gh_damage_repair')
      .select(`
        *,
        gh_damage_summary!inner (
            summary_id,
            gh_report!inner (
                report_date,
                gh_batch(batch_name),
                gh_location(location),
                gh_phase(phase_name)
            )
        )
      `)
      .eq('approval_record_id', record_id)
      .single()

    if (error) throw error

    // Mapping Header Info
    damageData.value = {
        summary_id: repairData.summary_id, // Untuk update nett nanti
        location: repairData.gh_damage_summary?.gh_report?.gh_location?.location,
        batch: repairData.gh_damage_summary?.gh_report?.gh_batch?.batch_name,
        phase: repairData.gh_damage_summary?.gh_report?.gh_phase?.phase_name,
        date: repairData.repair_date
    }

    // Populate Form Repair
    repairForm.value = {
        repair_id: repairData.repair_id,
        repair_method: repairData.repair_method,
        repair_notes: repairData.repair_notes,
        repaired_by: repairData.repaired_by,
        kuning_repaired: repairData.kuning_repaired,
        kutilang_repaired: repairData.kutilang_repaired,
        images: repairData.images ? JSON.parse(repairData.images) : []
    }
}

const loadRevisionNotes = async () => {
  try {
    const { data, error } = await supabase
      .from('gh_approval_history')
      .select(`*, user:user_id(username)`)
      .eq('record_id', record_id)
      .eq('action', 'revision_requested')
      .order('action_at', { ascending: false })

    if (!error && data) revisionNotes.value = data
  } catch (error) { console.error(error) }
}

// --- Image Handling ---
const handleImageUpload = async (event, targetList) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  try {
    const bucket = isRepair.value ? 'gh-repair-images' : 'gh-damage-images'
    const folder = isRepair.value ? 'repairs' : 'damage'

    for (const file of files) {
      const fileName = `${Date.now()}_${file.name}`
      const filePath = `${folder}/${fileName}`
      
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
      
      targetList.push({ url: publicUrl, path: filePath, bucket: bucket })
    }
  } catch (error) { alert('Upload error: ' + error.message) }
}

const uploadRepairImage = (e) => handleImageUpload(e, repairForm.value.images)
const uploadReportImage = (e, idx) => handleImageUpload(e, typeDamageList.value[idx].images)

const removeRepairImage = (idx) => repairForm.value.images.splice(idx, 1)
const removeReportImage = (tIdx, idx) => typeDamageList.value[tIdx].images.splice(idx, 1)

// --- Report Specific Methods ---
const addTypeDamage = () => typeDamageList.value.push({ typedamage_id: null, type_damage: '', kuning: 0, kutilang: 0, busuk: 0, images: [] })
const removeTypeDamage = (index) => { if (confirm('Hapus item ini?')) typeDamageList.value.splice(index, 1) }

// --- MAIN SUBMIT HANDLER ---
const handleSubmit = async () => {
  if (!confirm('Simpan perubahan dan kirim ulang untuk review?')) return
  submitting.value = true
  
  try {
    if (isRepair.value) {
        await submitRepair()
    } else {
        await submitReport()
    }

    // 1. Reset Approval Status ke 'onReview'
    await supabase.from('gh_approve_record')
        .update({ overall_status: 'onReview', current_level_order: 1 })
        .eq('record_id', record_id)

    // 2. Reset Level Statuses (agar butuh approval ulang)
    await supabase.from('gh_approval_level_status')
        .update({ status: 'pending', approved_by: null, approved_at: null, revision_notes: null })
        .eq('record_id', record_id)

    // 3. Tambah History Log
    const { data: flowData } = await supabase.from('gh_approve_record').select('flow_id').eq('record_id', record_id).single()
    await supabase.from('gh_approval_history').insert({
        record_id: record_id,
        flow_id: flowData?.flow_id,
        user_id: authStore.user.id,
        level_order: 1,
        action: 'submitted',
        comment: 'Revisi diselesaikan dan dikirim ulang'
    })

    alert('Perubahan berhasil disimpan!')
    router.push('/planningReportList')

  } catch (error) {
    console.error(error)
    alert('Gagal: ' + error.message)
  } finally {
    submitting.value = false
  }
}

const submitRepair = async () => {
    const { error } = await supabase
        .from('gh_damage_repair')
        .update({
            repair_method: repairForm.value.repair_method,
            repair_notes: repairForm.value.repair_notes,
            repaired_by: repairForm.value.repaired_by,
            kuning_repaired: repairForm.value.kuning_repaired,
            kutilang_repaired: repairForm.value.kutilang_repaired,
            images: JSON.stringify(repairForm.value.images),
            status: 'onReview',
            updated_at: new Date().toISOString()
        })
        .eq('repair_id', repairForm.value.repair_id)
    
    if (error) throw error
    
    // Opsional: Recalculate nett damage di summary (tidak wajib jika trigger DB handle ini)
}

const submitReport = async () => {
    // 1. Update Types
    for (const type of typeDamageList.value) {
      const typeData = {
        type_damage: type.type_damage,
        kuning: type.kuning,
        kutilang: type.kutilang,
        busuk: type.busuk,
        images: JSON.stringify(type.images),
        status: 'onReview'
      }
      if (type.typedamage_id) {
         await supabase.from('gh_type_damage').update(typeData).eq('typedamage_id', type.typedamage_id)
      } else {
         typeData.report_id = damageData.value.report_id
         await supabase.from('gh_type_damage').insert(typeData)
      }
    }
    
    // 2. Update Summary Totals
    const totalKuning = typeDamageList.value.reduce((sum, t) => sum + (t.kuning || 0), 0)
    const totalKutilang = typeDamageList.value.reduce((sum, t) => sum + (t.kutilang || 0), 0)
    const totalBusuk = typeDamageList.value.reduce((sum, t) => sum + (t.busuk || 0), 0)
    
    // Ambil repair existing untuk hitung nett
    const { data: repairs } = await supabase.from('gh_damage_repair')
      .select('kuning_repaired, kutilang_repaired').eq('summary_id', damageData.value.summary_id)
    
    const totalRepairedKuning = repairs?.reduce((sum, r) => sum + (r.kuning_repaired || 0), 0) || 0
    const totalRepairedKutilang = repairs?.reduce((sum, r) => sum + (r.kutilang_repaired || 0), 0) || 0

    await supabase.from('gh_damage_summary').update({
        kuning_total: totalKuning,
        kutilang_total: totalKutilang,
        busuk_total: totalBusuk,
        kuning_nett: totalKuning - totalRepairedKuning,
        kutilang_nett: totalKutilang - totalRepairedKutilang,
        busuk_nett: totalBusuk,
        status: 'onReview',
        updated_at: new Date().toISOString()
    }).eq('summary_id', damageData.value.summary_id)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      
      <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
             <div class="flex items-center gap-4">
                <button @click="router.push('/planningReportList')" class="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all">
                    <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg" 
                              :class="isRepair ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-orange-500 to-red-500'">
                            ✏️
                        </span>
                        {{ pageTitle }}
                    </h1>
                    <p class="text-sm text-gray-500 mt-0.5">Perbaiki data sesuai catatan revisi</p>
                </div>
             </div>
        </div>
      </div>
      
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
             :class="isRepair ? 'border-blue-500' : 'border-orange-500'"></div>
        <p class="mt-4 text-gray-600 font-semibold">Memuat data...</p>
      </div>
      
      <div v-else-if="damageData" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p class="text-xs text-gray-500 font-bold uppercase mb-1">📍 Lokasi</p>
                <p class="text-gray-900 font-bold">{{ damageData.location || 'N/A' }}</p>
              </div>
              <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p class="text-xs text-blue-600 font-bold uppercase mb-1">📦 Batch</p>
                <p class="text-blue-900 font-bold">{{ damageData.batch || 'N/A' }}</p>
              </div>
              <div class="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p class="text-xs text-purple-600 font-bold uppercase mb-1">🌱 Fase</p>
                <p class="text-purple-900 font-bold">{{ damageData.phase || 'N/A' }}</p>
              </div>
              <div class="bg-green-50 rounded-xl p-4 border border-green-100">
                <p class="text-xs text-green-600 font-bold uppercase mb-1">📅 Tanggal</p>
                <p class="text-green-900 font-bold">{{ new Date(damageData.date).toLocaleDateString('id-ID') }}</p>
              </div>
            </div>
          </div>

          <div v-if="revisionNotes.length" class="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-6 shadow-sm">
             <h3 class="font-bold text-red-800 text-lg mb-3 flex items-center gap-2">
                <span>⚠️</span> Catatan Revisi
             </h3>
             <div class="space-y-3">
                 <div v-for="n in revisionNotes" :key="n.history_id" class="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-red-900 text-sm">{{ n.user?.username || 'Reviewer' }}</span>
                        <span class="text-xs text-gray-500">{{ new Date(n.action_at).toLocaleString('id-ID') }}</span>
                    </div>
                    <p class="text-gray-700">{{ n.comment }}</p>
                 </div>
             </div>
          </div>
          
          <div v-if="isRepair" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
             <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 class="font-bold text-gray-800 flex items-center gap-2">
                    <span>🔧</span> Data Perbaikan
                </h3>
             </div>
             <div class="p-6 space-y-6">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-bold mb-2 text-gray-700">Metode Perbaikan</label>
                        <input v-model="repairForm.repair_method" class="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2 text-gray-700">Dilakukan Oleh (PIC)</label>
                        <input v-model="repairForm.repaired_by" class="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                 </div>

                 <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                    <h4 class="font-bold text-yellow-800 mb-3 text-sm uppercase">Jumlah yang Diperbaiki</h4>
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label class="block text-xs font-bold mb-1 text-gray-600">Kuning</label>
                            <input v-model.number="repairForm.kuning_repaired" type="number" class="w-full px-4 py-2 bg-white border border-yellow-300 rounded-lg text-yellow-700 font-bold" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold mb-1 text-gray-600">Kutilang</label>
                            <input v-model.number="repairForm.kutilang_repaired" type="number" class="w-full px-4 py-2 bg-white border border-yellow-300 rounded-lg text-yellow-700 font-bold" />
                        </div>
                    </div>
                 </div>

                 <div>
                    <label class="block text-sm font-bold mb-2 text-gray-700">Catatan Tambahan</label>
                    <textarea v-model="repairForm.repair_notes" class="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all" rows="3"></textarea>
                 </div>

                 <div>
                    <label class="block text-sm font-bold mb-3 text-gray-700">Foto Bukti Perbaikan</label>
                    <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                        <input type="file" multiple @change="uploadRepairImage" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div class="space-y-2 pointer-events-none">
                            <span class="text-3xl">📷</span>
                            <p class="text-sm text-gray-500 font-medium">Klik atau drop foto di sini</p>
                        </div>
                    </div>
                    
                    <div v-if="repairForm.images.length" class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div v-for="(img, i) in repairForm.images" :key="i" class="relative group">
                            <img :src="img.url" class="h-32 w-full object-cover rounded-xl border border-gray-200 shadow-sm" />
                            <button @click="removeRepairImage(i)" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-md">✕</button>
                        </div>
                    </div>
                 </div>
             </div>
          </div>

          <div v-else class="space-y-4">
             <div class="flex justify-between items-center">
                <h3 class="font-bold text-gray-800">Detail Kerusakan</h3>
                <button @click="addTypeDamage" class="text-sm bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-bold hover:bg-orange-200 transition">+ Tambah Tipe</button>
             </div>

             <div v-for="(type, index) in typeDamageList" :key="index" class="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm relative group">
                <button @click="removeTypeDamage(index)" class="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                    <div class="md:col-span-6">
                        <label class="block text-xs font-bold text-gray-500 mb-1">Tipe Kerusakan</label>
                        <input v-model="type.type_damage" placeholder="Contoh: Hama Ulat" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 transition-all" />
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-yellow-600 mb-1">🟡 Kuning</label>
                        <input v-model.number="type.kuning" type="number" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-bold" />
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-orange-600 mb-1">🟠 Kutilang</label>
                        <input v-model.number="type.kutilang" type="number" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-bold" />
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-red-600 mb-1">🔴 Busuk</label>
                        <input v-model.number="type.busuk" type="number" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-bold" />
                    </div>
                </div>

                 <div>
                    <label class="block text-xs font-bold text-gray-500 mb-2">Foto Kerusakan</label>
                    <div class="flex items-center gap-3">
                        <label class="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                            <span class="text-xl">📷</span>
                            <span class="text-[10px] text-gray-500">Upload</span>
                            <input type="file" multiple @change="uploadReportImage($event, index)" class="hidden" />
                        </label>
                        <div class="flex gap-2 overflow-x-auto py-1">
                            <div v-for="(img, i) in type.images" :key="i" class="relative group flex-shrink-0">
                                <img :src="img.url" class="h-20 w-20 object-cover rounded-lg border" />
                                <button @click="removeReportImage(index, i)" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition">✕</button>
                            </div>
                        </div>
                    </div>
                 </div>
             </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button @click="router.push('/planningReportList')" class="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all">
                Batal
            </button>
            <button @click="handleSubmit" :disabled="submitting" 
                    class="px-8 py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="isRepair ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-orange-500 to-red-600'">
               <svg v-if="submitting" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <span v-else>🚀</span>
               {{ submitting ? 'Mengirim...' : 'Simpan & Kirim Ulang' }}
            </button>
          </div>
      </div>
      <footer class="text-center py-10 mt-8 border-t border-gray-200 bg-white">
        <div class="flex items-center justify-center gap-2 mb-2">
            <span class="text-2xl">🌱</span>
            <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
  </div>
</template>