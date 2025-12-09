// ReportActivityEdit.vue - Disesuaikan untuk Production/Sales
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { supabase } from '../lib/supabase'
import logoPG from '../assets/logoPG.svg'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()

// ✅ GANTI: Mengambil record_id dari route params
const record_id = ref(route.params.record_id || null) 

const loading = ref(true)
const saving = ref(false)
const error = ref(null)

// Data Utama
const productions = ref([])
const sales = ref([])
const baseReportInfo = ref(null) // Menyimpan info dasar (location, batch, date)

// Catatan Revisi
const revisionNotes = ref([]) // Akan diisi dari gh_approval_level_status

// Categories & Options (tetap sama)
const productionCategories = ['Planlet G0', 'Planlet G1', 'Planlet G2', 'Planlet G3', 'Minituber']
const salesCategories = ['Planlet G0', 'Planlet G1', 'Planlet G2', 'Planlet G3', 'Minituber']
const ownerOptions = ['Perusahaan', 'Mitra', 'Internal', 'Lainnya']

// Helper: Format Date
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
}

// Helper: Get Location/Batch Name
const getLocationName = (locationId) => {
  const location = locationStore.locations.find(l => l.location_id == locationId)
  return location?.location || `Location ${locationId}`
}

const getBatchName = (batchId) => {
  const batch = batchStore.batches.find(b => b.batch_id == batchId)
  return batch?.batch_name || `Batch ${batchId}`
}


onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }
  if (!record_id.value) {
    alert('⚠️ Approval Record ID tidak ditemukan')
    router.push('/planningReportList')
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
      // materialStore.fetchAll(), // Dihapus, tidak ada di Production/Sales skema baru
    ])

    // 1. Ambil Approval Record & cek status
    const { data: record, error: recordErr } = await supabase
        .from('gh_approve_record')
        .select(`
            *,
            gh_approval_flow(code_name)
        `)
        .eq('record_id', record_id.value)
        .single();

    if (recordErr) throw recordErr;
    if (!record) throw new Error('Approval Record tidak ditemukan');

    if (record.overall_status !== 'needRevision') {
        alert(`⚠️ Laporan ini tidak dalam status Need Revision. Status saat ini: ${record.overall_status}`);
        router.replace('/planningReportList');
        return;
    }
    
    baseReportInfo.value = {
        overall_status: record.overall_status,
        current_level_order: record.current_level_order,
        reference_type: record.reference_type,
        reference_id: record.reference_id,
        flow_id: record.flow_id,
        flow_code: record.gh_approval_flow?.code_name
    };

    // 2. Ambil Production & Sales Data
    const { data: production, error: prodErr } = await supabase
        .from('gh_production')
        .select('*')
        .eq('approval_record_id', record_id.value);
    if (prodErr) throw prodErr;
    productions.value = production.map(p => ({ 
      ...p, 
      isNew: false 
      // ✅ Pastikan unit ada saat memuat data jika Anda memutuskan untuk menyimpannya
    }));

    const { data: salesResult, error: salesErr } = await supabase
        .from('gh_sales')
        .select('*')
        .eq('approval_record_id', record_id.value);
        
    if (salesErr) throw salesErr;
    sales.value = salesResult.map(s => ({ 
      ...s, 
      isNew: false 
      // ✅ Jika kolom 'unit' tidak ada di DB, baris ini mungkin gagal.
      // Karena kita berasumsi DB sudah diperbaiki (atau kita hapus penggunaan unit di payload)
    }));

    // Tentukan info dasar report (location, batch, date) dari salah satu item (asumsi sama semua)
    let firstItem = productions.value[0] || sales.value[0];
    if (firstItem) {
        baseReportInfo.value.location_id = firstItem.location_id;
        baseReportInfo.value.batch_id = firstItem.batch_id;
        baseReportInfo.value.report_date = firstItem.date;
    } else {
        throw new Error('Tidak ada data Production maupun Sales terkait record ini.');
    }
    
    // 3. Ambil Catatan Revisi (dari level terakhir yang request revision)
    const { data: notesData } = await supabase
        .from('gh_approval_level_status')
        .select('revision_notes')
        .eq('record_id', record_id.value)
        .eq('status', 'needRevision')
        .order('revision_requested_at', { ascending: false })
        .limit(1)
        .single();
        
    if (notesData) {
        revisionNotes.value = notesData.revision_notes;
    }

    // Jika kosong, beri default entry
    if (productions.value.length === 0) {
      addProduction()
    }
    if (sales.value.length === 0) {
      addSale()
    }

  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err.message
    alert('❌ Gagal memuat data: ' + err.message)
    router.replace('/planningReportList')
  } finally {
    loading.value = false
  }
}


// Add/Remove Productions
const addProduction = () => {
  productions.value.push({
    production_id: null,
    location_id: baseReportInfo.value?.location_id || null,
    batch_id: baseReportInfo.value?.batch_id || null,
    category: '',
    owner: '',
    qty: null,
    date: baseReportInfo.value?.report_date,
    isNew: true,
    status: 'onReview',
    approval_record_id: record_id.value // Wajib ada untuk re-insert
  })
}

const removeProduction = (index) => {
  if (confirm('Hapus item produksi ini? Item yang sudah ada di database akan dihapus saat disimpan.')) {
    productions.value.splice(index, 1)
  }
}

// Add/Remove Sales
const addSale = () => {
  sales.value.push({
    sales_id: null,
    location_id: baseReportInfo.value?.location_id || null,
    batch_id: baseReportInfo.value?.batch_id || null,
    category: '',
    qty: null,
    unit: '', // Ditambahkan karena ada di skema. Jika Anda memilih Opsi 1, kolom ini akan diabaikan saat insert.
    price: null,
    date: baseReportInfo.value?.report_date,
    isNew: true,
    status: 'onReview',
    approval_record_id: record_id.value // Wajib ada untuk re-insert
  })
}

const removeSale = (index) => {
  if (confirm('Hapus item penjualan ini? Item yang sudah ada di database akan dihapus saat disimpan.')) {
    sales.value.splice(index, 1)
  }
}


const handleSubmit = async () => {
  try {
    saving.value = true
    error.value = null

    if (productions.value.length === 0 && sales.value.length === 0) {
      throw new Error('Minimal harus ada 1 data produksi atau penjualan')
    }
    
    // Validasi dasar
    if (!baseReportInfo.value || !baseReportInfo.value.batch_id) {
        throw new Error('Data Report Dasar tidak lengkap.');
    }

    // 1. DELETE SEMUA data produksi dan sales LAMA yang terkait dengan record_id ini
    console.log(`🔄 Deleting old production/sales data for record ID: ${record_id.value}`);
    const { error: deleteProdErr } = await supabase
        .from('gh_production')
        .delete()
        .eq('approval_record_id', record_id.value);

    if (deleteProdErr) throw new Error(`Gagal hapus data produksi lama: ${deleteProdErr.message}`);

    const { error: deleteSalesErr } = await supabase
        .from('gh_sales')
        .delete()
        .eq('approval_record_id', record_id.value);

    if (deleteSalesErr) throw new Error(`Gagal hapus data penjualan lama: ${deleteSalesErr.message}`);


    // 2. INSERT data produksi BARU
    const validProductions = productions.value.filter(p => p.category && p.owner && p.qty);
    const prodPayload = validProductions.map(p => ({
        location_id: p.location_id,
        batch_id: p.batch_id,
        category: p.category,
        owner: p.owner,
        qty: p.qty,
        date: p.date,
        status: 'onReview',
        approval_record_id: record_id.value
    }));

    if (prodPayload.length > 0) {
        const { error: insertProdErr } = await supabase.from('gh_production').insert(prodPayload);
        if (insertProdErr) throw new Error(`Gagal insert data produksi baru: ${insertProdErr.message}`);
        console.log(`✅ Inserted ${prodPayload.length} new production items.`);
    }

    // 3. INSERT data penjualan BARU
    const validSales = sales.value.filter(s => s.category && s.qty && s.price);
    const salesPayload = validSales.map(s => ({
        location_id: s.location_id,
        batch_id: s.batch_id,
        category: s.category,
        qty: s.qty,
        // ✅ PERBAIKAN: Hapus baris 'unit' dari payload.
        // Jika Anda memilih Opsi 2 dan kolom sudah ada di DB, kembalikan baris ini: unit: s.unit,
        price: s.price,
        date: s.date,
        status: 'onReview',
        approval_record_id: record_id.value
    }));
    
    if (salesPayload.length > 0) {
        const { error: insertSalesErr } = await supabase.from('gh_sales').insert(salesPayload);
        if (insertSalesErr) throw new Error(`Gagal insert data penjualan baru: ${insertSalesErr.message}`);
        console.log(`✅ Inserted ${salesPayload.length} new sales items.`);
    }


    // 4. UPDATE APPROVAL RECORD & RESET STATUS
    const now = new Date().toISOString();
    
    // 4.1. Reset current_level_order ke 1 dan overall_status ke onReview
    const { error: recordUpdateErr } = await supabase
      .from('gh_approve_record')
      .update({
        current_level_order: 1,
        overall_status: 'onReview',
        updated_at: now
      })
      .eq('record_id', record_id.value);

    if (recordUpdateErr) throw recordUpdateErr;
    console.log('✅ Approval record reset to onReview/Level 1.');


    // 4.2. Reset semua level status ke pending (kecuali level yang request revision, statusnya needRevision)
    const { error: resetErr } = await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'pending',
        approved_by: null,
        approved_at: null,
        revision_notes: null, // Hapus catatan revisi lama dari level status
        revision_requested_by: null,
        revision_requested_at: null,
        updated_at: now
      })
      .eq('record_id', record_id.value);

    if (resetErr) console.error('❌ Error resetting level status (non-critical):', resetErr);


    // 4.3. Insert history: revision completed
    const { data: flowData } = await supabase
        .from('gh_approve_record')
        .select('flow_id')
        .eq('record_id', record_id.value)
        .single();
    
    const username = authStore.user?.username || authStore.user?.email || 'Staff';
    const { error: historyErr } = await supabase
        .from('gh_approval_history')
        .insert({
          record_id: record_id.value,
          flow_id: flowData.flow_id,
          user_id: authStore.user.user_id,
          level_order: 0,
          level_name: 'Staff',
          action: 'submitted',
          comment: `Report revised and resubmitted by ${username}`
        });
    if (historyErr) console.error('❌ Error inserting history (non-critical):', historyErr);

    alert('✅ Laporan berhasil diperbarui dan dikirim untuk review ulang!');
    router.replace('/planningReportList');
    
  } catch (err) {
    console.error('Error updating report:', err)
    error.value = err.message
    alert('❌ Gagal memperbarui laporan: ' + err.message)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  if (confirm('Batalkan perubahan? Data yang belum disimpan akan hilang.')) {
    router.replace('/planningReportList') // Gunakan replace
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button 
            @click="handleCancel"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white text-lg">
                🔄
              </span>
              Edit Laporan Produksi & Penjualan
            </h1>
            <p class="text-sm text-gray-500 mt-1">Perbaiki laporan berdasarkan catatan revisi - Record ID: #{{ record_id }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data...</p>
        </div>
      </div>

      <div v-else-if="error" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <div v-if="!loading && !error && baseReportInfo" class="mb-6">
        <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl flex-shrink-0">
              🔄
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-red-900 text-lg mb-2">Catatan Revisi</h3>
              <p class="text-red-700 whitespace-pre-wrap">{{ revisionNotes || 'Tidak ada catatan spesifik, mohon periksa semua item.' }}</p>
              <div class="mt-3 flex flex-wrap gap-4 text-sm text-red-600">
                <div><strong>Batch:</strong> {{ getBatchName(baseReportInfo.batch_id) }}</div>
                <div><strong>Lokasi:</strong> {{ getLocationName(baseReportInfo.location_id) }}</div>
                <div><strong>Tanggal:</strong> {{ formatDate(baseReportInfo.report_date) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form v-if="!loading && !error && baseReportInfo" @submit.prevent="handleSubmit" class="space-y-6">
        
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span class="text-xl">🏭</span>
              Data Produksi
              <span class="ml-2 text-sm font-normal text-gray-500">({{ productions.length }} item)</span>
            </h2>
            <button
              type="button"
              @click="addProduction"
              class="px-4 py-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white font-semibold rounded-lg hover:shadow-md transition-all text-sm flex items-center gap-2"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
              </svg>
              Tambah Item
            </button>
          </div>

          <div class="space-y-4">
            <div 
              v-for="(prod, index) in productions" 
              :key="index"
              class="bg-gradient-to-r from-blue-50 to-white border-2 border-blue-200 rounded-xl p-5"
            >
              <div class="flex items-start justify-between mb-4">
                <h3 class="font-bold text-gray-700">Item #{{ index + 1 }}</h3>
                <button
                  v-if="productions.length > 0"
                  type="button"
                  @click="removeProduction(index)"
                  class="text-red-500 hover:text-red-700 transition"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Kategori <span class="text-red-500">*</span>
                  </label>
                  <select 
                    v-model="prod.category" 
                    required
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  >
                    <option value="">Pilih Kategori</option>
                    <option v-for="cat in productionCategories" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Pemilik <span class="text-red-500">*</span>
                  </label>
                  <select 
                    v-model="prod.owner" 
                    required
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  >
                    <option value="">Pilih Pemilik</option>
                    <option v-for="owner in ownerOptions" :key="owner" :value="owner">{{ owner }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Kuantitas <span class="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    v-model.number="prod.qty"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span class="text-xl">💰</span>
              Data Penjualan
              <span class="ml-2 text-sm font-normal text-gray-500">({{ sales.length }} item)</span>
            </h2>
            <button
              type="button"
              @click="addSale"
              class="px-4 py-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white font-semibold rounded-lg hover:shadow-md transition-all text-sm flex items-center gap-2"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
              </svg>
              Tambah Item
            </button>
          </div>

          <div class="space-y-4">
            <div 
              v-for="(sale, index) in sales" 
              :key="index"
              class="bg-gradient-to-r from-green-50 to-white border-2 border-green-200 rounded-xl p-5"
            >
              <div class="flex items-start justify-between mb-4">
                <h3 class="font-bold text-gray-700">Item #{{ index + 1 }}</h3>
                <button
                  v-if="sales.length > 0"
                  type="button"
                  @click="removeSale(index)"
                  class="text-red-500 hover:text-red-700 transition"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Kategori <span class="text-red-500">*</span>
                  </label>
                  <select 
                    v-model="sale.category" 
                    required
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  >
                    <option value="">Pilih Kategori</option>
                    <option v-for="cat in salesCategories" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Unit/Satuan
                  </label>
                  <select 
                    v-model="sale.unit" 
                    required
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  >
                    <option value="">Pilih Satuan</option>
                    <option>Per Kg</option>
                    <option>Per Bibit</option>
                    <option>Lainnya</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Kuantitas <span class="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    v-model.number="sale.qty"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Harga Satuan <span class="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    v-model.number="sale.price"
                    required
                    min="0"
                    step="0.01"
                    placeholder="Rp 0"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0071f3] focus:outline-none transition"
                  />
                </div>
              </div>

              <div v-if="sale.qty && sale.price" class="mt-4 pt-4 border-t-2 border-green-200">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Total Penjualan:</span>
                  <span class="text-lg font-bold text-green-600">
                    Rp {{ (sale.qty * sale.price).toLocaleString('id-ID') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            @click="handleCancel"
            class="flex-1 px-6 py-3.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
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
            <span>{{ saving ? 'Menyimpan...' : '✅ Simpan Perubahan & Kirim Review Ulang' }}</span>
          </button>
        </div>
      </form>

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
  </div>
</template>

<style scoped>
/* Tambahkan style untuk animate spin */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 1s linear infinite;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
</style>