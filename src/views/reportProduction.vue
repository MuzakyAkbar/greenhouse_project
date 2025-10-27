<template>
  <div class="min-h-screen bg-[#FFFD8F] flex flex-col items-center px-4 py-6">
    <!-- Header -->
    <div class="flex justify-start w-full mb-2">
      <router-link
        to="/dashboard"
        class="text-black text-xl hover:text-gray-700 transition"
        title="Back"
      >
        <i class="fa-solid fa-arrow-left"></i>
      </router-link>
    </div>

    <div class="w-full max-w-3xl mb-6 text-center">
      <h1 class="text-3xl sm:text-4xl font-bold text-black">Laporan Produksi & Penjualan</h1>
    </div>

    <!-- Tanggal & Batch -->
    <div class="w-full max-w-3xl flex flex-col sm:flex-row gap-4 mb-6">
      <input
        type="date"
        v-model="report.date"
        class="w-full sm:w-1/2 px-4 py-2 border border-black rounded-lg bg-white text-gray-700 focus:outline-none"
      />
      <select
        v-model="report.batch"
        class="w-full sm:w-1/2 px-4 py-2 border border-black rounded-lg bg-white text-gray-700 focus:outline-none"
      >
        <option disabled value="">-Batch-</option>
        <option v-for="batch in batchList" :key="batch" :value="batch">{{ batch }}</option>
      </select>
    </div>

    <!-- PRODUKSI CARD -->
    <div class="w-full max-w-3xl mb-6 bg-[#4D734D] p-6 rounded-2xl shadow-md space-y-6">
      <h2 class="text-xl text-white font-semibold">Produksi</h2>

      <div
        v-for="(item, index) in productionList"
        :key="index"
        class="relative flex flex-col sm:flex-row gap-3 items-center"
      >
        <button
          @click.prevent="removeProduction(index)"
          v-if="productionList.length > 1"
          class="absolute top-3 right-3 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-600 transition"
          title="Hapus Produksi"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>

        <select
          v-model="item.category"
          class="flex-1 px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none"
        >
          <option disabled value="">Kategori</option>
          <option v-for="cat in productionCategories" :key="cat" :value="cat">{{ cat }}</option>
        </select>

        <select
          v-model="item.owner"
          class="flex-1 px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none"
        >
          <option disabled value="">Kepemilikan</option>
          <option>Petani</option>
          <option>Mitra</option>
        </select>

        <input
          type="number"
          v-model.number="item.quantity"
          min="0"
          placeholder="Jumlah"
          class="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
        />
      </div>

      <button
        @click.prevent="addProduction"
        class="w-full bg-[#B5D78D] hover:bg-[#A1C77D] text-black font-medium px-6 py-2 rounded-lg border border-[#4D734D] shadow-md"
      >
        + Tambah Produksi
      </button>
    </div>

    <!-- PENJUALAN CARD -->
    <div class="w-full max-w-3xl mb-6 bg-[#4D734D] p-6 rounded-2xl shadow-md space-y-6">
      <h2 class="text-xl text-white font-semibold">Penjualan</h2>

      <div
        v-for="(sale, index) in salesList"
        :key="index"
        class="relative flex flex-col sm:flex-row gap-3 items-center"
      >
        <button
          @click.prevent="removeSale(index)"
          v-if="salesList.length > 1"
          class="absolute top-3 right-3 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-600 transition"
          title="Hapus Penjualan"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>

        <select
          v-model="sale.category"
          class="flex-1 px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none"
        >
          <option disabled value="">Kategori</option>
          <option v-for="cat in productionCategories" :key="cat" :value="cat">{{ cat }}</option>
        </select>

        <input
          type="number"
          v-model.number="sale.quantity"
          min="0"
          placeholder="Jumlah"
          class="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
        />

        <select
          v-model="sale.unit"
          class="flex-1 px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none"
        >
          <option disabled value="">Satuan</option>
          <option>Per Kg</option>
          <option>Per Bibit</option>
        </select>

        <input
          type="number"
          v-model.number="sale.price"
          min="0"
          placeholder="Harga Satuan"
          class="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
        />
      </div>

      <button
        @click.prevent="addSale"
        class="w-full bg-[#B5D78D] hover:bg-[#A1C77D] text-black font-medium px-6 py-2 rounded-lg border border-[#4D734D] shadow-md"
      >
        + Tambah Penjualan
      </button>
    </div>

    <!-- Submit -->
    <div class="w-full max-w-3xl flex justify-center mt-4">
      <button
        @click.prevent="submitReport"
        class="w-full sm:w-1/2 bg-[#4D734D] hover:bg-[#3C5C3B] text-white font-semibold py-3 rounded-lg border border-[#3A5737] transition-all shadow-sm"
      >
        Simpan Laporan
      </button>
    </div>

     <!-- 🔹 Footer -->
    <footer class="bg-[#FFFD8F] text-center py-6 mt-12">
      <p class="text-[#2F5320] font-semibold text-lg">
        © GREENHOUSE 2025
      </p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from "vue";

const report = ref({ date: "", batch: "" });
const batchList = ["Batch 1", "Batch 2", "Batch 3"];
const productionCategories = ["Planlet", "G0", "G1", "G2"];

const productionList = ref([{ category: "Planlet G0", owner: "", quantity: 0 }]);
const salesList = ref([{ category: "Planlet G0", quantity: 0, unit: "", price: 0 }]);

function addProduction() {
  const nextCategory = getNextCategory(productionList.value);
  productionList.value.push({ category: nextCategory, owner: "", quantity: 0 });
}
function removeProduction(index) {
  productionList.value.splice(index, 1);
}

function addSale() {
  const nextCategory = getNextCategory(salesList.value);
  salesList.value.push({ category: nextCategory, quantity: 0, unit: "", price: 0 });
}
function removeSale(index) {
  salesList.value.splice(index, 1);
}

function submitReport() {
  console.log("Laporan Dummy:", {
    report: report.value,
    production: productionList.value,
    sales: salesList.value,
  });
  alert("Laporan dummy berhasil disimpan!");
  resetForm();
}

function resetForm() {
  report.value = { date: "", batch: "" };
  productionList.value = [{ category: "Planlet", owner: "", quantity: 0 }];
  salesList.value = [{ category: "Planlet", quantity: 0, unit: "", price: 0 }];
}

function getNextCategory(list) {
  for (const cat of productionCategories) {
    if (!list.some((item) => item.category === cat)) return cat;
  }
  return "Planlet"; // reset jika semua sudah ada
}
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
</style>
