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

    <!-- Header -->
    <div class="w-full max-w-5xl text-left mb-4 sm:mb-6 mt-14 sm:mt-16">
      <h1 class="font-bold text-lg sm:text-2xl text-black text-center">Good Movement</h1>
    </div>

    <!-- Card Form -->
    <div class="w-full max-w-5xl bg-white rounded-2xl shadow-lg p-4 sm:p-8">
      <h2 class="font-semibold text-lg sm:text-xl mb-4 sm:mb-6 text-black">Request Barang</h2>

      <!-- Info sukses -->
      <div
        v-if="movementId"
        class="mb-4 rounded-lg border border-green-300 bg-green-50 text-green-800 p-3 text-sm"
      >
        Dokumen berhasil dibuat.
        <div><span class="font-semibold">Movement ID:</span> {{ movementId }}</div>
        <div><span class="font-semibold">Name:</span> {{ movementName }}</div>
      </div>

      <!-- Form Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <!-- Tanggal -->
        <div class="col-span-1">
          <label class="block font-medium text-black mb-2 text-sm sm:text-base">Tanggal</label>
          <input
            type="date"
            v-model="selectedDate"
            class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4C763B] focus:outline-none"
          />
        </div>

        <!-- Pilih Gudang -->
        <div class="col-span-1">
          <label class="block font-medium text-black mb-2 text-sm sm:text-base">Pilih Gudang</label>

          <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <!-- Gudang Asal -->
            <select
              v-model="fromWarehouse"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4C763B] focus:outline-none"
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
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4C763B] focus:outline-none"
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

      <!-- Add Material -->
      <div class="mt-6 sm:mt-8">
        <div class="flex items-center justify-between mb-3">
          <label class="font-medium text-gray-700 text-sm sm:text-base">Add Material</label>
          <button
            :disabled="!selectedBinId || modalLoading"
            @click="openMaterialModal"
            class="rounded-full p-2 sm:p-2.5 transition text-lg sm:text-xl"
            :class="[
              !selectedBinId || modalLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#E8F5E9] text-black hover:bg-[#DDEEDC]',
            ]"
            title="Ambil dari bin asal"
            aria-label="Tambah material dari bin asal"
          >
            {{ modalLoading ? '…' : '+' }}
          </button>
        </div>

        <!-- List Material -->
        <div class="space-y-3 sm:space-y-4">
          <div v-for="(item, index) in materials" :key="index">
            <div
              class="border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-sm"
              :class="
                item.amount > item.stock
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-200 bg-[#F7F9FC]'
              "
            >
              <div class="flex items-center gap-3 sm:gap-4">
                <div
                  class="w-10 h-10 flex items-center justify-center rounded-full text-white font-semibold shrink-0"
                  :style="{ backgroundColor: item.color }"
                >
                  {{ item.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="font-semibold text-black text-sm sm:text-base leading-tight">
                    {{ item.name }}
                  </p>
                  <p class="text-[11px] sm:text-xs text-gray-500">UOM: {{ item.uom || '-' }}</p>

                  <!-- Qty (mobile inline) -->
                  <div class="mt-2 flex items-center gap-2 sm:hidden">
                    <input
                      v-model.number="item.amount"
                      type="number"
                      min="0"
                      :max="item.stock ?? undefined"
                      inputmode="decimal"
                      placeholder="0"
                      class="w-28 border-b focus:outline-none text-sm transition bg-transparent"
                      :class="
                        item.amount > item.stock
                          ? 'border-red-500 text-red-600'
                          : 'border-gray-300 focus:border-[#4C763B] text-black'
                      "
                    />
                    <span
                      class="text-xs"
                      :class="item.amount > item.stock ? 'text-red-600' : 'text-black'"
                    >
                      / {{ formatNumber(item.stock) }} {{ item.uom || '' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Qty (desktop/right side) -->
              <div class="hidden sm:flex items-center gap-2">
                <input
                  v-model.number="item.amount"
                  type="number"
                  min="0"
                  :max="item.stock ?? undefined"
                  inputmode="decimal"
                  placeholder="0"
                  class="w-28 border-b focus:outline-none text-sm transition bg-transparent"
                  :class="
                    item.amount > item.stock
                      ? 'border-red-500 text-red-600'
                      : 'border-gray-300 focus:border-[#4C763B] text-black'
                  "
                />
                <span
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
                  class="ml-auto sm:ml-0 text-red-500 hover:text-red-700 transition text-lg sm:text-xl"
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
          @click="submitAll"
          :disabled="submitLoading"
          class="w-full bg-[#0071f3] hover:bg-[#3b5e2e] disabled:opacity-60 text-white font-semibold py-3 sm:py-3.5 rounded-lg transition text-base sm:text-lg"
        >
          {{ submitLoading ? 'Mengirim…' : 'Submit' }}
        </button>
      </div>
    </div>

    <!-- Popup Pilih Barang (kecil terpusat) -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center"
      @keydown.esc.prevent="showModal = false"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50" @click="showModal = false" aria-hidden="true"></div>

      <!-- Card -->
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
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
        </div>

        <!-- Body scroll -->
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

          <!-- List Barang -->
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
              <span class="text-xs text-gray-500">Pilih</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import openbravoApi from '@/lib/openbravo'

// ===== STATE
const selectedDate = ref('')
const warehouses = ref([])
const fromWarehouse = ref('')
const toWarehouse = ref('')

// Bin Asal & Tujuan
const selectedBinId = ref('') // bin (locator) gudang asal
const binLoading = ref(false)
const selectedBinIdTo = ref('') // bin (locator) gudang tujuan
const binLoadingTo = ref(false)

const showModal = ref(false)
const modalLoading = ref(false)
const searchQuery = ref('')

const materials = ref([]) // dipilih user (akan disubmit)
const availableItems = ref([]) // hasil load dari MaterialMgmtStorageDetail (bin asal)

const submitLoading = ref(false)
const movementId = ref('')
const movementName = ref('')

// ===== UTIL
const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0)
const randColor = () => {
  const palette = ['#CDB4DB', '#BDE0FE', '#FFC8DD', '#A2D2FF', '#CFE9A8', '#FFEE93']
  return palette[Math.floor(Math.random() * palette.length)]
}

// ===== LIFECYCLE
onMounted(async () => {
  selectedDate.value = formatDate(new Date())
  await loadWarehouses()
})

// ===== API: Warehouses
const loadWarehouses = async () => {
  try {
    const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Warehouse')
    warehouses.value = data.response.data.map((w) => ({
      id: w.id,
      clientId: w.client,
      organizationId: w.organization,
      name: w.name,
    }))
  } catch (err) {
    console.error('Gagal load warehouse:', err)
    alert('Tidak dapat mengambil data gudang')
  }
}

// ===== API: First Locator (Bin) by Warehouse ID — Asal
const loadFirstBinForWarehouse = async (warehouseId) => {
  if (!warehouseId) {
    selectedBinId.value = ''
    return
  }
  binLoading.value = true
  try {
    const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', {
      params: { _where: `M_Warehouse_ID='${warehouseId}'` },
    })
    const list = data?.response?.data || []
    selectedBinId.value = list.length ? list[0].id : ''
  } catch (err) {
    console.error('Gagal load locator/bin (asal):', err)
    selectedBinId.value = ''
  } finally {
    binLoading.value = false
  }
}

// ===== API: First Locator (Bin) by Warehouse ID — Tujuan
const loadFirstBinForWarehouseTo = async (warehouseId) => {
  if (!warehouseId) {
    selectedBinIdTo.value = ''
    return
  }
  binLoadingTo.value = true
  try {
    const { data } = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', {
      params: { _where: `M_Warehouse_ID='${warehouseId}'` },
    })
    const list = data?.response?.data || []
    selectedBinIdTo.value = list.length ? list[0].id : ''
  } catch (err) {
    console.error('Gagal load locator/bin (tujuan):', err)
    selectedBinIdTo.value = ''
  } finally {
    binLoadingTo.value = false
  }
}

// ===== API: Materials by Bin (Storage Detail) — dari Bin Asal
const loadMaterialsByBin = async (locatorId) => {
  if (!locatorId) {
    availableItems.value = []
    return
  }
  modalLoading.value = true
  try {
    const { data } = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail',
      {
        params: { _where: `M_Locator_ID='${locatorId}' AND quantityOnHand > 0` },
      },
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
  } catch (err) {
    console.error('Gagal load material by bin:', err)
    availableItems.value = []
  } finally {
    modalLoading.value = false
  }
}

// ===== WATCHERS
watch(fromWarehouse, async (fw) => {
  // reset tujuan & data saat ganti gudang asal
  toWarehouse.value = ''
  selectedBinIdTo.value = ''
  materials.value = []
  availableItems.value = []

  const wid = fw?.id || ''
  await loadFirstBinForWarehouse(wid)
})

watch(toWarehouse, async (tw) => {
  const wid = tw?.id || ''
  await loadFirstBinForWarehouseTo(wid)
})

// Dropdown tujuan: semua warehouse kecuali yang dipilih di asal
const toWarehouseOptions = computed(() =>
  warehouses.value.filter((w) => !fromWarehouse.value || w.id !== fromWarehouse.value.id),
)

// FILTER modal
const filteredItems = computed(() =>
  availableItems.value.filter((item) =>
    item.name.toLowerCase().includes((searchQuery.value || '').toLowerCase()),
  ),
)

// ===== ACTIONS (Modal)
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

const removeMaterial = (index) => materials.value.splice(index, 1)

// ===== SUBMIT: Header + Lines (sekali klik)
// ===== SUBMIT: Header + Lines (sekali klik, dinamis per material)
const submitAll = async () => {
  // Validasi dasar
  if (!fromWarehouse.value || !toWarehouse.value) {
    alert('Pilih gudang asal dan tujuan terlebih dulu.')
    return
  }
  if (fromWarehouse.value.id === toWarehouse.value.id) {
    alert('Gudang asal dan tujuan tidak boleh sama.')
    return
  }
  if (!selectedBinId.value) {
    alert('Bin dari gudang asal tidak ditemukan.')
    return
  }
  if (!selectedBinIdTo.value) {
    alert('Bin dari gudang tujuan tidak ditemukan.')
    return
  }
  if (materials.value.length === 0) {
    alert('Tambahkan minimal 1 material.')
    return
  }
  if (materials.value.some((m) => !m.amount || m.amount <= 0)) {
    alert('Jumlah material harus lebih dari 0.')
    return
  }
  const over = materials.value.find((m) => m.amount > m.stock)
  if (over) {
    alert(`Jumlah untuk ${over.name} melebihi stok tersedia!`)
    return
  }

  submitLoading.value = true
  let createdMovementId = ''
  try {
    // 1) Buat Header Internal Movement
    const ts = Date.now().toString().slice(-6)
    movementName.value = `GM/MHN/${ts}`

    const headerPayload = {
      data: [
        {
          _entityName: 'MaterialMgmtInternalMovement',
          name: movementName.value,
          movementDate: selectedDate.value,
        },
      ],
    }

    const headerRes = await openbravoApi.post(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovement',
      headerPayload,
    )
    const headerRow = headerRes?.data?.response?.data?.[0]
    if (!headerRow?.id) throw new Error('Tidak menerima ID dokumen dari server.')

    createdMovementId = headerRow.id
    movementId.value = createdMovementId

    // 2) Buat Lines dinamis dari list materials
    const lines = materials.value.map((m) => ({
      _entityName: 'MaterialMgmtInternalMovementLine',
      movement: createdMovementId, // id header
      storageBin: selectedBinId.value, // BIN asal
      newStorageBin: selectedBinIdTo.value, // BIN tujuan
      product: m.productId, // id produk
      movementQuantity: m.amount, // qty dipindahkan
      uOM: m.uomId || undefined, // id UOM (opsional, tapi disarankan)
    }))

    const linePayload = { data: lines }

    const lineRes = await openbravoApi.post(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovementLine',
      linePayload,
    )
    const ok = lineRes?.data?.response?.status === 0
    if (!ok) throw new Error('Server mengembalikan status gagal saat membuat lines.')
    clearForm()
    alert('Dokumen (header + lines) berhasil dibuat.')
  } catch (err) {
    console.error('Gagal submit:', err)
    // (Opsional) rollback header jika lines gagal
    // if (createdMovementId) {
    //   try {
    //     await openbravoApi.delete(
    //       `/org.openbravo.service.json.jsonrest/MaterialMgmtInternalMovement/${createdMovementId}`
    //     )
    //   } catch (e) { console.error('Rollback header gagal:', e) }
    // }
    alert('Gagal membuat dokumen. Lihat console untuk detail.')
  } finally {
    submitLoading.value = false
  }
}

const clearForm = () => {
  selectedDate.value = formatDate(new Date())
  fromWarehouse.value = ''
  toWarehouse.value = ''
  selectedBinId.value = ''
  selectedBinIdTo.value = ''

  materials.value = []
  availableItems.value = []

  showModal.value = false
  searchQuery.value = ''

  movementId.value = ''
  movementName.value = ''
}

// Kembali
const goBack = () => window.history.back()
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
