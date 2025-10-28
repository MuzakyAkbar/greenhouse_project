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

  if (newBatch.value.tanggalMulai > newBatch.value.tanggalSelesai) {
    message.value = '⚠️ Tanggal mulai tidak boleh lebih besar dari tanggal selesai.'
    return
  }

  message.value = '✅ Batch berhasil ditambahkan!'
  setTimeout(() => {
    router.push('/location')
  }, 1500)
}
</script>

<template>
  <div class="min-h-screen bg-[#FFFD8F] px-6 py-10 text-[#2F5320] flex flex-col justify-between relative">
    <!-- 🔙 Tombol Kembali -->
    <router-link
      to="/location"
      class="absolute top-6 left-6 bg-white text-[#2F5320] border-2 border-[#4C763B] px-4 py-2 rounded-lg font-bold hover:bg-[#CFE9A8] shadow-sm transition"
    >
      ← Kembali
    </router-link>

    <!-- Judul -->
    <h1 class="text-[40px] font-extrabold text-center mb-10 mt-6">
      ➕ Tambah Batch Baru
    </h1>

    <!-- Form Lebar -->
    <div
      class="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-10 border border-[#CFE9A8]"
    >
      <form @submit.prevent="saveBatch" class="space-y-8">
        <!-- Nama Batch -->
        <div>
          <label class="block font-semibold mb-3 text-lg">Nama Batch</label>
          <input
            v-model="newBatch.nama"
            type="text"
            placeholder="Contoh: Batch Kentang 2025-01"
            class="w-full border border-[#4C763B] rounded-lg p-3 text-lg focus:ring-2 focus:ring-[#4C763B] outline-none"
          />
        </div>

        <!-- Flex container untuk tanggal -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Tanggal Mulai -->
          <div>
            <label class="block font-semibold mb-3 text-lg">Tanggal Mulai</label>
            <input
              v-model="newBatch.tanggalMulai"
              type="date"
              class="w-full border border-[#4C763B] rounded-lg p-3 text-lg focus:ring-2 focus:ring-[#4C763B] outline-none"
            />
          </div>

          <!-- Tanggal Selesai -->
          <div>
            <label class="block font-semibold mb-3 text-lg">Tanggal Selesai</label>
            <input
              v-model="newBatch.tanggalSelesai"
              type="date"
              class="w-full border border-[#4C763B] rounded-lg p-3 text-lg focus:ring-2 focus:ring-[#4C763B] outline-none"
            />
          </div>
        </div>

        <!-- Tombol Simpan -->
        <div class="text-center mt-10">
          <button
            type="submit"
            class="bg-[#4C763B] text-white px-10 py-4 rounded-lg font-bold text-xl hover:bg-[#3b5c2f] transition"
          >
            💾 Simpan Batch
          </button>
        </div>

        <!-- Pesan -->
        <p
          v-if="message"
          class="text-center mt-6 text-lg font-semibold"
          :class="message.includes('⚠️') ? 'text-red-600' : 'text-green-600'"
        >
          {{ message }}
        </p>
      </form>
    </div>

    <!-- Footer -->
    <footer class="bg-[#FFFD8F] text-center py-6 mt-16">
      <p class="text-[#2F5320] font-semibold text-lg">
        © GREENHOUSE 2025
      </p>
    </footer>
  </div>
</template>
