<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 🔹 Data form batch baru
const newBatch = ref({
  nama: '',
  tanggalMulai: '',
  tanggalSelesai: ''
})

// 🔹 Notifikasi sementara
const message = ref('')

// 🔹 Fungsi Simpan Batch
function saveBatch() {
  if (!newBatch.value.nama || !newBatch.value.tanggalMulai || !newBatch.value.tanggalSelesai) {
    message.value = '⚠️ Mohon isi semua data terlebih dahulu.'
    return
  }

  // Validasi tanggal
  if (newBatch.value.tanggalMulai > newBatch.value.tanggalSelesai) {
    message.value = '⚠️ Tanggal mulai tidak boleh lebih besar dari tanggal selesai.'
    return
  }

  // TODO: Simpan data ke backend (misal POST ke API)
  // await axios.post('/api/batch', newBatch.value)

  message.value = '✅ Batch berhasil ditambahkan!'
  setTimeout(() => {
    router.push('/')
  }, 1500)
}
</script>

<template>
  <div class="min-h-screen bg-[#FFFD8F] px-6 py-10 text-[#2F5320]">
    <router-link
      to="/dashboard"
      class="absolute top-4 left-4 text-black text-xl hover:text-gray-700 transition"
      title="Back"
    >
      <i class="fa-solid fa-arrow-left"></i>
    </router-link>
    <h1 class="text-[40px] font-extrabold text-center mb-10">
      ➕ Tambah Batch Baru
    </h1>

    <div class="max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-8 border border-[#CFE9A8]">
      <form @submit.prevent="saveBatch" class="space-y-6">
        <!-- Nama Batch -->
        <div>
          <label class="block font-semibold mb-2">Nama Batch</label>
          <input
            v-model="newBatch.nama"
            type="text"
            placeholder="Contoh: Batch Kentang 2025-01"
            class="w-full border border-[#4C763B] rounded-lg p-2 focus:ring-2 focus:ring-[#4C763B] outline-none"
          />
        </div>

        <!-- Tanggal Mulai -->
        <div>
          <label class="block font-semibold mb-2">Tanggal Mulai</label>
          <input
            v-model="newBatch.tanggalMulai"
            type="date"
            class="w-full border border-[#4C763B] rounded-lg p-2 focus:ring-2 focus:ring-[#4C763B] outline-none"
          />
        </div>

        <!-- Tanggal Selesai -->
        <div>
          <label class="block font-semibold mb-2">Tanggal Selesai</label>
          <input
            v-model="newBatch.tanggalSelesai"
            type="date"
            class="w-full border border-[#4C763B] rounded-lg p-2 focus:ring-2 focus:ring-[#4C763B] outline-none"
          />
        </div>

        <!-- Tombol Simpan -->
        <div class="text-center mt-6">
          <button
            type="submit"
            class="bg-[#4C763B] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#3b5c2f] transition"
          >
            💾 Simpan Batch
          </button>
        </div>

        <!-- Pesan -->
        <p
          v-if="message"
          class="text-center mt-4 text-lg font-semibold"
          :class="message.includes('⚠️') ? 'text-red-600' : 'text-green-600'"
        >
          {{ message }}
        </p>
      </form>
    </div>

  </div>
</template>
