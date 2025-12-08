<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logoPG from '../assets/logoPG.svg' // IMPORT LOGO BARU

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const handleLogin = async () => {
  const success = await authStore.login(email.value, password.value)
  if (success) {
    // Redirect berdasarkan role
    const userRole = authStore.user?.role?.toLowerCase()

    if (userRole === 'staff') {
      router.push('/dashboard-staff')
    } else if (userRole === 'manager' || userRole === 'admin') {
      router.push('/dashboard')
    } else {
      router.push('/dashboard')
    }
  } else {
    alert(authStore.error || 'Gagal login. Periksa kembali email dan password.')
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-white px-4 py-10">
    
    <!-- 
      PERUBAHAN UTAMA: 
      - md:max-w-6xl (Sebelumnya 4xl) -> Membuat kartu sangat lebar di desktop 
      - max-w-lg (Sebelumnya md) -> Membuat kartu sedikit lebih lebar di tablet/mobile besar
    -->
    <div class="w-full max-w-lg md:max-w-6xl flex flex-col md:flex-row rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-gray-100 bg-white/70 backdrop-blur-sm transition-all duration-300">
      
      <!-- KOLOM KIRI (Logo & Fitur) -->
      <!-- Padding diperbesar jadi p-12 sm:p-16 -->
      <div class="
        w-full md:w-1/2 p-10 sm:p-16 flex flex-col justify-center items-center 
        bg-white md:bg-gradient-to-br md:from-green-50 md:to-green-100/50
        border-b-2 md:border-b-0 md:border-r-2 border-gray-100
        hidden md:flex
      ">
        
        <div class="mb-8 md:mb-12 text-center">
          <!-- Logo diperbesar drastis: sm:w-52 sm:h-52 -->
          <div class="inline-flex items-center justify-center w-32 h-32 sm:w-52 sm:h-52 bg-white rounded-[2rem] shadow-xl transform hover:scale-105 transition-transform p-6">
            <img :src="logoPG" alt="Potato Grow Logo" class="w-full h-full object-contain" />
          </div>
        </div>
        
        <!-- Grid Icon Fitur Diperbesar -->
        <div class="grid grid-cols-3 gap-4 w-full max-w-md mt-4">
          <div class="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div class="text-4xl mb-2">🌱</div>
            <p class="text-base font-bold text-gray-600">Monitoring</p>
          </div>
          <div class="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div class="text-4xl mb-2">📊</div>
            <p class="text-base font-bold text-gray-600">Analisis</p>
          </div>
          <div class="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div class="text-4xl mb-2">📈</div>
            <p class="text-base font-bold text-gray-600">Laporan</p>
          </div>
        </div>
      </div>

      <!-- KOLOM KANAN (Form Login) -->
      <!-- Padding diperbesar jadi p-12 sm:p-16 -->
      <div class="w-full md:w-1/2 p-8 sm:p-16 bg-white/80 flex flex-col justify-center">
        
        <!-- Logo Mobile -->
        <div class="text-center mb-8 md:hidden">
            <div class="inline-flex items-center justify-center w-32 h-32 bg-white rounded-[2rem] shadow-xl p-5">
                <img :src="logoPG" alt="Potato Grow Logo" class="w-full h-full object-contain" />
            </div>
        </div>

        <div class="text-center mb-10">
          <!-- Font Judul Diperbesar: text-4xl -->
          <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Selamat Datang</h2>
          <p class="text-gray-500 text-lg">Masuk untuk melanjutkan ke dashboard</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <!-- Label lebih besar: text-base -->
            <label for="email" class="block text-base font-bold text-gray-700 mb-2 ml-1">
              Email / Username
            </label>
            <div class="relative">
              <div class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/>
                </svg>
              </div>
              <!-- Input lebih tinggi (py-4) dan font lebih besar (text-lg) -->
              <input
                id="email"
                v-model="email"
                type="text"
                placeholder="Masukkan email atau username"
                required
                class="w-full pl-14 pr-5 py-4 text-lg rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-[#0071f3] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-base font-bold text-gray-700 mb-2 ml-1">
              Password
            </label>
            <div class="relative">
              <div class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M144 144l0 48 160 0 0-48c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192l0-48C80 64.5 144.5 0 224 0s144 64.5 144 144l0 48 16 0c35.3 0 64 28.7 64 64l0 192c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 256c0-35.3 28.7-64 64-64l16 0z"/>
                </svg>
              </div>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Masukkan password"
                required
                class="w-full pl-14 pr-12 py-4 text-lg rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-[#0071f3] focus:bg-white transition-all"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0071f3] transition-colors"
                title="Toggle password visibility"
              >
                <svg v-if="!showPassword" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor"><path d="M288 80c-65.2 0-118.8 29.6-159.9 67.7C89.6 183.5 63 226 49.4 256c13.6 30 40.2 72.5 78.6 108.3C169.2 402.4 222.8 432 288 432s118.8-29.6 159.9-67.7C486.4 328.5 513 286 526.6 256c-13.6-30-40.2-72.5-78.6-108.3C406.8 109.6 353.2 80 288 80zM95.4 112.6C142.5 68.8 207.2 32 288 32s145.5 36.8 192.6 80.6c46.8 43.5 78.1 95.4 93 131.1c3.3 7.9 3.3 16.7 0 24.6c-14.9 35.7-46.2 87.7-93 131.1C433.5 443.2 368.8 480 288 480s-145.5-36.8-192.6-80.6C48.6 356 17.3 304 2.5 268.3c-3.3-7.9-3.3-16.7 0-24.6C17.3 208 48.6 156 95.4 112.6zM288 336c44.2 0 80-35.8 80-80s-35.8-80-80-80c-.7 0-1.3 0-2 0c1.3 5.1 2 10.5 2 16c0 35.3-28.7 64-64 64c-5.5 0-10.9-.7-16-2c0 .7 0 1.3 0 2c0 44.2 35.8 80 80 80zm0-208a128 128 0 1 1 0 256 128 128 0 1 1 0-256z"/></svg>
                <svg v-else class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zm151 118.3C226 97.7 269.5 80 320 80c65.2 0 118.8 29.6 159.9 67.7C518.4 183.5 545 226 558.6 256c-12.6 28-36.6 66.8-70.9 100.9l-53.8-42.2c9.1-17.6 14.2-37.5 14.2-58.7c0-70.7-57.3-128-128-128c-32.2 0-61.7 11.9-84.2 31.5l-46.1-36.1zM394.9 284.2l-81.5-63.9c4.2-8.5 6.6-18.2 6.6-28.3c0-5.5-.7-10.9-2-16c.7 0 1.3 0 2 0c44.2 0 80 35.8 80 80c0 9.9-1.8 19.4-5.1 28.2zm51.3 163.3l-41.9-33C378.8 425.4 350.7 432 320 432c-65.2 0-118.8-29.6-159.9-67.7C121.6 328.5 95 286 81.4 256c8.3-18.4 21.5-41.5 39.4-64.8L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5zm-88-69.3L302 334c-23.5-5.4-43.1-21.2-53.7-42.3l-56.1-44.2c-.2 2.8-.3 5.6-.3 8.5c0 70.7 57.3 128 128 128c13.3 0 26.1-2 38.2-5.8z"/>
                </svg>
              </button>
            </div>
          </div>

          <div
            v-if="authStore.error"
            class="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl animate-shake"
          >
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24l0 112c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-112c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
              </svg>
              <div>
                <p class="text-base font-semibold text-red-700 mb-1">Login Gagal</p>
                <p class="text-sm text-red-600">{{ authStore.error }}</p>
              </div>
            </div>
          </div>

          <!-- Tombol diperbesar: py-5 dan text-lg -->
          <button
            type="submit"
            :disabled="authStore.loading"
            class="w-full bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-bold py-5 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-[1.01] active:scale-[0.98]"
          >
            <svg
              v-if="authStore.loading"
              class="animate-spin h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-lg tracking-wide">{{ authStore.loading ? 'Memproses...' : 'Masuk ke Dashboard' }}</span>
          </button>
        </form>
      </div>
    </div>

    <div class="mt-8 grid grid-cols-3 gap-3 w-full max-w-lg md:hidden px-4">
      <div class="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
        <div class="text-3xl mb-1">🌱</div>
        <p class="text-xs font-bold text-gray-600">Monitoring</p>
      </div>
      <div class="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
        <div class="text-3xl mb-1">📊</div>
        <p class="text-xs font-bold text-gray-600">Analisis</p>
      </div>
      <div class="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
        <div class="text-3xl mb-1">📈</div>
        <p class="text-xs font-bold text-gray-600">Laporan</p>
      </div>
    </div>

     <footer class="text-center py-8 mt-4">
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="text-2xl">🌱</span>
        <p class="text-gray-400 font-bold text-base">POTATO GROW</p>
      </div>
      <p class="text-gray-400 text-sm">© 2025 All Rights Reserved</p>
    </footer>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

/* Penyesuaian Mobile */
@media (max-width: 767px) {
  /* Pastikan logo kiri sembunyi */
  .md\:flex {
    display: none !important;
  }
  .md\:hidden {
    display: block !important;
  }
  
  .border-b-2 {
      border-bottom-width: 0px !important; 
  }
}
</style>