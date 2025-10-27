<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const handleLogin = async () => {
  const success = await authStore.login(email.value, password.value)
  if (success) {
    router.push('/dashboard')
  } else {
    alert(authStore.error || 'Gagal login. Periksa kembali email dan password.')
  }
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center bg-[#FFFD8F] px-4 sm:px-6 md:px-10 py-10"
  >
    <!-- Judul -->
    <h1
      class="text-[48px] sm:text-[60px] md:text-[72px] font-extrabold text-[#2F5320] mb-10 text-center"
    >
      GreenHouse
    </h1>

    <!-- Card -->
    <div
      class="w-full max-w-5xl bg-[#4C763B] rounded-2xl shadow-xl p-8 sm:p-10 text-white"
    >
      <!-- Form -->
      <form
        @submit.prevent="handleLogin"
        class="grid grid-cols-1 gap-6 md:gap-8"
      >
        <!-- Email -->
        <div>
          <label
            for="email"
            class="block text-sm sm:text-base font-medium mb-2"
          >
            Email / Username
          </label>
          <input
            id="email"
            v-model="email"
            type="text"
            placeholder="Masukkan email atau username"
            class="w-full px-4 py-3 rounded-lg bg-white text-gray-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#CFE9A8] transition"
          />
        </div>

        <!-- Password -->
        <div>
          <label
            for="password"
            class="block text-sm sm:text-base font-medium mb-2"
          >
            Password
          </label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Masukkan password"
              class="w-full px-4 py-3 rounded-lg bg-white text-gray-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#CFE9A8] transition"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-2 text-sm font-medium text-[#4C763B] hover:text-[#2F5320]"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="authStore.error" class="text-red-200 text-sm -mt-2">
          {{ authStore.error }}
        </div>

        <!-- Tombol -->
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="authStore.loading"
            class="bg-[#B0CE88] hover:bg-[#B5D78D] text-black font-semibold px-8 py-3 rounded-lg border-2 border-[#4C763B] transition-all shadow-sm hover:shadow-md disabled:opacity-50"
          >
            {{ authStore.loading ? 'Memproses...' : 'Login' }}
          </button>
        </div>
      </form>
    </div>

     <!-- 🔹 Footer -->
    <footer class="bg-[#FFFD8F] text-center py-6 mt-12">
      <p class="text-[#2F5320] font-semibold text-lg">
        © GREENHOUSE 2025
      </p>
    </footer>
  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  h1 {
    font-size: 2rem;
  }
  input {
    font-size: 0.9rem;
  }
}
</style>
