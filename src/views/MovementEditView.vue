<template>
  <div class="min-h-screen bg-[#FFFFFF] flex flex-col items-center p-4 sm:p-6 relative">
    <!-- Tombol Kembali -->
    <button
      @click="goBack"
      class="fixed sm:absolute left-4 sm:left-6 top-4 sm:top-6 bg-white border border-black px-4 sm:px-5 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition shadow-sm z-20"
      aria-label="Kembali"
    >
      ←
    </button>

    <!-- Header spacer (biar jarak sama seperti detail) -->
    <div class="w-full max-w-5xl text-left mb-4 sm:mb-6 mt-14 sm:mt-16"></div>

    <!-- Card Form -->
    <div class="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-4 sm:p-8">
      <!-- Header (disamakan dengan Detail Movement) -->
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-[#2C4A3F]">Edit</h1>
          <p class="text-sm text-gray-600" v-if="createdByName">
            Dibuat oleh:
            <span class="font-medium text-gray-800">{{ createdByName || '-' }}</span>
          </p>
        </div>

        <!-- Status Badge -->
        <span
          v-if="headerStatusText"
          :class="[
            'px-3 py-1.5 rounded-lg text-sm font-semibold border-2',
            statusBadgeClass(headerStatusText),
          ]"
        >
          {{ headerStatusText }}
        </span>
      </div>

      <!-- Divider -->
      <div class="my-5 border-t border-dashed"></div>

      <div
        v-if="blockedMessage"
        class="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 p-3 text-sm"
      >
        {{ blockedMessage }}
      </div>

      <div
        v-if="successMsg"
        class="mb-4 rounded-lg border border-green-300 bg-green-50 text-green-800 p-3 text-sm"
      >
        {{ successMsg }}
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div class="h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        <div class="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div class="h-40 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <template v-else>
        <!-- Form Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <!-- Tanggal -->
          <div class="col-span-1">
            <label class="block font-medium text-black mb-2 text-sm sm:text-base">Tanggal</label>
            <input
              type="date"
              readonly
              v-model="selectedDate"
              :disabled="isApproved"
              class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4C763B] focus:outline-none disabled:bg-gray-100"
            />
          </div>

          <!-- Pilih Gudang -->
          <div class="col-span-1">
            <label class="block font-medium text-black mb-2 text-sm sm:text-base"
              >Pilih Gudang</label
            >

            <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <!-- Gudang Asal -->
              <select
                v-model="fromWarehouse"
                :disabled="isApproved"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4C763B] focus:outline-none disabled:bg-gray-100"
              >
                <option disabled value="">Pilih Gudang Asal</option>
                <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse">
                  {{ warehouse.name }}
                </option>
              </select>

              <!-- Arrow -->
              <span class="hidden sm:inline-block text-2xl text-black text-center">→</span>

              <!-- Gudang Tujuan -->
              <select
                v-model="toWarehouse"
                :disabled="isApproved"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4C763B] focus:outline-none disabled:bg-gray-100"
              >
                <option disabled value="">Pilih Gudang Tujuan</option>
                <option
                  v-for="warehouse in toWarehouseOptions"
                  :key="warehouse.id"
                  :value="warehouse"
                >
                  {{ warehouse.name }}
                </option>
              </select>
            </div>

            <p
              v-if="fromWarehouse && toWarehouse && fromWarehouse.id === toWarehouse.id"
              class="text-xs sm:text-sm text-red-600 mt-2"
            >
              Gudang asal dan tujuan tidak boleh sama.
            </p>
          </div>
        </div>

        <!-- Divider -->
        <div class="my-5 border-t border-dashed"></div>

        <!-- Add/Edit Material -->
        <div class="mt-6 sm:mt-8">
          <div class="flex items-center justify-between mb-3">
            <label class="font-medium text-black text-xl sm:text-base">Material</label>

            <div class="flex items-center gap-2">
              <!-- tombol tambah dari bin asal (optional pada edit) -->
              <button
                :disabled="!selectedBinId || modalLoading || isApproved"
                @click="openMaterialModal"
                class="rounded-full p-2 sm:p-2.5 transition text-lg sm:text-xl"
                :class="[
                  !selectedBinId || modalLoading || isApproved
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#E8F5E9] text-black hover:bg-[#DDEEDC]',
                ]"
                title="Ambil dari bin asal"
                aria-label="Tambah material dari bin asal"
              >
                {{ modalLoading ? '…' : '+' }}
              </button>
            </div>
          </div>

          <!-- List Material -->
          <div class="space-y-3 sm:space-y-4">
            <div v-if="materials.length === 0" class="text-gray-500 text-sm">
              Belum ada material.
            </div>

            <div v-for="(item, index) in materials" :key="index">
              <div
                class="border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-sm"
                :class="
                  item.stock != null && item.amount > item.stock
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-200 bg-[#F7F9FC]'
                "
              >
                <div class="flex items-center gap-3 sm:gap-4">
                  <div
                    class="w-10 h-10 flex items-center justify-center rounded-full text-white font-semibold shrink-0"
                    :style="{ backgroundColor: item.color }"
                  >
                    {{ item.name?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                  <div>
                    <p class="font-semibold text-black text-sm sm:text-base leading-tight">
                      {{ item.name || '(No Name)' }}
                    </p>
                    <p class="text-[11px] sm:text-xs text-gray-500">UOM: {{ item.uom || '-' }}</p>

                    <!-- Qty (mobile) -->
                    <div class="mt-2 flex items-center gap-2 sm:hidden">
                      <input
                        v-model.number="item.amount"
                        type="number"
                        min="0"
                        inputmode="decimal"
                        placeholder="0"
                        :disabled="isApproved"
                        class="w-28 border-b focus:outline-none text-sm transition bg-transparent"
                        :class="
                          item.stock != null && item.amount > item.stock
                            ? 'border-red-500 text-red-600'
                            : 'border-gray-300 focus:border-[#4C763B] text-black'
                        "
                      />
                      <span
                        v-if="item.stock != null"
                        class="text-xs"
                        :class="item.amount > item.stock ? 'text-red-600' : 'text-black'"
                      >
                        / {{ formatNumber(item.stock) }} {{ item.uom || '' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Qty (desktop/right) -->
                <div class="hidden sm:flex items-center gap-2">
                  <input
                    v-model.number="item.amount"
                    type="number"
                    min="0"
                    inputmode="decimal"
                    placeholder="0"
                    :disabled="isApproved"
                    class="w-28 border-b focus:outline-none text-sm transition bg-transparent"
                    :class="
                      item.stock != null && item.amount > item.stock
                        ? 'border-red-500 text-red-600'
                        : 'border-gray-300 focus:border-[#4C763B] text-black'
                    "
                  />
                  <span
                    v-if="item.stock != null"
                    class="text-sm"
                    :class="item.amount > item.stock ? 'text-red-600' : 'text-black'"
                  >
                    / {{ formatNumber(item.stock) }} {{ item.uom || '' }}
                  </span>
                </div>

                <!-- Delete -->
                <div class="flex sm:block">
                  <button
                    @click="removeMaterial(index)"
                    :disabled="isApproved"
                    class="ml-auto sm:ml-0 text-red-500 hover:text-red-700 transition text-lg sm:text-xl disabled:opacity-50"
                    aria-label="Hapus material"
                    title="Hapus material"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="mt-6 sm:mt-8">
          <button
            @click="submitUpdate"
            :disabled="submitLoading || isApproved"
            class="w-full bg-[#0071f3] hover:bg-[#dbe7ff] hover:text-black disabled:opacity-60 text-white font-semibold py-3 sm:py-3.5 rounded-lg transition text-base sm:text-lg"
          >
            {{ submitLoading ? 'Menyimpan…' : 'Simpan Perubahan' }}
          </button>
        </div>
      </template>
    </div>

    <!-- Popup Pilih Barang -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center"
      @keydown.esc.prevent="showModal = false"
    >
      <div class="absolute inset-0 bg-black/50" @click="showModal = false" aria-hidden="true"></div>

      <div
        class="relative bg-white w-[92%] sm:w-full sm:max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 z-10 transform transition-all duration-150 ease-out scale-100"
        role="dialog"
        aria-modal="true"
        aria-label="Pilih Barang"
      >
        <div class="flex items-center justify-between mb-3 sm:mb-4">
          <h3 class="font-bold text-base sm:text-lg">Pilih Barang</h3>
          <button
            @click="showModal = false"
            class="text-gray-500 hover:text-gray-700 p-2 -mr-2"
            aria-label="Tutup"
            title="Tutup"
          >
            ✖
          </button>
        </div>

        <!-- Search bar -->
        <div class="relative mb-3 sm:mb-4">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Cari barang..."
            class="w-full border rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4C763B]"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5 7.5 7.5 0 0016.65 16.65z"
              />
            </svg>
          </span>
        </div>

        <div class="max-h-[60vh] overflow-y-auto">
          <div v-if="modalLoading" class="text-center text-sm text-gray-500 py-10">
            Memuat data dari bin…
          </div>

          <div
            v-else-if="availableItems.length === 0"
            class="text-center text-sm text-gray-500 py-10"
          >
            Tidak ada item pada bin ini.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(item, index) in filteredItems"
              :key="index"
              @click="selectItem(item)"
              class="flex items-center justify-between border rounded-xl px-3 sm:px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 flex items-center justify-center rounded-full text-white font-semibold shrink-0"
                  :style="{ backgroundColor: item.color }"
                >
                  {{ item.name.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <p class="font-semibold truncate max-w-[58vw] sm:max-w-[20rem]">
                    {{ item.name }}
                  </p>
                  <p class="text-xs text-gray-600">
                    Stock: {{ formatNumber(item.stock) }} {{ item.uom || '' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import openbravoApi from '@/lib/openbravo'

// ===== Props dari route
const props = defineProps({
  id: { type: String, required: true },
})

const router = useRouter()

// ===== STATE
const loading = ref(true)
const submitLoading = ref(false)
const successMsg = ref('')
const blockedMessage = ref('')

// header & status
const movementName = ref('')
const isApproved = ref(false)
const headerStatusText = ref('')
const createdByName = ref('')

// tanggal
const selectedDate = ref('')

// warehouses & bins
const warehouses = ref([])
const fromWarehouse = ref('')
const toWarehouse = ref('')

const binsFrom = ref([]) // daftar bin gudang asal
const binsTo = ref([]) // daftar bin gudang tujuan
const selectedBinId = ref('') // bin (locator) asal
const selectedBinIdTo = ref('') // bin (locator) tujuan
const binLoading = ref(false)
const binLoadingTo = ref(false)

// materials
const materials = ref([]) // { productId, name, uomId, uom, amount, stock?, color }
const availableItems = ref([]) // untuk modal ambil dari bin

// modal
const showModal = ref(false)
const modalLoading = ref(false)
const searchQuery = ref('')

// ===== UTIL
const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0)
const randColor = () => {
  const palette = ['#CDB4DB', '#BDE0FE', '#FFC8DD', '#A2D2FF', '#CFE9A8', '#FFEE93']
  return palette[Math.floor(Math.random() * palette.length)]
}
const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

// ===== Status badge (samakan dengan Detail)
const statusBadgeClass = (status) => {
  if (status === 'Approved') return 'bg-[#00c03d] text-white border-[#00c03d]'
  if (status === 'Rejected') return 'bg-[#ecf2ff] text-[#2465bc] border-[#ecf2ff]'
  return 'bg-[#004492] text-white border-[#004492] shadow-xl'
}

// ===== API helpers
const computeStatus = (row) => {
  const posted = (row.posted ?? '').toString().trim().toUpperCase()
  const processed = !!row.processed
  if (processed && (posted === 'Y' || posted === 'D')) return 'Approved'
  return 'On Review'
}

const fetchMovementHeader = async (id) => {
  const { data } = await openbravoApi.get(
    '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovement',
    {
      params: {
        _where: `id='${id}'`,
        _startRow: 0,
        _endRow: 1,
        _noCount: true,
        _selectedProperties: 'id,name,movementDate,processed,posted,createdBy',
      },
    },
  )
  return data?.response?.data?.[0] || null
}

const fetchMovementLines = async (id) => {
  const { data } = await openbravoApi.get(
    '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine',
    {
      params: {
        _where: `movement='${id}'`,
        _noCount: true,
        _selectedProperties:
          'id,product,product$_identifier,movementQuantity,uOM,uOM$_identifier,storageBin,newStorageBin,storageBin$_identifier,newStorageBin$_identifier',
      },
    },
  )
  return data?.response?.data || []
}

const fetchLocatorWarehouse = async (locatorId) => {
  if (!locatorId) return { warehouseId: null, warehouseName: null, locatorName: null }
  const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', {
    params: {
      _where: `id='${locatorId}'`,
      _selectedProperties: 'id,warehouse,warehouse$_identifier,searchKey',
      _noCount: true,
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

const loadWarehouses = async () => {
  const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Warehouse', {
    params: { _noCount: true, _selectedProperties: 'id,name,client,organization' },
  })
  warehouses.value = (data?.response?.data || []).map((w) => ({
    id: w.id,
    name: w.name,
    clientId: w.client,
    organizationId: w.organization,
  }))
}

const loadBinsForWarehouse = async (warehouseId) => {
  if (!warehouseId) return []
  const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', {
    params: {
      _where: `M_Warehouse_ID='${warehouseId}'`,
      _noCount: true,
      _selectedProperties: 'id,searchKey',
    },
  })
  const rows = data?.response?.data || []
  return rows.map((r) => ({ id: r.id, name: r.searchKey || r._identifier || 'Bin' }))
}

const loadMaterialsByBin = async (locatorId) => {
  if (!locatorId) {
    availableItems.value = []
    return
  }
  modalLoading.value = true
  try {
    const { data } = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail',
      { params: { _where: `M_Locator_ID='${locatorId}' AND quantityOnHand > 0`, _noCount: true } },
    )
    const rows = data?.response?.data || []
    availableItems.value = rows.map((r) => ({
      productId: r.product,
      name: r['product$_identifier'] || '(Tanpa Nama Produk)',
      uomId: r.uOM,
      uom: r['uOM$_identifier'] || null,
      stock: r.quantityOnHand ?? 0,
      storageBin: r.storageBin,
      color: randColor(),
    }))
  } finally {
    modalLoading.value = false
  }
}

// ===== INIT
onMounted(async () => {
  loading.value = true
  try {
    await loadWarehouses()

    // Header
    const head = await fetchMovementHeader(props.id)
    if (!head) {
      blockedMessage.value = 'Dokumen tidak ditemukan.'
      return
    }
    movementName.value = head.name || '-'
    selectedDate.value = head.movementDate || formatDate(new Date())
    createdByName.value = head?.['createdBy$_identifier'] || '-'

    const statusText = computeStatus(head)
    headerStatusText.value = statusText
    isApproved.value = statusText === 'Approved'
    if (isApproved.value) {
      blockedMessage.value =
        'Dokumen sudah Approved (processed + posted). Perubahan tidak diperbolehkan.'
    }

    // Lines
    const lines = await fetchMovementLines(props.id)
    if (lines.length > 0) {
      // deteksi gudang asal/tujuan dari locator baris pertama
      const first = lines[0]
      const [fromWh, toWh] = await Promise.all([
        fetchLocatorWarehouse(first.storageBin),
        fetchLocatorWarehouse(first.newStorageBin),
      ])

      // set warehouses
      fromWarehouse.value = warehouses.value.find((w) => w.id === fromWh.warehouseId) || ''
      toWarehouse.value = warehouses.value.find((w) => w.id === toWh.warehouseId) || ''

      // load daftar bin untuk kedua gudang
      binLoading.value = true
      binLoadingTo.value = true
      try {
        binsFrom.value = await loadBinsForWarehouse(fromWarehouse.value?.id)
        binsTo.value = await loadBinsForWarehouse(toWarehouse.value?.id)
      } finally {
        binLoading.value = false
        binLoadingTo.value = false
      }

      // set selected bin (asal/tujuan)
      selectedBinId.value = first.storageBin || ''
      selectedBinIdTo.value = first.newStorageBin || ''

      // map materials dari semua lines
      materials.value = lines.map((r) => ({
        lineId: r.id,
        productId: r.product,
        name: r['product$_identifier'] || '(Tanpa Nama Produk)',
        amount: r.movementQuantity ?? 0,
        uomId: r.uOM,
        uom: r['uOM$_identifier'] || null,
        stock: null, // bisa diload dari storage detail jika perlu
        color: randColor(),
      }))
    }
  } catch (e) {
    blockedMessage.value = 'Gagal memuat data. Periksa koneksi atau log server.'
    console.error(e)
  } finally {
    loading.value = false
  }
})

// ===== WATCH
watch(fromWarehouse, async (fw, old) => {
  // Jika gudang asal berubah, kosongkan material agar tidak tercampur
  if ((fw && old && fw.id !== old.id) || (!fw && old)) {
    materials.value = []
    availableItems.value = []
    searchQuery.value = ''
    showModal.value = false
  }

  if (!fw) {
    binsFrom.value = []
    selectedBinId.value = ''
    return
  }

  // Muat ulang bin untuk gudang asal yang baru
  binsFrom.value = await loadBinsForWarehouse(fw.id)

  // Pilih default bin asal (atau kosongkan jika tidak ada)
  if (!binsFrom.value.find((b) => b.id === selectedBinId.value)) {
    selectedBinId.value = binsFrom.value[0]?.id || ''
  }
})

watch(toWarehouse, async (tw) => {
  if (!tw) {
    binsTo.value = []
    selectedBinIdTo.value = ''
    return
  }
  binsTo.value = await loadBinsForWarehouse(tw.id)
  if (!binsTo.value.find((b) => b.id === selectedBinIdTo.value)) {
    selectedBinIdTo.value = binsTo.value[0]?.id || ''
  }
})

// tujuan: semua warehouse kecuali asal
const toWarehouseOptions = computed(() =>
  warehouses.value.filter((w) => !fromWarehouse.value || w.id !== fromWarehouse.value.id),
)

// modal filter
const filteredItems = computed(() =>
  availableItems.value.filter((item) =>
    item.name.toLowerCase().includes((searchQuery.value || '').toLowerCase()),
  ),
)

// ===== MODAL actions
const openMaterialModal = async () => {
  if (!selectedBinId.value) return
  showModal.value = true
  await loadMaterialsByBin(selectedBinId.value)
}
const selectItem = (item) => {
  const idx = materials.value.findIndex((m) => m.productId === item.productId)
  if (idx >= 0) {
    showModal.value = false
    return
  }
  materials.value.push({
    productId: item.productId,
    name: item.name,
    uomId: item.uomId,
    uom: item.uom,
    stock: item.stock,
    amount: 0,
    color: item.color,
  })
  showModal.value = false
}
const removeMaterial = (index) => {
  materials.value.splice(index, 1)
}

// ===== VALIDASI
const validateBeforeSave = () => {
  if (!fromWarehouse.value || !toWarehouse.value)
    return 'Pilih gudang asal dan tujuan terlebih dulu.'
  if (fromWarehouse.value.id === toWarehouse.value.id)
    return 'Gudang asal dan tujuan tidak boleh sama.'
  if (!selectedBinId.value) return 'Bin dari gudang asal tidak ditemukan.'
  if (!selectedBinIdTo.value) return 'Bin dari gudang tujuan tidak ditemukan.'
  if (materials.value.length === 0) return 'Tambahkan minimal 1 material.'
  if (materials.value.some((m) => !m.amount || m.amount <= 0))
    return 'Jumlah material harus lebih dari 0.'
  const over = materials.value.find((m) => m.stock != null && m.amount > m.stock)
  if (over) return `Jumlah untuk ${over.name} melebihi stok tersedia!`
  return ''
}

// ===== SUBMIT (UPDATE)
const submitUpdate = async () => {
  if (isApproved.value) return
  const err = validateBeforeSave()
  if (err) {
    alert(err)
    return
  }

  submitLoading.value = true
  successMsg.value = ''
  try {
    // 1) Update header
    await openbravoApi.put(
      `/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovement/${props.id}`,
      {
        data: [{ movementDate: selectedDate.value }],
      },
    )

    // 2) Ambil semua lines lama
    const old = await fetchMovementLines(props.id)
    const oldIds = (old || []).map((x) => x.id)

    // 3) Hapus semua lines lama (simple strategy)
    for (const lid of oldIds) {
      await openbravoApi.delete(
        `/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine/${lid}`,
      )
    }

    // 4) Buat lines baru dari form
    const lines = materials.value.map((m) => ({
      _entityName: 'MaterialMgmtInternalMovementLine',
      movement: props.id,
      storageBin: selectedBinId.value,
      newStorageBin: selectedBinIdTo.value,
      product: m.productId,
      movementQuantity: m.amount,
      uOM: m.uomId || undefined,
    }))
    await openbravoApi.post(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine',
      { data: lines },
    )

    successMsg.value = 'Perubahan berhasil disimpan.'
  } catch (e) {
    console.error('Update gagal:', e)
    alert('Gagal menyimpan perubahan. Lihat console untuk detail.')
  } finally {
    submitLoading.value = false
  }
}

// ===== NAV
const goBack = () => router.back()
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: #4c763b;
  border-radius: 10px;
}
</style>
