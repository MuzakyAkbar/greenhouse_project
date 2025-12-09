<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import logoPG from '../assets/logoPG.svg'

const router = useRouter()
const route = useRoute()

// Record ID (Approval ID)
const record_id = route.params.record_id
const loading = ref(true)

// Data
const damageData = ref(null)
const approvalHistory = ref([])
const isRepairView = ref(false)

// ✅ Helper: Fungsi Parsing Gambar yang Aman
const safeParseImages = (imageData) => {
  if (!imageData) return [] // Jika null/undefined/kosong
  
  // Jika sudah berbentuk Array, kembalikan langsung
  if (Array.isArray(imageData)) return imageData
  
  // Jika string, coba parse
  if (typeof imageData === 'string') {
    try {
      if (imageData.trim() === '') return []
      return JSON.parse(imageData)
    } catch (e) {
      console.error('Gagal parse gambar:', e, imageData)
      return [] // Kembalikan array kosong jika error agar tidak crash
    }
  }
  
  return []
}

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
    const { data: approval, error: appError } = await supabase
      .from('gh_approve_record')
      .select('reference_type')
      .eq('record_id', record_id)
      .single()

    if (appError) throw appError

    if (approval.reference_type === 'damage_repair') {
        isRepairView.value = true
        await loadRepairData()
    } else {
        isRepairView.value = false
        await loadSummaryData()
    }

    await loadApprovalHistory()

  } catch (error) {
    console.error('Error loading data:', error)
    alert('Gagal memuat data: ' + error.message)
    router.push('/planningReportList')
  } finally {
    loading.value = false
  }
}

const loadSummaryData = async () => {
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
    
    damageData.value = summaryData

    const { data: typeDamage } = await supabase.from('gh_type_damage').select('*').eq('report_id', summaryData.report_id)
    if (typeDamage) damageData.value.type_damage_details = typeDamage

    const { data: repairs } = await supabase.from('gh_damage_repair').select('*').eq('summary_id', summaryData.summary_id)
    if (repairs) damageData.value.repairs = repairs
}

const loadRepairData = async () => {
    const { data: repairData, error } = await supabase
      .from('gh_damage_repair')
      .select(`
        *,
        gh_damage_summary!inner (
            *, 
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

    damageData.value = {
        ...repairData.gh_damage_summary,
        gh_report: repairData.gh_damage_summary.gh_report,
        report_date: repairData.repair_date,
        updated_at: repairData.updated_at,
        repairs: [repairData],
        type_damage_details: [] 
    }
    
    const { data: typeDamage } = await supabase
        .from('gh_type_damage')
        .select('*')
        .eq('report_id', repairData.report_id)
    
    if (typeDamage) damageData.value.type_damage_details = typeDamage
}

const loadApprovalHistory = async () => {
  try {
    const { data, error } = await supabase
      .from('gh_approval_history')
      .select(`*, user:user_id(username)`)
      .eq('record_id', record_id)
      .order('action_at', { ascending: true })

    if (!error && data) approvalHistory.value = data
  } catch (error) { console.error(error) }
}

const totalDamage = computed(() => {
  if (!damageData.value) return { kuning: 0, kutilang: 0, busuk: 0 }
  return {
    kuning: damageData.value.kuning_total || 0,
    kutilang: damageData.value.kutilang_total || 0,
    busuk: damageData.value.busuk_total || 0
  }
})

const totalRepaired = computed(() => {
  if (!damageData.value?.repairs) return { kuning: 0, kutilang: 0 }
  return damageData.value.repairs.reduce((acc, repair) => {
    acc.kuning += repair.kuning_repaired || 0
    acc.kutilang += repair.kutilang_repaired || 0
    return acc
  }, { kuning: 0, kutilang: 0 })
})

const nettDamage = computed(() => {
  return {
    kuning: (damageData.value?.kuning_nett || 0),
    kutilang: (damageData.value?.kutilang_nett || 0),
    busuk: (damageData.value?.busuk_nett || 0)
  }
})

const getActionIcon = (action) => {
  const icons = { 'submitted': '📤', 'approved': '✅', 'rejected': '❌', 'revision_requested': '📝', 'cancelled': '🚫', 'skipped': '⏭️' }
  return icons[action] || '📄'
}

const getActionText = (action) => {
  const texts = { 'submitted': 'Disubmit', 'approved': 'Disetujui', 'rejected': 'Ditolak', 'revision_requested': 'Meminta Revisi', 'cancelled': 'Dibatalkan', 'skipped': 'Dilewati' }
  return texts[action] || action
}

const printReport = () => window.print()
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white print:bg-white print:p-0">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 print:hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button @click="router.push('/planningReportList')" class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-lg">✅</span>
                View {{ isRepairView ? 'Perbaikan' : 'Laporan' }}
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Data telah disetujui dan diverifikasi</p>
            </div>
          </div>
          <button @click="printReport" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Print
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="inline-block w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600 font-semibold">Memuat data...</p>
      </div>
    </div>

    <div v-else-if="damageData" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-2 print:max-w-full print:px-2">
      
      <div class="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-6 mb-6 text-center shadow-lg print:shadow-none print:border-2 print:border-green-600 print:text-green-800 print:bg-white print:p-2 print:mb-4">
        <div class="text-5xl mb-2 print:text-2xl print:mb-0">✅</div>
        <h2 class="text-2xl font-bold print:text-lg">APPROVED REPORT</h2>
        <p class="text-sm opacity-90 mt-1 print:text-xs print:mt-0 text-black">
          Diselesaikan pada {{ damageData.updated_at ? new Date(damageData.updated_at).toLocaleString('id-ID') : 'N/A' }}
        </p>
      </div>

      <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 mb-6 print:shadow-none print:border print:border-gray-300 print:p-3 print:mb-4">
        <h3 class="text-lg font-bold text-gray-900 mb-4 print:mb-2 print:text-base">Informasi Laporan</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
          <div class="bg-gray-50 rounded-lg p-4 print:p-2 print:border print:border-gray-200">
            <p class="text-xs text-gray-500 font-semibold mb-1">📍 Lokasi</p>
            <p class="text-sm font-bold text-gray-900 print:text-xs">{{ damageData.gh_report?.gh_location?.location || 'N/A' }}</p>
          </div>
          <div class="bg-blue-50 rounded-lg p-4 print:p-2 print:border print:border-blue-100 print:bg-white">
            <p class="text-xs text-blue-600 font-semibold mb-1">📦 Batch</p>
            <p class="text-sm font-bold text-blue-900 print:text-xs">{{ damageData.gh_report?.gh_batch?.batch_name || 'N/A' }}</p>
          </div>
          <div class="bg-purple-50 rounded-lg p-4 print:p-2 print:border print:border-purple-100 print:bg-white">
            <p class="text-xs text-purple-600 font-semibold mb-1">🌱 Fase</p>
            <p class="text-sm font-bold text-purple-900 print:text-xs">{{ damageData.gh_report?.gh_phase?.phase_name || 'N/A' }}</p>
          </div>
          <div class="bg-green-50 rounded-lg p-4 print:p-2 print:border print:border-green-100 print:bg-white">
            <p class="text-xs text-green-600 font-semibold mb-1">📅 Tanggal</p>
            <p class="text-sm font-bold text-green-900 print:text-xs">{{ new Date(damageData.report_date).toLocaleDateString('id-ID') }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 print:grid-cols-3 print:gap-3 print:mb-4">
        <div class="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-2xl p-6 shadow-lg print:shadow-none print:border print:border-yellow-500 print:bg-white print:text-black print:p-3">
          <div class="flex items-center justify-between mb-2 print:mb-1">
            <p class="text-sm font-semibold opacity-90 print:text-xs">Kuning</p>
            <span class="text-2xl print:text-sm">🟡</span>
          </div>
          <p class="text-4xl font-bold mb-2 print:text-xl print:mb-1">{{ totalDamage.kuning.toLocaleString('id-ID') }}</p>
          <div class="flex items-center justify-between text-sm pt-2 border-t border-yellow-300 print:text-[10px] print:pt-1">
            <span class="opacity-75">Nett:</span>
            <span class="font-bold">{{ nettDamage.kuning.toLocaleString('id-ID') }}</span>
          </div>
        </div>

        <div class="bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-2xl p-6 shadow-lg print:shadow-none print:border print:border-orange-500 print:bg-white print:text-black print:p-3">
          <div class="flex items-center justify-between mb-2 print:mb-1">
            <p class="text-sm font-semibold opacity-90 print:text-xs">Kutilang</p>
            <span class="text-2xl print:text-sm">🟠</span>
          </div>
          <p class="text-4xl font-bold mb-2 print:text-xl print:mb-1">{{ totalDamage.kutilang.toLocaleString('id-ID') }}</p>
          <div class="flex items-center justify-between text-sm pt-2 border-t border-orange-300 print:text-[10px] print:pt-1">
            <span class="opacity-75">Nett:</span>
            <span class="font-bold">{{ nettDamage.kutilang.toLocaleString('id-ID') }}</span>
          </div>
        </div>

        <div class="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-6 shadow-lg print:shadow-none print:border print:border-red-500 print:bg-white print:text-black print:p-3">
          <div class="flex items-center justify-between mb-2 print:mb-1">
            <p class="text-sm font-semibold opacity-90 print:text-xs">Busuk</p>
            <span class="text-2xl print:text-sm">🔴</span>
          </div>
          <p class="text-4xl font-bold mb-2 print:text-xl print:mb-1">{{ totalDamage.busuk.toLocaleString('id-ID') }}</p>
          <div class="flex items-center justify-between text-sm pt-2 border-t border-red-400 print:text-[10px] print:pt-1">
            <span class="opacity-75">Total Loss</span>
          </div>
        </div>
      </div>

      <div v-if="damageData.repairs?.length > 0" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 mb-6 print:shadow-none print:border print:border-gray-300 print:p-3 print:mb-4">
        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 print:text-base print:mb-2">
          <span>🔧</span> {{ isRepairView ? 'Detail Perbaikan Ini' : 'Riwayat Perbaikan' }}
        </h3>
        <div class="space-y-3 print:space-y-2">
          <div v-for="repair in damageData.repairs" :key="repair.repair_id" class="bg-green-50 border border-green-200 rounded-xl p-4 print:p-2 print:bg-white print:border-gray-200">
            <div class="flex justify-between items-start mb-2 print:mb-1">
              <div>
                <p class="font-bold text-green-900 print:text-black print:text-sm">{{ repair.repair_method }}</p>
                <p class="text-sm text-green-700 print:text-xs print:text-gray-600">{{ repair.repaired_by }} • {{ new Date(repair.repair_date).toLocaleDateString('id-ID') }}</p>
              </div>
              <span class="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg print:border print:border-gray-400 print:bg-white print:text-black print:px-2 print:py-0">
                {{ repair.status }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-2 print:gap-1 print:mb-1">
              <div class="text-sm print:text-xs"><span class="text-gray-600">Fix Kuning:</span> <strong class="text-yellow-600 ml-1">{{ repair.kuning_repaired }}</strong></div>
              <div class="text-sm print:text-xs"><span class="text-gray-600">Fix Kutilang:</span> <strong class="text-orange-600 ml-1">{{ repair.kutilang_repaired }}</strong></div>
            </div>
            <p v-if="repair.repair_notes" class="text-sm text-gray-700 mt-2 bg-white/50 p-2 rounded print:text-xs print:p-1 print:border print:border-gray-100">{{ repair.repair_notes }}</p>
            
            <div v-if="safeParseImages(repair.images).length > 0" class="flex gap-2 mt-3 overflow-x-auto print:mt-1 print:flex-wrap">
                <img 
                  v-for="(img, idx) in safeParseImages(repair.images)" 
                  :key="idx" 
                  :src="img.url" 
                  class="h-24 w-24 object-cover rounded border cursor-pointer hover:scale-105 transition print:h-16 print:w-16 print:border-gray-300" 
                  @click="window.open(img.url, '_blank')"
                >
            </div>
          </div>
        </div>
      </div>

      <div v-if="damageData.type_damage_details?.length > 0" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 mb-6 print:shadow-none print:border print:border-gray-300 print:p-3 print:mb-4 print:page-break-inside-avoid">
        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 print:text-base print:mb-2">
          <span>📋</span> Detail Kerusakan Awal
        </h3>
        <div class="space-y-4 print:space-y-2">
          <div v-for="type in damageData.type_damage_details" :key="type.typedamage_id" class="border-2 border-gray-100 rounded-xl p-4 print:p-2 print:border-gray-200">
            <h4 class="font-bold text-gray-900 mb-3 print:text-sm print:mb-1">{{ type.type_damage || 'Unspecified' }}</h4>
            <div class="grid grid-cols-3 gap-4 mb-3 text-center print:gap-2 print:mb-2">
              <div><p class="text-xs text-gray-500">Kuning</p><p class="font-bold text-yellow-600 print:text-sm">{{ type.kuning }}</p></div>
              <div><p class="text-xs text-gray-500">Kutilang</p><p class="font-bold text-orange-600 print:text-sm">{{ type.kutilang }}</p></div>
              <div><p class="text-xs text-gray-500">Busuk</p><p class="font-bold text-red-600 print:text-sm">{{ type.busuk }}</p></div>
            </div>
            
            <div v-if="safeParseImages(type.images).length > 0" class="flex gap-2 overflow-x-auto print:flex-wrap">
              <img
                v-for="(img, idx) in safeParseImages(type.images)"
                :key="idx"
                :src="img.url"
                class="h-32 w-32 object-cover rounded-lg border border-gray-200 print:h-20 print:w-20 print:border-gray-300"
                alt="Damage image"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="approvalHistory.length > 0" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 print:shadow-none print:border print:border-gray-300 print:p-3">
        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 print:text-base print:mb-2"><span>📜</span> Riwayat Approval</h3>
        <div class="space-y-3 print:space-y-1">
          <div v-for="history in approvalHistory" :key="history.history_id" class="flex items-start gap-4 p-4 rounded-lg border-2 border-gray-100 print:p-2 print:border print:gap-2">
            <div class="flex-shrink-0 text-2xl print:text-lg">{{ getActionIcon(history.action) }}</div>
            <div class="flex-1">
              <div class="flex justify-between items-start mb-1">
                <p class="font-bold text-gray-900 print:text-xs">{{ history.user?.username || 'Unknown' }}</p>
                <p class="text-xs text-gray-500 print:text-[10px]">{{ new Date(history.action_at).toLocaleString('id-ID') }}</p>
              </div>
              <p class="text-sm text-gray-600 print:text-xs">{{ getActionText(history.action) }} <span v-if="history.level_name">• {{ history.level_name }}</span></p>
              <p v-if="history.comment" class="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded print:text-xs print:p-1">{{ history.comment }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="hidden print:block mt-8 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-600">
        Dokumen ini dicetak secara otomatis dari sistem pada {{ new Date().toLocaleString('id-ID') }}
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
</template>

<style scoped>
.ml-13 { margin-left: 3.25rem; }
@media (max-width: 640px) { .ml-13 { margin-left: 0; } }
@media print { 
  .print\:page-break-inside-avoid { page-break-inside: avoid; }
  @page { margin: 1.5cm; size: A4; } 
  body { -webkit-print-color-adjust: exact; }
}
</style>