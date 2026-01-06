<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- HEADER -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div
        class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between"
      >
        <div class="flex items-center gap-4">
          <button @click="goBack" class="text-gray-500 hover:text-gray-700">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div>
            <h1
              class="text-2xl font-bold text-gray-900 flex items-center gap-3"
            >
              <span
                class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg"
              >
                📦
              </span>
              Penerimaan Barang
            </h1>
            <p class="text-sm text-gray-500 mt-1">
              Movement:
              <span class="font-semibold">{{
                header?.code || movementId
              }}</span>
            </p>
          </div>
        </div>

        <!-- Status Indicator -->
        <div class="flex items-center gap-4">
          <div :class="statusBadgeClass">
            {{ receivingStatus }}
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- INFO CARD -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Movement Info -->
          <div>
            <h3 class="font-semibold text-gray-700 mb-3">Informasi Movement</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Kode</span>
                <span class="font-medium">{{ header?.code }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Dari</span>
                <span class="font-medium">{{ header?.from_location }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Ke</span>
                <span class="font-medium">{{ header?.to_location }}</span>
              </div>
            </div>
          </div>

          <!-- Request Info -->
          <div>
            <h3 class="font-semibold text-gray-700 mb-3">
              Informasi Permintaan
            </h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Diminta Oleh</span>
                <span class="font-medium">{{ header?.requested_by }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Tanggal</span>
                <span class="font-medium">{{
                  formatDate(header?.requested_at)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Status</span>
                <span :class="headerStatusBadge">
                  {{ header?.status || "Pending" }}
                </span>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="bg-blue-50 rounded-xl p-4">
            <h3 class="font-semibold text-blue-700 mb-3">Ringkasan</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-blue-600">Total Request</span>
                <span class="text-2xl font-bold text-blue-700">{{
                  formatNumber(totalRequested)
                }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-green-600">Total Diterima</span>
                <span class="text-2xl font-bold text-green-700">{{
                  formatNumber(totalReceived)
                }}</span>
              </div>
              <!-- <div
                v-if="hasShortage"
                class="flex justify-between items-center pt-2 border-t border-blue-200"
              >
                <span class="text-red-600">Kekurangan</span>
                <span class="text-xl font-bold text-red-700">{{
                  formatNumber(totalShortage)
                }}</span>
              </div> -->
            </div>
          </div>
        </div>
      </div>

      <!-- FORM PENERIMAAN -->
      <form
        @submit.prevent="handleSubmit"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
      >
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-800">
              Input Kuantitas Diterima
            </h2>
            <p class="text-sm text-gray-500 mt-1">
              Input jumlah barang yang
              <span class="font-semibold text-green-600"
                >sebenarnya diterima</span
              >
              di gudang.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500"
              >Total Item: {{ formRows.length }}</span
            >
            <button
              type="button"
              @click="autoFillAll"
              class="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              Isi Semua Sesuai Request
            </button>
          </div>
        </div>

        <!-- TABEL INPUT -->
        <div class="overflow-x-auto rounded-xl border border-gray-200">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50">
              <tr class="text-xs uppercase text-gray-500">
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">Material</th>
                <th class="px-4 py-3 text-left">UoM</th>
                <th class="px-4 py-3 text-right">Qty Request</th>
                <th class="px-4 py-3 text-right">Qty Diterima</th>
                <!-- <th class="px-4 py-3 text-right">Selisih</th> -->
                <th class="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in formRows"
                :key="row.id"
                class="border-t border-gray-100 hover:bg-gray-50"
              >
                <!-- No -->
                <td class="px-4 py-3 text-gray-500 text-center">
                  {{ index + 1 }}
                </td>

                <!-- Material Info -->
                <td class="px-4 py-3">
                  <div>
                    <p class="font-medium text-gray-800">
                      {{ row.material_name }}
                    </p>
                    <p class="text-xs text-gray-500">{{ row.material_code }}</p>
                  </div>
                </td>

                <!-- UoM -->
                <td class="px-4 py-3 text-gray-600">
                  {{ row.uom }}
                </td>

                <!-- Qty Request -->
                <td class="px-4 py-3 text-right font-semibold text-gray-800">
                  {{ formatNumber(row.qty_request) }}
                </td>

                <!-- Qty Received Input -->
                <td class="px-4 py-3">
                  <div class="flex justify-end">
                    <input
                      type="number"
                      :disabled="
                        user.role === 'kepalagudang' || user.role === 'manager'
                      "
                      v-model.number="row.qty_received"
                      :min="0"
                      :max="row.qty_request"
                      @input="calculateShortage(row)"
                      class="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      :class="
                        row.qty_received > row.qty_request
                          ? 'border-red-300 bg-red-50'
                          : ''
                      "
                    />
                  </div>
                  <p
                    v-if="row.qty_received > row.qty_request"
                    class="text-xs text-red-500 text-right mt-1"
                  >
                    ⚠️ Melebihi request
                  </p>
                </td>

                <!-- Shortage Display -->
                <!-- <td class="px-4 py-3 text-right">
                  <span
                    :class="
                      row.qty_shortage > 0
                        ? 'text-red-600 font-semibold'
                        : 'text-green-600'
                    "
                  >
                    {{
                      row.qty_shortage > 0
                        ? `-${formatNumber(row.qty_shortage)}`
                        : "0"
                    }}
                  </span>
                </td> -->

                <!-- Status Badge -->
                <td class="px-4 py-3 text-center">
                  <span
                    :class="getRowStatusClass(row)"
                    class="px-2 py-1 rounded-full text-xs font-medium"
                  >
                    {{ getRowStatusText(row) }}
                  </span>
                </td>
              </tr>
            </tbody>

            <!-- FOOTER SUMMARY -->
            <tfoot class="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td
                  colspan="3"
                  class="px-4 py-3 text-right font-semibold text-gray-700"
                >
                  TOTAL:
                </td>
                <td class="px-4 py-3 text-right font-bold text-gray-800">
                  {{ formatNumber(totalRequested) }}
                </td>
                <td class="px-4 py-3 text-right font-bold text-green-700">
                  {{ formatNumber(totalReceived) }}
                </td>
                <!-- <td
                  class="px-4 py-3 text-right font-bold"
                  :class="totalShortage > 0 ? 'text-red-700' : 'text-green-700'"
                >
                  {{
                    totalShortage > 0 ? `-${formatNumber(totalShortage)}` : "0"
                  }}
                </td> -->
                <td class="px-4 py-3 text-center">
                  <span
                    :class="overallStatusClass"
                    class="px-3 py-1 rounded-full text-xs font-bold"
                  >
                    {{ overallStatusText }}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <!-- ACTION BUTTONS -->
        <div
          class="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div class="text-sm text-gray-500">
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                :disabled="
                  user.role === 'kepalagudang' || user.role === 'manager'
                "
                v-model="isChecked"
                class="w-4 h-4"
              />
              <span
                ><strong>Saya telah memastikan data dengan benar</strong></span
              >
            </label>
          </div>

          <div
            class="flex gap-3"
            v-if="user.role !== 'kepalagudang' && user.role !== 'manager'"
          >
            <button
              type="button"
              @click="goBack"
              class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="processing || !isFormValid || !isChecked"
              class="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="processing" class="flex items-center gap-2">
                <span
                  class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
                ></span>
                Menyimpan...
              </span>
              <span v-else>Simpan</span>
            </button>
          </div>
        </div>
      </form>

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
import axios from 'axios';
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";
import openbravoApi from "@/lib/openbravo";
import { useAuthStore } from "@/stores/auth";
import logoPG from "@/assets/logoPG.svg";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const movementId = ref(null);
const header = ref(null);
const formRows = ref([]);
const receivingNotes = ref("");
const processing = ref(false);
const loading = ref(true);
const isChecked = ref(false);
const user = JSON.parse(localStorage.getItem("user"));

// ⭐ STATE BARU UNTUK READ-ONLY MODE
const isAlreadyReceived = ref(false);
const receivingHistory = ref(null);

// ⭐ COMPUTED UNTUK DISABLE FORM
const isFormDisabled = computed(() => {
  return (
    isAlreadyReceived.value ||
    user.role === "kepalagudang" ||
    user.role === "manager"
  );
});

// --- COMPUTED PROPERTIES ---
const totalRequested = computed(() => {
  console.log(formRows.value);
  return formRows.value.reduce(
    (sum, row) => sum + (Number(row.qty_request) || 0),
    0
  );
});

const totalReceived = computed(() => {
  return formRows.value.reduce(
    (sum, row) => sum + (Number(row.qty_received) || 0),
    0
  );
});

const totalShortage = computed(() => {
  return formRows.value.reduce(
    (sum, row) => sum + (Number(row.qty_shortage) || 0),
    0
  );
});

const hasShortage = computed(() => totalShortage.value > 0);

const shortageCount = computed(() => {
  return formRows.value.filter((row) => (row.qty_shortage || 0) > 0).length;
});

const isFormValid = computed(() => {
  if (formRows.value.length === 0) return false;
  return formRows.value.every((row) => {
    const received = Number(row.qty_received) || 0;
    const requested = Number(row.qty_request) || 0;
    return received >= 0 && received <= requested;
  });
});

const receivingStatus = computed(() => {
  if (isAlreadyReceived.value) return "Sudah Diterima";
  if (totalReceived.value === 0) return "Belum Diterima";
  if (hasShortage.value) return "Kurang";
  if (totalReceived.value === totalRequested.value) return "Lengkap";
  return "Dalam Proses";
});

const statusBadgeClass = computed(() => {
  if (isAlreadyReceived.value)
    return "bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm";
  if (totalReceived.value === 0)
    return "bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm";
  if (hasShortage.value)
    return "bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm";
  if (totalReceived.value === totalRequested.value)
    return "bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm";
  return "bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm";
});

const headerStatusBadge = computed(() => {
  const status = header.value?.status?.toLowerCase();
  if (status?.includes("approved"))
    return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs";
  if (status?.includes("pending"))
    return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs";
  if (status?.includes("rejected"))
    return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs";
  return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs";
});

const overallStatusText = computed(() => {
  if (isAlreadyReceived.value) return "SUDAH DITERIMA";
  if (totalReceived.value === 0) return "BELUM DITERIMA";
  if (hasShortage.value) return "Kurang";
  if (totalReceived.value === totalRequested.value) return "LENGKAP";
  return "DALAM PROSES";
});

const overallStatusClass = computed(() => {
  if (isAlreadyReceived.value) return "bg-green-100 text-green-800";
  if (totalReceived.value === 0) return "bg-gray-200 text-gray-700";
  if (hasShortage.value) return "bg-amber-100 text-amber-800";
  if (totalReceived.value === totalRequested.value)
    return "bg-green-100 text-green-800";
  return "bg-blue-100 text-blue-800";
});

// --- HELPER FUNCTIONS ---
const formatNumber = (value) => {
  if (value === null || value === undefined) return "0";
  return new Intl.NumberFormat("id-ID").format(value);
};

const updateStockAfterReceiving = async () => {
  // 🔒 STOK DIKELOLA OLEH OPENBRAVO
  // Supabase TIDAK menyimpan stok fisik
  // Fungsi ini sengaja dikosongkan agar flow tidak error

  console.log(
    "ℹ️ updateStockAfterReceiving dilewati (stok dikelola OpenBravo)"
  );

  return true;
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

const calculateShortage = (row) => {
  const requested = Number(row.qty_request) || 0;
  const received = Number(row.qty_received) || 0;
  row.qty_shortage = Math.max(0, requested - received);
};

const getRowStatusClass = (row) => {
  const received = Number(row.qty_received) || 0;
  const requested = Number(row.qty_request) || 0;

  if (received === 0) return "bg-gray-100 text-gray-800";
  if (received === requested) return "bg-green-100 text-green-800";
  if (received < requested) return "bg-amber-100 text-amber-800";
  if (received > requested) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
};

const getRowStatusText = (row) => {
  const received = Number(row.qty_received) || 0;
  const requested = Number(row.qty_request) || 0;

  if (received === 0) return "Belum";
  if (received === requested) return "Lengkap";
  if (received < requested) return "Kurang";
  if (received > requested) return "Lebih";
  return "-";
};

const autoFillAll = () => {
  if (isFormDisabled.value) return;

  formRows.value.forEach((row) => {
    row.qty_received = row.qty_request;
    calculateShortage(row);
  });
};

// ------------------------------------------------------------------
// FUNGSI HELPER UNTUK CEK STATUS DATA
// ------------------------------------------------------------------
const getOrCreateLocationIdFromObWarehouse = async (obWarehouseId, name) => {
  const { data } = await supabase
    .from("gh_location")
    .select("location_id")
    .eq("id_openbravo", obWarehouseId)
    .maybeSingle();

  if (data?.location_id) return data.location_id;

  const { data: inserted, error } = await supabase
    .from("gh_location")
    .insert({
      id_openbravo: obWarehouseId,
      location: name || "(Unknown)",
    })
    .select("location_id")
    .single();

  if (error) {
    console.error("Gagal membuat lokasi baru:", error);
    throw error;
  }

  return inserted.location_id;
};

const getDefaultStorageBinByWarehouse = async (warehouseId) => {
  const res = await openbravoApi.get(`/Locator`, {
    params: {
      _where: `warehouse='${warehouseId}'`,
      _selectedProperties: "id,_identifier,default",
    },
  });

  const bins = res.data?.response?.data || [];

  if (!bins.length) {
    throw new Error("Storage Bin tidak ditemukan untuk warehouse ini");
  }

  // 1️⃣ cari default
  const defaultBin = bins.find((b) => b.default === true);

  // 2️⃣ fallback ke bin pertama
  return defaultBin || bins[0];
};

// Fungsi untuk cek apakah ada data pending di localStorage
const checkPendingData = () => {
  const pendingData = localStorage.getItem("movementReceiving");

  if (pendingData) {
    const data = JSON.parse(pendingData);

    if (data.is_pending_database) {
      console.warn("⚠️ Ditemukan data pending yang belum masuk");
      console.log("Movement ID:", data.movement_id);
      console.log("Created at:", data.created_at);
      return data;
    }
  }

  return null;
};

// Fungsi untuk restore data jika user kembali ke halaman receiving
const restorePendingData = () => {
  const pendingData = checkPendingData();

  if (pendingData && pendingData.movement_id === movementId.value) {
    console.log("♻️ Restoring pending data...");

    // Restore formRows dengan data yang sudah diinput sebelumnya
    formRows.value = pendingData.items.map((item) => ({
      id: item.id,
      movement_item_id: item.movement_item_id,
      material_used_id: item.material_used_id,
      material_code: item.material_code,
      material_name: item.material_name,
      uomId: item.uomId,
      uom: item.uom,
      qty_request: item.qty_request,
      qty_received: item.qty_received,
      qty_shortage: item.qty_shortage,
      notes: item.notes,
    }));

    return true;
  }

  return false;
};

const checkReceivingStatus = async () => {
  try {
    const { data: existing, error } = await supabase
      .from("gh_movement_receiving")
      .select(
        `
        *,
        gh_movement_receiving_item (
          *,
          gh_material_used (
            material_name,
            openbravo_id,
            uom
          )
        )
      `
      )
      .eq("movement_id", movementId.value)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    console.log("Existing receiving data:", existing);

    if (existing) {
      // Sudah pernah diterima
      isAlreadyReceived.value = true;
      receivingHistory.value = existing;

      // Load data ke formRows untuk ditampilkan (read-only)
      if (existing.gh_movement_receiving_item?.length > 0) {
        formRows.value = existing.gh_movement_receiving_item.map((item) => ({
          id: item.receiving_item_id,
          movement_item_id: item.movement_item_id,
          material_used_id: item.material_used_id,
          material_code: item.gh_material_used?.openbravo_id || "-",
          material_name: item.gh_material_used?.material_name || "-",
          uom: item.gh_material_used?.uom || "pcs",
          qty_request: item.qty_requested,
          qty_received: item.qty_received,
          qty_shortage: item.qty_shortage,
          notes: item.notes || "",
        }));
      }

      // Load header info tetap diperlukan
      await loadHeaderOnly();
    } else {
      // Belum pernah diterima, load data movement normal
      isAlreadyReceived.value = false;
      await loadMovementData();
    }
  } catch (error) {
    console.error("Error checking receiving status:", error);
    alert("Gagal mengecek status penerimaan");
  }
};

const loadHeaderOnly = async () => {
  try {
    const { data: movement, error: moveError } = await supabase
      .from("gh_movement")
      .select("*")
      .eq("movement_id", movementId.value)
      .single();

    if (moveError || !movement) {
      throw new Error("Movement tidak ditemukan di Supabase.");
    }

    console.log("Loaded movement:", movement);

    const { data: locations } = await supabase
      .from("gh_location")
      .select("location_id, location, id_openbravo");

    const findLocationName = (idOrUuid) => {
      if (!idOrUuid || !locations) return "Unknown";
      const found = locations.find(
        (loc) => loc.location_id == idOrUuid || loc.id_openbravo == idOrUuid
      );
      return found ? found.location : `ID: ${idOrUuid}`;
    };

    const findLocationId = (idOrUuid) => {
      if (!idOrUuid || !locations) return "Unknown";
      const found = locations.find(
        (loc) => loc.location_id == idOrUuid || loc.id_openbravo == idOrUuid
      );
      return found ? found.id_openbravo : `ID: ${idOrUuid}`;
    };

    header.value = {
      id: movement.movement_id,
      code: movement.reference_no || `MOV-${movement.movement_id}`,
      from_location: findLocationName(movement.source_location_id),
      to_location: findLocationName(movement.target_location_id),
      from_location_id_ob: findLocationId(movement.source_location_id),
      to_location_id_ob: findLocationId(movement.target_location_id),
      requested_by: movement.created_by,
      requested_at: movement.created_at,
      uomId: movement.uom_id,
      status: movement.status,
      receive_status: movement.receive_status,
    };

    console.log("Header: ", header);
  } catch (error) {
    console.error("Error loading header:", error);
  }
};

// --- LOAD MOVEMENT DATA (untuk mode input) ---
const loadMovementData = async () => {
  if (isAlreadyReceived.value) return;

  try {
    loading.value = true;

    const { data: movement, error: moveError } = await supabase
      .from("gh_movement")
      .select("*")
      .eq("movement_id", movementId.value)
      .single();

    if (moveError || !movement) {
      throw new Error("Movement tidak ditemukan di Supabase.");
    }

    console.log("Loaded movement:", movement);

    const { data: locations } = await supabase
      .from("gh_location")
      .select("location_id, location, id_openbravo");

    const findLocationName = (idOrUuid) => {
      if (!idOrUuid || !locations) return "Unknown";
      const found = locations.find(
        (loc) => loc.location_id == idOrUuid || loc.id_openbravo == idOrUuid
      );
      return found ? found.location : `ID: ${idOrUuid}`;
    };

    const findLocationId = (idOrUuid) => {
      if (!idOrUuid || !locations) return "Unknown";
      const found = locations.find(
        (loc) => loc.location_id == idOrUuid || loc.id_openbravo == idOrUuid
      );
      return found ? found.id_openbravo : `ID: ${idOrUuid}`;
    };

    header.value = {
      id: movement.movement_id,
      openbravo_id: movement.openbravo_id,
      code: movement.reference_no || `MOV-${movement.movement_id}`,
      from_location: findLocationName(movement.source_location_id),
      to_location: findLocationName(movement.target_location_id),
      from_location_id_ob: findLocationId(movement.source_location_id),
      to_location_id_ob: findLocationId(movement.target_location_id),
      requested_by: movement.created_by,
      requested_at: movement.created_at,
      status: movement.status,
      receive_status: movement.receive_status,
    };

    console.log("Header: ", header);

    const { data: items } = await supabase
      .from("gh_movement_item")
      .select("*")
      .eq("movement_id", movementId.value);

    if (items && items.length > 0) {
      const materialIds = items
        .map((item) => item.material_used_id)
        .filter((id) => id);

      let materialMap = {};

      if (materialIds.length > 0) {
        const { data: materials } = await supabase
          .from("gh_material_used")
          .select("*")
          .in("material_used_id", materialIds);

        if (materials) {
          materials.forEach((material) => {
            materialMap[material.material_used_id] = material;
          });
        }
      }

      formRows.value = items.map((item) => {
        const material = materialMap[item.material_used_id];
        const qtyRequest = item.qty || 0;
        const qtyReceived = item.qty_received || 0;

        return {
          id: item.movement_item_id,
          movement_item_id: item.movement_item_id,
          material_used_id: item.material_used_id,
          material_code:
            material?.openbravo_id || `MAT-${item.material_used_id}`,
          material_name: material?.material_name || "Unknown Material",
          uom: material?.uom || "pcs",
          qty_request: qtyRequest,
          qty_received: qtyReceived,
          qty_shortage: Math.max(0, qtyRequest - qtyReceived),
          notes: item.notes || "",
        };
      });

      console.log("formRows: ", formRows);
    }
  } catch (error) {
    console.error("Error loading movement data:", error);
    alert(`Gagal memuat data: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// --- FUNGSI BARU: SIMPAN KE DATABASE SUPABASE ---
const saveToSupabase = async () => {
  console.log("💾 Menyimpan data receiving real ke Supabase...");

  // 1. CEK DATA EKSISTING (Mencegah Double Input)
  const { data: existingCheck, error: checkError } = await supabase
    .from("gh_movement_receiving")
    .select("receiving_id")
    .eq("movement_id", movementId.value)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') throw checkError;
  if (existingCheck) {
    throw new Error("STOP! Data penerimaan untuk Movement ini SUDAH ADA di database.");
  }

  // 2. INSERT HEADER (gh_movement_receiving)
  // Menyimpan data real penerimaan sesuai input staff
  const { data: receivingData, error: receivingError } = await supabase
    .from("gh_movement_receiving")
    .insert({
      movement_id: movementId.value,
      received_by: auth.user?.user_id || user.id,
      received_at: new Date().toISOString(),
      
      // ✅ Sesuai struktur tabel baru:
      total_requested: totalRequested.value, 
      total_received: totalReceived.value,
      total_shortage: totalShortage.value,
      
      status: totalShortage.value > 0 ? "Partial" : "Completed",
      notes: receivingNotes.value || "",
    })
    .select("receiving_id")
    .single();

  if (receivingError) throw receivingError;

  // 3. INSERT ITEMS (gh_movement_receiving_item)
  const itemsData = formRows.value.map((row) => ({
    receiving_id: receivingData.receiving_id,
    movement_item_id: row.movement_item_id,
    material_used_id: row.material_used_id,
    
    qty_requested: row.qty_request,
    qty_received: row.qty_received, // Input real staff
    qty_shortage: row.qty_shortage, // Hitungan selisih
    notes: row.notes || "",
    
    // Karena dipanggil setelah sendToOpenBravo sukses:
    openbravo_synced: true,
    openbravo_sync_at: new Date().toISOString()
  }));

  const { error: itemsError } = await supabase
    .from("gh_movement_receiving_item")
    .insert(itemsData);

  if (itemsError) throw itemsError;

  console.log("✅ Berhasil tersimpan di tabel Supabase Receiving");
};


// --- SUBMIT FUNCTION ---
const handleSubmit = async () => {
  if (isAlreadyReceived.value) {
    alert("⚠️ Penerimaan barang untuk movement ini sudah pernah dilakukan!");
    return;
  }

  if (!isFormValid.value || !isChecked.value) {
    alert("Periksa kembali input Anda dan centang konfirmasi.");
    return;
  }

  if (
    !confirm(
      `Simpan penerimaan barang?\nRequest: ${formatNumber(
        totalRequested.value
      )}\nDiterima: ${formatNumber(totalReceived.value)}`
    )
  ) {
    return;
  }

  processing.value = true;

  try {
    // 1. Kirim ke OpenBravo (Code lama tetap berjalan)
    await sendToOpenBravo();

    // 2. (BARU) Simpan ke Database Supabase agar data masuk
    await saveToSupabase();

    // 3. Logic Penyimpanan LocalStorage (untuk Berita Acara jika ada selisih)
    if (totalShortage.value > 0) {
      const itemsDetail = formRows.value.map((row) => ({
        id: row.id,
        movement_item_id: row.movement_item_id,
        material_used_id: row.material_used_id,
        material_code: row.material_code,
        material_name: row.material_name,
        uom: row.uom,
        qty_request: row.qty_request,
        qty_received: row.qty_received,
        qty_shortage: row.qty_shortage,
        notes: row.notes || "",
      }));

      const data_sementara = {
        movement_id: movementId.value,
        received_by: auth.user?.user_id || "System",
        total_requested: totalRequested.value,
        total_received: totalReceived.value,
        total_shortage: totalShortage.value,
        status: "partial",
        items: itemsDetail,
        created_at: new Date().toISOString(),
        is_pending_database: true,
      };

      console.log("💾 Menyimpan ke localStorage:", data_sementara);
      localStorage.setItem("movementReceiving", JSON.stringify(data_sementara));
      localStorage.setItem("header", JSON.stringify(header.value));
      sessionStorage.setItem(
        "movementReceiving_backup",
        JSON.stringify(data_sementara)
      );

      alert(
        `✅ Data Berhasil Disimpan (Partial)!\n\nAnda akan diarahkan ke halaman Berita Acara.`
      );
      router.push({ name: "movement-berita-acara" });
    } else {
      // 4. (BARU) Jika LENGKAP (Tidak ada selisih), langsung selesai
      // Hapus sisa data localstorage jika ada agar bersih
      localStorage.removeItem("movementReceiving");
      
      alert("✅ Penerimaan Barang Berhasil Disimpan (Lengkap)!");
      // Redirect kembali ke halaman list movement
      router.push("/goodmovement"); 
    }
  } catch (error) {
    console.error("❌ Error saving receiving:", error);
    const errorMsg =
      error.response?.data?.response?.error?.message || error.message;
    alert(`Gagal menyimpan data: ${errorMsg}`);
  } finally {
    processing.value = false;
  }
};

const sendToOpenBravo = async () => {
  console.log("🚀 Memulai proses sinkronisasi OpenBravo (Sesuai Request Awal)...");

  // 1. Setup Credential
  const apiUser = 'admin'; 
  const apiPass = '$2a$12$IezF1Wq519tcc.x.BA5Ame4OSstZm6kJ8b7u3lhWelwg6/6zr8U3y'; 
  const authToken = btoa(unescape(encodeURIComponent(`${apiUser}:${apiPass}`)));

  // 2. Persiapan Data Lokasi/Bin
  const fromBin = await getDefaultStorageBinByWarehouse(header.value.from_location_id_ob);
  const toBin = await getDefaultStorageBinByWarehouse(header.value.to_location_id_ob);

  if (!fromBin?.id || !toBin?.id) {
    throw new Error("Gagal mendapatkan ID Bin (Locator) untuk gudang asal/tujuan.");
  }

  // STEP 1: CREATE HEADER
  const movementDate = new Date().toISOString().split("T")[0];
  const headerName = `${header.value.code}-${Date.now()}`;

  const headerPayload = {
    data: [{
      _entityName: "MaterialMgmtInternalMovement",
      name: headerName, 
      movementDate: movementDate,
      description: `Auto-Move: ${header.value.code}`
    }],
  };

  const headerRes = await openbravoApi.post("/MaterialMgmtInternalMovement", headerPayload);

  if (headerRes?.data?.response?.status !== 0) {
    throw new Error(`Gagal membuat Header: ${headerRes?.data?.response?.error?.message}`);
  }

  const obMovementId = headerRes.data?.response?.data?.[0]?.id;
  if (!obMovementId) throw new Error("Gagal mendapatkan ID Header dari OpenBravo.");
  
  console.log(`✅ Header Created! ID: ${obMovementId}`);

  // STEP 2: CREATE LINES (Looping per Item)
  let successCount = 0;

  for (const row of formRows.value) {
    try {
      const uomId = await getProductUomId(row.material_code);
      if (!uomId) throw new Error(`UOM tidak ditemukan untuk product ${row.material_code}`);
      
      // ✅ PERUBAHAN UTAMA DISINI: 
      // Menggunakan qty_request (Rencana) untuk OpenBravo, bukan qty_received (Aktual)
      const qtyToSend = Number(row.qty_request) || 0; 
      
      if (qtyToSend <= 0) continue; 

      const linePayload = {
        data: [{
          _entityName: "MaterialMgmtInternalMovementLine",
          movement: obMovementId, 
          lineNo: (successCount + 1) * 10,
          storageBin: fromBin.id,     
          newStorageBin: toBin.id,    
          product: row.material_code, 
          movementQuantity: qtyToSend, // Mengirim Qty Request
          uOM: uomId,
        }]
      };

      const lineRes = await openbravoApi.post("/MaterialMgmtInternalMovementLine", linePayload);

      if (lineRes?.data?.response?.status !== 0) {
        throw new Error(`Gagal membuat line untuk ${row.material_name}`);
      }
      
      successCount++;

    } catch (err) {
      console.error(`Error creating line for ${row.material_name}:`, err);
      throw new Error(`Gagal pada item ${row.material_name}: ${err.message}`);
    }
  }

  if (successCount === 0) {
    await openbravoApi.delete(`/MaterialMgmtInternalMovement/${obMovementId}`).catch(() => {});
    throw new Error("Tidak ada item yang berhasil diproses ke OpenBravo.");
  }

  // STEP 3: PROCESS DOCUMENT
  console.log("3. Processing Document...");
  
  const processEndpoint = 'https://mhnproc.pirantisolusi.com/api/process';
  const processPayload = {
    ad_process_id: "122", 
    ad_client_id: "0",    
    ad_org_id: "0",       
    data: [{ id: String(obMovementId) }]
  };

  try {
    const processRes = await axios.post(processEndpoint, processPayload, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${authToken}` },
      timeout: 60000
    });

    const resultData = processRes.data?.data?.[0];
    
    if (resultData && resultData.result === 1) {
      console.log("✅ Document Processed Successfully!");
    } else {
      console.warn("⚠️ Document Created but Process Failed:", resultData?.errormsg);
      alert(`Info: Data masuk ke OpenBravo sebagai Draft (ID: ${obMovementId}), namun gagal diproses otomatis.`);
    }

  } catch (procErr) {
    console.error("Error Processing Document:", procErr);
    alert("Data terkirim ke OpenBravo (Draft), namun gagal melakukan Post Process.");
  }

  // STEP 4: UPDATE STATUS LOKAL (SUPABASE MOVEMENT)
  // Status movement menjadi Approved/Completed secara sistem karena OB sudah jalan
  const { error: updateError } = await supabase
    .from("gh_movement")
    .update({ status: "Approved" })
    .eq("movement_id", movementId.value); // Gunakan eq untuk keamanan

  if (updateError) throw updateError;
};

const getProductUomId = async (productId) => {
  const res = await openbravoApi.get("/Product", {
    params: {
      _where: `id='${productId}'`,
      _selectedProperties: "uOM",
    },
  });

  const product = res.data?.response?.data?.[0];
  return product?.uOM || null;
};

const goBack = () => {
  router.back();
};

// --- INITIALIZATION ---
onMounted(async () => {
  const rawId = route.params.id;

  if (rawId) {
    const cleanId = String(rawId).split(":")[0];
    movementId.value = parseInt(cleanId);
  }

  if (!movementId.value || isNaN(movementId.value)) {
    alert("ID Movement tidak valid");
    router.push("/goodmovement");
    return;
  }

  // ⭐ CEK STATUS PENERIMAAN TERLEBIH DAHULU
  await checkReceivingStatus();
  await loadMovementData();

  // ⭐ CEK APAKAH ADA DATA PENDING DI LOCALSTORAGE
  const hasPendingData = restorePendingData();

  if (hasPendingData) {
    console.log("ℹ️ Data pending ditemukan dan di-restore");

    // Tampilkan warning banner di UI
    const showWarning = confirm(
      "⚠️ Ditemukan data penerimaan yang belum selesai untuk movement ini.\n\n" +
        "Apakah Anda ingin melanjutkan mengisi Berita Acara?\n\n" +
        "Klik OK untuk lanjut ke Berita Acara\n" +
        "Klik Cancel untuk input ulang dari awal"
    );

    if (showWarning) {
      router.push({ name: "movement-berita-acara" });
    } else {
      // Hapus data pending dan mulai dari awal
      localStorage.removeItem("movementReceiving");
      sessionStorage.removeItem("movementReceiving_backup");
      await loadMovementData();
    }
  }

  loading.value = false;
});
</script>
