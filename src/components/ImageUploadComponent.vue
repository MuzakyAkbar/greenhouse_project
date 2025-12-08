<template>
  <div class="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
        <svg class="w-4 h-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
          <path d="M448 336c0 7.5-2.8 14.8-8.2 20.4l-120 120c-12 12-30.8 12-42.9 0L156.2 356.4C150.8 350.8 148 343.5 148 336V288H64c-35.3 0-64-28.7-64-64V128C0 92.7 28.7 64 64 64H320c35.3 0 64 28.7 64 64v32h64c35.3 0 64 28.7 64 64V336zM320 288c0 17.7 14.3 32 32 32h96V192c0-8.8-7.2-16-16-16H336c-8.8 0-16 7.2-16 16v96zM320 128V96H64c-8.8 0-16 7.2-16 16v96H320zM384 480c-17.7 0-32-14.3-32-32s14.3-32 32-32h32V448c0 17.7-14.3 32-32 32z"/>
        </svg>
        <span class="text-xs">
          Lampirkan Foto {{ type === 'type_damage' ? '(Kerusakan)' : '(Aktivitas)' }}
        </span>
      </h4>
      <span class="text-xs text-gray-500">{{ uploadedImages.length }}/{{ maxImages }} foto</span>
    </div>

    <div v-if="uploadedImages.length > 0" class="mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
      <div 
        v-for="(image, index) in uploadedImages" 
        :key="index"
        class="relative group"
      >
        <div class="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-gray-300 shadow-md bg-gray-100">
          <img
            :src="image.url"
            alt="Preview Foto"
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
            <button
              type="button"
              @click.stop="triggerDelete(index)"
              :disabled="isDeleting"
              class="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Hapus Gambar"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
              </svg>
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-1 text-center truncate">
          Foto {{ index + 1 }}
        </p>
      </div>
    </div>

    <div v-if="uploadedImages.length < maxImages">
      <button
        type="button"
        @click="showSelectionModal = true"
        :disabled="isUploading"
        class="w-full bg-white hover:bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg border-2 border-gray-300 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg v-if="isUploading" class="w-5 h-5 text-blue-600 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
          <path d="M304 48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zm0 416a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM48 304a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm464-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM142.9 437A48 48 0 1 0 75 369.1 48 48 0 1 0 142.9 437zm0-294.2A48 48 0 1 0 75 75a48 48 0 1 0 67.9 67.9zM369.1 437A48 48 0 1 0 437 369.1 48 48 0 1 0 369.1 437z"/>
        </svg>
        <span v-else class="flex items-center gap-2">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
            <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
          </svg>
          {{ isUploading ? 'Mengunggah...' : 'Tambah Foto' }}
        </span>
      </button>
      <p class="text-xs text-gray-500 mt-2 text-center">
        Maks. {{ maxImages }} foto.
      </p>
    </div>
    <div v-else>
      <p class="text-sm text-gray-600 text-center py-3">
        ✓ Maksimal {{ maxImages }} foto telah tercapai
      </p>
    </div>

    <input
      type="file"
      :key="`gallery-${recordId}`"
      ref="galleryInput"
      @change="handleGalleryFileChange"
      accept="image/*"
      multiple
      class="hidden"
    />

    <input
      type="file"
      :key="`camera-gallery-${recordId}`"
      ref="cameraGalleryInput"
      @change="handleCameraGalleryFileChange"
      accept="image/*"
      multiple
      class="hidden"
    />

    <div
      v-if="showSelectionModal"
      class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      @click.self="showSelectionModal = false"
    >
      <div class="bg-white rounded-xl max-w-sm w-full overflow-hidden shadow-2xl">
        <div class="p-5">
          <h3 class="text-xl font-bold text-gray-900 mb-1">Pilih Sumber Foto</h3>
          <p class="text-sm text-gray-500 mb-6">Ambil Foto dengan kamera atau pilih dari Galeri.</p>
          
          <div class="space-y-4">
            <button
              type="button"
              @click="openCustomCamera"
              class="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition shadow-md"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/>
              </svg>
              Ambil Foto (Kamera)
            </button>
            
            <button
              type="button"
              @click="triggerGallery"
              class="w-full flex items-center justify-center gap-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg border border-gray-300 transition"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M448 80L320 80c-17.7 0-32 14.3-32 32l0 24.3-64.6 64.6c-9.2 9.2-11.5 22.9-6.9 34.9l7.9 19.9c4.3 10.9-3.5 22.8-15 22.8H217.1c-11.5 0-19.3-11.9-15-22.8l7.9-19.9c4.6-12-1.7-25.7-14.7-28.1L128 178.7V112c0-17.7-14.3-32-32-32L64 80c-17.7 0-32 14.3-32 32l0 288c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64L512 144c0-35.3-28.7-64-64-64zM240 384c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 32 0 0-32c0-35.3-28.7-64-64-64s-64 28.7-64 64l0 32 32 0 0-32z"/>
              </svg>
              Pilih dari Galeri (Multiple)
            </button>
          </div>
          
          <button
            type="button"
            @click="showSelectionModal = false"
            class="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 py-2 transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showCameraModal"
      class="fixed inset-0 bg-black flex flex-col justify-between items-center z-[100] p-4"
    >
      <div class="w-full flex justify-between items-center p-4">
        <button type="button" @click="closeCamera" class="text-white text-lg font-semibold">Batal</button>
        <span class="text-white text-xs font-light opacity-70">Photo 3:4</span>
      </div>

      <div class="relative w-full aspect-[3/4] max-w-sm rounded-lg overflow-hidden flex items-center justify-center bg-gray-900 shadow-2xl border border-gray-800">
        <video ref="videoElement" autoplay playsinline :data-facing-mode="facingMode" class="w-full h-full object-cover"></video>
        <canvas ref="canvasElement" class="hidden"></canvas>
        
        <div class="absolute inset-0 grid grid-cols-3 pointer-events-none opacity-30">
            <div class="border-r border-white"></div>
            <div class="border-r border-white"></div>
            <div></div>
        </div>
        <div class="absolute inset-0 grid grid-rows-3 pointer-events-none opacity-30">
            <div class="border-b border-white"></div>
            <div class="border-b border-white"></div>
            <div></div>
        </div>
      </div>

      <div class="w-full max-w-md flex justify-around items-center py-6 bg-black bg-opacity-50 rounded-t-lg">
        
        <div class="w-12 flex justify-center">
            <button 
                type="button"
                @click="toggleFlash" 
                :disabled="!hasFlash"
                class="p-3 rounded-full transition"
                :class="[
                  isFlashOn ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-white',
                  !hasFlash ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-600'
                ]"
                title="Flash / Torch"
            >
                <svg v-if="isFlashOn" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M297.2 248.9C311.6 228.3 320 203.2 320 176c0-70.7-57.3-128-128-128S64 105.3 64 176c0 27.2 8.4 52.3 22.8 72.9c3.7 5.3 8.1 11.3 12.8 17.7l0 0c12.9 17.7 28.4 38.9 39.8 59.8c10.4 19.1 20.5 38.8 37.9 75.2c1.1 2.3 3.5 3.9 6.1 3.9s5-1.6 6.1-3.9c17.4-36.4 27.5-56.1 37.9-75.2c11.4-20.9 26.9-42.2 39.8-59.8l0 0c4.7-6.4 9-12.4 12.7-17.7zM192 512c-35.3 0-64-28.7-64-64l0-31.1c25.4-15.6 44.5-52.6 64-100.9c19.5 48.4 38.6 85.3 64 100.9L256 448c0 35.3-28.7 64-64 64z"/>
                </svg>
                <svg v-else class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                    <path d="M352 144c0-44.2-35.8-80-80-80s-80 35.8-80 80l0 48c0 17.7 14.3 32 32 32s32-14.3 32-32l0-48c0-8.8 7.2-16 16-16s16 7.2 16 16l0 272c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-16c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 16c0 44.2 35.8 80 80 80s80-35.8 80-80l0-272zM144 416c0 17.7 14.3 32 32 32s32-14.3 32-32l0-208c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 208zM48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64z"/>
                </svg>
            </button>
        </div>
        
        <button type="button" @click="takePhoto" class="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-gray-300 transform active:scale-95 transition shadow-lg">
          <div class="w-12 h-12 rounded-full bg-white"></div>
        </button>

        <div class="w-12 flex justify-center">
            <button type="button" @click="switchCamera" class="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition shadow-lg">
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M307 34.8c-11.5 5.1-19.1 16.5-20.9 29.5l-19.3 131.6L182 143.1C172.9 133.4 159.2 128 145.4 128H48C21.5 128 0 149.5 0 176v80c0 17.7 14.3 32 32 32H64c17.7 0 32-14.3 32-32V192h50.1l70.1 70.1c16.3 16.3 25.3 38.2 25.3 61.1v4.7c0 42.6-28.7 79.1-69.1 89.2c-40.4 10.1-82.7-9.5-103.1-46.7c-7.3-13.3-22.3-18.4-35.5-11.1S12.7 416.7 20 430c25.4 46.4 75.3 75.1 128.4 79.5c.9 .1 1.8 .1 2.7 .1c7.7 0 15.3-1.4 22.4-4.1c46.4-17.6 83-58.4 96-108.6l28.6-107.2L424 374.9c9.1 9.7 22.8 15.1 36.6 15.1H464c26.5 0 48-21.5 48-48V256c0-17.7-14.3-32-32-32H448c-17.7 0-32 14.3-32 32v64h-50.1L327 253.9c-16.3-16.3-25.3-38.2-25.3-61.1V188.1c0-42.6 28.7-79.1 69.1-89.2c40.4-10.1 82.7 9.5 103.1 46.7c7.3 13.3 22.3 18.4 35.5 11.1S500 78.3 492.7 65c-25.4-46.4-75.3-75.1-128.4-79.5c-.9-.1-1.8-.1-2.7-.1c-7.7 0-15.3 1.4-22.4 4.1L307 34.8z"/>
              </svg>
            </button>
        </div>

        <button 
            type="button"
            @click="triggerCameraGallery"
            class="w-12 h-12 flex justify-center items-center bg-gray-700 bg-opacity-50 text-white rounded-full hover:bg-gray-600 transition"
            title="Pilih dari Galeri"
        >
             <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M448 80L320 80c-17.7 0-32 14.3-32 32l0 24.3-64.6 64.6c-9.2 9.2-11.5 22.9-6.9 34.9l7.9 19.9c4.3 10.9-3.5 22.8-15 22.8H217.1c-11.5 0-19.3-11.9-15-22.8l7.9-19.9c4.6-12-1.7-25.7-14.7-28.1L128 178.7V112c0-17.7-14.3-32-32-32L64 80c-17.7 0-32 14.3-32 32l0 288c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64L512 144c0-35.3-28.7-64-64-64zM240 384c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 32 0 0-32c0-35.3-28.7-64-64-64s-64 28.7-64 64l0 32 32 0 0-32z"/>
             </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'; 
import { supabase } from '@/lib/supabase.js'; 

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['type_damage', 'activity'].includes(value)
  },
  recordId: {
    type: [Number, String],
    required: true
  },
  existingImages: {
    type: Array,
    default: () => []
  },
  maxImages: {
    type: Number,
    default: 5
  }
});

const emit = defineEmits(['upload-success', 'upload-error', 'delete', 'images-updated']);

const showSelectionModal = ref(false); 
const showCameraModal = ref(false);    
const galleryInput = ref(null);        
const cameraGalleryInput = ref(null);

const videoElement = ref(null);        
const canvasElement = ref(null);       
const mediaStream = ref(null);         
const facingMode = ref('environment'); 
const temporaryPhoto = ref(null);      

// Flash / Torch Control
const hasFlash = ref(false);
const isFlashOn = ref(false);

const uploadedImages = ref([...props.existingImages]);
const isUploading = ref(false);
const isDeleting = ref(false);

// Helper function untuk get bucket name
const getBucketName = (type) => {
  if (type === 'type_damage') {
    return 'gh-type-damage';
  } else if (type === 'activity') {
    return 'gh-activities';
  }
  throw new Error(`Invalid type: ${type}`);
};

watch(() => props.existingImages, (newImages) => {
  uploadedImages.value = [...newImages];
}, { deep: true });

// =============================
// MODAL SELECTION
// =============================
const openCustomCamera = () => {
  showSelectionModal.value = false;
  showCameraModal.value = true;
  startCamera(); 
};

// UPDATE: Ref sudah pasti ada karena sudah dipindah dari v-if
const triggerGallery = async () => {
  showSelectionModal.value = false;
  await nextTick();
  
  if (galleryInput.value) {
    galleryInput.value.click();
  } else {
    console.error("Gallery input ref not found");
  }
};

const handleGalleryFileChange = async (event) => {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;
  
  const remainingSlots = props.maxImages - uploadedImages.value.length;
  const filesToUpload = files.slice(0, remainingSlots);
  
  if (files.length > remainingSlots) {
    alert(`⚠️ Hanya ${remainingSlots} foto yang akan diupload (maksimal ${props.maxImages} foto)`);
  }
  
  for (const file of filesToUpload) {
    if (file.size > 5 * 1024 * 1024) { 
      alert(`⚠️ File ${file.name} melebihi batas 5MB dan akan dilewati.`);
      continue;
    }
    
    await uploadFile(file);
  }
  
  if (galleryInput.value) {
    galleryInput.value.value = null;
  }
};

// =============================
// CAMERA GALLERY
// =============================
const triggerCameraGallery = async () => {
  await nextTick();
  if (cameraGalleryInput.value) {
    cameraGalleryInput.value.click();
  } else {
    console.error("Camera Gallery input ref not found");
  }
};

const handleCameraGalleryFileChange = async (event) => {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  stopCamera();
  
  const remainingSlots = props.maxImages - uploadedImages.value.length;
  const filesToUpload = files.slice(0, remainingSlots);
  
  for (const file of filesToUpload) {
    if (file.size > 5 * 1024 * 1024) { 
      continue;
    }
    await uploadFile(file);
  }
  
  showCameraModal.value = false;
  
  if (cameraGalleryInput.value) {
    cameraGalleryInput.value.value = null;
  }
};

// =============================
// CAMERA LOGIC
// =============================
const startCamera = async () => {
  if (mediaStream.value) {
    stopCamera();
  }
  try {
    hasFlash.value = false;
    isFlashOn.value = false;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: facingMode.value,
        width: { ideal: 1280 }, 
        height: { ideal: 720 }
      },
    });
    mediaStream.value = stream;
    if (videoElement.value) {
      videoElement.value.srcObject = stream;
      videoElement.value.setAttribute('data-facing-mode', facingMode.value);
    }

    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    if (capabilities.torch) {
        hasFlash.value = true;
    }

  } catch (err) {
    console.error('Gagal mengakses kamera:', err);
    alert('Gagal mengakses kamera. Pastikan izin kamera aktif.');
    closeCamera();
  }
};

const stopCamera = () => {
  if (mediaStream.value) {
    if (isFlashOn.value) {
        const track = mediaStream.value.getVideoTracks()[0];
        try {
            track.applyConstraints({ advanced: [{ torch: false }] });
        } catch(e) {}
    }

    mediaStream.value.getTracks().forEach((track) => track.stop());
    mediaStream.value = null;
    if (videoElement.value) {
      videoElement.value.srcObject = null;
    }
  }
};

const switchCamera = () => {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment';
  startCamera();
};

const toggleFlash = async () => {
    if (!mediaStream.value) return;
    const track = mediaStream.value.getVideoTracks()[0];
    try {
        await track.applyConstraints({
            advanced: [{ torch: !isFlashOn.value }]
        });
        isFlashOn.value = !isFlashOn.value;
    } catch (err) {
        console.error('Error toggling flash:', err);
    }
};

const takePhoto = () => {
  if (videoElement.value && canvasElement.value) {
    const video = videoElement.value;
    const canvas = canvasElement.value;
    const context = canvas.getContext('2d');

    const targetRatio = 3 / 4; 
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const videoRatio = videoWidth / videoHeight;

    let sourceWidth, sourceHeight, startX, startY;

    if (videoRatio > targetRatio) {
      sourceHeight = videoHeight;
      sourceWidth = sourceHeight * targetRatio;
      startX = (videoWidth - sourceWidth) / 2;
      startY = 0;
    } else {
      sourceWidth = videoWidth;
      sourceHeight = sourceWidth / targetRatio;
      startX = 0;
      startY = (videoHeight - sourceHeight) / 2;
    }

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    if (facingMode.value === 'user') {
        context.translate(sourceWidth, 0);
        context.scale(-1, 1);
    }

    context.drawImage(
      video,
      startX, startY, sourceWidth, sourceHeight, 
      0, 0, sourceWidth, sourceHeight            
    );

    canvas.toBlob(async (blob) => {
      if (blob) {
        const photoFile = new File([blob], `photo_${Date.now()}.png`, { type: 'image/png' });
        
        if (temporaryPhoto.value) URL.revokeObjectURL(temporaryPhoto.value);
        temporaryPhoto.value = URL.createObjectURL(photoFile); 

        await uploadFile(photoFile);
        closeCamera();
      } else {
        alert('Gagal mengambil foto.');
      }
    }, 'image/png');
  }
};

const closeCamera = () => {
  stopCamera();
  showCameraModal.value = false;
  temporaryPhoto.value = null; 
};

// =============================
// UPLOAD FILE LOGIC
// =============================
const uploadFile = async (file) => {
  if (uploadedImages.value.length >= props.maxImages) {
    alert(`⚠️ Maksimal ${props.maxImages} foto telah tercapai`);
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert('❌ Anda harus login terlebih dahulu!');
    emit('upload-error', { error: 'User not authenticated' });
    return;
  }

  isUploading.value = true;
  const localPreviewUrl = URL.createObjectURL(file);

  const bucket = getBucketName(props.type);
  const folder = props.recordId;
  const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
  const path = `${folder}/${fileName}`;
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;
    
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      
    const imageData = {
      path: data.path,
      url: localPreviewUrl,
      supabaseUrl: urlData.publicUrl, 
      bucket: bucket
    };

    uploadedImages.value.push(imageData);

    emit('upload-success', {
      recordId: props.recordId,
      imageData: imageData,
      type: props.type,
      allImages: uploadedImages.value
    });
    
    emit('images-updated', uploadedImages.value);
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    emit('upload-error', { error: error.message });
  } finally {
    isUploading.value = false;
  }
};

// =============================
// DELETE LOGIC 
// =============================
const triggerDelete = async (index) => {
  if (confirm('Anda yakin ingin menghapus foto ini?')) {
    isDeleting.value = true;
    const imageToDelete = uploadedImages.value[index];
    
    emit('delete', {
      recordId: props.recordId,
      imagePath: imageToDelete.path,
      type: props.type,
      index: index
    });
    
    uploadedImages.value.splice(index, 1);
    emit('images-updated', uploadedImages.value);
    isDeleting.value = false;
  }
};

onBeforeUnmount(() => {
  stopCamera();
  uploadedImages.value.forEach(img => {
    if (img.url && img.url.startsWith('blob:')) {
      URL.revokeObjectURL(img.url);
    }
  });
});
</script>

<style scoped>
button:focus {
  outline: 2px solid #0071f3;
  outline-offset: 2px;
}
video[data-facing-mode="user"] {
  transform: scaleX(-1); 
}
.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>