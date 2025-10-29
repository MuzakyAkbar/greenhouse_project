<template>
  <div class="min-h-screen bg-[#FFFD8F] p-6 sm:p-10 text-[#2F5320] relative">
    <!-- 🔙 Tombol Kembali ke Home -->
    <router-link
      to="/dashboard"
      class="absolute top-4 left-4 bg-white text-[#2F5320] font-bold px-4 sm:px-6 py-2 rounded-lg border border-[#4C763B] shadow-sm hover:bg-[#CFE9A8] transition"
      title="Kembali ke Home"
    >
      ← Home
    </router-link>

    <!-- 🏡 Judul & Tombol Add Location -->
    <div class="flex flex-col sm:flex-row justify-between items-center mb-10 mt-10 gap-4">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-center sm:text-left w-full sm:w-auto">
        📍 Daftar Lokasi
      </h1>

      <router-link
        to="/add-location"
        class="bg-[#4C763B] text-white font-bold px-5 py-2 rounded-lg hover:bg-[#3b5c2f] transition shadow-sm w-full sm:w-auto text-center"
      >
        ➕ Tambah Lokasi
      </router-link>
    </div>

    <!-- 📍 Daftar Lokasi -->
    <div class="space-y-8 max-w-6xl mx-auto w-full">
      <!-- 🔹 Kebun 1 -->
      <div class="bg-[#4C763B] rounded-2xl p-6 shadow-lg">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-2 w-full sm:w-auto">
            <label class="text-white font-semibold text-lg mb-1 sm:mb-0">Lokasi:</label>
            <input
              type="text"
              value="Kebun 1"
              readonly
              class="bg-white rounded-md px-4 py-2 border border-gray-300 outline-none font-semibold w-full sm:w-52"
            />
          </div>

          <!-- Tombol Tambah Batch -->
          <router-link
            to="/add-batch"
            class="bg-white text-[#2F5320] font-bold px-5 py-2 rounded-lg hover:bg-[#CFE9A8] transition shadow-sm border border-[#4C763B] w-full sm:w-auto text-center"
          >
            ➕ Tambah Batch
          </router-link>
        </div>

        <!-- 📦 Batch List -->
        <div class="space-y-4">
          <div
            v-for="(batch, index) in batchesKebun1"
            :key="index"
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
          >
            <input
              type="text"
              :value="batch"
              readonly
              class="bg-white rounded-md px-3 py-2 border border-gray-300 outline-none font-semibold flex-1 w-full"
            />
            <button
              class="bg-white font-semibold text-[#2F5320] px-4 py-2 rounded-lg hover:bg-[#CFE9A8] transition shadow-sm border border-[#4C763B] w-full sm:w-auto"
            >
              QR
            </button>
          </div>
        </div>
      </div>

      <!-- 🔹 Kebun 2 -->
      <div class="bg-[#4C763B] rounded-2xl p-6 shadow-lg">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-2 w-full sm:w-auto">
            <label class="text-white font-semibold text-lg mb-1 sm:mb-0">Lokasi:</label>
            <input
              type="text"
              value="Kebun 2"
              readonly
              class="bg-white rounded-md px-4 py-2 border border-gray-300 outline-none font-semibold w-full sm:w-52"
            />
          </div>

          <!-- Tombol Tambah Batch -->
          <router-link
            to="/add-batch"
            class="bg-white text-[#2F5320] font-bold px-5 py-2 rounded-lg hover:bg-[#CFE9A8] transition shadow-sm border border-[#4C763B] w-full sm:w-auto text-center"
          >
            ➕ Tambah Batch
          </router-link>
        </div>

        <!-- 📦 Batch List -->
        <div class="space-y-4">
          <div
            v-for="(batch, index) in batchesKebun2"
            :key="index"
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
          >
            <input
              type="text"
              :value="batch"
              readonly
              class="bg-white rounded-md px-3 py-2 border border-gray-300 outline-none font-semibold flex-1 w-full"
            />
            <button
              class="bg-white font-semibold text-[#2F5320] px-4 py-2 rounded-lg hover:bg-[#CFE9A8] transition shadow-sm border border-[#4C763B] w-full sm:w-auto"
            >
              QR
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="text-center mt-12">
      <p class="text-[#2F5320] font-semibold text-lg">© GREENHOUSE 2025</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const batchesKebun1 = ref(['Batch Planlet Kentang A', 'Batch Planlet Stek Kentang'])
const batchesKebun2 = ref(['Batch Planlet Kentang B', 'Batch Planlet Stek Kentang'])
</script>
