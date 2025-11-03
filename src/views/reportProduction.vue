<script setup>
import { ref } from "vue";

const report = ref({ date: "", batch: "" });
const batchList = ["Batch 1", "Batch 2", "Batch 3"];
const productionCategories = ["Planlet", "G0", "G1", "G2"];

const productionList = ref([{ category: "Planlet", owner: "", quantity: 0 }]);
const salesList = ref([{ category: "Planlet", quantity: 0, unit: "", price: 0 }]);

function addProduction() {
  productionList.value.push({ category: "", owner: "", quantity: 0 });
}
function removeProduction(index) {
  if (productionList.value.length > 1) {
    productionList.value.splice(index, 1);
  }
}

function addSale() {
  salesList.value.push({ category: "", quantity: 0, unit: "", price: 0 });
}
function removeSale(index) {
  if (salesList.value.length > 1) {
    salesList.value.splice(index, 1);
  }
}

function submitReport() {
  console.log("Laporan:", {
    report: report.value,
    production: productionList.value,
    sales: salesList.value,
  });
  alert("Laporan berhasil disimpan!");
  resetForm();
}

function resetForm() {
  report.value = { date: "", batch: "" };
  productionList.value = [{ category: "", owner: "", quantity: 0 }];
  salesList.value = [{ category: "", quantity: 0, unit: "", price: 0 }];
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <router-link
            to="/dashboard"
            class="inline-flex items-center gap-2 text-gray-700 hover:text-[#0071f3] font-medium transition-colors group"
          >
            <div class="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </div>
            <span class="text-sm">Kembali ke Dashboard</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Title Section -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-2xl mb-4 shadow-lg">
          <span class="text-3xl">📊</span>
        </div>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">
          Laporan Produksi & Penjualan
        </h1>
        <p class="text-gray-500 text-sm font-medium">Input data produksi dan penjualan harian</p>
      </div>

      <!-- Date & Batch Section -->
      <div class="mb-8">
        <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <span class="text-lg">📅</span>
            </div>
            <h2 class="text-lg font-bold text-gray-900">Informasi Laporan</h2>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Date Picker -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Tanggal Laporan</label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                  </svg>
                </div>
                <input 
                  type="date" 
                  v-model="report.date" 
                  class="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            <!-- Batch -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Pilih Batch</label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                    <path d="M0 192l256 0 0 256-192 0c-35.3 0-64-28.7-64-64L0 192zm0-64C0 57.3 28.7 32 64 32l384 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64l-128 0 0-256L0 160l0-32z"/>
                  </svg>
                </div>
                <select
                  v-model="report.batch"
                  class="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Pilih Batch</option>
                  <option v-for="batch in batchList" :key="batch" :value="batch">{{ batch }}</option>
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor">
                    <path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PRODUKSI CARD -->
      <div class="mb-8">
        <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6">
          <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-xl flex items-center justify-center shadow-sm">
                <span class="text-xl">🏭</span>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">Data Produksi</h2>
                <p class="text-xs text-gray-500">Input hasil produksi harian</p>
              </div>
            </div>
            <div class="bg-blue-50 px-3 py-1 rounded-full">
              <span class="text-xs font-bold text-[#0071f3]">{{ productionList.length }} Item</span>
            </div>
          </div>

          <div class="space-y-4">
            <div
              v-for="(item, index) in productionList"
              :key="index"
              class="relative bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 border border-gray-200 hover:border-[#0071f3] transition-all"
            >
              <button
                @click.prevent="removeProduction(index)"
                v-if="productionList.length > 1"
                class="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-md hover:shadow-lg z-10 transform hover:scale-110"
                title="Hapus Produksi"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
                </svg>
              </button>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>📦</span> Kategori Produk
                  </label>
                  <select
                    v-model="item.category"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    <option v-for="cat in productionCategories" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>👤</span> Kepemilikan
                  </label>
                  <select
                    v-model="item.owner"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Pilih Kepemilikan</option>
                    <option>Petani</option>
                    <option>Mitra</option>
                  </select>
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>🔢</span> Jumlah Produksi
                  </label>
                  <input
                    type="number"
                    v-model.number="item.quantity"
                    min="0"
                    placeholder="Masukkan jumlah"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0071f3] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            @click.prevent="addProduction"
            class="w-full mt-5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-[#0071f3] hover:to-[#0060d1] text-gray-700 hover:text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-transparent shadow-sm hover:shadow-md"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
            </svg>
            Tambah Data Produksi
          </button>
        </div>
      </div>

      <!-- PENJUALAN CARD -->
      <div class="mb-8">
        <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6">
          <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                <span class="text-xl">💰</span>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">Data Penjualan</h2>
                <p class="text-xs text-gray-500">Input transaksi penjualan</p>
              </div>
            </div>
            <div class="bg-gray-100 px-3 py-1 rounded-full">
              <span class="text-xs font-bold text-gray-700">{{ salesList.length }} Item</span>
            </div>
          </div>

          <div class="space-y-4">
            <div
              v-for="(sale, index) in salesList"
              :key="index"
              class="relative bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 border border-gray-200 hover:border-gray-700 transition-all"
            >
              <button
                @click.prevent="removeSale(index)"
                v-if="salesList.length > 1"
                class="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-md hover:shadow-lg z-10 transform hover:scale-110"
                title="Hapus Penjualan"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
                </svg>
              </button>

              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>📦</span> Kategori
                  </label>
                  <select
                    v-model="sale.category"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    <option v-for="cat in productionCategories" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>🔢</span> Jumlah
                  </label>
                  <input
                    type="number"
                    v-model.number="sale.quantity"
                    min="0"
                    placeholder="0"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all"
                  />
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>⚖️</span> Satuan
                  </label>
                  <select
                    v-model="sale.unit"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Pilih Satuan</option>
                    <option>Per Kg</option>
                    <option>Per Bibit</option>
                  </select>
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <span>💵</span> Harga Satuan
                  </label>
                  <input
                    type="number"
                    v-model.number="sale.price"
                    min="0"
                    placeholder="Rp"
                    class="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            @click.prevent="addSale"
            class="w-full mt-5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-700 hover:to-gray-800 text-gray-700 hover:text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-transparent shadow-sm hover:shadow-md"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
            </svg>
            Tambah Data Penjualan
          </button>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="flex flex-col sm:flex-row gap-4">
        <button
          @click.prevent="resetForm"
          class="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-bold py-4 rounded-xl shadow-sm border-2 border-gray-200 hover:border-gray-300 transition-all text-base flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
            <path d="M125.7 160l50.3 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L48 224c-17.7 0-32-14.3-32-32L16 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 51.2L97.6 97.6c87.5-87.5 229.3-87.5 316.8 0s87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3s-163.8-62.5-226.3 0L125.7 160z"/>
          </svg>
          Reset Form
        </button>
        <button
          @click.prevent="submitReport"
          class="flex-1 sm:flex-[2] bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
            <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
          </svg>
          Simpan Laporan
        </button>
      </div>

      <!-- Footer -->
      <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}

/* Custom select arrow hide */
select {
  background-image: none;
}
</style>