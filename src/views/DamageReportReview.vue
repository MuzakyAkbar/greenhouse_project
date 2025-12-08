<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Record ID dari parameter URL (ini adalah id dari gh_approve_record)
const record_id = route.params.record_id 

const loading = ref(true)
const submitting = ref(false)
const approvalAction = ref('') // 'revise' untuk toggle form revisi di UI
const revisionNotes = ref('')

// State Data
const repairData = ref(null)
const approvalProgress = ref([])
const currentUserLevel = ref(null)
const canTakeAction = ref(false)

onMounted(async () => {
  if (!record_id) {
    alert('Invalid Record ID')
    router.push('/planningReportList')
    return
  }
  await loadRepairData()
})

const loadRepairData = async () => {
  loading.value = true
  try {
    // 1. Fetch Record Approval beserta relasi ke Data Repair
    const { data: record, error } = await supabase
      .from('gh_approve_record')
      .select(`
        *,
        gh_damage_repair!gh_damage_repair_approval_record_fkey (
           *,
           gh_damage_summary (
              gh_report (
                 report_date,
                 gh_batch (batch_name),
                 gh_location (location),
                 gh_phase (phase_name)
              )
           )
        )
      `)
      .eq('record_id', record_id)
      .eq('reference_type', 'damage_repair') 
      .single()

    if (error) throw error
    
    // 2. Formatting Data untuk UI
    // Ambil elemen pertama karena relasi one-to-many defaultnya array
    const repairItem = Array.isArray(record.gh_damage_repair) ? record.gh_damage_repair[0] : record.gh_damage_repair;

    if (!repairItem) {
        throw new Error("Data Repair tidak ditemukan untuk Approval Record ini.");
    }

    repairData.value = {
        ...repairItem,
        approval_record_id: record.record_id,
        current_level_order: record.current_level_order,
        overall_status: record.overall_status,
        flow_id: record.flow_id, 
        
        // Flattening data relasi (menggunakan optional chaining untuk keamanan)
        batch_name: repairItem.gh_damage_summary?.gh_report?.gh_batch?.batch_name || 'N/A',
        location: repairItem.gh_damage_summary?.gh_report?.gh_location?.location || 'N/A',
        phase_name: repairItem.gh_damage_summary?.gh_report?.gh_phase?.phase_name || 'N/A',
        report_date: repairItem.gh_damage_summary?.gh_report?.report_date,
        
        // Parsing gambar
        images_parsed: repairItem.images ? JSON.parse(repairItem.images) : []
    }

    // 3. Load Approval History
    const { data: progressData } = await supabase
        .from('vw_damage_approval_progress')
        .select('*')
        .eq('record_id', record_id)
        .order('level_order', { ascending: true })

    approvalProgress.value = progressData || []

    // 4. Cek Permission User
    await checkUserPermission(record)

  } catch (error) {
    console.error('Error loading repair data:', error)
    alert('Gagal memuat data approval: ' + error.message)
    router.push('/planningReportList')
  } finally {
    loading.value = false
  }
}

const checkUserPermission = async (record) => {
  // 1. Cek Record Status
  if (record.overall_status !== 'onReview') {
      canTakeAction.value = false;
      return;
  }

  // 2. ✅ PERBAIKAN: Pastikan User ID tersedia
  // Cek berbagai kemungkinan properti ID (tergantung setup store Anda)
  const userId = authStore.user?.id || authStore.user?.user_id;

  if (!userId) {
      console.warn("⛔ User ID tidak ditemukan (belum login atau store belum ready).");
      canTakeAction.value = false;
      return;
  }

  console.log("3. User ID Login:", userId);

  try {
    // 3. Logic Flow: Ambil flow_id
    let targetFlowId = record.flow_id;

    if (!targetFlowId) {
        // Fallback cari manual
        const { data: flowData } = await supabase
            .from('gh_approval_flow')
            .select('flow_id')
            .eq('code_name', 'damage_report') 
            .single();
        targetFlowId = flowData?.flow_id;
    }

    if (!targetFlowId) {
        console.error("❌ Flow ID tidak ditemukan!");
        return;
    }

    // 4. Cek Permission ke Database
    const { data: userLevel, error: levelError } = await supabase
      .from('gh_user_approval_level')
      .select('level_order')
      .eq('user_id', userId) // ✅ Gunakan variabel userId yang sudah divalidasi
      .eq('flow_id', targetFlowId)
      .eq('level_order', record.current_level_order)
      .eq('is_active', true)
      .maybeSingle();

    if (levelError) {
        // Abaikan error 406/Not Found jika user memang tidak punya hak akses
        console.log("ℹ️ User tidak memiliki akses approval di level ini.");
    }

    if (userLevel) {
      console.log("✅ MATCH! User berhak approve di level ini.");
      currentUserLevel.value = userLevel.level_order;
      canTakeAction.value = true;
      
      if (repairData.value) repairData.value.flow_id = targetFlowId;
    } 

  } catch (error) {
    console.error('❌ Error permission check:', error);
  }
}

const handleApprove = async () => {
  if (!confirm('Apakah Anda yakin menyetujui perbaikan ini?')) return

  submitting.value = true
  try {
    // Cek apakah ini level terakhir
    const { data: flowData } = await supabase
      .from('gh_approval_flow')
      .select('last_level')
      .eq('flow_id', repairData.value.flow_id)
      .single()

    const isLastLevel = currentUserLevel.value === flowData.last_level

    // 1. Update Status Level User ini (Approved)
    await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'approved',
        approved_by: authStore.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('record_id', record_id)
      .eq('level_order', currentUserLevel.value)

    // 2. Insert History Log
    await supabase.from('gh_approval_history').insert({
        record_id: record_id,
        flow_id: repairData.value.flow_id,
        user_id: authStore.user.id,
        level_order: currentUserLevel.value,
        action: 'approved',
        comment: null
    })

    // 3. Update Record Utama & Table Transaksi (Logic Source 2)
    if (isLastLevel) {
      // Selesai -> Update Approval Record ke 'approved'
      await supabase
        .from('gh_approve_record')
        .update({
          overall_status: 'approved',
          completed_at: new Date().toISOString()
        })
        .eq('record_id', record_id)

      // Penting: Update status di table gh_damage_repair juga
      await supabase
        .from('gh_damage_repair')
        .update({ status: 'approved' })
        .eq('repair_id', repairData.value.repair_id)
      
    } else {
      // Belum selesai -> Naikkan ke level berikutnya
      await supabase
        .from('gh_approve_record')
        .update({
          current_level_order: repairData.value.current_level_order + 1
        })
        .eq('record_id', record_id)
    }

    alert('Perbaikan berhasil disetujui!')
    router.push('/planningReportList')

  } catch (error) {
    console.error('Error approving:', error)
    alert('Gagal: ' + error.message)
  } finally {
    submitting.value = false
  }
}

const handleRequestRevision = async () => {
  if (!revisionNotes.value.trim()) {
    alert('Harap masukkan catatan revisi!')
    return
  }
  if (!confirm('Kirim permintaan revisi?')) return

  submitting.value = true
  try {
    // 1. Update Level Status (Need Revision)
    await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'needRevision',
        revision_notes: revisionNotes.value,
        revision_requested_by: authStore.user.id,
        revision_requested_at: new Date().toISOString()
      })
      .eq('record_id', record_id)
      .eq('level_order', currentUserLevel.value)

    // 2. Insert History Log
    await supabase.from('gh_approval_history').insert({
        record_id: record_id,
        flow_id: repairData.value.flow_id,
        user_id: authStore.user.id,
        level_order: currentUserLevel.value,
        action: 'revision_requested',
        comment: revisionNotes.value
    })

    // 3. Update Record & Table Transaksi menjadi 'needRevision'
    await supabase
      .from('gh_approve_record')
      .update({ overall_status: 'needRevision' })
      .eq('record_id', record_id)

    await supabase
      .from('gh_damage_repair')
      .update({ status: 'needRevision' })
      .eq('repair_id', repairData.value.repair_id)

    alert('Permintaan revisi dikirim.')
    router.push('/planningReportList')

  } catch (error) {
    console.error('Error revising:', error)
    alert('Gagal: ' + error.message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/planningReportList')"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-lg">
                🌱
              </span>
              Review Perbaikan (Repair)
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">
              Tinjau hasil perbaikan kerusakan #{{ repairData?.repair_id }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600 font-semibold">Memuat data perbaikan...</p>
      </div>
    </div>

    <div v-else-if="repairData" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-xs text-gray-500 font-semibold mb-1">📍 Lokasi</p>
            <p class="text-sm font-bold text-gray-900">{{ repairData.location }}</p>
          </div>
          <div class="bg-blue-50 rounded-lg p-4">
            <p class="text-xs text-blue-600 font-semibold mb-1">📦 Batch</p>
            <p class="text-sm font-bold text-blue-900">{{ repairData.batch_name }}</p>
          </div>
          <div class="bg-purple-50 rounded-lg p-4">
            <p class="text-xs text-purple-600 font-semibold mb-1">🌱 Fase</p>
            <p class="text-sm font-bold text-purple-900">{{ repairData.phase_name }}</p>
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <p class="text-xs text-green-600 font-semibold mb-1">📅 Tanggal Perbaikan</p>
            <p class="text-sm font-bold text-green-900">{{ new Date(repairData.repair_date).toLocaleDateString('id-ID') }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        <div class="lg:col-span-2 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-2xl p-6 shadow-lg">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-semibold opacity-90">Diperbaiki Kuning</p>
                    <span class="text-2xl">🟡</span>
                </div>
                <p class="text-4xl font-bold mb-1">{{ repairData.kuning_repaired?.toLocaleString('id-ID') || 0 }}</p>
                <p class="text-xs opacity-75">Unit</p>
                </div>

                <div class="bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-2xl p-6 shadow-lg">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-semibold opacity-90">Diperbaiki Kutilang</p>
                    <span class="text-2xl">🟠</span>
                </div>
                <p class="text-4xl font-bold mb-1">{{ repairData.kutilang_repaired?.toLocaleString('id-ID') || 0 }}</p>
                <p class="text-xs opacity-75">Unit</p>
                </div>
            </div>

            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 class="font-bold text-gray-800">Detail Teknis</h3>
                </div>
                <div class="p-6 space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="text-xs font-bold text-gray-500 uppercase block mb-1">Metode Perbaikan</label>
                            <div class="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg font-bold border border-blue-100">
                                {{ repairData.repair_method }}
                            </div>
                        </div>
                        <div>
                            <label class="text-xs font-bold text-gray-500 uppercase block mb-1">Dilakukan Oleh</label>
                            <div class="bg-gray-50 text-gray-800 px-3 py-2 rounded-lg font-medium border border-gray-200">
                                {{ repairData.repaired_by }}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 uppercase block mb-1">Catatan</label>
                        <p class="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 italic">
                            "{{ repairData.repair_notes || 'Tidak ada catatan tambahan.' }}"
                        </p>
                    </div>
                </div>
            </div>

            <div v-if="repairData.images_parsed.length > 0" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                 <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 class="font-bold text-gray-800">Foto Bukti Perbaikan</h3>
                </div>
                <div class="p-6">
                    <div class="flex gap-4 overflow-x-auto pb-2">
                        <div v-for="(img, idx) in repairData.images_parsed" :key="idx" class="flex-shrink-0 relative group">
                            <img 
                                :src="img.url" 
                                class="h-40 w-40 object-cover rounded-xl border-2 border-gray-200 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                @click="window.open(img.url, '_blank')"
                            >
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="space-y-6">
            <div v-if="canTakeAction" class="bg-white rounded-2xl border-2 border-blue-100 shadow-md p-6 sticky top-24">
                <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>⚡</span> Tindakan Approval
                </h3>
                
                <div v-if="approvalAction === 'revise'" class="mb-4 animate-fade-in">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        Catatan Revisi <span class="text-red-500">*</span>
                    </label>
                    <textarea
                        v-model="revisionNotes"
                        rows="4"
                        class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Jelaskan apa yang perlu diperbaiki..."
                    ></textarea>
                </div>

                <div class="flex flex-col gap-3">
                    <button
                        v-if="approvalAction !== 'revise'"
                        @click="handleApprove"
                        :disabled="submitting"
                        class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <svg v-if="submitting" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span v-else>✅</span>
                        {{ submitting ? 'Memproses...' : 'Setujui Perbaikan' }}
                    </button>

                    <button
                        v-if="approvalAction === 'revise'"
                        @click="handleRequestRevision"
                        :disabled="submitting || !revisionNotes.trim()"
                        class="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <span>📤</span>
                        Kirim Revisi
                    </button>

                    <button
                        @click="approvalAction = approvalAction === 'revise' ? '' : 'revise'"
                        class="w-full bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <span>{{ approvalAction === 'revise' ? '❌ Batal' : '📝 Minta Revisi' }}</span>
                    </button>
                </div>
            </div>

            <div v-else class="bg-gray-100 rounded-2xl border-2 border-gray-200 p-6 text-center">
                <p class="text-gray-600 text-sm">
                 Status saat ini: <span class="font-bold uppercase">{{ repairData.overall_status }}</span>
                </p>
                <p class="text-gray-500 text-xs mt-2">
                 Anda tidak memiliki akses approval di level ini atau proses sudah selesai.
                </p>
            </div>

            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 class="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Riwayat Approval</h3>
                <div class="space-y-4">
                    <div v-for="step in approvalProgress" :key="step.level_order" class="flex gap-3">
                        <div class="flex flex-col items-center">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                                :class="step.level_status === 'approved' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-500 border border-gray-300'">
                                {{ step.level_order }}
                            </div>
                            <div class="h-full w-0.5 bg-gray-200 my-1" v-if="step.level_order !== approvalProgress.length"></div>
                        </div>
                        <div class="pb-4">
                            <p class="font-bold text-sm text-gray-800">{{ step.level_name }}</p>
                            
                            <div v-if="step.level_status === 'approved'" class="text-xs text-green-600 mt-1">
                                Disetujui oleh <span class="font-semibold">{{ step.approved_by_name }}</span>
                                <br>
                                <span class="opacity-75">{{ new Date(step.approved_at).toLocaleString('id-ID') }}</span>
                            </div>
                            
                            <div v-else-if="step.level_status === 'needRevision'" class="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded border border-red-100">
                                <strong>Revisi diminta:</strong> "{{ step.revision_notes }}"
                            </div>
                            
                            <div v-else class="text-xs text-gray-400 italic mt-1">
                                Menunggu persetujuan...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

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

<style scoped>
.ml-13 { margin-left: 3.25rem; }
@media (max-width: 640px) { .ml-13 { margin-left: 0; } }
.animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>