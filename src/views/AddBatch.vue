<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from "@/lib/supabase.js"

const router = useRouter()

// Data form batch baru
const newBatch = ref({
  nama: '',
  tanggalMulai: '',
  tanggalSelesai: ''
})

// Notifikasi sementara
const message = ref('')

// Fungsi Simpan Batch
const saveBatch = async () => {
  // Validasi form
  if (!newBatch.value.nama || !newBatch.value.tanggalMulai || !newBatch.value.tanggalSelesai) {
    message.value = '⚠️ Mohon isi semua data terlebih dahulu.'
    return
  }

  if (newBatch.value.tanggalMulai > newBatch.value.tanggalSelesai) {
    message.value = '⚠️ Tanggal mulai tidak boleh lebih besar dari tanggal selesai.'
    return
  }

  try {
    // Format tanggal agar cocok dengan format kolom DATE di database
    const formatDate = (date) => new Date(date).toISOString().slice(0, 10)

    // Insert ke tabel "gh_batch"
    const { data, error } = await supabase
      .from('gh_batch')
      .insert([
        {
          batch_name: newBatch.value.nama,
          tanggal_mulai: formatDate(newBatch.value.tanggalMulai),
          tanggal_selesai: formatDate(newBatch.value.tanggalSelesai),
        }
      ])
      .select()

    if (error) {
      console.error('❌ Error menyimpan batch:', error)
      message.value = '⚠️ Gagal menyimpan batch: ' + error.message
      return
    }

    console.log('✅ Batch berhasil disimpan:', data)
    message.value = '✅ Batch berhasil ditambahkan!'

    // Reset form
    newBatch.value = { nama: '', tanggalMulai: '', tanggalSelesai: '' }

    // Arahkan ke halaman daftar batch setelah 1.5 detik
    setTimeout(() => {
      router.push('/location')
    }, 1500)

  } catch (err) {
    console.error('⚠️ Unexpected error:', err)
    message.value = '⚠️ Terjadi kesalahan tak terduga.'
  }
}
</script>

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
                  📦
                </span>
                Tambah Batch Baru
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Daftarkan batch produksi baru</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      <!-- Info Box -->
      <div class="bg-blue-50 border-2 border-blue-100 rounded-2xl p-5 flex items-start gap-4 mb-8">
        <div class="flex-shrink-0 w-6 h-6 text-[#0071f3] mt-0.5">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-sm text-gray-700 font-semibold mb-1">Informasi Penting</p>
          <p class="text-sm text-gray-600">Pastikan nama batch menggunakan konvensi yang konsisten dan tanggal yang akurat untuk tracking produksi yang efektif.</p>
        </div>
      </div>

      <!-- Form Card -->
      <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-lg overflow-hidden">
        <!-- Card Header -->
        <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
          <div class="relative flex items-center gap-3">
            <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
              📋
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">Formulir Batch</h2>
              <p class="text-sm text-blue-100 mt-0.5">Lengkapi informasi batch produksi</p>
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <form @submit.prevent="saveBatch" class="p-8 space-y-6">
          <!-- Nama Batch -->
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>Nama Batch</span>
              <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                </svg>
              </div>
              <input
                v-model="newBatch.nama"
                type="text"
                placeholder="Contoh: Batch Planlet Kentang A, Batch Kentang 2025-01"
                class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3] focus:ring-opacity-20 transition hover:border-gray-300"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">Gunakan nama yang deskriptif dan mudah dikenali</p>
          </div>

          <!-- Grid untuk Tanggal -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Tanggal Mulai -->
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>Tanggal Mulai</span>
                <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <input
                  v-model="newBatch.tanggalMulai"
                  type="date"
                  class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3] focus:ring-opacity-20 transition hover:border-gray-300"
                />
              </div>
              <p class="text-xs text-gray-500 mt-1">Tanggal dimulainya batch produksi</p>
            </div>

            <!-- Tanggal Selesai -->
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>Tanggal Selesai</span>
                <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <input
                  v-model="newBatch.tanggalSelesai"
                  type="date"
                  class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3] focus:ring-opacity-20 transition hover:border-gray-300"
                />
              </div>
              <p class="text-xs text-gray-500 mt-1">Target tanggal selesai produksi</p>
            </div>
          </div>

          <!-- Duration Info -->
          <div v-if="newBatch.tanggalMulai && newBatch.tanggalSelesai" class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border-2 border-gray-100">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-700">Durasi Batch</p>
                <p class="text-xs text-gray-600 mt-0.5">
                  {{ Math.ceil((new Date(newBatch.tanggalSelesai) - new Date(newBatch.tanggalMulai)) / (1000 * 60 * 60 * 24)) }} hari
                  ({{ new Date(newBatch.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }} - 
                  {{ new Date(newBatch.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }})
                </p>
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
              Simpan Batch
            </button>
          </div>
        </form>
      </div>

      <!-- Preview Card -->
      <div v-if="newBatch.nama" class="mt-8">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview Batch</h3>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-xl flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
              🥔
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 font-medium mb-1">Nama Batch:</p>
              <h2 class="text-xl font-bold text-gray-900 mb-2">{{ newBatch.nama }}</h2>
              <div class="flex flex-wrap gap-4 text-xs text-gray-600">
                <div v-if="newBatch.tanggalMulai" class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                  </svg>
                  <span>Mulai: {{ new Date(newBatch.tanggalMulai).toLocaleDateString('id-ID') }}</span>
                </div>
                <div v-if="newBatch.tanggalSelesai" class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                  </svg>
                  <span>Selesai: {{ new Date(newBatch.tanggalSelesai).toLocaleDateString('id-ID') }}</span>
                </div>
              </div>
            </div>
            <div class="text-center">
              <div class="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-gray-200">
                <span class="text-2xl font-bold text-gray-400">0%</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">Progress</p>
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