<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <router-link
              to="/location"
              class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-5 h-5 fill-current">
                <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z"/>
              </svg>
            </router-link>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                  ➕
                </span>
                Tambah Lokasi Baru
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Daftarkan lokasi kebun baru</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      <!-- Info Box -->
      <div class="bg-blue-50 border-2 border-blue-100 rounded-2xl p-5 flex items-start gap-4 mb-8">
        <div class="flex-shrink-0 w-6 h-6 text-[#0071f3] mt-0.5">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-sm text-gray-700 font-semibold mb-1">Informasi Penting</p>
          <p class="text-sm text-gray-600">Pastikan nama lokasi yang diinput sesuai dengan lokasi fisik kebun untuk memudahkan tracking produksi.</p>
        </div>
      </div>

      <!-- Form Card -->
      <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-lg overflow-hidden">
        <!-- Card Header -->
        <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
          <div class="relative flex items-center gap-3">
            <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
              🏡
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">Formulir Lokasi</h2>
              <p class="text-sm text-blue-100 mt-0.5">Lengkapi data lokasi di bawah ini</p>
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <form @submit.prevent="saveLocation" class="p-8 space-y-6">
          <!-- Nama Lokasi -->
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>Nama Lokasi</span>
              <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                </svg>
              </div>
              <input
                v-model="newLocation.nama"
                type="text"
                placeholder="Contoh: Kebun 3, Greenhouse A, Lahan Utara"
                class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3] focus:ring-opacity-20 transition hover:border-gray-300"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">Gunakan nama yang mudah diidentifikasi dan diingat</p>
          </div>

          <!-- Additional Info (Optional) -->
          <div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border-2 border-gray-100">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-5 h-5 text-gray-400 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-700 mb-1">Tips Penamaan Lokasi</p>
                <ul class="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Gunakan nama yang deskriptif dan jelas</li>
                  <li>Hindari karakter khusus yang rumit</li>
                  <li>Pertimbangkan untuk menambahkan nomor atau kode area</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Message Display -->
          <div
            v-if="message"
            class="rounded-xl p-4 flex items-center gap-3 transition-all duration-300"
            :class="message.includes('⚠️') ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'"
          >
            <div class="flex-shrink-0" :class="message.includes('⚠️') ? 'text-red-500' : 'text-green-500'">
              <svg v-if="message.includes('⚠️')" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <p class="text-sm font-medium" :class="message.includes('⚠️') ? 'text-red-700' : 'text-green-700'">
              {{ message }}
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4">
            <router-link
              to="/location"
              class="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow text-center flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
              </svg>
              Kembali
            </router-link>
            <button
              type="submit"
              class="flex-1 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-medium px-6 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              Simpan Lokasi
            </button>
          </div>
        </form>
      </div>

      <!-- Preview Card (Optional) -->
      <div v-if="newLocation.nama" class="mt-8">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</h3>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-xl flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
              🏡
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium mb-1">Nama Lokasi:</p>
              <h2 class="text-xl font-bold text-gray-900">{{ newLocation.nama }}</h2>
              <p class="text-xs text-gray-500 mt-1">0 Batch Aktif</p>
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
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Data lokasi baru
const newLocation = ref({
  nama: ''
})

// Pesan notifikasi
const message = ref('')

// Fungsi simpan lokasi
function saveLocation() {
  if (!newLocation.value.nama) {
    message.value = '⚠️ Mohon isi nama lokasi terlebih dahulu.'
    return
  }

  message.value = '✅ Lokasi berhasil ditambahkan!'
  setTimeout(() => {
    router.push('/location')
  }, 1500)
}
</script>