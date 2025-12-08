<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const logs = ref([])

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }
  await fetchLogs()
})

const fetchLogs = async () => {
  try {
    loading.value = true
    // Join dengan gh_location untuk dapat nama lokasi
    // Menambahkan field 'weather'
    const { data, error } = await supabase
      .from('gh_environment_log')
      .select(`
        env_id,
        log_date,
        location_id,
        weather,
        gh_location (location),
        temp_morning, temp_noon, temp_afternoon, temp_night
      `)
      .order('log_date', { ascending: false })

    if (error) throw error
    logs.value = data
  } catch (err) {
    console.error(err)
    alert('Gagal memuat data: ' + err.message)
  } finally {
    loading.value = false
  }
}

// Hitung rata-rata suhu harian
const getAvgTemp = (log) => {
  const temps = [log.temp_morning, log.temp_noon, log.temp_afternoon, log.temp_night].filter(t => t !== null && t !== '')
  if (temps.length === 0) return '-'
  const sum = temps.reduce((a, b) => a + Number(b), 0)
  return (sum / temps.length).toFixed(1) + '°C'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <div class="bg-white border-b sticky top-0 z-30 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button @click="router.back()" class="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
             <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div>
            <h1 class="text-xl font-bold text-gray-900">
              Environment Log
            </h1>
            <p class="text-xs text-gray-500">Riwayat Suhu & Kelembapan</p>
          </div>
        </div>
        
        <router-link to="/environment-log/add" 
          class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 px-4 rounded-xl shadow-md transition flex items-center gap-2 text-sm">
          <span>+ Catat Data Baru</span>
        </router-link>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
      
      <div v-if="loading" class="text-center py-10">
        <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full inline-block"></div>
        <p class="text-gray-500 mt-2">Memuat data...</p>
      </div>

      <div v-else-if="logs.length === 0" class="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
        <p class="text-gray-400 mb-4">Belum ada data lingkungan yang tercatat.</p>
        <router-link to="/environment-log/add" class="text-blue-600 font-bold hover:underline">Mulai Mencatat</router-link>
      </div>

      <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th class="p-4 font-bold">Tanggal</th>
                <th class="p-4 font-bold">Lokasi</th>
                <th class="p-4 font-bold">Cuaca</th>
                <th class="p-4 font-bold text-center">Rata-rata Suhu</th>
                <th class="p-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="log in logs" :key="log.env_id" class="hover:bg-blue-50 transition group">
                <td class="p-4 font-medium text-gray-900 whitespace-nowrap">
                  {{ formatDate(log.log_date) }}
                </td>
                <td class="p-4 text-gray-600">
                  {{ log.gh_location?.location || '-' }}
                </td>
                <td class="p-4 text-gray-600 capitalize">
                  {{ log.weather || '-' }}
                </td>
                <td class="p-4 text-center">
                  <span class="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                    {{ getAvgTemp(log) }}
                  </span>
                </td>
                <td class="p-4 text-right">
                  <router-link :to="`/environment-log/view/${log.env_id}`" 
                    class="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:border-blue-300 transition whitespace-nowrap">
                    Lihat Detail
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>