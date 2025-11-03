<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

// Logout function
const logout = async () => {
  const is_validate = await authStore.logout()
  if (is_validate) {
    router.push('/')
    return
  }
  alert('Logout failed. Please try again.')
}

// Navigasi halaman
const bukaFormActivity = () => router.push('/formReportActivity')
const bukaLaporanActivity = () => router.push('/reportActivityList')

// Quick stats untuk staff
const quickStats = ref({
  taskToday: 5,
  taskCompleted: 12,
  pendingReports: 3,
})

// Recent activities dummy data
const recentActivities = ref([
  {
    id: 1,
    type: 'form',
    title: 'Pelaporan Aktivitas Harian',
    description: 'Monitoring perkembangan G0 - Batch A',
    time: '2 jam yang lalu',
    status: 'completed',
    icon: '✅',
  },
  {
    id: 2,
    type: 'report',
    title: 'Laporan Produksi Mingguan',
    description: 'Review hasil produksi minggu ke-2',
    time: '1 hari yang lalu',
    status: 'pending',
    icon: '⏳',
  },
  {
    id: 3,
    type: 'movement',
    title: 'Transfer Barang',
    description: 'Perpindahan material ke Gudang B',
    time: '2 hari yang lalu',
    status: 'completed',
    icon: '✅',
  },
])
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-[#ffffff] to-[#ffffff] rounded-lg flex items-center justify-center text-white text-lg">
                🌱
              </span>
              Dashboard Kentang GreenHouse
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Dashboard Staff</p>
          </div>
          <button
            @click="logout"
            class="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg border border-gray-300 transition font-medium text-sm shadow-sm hover:shadow"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M505 273c9.4-9.4 9.4-24.6 0-33.9L361 95c-6.9-6.9-17.2-8.9-26.2-5.2S320 102.3 320 112l0 80-112 0c-26.5 0-48 21.5-48 48l0 32c0 26.5 21.5 48 48 48l112 0 0 80c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2L505 273zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"/>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Welcome Section -->
      <div class="mb-8 bg-gradient-to-r from-[#0071f3] to-[#0060d1] rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div class="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
        <div class="relative">
          <h2 class="text-3xl font-bold mb-2">Selamat Datang, Staff! 👋</h2>
          <p class="text-blue-100 text-lg">Kelola aktivitas dan laporan Anda dengan mudah</p>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ringkasan Cepat</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div class="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-md">
                📋
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-500 mb-1">Tugas Hari Ini</p>
                <h3 class="text-3xl font-bold text-gray-900">{{ quickStats.taskToday }}</h3>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-green-200 hover:shadow-lg transition-all">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-md">
                ✅
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-500 mb-1">Selesai Bulan Ini</p>
                <h3 class="text-3xl font-bold text-gray-900">{{ quickStats.taskCompleted }}</h3>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-md">
                ⏳
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-500 mb-1">Laporan Pending</p>
                <h3 class="text-3xl font-bold text-gray-900">{{ quickStats.pendingReports }}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Aksi Cepat</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <!-- Form Aktivitas -->
          <button
            @click="bukaFormActivity"
            class="group bg-white border-2 border-gray-100 hover:border-[#0071f3] rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-[#0071f3] to-[#0060d1] rounded-xl flex items-center justify-center text-white text-2xl shadow-md group-hover:shadow-lg transition-all">
                📝
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#0071f3] transition-colors">
                  Isi Form Aktivitas
                </h3>
                <p class="text-sm text-gray-500 leading-relaxed">
                  Laporkan aktivitas harian dan perkembangan produksi
                </p>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Input Data</span>
              <span class="text-[#0071f3] font-bold group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          <!-- Lihat Laporan -->
          <button
            @click="bukaLaporanActivity"
            class="group bg-white border-2 border-gray-100 hover:border-[#0071f3] rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-md group-hover:shadow-lg transition-all">
                📊
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#0071f3] transition-colors">
                  Lihat Laporan
                </h3>
                <p class="text-sm text-gray-500 leading-relaxed">
                  Review dan pantau laporan aktivitas yang telah dibuat
                </p>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">View Report</span>
              <span class="text-[#0071f3] font-bold group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          <!-- Laporan Produksi -->
          <router-link
            to="/report-production"
            class="group bg-white border-2 border-gray-100 hover:border-[#0071f3] rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-md group-hover:shadow-lg transition-all">
                📈
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#0071f3] transition-colors">
                  Laporan Produksi
                </h3>
                <p class="text-sm text-gray-500 leading-relaxed">
                  Akses laporan produksi dan analisis performa
                </p>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Production</span>
              <span class="text-[#0071f3] font-bold group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </router-link>

          <!-- Location & Batch -->
          <router-link
            to="/location"
            class="group bg-white border-2 border-gray-100 hover:border-gray-700 rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center text-white text-2xl shadow-md group-hover:shadow-lg transition-all">
                📍
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
                  Add Location & Batch
                </h3>
                <p class="text-sm text-gray-500 leading-relaxed">
                  Tambahkan lokasi baru dan kelola batch produksi
                </p>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Manage</span>
              <span class="text-gray-700 font-bold group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </router-link>

          <!-- Good Movement -->
          <router-link
            to="/goodmovement"
            class="group bg-white border-2 border-gray-100 hover:border-blue-600 rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white text-2xl shadow-md group-hover:shadow-lg transition-all">
                🚚
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                  Good Movement
                </h3>
                <p class="text-sm text-gray-500 leading-relaxed">
                  Transfer dan kelola perpindahan barang antar gudang
                </p>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Transfer</span>
              <span class="text-blue-700 font-bold group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </router-link>

          <!-- Help & Support (Bonus) -->
          <div class="group bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 text-left hover:shadow-xl transition-all">
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-md">
                💡
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 mb-2">
                  Bantuan & Panduan
                </h3>
                <p class="text-sm text-gray-600 leading-relaxed">
                  Butuh bantuan? Akses panduan lengkap penggunaan sistem
                </p>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-amber-200 flex items-center justify-between">
              <span class="text-xs font-semibold text-amber-600 uppercase tracking-wide">Support</span>
              <span class="text-amber-600 font-bold">📖</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activities -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Aktivitas Terbaru</h2>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all">
          <div class="divide-y divide-gray-100">
            <div 
              v-for="activity in recentActivities" 
              :key="activity.id"
              class="p-5 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-start gap-4">
                <div 
                  class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  :class="activity.status === 'completed' ? 'bg-green-100' : 'bg-orange-100'"
                >
                  {{ activity.icon }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-4 mb-1">
                    <h4 class="font-bold text-gray-900 text-sm">{{ activity.title }}</h4>
                    <span 
                      class="text-xs font-semibold px-3 py-1 rounded-full shrink-0"
                      :class="activity.status === 'completed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'"
                    >
                      {{ activity.status === 'completed' ? 'Selesai' : 'Pending' }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mb-2">{{ activity.description }}</p>
                  <p class="text-xs text-gray-400 flex items-center gap-1">
                    <span>🕐</span>
                    <span>{{ activity.time }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tips Section -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100 mb-8">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-md shrink-0">
            💡
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-gray-900 text-lg mb-2">Tips Hari Ini</h3>
            <p class="text-gray-700 leading-relaxed">
              Pastikan untuk mengisi form aktivitas setiap hari sebelum pukul 16.00 WIB untuk memastikan data tercatat dengan akurat. Gunakan fitur "Lihat Laporan" untuk mereview aktivitas minggu ini.
            </p>
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

<style scoped>
/* Smooth scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #0071f3, #8FABD4);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, #0060d1, #7a9bc4);
}

/* Smooth transitions */
* {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus visible for accessibility */
button:focus-visible,
a:focus-visible {
  outline: 2px solid #0071f3;
  outline-offset: 2px;
}
</style>