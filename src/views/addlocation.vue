<template>
  <div class="min-h-screen bg-[#FFFD8F] px-6 py-10 text-[#2F5320] flex flex-col justify-between relative">
    <!-- 🔙 Tombol Kembali -->
    <router-link
      to="/location"
      class="absolute top-6 left-6 text-black text-2xl hover:text-gray-700 transition"
      title="Kembali"
    >
      <i class="fa-solid fa-arrow-left"></i>
    </router-link>

    <!-- 🏷️ Judul Halaman -->
    <h1 class="text-[40px] font-extrabold text-center mb-10">
      ➕ Tambah Lokasi Baru
    </h1>

    <!-- 📋 Form Tambah Lokasi -->
    <div
      class="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-10 border border-[#CFE9A8]"
    >
      <form @submit.prevent="saveLocation" class="space-y-6">
        <!-- Nama Lokasi -->
        <div>
          <label class="block font-semibold mb-2 text-lg">Nama Lokasi</label>
          <input
            v-model="newLocation.nama"
            type="text"
            placeholder="Contoh: Kebun 3"
            class="w-full border border-[#4C763B] rounded-lg p-3 focus:ring-2 focus:ring-[#4C763B] outline-none font-semibold"
          />
        </div>

        <!-- Tombol Simpan -->
        <div class="text-center mt-8 flex justify-center gap-6">
          <router-link
            to="/location"
            class="bg-gray-300 text-[#2F5320] px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-400 transition"
          >
            ← Kembali
          </router-link>

          <button
            type="submit"
            class="bg-[#4C763B] text-white px-10 py-3 rounded-lg font-bold text-lg hover:bg-[#3b5c2f] transition"
          >
            💾 Simpan Lokasi
          </button>
        </div>

        <!-- Pesan Notifikasi -->
        <p
          v-if="message"
          class="text-center mt-4 text-lg font-semibold"
          :class="message.includes('⚠️') ? 'text-red-600' : 'text-green-600'"
        >
          {{ message }}
        </p>
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

<style scoped>
@media (min-width: 1024px) {
  form {
    max-width: 600px;
    margin: 0 auto;
  }
}
</style>
