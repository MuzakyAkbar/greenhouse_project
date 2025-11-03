<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <router-link
              to="/dashboard"
              class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-5 h-5 fill-current">
                <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z"/>
              </svg>
            </router-link>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                  📍
                </span>
                Manajemen Lokasi & Batch
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Kelola lokasi kebun dan batch produksi</p>
            </div>
          </div>
          <router-link
            to="/add-location"
            class="flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white px-5 py-2.5 rounded-lg transition font-medium text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
            </svg>
            Tambah Lokasi
          </router-link>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Stats Overview -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ringkasan</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total Lokasi</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">2</h2>
            <p class="text-xs text-gray-500">🏡 Kebun aktif</p>
          </div>
          <div class="bg-white rounded-2xl p-6 text-left border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
            <p class="text-sm font-semibold text-gray-500 mb-2">Total Batch</p>
            <h2 class="text-4xl font-bold text-gray-900 mb-1">4</h2>
            <p class="text-xs text-gray-500">📦 Batch terdaftar</p>
          </div>
          <div class="bg-gradient-to-br from-[#0071f3] to-[#005dd1] text-white rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div class="relative">
              <p class="text-sm font-semibold opacity-90 mb-2">Rata-rata Batch/Lokasi</p>
              <h2 class="text-4xl font-bold mb-1">2.0</h2>
              <p class="text-xs opacity-75">📊 Efisiensi distribusi</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Location List -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Daftar Lokasi</h2>
      </div>

      <div class="space-y-6">
        <!-- Kebun 1 -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
          <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                  🏡
                </div>
                <div>
                  <h2 class="text-2xl font-bold text-white mb-1">Kebun 1</h2>
                  <p class="text-sm text-blue-100">{{ batchesKebun1.length }} Batch Aktif</p>
                </div>
              </div>
              <router-link
                to="/add-batch"
                class="bg-white hover:bg-gray-50 text-[#0071f3] font-medium px-5 py-2.5 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto text-center flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>
                Tambah Batch
              </router-link>
            </div>
          </div>
          
          <div class="p-6">
            <div class="space-y-3">
              <div
                v-for="(batch, index) in batchesKebun1"
                :key="index"
                class="group bg-gray-50 hover:bg-blue-50 rounded-xl p-4 transition-all border-2 border-transparent hover:border-[#0071f3]"
              >
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div class="flex items-center gap-3 flex-1">
                    <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {{ index + 1 }}
                    </div>
                    <div class="flex-1">
                      <p class="font-semibold text-gray-900 group-hover:text-[#0071f3] transition">{{ batch }}</p>
                      <p class="text-xs text-gray-500 mt-0.5">Status: Aktif</p>
                    </div>
                  </div>
                  <button
                    class="bg-white hover:bg-gray-700 text-gray-700 hover:text-white border-2 border-gray-200 hover:border-gray-700 font-medium px-6 py-2 rounded-lg transition-all shadow-sm hover:shadow text-sm w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clip-rule="evenodd"/>
                      <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8a1 1 0 110-2h1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM13 12a1 1 0 100 2h3a1 1 0 100-2h-3zM13 15a1 1 0 100 2h3a1 1 0 100-2h-3zM13 9a1 1 0 011-1h3a1 1 0 110 2h-3a1 1 0 01-1-1z"/>
                    </svg>
                    Generate QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Kebun 2 -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
          <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                  🏡
                </div>
                <div>
                  <h2 class="text-2xl font-bold text-white mb-1">Kebun 2</h2>
                  <p class="text-sm text-blue-100">{{ batchesKebun2.length }} Batch Aktif</p>
                </div>
              </div>
              <router-link
                to="/add-batch"
                class="bg-white hover:bg-gray-50 text-[#0071f3] font-medium px-5 py-2.5 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto text-center flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>
                Tambah Batch
              </router-link>
            </div>
          </div>
          
          <div class="p-6">
            <div class="space-y-3">
              <div
                v-for="(batch, index) in batchesKebun2"
                :key="index"
                class="group bg-gray-50 hover:bg-blue-50 rounded-xl p-4 transition-all border-2 border-transparent hover:border-[#0071f3]"
              >
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div class="flex items-center gap-3 flex-1">
                    <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {{ index + 1 }}
                    </div>
                    <div class="flex-1">
                      <p class="font-semibold text-gray-900 group-hover:text-[#0071f3] transition">{{ batch }}</p>
                      <p class="text-xs text-gray-500 mt-0.5">Status: Aktif</p>
                    </div>
                  </div>
                  <button
                    class="bg-white hover:bg-gray-700 text-gray-700 hover:text-white border-2 border-gray-200 hover:border-gray-700 font-medium px-6 py-2 rounded-lg transition-all shadow-sm hover:shadow text-sm w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clip-rule="evenodd"/>
                      <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8a1 1 0 110-2h1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM13 12a1 1 0 100 2h3a1 1 0 100-2h-3zM13 15a1 1 0 100 2h3a1 1 0 100-2h-3zM13 9a1 1 0 011-1h3a1 1 0 110 2h-3a1 1 0 01-1-1z"/>
                    </svg>
                    Generate QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="text-center py-10 mt-16 border-t border-gray-200">
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
import { ref } from 'vue'

const batchesKebun1 = ref(['Batch Planlet Kentang A', 'Batch Planlet Stek Kentang'])
const batchesKebun2 = ref(['Batch Planlet Kentang B', 'Batch Planlet Stek Kentang'])
</script>