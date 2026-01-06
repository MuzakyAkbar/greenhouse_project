<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <router-link
              to="/"
              class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg
                class="w-5 h-5 text-gray-700"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                fill="currentColor"
              >
                <path
                  d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"
                />
              </svg>
            </router-link>
            <div>
              <h1
                class="text-2xl font-bold text-gray-900 flex items-center gap-3"
              >
                <span
                  class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg"
                >
                  🚚
                </span>
                Perpindahan Barang
              </h1>
              <p class="text-sm text-gray-500 mt-1 ml-13">
                Manajemen Perpindahan Barang
              </p>
            </div>
          </div>

          <div
            class="flex items-center gap-3"
            v-if="users?.role === 'Staff'"
          >
            <router-link
              to="/addnewgm"
              class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
            >
              <svg
                class="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                fill="currentColor"
              >
                <path
                  d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"
                />
              </svg>
              Tambah Perpindahan Barang
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="errorMessage" class="mb-8">
        <div
          class="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-3"
        >
          <svg
            class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            fill="currentColor"
          >
            <path
              d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24l0 112c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-112c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"
            />
          </svg>
          <div class="flex-1">
            <p class="font-semibold text-red-800 mb-1">Error</p>
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>
        </div>
      </div>

      <div class="mb-8">
        <h2
          class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3"
        >
          Daftar Movement
          <span v-if="!loading && movements.length > 0"
            >({{ movements.length }})</span
          >
        </h2>

        <div v-if="loading" class="space-y-5">
          <div
            v-for="n in 3"
            :key="n"
            class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 animate-pulse"
          >
            <div class="flex justify-between items-start mb-4">
              <div class="space-y-3 flex-1">
                <div class="h-5 w-48 bg-gray-200 rounded"></div>
                <div class="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
              <div class="h-6 w-24 bg-gray-200 rounded-lg"></div>
            </div>
            <div class="space-y-2">
              <div class="h-4 w-64 bg-gray-200 rounded"></div>
              <div class="h-4 w-80 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        <div v-else-if="movements.length > 0" class="grid grid-cols-1 gap-5">
          <router-link
            v-for="mv in movements"
            :key="mv.id"
            :to="detailLink(mv)"
            class="group"
          >
            <div
              class="bg-white rounded-2xl border-2 shadow-sm hover:shadow-xl transition-all p-6 transform hover:-translate-y-1"
              :class="
                mv.status === 'Approved'
                  ? 'border-green-200 hover:border-green-300'
                  : 'border-gray-100 hover:border-[#0071f3]'
              "
            >
              <div
                class="flex flex-col md:flex-row justify-between md:items-start gap-4"
              >
                <div class="flex-1 space-y-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0"
                      :class="
                        mv.status === STATUS.APPROVED
                          ? 'bg-gradient-to-br from-green-400 to-green-500'
                          : mv.status === STATUS.WAITING_RECEIVE
                          ? 'bg-gradient-to-br from-blue-400 to-blue-500'
                          : 'bg-gradient-to-br from-yellow-400 to-yellow-500'
                      "
                      >
                      {{ 
                        mv.status === STATUS.APPROVED
                          ? '✅'
                          : mv.status === STATUS.WAITING_RECEIVE
                          ? '📦'
                          : '⏳'
                      }}
                    </div>
                    <div>
                      <p class="font-bold text-gray-900 text-lg">
                        {{ mv.documentNo }}
                      </p>
                      <p class="text-sm text-gray-500">
                        Requester: {{ mv.requester }}
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div class="bg-gray-50 rounded-lg p-3">
                      <p
                        class="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1"
                      >
                        <svg
                          class="w-3.5 h-3.5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 448 512"
                          fill="currentColor"
                        >
                          <path
                            d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"
                          />
                        </svg>
                        Tanggal
                      </p>
                      <p class="text-sm font-bold text-gray-900">
                        {{ mv.movementDateFmt }}
                      </p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                      <p
                        class="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1"
                      >
                        <svg
                          class="w-3.5 h-3.5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 384 512"
                          fill="currentColor"
                        >
                          <path
                            d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"
                          />
                        </svg>
                        Lokasi
                      </p>
                      <p class="text-sm font-bold text-gray-900">
                        {{ mv.locationText }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col items-end gap-3">
                  <span
                    class="text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap"
                    :class="
                      mv.status === STATUS.APPROVED
                        ? 'bg-green-100 text-green-800'
                        : mv.status === STATUS.WAITING_RECEIVE
                        ? 'bg-blue-100 text-blue-800'
                        : mv.status === STATUS.NEED_REVISION
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    "
                  >
                    {{
                      mv.status === STATUS.APPROVED
                        ? '✅ Approved'
                        : mv.status === STATUS.WAITING_RECEIVE
                        ? '📦 Menunggu Penerimaan'
                        : mv.status === STATUS.NEED_REVISION
                        ? '❌ Need Revision'
                        : '⏳ On Review'
                    }}
                  </span>
                  <svg
                    class="w-5 h-5 text-gray-400 group-hover:text-[#0071f3] transition-colors"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 320 512"
                    fill="currentColor"
                  >
                    <path
                      d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </router-link>

          <div v-if="hasMore" class="mt-4">
            <button
              @click="fetchMovements({ reset: false })"
              :disabled="loadingMore"
              class="w-full bg-white rounded-xl border border-gray-200 p-4 text-[#0071f3] font-semibold hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
            >
              <div
                v-if="loadingMore"
                class="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0071f3]"
              ></div>
              <span v-else>Muat Lebih Banyak</span>
            </button>
          </div>
        </div>

        <div
          v-else
          class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-12 text-center"
        >
          <div
            class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-10 h-10 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 512"
              fill="currentColor"
            >
              <path
                d="M112 0C85.5 0 64 21.5 64 48l0 48L16 96c-8.8 0-16 7.2-16 16s7.2 16 16 16l48 0 208 0c8.8 0 16 7.2 16 16s-7.2 16-16 16L64 160l-16 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l16 0 176 0c8.8 0 16 7.2 16 16s-7.2 16-16 16L64 224l-48 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l48 0 144 0c8.8 0 16 7.2 16 16s-7.2 16-16 16L64 288l0 128c0 53 43 96 96 96s96-43 96-96l128 0c0 53 43 96 96 96s96-43 96-96l32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l0-64 0-32 0-18.7c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7L416 96l0-48c0-26.5-21.5-48-48-48L112 0zM544 237.3l0 18.7-128 0 0-96 50.7 0L544 237.3zM160 368a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm272 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0z"
              />
            </svg>
          </div>
          <p class="text-gray-600 font-semibold text-lg mb-2">
            Belum Ada Data Movement
          </p>
          <p class="text-gray-500 text-sm mb-6">
            Mulai dengan menambahkan movement baru
          </p>
          <router-link
            to="/addnewgm"
            class="inline-flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <svg
              class="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 448 512"
              fill="currentColor"
            >
              <path
                d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"
              />
            </svg>
            Tambah Movement Baru
          </router-link>
        </div>
      </div>

      <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
           <span class="w-6 h-6 p-0.5">
             <img :src="logoPG" alt="Logo Potato Grow" class="w-full h-full object-contain" />
          </span>
          <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 Hak Cipta Dilindungi</p>
      </footer>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { supabase } from "@/lib/supabase";
import logoPG from "@/assets/logoPG.svg";

const STATUS = {
  ON_REVIEW: 'On Review',
  WAITING_RECEIVE: 'Menunggu Penerimaan',
  APPROVED: 'Approved',
  NEED_REVISION: 'Need Revision',
  REJECTED: 'Rejected'
}

// ===== State Management =====
const loading = ref(false);
const loadingMore = ref(false);
const errorMessage = ref("");
const movements = ref([]);
const users = ref([]);

// ===== Pagination Configuration =====
const PAGE_SIZE = 10;
const nextStartRow = ref(0);
const hasMore = ref(true);

// ===== Realtime Subscription =====
let realtimeChannel = null;

/* -----------------------------
   1. SETUP REALTIME SUBSCRIPTION (ENHANCED)
------------------------------*/

const setupRealtimeSubscription = () => {
  realtimeChannel = supabase
    .channel("gh_movement_changes")
    // ⭐ Subscribe ke perubahan gh_movement
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "gh_movement",
      },
      async (payload) => {
        console.log("🔔 Movement update:", payload);

        if (payload.eventType === "INSERT") {
          await handleRealtimeInsert(payload.new);
        } else if (payload.eventType === "UPDATE") {
          // ⭐ PENTING: Update status real-time
          await handleRealtimeUpdate(payload.new);
        } else if (payload.eventType === "DELETE") {
          movements.value = movements.value.filter(
            (m) => m.movement_id !== payload.old.movement_id
          );
        }
      }
    )
    // ⭐ TAMBAHAN: Subscribe ke gh_approve_record untuk deteksi approval cepat
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "gh_approve_record",
      },
      async (payload) => {
        console.log("🔔 Approval record updated:", payload);
        
        // Jika tipe referensi adalah movement, refresh data
        if (payload.new.reference_type === "movement") {
          await refreshMovementById(payload.new.reference_id);
        }
      }
    )
    // ⭐ TAMBAHAN: Subscribe ke gh_approval_level_status untuk update level
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "gh_approval_level_status",
      },
      async (payload) => {
        console.log("🔔 Approval level status changed:", payload);
        
        // Refresh movement berdasarkan perubahan approval level
        await refreshMovementByApprovalLevel(payload.new);
      }
    )
    .subscribe((status) => {
      console.log("📡 Realtime subscription status:", status);
      
      if (status === "SUBSCRIBED") {
        console.log("✅ Successfully subscribed to realtime updates");
      } else if (status === "CHANNEL_ERROR") {
        console.error("❌ Realtime subscription error, starting polling fallback...");
        startPollingFallback();
      }
    });
};

/* -----------------------------
   2. HANDLE REALTIME UPDATE (ENHANCED)
------------------------------*/

const handleRealtimeUpdate = async (updatedRow) => {
  try {
    console.log("📝 Processing movement update:", updatedRow.movement_id);
    
    // Fetch location names
    const locationIds = [
      updatedRow.source_location_id,
      updatedRow.target_location_id,
    ].filter(Boolean);

    const locMap = await fetchLocationNames(locationIds);

    const sourceId = updatedRow.source_location_id;
    const targetId = updatedRow.target_location_id;
    const sourceLoc = sourceId ? locMap[sourceId] : null;
    const targetLoc = targetId ? locMap[targetId] : null;

    let locationText = "-";
    if (sourceLoc && targetLoc) {
      locationText = `${sourceLoc} → ${targetLoc}`;
    } else if (sourceLoc && !targetLoc) {
      locationText = `${sourceLoc} → ?`;
    } else if (!sourceLoc && targetLoc) {
      locationText = `? → ${targetLoc}`;
    }

    const updatedMovement = {
      id: updatedRow.movement_id,
      movement_id: updatedRow.movement_id,
      documentNo: updatedRow.reference_no || "-",
      requester: updatedRow.created_by || "-",
      movementDateFmt: formatDateTime(updatedRow.created_at),
      locationText: locationText,
      status: updatedRow.status || "On Review", // ⭐ Status update otomatis
      createdAt: updatedRow.created_at,
      raw: updatedRow,
    };

    // Find and update in list
    const index = movements.value.findIndex(
      (m) => m.movement_id === updatedRow.movement_id
    );

    if (index !== -1) {
      const oldStatus = movements.value[index].status;
      
      // ⭐ Update data
      movements.value[index] = updatedMovement;
      
      // ⭐ Show notification jika status berubah
      if (oldStatus !== updatedMovement.status) {
        showStatusChangeNotification(updatedMovement, oldStatus);
      }
      
      console.log(`✅ Movement ${updatedRow.movement_id} updated: ${oldStatus} → ${updatedMovement.status}`);
    } else {
      console.log("⚠️ Movement not in current view, might be in other page");
    }
  } catch (err) {
    console.error("❌ Error handling realtime update:", err);
  }
};

/* -----------------------------
   3. REFRESH MOVEMENT BY ID
------------------------------*/

const refreshMovementById = async (movementId) => {
  try {
    console.log(`🔄 Refreshing movement ${movementId}...`);
    
    const { data: movement, error } = await supabase
      .from("gh_movement")
      .select("*")
      .eq("movement_id", movementId)
      .single();

    if (error) throw error;

    if (movement) {
      await handleRealtimeUpdate(movement);
    }
  } catch (err) {
    console.error("❌ Error refreshing movement by ID:", err);
  }
};

/* -----------------------------
   4. REFRESH MOVEMENT BY APPROVAL LEVEL
------------------------------*/

const refreshMovementByApprovalLevel = async (approvalLevel) => {
  try {
    // Get approval record
    const { data: approvalRecord, error: recordError } = await supabase
      .from("gh_approve_record")
      .select("reference_id, reference_type")
      .eq("record_id", approvalLevel.record_id)
      .single();

    if (recordError) throw recordError;

    // Only process if it's a movement
    if (approvalRecord && approvalRecord.reference_type === "movement") {
      const movementId = approvalRecord.reference_id;
      
      console.log(`🔄 Approval level changed for movement ${movementId}, refreshing...`);
      
      // Fetch updated movement
      const { data: movement, error: movementError } = await supabase
        .from("gh_movement")
        .select("*")
        .eq("movement_id", movementId)
        .single();

      if (movementError) throw movementError;

      if (movement) {
        await handleRealtimeUpdate(movement);
      }
    }
  } catch (err) {
    console.error("❌ Error refreshing movement by approval level:", err);
  }
};

/* -----------------------------
   5. NOTIFICATION SYSTEM (TOAST)
------------------------------*/

const showStatusChangeNotification = (movement, oldStatus) => {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  
  // Cek apakah user adalah requester
  const isRequester = 
    currentUser?.email === movement.requester || 
    currentUser?.username === movement.requester;
  
  // Prepare notification message
  let message = "";
  let icon = "";
  let bgColor = "";
  
  switch(movement.status) {
    case "Approved":
      message = `Movement ${movement.documentNo} telah disetujui!`;
      icon = "✅";
      bgColor = "bg-green-100 text-green-800 border-green-300";
      break;
    case "Rejected":
      message = `Movement ${movement.documentNo} ditolak`;
      icon = "❌";
      bgColor = "bg-red-100 text-red-800 border-red-300";
      break;
    case "Need Revision":
      message = `Movement ${movement.documentNo} perlu revisi`;
      icon = "✏️";
      bgColor = "bg-amber-100 text-amber-800 border-amber-300";
      break;
    case "On Review":
      message = `Movement ${movement.documentNo} sedang direview`;
      icon = "⏳";
      bgColor = "bg-blue-100 text-blue-800 border-blue-300";
      break;
      case STATUS.WAITING_RECEIVE:
      message = `Movement ${movement.documentNo} menunggu penerimaan barang`;
      icon = "📦";
      bgColor = "bg-blue-100 text-blue-800 border-blue-300";
      break;
    default:
      return; // No notification for other statuses
  }
  
  // Show console log
  console.log(`${icon} ${message}`);
  
  // ⭐ TOAST NOTIFICATION (Simple implementation)
  if (isRequester) {
    createToastNotification(icon, message, bgColor);
  }
  
  // ⭐ BROWSER NOTIFICATION (Optional - requires permission)
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Status Movement Updated", {
      body: message,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `movement-${movement.movement_id}`, // Prevent duplicate notifications
    });
  }
};

/* -----------------------------
   6. TOAST NOTIFICATION COMPONENT
------------------------------*/

const createToastNotification = (icon, message, bgColor) => {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 ${bgColor} px-6 py-4 rounded-xl shadow-2xl border-2 flex items-center gap-3 transform transition-all duration-300 animate-slide-in-right`;
  toast.style.maxWidth = '400px';
  
  toast.innerHTML = `
    <span class="text-2xl">${icon}</span>
    <div class="flex-1">
      <p class="font-semibold text-sm">${message}</p>
      <p class="text-xs opacity-75 mt-1">Klik untuk melihat detail</p>
    </div>
    <button class="text-xl hover:scale-110 transition-transform" onclick="this.parentElement.remove()">×</button>
  `;
  
  // Make it clickable
  toast.style.cursor = 'pointer';
  toast.onclick = (e) => {
    if (e.target.tagName !== 'BUTTON') {
      // Scroll to the updated movement (if visible)
      const movementCards = document.querySelectorAll('[data-movement-id]');
      const targetCard = Array.from(movementCards).find(
        card => card.dataset.movementId === message.split(' ')[1]
      );
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.classList.add('ring-4', 'ring-blue-500');
        setTimeout(() => {
          targetCard.classList.remove('ring-4', 'ring-blue-500');
        }, 2000);
      }
      toast.remove();
    }
  };
  
  // Add to document
  document.body.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
};

/* -----------------------------
   7. POLLING FALLBACK (BACKUP)
------------------------------*/

let pollingInterval = null;

const startPollingFallback = () => {
  // Stop existing polling if any
  stopPollingFallback();
  
  console.log("🔄 Starting polling fallback...");
  
  pollingInterval = setInterval(async () => {
    // Only poll if tab is active
    if (document.hidden) return;
    
    console.log("🔄 Polling for updates...");
    
    // Get movements that are in review
    const reviewMovements = movements.value.filter(
      m =>
        m.status === STATUS.ON_REVIEW ||
        m.status === STATUS.WAITING_RECEIVE
    );
    
    if (reviewMovements.length > 0) {
      const ids = reviewMovements.map(m => m.movement_id);
      
      const { data: updated } = await supabase
        .from("gh_movement")
        .select("*")
        .in("movement_id", ids);
      
      updated?.forEach(async (updatedData) => {
        const existing = movements.value.find(
          m => m.movement_id === updatedData.movement_id
        );
        
        // Update if status changed
        if (existing && existing.status !== updatedData.status) {
          console.log(`📝 Polling detected change for ${updatedData.movement_id}: ${existing.status} → ${updatedData.status}`);
          await handleRealtimeUpdate(updatedData);
        }
      });
    }
  }, 30000); // Poll every 30 seconds
};

const stopPollingFallback = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log("⏹️ Polling fallback stopped");
  }
};

/* -----------------------------
   8. FORCE REFRESH FUNCTION
------------------------------*/

const forceRefreshMovements = async () => {
  console.log("🔄 Force refreshing movements...");
  
  // Save scroll position
  const scrollPosition = window.scrollY;
  
  // Show loading indicator (optional)
  loading.value = true;
  
  try {
    // Reset and fetch
    await fetchMovements({ reset: true });
    
    // Show success toast
    createToastNotification(
      "✅", 
      "Data berhasil diperbarui!", 
      "bg-green-100 text-green-800 border-green-300"
    );
  } catch (err) {
    console.error("❌ Error refreshing:", err);
    createToastNotification(
      "❌", 
      "Gagal memperbarui data", 
      "bg-red-100 text-red-800 border-red-300"
    );
  } finally {
    loading.value = false;
    
    // Restore scroll position
    setTimeout(() => {
      window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
    }, 100);
  }
};

/* -----------------------------
   9. REQUEST NOTIFICATION PERMISSION
------------------------------*/

const requestNotificationPermission = async () => {
  if ("Notification" in window) {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      console.log("📢 Notification permission:", permission);
    }
  }
};

/* -----------------------------
   10. UPDATE LIFECYCLE HOOKS
------------------------------*/

onMounted(async () => {
  console.log("🚀 Good Movement mounted");
  
  // Load initial data
  await fetchMovements({ reset: true });
  
  // Load user data
  users.value = JSON.parse(localStorage.getItem("user"));
  
  // Setup realtime subscription
  setupRealtimeSubscription();
  
  // Start polling fallback (safety net)
  startPollingFallback();
  
  // Request notification permission (optional)
  await requestNotificationPermission();
});

onBeforeUnmount(() => {
  console.log("🔌 Good Movement unmounting");
  
  // Unsubscribe from realtime
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    console.log("📡 Realtime subscription removed");
  }
  
  // Stop polling
  stopPollingFallback();
});

const handleRealtimeInsert = async (newRow) => {
  try {
    // Fetch location names for the new row
    const locationIds = [
      newRow.source_location_id,
      newRow.target_location_id,
    ].filter(Boolean);

    const locMap = await fetchLocationNames(locationIds);

    const sourceId = newRow.source_location_id;
    const targetId = newRow.target_location_id;
    const sourceLoc = sourceId ? locMap[sourceId] : null;
    const targetLoc = targetId ? locMap[targetId] : null;

    let locationText = "-";
    if (sourceLoc && targetLoc) {
      locationText = `${sourceLoc} → ${targetLoc}`;
    } else if (sourceLoc && !targetLoc) {
      locationText = `${sourceLoc} → ?`;
    } else if (!sourceLoc && targetLoc) {
      locationText = `? → ${targetLoc}`;
    }

    const newMovement = {
      id: newRow.movement_id,
      movement_id: newRow.movement_id,
      documentNo: newRow.reference_no || "-",
      requester: newRow.created_by || "-",
      movementDateFmt: formatDateTime(newRow.created_at),
      locationText: locationText,
      status: newRow.status || "On Review",
      createdAt: newRow.created_at,
      raw: newRow,
    };

    // Add to the top of the list
    movements.value.unshift(newMovement);
  } catch (err) {
    console.error("❌ Error handling realtime insert:", err);
  }
};

// ===== Lifecycle Hooks =====
onMounted(async () => {
  console.log("🚀 Good Movement mounted");
  await fetchMovements({ reset: true });
  console.log("data: ", movements.value);

  users.value = JSON.parse(localStorage.getItem("user"));
  // Setup realtime subscription
  setupRealtimeSubscription();
});

onBeforeUnmount(() => {
  console.log("🔌 Good Movement unmounting");

  // Unsubscribe from realtime channel
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    console.log("📡 Realtime subscription removed");
  }
});

// ===== Router Helper =====
const detailLink = (mv) => {
  if (!mv.movement_id) {
    return "/goodmovement";
  } else if (mv.status === "Need Revision" && users?.value?.role === "Staff") {
    return { name: "movement-edit", params: { id: mv.movement_id } };
  } else {
    return { name: "detailmovement", params: { id: mv.movement_id } };
  }
};

// ===== Fetch Location Names =====
const fetchLocationNames = async (locationIds) => {
  if (!locationIds || locationIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from("gh_location")
      .select("location_id, location")
      .in("location_id", locationIds);

    if (error) {
      console.error("Error fetching locations:", error);
      return {};
    }

    const locMap = {};
    data?.forEach((loc) => {
      locMap[loc.location_id] = loc.location;
    });

    return locMap;
  } catch (err) {
    console.error("Exception fetching locations:", err);
    return {};
  }
};

// ===== Fetch Movement Batch from Supabase =====
const fetchMovementBatch = async () => {
  try {
    const { data, error } = await supabase
      .from("gh_movement")
      .select(
        `
        movement_id,
        reference_no,
        created_by,
        created_at,
        status,
        source_location_id,
        target_location_id
      `
      )
      .order("created_at", { ascending: false })
      .range(nextStartRow.value, nextStartRow.value + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore.value = false;
      return [];
    }

    // Kumpulkan semua location IDs yang unik
    const locationIds = [
      ...new Set(
        data
          .flatMap((row) => [row.source_location_id, row.target_location_id])
          .filter(Boolean)
      ),
    ];

    // Fetch location names
    const locMap = await fetchLocationNames(locationIds);

    // Mapping data movement
    const mapped = data.map((row) => {
      const sourceId = row.source_location_id;
      const targetId = row.target_location_id;

      const sourceLoc = sourceId ? locMap[sourceId] : null;
      const targetLoc = targetId ? locMap[targetId] : null;

      let locationText = "-";

      if (sourceLoc && targetLoc) {
        // Selalu tampilkan format "Source → Target" meskipun namanya sama
        locationText = `${sourceLoc} → ${targetLoc}`;
      } else if (sourceLoc && !targetLoc) {
        locationText = `${sourceLoc} → ?`;
      } else if (!sourceLoc && targetLoc) {
        locationText = `? → ${targetLoc}`;
      }

      return {
        id: row.movement_id,
        movement_id: row.movement_id,
        documentNo: row.reference_no || "-",
        requester: row.created_by || "-",
        movementDateFmt: formatDateTime(row.created_at),
        locationText: locationText,
        status: row.status || "On Review",
        raw: row,
      };
    });

    // Update pagination
    nextStartRow.value += data.length;
    if (data.length < PAGE_SIZE) {
      hasMore.value = false;
    }

    return mapped;
  } catch (err) {
    console.error("❌ Error in fetchMovementBatch:", err);
    throw err;
  }
};

// ===== Format DateTime =====
const formatDateTime = (dateString) => {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (err) {
    console.error("Error formatting date:", err);
    return dateString;
  }
};

// ===== Fetch Movements (Main Function) =====
const fetchMovements = async ({ reset = false } = {}) => {
  // Prevent duplicate loading
  if (!reset && (loading.value || loadingMore.value)) {
    return;
  }

  if (reset) {
    loading.value = true;
    errorMessage.value = "";
    movements.value = [];
    nextStartRow.value = 0;
    hasMore.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const batch = await fetchMovementBatch();

    if (batch && batch.length > 0) {
      movements.value.push(...batch);
    }
  } catch (err) {
    console.error("❌ Gagal mengambil data movement:", err);
    errorMessage.value = "Gagal mengambil data movement. Silakan coba lagi.";
    hasMore.value = false;
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};
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
