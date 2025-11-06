<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-300 transition shadow-sm hover:shadow"
            aria-label="Kembali"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-5 h-5 fill-current">
                <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z"/>
              </svg>
          </button>
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                🚚
              </span>
              Good Movement
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Request & Transfer Barang Antar Gudang</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Card Form -->
      <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all p-6 sm:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-xl flex items-center justify-center text-white text-xl shadow-md">
            📦
          </div>
          <div>
            <h2 class="font-bold text-xl text-gray-900">Request Barang</h2>
            <p class="text-sm text-gray-500">Isi form untuk transfer barang</p>
          </div>
        </div>

        <!-- Info sukses -->
        <div
          v-if="movementId"
          class="mb-6 rounded-xl border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm"
        >
          <div class="flex items-start gap-3">
            <span class="text-2xl">✅</span>
            <div class="flex-1">
              <p class="font-semibold text-green-800 mb-1">Dokumen berhasil dibuat!</p>
              <div class="text-sm text-green-700 space-y-1">
                <div><span class="font-medium">Movement ID:</span> {{ movementId }}</div>
                <div><span class="font-medium">Name:</span> {{ movementName }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Tanggal -->
          <div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border-2 border-gray-100 hover:border-gray-200 transition-all">
            <label class="block font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
              <span class="text-lg">📅</span>
              Tanggal Transfer
            </label>
            <input
              type="date"
              v-model="selectedDate"
              class="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#0071f3] focus:border-[#0071f3] focus:outline-none transition text-gray-900 font-medium hover:border-gray-300"
            />
          </div>

          <!-- Pilih Gudang -->
          <div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border-2 border-gray-100 hover:border-gray-200 transition-all">
            <label class="block font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
              <span class="text-lg">🏢</span>
              Transfer Gudang
            </label>

            <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <!-- Gudang Asal -->
              <select
                v-model="fromWarehouse"
                class="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#0071f3] focus:border-[#0071f3] focus:outline-none transition text-gray-900 font-medium bg-white hover:border-gray-300"
              >
                <option disabled value="">Lokasi Gudang Asal</option>
                <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse">
                  {{ warehouse.name }}
                </option>
              </select>

              <!-- Arrow -->
              <div class="hidden sm:flex items-center justify-center">
                <div class="w-10 h-10 bg-gradient-to-r from-[#0071f3] to-[#8FABD4] rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  →
                </div>
              </div>
              <div class="sm:hidden flex items-center justify-center py-2">
                <div class="w-8 h-8 bg-gradient-to-r from-[#0071f3] to-[#8FABD4] rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm">
                  ↓
                </div>
              </div>

              <!-- Gudang Tujuan -->
              <select
                v-model="toWarehouse"
                class="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#0071f3] focus:border-[#0071f3] focus:outline-none transition text-gray-900 font-medium bg-white hover:border-gray-300"
              >
                <option disabled value="">Lokasi Gudang Tujuan</option>
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
              class="text-sm text-red-600 mt-3 flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
            >
              <span>⚠️</span>
              <span>Gudang asal dan tujuan tidak boleh sama</span>
            </p>
          </div>
        </div>

        <!-- Add Material Section -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg shadow-md">
                📋
              </div>
              <div>
                <label class="font-bold text-gray-900 text-base">Daftar Material</label>
                <p class="text-xs text-gray-600">Tambah barang dari bin gudang asal</p>
              </div>
            </div>
            <button
              :disabled="!selectedBinId || modalLoading"
              @click="openMaterialModal"
              class="rounded-xl px-5 py-3 transition font-semibold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              :class="[
                !selectedBinId || modalLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white',
              ]"
              title="Ambil dari bin asal"
              aria-label="Tambah material dari bin asal"
            >
              <span class="flex items-center gap-2">
                <span v-if="modalLoading">⏳</span>
                <span v-else>+</span>
                <span>{{ modalLoading ? 'Loading...' : 'Tambah Material' }}</span>
              </span>
            </button>
          </div>

          <!-- List Material -->
          <div class="space-y-3">
            <div v-if="materials.length === 0" class="text-center py-16">
              <div class="text-6xl mb-4 animate-float">📦</div>
              <p class="text-gray-500 font-medium text-lg">Belum ada material yang dipilih</p>
              <p class="text-sm text-gray-400 mt-2">Klik tombol "Tambah Material" untuk memulai</p>
            </div>

            <div v-for="(item, index) in materials" :key="index">
              <div
                class="rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all"
                :class="
                  item.amount > item.stock
                    ? 'border-2 border-red-300 bg-red-50'
                    : 'border-2 border-gray-200 bg-white hover:border-blue-200'
                "
              >
                <div class="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    class="w-12 h-12 flex items-center justify-center rounded-xl text-white font-bold text-lg shrink-0 shadow-md"
                    :style="{ backgroundColor: item.color }"
                  >
                    {{ item.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-gray-900 text-base truncate">
                      {{ item.name }}
                    </p>
                    <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span class="inline-flex items-center gap-1">
                        <span>📏</span>
                        <span>UOM: {{ item.uom || '-' }}</span>
                      </span>
                      <span class="inline-flex items-center gap-1">
                        <span>📦</span>
                        <span>Stok: {{ formatNumber(item.stock) }}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Quantity Input Section -->
                <div class="flex items-center gap-3">
                  <div class="flex-1 lg:flex-none">
                    <label class="block text-xs font-medium text-gray-600 mb-1.5">Jumlah Transfer</label>
                    <div class="flex items-center gap-3">
                      <input
                        v-model.number="item.amount"
                        type="number"
                        min="0"
                        :max="item.stock ?? undefined"
                        inputmode="decimal"
                        placeholder="0"
                        class="w-32 border-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition bg-white"
                        :class="
                          item.amount > item.stock
                            ? 'border-red-400 text-red-600 bg-red-50 focus:ring-2 focus:ring-red-400'
                            : 'border-gray-300 focus:border-[#0071f3] text-gray-900 focus:ring-2 focus:ring-[#0071f3]'
                        "
                      />
                      <span
                        class="text-sm font-medium whitespace-nowrap"
                        :class="item.amount > item.stock ? 'text-red-600' : 'text-gray-600'"
                      >
                        / {{ formatNumber(item.stock) }}
                      </span>
                    </div>
                  </div>

                  <!-- Delete Button -->
                  <button
                    @click="removeMaterial(index)"
                    class="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg transition border-2 border-red-200 hover:border-red-300 shadow-sm shrink-0"
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

        <!-- Submit Button -->
        <div class="mt-8 pt-6 border-t-2 border-gray-100">
          <button
            @click="submitAll"
            :disabled="submitLoading || materials.length === 0"
            class="w-full bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:cursor-not-allowed text-base flex items-center justify-center gap-3"
          >
            <span v-if="submitLoading" class="text-xl">⏳</span>
            <span v-else class="text-xl">✅</span>
            <span>{{ submitLoading ? 'Mengirim Data...' : 'Submit Transfer' }}</span>
          </button>
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

    <!-- Modal Pilih Barang -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @keydown.esc.prevent="showModal = false"
    >
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        @click="showModal = false" 
        aria-hidden="true"
      ></div>

      <!-- Card -->
      <div
        class="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl z-10 transform transition-all duration-200 ease-out scale-100 border-2 border-gray-100 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Pilih Barang"
      >
        <!-- Header Modal -->
        <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] rounded-t-2xl p-6 shrink-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center text-white text-xl shadow-md">
                📦
              </div>
              <div>
                <h3 class="font-bold text-xl text-white">Pilih Material</h3>
                <p class="text-sm text-blue-100 mt-0.5">Dari gudang asal</p>
              </div>
            </div>
            <button 
            @click="showModal = false" 
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition text-white hover:rotate-90 transform duration-300"
            title="Tutup"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
          </div>
        </div>

        <!-- Body Modal -->
        <div class="p-6 flex-1 overflow-hidden flex flex-col">
          <!-- Search bar -->
          <div class="relative mb-5 shrink-0">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Cari material..."
              class="w-full border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-[#0071f3] transition font-medium text-gray-900"
            />
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
          </div>

          <!-- Body scroll -->
          <div class="flex-1 overflow-y-auto pr-2">
            <div v-if="modalLoading" class="text-center py-16">
              <div class="text-5xl mb-4 animate-float">⏳</div>
              <p class="text-gray-500 font-medium">Memuat data dari bin...</p>
            </div>

            <div
              v-else-if="availableItems.length === 0"
              class="text-center py-16"
            >
              <div class="text-5xl mb-4">📭</div>
              <p class="text-gray-500 font-medium">Tidak ada item pada bin ini</p>
              <p class="text-sm text-gray-400 mt-1">Pilih gudang lain atau hubungi admin</p>
            </div>

            <div
              v-else-if="filteredItems.length === 0"
              class="text-center py-16"
            >
              <div class="text-5xl mb-4">🔍</div>
              <p class="text-gray-500 font-medium">Tidak ditemukan</p>
              <p class="text-sm text-gray-400 mt-1">Coba kata kunci lain</p>
            </div>

            <!-- List Barang -->
            <div v-else class="space-y-2">
              <div
                v-for="(item, index) in filteredItems"
                :key="index"
                @click="selectItem(item)"
                class="group flex items-center justify-between border-2 border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#0071f3] hover:bg-blue-50 transition-all shadow-sm hover:shadow-md"
              >
                <div class="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    class="w-12 h-12 flex items-center justify-center rounded-xl text-white font-bold text-lg shrink-0 shadow-md group-hover:shadow-lg transition"
                    :style="{ backgroundColor: item.color }"
                  >
                    {{ item.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-gray-900 truncate group-hover:text-[#0071f3] transition">
                      {{ item.name }}
                    </p>
                    <p class="text-sm text-gray-600 mt-1 flex items-center gap-2">
                      <span class="inline-flex items-center gap-1">
                        <span>📦</span>
                        <span>Stok: {{ formatNumber(item.stock) }} {{ item.uom || '' }}</span>
                      </span>
                    </p>
                  </div>
                </div>
                <div class="shrink-0 ml-4">
                  <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] text-white px-4 py-2 rounded-lg font-semibold text-sm group-hover:from-[#0060d1] group-hover:to-[#0050b1] transition shadow-md">
                    Pilih →
                  </div>
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