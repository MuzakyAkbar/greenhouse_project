<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              @click="goBack"
              class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                  🚚
                </span>
                Good Movement
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Manajemen Perpindahan Barang</p>
            </div>
          </div>

          <!-- Add New Button -->
          <router-link
            to="/addnewgm"
            class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
            </svg>
            Add New Movement
          </router-link>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Error Message -->
      <div v-if="errorMessage" class="mb-8">
        <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <svg class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24l0 112c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-112c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
          </svg>
          <div class="flex-1">
            <p class="font-semibold text-red-800 mb-1">Error</p>
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>
        </div>
      </div>

      <!-- Movement List -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Daftar Movement
          <span v-if="!loading && movements.length > 0">({{ movements.length }})</span>
        </h2>

        <!-- Loading State -->
        <div v-if="loading" class="space-y-5">
          <div v-for="n in 3" :key="n" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 animate-pulse">
            <div class="flex justify-between items-start mb-4">
              <div class="space-y-3 flex-1">
                <div class="h-5 w-48 bg-gray-200 rounded"></div>
                <div class="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
              <div class="h-6 w-24 bg-gray-200 rounded-lg"></div>
            </div>
            <div class="space-y-2">
              <div class="h-4 w-64 bg-gray-200 rounded"></div>
              <div class="h-4 w-80 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        <!-- Data List -->
        <div v-else-if="movements.length > 0" class="grid grid-cols-1 gap-5">
          <router-link
            v-for="mv in movements"
            :key="mv.id"
            :to="detailLink(mv)"
            class="group"
          >
            <div 
              class="bg-white rounded-2xl border-2 shadow-sm hover:shadow-xl transition-all p-6 transform hover:-translate-y-1"
              :class="mv.status === 'Approved' ? 'border-green-200 hover:border-green-300' : 'border-gray-100 hover:border-[#0071f3]'"
            >
              <div class="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <!-- Left Content -->
                <div class="flex-1 space-y-3">
                  <div class="flex items-center gap-3">
                    <div 
                      class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0"
                      :class="mv.status === 'Approved' ? 'bg-gradient-to-br from-green-400 to-green-500' : 'bg-gradient-to-br from-yellow-400 to-yellow-500'"
                    >
                      {{ mv.status === 'Approved' ? '✅' : '⏳' }}
                    </div>
                    <div>
                      <p class="font-bold text-gray-900 text-lg">{{ mv.documentNo }}</p>
                      <p class="text-sm text-gray-500">Requester: {{ mv.requester }}</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div class="bg-gray-50 rounded-lg p-3">
                      <p class="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                          <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                        </svg>
                        Tanggal
                      </p>
                      <p class="text-sm font-bold text-gray-900">{{ mv.movementDateFmt }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                      <p class="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                          <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
                        </svg>
                        Lokasi
                      </p>
                      <p class="text-sm font-bold text-gray-900">{{ mv.locationText }}</p>
                    </div>
                  </div>
                </div>

                <!-- Right Content - Status -->
                <div class="flex flex-col items-end gap-3">
                  <span 
                    class="text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap"
                    :class="mv.status === 'Approved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'"
                  >
                    {{ mv.status === 'Approved' ? '✅ Approved' : '⏳ On Review' }}
                  </span>
                  <svg class="w-5 h-5 text-gray-400 group-hover:text-[#0071f3] transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor">
                    <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/>
                  </svg>
                </div>
              </div>
            </div>
          </router-link>

          <!-- Loading More Indicator -->
          <div 
            v-if="hasMore && !loading"
            ref="loadMoreEl"
            class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 text-center"
          >
            <div v-if="loadingMore" class="flex items-center justify-center gap-3">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0071f3]"></div>
              <p class="text-sm text-gray-500">Memuat data...</p>
            </div>
            <p v-else class="text-sm text-gray-400">Gulir ke bawah untuk memuat lebih banyak</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-12 text-center">
          <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor">
              <path d="M112 0C85.5 0 64 21.5 64 48l0 48L16 96c-8.8 0-16 7.2-16 16s7.2 16 16 16l48 0 208 0c8.8 0 16 7.2 16 16s-7.2 16-16 16L64 160l-16 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l16 0 176 0c8.8 0 16 7.2 16 16s-7.2 16-16 16L64 224l-48 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l48 0 144 0c8.8 0 16 7.2 16 16s-7.2 16-16 16L64 288l0 128c0 53 43 96 96 96s96-43 96-96l128 0c0 53 43 96 96 96s96-43 96-96l32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l0-64 0-32 0-18.7c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7L416 96l0-48c0-26.5-21.5-48-48-48L112 0zM544 237.3l0 18.7-128 0 0-96 50.7 0L544 237.3zM160 368a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm272 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0z"/>
            </svg>
          </div>
          <p class="text-gray-600 font-semibold text-lg mb-2">Belum Ada Data Movement</p>
          <p class="text-gray-500 text-sm mb-6">Mulai dengan menambahkan movement baru</p>
          <router-link
            to="/addnewgm"
            class="inline-flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
            </svg>
            Tambah Movement Baru
          </router-link>
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

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import openbravoApi from '@/lib/openbravo'

// ===== State
const loading = ref(false)
const loadingMore = ref(false)
const errorMessage = ref('')
const movements = ref([])

// ===== Pagination
const PAGE_SIZE = 10
const nextStartRow = ref(0)
const hasMore = ref(true)
const loadMoreEl = ref(null)
let io = null

// ===== Utils
const fmtDateTimeID = (isoOrDate) => {
  try {
    const d = new Date(isoOrDate)
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return isoOrDate || '-'
  }
}

const fmtDateID = (yyyyMmDd) => {
  if (!yyyyMmDd) return '-'
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1, 10, 0, 0)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dt)
}

// ===== Status Mapping
const computeStatus = (row) => {
  const posted = row.posted
  const processed = !!row.processed
  if (processed && (posted === 'Y' || posted === 'D')) {
    return 'Approved'
  }
  return 'On Review'
}

// ===== Fetch Locator/Warehouse
const fetchLocatorWarehouse = async (locatorId) => {
  if (!locatorId) return { warehouseId: null, warehouseName: null }
  const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', {
    params: {
      _where: `id='${locatorId}'`,
      _selectedProperties: 'id,warehouse,searchKey',
      _startRow: 0,
      _endRow: 1,
      _noCount: true,
    },
  })
  const row = data?.response?.data?.[0]
  return {
    warehouseId: row?.warehouse ?? null,
    warehouseName: row?.['warehouse$_identifier'] ?? null,
    locatorName: row?.searchKey ?? null,
  }
}

// ===== Lokasi dari Lines
const fetchMovementLines = async (movementId) => {
  const params = {
    _where: `movement='${movementId}'`,
    _startRow: 0,
    _endRow: 1,
    _noCount: true,
    _selectedProperties: 'storageBin,newStorageBin',
  }
  const { data } = await openbravoApi.get(
    '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine',
    { params },
  )
  const line = data?.response?.data?.[0]
  if (!line) return '-'

  const fromid = line['storageBin'] || '-'
  const toid = line['newStorageBin'] || '-'

  const [fromRes, toRes] = await Promise.allSettled([
    fetchLocatorWarehouse(fromid),
    fetchLocatorWarehouse(toid),
  ])

  const fromWarehouseName = fromRes.value?.warehouseName ?? null
  const toWarehouseName = toRes.value?.warehouseName ?? null

  if (!fromWarehouseName && !toWarehouseName) return '-'
  return `${fromWarehouseName || '-'} → ${toWarehouseName || '-'}`
}

// ===== Router helper
const detailLink = (mv) => {
  return { name: 'detailmovement', params: { id: mv.id } }
}

// ===== Fetch Batch
const fetchMovementBatch = async () => {
  const params = {
    _orderBy: 'creationDate desc',
    _startRow: nextStartRow.value,
    _endRow: nextStartRow.value + PAGE_SIZE,
    _noCount: true,
    _selectedProperties: [
      'id',
      'name',
      '_identifier',
      'createdBy',
      'createdBy$_identifier',
      'movementDate',
      'creationDate',
      'processed',
      'posted',
    ].join(','),
  }

  const { data } = await openbravoApi.get(
    '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovement',
    { params },
  )

  const rows = data?.response?.data || []
  const mapped = rows.map((r) => ({
    id: r.id,
    documentNo: r.name || r._identifier || '-',
    requester: r['createdBy$_identifier'] || '-',
    movementDateFmt: r.movementDate
      ? `${fmtDateID(r.movementDate)} ${r.creationDate ? new Date(r.creationDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}`.trim()
      : r.creationDate
        ? fmtDateTimeID(r.creationDate)
        : '-',
    locationText: '-',
    status: computeStatus(r),
    raw: r,
  }))

  nextStartRow.value += rows.length
  if (rows.length < PAGE_SIZE) hasMore.value = false

  return mapped
}

// ===== Fetch Movements
const fetchMovements = async ({ reset = false } = {}) => {
  if (reset) {
    loading.value = true
    errorMessage.value = ''
    movements.value = []
    nextStartRow.value = 0
    hasMore.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const batch = await fetchMovementBatch()
    const startIndex = movements.value.length
    movements.value.push(...batch)

    await Promise.allSettled(
      batch.map(async (mv, idx) => {
        try {
          const loc = await fetchMovementLines(mv.id)
          const absoluteIndex = startIndex + idx
          movements.value[absoluteIndex].locationText = loc
        } catch (e) {
          // Keep '-' on error
        }
      }),
    )
  } catch (err) {
    console.error('Gagal mengambil data movement:', err)
    errorMessage.value = 'Gagal mengambil data movement. Coba muat ulang atau periksa koneksi.'
    hasMore.value = false
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// ===== Infinite Scroll
const setupObserver = () => {
  if (io) io.disconnect()
  io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      if (!hasMore.value || loading.value || loadingMore.value) return
      fetchMovements({ reset: false })
    },
    {
      root: null,
      rootMargin: '0px 0px 300px 0px',
      threshold: 0.0,
    },
  )
  if (loadMoreEl.value) io.observe(loadMoreEl.value)
}

onMounted(async () => {
  await fetchMovements({ reset: true })
  setupObserver()
})

onBeforeUnmount(() => {
  if (io) io.disconnect()
})

const goBack = () => window.history.back()
</script>

<style scoped>
.ml-13 {
  margin-left: 3.25rem;
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}

::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-thumb {
  background-color: #0071f3;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: #0060d1;
}
</style>