<script setup>
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLocationStore } from '@/stores/location'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const authStore = useAuthStore()
const locationStore = useLocationStore()

const isSubmitting = ref(false)
const isLoadingData = ref(false)
const existingId = ref(null)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedLocation = ref("")

const createSession = (time) => ({
  time, 
  temp: '', 
  humid: '', 
  co2: '',
  img_temp: null, 
  img_humid: null, 
  img_co2: null
})

const getInitialSessions = () => ({
  morning: createSession('07:00'),
  noon: createSession('12:00'),
  afternoon: createSession('16:00'),
  night: createSession('20:00')
})

const weatherOptions = [
  { value: 'cerah', label: 'Cerah' },
  { value: 'berawan', label: 'Berawan' },
  { value: 'mendung', label: 'Mendung' },
  { value: 'hujan', label: 'Hujan' },
  { value: 'panas', label: 'Panas' },
  { value: 'dingin', label: 'Dingin' },
  { value: 'berangin', label: 'Berangin' },
  { value: 'badai', label: 'Badai' }
]

const sessions = ref(getInitialSessions())
const selectedWeather = ref("")
const weatherImage = ref(null)

const sessionLabels = {
  morning: { label: 'Pagi', color: 'orange' },
  noon: { label: 'Siang', color: 'yellow' },
  afternoon: { label: 'Sore', color: 'indigo' },
  night: { label: 'Malam', color: 'slate' }
}

const paramLabels = {
  temp: { label: 'Suhu', unit: '°C' },
  humid: { label: 'Kelembapan', unit: '%' },
  co2: { label: 'CO2', unit: 'PPM' }
}

const showSelectionModal = ref(false)
const showCameraModal = ref(false)
const isUploading = ref(false)
const activeField = ref({ session: null, type: null })
const fileInput = ref(null)

const videoElement = ref(null)
const canvasElement = ref(null)
const mediaStream = ref(null)
const facingMode = ref('environment')
const hasFlash = ref(false)
const isFlashOn = ref(false)

const locations = computed(() => locationStore.locations)

onMounted(async () => {
  if (!authStore.isLoggedIn) { 
    router.push('/') 
    return 
  }
  await locationStore.fetchAll()
})

const checkExistingLog = async () => {
  if (!selectedLocation.value || !selectedDate.value) return
  isLoadingData.value = true
  
  try {
    const { data } = await supabase.from('gh_environment_log')
      .select('*')
      .eq('log_date', selectedDate.value)
      .eq('location_id', selectedLocation.value)
      .maybeSingle()

    if (data) {
      existingId.value = data.env_id
      selectedWeather.value = data.weather || ""
      weatherImage.value = data.img_weather || null
      
      const mapping = ['morning', 'noon', 'afternoon', 'night']
      mapping.forEach(key => {
        if(data[`time_${key}`]) sessions.value[key].time = data[`time_${key}`]
        sessions.value[key].temp = data[`temp_${key}`]
        sessions.value[key].img_temp = data[`img_temp_${key}`]
        sessions.value[key].humid = data[`humid_${key}`]
        sessions.value[key].img_humid = data[`img_humid_${key}`]
        sessions.value[key].co2 = data[`co2_${key}`]
        sessions.value[key].img_co2 = data[`img_co2_${key}`]
      })
    } else {
      existingId.value = null
      sessions.value = getInitialSessions()
      selectedWeather.value = ""
      weatherImage.value = null
    }
  } finally {
    isLoadingData.value = false
  }
}

watch([selectedDate, selectedLocation], checkExistingLog)

// === UPLOAD LOGIC ===
const openUploadSelector = (session, type) => {
  if (!selectedLocation.value || !selectedDate.value) {
    alert("Pilih Tanggal & Lokasi dulu!")
    return
  }
  activeField.value = { session, type }
  showSelectionModal.value = true
}

const openWeatherUploadSelector = () => {
  if (!selectedLocation.value || !selectedDate.value) {
    alert("Pilih Tanggal & Lokasi dulu!")
    return
  }
  activeField.value = { session: 'daily', type: 'weather' } 
  showSelectionModal.value = true
}

const handleFileUpload = async (file) => {
  if (!file) return
  isUploading.value = true
  showSelectionModal.value = false
  showCameraModal.value = false

  try {
    const { session, type } = activeField.value
    const bucket = 'gh_environment_condition'
    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const folderDate = selectedDate.value 
    
    let path = ''
    let oldUrl = null

    if (type === 'weather') {
      path = `environment/${folderDate}/${selectedLocation.value}_weather_${timestamp}.${ext}`
      oldUrl = weatherImage.value
    } else {
      path = `environment/${folderDate}/${selectedLocation.value}_${session}_${type}_${timestamp}.${ext}`
      oldUrl = sessions.value[session][`img_${type}`]
    }

    if (oldUrl) {
      try {
        const oldPathMatch = oldUrl.match(/environment\/(.+)$/)
        if (oldPathMatch) {
          await supabase.storage.from(bucket).remove([oldPathMatch[0]])
        }
      } catch (e) { 
        console.log('Could not remove old file:', e) 
      }
    }

    const { error } = await supabase.storage.from(bucket).upload(path, file, { 
      cacheControl: '3600',
      upsert: false 
    })
    
    if (error) throw new Error(error.message || 'Upload gagal')

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    
    if (type === 'weather') {
      weatherImage.value = data.publicUrl
    } else {
      sessions.value[session][`img_${type}`] = data.publicUrl
    }
    
    alert('✅ Foto berhasil diupload!')

  } catch (err) {
    console.error('Error detail:', err)
    alert("❌ Gagal upload: " + err.message)
  } finally {
    isUploading.value = false
    stopCamera()
  }
}

const onFileSelected = (e) => {
  if (e.target.files.length > 0) handleFileUpload(e.target.files[0])
}

const triggerFileInput = () => {
  fileInput.value.click()
}

// === CAMERA LOGIC ===
const openCamera = async () => {
  showSelectionModal.value = false
  showCameraModal.value = true
  await nextTick()
  startCamera()
}

const startCamera = async () => {
  if (mediaStream.value) stopCamera()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: facingMode.value, 
        width: { ideal: 1280 }, 
        height: { ideal: 720 } 
      } 
    })
    mediaStream.value = stream
    if (videoElement.value) videoElement.value.srcObject = stream
    const track = stream.getVideoTracks()[0]
    const capabilities = track.getCapabilities ? track.getCapabilities() : {}
    hasFlash.value = !!capabilities.torch
  } catch (err) {
    alert("Gagal akses kamera.")
    showCameraModal.value = false
  }
}

const stopCamera = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(t => t.stop())
    mediaStream.value = null
  }
}

const switchCamera = () => {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
  startCamera()
}

const toggleFlash = async () => {
  if (!mediaStream.value) return
  const track = mediaStream.value.getVideoTracks()[0]
  try {
    await track.applyConstraints({ advanced: [{ torch: !isFlashOn.value }] })
    isFlashOn.value = !isFlashOn.value
  } catch (e) { 
    console.error(e) 
  }
}

const takePhoto = () => {
  const video = videoElement.value
  const canvas = canvasElement.value
  if (!video || !canvas) return

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (facingMode.value === 'user') {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0)
  canvas.toBlob(blob => {
    const file = new File([blob], `cam_${Date.now()}.jpg`, { type: 'image/jpeg' })
    handleFileUpload(file)
  }, 'image/jpeg', 0.8)
}

onBeforeUnmount(() => stopCamera())

// === SUBMIT (Updated: Removed Image Validation) ===
const submitLog = async () => {
  if (!selectedLocation.value || !selectedDate.value) {
    alert("Pilih Tanggal & Lokasi!")
    return
  }
  
  // ✅ VALIDASI FOTO DIHAPUS (Sesuai request)
  // Data tetap bisa disimpan meski foto kosong

  isSubmitting.value = true
  try {
    const payload = {
      log_date: selectedDate.value,
      location_id: selectedLocation.value,
      created_by: authStore.user.user_id,
      weather: selectedWeather.value || null,
      img_weather: weatherImage.value,
    }
    
    const sessionKeys = ['morning', 'noon', 'afternoon', 'night']
    sessionKeys.forEach(s => {
      payload[`time_${s}`] = sessions.value[s].time
      payload[`temp_${s}`] = sessions.value[s].temp || null
      payload[`img_temp_${s}`] = sessions.value[s].img_temp
      payload[`humid_${s}`] = sessions.value[s].humid || null
      payload[`img_humid_${s}`] = sessions.value[s].img_humid
      payload[`co2_${s}`] = sessions.value[s].co2 || null
      payload[`img_co2_${s}`] = sessions.value[s].img_co2
    })

    const query = existingId.value 
      ? supabase.from('gh_environment_log').update(payload).eq('env_id', existingId.value)
      : supabase.from('gh_environment_log').insert([payload])

    const { error } = await query
    if (error) throw error

    alert("✅ Data Berhasil Disimpan")
    router.push('/environment-log-list')
  } catch (err) {
    alert("Gagal: " + err.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <div class="bg-white border-b sticky top-0 z-40 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
        <button @click="router.back()" class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-900">Input Environment Log</h1>
          <p class="text-xs text-gray-500">{{ existingId ? 'Update Data Hari Ini' : 'Form Pencatatan Baru' }}</p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      <div class="bg-white rounded-xl border p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label>
          <input type="date" v-model="selectedDate" class="w-full border p-2.5 rounded-lg bg-gray-50 outline-none">
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Lokasi</label>
          <select v-model="selectedLocation" class="w-full border p-2.5 rounded-lg bg-gray-50 outline-none">
            <option value="" disabled>Pilih Lokasi</option>
            <option v-for="l in locations" :key="l.location_id" :value="l.location_id">{{ l.location }}</option>
          </select>
        </div>
      </div>
      
      <div class="bg-white rounded-xl border p-6 shadow-sm">
        <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2">
            Kondisi Cuaca Harian
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Cuaca</label>
                <select v-model="selectedWeather" class="w-full border p-2.5 rounded-lg bg-gray-50 outline-none">
                    <option value="">Pilih Cuaca</option>
                    <option v-for="w in weatherOptions" 
                            :key="w.value" 
                            :value="w.value" 
                            class="capitalize">
                        {{ w.label }}
                    </option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-end items-center gap-2">
                    Bukti Foto
                    <span v-if="weatherImage" class="text-[10px] text-green-600 font-bold flex items-center gap-1 bg-green-50 px-1 rounded">
                     ✓ Ada
                    </span>
                </label>
                <div class="flex gap-2 items-center">
                    <div class="flex-1">
                        <div class="w-full border border-transparent p-2.5 rounded-lg text-sm font-medium h-[44px]"></div>
                    </div>
                    <button 
                        @click="openWeatherUploadSelector"
                        class="w-[44px] h-[44px] flex-shrink-0 rounded-lg border flex items-center justify-center transition overflow-hidden shadow-sm hover:shadow-md"
                        :class="weatherImage ? 'border-green-300 bg-white ring-2 ring-green-100' : 'bg-gray-50 border-gray-300 hover:border-blue-400 hover:text-blue-500 text-gray-400'"
                        title="Upload Bukti Foto Cuaca"
                    >
                        <img v-if="weatherImage" :src="weatherImage" class="w-full h-full object-cover">
                        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      <div v-if="isLoadingData" class="py-10 text-center text-gray-500 animate-pulse">Sedang memuat data...</div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="(session, key) in sessions" :key="key" 
             class="bg-white rounded-xl border shadow-sm flex flex-col h-full overflow-hidden"
             :class="{
                'border-orange-200': key === 'morning',
                'border-yellow-200': key === 'noon',
                'border-indigo-200': key === 'afternoon',
                'border-slate-200': key === 'night'
             }">
          
          <div class="p-3 border-b flex justify-between items-center"
               :class="{
                 'bg-orange-50': key === 'morning',
                 'bg-yellow-50': key === 'noon',
                 'bg-indigo-50': key === 'afternoon',
                 'bg-slate-50': key === 'night',
               }">
            <div class="flex items-center gap-2 font-bold capitalize"
                 :class="{
                   'text-orange-700': key === 'morning',
                   'text-yellow-700': key === 'noon',
                   'text-indigo-700': key === 'afternoon',
                   'text-slate-700': key === 'night',
                 }">
               {{ sessionLabels[key].label }}
            </div>
            <div class="text-right">
                <input type="time" v-model="session.time" class="bg-white border rounded text-xs p-1 w-20 text-center cursor-pointer hover:border-blue-500">
                <p class="text-[9px] text-gray-500 mt-0.5 tracking-tight">*Jam bisa disesuaikan</p>
            </div>
          </div>

          <div class="p-4 space-y-4 flex-1">
            <div v-for="(label, type) in paramLabels" :key="type" class="flex flex-col gap-1">
               <div class="flex justify-between items-end">
                   <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{{ label.label }}</label>
                   <span v-if="session[`img_${type}`]" class="text-[10px] text-green-600 font-bold flex items-center gap-1 bg-green-50 px-1 rounded">
                     ✓ Ada
                   </span>
               </div>
               
               <div class="flex gap-2 items-center">
                 <div class="relative flex-1">
                    <input type="number" step="0.1" v-model="session[type]" 
                           class="w-full border border-gray-300 p-2.5 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none h-[44px]"
                           placeholder="0">
                    <span class="absolute right-3 top-2.5 text-gray-400 text-xs">{{ label.unit }}</span>
                 </div>
                 
                 <button 
                    @click="openUploadSelector(key, type)"
                    class="w-[44px] h-[44px] flex-shrink-0 rounded-lg border flex items-center justify-center transition overflow-hidden shadow-sm hover:shadow-md"
                    :class="session[`img_${type}`] ? 'border-green-300 bg-white ring-2 ring-green-100' : 'bg-gray-50 border-gray-300 hover:border-blue-400 hover:text-blue-500 text-gray-400'"
                    title="Upload Bukti Foto"
                 >
                    <img v-if="session[`img_${type}`]" :src="session[`img_${type}`]" class="w-full h-full object-cover">
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>

      <button @click="submitLog" :disabled="isSubmitting" 
              class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-70">
        <span v-if="isSubmitting">Menyimpan...</span>
        <span v-else>{{ existingId ? 'Perbarui Data Log' : 'Simpan Data Baru' }}</span>
      </button>
    </div>

    <div v-if="showSelectionModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="showSelectionModal = false">
      <div class="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-fade-in">
        <button @click="showSelectionModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">✕</button>
        <h3 class="font-bold text-gray-900 mb-6 text-center text-lg">Upload Bukti Foto</h3>
        
        <div class="space-y-3">
          <button @click="openCamera" class="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Ambil Foto (Kamera)
          </button>
          <button @click="triggerFileInput" class="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-200 border border-gray-200 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Pilih dari Galeri
          </button>
        </div>
      </div>
    </div>

     <div v-if="showCameraModal" class="fixed inset-0 bg-black z-[110] flex flex-col">
       <div class="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-30">
          <button @click="showCameraModal=false; stopCamera()" class="text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur font-medium text-sm shadow-lg">Batal</button>
          <button @click="switchCamera" class="text-white bg-black/50 p-2 rounded-full backdrop-blur shadow-lg">
             <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
       </div>
       <div class="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          <div class="relative w-full max-w-[100vh] mx-auto" style="aspect-ratio: 3/4;">
            <video ref="videoElement" autoplay playsinline class="absolute inset-0 w-full h-full object-cover"></video>
          </div>
          <canvas ref="canvasElement" class="hidden"></canvas>
       </div>
       <div class="absolute bottom-0 left-0 right-0 p-8 flex justify-center bg-gradient-to-t from-black/80 to-transparent items-center gap-8 z-30">
          <button @click="takePhoto" class="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition flex items-center justify-center shadow-lg">
             <div class="w-16 h-16 bg-white rounded-full"></div>
          </button>
       </div>
    </div>

    <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="onFileSelected">

    <div v-if="isUploading" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center text-white font-bold flex-col gap-3">
      <div class="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full"></div>
      <p>Mengunggah Foto...</p>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>