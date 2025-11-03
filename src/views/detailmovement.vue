<template>
  <div class="min-h-screen bg-white flex flex-col items-center p-6 relative">
    <!-- Back Button -->
    <button
      @click="goBack"
      class="absolute left-6 top-6 border-2 border-black px-4 py-2 rounded-lg bg-white transition hover:bg-gray-50"
      aria-label="Kembali"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-5 h-5 fill-current">
                <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z"/>
              </svg>
    </button>

    <!-- Card Detail -->
    <div class="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mt-16">
      <!-- Header -->
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-[#2C4A3F]">Detail Movement</h1>
          <p class="text-sm text-gray-600" v-if="movement">
            Dibuat oleh:
            <span class="font-medium text-gray-800">{{ movement.createdBy || '-' }}</span>
          </p>
        </div>

        <!-- Status Badge -->
        <span
          v-if="movement"
          :class="[
            'px-3 py-1.5 rounded-lg text-sm font-semibold border-2',
            statusBadgeClass(movement.status),
          ]"
        >
          {{ movement.status || 'On Review' }}
        </span>
      </div>

      <!-- Divider -->
      <div class="my-5 border-t border-dashed"></div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-4">
        <div class="h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        <div class="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div class="h-40 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <!-- Not found -->
      <div v-else-if="!movement" class="text-center py-16">
        <p class="text-gray-600">Data movement tidak ditemukan.</p>
        <button
          @click="goBack"
          class="mt-4 border-2 border-black bg-white hover:bg-gray-50 rounded-lg px-4 py-2"
        >
          Kembali
        </button>
      </div>

      <!-- Content -->
      <template v-else>
        <!-- Info Ringkas -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="rounded-xl border border-gray-200 p-4">
            <p class="text-xs text-gray-500">Tanggal</p>
            <p class="font-semibold text-gray-900">{{ movement.date }}</p>
          </div>
          <div class="rounded-xl border border-gray-200 p-4">
            <p class="text-xs text-gray-500">No Register / Ref</p>
            <p class="font-semibold text-gray-900">
              {{ movement.noRef }}
            </p>
          </div>

          <!-- Warehouse (bukan nama bin) -->
          <div class="rounded-xl border border-gray-200 p-4">
            <p class="text-xs text-gray-500">Gudang Asal</p>
            <p class="font-semibold text-gray-900">
              {{ movement.fromWarehouseName || '-' }}
            </p>
          </div>
          <div class="rounded-xl border border-gray-200 p-4">
            <p class="text-xs text-gray-500">Gudang Tujuan</p>
            <p class="font-semibold text-gray-900">
              {{ movement.toWarehouseName || '-' }}
            </p>
          </div>
        </div>

        <!-- Divider -->
        <div class="my-6 border-t border-dashed"></div>

        <!-- Daftar Material -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-lg">Material</h2>
            <span class="text-sm text-gray-600">
              Total item:
              <span class="font-semibold text-gray-800">{{ movement.materials?.length || 0 }}</span>
            </span>
          </div>

          <div v-if="(movement.materials?.length || 0) === 0" class="text-gray-500 text-sm">
            Belum ada material.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(item, idx) in movement.materials"
              :key="idx"
              class="bg-[#F7F9FC] border border-gray-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 flex items-center justify-center rounded-full text-white font-semibold"
                  :style="{ backgroundColor: item.color || '#A2D2FF' }"
                >
                  {{ (item.name || '?').toString().charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="font-semibold text-gray-800">{{ item.name || '-' }}</p>
                  <p class="text-xs text-gray-500">
                    Jumlah:
                    <span class="font-medium text-gray-700">{{
                      formatNumber(item.amount ?? 0)
                    }}</span>
                    <span class="text-gray-400 ml-1">{{ item.uom || '-' }}</span>
                  </p>
                </div>
              </div>
              <div class="text-right text-[11px] text-gray-500" v-if="item.from || item.to">
                {{ item.from || '-' }} → {{ item.to || '-' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Action Footer -->
        <div class="mt-8 flex flex-wrap gap-3 justify-end">
          <!-- Jika Approved (processed && (posted === 'Y' || posted === 'D')) -->
          <template v-if="isApproved">
            <button
              @click="printDetail"
              class="border-2 border-black bg-white hover:bg-gray-50 rounded-lg px-4 py-2"
            >
              Cetak
            </button>
            <button
              @click="goBack"
              class="border-2 border-black bg-white hover:bg-gray-50 rounded-lg px-4 py-2"
            >
              Kembali
            </button>
          </template>

          <!-- Jika belum approved -->
          <template v-else>
            <button
              @click="handleReject"
              class="w-32 bg-[#ecf2ff] text-[#2465bc] border-[#ecf2ff] hover:bg-[#dbe7ff] py-2 rounded-lg transition font-medium"
            >
              Reject
            </button>
            <button
              @click="handleApprove"
              class="w-32 bg-[#0071f3] text-white border-[#0071f3] hover:bg-[#005fd1] py-2 rounded-lg transition font-medium"
            >
              Approve
            </button>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import openbravoApi from '@/lib/openbravo'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const movement = ref(null)

// ===== Helpers
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
const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0)

const computeStatus = (row) => {
  const posted = (row.posted ?? '').toString().trim().toUpperCase()
  const processed = !!row.processed
  if (processed && (posted === 'Y' || posted === 'D')) return 'Approved'
  return 'On Review'
}
const statusBadgeClass = (status) => {
  if (status === 'Approved') return 'bg-[#0071f3] text-white border-[#0071f3]'
  if (status === 'Rejected') return 'bg-[#ecf2ff] text-[#2465bc] border-[#ecf2ff]'
  return 'bg-[#004492] text-white border-[#004492] shadow-xl'
}

// ===== API: Header by movement id
const fetchMovementById = async (id) => {
  const { data } = await openbravoApi.get(
    '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovement',
    { params: { _where: `id='${id}'` } },
  )
  const r = data?.response?.data?.[0]
  if (!r) return null

  return {
    id: r.id,
    noRef: r.name || r._identifier || '-', // name
    date: r.movementDate ? fmtDateID(r.movementDate) : '-', // movementDate
    createdBy: r['createdBy$_identifier'] || '-', // createdBy$_identifier
    status: computeStatus(r),
    processed: !!r.processed,
    posted: (r.posted ?? '').toString().trim().toUpperCase(),
    fromWarehouseId: null,
    fromWarehouseName: null,
    toWarehouseId: null,
    toWarehouseName: null,
    materials: [],
  }
}

// ===== API: Locator -> Warehouse (untuk dapat nama gudang dari locator)
const fetchLocatorWarehouse = async (locatorId) => {
  if (!locatorId) return { warehouseId: null, warehouseName: null, locatorName: null }
  const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', {
    params: {
      _where: `id='${locatorId}'`,
      _selectedProperties: 'id,warehouse,warehouse$_identifier,searchKey',
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

// ===== API: Lines (gudang ringkas dari line pertama)
const fetchGudangByMovementId = async (movementId) => {
  const { data } = await openbravoApi.get(
    '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine',
    {
      params: {
        _where: `movement='${movementId}'`,
        _orderBy: 'creationDate asc',
        _startRow: 0,
        _endRow: 1,
        _selectedProperties:
          'storageBin,storageBin$_identifier,newStorageBin,newStorageBin$_identifier,product$_identifier,movementQuantity,uOM$_identifier',
      },
    },
  )
  const rows = data?.response?.data || []
  return rows.map((r) => ({
    // —— PRODUCT (tetap, tidak diubah) ——
    name: r['product$_identifier'] || '(Tanpa Nama Produk)',
    amount: r.movementQuantity ?? 0,
    uom: r['uOM$_identifier'] || null,

    // —— Tambahan untuk warehouse ——
    fromId: r['storageBin'] || null,
    toId: r['newStorageBin'] || null,
    from: r['storageBin$_identifier'] || null,
    to: r['newStorageBin$_identifier'] || null,
  }))
}

// ===== API: Materials (untuk list material — TIDAK mengubah cara ambil product)
const fetchMaterialByMovementId = async (movementId) => {
  const { data } = await openbravoApi.get(
    '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine',
    {
      params: {
        _where: `movement='${movementId}'`,
        // tidak wajib _selectedProperties; tapi agar efisien:
        _selectedProperties:
          'product,product$_identifier,movementQuantity,uOM,uOM$_identifier,storageBin$_identifier,newStorageBin$_identifier',
      },
    },
  )
  const rows = data?.response?.data || []
  return rows.map((r) => ({
    // —— PRODUCT (tetap, tidak diubah) ——
    name: r['product$_identifier'] || '(Tanpa Nama Produk)',
    amount: r.movementQuantity ?? 0,
    uom: r['uOM$_identifier'] || null,

    // Opsional: tampilkan bin per item
    from: r['storageBin$_identifier'] || null,
    to: r['newStorageBin$_identifier'] || null,
  }))
}

onMounted(async () => {
  loading.value = true
  try {
    const movementId = route.params.id

    // 1) Header
    movement.value = await fetchMovementById(movementId)
    if (!movement.value) {
      loading.value = false
      return
    }

    // 2) Resolve warehouse (ambil locator dari line pertama)
    const gudang = await fetchGudangByMovementId(movementId)
    const first = gudang[0]
    if (first?.fromId || first?.toId) {
      const [fromWh, toWh] = await Promise.all([
        fetchLocatorWarehouse(first.fromId),
        fetchLocatorWarehouse(first.toId),
      ])
      movement.value.fromWarehouseId = fromWh.warehouseId
      movement.value.fromWarehouseName = fromWh.warehouseName
      movement.value.toWarehouseId = toWh.warehouseId
      movement.value.toWarehouseName = toWh.warehouseName
    }

    // 3) Materials list (INI yang mengisi tampilan Material)
    const materials = await fetchMaterialByMovementId(movementId)
    movement.value.materials = materials
  } catch (e) {
    console.error(e)
    movement.value = null
  } finally {
    loading.value = false
  }
})

const isApproved = computed(() => {
  if (!movement.value) return false
  const processed = !!movement.value.processed
  const posted = (movement.value.posted ?? '').toString().trim().toUpperCase()
  return processed && (posted === 'Y' || posted === 'D')
})

// Placeholder aksi approve/reject
const handleApprove = () => {
  console.log('Approve clicked for', movement.value?.id)
  // TODO: panggil API Openbravo untuk proses & post dokumen
}
const handleReject = () => {
  console.log('Reject clicked for', movement.value?.id)
  // TODO: panggil API sesuai flow untuk reject (jika ada)
}

const goBack = () => router.back()
const printDetail = () => window.print()
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: #4c763b;
  border-radius: 10px;
}
@media print {
  .min-h-screen {
    background: white;
  }
  button {
    display: none;
  }
  .shadow-2xl {
    box-shadow: none;
  }
}
</style>
