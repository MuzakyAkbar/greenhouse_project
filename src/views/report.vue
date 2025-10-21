<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-[#FFFCA9] mx-auto flex flex-col items-center">
    <!-- Header -->
    <div class="w-full flex justify-end">
      <router-link
        to="/login"
        title="Logout"
        class="text-black text-[26px] pr-5 pt-5 hover:text-gray-700"
      >
        <i class="fa-solid fa-right-from-bracket"></i>
      </router-link>
    </div>
    <h1 class="text-[40px] font-bold text-black text-center">Report</h1>

    <!-- Date -->
    <div class="w-[1250px] flex justify-start mb-[25px]">
      <div
        class="flex items-center gap-[10px] bg-white border-2 border-black rounded-[10px] px-[14px] py-[6px]"
      >
        <input type="date" />
      </div>
    </div>

    <!-- Waiting Card -->
    <RouterLink class="w-full px-20" to="review">
      <div
        class="w-full h-[100px] bg-white border-3 border-black rounded-[15px] px-[20px] py-[14px] mb-[20px] flex justify-between items-center"
      >
        <div class="text-left text-black text-[16px] leading-tight">
          <p>tgl report</p>
          <p>lokasi</p>
          <p>Coa-aktivitas</p>
        </div>
        <span class="text-black text-[16px] font-medium">Waiting for review</span>
      </div>
    </RouterLink>

    <!-- Approved Card -->
    <RouterLink class="w-full px-20" to="viewform">
      <div
        class="w-full h-[100px] bg-[#69A851] border-3 border-[#4C763B] text-white rounded-[15px] px-[20px] py-[14px] mb-[20px] flex justify-between items-center"
      >
        <div class="text-left text-[16px] leading-tight">
          <p>tgl report</p>
          <p>lokasi</p>
          <p>Coa-aktivitas</p>
        </div>
        <span class="text-[16px] font-medium">Approved</span>
      </div>
    </RouterLink>

    <!-- Revision Card -->
    <RouterLink class="w-full px-20" to="/form">
      <div
        class="w-full h-[100px] bg-[#E8473C] border-3 border-[#9B0F0F] text-white rounded-[15px] px-[20px] py-[14px] mb-[40px] flex justify-between items-center"
      >
        <div class="text-left text-[16px] leading-tight">
          <p>tgl report</p>
          <p>lokasi</p>
          <p>Coa-aktivitas</p>
        </div>
        <span class="text-[16px] font-medium">Revision</span>
      </div>
    </RouterLink>

    <!-- Button Form -->
    <div class="w-[1250px] flex justify-end">
      <router-link
        to="/form"
        class="bg-[#B0CE88] hover:bg-[#A1C77D] text-black font-semibold text-[16px] px-[24px] py-[8px] rounded-[15px] border-2 border-[#4C763B] transition-all"
      >
        + Form
      </router-link>
    </div>
  </div>
</template>

<style scoped>
/* Ikon Font Awesome */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

/* Responsivitas tambahan */
@media (max-width: 640px) {
  .text-left p {
    font-size: 0.9rem;
  }
}
</style>
