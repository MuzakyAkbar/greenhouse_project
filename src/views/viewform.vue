<template>
  <div
    class="min-h-screen bg-[#FFFCA9] flex flex-col items-center justify-start py-8 px-4 rounded-2xl"
  >
    <!-- Header -->
    <div class="flex w-full">
      <RouterLink to="/report" class="text-black text-xl hover:text-gray-700 transition" title="Back">
        <i class="fa-solid fa-arrow-left"></i>
      </RouterLink>
    </div>
    <div class="flex w-full  justify-center items-center mb-6">
      <h1 class="text-4xl font-bold text-black">Form</h1>
      <div class="w-6"></div>
    </div>

    <!-- Date -->
    <div class="w-full max-w-3xl mb-4">
      <div class="flex items-center gap-2 bg-white border border-black rounded-lg px-3 py-2 w-fit">
        <i class="fa-solid fa-calendar text-lg"></i>
        <span class="font-medium">17/10/2025</span>
      </div>
    </div>

    <!-- Lokasi & Batch -->
    <div class="w-full max-w-3xl flex flex-col sm:flex-row gap-4 mb-4">
      <select
        class="w-full sm:w-1/2 border border-black rounded-lg bg-white text-gray-700 px-4 py-2 focus:outline-none"
      >
        <option selected>Lokasi</option>
      </select>
      <select
        class="w-full sm:w-1/2 border border-black rounded-lg bg-white text-gray-700 px-4 py-2 focus:outline-none"
      >
        <option selected>Batch</option>
      </select>
    </div>

    <!-- Form Container (Green Box) -->
    <div class="w-full max-w-3xl bg-[#4D734D] rounded-2xl p-6 space-y-4">
      <!-- Activity -->
      <select class="w-full rounded-lg bg-white text-gray-700 px-4 py-2 focus:outline-none">
        <option selected>Activity</option>
      </select>

      <!-- CoA -->
      <input
        type="text"
        placeholder="CoA"
        class="w-full rounded-lg bg-white text-gray-700 px-4 py-2 focus:outline-none"
      />

      <!-- Material + Qty -->
      <div class="flex flex-col sm:flex-row gap-4">
        <select class="flex-1 rounded-lg bg-white text-gray-700 px-4 py-2 focus:outline-none">
          <option selected>Material</option>
        </select>
        <input
          type="number"
          placeholder="Qty"
          class="w-full sm:w-1/4 rounded-lg bg-white text-gray-700 px-4 py-2 focus:outline-none"
        />
      </div>

      <!-- Tenaga Kerja + Qty -->
      <div class="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Tenaga Kerja"
          class="flex-1 rounded-lg bg-white text-gray-700 px-4 py-2 focus:outline-none"
        />
        <input
          type="number"
          placeholder="Qty"
          class="w-full sm:w-1/4 rounded-lg bg-white text-gray-700 px-4 py-2 focus:outline-none"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

/* Pastikan font dan spasi halus seperti di gambar */
select,
input {
  font-size: 1rem;
  border: none;
}

h1 {
  font-family: system-ui, sans-serif;
}

div {
  box-sizing: border-box;
}
</style>
