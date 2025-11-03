<template>
  <div
    class="min-h-screen bg-[#FFFFFF] flex flex-col items-center px-4 sm:px-6 md:px-10 py-6 relative"
  >
    <!-- Tombol Back -->
    <button
      @click="goBack"
      class="absolute left-4 sm:left-6 top-4 sm:top-6 flex items-center gap-2 bg-white border border-[#4C763B] text-[#4C763B] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm hover:bg-[#E7F1E3] transition text-sm sm:text-base"
    >
      <span class="text-lg">←</span>
    </button>

    <!-- Header -->
    <div
      class="w-full max-w-6xl flex flex-wrap justify-between items-center mb-6 mt-16 sm:mt-20 gap-3"
    >
      <h1 class="font-bold text-lg sm:text-xl text-black">Good Movement</h1>
      <router-link
        to="/addnewgm"
        class="bg-[#0071f3] text-white px-4 sm:px-6 py-2 rounded-lg shadow hover:bg-[#8FABD4] transition text-sm sm:text-base"
      >
        + Add New
      </router-link>
    </div>

    <!-- Error -->
    <div v-if="errorMessage" class="w-full max-w-6xl mb-4">
      <div class="bg-red-50 border border-red-300 text-red-700 rounded-xl p-3 text-sm">
        {{ errorMessage }}
      </div>
    </div>

    <!-- Card List -->
    <div class="w-full max-w-6xl space-y-5">
      <!-- Loading skeleton -->
      <template v-if="loading">
        <div v-for="n in 3" :key="n" class="bg-white rounded-xl p-4 sm:p-6 shadow-xl animate-pulse">
          <div class="flex justify-between items-start">
            <div class="space-y-2">
              <div class="h-4 w-56 bg-gray-200 rounded"></div>
              <div class="h-3 w-40 bg-gray-200 rounded"></div>
            </div>
            <div class="h-5 w-20 bg-gray-200 rounded"></div>
          </div>
          <div class="mt-3 space-y-2">
            <div class="h-3 w-64 bg-gray-200 rounded"></div>
            <div class="h-3 w-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </template>

      <!-- Data -->
      <template v-else>
        <div
          v-for="mv in movements"
          :key="mv.id"
          class="rounded-xl p-4 sm:p-6 shadow hover:shadow-md transition shadow-xl"
          :class="cardClass(mv.status)"
        >
          <router-link
            :to="detailLink(mv)"
            class="block focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8FABD4] rounded-xl"
          >
            <div class="flex justify-between items-start">
              <div>
                <p
                  :class="[
                    'font-bold text-sm sm:text-base',
                    mv.status === 'Approved' ? 'text-black' : 'text-black',
                  ]"
                >
                  No-Ref : {{ mv.documentNo }}
                </p>
                <p
                  :class="[
                    'text-xs sm:text-sm',
                    mv.status === 'Approved' ? 'text-black' : 'text-gray-600',
                  ]"
                >
                  Requester : {{ mv.requester || '-' }}
                </p>
              </div>
              <div
                :class="[
                  mv.status === 'Approved' ? 'text-[#08CB00]' : 'text-black',
                  'cursor-pointer text-sm sm:text-base font-semibold',
                ]"
              >
                <label>{{ mv.status }}</label>
              </div>
            </div>

            <div
              class="mt-3 text-xs sm:text-sm"
              :class="mv.status === 'Approved' ? 'text-black' : 'text-gray-700'"
            >
              <p>
                <span class="font-semibold" :class="mv.status === 'Approved' ? 'text-black' : ''"
                  >Tanggal :</span
                >
                {{ mv.movementDateFmt }}
              </p>
              <p>
                <span class="font-semibold" :class="mv.status === 'Approved' ? 'text-black' : ''"
                  >Lokasi :</span
                >
                {{ mv.locationText }}
              </p>
            </div>
          </router-link>
        </div>

        <!-- Empty state -->
        <div v-if="movements.length === 0" class="text-center text-gray-600 text-sm py-10">
          Belum ada data movement.
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import openbravoApi from '@/lib/openbravo' // axios instance kamu

const loading = ref(false)
const errorMessage = ref('')
const movements = ref([])

const LIMIT = 20 // sesuaikan kalau perlu

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
  // Untuk status 'Approved' jika sudah diproses dan diposting (baik 'D' atau 'Y')
  if (processed && (posted === 'Y' || posted === 'D')) {
    return 'Approved'
  }
  return 'On Review'
}

const fetchLocatorWarehouse = async (locatorId) => {
  if (!locatorId) return { warehouseId: null, warehouseName: null }
  const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', {
    params: {
      _where: `id='${locatorId}'`,
      _selectedProperties: 'id,warehouse',
      _startRow: 0,
      _endRow: 1,
    },
  })
  const row = data?.response?.data?.[0]
  return {
    warehouseId: row?.warehouse ?? null,
    warehouseName: row?.['warehouse$_identifier'] ?? null,
    locatorName: row?.searchKey ?? null,
  }
}

// ===== Lokasi dari Lines (ambil baris pertama)
const fetchMovementLines = async (movementId) => {
  const params = {
    _where: `movement='${movementId}'`,
    _startRow: 0,
    _endRow: 1,
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
  const fromName = line['storageBin$_identifier'] || '-'
  const toName = line['newStorageBin$_identifier'] || '-'

  const [fromRes, toRes] = await Promise.allSettled([
    fetchLocatorWarehouse(fromid),
    fetchLocatorWarehouse(toid),
  ])

  const fromWarehouseId = fromRes.value?.warehouseId ?? null
  const fromWarehouseName = fromRes.value?.warehouseName ?? null
  const toWarehouseId = toRes.value?.warehouseId ?? null
  const toWarehouseName = toRes.value?.warehouseName ?? null

  return `${fromWarehouseName} → ${toWarehouseName}`
}

// ===== Kartu Style
const cardClass = (status) => {
  if (status === 'Approved') {
    return ['bg-[#FFFFFF]', 'border-[#FFFFFF]']
  }
  // Default On Review
  return ['bg-white', 'border-black']
}

// ===== Router helper
const detailLink = (mv) => {
  // contoh route by name dengan param :id
  return { name: 'detailmovement', params: { id: mv.id } }
  // atau:
  // return { path: '/detailmovement', query: { id: mv.id } }
}

// ===== Fetch header + resolusi lokasi (lines)
const fetchMovements = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    // Ambil header movement
    const { data } = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovement',
      {
        params: {
          _orderBy: 'creationDate desc',
        },
      },
    )

    const rows = data?.response?.data || []

    // Mapping awal (lokasi placeholder '-')
    movements.value = rows.map((r) => ({
      id: r.id,
      documentNo: r.name || r._identifier || '-', // gunakan name sebagai No-Ref
      requester: r['createdBy$_identifier'] || '-',
      movementDateFmt: r.movementDate
        ? `${fmtDateID(r.movementDate)} ${r.creationDate ? new Date(r.creationDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}`.trim()
        : r.creationDate
          ? fmtDateTimeID(r.creationDate)
          : '-',
      locationText: '-', // akan diisi dari lines
      status: computeStatus(r),
      raw: r,
    }))

    // Paralel: ambil lokasi dari line per movement
    await Promise.allSettled(
      movements.value.map(async (mv, i) => {
        try {
          const loc = await fetchMovementLines(mv.id)
          movements.value[i].locationText = loc
        } catch (e) {
          // biarkan '-' jika gagal
        }
      }),
    )
  } catch (err) {
    console.error('Gagal mengambil data movement:', err)
    errorMessage.value = 'Gagal mengambil data movement. Coba muat ulang atau periksa koneksi.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchMovements)

const goBack = () => window.history.back()
</script>

<style scoped>
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-thumb {
  background-color: #4c763b;
  border-radius: 10px;
}
</style>
