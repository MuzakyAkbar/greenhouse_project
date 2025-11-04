<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
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
                📋
              </span>
              Detail Movement
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13" v-if="movement">
              Dibuat oleh: <span class="font-semibold">{{ movement.createdBy || '-' }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-8 animate-pulse">
        <div class="space-y-6">
          <div class="flex justify-between items-start">
            <div class="space-y-3 flex-1">
              <div class="h-6 w-48 bg-gray-200 rounded"></div>
              <div class="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
            <div class="h-8 w-32 bg-gray-200 rounded-lg"></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="h-20 bg-gray-200 rounded-xl"></div>
            <div class="h-20 bg-gray-200 rounded-xl"></div>
            <div class="h-20 bg-gray-200 rounded-xl"></div>
            <div class="h-20 bg-gray-200 rounded-xl"></div>
          </div>
          <div class="h-40 bg-gray-200 rounded-xl"></div>
        </div>
      </div>

      <!-- Not Found -->
      <div v-else-if="!movement" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-12 text-center">
        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24l0 112c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-112c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
          </svg>
        </div>
        <p class="text-gray-600 font-semibold text-lg mb-2">Data Movement Tidak Ditemukan</p>
        <p class="text-gray-500 text-sm mb-6">Movement yang Anda cari tidak ada atau telah dihapus</p>
        <button
          @click="goBack"
          class="inline-flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          Kembali
        </button>
      </div>

      <!-- Content -->
      <template v-else>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-8">
          <!-- Header dengan Status -->
          <div class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ movement.noRef }}</h2>
              <p class="text-sm text-gray-500 mt-1">{{ movement.date }}</p>
            </div>
            <span 
              class="text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap"
              :class="movement.status === 'Approved' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'"
            >
              {{ movement.status === 'Approved' ? '✅ Approved' : '⏳ On Review' }}
            </span>
          </div>

          <!-- Divider -->
          <div class="my-6 border-t border-gray-200"></div>

          <!-- Info Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p class="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                </svg>
                Tanggal Movement
              </p>
              <p class="text-sm font-bold text-gray-900">{{ movement.date }}</p>
            </div>

            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p class="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM112 256l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
                </svg>
                No. Referensi
              </p>
              <p class="text-sm font-bold text-gray-900">{{ movement.noRef }}</p>
            </div>

            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p class="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor">
                  <path d="M0 488L0 171.3c0-26.2 15.9-49.7 40.2-59.4L308.1 4.8c7.6-3.1 16.1-3.1 23.8 0L599.8 111.9c24.3 9.7 40.2 33.3 40.2 59.4L640 488c0 13.3-10.7 24-24 24l-48 0c-13.3 0-24-10.7-24-24l0-264c0-17.7-14.3-32-32-32l-384 0c-17.7 0-32 14.3-32 32l0 264c0 13.3-10.7 24-24 24l-48 0c-13.3 0-24-10.7-24-24zm488 24l-336 0c-13.3 0-24-10.7-24-24l0-56 384 0 0 56c0 13.3-10.7 24-24 24zM128 400l0-64 384 0 0 64-384 0z"/>
                </svg>
                Gudang Asal
              </p>
              <p class="text-sm font-bold text-gray-900">{{ movement.fromWarehouseName || '-' }}</p>
            </div>

            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p class="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor">
                  <path d="M0 488L0 171.3c0-26.2 15.9-49.7 40.2-59.4L308.1 4.8c7.6-3.1 16.1-3.1 23.8 0L599.8 111.9c24.3 9.7 40.2 33.3 40.2 59.4L640 488c0 13.3-10.7 24-24 24l-48 0c-13.3 0-24-10.7-24-24l0-264c0-17.7-14.3-32-32-32l-384 0c-17.7 0-32 14.3-32 32l0 264c0 13.3-10.7 24-24 24l-48 0c-13.3 0-24-10.7-24-24zm488 24l-336 0c-13.3 0-24-10.7-24-24l0-56 384 0 0 56c0 13.3-10.7 24-24 24zM128 400l0-64 384 0 0 64-384 0z"/>
                </svg>
                Gudang Tujuan
              </p>
              <p class="text-sm font-bold text-gray-900">{{ movement.toWarehouseName || '-' }}</p>
            </div>
          </div>

          <!-- Divider -->
          <div class="my-6 border-t border-gray-200"></div>

          <!-- Material List -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M50.7 58.5L0 160l208 0 0-128L93.7 32C75.5 32 58.9 42.3 50.7 58.5zM240 160l208 0L397.3 58.5C389.1 42.3 372.5 32 354.3 32L240 32l0 128zm208 32L0 192 0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-224z"/>
                </svg>
                Daftar Material
              </h3>
              <span class="text-sm bg-[#0071f3] text-white px-3 py-1 rounded-lg font-semibold">
                {{ movement.materials?.length || 0 }} Item
              </span>
            </div>

            <div v-if="(movement.materials?.length || 0) === 0" 
                 class="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
              <p class="text-gray-500 text-sm">Belum ada material dalam movement ini</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(item, idx) in movement.materials"
                :key="idx"
                class="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-[#0071f3] transition-all"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-center gap-3 flex-1">
                    <div class="w-12 h-12 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {{ (item.name || '?').toString().charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1">
                      <p class="font-bold text-gray-900">{{ item.name || '-' }}</p>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                          {{ formatNumber(item.amount ?? 0) }} {{ item.uom || '' }}
                        </span>
                      </div>
                      <p class="text-xs text-gray-500 mt-1" v-if="item.from || item.to">
                        {{ item.from || '-' }} → {{ item.to || '-' }}
                      </p>
                    </div>
                  </div>
                  <div class="text-2xl">
                    📦
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="my-8 border-t border-gray-200"></div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3 justify-end">
            <!-- Jika Approved -->
            <template v-if="isApproved">
              <button
                @click="printDetail"
                class="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-xl transition-all"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M128 0C92.7 0 64 28.7 64 64l0 96 64 0 0-96 226.7 0L384 93.3l0 66.7 64 0 0-66.7c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0L128 0zM384 352l0 32 0 64-256 0 0-64 0-16 0-16 256 0zm64 32l32 0c17.7 0 32-14.3 32-32l0-96c0-35.3-28.7-64-64-64L64 192c-35.3 0-64 28.7-64 64l0 96c0 17.7 14.3 32 32 32l32 0 0 64c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-64zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
                </svg>
                Cetak
              </button>
              <button
                @click="goBack"
                class="flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                Kembali
              </button>
            </template>

            <!-- Jika belum approved -->
            <template v-else>
              <!-- Button Edit - Tampil untuk semua user -->
              <button
                @click="handleEdit"
                class="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-xl transition-all"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160L0 416c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 64z"/>
                </svg>
                Edit
              </button>

              <!-- Button Reject & Approve - Hanya untuk Manager -->
              <template v-if="isManager">
                <button
                  @click="handleReject"
                  class="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-6 py-2.5 rounded-xl transition-all"
                >
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                    <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
                  </svg>
                  Reject
                </button>
                <button
                  @click="handleApprove"
                  class="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
                  </svg>
                  Approve
                </button>
              </template>
            </template>
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
  if (status === 'Approved') return 'bg-[#00c03d] text-white border-[#00c03d]'
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

const isManager = computed(() => {
  return currentUserRole.value?.toLowerCase() === 'manager'
})

const handleEdit = () => {
  console.log('Edit clicked for', movement.value?.id)

  router.push({
    name: 'movement-edit', // arahkan ke halaman edit
    params: { id: movement.value?.id }, // kirim ID movement yang dipilih
  })
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