<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <RouterLink
            to="/reportActivityList"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </RouterLink>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center text-white text-lg">
                ⏳
              </span>
              Review Activity Report
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Tinjau & Approve Laporan Aktivitas</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Info Section -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Informasi Laporan</h2>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <!-- Date -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                </svg>
                Tanggal
              </label>
              <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                17/10/2025
              </div>
            </div>

            <!-- Location -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="text-lg">📍</span>
                Lokasi
              </label>
              <select
                disabled
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none cursor-not-allowed appearance-none"
              >
                <option selected>Lokasi A</option>
              </select>
            </div>

            <!-- Batch -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span class="text-lg">🏷️</span>
                Batch
              </label>
              <select
                disabled
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none cursor-not-allowed appearance-none"
              >
                <option selected>Batch 1</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Activity Details -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Detail Aktivitas</h2>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="space-y-5">
            <!-- Activity -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Activity</label>
              <select
                disabled
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none cursor-not-allowed appearance-none"
              >
                <option selected>Pekerjaan A</option>
              </select>
            </div>

            <!-- CoA -->
            <div class="flex flex-col">
              <label class="text-sm font-semibold text-gray-700 mb-2">Chart of Account (CoA)</label>
              <input
                type="text"
                value="CoA 001"
                disabled
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none cursor-not-allowed"
              />
            </div>

            <!-- Material Section -->
            <div class="bg-gray-50 rounded-xl p-5">
              <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                <span class="text-lg">📦</span>
                Material
              </h4>
              <div class="flex flex-col sm:flex-row gap-4 bg-white rounded-lg p-4 border border-gray-200">
                <div class="flex-1 flex flex-col">
                  <label class="text-xs font-semibold text-gray-600 mb-2">Nama Material</label>
                  <select
                    disabled
                    class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium focus:outline-none cursor-not-allowed appearance-none"
                  >
                    <option selected>Pestisida selektif</option>
                  </select>
                </div>
                <div class="w-full sm:w-32 flex flex-col">
                  <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                  <input
                    type="number"
                    value="50"
                    disabled
                    class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium focus:outline-none cursor-not-allowed"
                  />
                </div>
                <div class="w-full sm:w-32 flex flex-col">
                  <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                  <input
                    type="text"
                    value="kg"
                    disabled
                    class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <!-- Worker Section -->
            <div class="bg-gray-50 rounded-xl p-5">
              <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                <span class="text-lg">👷</span>
                Tenaga Kerja
              </h4>
              <div class="flex gap-3 bg-white rounded-lg p-4 border border-gray-200">
                <div class="w-full sm:w-32 flex flex-col">
                  <label class="text-xs font-semibold text-gray-600 mb-2">Jumlah Pekerja</label>
                  <input
                    type="number"
                    value="5"
                    disabled
                    class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Review Action</h2>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="flex flex-col sm:flex-row gap-4">
            <router-link
              to="/reportActivityList"
              class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2 text-lg"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
              </svg>
              Approve
            </router-link>

            <router-link
              to="/reportActivityList"
              class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2 text-lg"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M142.9 142.9c-17.5 17.5-30.1 38-37.8 59.8c-5.9 16.7-24.2 25.4-40.8 19.5s-25.4-24.2-19.5-40.8C55.6 150.7 73.2 122 97.6 97.6c87.2-87.2 228.3-87.5 315.8-1L455 55c6.9-6.9 17.2-8.9 26.2-5.2s14.8 12.5 14.8 22.2l0 128c0 13.3-10.7 24-24 24l-8.4 0c0 0 0 0 0 0L344 224c-9.7 0-18.5-5.8-22.2-14.8s-1.7-19.3 5.2-26.2l41.1-41.1c-62.6-61.5-163.1-61.2-225.3 1zM16 312c0-13.3 10.7-24 24-24l7.6 0 .7 0L168 288c9.7 0 18.5 5.8 22.2 14.8s1.7 19.3-5.2 26.2l-41.1 41.1c62.6 61.5 163.1 61.2 225.3-1c17.5-17.5 30.1-38 37.8-59.8c5.9-16.7 24.2-25.4 40.8-19.5s25.4 24.2 19.5 40.8c-10.8 30.6-28.4 59.3-52.9 83.8c-87.2 87.2-228.3 87.5-315.8 1L57 457c-6.9 6.9-17.2 8.9-26.2 5.2S16 449.7 16 440l0-119.6 0-.7 0-7.6z"/>
              </svg>
              Request Revision
            </router-link>
          </div>
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
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

.ml-13 {
  margin-left: 3.25rem;
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}
</style>