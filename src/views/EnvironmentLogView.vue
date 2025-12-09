<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import logoPG from '../assets/logoPG.svg'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const log = ref(null)

onMounted(async () => {
  if (!route.params.env_id) { router.push('/environment-log-list'); return }
  try {
    const { data, error } = await supabase
      .from('gh_environment_log')
      .select('*, gh_location(location)')
      .eq('env_id', route.params.env_id)
      .single()
    if (error) throw error
    log.value = data
  } catch (err) {
    alert(err.message)
    router.push('/environment-log-list')
  } finally {
    loading.value = false
  }
})

const formatDate = (date) => new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
const openImg = (url) => { if(url) window.open(url, '_blank') }

// Mapping label agar seragam dengan form input
const sessionLabels = {
  morning: 'Pagi',
  noon: 'Siang',
  afternoon: 'Sore',
  night: 'Malam'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <div class="bg-white border-b sticky top-0 z-40 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
        <button @click="router.back()" class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-600">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
            <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-900">Detail Log</h1>
          <p class="text-xs text-gray-500">Log ID: #{{ log?.env_id }}</p>
        </div>
      </div>
    </div>

    <div v-if="log" class="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div class="bg-white rounded-xl border p-6 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div><p class="text-xs font-bold text-gray-500 uppercase">Tanggal</p><p class="text-lg font-medium">{{ formatDate(log.log_date) }}</p></div>
        <div><p class="text-xs font-bold text-gray-500 uppercase">Lokasi</p><p class="text-lg font-medium">{{ log.gh_location?.location }}</p></div>
      </div>

      <div class="bg-white rounded-xl border p-6 shadow-sm">
        <h3 class="font-bold text-gray-900 mb-4 border-b pb-2">Kondisi Cuaca Harian</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">Status Cuaca</p>
                <p class="text-xl font-medium capitalize">{{ log.weather || '-' }}</p>
            </div>
            <div>
                <p class="text-xs font-bold text-gray-500 uppercase mb-2">Bukti Foto Cuaca</p>
                <div v-if="log.img_weather" class="w-full max-w-xs h-40 bg-gray-100 rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition" @click="openImg(log.img_weather)">
                     <img :src="log.img_weather" class="w-full h-full object-cover">
                </div>
                <p v-else class="text-sm text-gray-400 italic">Tidak ada foto.</p>
            </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="key in ['morning','noon','afternoon','night']" :key="key" 
             class="bg-white p-5 rounded-xl border-t-4 shadow-sm"
             :class="{
               'border-t-orange-400': key==='morning',
               'border-t-yellow-400': key==='noon',
               'border-t-indigo-400': key==='afternoon',
               'border-t-slate-500': key==='night'
             }">
          <h3 class="font-bold text-gray-800 mb-4 capitalize flex justify-between items-center">
            <span>{{ sessionLabels[key] }}</span> 
            <span class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">{{ log['time_'+key] || '--:--' }}</span>
          </h3>
          
          <div class="space-y-4">
            <div v-for="type in ['temp','humid','co2']" :key="type" class="flex justify-between items-center border-b pb-2 last:border-0">
                <span class="text-sm text-gray-600 capitalize font-medium">
                  {{ type === 'temp' ? 'Suhu' : (type === 'humid' ? 'Kelembapan' : 'CO2') }}
                </span>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-gray-900">
                      {{ log[`${type}_${key}`] ? log[`${type}_${key}`] : '-' }}
                      <span v-if="log[`${type}_${key}`]" class="text-[10px] text-gray-400 font-normal">
                         {{ type === 'temp' ? '°C' : (type === 'humid' ? '%' : 'PPM') }}
                      </span>
                    </span>
                    
                    <button v-if="log[`img_${type}_${key}`]" @click="openImg(log[`img_${type}_${key}`])" 
                            class="w-10 h-10 rounded-lg border overflow-hidden hover:opacity-80 transition shadow-sm bg-gray-50 flex-shrink-0" title="Lihat Foto">
                        <img :src="log[`img_${type}_${key}`]" class="w-full h-full object-cover">
                    </button>
                    <div v-else class="w-10 h-10 rounded-lg bg-gray-50 border border-dashed flex items-center justify-center">
                       <span class="text-[8px] text-gray-400">No Img</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
           <span class="w-6 h-6 p-0.5">
             <img :src="logoPG" alt="Potato Grow Logo" class="w-full h-full object-contain" />
          </span>
          <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
  </div>
</template>