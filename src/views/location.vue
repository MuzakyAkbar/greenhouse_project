<template>
  <div class="min-h-screen bg-[#FFFD8F] p-8 text-[#2F5320] relative">
    <!-- 🔙 Tombol Kembali -->
    <router-link
      to="/dashboard"
      class="absolute top-4 left-4 text-black text-xl hover:text-gray-700 transition"
      title="Kembali"
    >
      <i class="fa-solid fa-arrow-left"></i>
    </router-link>

    <!-- 🏡 Judul Halaman -->
    <h1 class="text-4xl font-extrabold text-center mb-10">Lokasi</h1>

    <!-- 📍 Daftar Lokasi -->
    <div class="space-y-8">
      <!-- 🔹 Kebun 1 -->
      <div class="bg-[#4C763B] rounded-2xl p-6 shadow-lg">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center space-x-2">
            <label class="text-white font-semibold text-lg">Lokasi:</label>
            <input
              type="text"
              value="Kebun 1"
              readonly
              class="bg-white rounded-md px-3 py-2 border border-gray-300 outline-none w-40 font-semibold"
            />
          </div>

          <!-- Tombol Tambah Batch -->
          <router-link
            to="/add-batch"
            class="bg-white text-[#2F5320] font-bold px-5 py-2 rounded-lg hover:bg-[#CFE9A8] transition shadow-sm border border-[#4C763B]"
          >
            ➕ Tambah Batch
          </router-link>
        </div>

        <!-- 📦 Batch List -->
        <div class="space-y-4">
          <div
            v-for="(batch, index) in batchesKebun1"
            :key="index"
            class="flex justify-between items-center"
          >
            <input
              type="text"
              :value="batch"
              readonly
              class="bg-white rounded-md px-3 py-2 border border-gray-300 outline-none w-full mr-3 font-semibold"
            />
            <button
              class="bg-white font-semibold text-[#2F5320] px-4 py-2 rounded-lg hover:bg-[#CFE9A8] transition shadow-sm border border-[#4C763B]"
            >
              QR
            </button>
          </div>
        </div>
      </div>

      <!-- 🔹 Kebun 2 -->
      <div class="bg-[#4C763B] rounded-2xl p-6 shadow-lg">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center space-x-2">
            <label class="text-white font-semibold text-lg">Lokasi:</label>
            <input
              type="text"
              value="Kebun 2"
              readonly
              class="bg-white rounded-md px-3 py-2 border border-gray-300 outline-none w-40 font-semibold"
            />
          </div>

          <!-- Tombol Tambah Batch -->
          <router-link
            to="/add-batch"
            class="bg-white text-[#2F5320] font-bold px-5 py-2 rounded-lg hover:bg-[#CFE9A8] transition shadow-sm border border-[#4C763B]"
          >
            ➕ Tambah Batch
          </router-link>
        </div>

        <!-- 📦 Batch List -->
        <div class="space-y-4">
          <div
            v-for="(batch, index) in batchesKebun2"
            :key="index"
            class="flex justify-between items-center"
          >
            <input
              type="text"
              :value="batch"
              readonly
              class="bg-white rounded-md px-3 py-2 border border-gray-300 outline-none w-full mr-3 font-semibold"
            />
            <button
              class="bg-white font-semibold text-[#2F5320] px-4 py-2 rounded-lg hover:bg-[#CFE9A8] transition shadow-sm border border-[#4C763B]"
            >
              QR
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="text-center mt-10">
      <p class="text-[#2F5320] font-semibold text-lg">
        © GREENHOUSE 2025
      </p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const batchesKebun1 = ref(['Batch Planlet Kentang A', 'Batch Planlet Stek Kentang'])
const batchesKebun2 = ref(['Batch Planlet Kentang A', 'Batch Planlet Stek Kentang'])
</script>
