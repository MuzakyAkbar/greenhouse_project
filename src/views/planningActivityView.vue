<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlanningStore } from '@/stores/planning';
import logoPG from '../assets/logoPG.svg'

const route = useRoute();
const router = useRouter();
const planningStore = usePlanningStore();

// Get planning_id from route params
const planningId = route.params.planning_id;

// State
const isLoading = ref(true);
const isPrinting = ref(false);

// Computed data from store
const planningData = ref(null);
const activities = ref([]);
const materials = ref({});

// Fetch planning detail
const fetchPlanningDetail = async () => {
  isLoading.value = true;
  try {
    console.log('🔍 Fetching planning detail for ID:', planningId);
    
    const result = await planningStore.fetchById(planningId);
    
    if (result.success) {
      planningData.value = result.data.planning;
      activities.value = result.data.activities;
      
      // Group materials by activity_id
      materials.value = {};
      result.data.materials.forEach(material => {
        if (!materials.value[material.activity_id]) {
          materials.value[material.activity_id] = [];
        }
        materials.value[material.activity_id].push(material);
      });
      
      console.log('✅ Planning detail loaded');
      console.log('📋 Planning:', planningData.value);
      console.log('🎯 Activities:', activities.value.length);
      console.log('📦 Materials groups:', Object.keys(materials.value).length);
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.error('❌ Error loading planning detail:', err);
    alert('Gagal memuat detail planning: ' + err.message);
    router.back();
  } finally {
    isLoading.value = false;
  }
};

// Print/Export PDF
const printPDF = () => {
  isPrinting.value = true;
  
  // Small delay to allow UI update
  setTimeout(() => {
    window.print();
    
    // Reset after print dialog closes
    setTimeout(() => {
      isPrinting.value = false;
    }, 1000);
  }, 100);
};

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('id-ID').format(num || 0);
};

const getStatusBadge = (status) => {
  const badges = {
    'draft': 'bg-gray-100 text-gray-700',
    'onReview': 'bg-yellow-100 text-yellow-700',
    'approved': 'bg-green-100 text-green-700',
    'rejected': 'bg-red-100 text-red-700'
  };
  return badges[status] || 'bg-gray-100 text-gray-700';
};

const getStatusText = (status) => {
  const texts = {
    'draft': 'Draft',
    'onReview': 'On Review',
    'approved': 'Approved',
    'rejected': 'Rejected'
  };
  return texts[status] || status;
};

// Lifecycle
onMounted(async () => {
  await fetchPlanningDetail();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- Header Bar (Hidden on print) -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 print:hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              @click="router.back()"
              class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-lg">
                  📄
                </span>
                Laporan Perencanaan Tampilan
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">Perencanaan #{{ planningId }}</p>
            </div>
          </div>

          <button
            @click="printPDF"
            :disabled="isPrinting"
            class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M128 0C92.7 0 64 28.7 64 64l0 96 64 0 0-96 226.7 0L384 93.3l0 66.7 64 0 0-66.7c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0L128 0zM384 352l0 32 0 64-256 0 0-64 0-16 0-16 256 0zm64 32l32 0c17.7 0 32-14.3 32-32l0-96c0-35.3-28.7-64-64-64L64 192c-35.3 0-64 28.7-64 64l0 96c0 17.7 14.3 32 32 32l32 0 0 64c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-64zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
            </svg>
            {{ isPrinting ? 'Preparing...' : 'Export PDF' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600 font-semibold">Memuat data perencanaan...</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-4">
      <!-- Planning Report Card -->
      <div class="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-8 mb-8 print:shadow-none print:border print:rounded-none">
        <!-- Header -->
        <div class="border-b-2 border-gray-200 pb-6 mb-6">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">Laporan Perencanaan Kegiatan</h2>
              <p class="text-lg text-gray-600 print:text-base">Planning ID: #{{ planningId }}</p>
            </div>
            <div class="text-right">
              <span 
                :class="getStatusBadge(planningData?.status)" 
                class="inline-block px-4 py-2 rounded-lg text-sm font-bold print:border print:border-green-600"
              >
                {{ getStatusText(planningData?.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Basic Info Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 print:gap-4 print:mb-6">
          <div>
            <p class="text-sm text-gray-500 font-semibold mb-1">📅 Tanggal Planning</p>
            <p class="text-base font-bold text-gray-900 print:text-sm">{{ formatDate(planningData?.planning_date) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-semibold mb-1">📍 Lokasi</p>
            <p class="text-base font-bold text-gray-900 print:text-sm">{{ planningData?.gh_location?.location || '-' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-semibold mb-1">🏷️ Batch</p>
            <p class="text-base font-bold text-gray-900 print:text-sm">{{ planningData?.gh_batch?.batch_name || '-' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-semibold mb-1">🌱 Fase</p>
            <p class="text-base font-bold text-gray-900 print:text-sm">{{ planningData?.phase_plan || '-' }}</p>
          </div>
        </div>

        <!-- Activities Section -->
        <div class="space-y-6 print:space-y-4">
          <h3 class="text-xl font-bold text-gray-900 border-b-2 border-gray-200 pb-3 print:text-lg">Daftar Aktivitas</h3>
          
          <div
            v-for="(activity, index) in activities"
            :key="activity.activity_id"
            class="border-2 border-gray-200 rounded-xl p-6 hover:shadow-md transition print:shadow-none print:rounded-lg print:p-4 print:break-inside-avoid"
          >
            <!-- Activity Header -->
            <div class="flex items-start gap-4 mb-4">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 print:w-10 print:h-10 print:text-base">
                {{ index + 1 }}
              </div>
              <div class="flex-1">
                <h4 class="text-xl font-bold text-gray-900 mb-2 print:text-lg">{{ activity.act_name }}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm print:text-xs">
                  <div>
                    <span class="text-gray-500 font-semibold">Chart of Account (CoA):</span>
                    <span class="ml-2 font-bold text-gray-900">{{ activity.coa || '-' }}</span>
                  </div>
                  <div>
                    <span class="text-gray-500 font-semibold">Tenaga Kerja:</span>
                    <span class="ml-2 font-bold text-gray-900">{{ activity.manpower || '0' }} pekerja</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Materials Table -->
            <div v-if="materials[activity.activity_id]?.length > 0" class="mt-6 print:mt-4">
              <p class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 print:text-xs">
                <svg class="w-5 h-5 text-blue-600 print:w-4 print:h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M234.5 5.7c13.9-5 29.1-5 43.1 0l192 68.6C495 83.4 512 107.5 512 134.6l0 242.9c0 27-17 51.2-42.5 60.3l-192 68.6c-13.9 5-29.1 5-43.1 0l-192-68.6C17 428.6 0 404.5 0 377.4L0 134.6c0-27 17-51.2 42.5-60.3l192-68.6zM256 66L82.3 128 256 190l173.7-62L256 66zm32 368.6l160-57.1 0-188L288 246.6l0 188z"/>
                </svg>
                Material yang Dibutuhkan
              </p>
              <div class="bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200">
                <table class="w-full">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide print:px-2 print:py-2">No</th>
                      <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide print:px-2 print:py-2">Nama Material</th>
                      <th class="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wide print:px-2 print:py-2">Quantity</th>
                      <th class="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wide print:px-2 print:py-2">Satuan</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr
                      v-for="(material, matIndex) in materials[activity.activity_id]"
                      :key="material.material_id"
                      class="hover:bg-blue-50 transition print:hover:bg-transparent"
                    >
                      <td class="px-4 py-3 text-sm text-gray-700 font-medium print:px-2 print:py-2 print:text-xs">{{ matIndex + 1 }}</td>
                      <td class="px-4 py-3 text-sm font-semibold text-gray-900 print:px-2 print:py-2 print:text-xs">{{ material.material_name }}</td>
                      <td class="px-4 py-3 text-sm text-center font-bold text-blue-600 print:px-2 print:py-2 print:text-xs">{{ formatNumber(material.qty) }}</td>
                      <td class="px-4 py-3 text-sm text-center text-gray-700 print:px-2 print:py-2 print:text-xs">{{ material.uom }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- No Materials -->
            <div v-else class="mt-6 bg-gray-50 border-2 border-gray-200 rounded-lg p-4 print:mt-4 print:p-3">
              <p class="text-sm text-gray-500 text-center print:text-xs">Tidak ada bahan baku untuk aktivitas ini</p>
            </div>
          </div>
        </div>

        <!-- Footer Info -->
        <div class="mt-8 pt-6 border-t-2 border-gray-200 print:mt-6 print:pt-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm print:text-xs">
            <div>
              <p class="text-gray-500 font-semibold">Dibuat oleh:</p>
              <p class="font-bold text-gray-900">{{ planningData?.created_by || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-gray-500 font-semibold">Tanggal Dibuat:</p>
              <p class="font-bold text-gray-900">{{ formatDateTime(planningData?.created_at) }}</p>
            </div>
            <div>
              <p class="text-gray-500 font-semibold">Terakhir Diperbarui:</p>
              <p class="font-bold text-gray-900">{{ formatDateTime(planningData?.updated_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer (Hidden on print) -->
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

<style scoped>
@media print {
  /* Hide elements on print */
  .print\:hidden {
    display: none !important;
  }
  
  /* Reset backgrounds */
  body {
    background: white !important;
  }
  
  .bg-gradient-to-br {
    background: white !important;
  }

  /* Adjust spacing */
  .print\:py-4 {
    padding-top: 1rem !important;
    padding-bottom: 1rem !important;
  }

  .print\:mb-6 {
    margin-bottom: 1.5rem !important;
  }

  .print\:gap-4 {
    gap: 1rem !important;
  }

  .print\:space-y-4 > * + * {
    margin-top: 1rem !important;
  }

  /* Remove shadows and adjust borders */
  .print\:shadow-none {
    box-shadow: none !important;
  }

  .print\:border {
    border-width: 1px !important;
  }

  .print\:rounded-none {
    border-radius: 0 !important;
  }

  .print\:rounded-lg {
    border-radius: 0.5rem !important;
  }

  /* Text sizes */
  .print\:text-2xl {
    font-size: 1.5rem !important;
    line-height: 2rem !important;
  }

  .print\:text-base {
    font-size: 1rem !important;
    line-height: 1.5rem !important;
  }

  .print\:text-sm {
    font-size: 0.875rem !important;
    line-height: 1.25rem !important;
  }

  .print\:text-xs {
    font-size: 0.75rem !important;
    line-height: 1rem !important;
  }

  /* Prevent page breaks inside elements */
  .print\:break-inside-avoid {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* Adjust hover states for print */
  .print\:hover\:bg-transparent:hover {
    background-color: transparent !important;
  }

  /* Size adjustments */
  .print\:w-10 {
    width: 2.5rem !important;
  }

  .print\:h-10 {
    height: 2.5rem !important;
  }

  .print\:w-4 {
    width: 1rem !important;
  }

  .print\:h-4 {
    height: 1rem !important;
  }

  .print\:px-2 {
    padding-left: 0.5rem !important;
    padding-right: 0.5rem !important;
  }

  .print\:py-2 {
    padding-top: 0.5rem !important;
    padding-bottom: 0.5rem !important;
  }

  .print\:p-3 {
    padding: 0.75rem !important;
  }

  .print\:p-4 {
    padding: 1rem !important;
  }

  .print\:mt-4 {
    margin-top: 1rem !important;
  }

  .print\:mt-6 {
    margin-top: 1.5rem !important;
  }

  .print\:pt-4 {
    padding-top: 1rem !important;
  }

  /* Page setup */
  @page {
    margin: 1cm;
    size: A4;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>