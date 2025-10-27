<template>
  <div class="min-h-screen bg-[#FFFD8F] flex flex-col items-center p-4 sm:p-6 md:p-10 rounded-2xl relative">
    <div class="absolute top-6 left-6">
      <RouterLink
        to="/reportActivityList"
        class="text-black text-2xl hover:text-gray-700 transition"
        title="Kembali ke Dashboard"
      >
        <i class="fa-solid fa-arrow-left"></i>
      </RouterLink>
    </div>

    <!-- Judul -->
    <div class="flex w-full justify-center items-center mb-6 mt-6">
      <h1 class="text-3xl sm:text-4xl font-bold text-black">Form</h1>
    </div>

    <!-- Date Picker -->
    <div class="w-full max-w-3xl mb-6">
      <div class="flex items-center gap-3 bg-white border border-black rounded-lg px-3 py-2 w-fit mx-auto">
        <i class="fa-solid fa-calendar text-lg"></i>
        <span class="font-medium">17/10/2025</span>
      </div>
    </div>

    <!-- Lokasi & Batch -->
    <div class="w-full max-w-3xl flex flex-col sm:flex-row gap-4 mb-6">
      <select
        class="w-full sm:w-1/2 px-4 py-2 border border-black rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CFE9A8] transition"
      >
        <option selected>Lokasi</option>
      </select>

      <select
        class="w-full sm:w-1/2 px-4 py-2 border border-black rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CFE9A8] transition"
      >
        <option selected>Batch</option>
      </select>
    </div>

    <!-- Green Form Card -->
    <div class="w-full max-w-3xl bg-[#4D734D] p-6 rounded-2xl shadow-md space-y-4">
      <!-- Activity -->
      <select
        class="w-full px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CFE9A8] transition"
      >
        <option selected>Activity</option>
      </select>

      <!-- CoA -->
      <input
        type="text"
        placeholder="CoA"
        class="w-full px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none"
      />

      <!-- Material & Qty -->
      <div class="flex flex-col sm:flex-row gap-4">
        <select
          class="flex-1 px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CFE9A8]"
        >
          <option selected>Material</option>
        </select>
        <input
          type="number"
          placeholder="Qty"
          class="w-full sm:w-1/4 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
        />
      </div>

      <!-- Tenaga Kerja & Qty -->
      <div class="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Tenaga Kerja"
          class="flex-1 px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none"
        />
        <input
          type="number"
          placeholder="Qty"
          class="w-full sm:w-1/4 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
        />
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="w-full max-w-3xl flex flex-col sm:flex-row gap-4 justify-between mt-8">
      <router-link
        to="/reportActivityList"
        class="w-full sm:w-1/2 bg-[#69A851] hover:bg-[#5B9546] text-white font-semibold py-3 rounded-lg border border-[#4D734D] transition-all shadow-sm text-center"
      >
        Approve
      </router-link>

      <router-link
        to="/reportActivityList"
        class="w-full sm:w-1/2 bg-[#E8473C] hover:bg-[#D43D34] text-white font-semibold py-3 rounded-lg border border-[#A62820] transition-all shadow-sm text-center"
      >
        Revision
      </router-link>
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
import { RouterLink } from 'vue-router'
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
</style>
