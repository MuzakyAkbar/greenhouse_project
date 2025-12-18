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

      <!-- Step 1: Form Input Nama Lokasi -->
      <div v-if="step === 1" class="bg-white rounded-2xl border-2 border-gray-100 shadow-lg overflow-hidden">
        <!-- Card Header -->
        <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
          <div class="relative flex items-center gap-3">
            <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
              🏡
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">Step 1: Nama Lokasi</h2>
              <p class="text-sm text-blue-100 mt-0.5">Masukkan nama lokasi untuk OpenBravo (Warehouse & Locator)</p>
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <form @submit.prevent="submitToOpenBravo" class="p-8 space-y-6">
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
                v-model="locationName"
                type="text"
                placeholder="Contoh: Kebun 3, Greenhouse A, Lahan Utara"
                class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3] focus:ring-opacity-20 transition hover:border-gray-300"
                :disabled="loading"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">Gunakan nama yang mudah diidentifikasi dan diingat</p>
          </div>

          <!-- Additional Info -->
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
                  <li>Nama akan digunakan untuk Warehouse dan Locator</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Message Display -->
          <div
            v-if="message"
            class="rounded-xl p-4 flex items-center gap-3 transition-all duration-300"
            :class="isError ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'"
          >
            <div class="flex-shrink-0" :class="isError ? 'text-red-500' : 'text-green-500'">
              <svg v-if="isError" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <p class="text-sm font-medium" :class="isError ? 'text-red-700' : 'text-green-700'">
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
              :disabled="loading || !locationName"
              class="flex-1 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-medium px-6 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg v-if="loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              {{ loading ? 'Mohon ditunggu...' : 'Tambahkan Lokasi' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Step 2: Tampilkan ID OpenBravo dan Input ke Supabase -->
      <div v-if="step === 2" class="space-y-6">
        <!-- Success Card -->
        <div class="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-green-900 mb-1">✅ Lokasi berhasil ditambahkan!</h3>
              <p class="text-sm text-green-700">Warehouse dan Locator telah berhasil didaftarkan di OpenBravo dengan ID Locator berikut:</p>
            </div>
          </div>
        </div>

        <!-- OpenBravo ID Display -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-lg overflow-hidden">
          <div class="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
                🔑
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">OpenBravo Locator ID</h2>
                <p class="text-sm text-purple-100 mt-0.5">ID Locator yang dihasilkan dari OpenBravo</p>
              </div>
            </div>
          </div>

          <div class="p-8 space-y-4">
            <div class="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <p class="text-xs text-gray-500 font-semibold mb-2">ID LOCATOR OPENBRAVO:</p>
              <div class="flex items-center gap-3">
                <code class="flex-1 text-lg font-mono font-bold text-gray-900 bg-white px-4 py-3 rounded-lg border border-gray-300">
                  {{ openbravoId }}
                </code>
                <button
                  @click="copyToClipboard"
                  class="flex-shrink-0 bg-[#0071f3] hover:bg-[#0060d1] text-white p-3 rounded-lg transition"
                  title="Salin ID"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- Info Warehouse ID -->
            <div v-if="createdWarehouseId" class="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p class="text-xs text-blue-600 font-semibold mb-1">INFO: ID WAREHOUSE</p>
              <code class="text-sm font-mono text-blue-800">{{ createdWarehouseId }}</code>
              <p class="text-xs text-blue-600 mt-1">Warehouse telah dibuat dan terhubung dengan Locator di atas</p>
            </div>
          </div>
        </div>

        <!-- Form Supabase -->
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-lg overflow-hidden">
          <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
                💾
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">Step 2: Masukkan ID Locator</h2>
                <p class="text-sm text-blue-100 mt-0.5">Simpan lokasi ke database Supabase</p>
              </div>
            </div>
          </div>

          <form @submit.prevent="submitToSupabase" class="p-8 space-y-6">
            <!-- Nama Lokasi (Read-only) -->
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Nama Lokasi</label>
              <input
                :value="locationName"
                type="text"
                readonly
                class="w-full bg-gray-100 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 font-medium cursor-not-allowed"
              />
            </div>

            <!-- ID OpenBravo Locator (Read-only) -->
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">ID OpenBravo Locator</label>
              <input
                :value="openbravoId"
                type="text"
                readonly
                class="w-full bg-gray-100 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 font-mono font-medium cursor-not-allowed"
              />
              <p class="text-xs text-gray-500">ID Locator yang otomatis diambil dari OpenBravo</p>
            </div>

            <!-- Message Display -->
            <div
              v-if="messageStep2"
              class="rounded-xl p-4 flex items-center gap-3"
              :class="isErrorStep2 ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'"
            >
              <div class="flex-shrink-0" :class="isErrorStep2 ? 'text-red-500' : 'text-green-500'">
                <svg v-if="isErrorStep2" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
              </div>
              <p class="text-sm font-medium" :class="isErrorStep2 ? 'text-red-700' : 'text-green-700'">
                {{ messageStep2 }}
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                @click="resetForm"
                class="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-xl transition-all text-sm border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow flex items-center justify-center gap-2"
                :disabled="loadingStep2"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
                </svg>
                Tambah Lokasi Lain
              </button>
              <button
                type="submit"
                :disabled="loadingStep2"
                class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium px-6 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg v-if="loadingStep2" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                {{ loadingStep2 ? 'Menyimpan...' : 'Simpan ke Database' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Preview Card -->
      <div v-if="locationName && step === 1" class="mt-8">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</h3>
        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-xl flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
              🏡
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium mb-1">Nama Lokasi:</p>
              <h2 class="text-xl font-bold text-gray-900">{{ locationName }}</h2>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
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

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import openbravoApi from '@/lib/openbravo'
import { supabase } from '@/lib/supabase'

const router = useRouter()

// ===== STATE MANAGEMENT =====
const step = ref(1)
const locationName = ref('')
const openbravoId = ref('')
const createdWarehouseId = ref('')
const loading = ref(false)
const loadingStep2 = ref(false)
const message = ref('')
const messageStep2 = ref('')
const isError = ref(false)
const isErrorStep2 = ref(false)

// Location Address ID default untuk warehouse
const defaultLocationAddressId = ref('59449235C796429B884EB9BC2229AF81')

// ===== FUNCTION: Step 1 - Submit ke OpenBravo (Warehouse + Locator) =====
async function submitToOpenBravo() {
  if (!locationName.value.trim()) {
    message.value = 'Mohon isi nama lokasi terlebih dahulu.'
    isError.value = true
    return
  }

  loading.value = true
  message.value = ''
  isError.value = false

  try {
    // STEP 1A: Buat Warehouse terlebih dahulu
    console.log('Step 1A: Creating Warehouse...')
    
    const warehousePayload = {
      data: [
        {
          _entityName: 'Warehouse',
          searchKey: locationName.value,
          name: locationName.value,
          locationAddress: defaultLocationAddressId.value
        }
      ]
    }

    console.log('Sending warehouse payload:', warehousePayload)

    const warehouseResponse = await openbravoApi.post(
      '/Warehouse',
      warehousePayload
    )

    console.log('Warehouse response:', warehouseResponse.data)

    const createdWarehouse = warehouseResponse.data?.response?.data?.[0]
    const warehouseId = createdWarehouse?.id

    if (!warehouseId) {
      throw new Error('Tidak menerima ID Warehouse dari OpenBravo.')
    }

    createdWarehouseId.value = warehouseId
    console.log('Warehouse created with ID:', warehouseId)

    // STEP 1B: Buat Locator menggunakan Warehouse ID
    console.log('Step 1B: Creating Locator with Warehouse ID:', warehouseId)
    
    const locatorPayload = {
      data: [
        {
          _entityName: 'Locator',
          searchKey: locationName.value,
          _identifier: locationName.value,
          warehouse: warehouseId
        }
      ]
    }

    console.log('Sending locator payload:', locatorPayload)

    const locatorResponse = await openbravoApi.post(
      '/Locator',
      locatorPayload
    )

    console.log('Locator response:', locatorResponse.data)

    const createdLocator = locatorResponse.data?.response?.data?.[0]
    const locatorId = createdLocator?.id

    if (!locatorId) {
      throw new Error('Tidak menerima ID Locator dari OpenBravo.')
    }

    openbravoId.value = locatorId
    message.value = '✅ Berhasil disimpan ke OpenBravo! (Warehouse & Locator)'
    isError.value = false

    console.log('Locator created with ID:', locatorId)

    setTimeout(() => {
      step.value = 2
      message.value = ''
    }, 1500)

  } catch (err) {
    console.error('Error submitting to OpenBravo:', err)
    
    const errorMsg = err.response?.data?.error?.message 
      || err.response?.data?.message 
      || err.message 
      || 'Terjadi kesalahan tidak diketahui'
    
    message.value = `⚠️ Gagal menyimpan ke OpenBravo: ${errorMsg}`
    isError.value = true
  } finally {
    loading.value = false
  }
}

// ===== FUNCTION: Step 2 - Submit ke Supabase =====
async function submitToSupabase() {
  loadingStep2.value = true
  messageStep2.value = ''
  isErrorStep2.value = false

  try {
    const { data, error } = await supabase
      .from('gh_location')
      .insert([
        {
          location: locationName.value,
          id_openbravo: openbravoId.value,
        }
      ])
      .select()

    if (error) {
      throw error
    }

    console.log('Data saved to Supabase:', data)

    messageStep2.value = '✅ Lokasi berhasil disimpan ke database!'
    isErrorStep2.value = false

    setTimeout(() => {
      router.push('/location')
    }, 2000)

  } catch (err) {
    console.error('Error submitting to Supabase:', err)
    messageStep2.value = `⚠️ Gagal menyimpan ke database: ${err.message}`
    isErrorStep2.value = true
  } finally {
    loadingStep2.value = false
  }
}

// ===== FUNCTION: Copy ID to Clipboard =====
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(openbravoId.value)
    messageStep2.value = '✅ ID berhasil disalin!'
    isErrorStep2.value = false
    
    setTimeout(() => {
      messageStep2.value = ''
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
    messageStep2.value = '⚠️ Gagal menyalin ID'
    isErrorStep2.value = true
  }
}

// ===== FUNCTION: Reset Form untuk Menambah Lokasi Baru =====
function resetForm() {
  step.value = 1
  locationName.value = ''
  openbravoId.value = ''
  createdWarehouseId.value = ''
  message.value = ''
  messageStep2.value = ''
  isError.value = false
  isErrorStep2.value = false
}
</script>

<style scoped>
.ml-13 {
  margin-left: 3.25rem;
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}

::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-thumb {
  background-color: #0071f3;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: #0060d1;
}
</style>