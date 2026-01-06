<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              class="w-5 h-5 fill-current"
            >
              <path
                d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z"
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
                ✏️
              </span>
              Edit Movement
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13" v-if="createdByName">
              Dibuat oleh:
              <span class="font-semibold">{{ createdByName || "-" }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div
        v-if="rejectionNote"
        class="mb-6 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <span class="text-2xl">📝</span>
          <div class="flex-1">
            <h3 class="font-bold text-red-800">Catatan Penolakan / Revisi:</h3>
            <p class="text-sm text-red-700 mt-1 italic">
              "{{ rejectionNote }}"
            </p>
            <p class="text-xs text-red-500 mt-2 font-semibold">
              Silakan perbaiki data sesuai catatan di atas lalu simpan kembali.
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="blockedMessage"
        class="mb-6 rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4"
      >
        <div class="flex items-start gap-3">
          <span class="text-xl">⚠️</span>
          <p class="text-sm text-yellow-800 font-medium">
            {{ blockedMessage }}
          </p>
        </div>
      </div>

      <div
        v-if="successMsg"
        class="mb-6 rounded-xl border-2 border-green-300 bg-green-50 p-4"
      >
        <div class="flex items-start gap-3">
          <span class="text-xl">✅</span>
          <p class="text-sm text-green-800 font-medium">{{ successMsg }}</p>
        </div>
      </div>

      <div
        class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6 sm:p-8"
      >
        <div
          class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6"
        >
          <div>
            <h2 class="text-xl font-bold text-gray-900">
              {{ movementName || "Edit Movement" }}
            </h2>
            <p class="text-sm text-gray-500 mt-1">
              {{ fmtDateID(selectedDate) }}
            </p>
          </div>
          <span
            v-if="headerStatusText"
            class="text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap"
            :class="
              headerStatusText === 'Approved'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            "
          >
            {{
              headerStatusText === "Approved"
                ? "✅ Approved"
                : "⏳ " + headerStatusText
            }}
          </span>
        </div>

        <div class="my-6 border-t border-gray-200"></div>

        <div v-if="loading" class="space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
            <div class="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
          <div class="h-40 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>

        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <label
                class="block text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1"
              >
                📅 Tanggal Movement
              </label>
              <input
                type="date"
                v-model="selectedDate"
                :disabled="isApproved"
                class="w-full text-sm font-bold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 disabled:opacity-60 p-0"
              />
            </div>

            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <label
                class="block text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1"
              >
                🔢 No. Referensi
              </label>
              <p class="text-sm font-bold text-gray-900">
                {{ movementName || "-" }}
              </p>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-900 mb-3"
              >Pilih Lokasi / Gudang</label
            >
            <div
              class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center"
            >
              <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <p class="text-xs text-gray-500 font-semibold mb-2">
                  Lokasi Asal
                </p>
                <select
                  v-model="fromLocation"
                  :disabled="isApproved"
                  class="w-full bg-transparent border-0 text-sm font-bold text-gray-900 focus:outline-none focus:ring-0 disabled:opacity-60 p-0"
                >
                  <option disabled value="">Pilih Lokasi Asal</option>
                  <option
                    v-for="loc in locations"
                    :key="loc.location_id"
                    :value="loc"
                  >
                    {{ loc.location }}
                  </option>
                </select>
              </div>

              <div class="hidden sm:flex items-center justify-center">
                <div
                  class="w-10 h-10 bg-gradient-to-r from-[#0071f3] to-[#8FABD4] rounded-full flex items-center justify-center text-white font-bold shadow-md"
                >
                  →
                </div>
              </div>

              <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <p class="text-xs text-gray-500 font-semibold mb-2">
                  Lokasi Tujuan
                </p>
                <select
                  v-model="toLocation"
                  :disabled="isApproved"
                  class="w-full bg-transparent border-0 text-sm font-bold text-gray-900 focus:outline-none focus:ring-0 disabled:opacity-60 p-0"
                >
                  <option disabled value="">Pilih Lokasi Tujuan</option>
                  <option
                    v-for="loc in locationOptions"
                    :key="loc.location_id"
                    :value="loc"
                  >
                    {{ loc.location }}
                  </option>
                </select>
              </div>
            </div>

            <p
              v-if="
                fromLocation &&
                toLocation &&
                fromLocation.location_id === toLocation.location_id
              "
              class="text-sm text-red-600 mt-3 flex items-center gap-2"
            >
              ⚠️ Lokasi asal dan tujuan tidak boleh sama.
            </p>
          </div>

          <div class="my-6 border-t border-gray-200"></div>

          <div>
            <div class="flex items-center justify-between mb-4">
              <h3
                class="text-lg font-bold text-gray-900 flex items-center gap-2"
              >
                📦 Daftar Material
              </h3>

              <button
                :disabled="modalLoading || isApproved"
                @click="openMaterialModal"
                class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                :class="
                  modalLoading || isApproved
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white shadow-md hover:shadow-lg'
                "
              >
                <span v-if="modalLoading">⏳</span>
                <span v-else>+</span>
                Tambah Material
              </button>
            </div>

            <div
              v-if="materials.length === 0"
              class="text-center py-8 bg-gray-50 rounded-xl border border-gray-200"
            >
              <p class="text-gray-500 text-sm">Belum ada material</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(item, index) in materials"
                :key="index"
                class="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-[#0071f3] transition-all"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-center gap-3 flex-1">
                    <div
                      class="w-12 h-12 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    >
                      {{ (item.name || "?").charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1">
                      <p class="font-bold text-gray-900">
                        {{ item.name || "-" }}
                      </p>
                      <div class="flex items-center gap-2 mt-1">
                        <span
                          class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold"
                        >
                          {{ item.uom || "-" }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <input
                      v-model.number="item.amount"
                      type="number"
                      min="0"
                      :disabled="isApproved"
                      class="w-24 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0071f3] transition disabled:opacity-50 disabled:bg-gray-100"
                      placeholder="0"
                    />
                    <button
                      @click="removeMaterial(index)"
                      :disabled="isApproved"
                      class="text-red-500 hover:text-red-700 transition disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="my-8 border-t border-gray-200"></div>

          <div class="flex flex-wrap gap-3 justify-end">
            <button
              @click="goBack"
              class="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              @click="submitUpdate"
              :disabled="submitLoading || isApproved"
              class="flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div
                v-if="submitLoading"
                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              ></div>
              <span v-else>💾</span>
              {{ submitLoading ? "Menyimpan..." : "Simpan & Ajukan" }}
            </button>
          </div>
        </template>
      </div>
    </div>
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="showModal = false"
      ></div>

      <div
        class="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl z-10 p-6 max-h-[90vh] flex flex-col"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-xl text-gray-900">Pilih Material</h3>
            <p class="text-xs text-gray-500">
              Sumber: Master Material (Supabase)
            </p>
          </div>
          <button
            @click="showModal = false"
            class="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div class="relative mb-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama material..."
            class="w-full border-2 border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-[#0071f3] outline-none"
          />
          <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>

        <div class="flex-1 overflow-y-auto pr-2">
          <div v-if="modalLoading" class="text-center py-8">
            ⏳ Memuat data...
          </div>
          <div v-else-if="filteredItems.length === 0" class="text-center py-8">
            Tidak ada item ditemukan. <br />
            <span class="text-xs text-gray-400"
              >(Pastikan data tersedia di tabel gh_material_used)</span
            >
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(item, index) in filteredItems"
              :key="index"
              @click="selectItem(item)"
              class="flex items-center justify-between border rounded-xl p-3 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  :style="{ backgroundColor: item.color }"
                >
                  {{ item.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="font-bold text-gray-900">{{ item.name }}</p>
                  <p class="text-xs text-gray-500">
                    {{ item.uom ? `UOM: ${item.uom}` : "No UOM" }}
                  </p>
                </div>
              </div>
              <button
                class="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
              >
                Pilih
              </button>
            </div>
          </div>
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
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "@/lib/supabase";
import logoPG from "@/assets/logoPG.svg";

const router = useRouter();
const route = useRoute();

// ===== STATE
const loading = ref(true);
const submitLoading = ref(false);
const successMsg = ref("");
const blockedMessage = ref("");
const rejectionNote = ref(""); // Menyimpan catatan revisi

// header & status
const movementName = ref("");
const isApproved = ref(false);
const headerStatusText = ref("");
const createdByName = ref("");
const selectedDate = ref("");

// locations
const locations = ref([]);
const fromLocation = ref("");
const toLocation = ref("");

// materials
const materials = ref([]);
const availableItems = ref([]);

// modal
const showModal = ref(false);
const modalLoading = ref(false);
const searchQuery = ref("");

// ===== UTIL
const randColor = () => {
  const palette = [
    "#CDB4DB",
    "#BDE0FE",
    "#FFC8DD",
    "#A2D2FF",
    "#CFE9A8",
    "#FFEE93",
  ];
  return palette[Math.floor(Math.random() * palette.length)];
};
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fmtDateID = (yyyyMmDd) => {
  if (!yyyyMmDd) return "-";
  try {
    const d = new Date(yyyyMmDd);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return yyyyMmDd;
  }
};

// ======================================================
// 1. LOAD DATA DARI SUPABASE
// ======================================================
onMounted(async () => {
  loading.value = true;
  const id = route.params.id;

  try {
    if (!id) throw new Error("ID Movement tidak ditemukan");

    // A. Load Master Locations (untuk dropdown)
    await loadLocations();

    // B. Load Movement Header
    const { data: header, error: headErr } = await supabase
      .from("gh_movement")
      .select("*")
      .eq("movement_id", id)
      .single();

    if (headErr) throw headErr;
    if (!header) throw new Error("Data Movement tidak ditemukan");

    // Populate Header
    movementName.value = header.reference_no;
    selectedDate.value = formatDate(header.movement_date);
    createdByName.value = header.created_by;
    headerStatusText.value = header.status || "Waiting";

    // Cek Status Lock
    isApproved.value = (header.status || "").toLowerCase() === "approved";
    if (isApproved.value) {
      blockedMessage.value =
        "Dokumen sudah Approved. Perubahan tidak diperbolehkan.";
    }

    // 🔴 FETCH CATATAN REVISI / REJECTED
    // Jika status "Need Revision" atau "Rejected", cari catatannya
    const status = (header.status || "").toLowerCase();
    if (status.includes("revision") || status.includes("rejected")) {
      const { data: record } = await supabase
        .from("gh_approve_record")
        .select("record_id")
        .eq("reference_id", id)
        .eq("reference_type", "movement")
        .maybeSingle();

      if (record) {
        // Ambil catatan dari level yang rejected/needRevision
        const { data: levelStatus } = await supabase
          .from("gh_approval_level_status")
          .select("revision_notes, status")
          .eq("record_id", record.record_id)
          .in("status", ["rejected", "needRevision"]) // Cari yang ditolak/revisi
          .order("updated_at", { ascending: false }) // Ambil yang terbaru
          .limit(1)
          .maybeSingle();

        if (levelStatus && levelStatus.revision_notes) {
          rejectionNote.value = levelStatus.revision_notes;
        }
      }
    }

    // C. Load Source Location
    if (header.source_location_id) {
      const { data: srcData } = await supabase
        .from("gh_location")
        .select("*")
        .eq("location_id", header.source_location_id)
        .maybeSingle();
      if (srcData)
        fromLocation.value =
          locations.value.find((l) => l.location_id === srcData.location_id) ||
          srcData;
    }

    // D. Load Target Location
    if (header.target_location_id) {
      const { data: tgtData } = await supabase
        .from("gh_location")
        .select("*")
        .eq("location_id", header.target_location_id)
        .maybeSingle();
      if (tgtData)
        toLocation.value =
          locations.value.find((l) => l.location_id === tgtData.location_id) ||
          tgtData;
    }

    // E. Load Items
    const { data: rows, error: rowsErr } = await supabase
      .from("gh_movement_item")
      .select("*")
      .eq("movement_id", id);

    if (rowsErr) throw rowsErr;

    // F. Load Material Names
    if (rows.length > 0) {
      const matIds = rows.map((r) => r.material_used_id);
      const { data: mats, error: matsErr } = await supabase
        .from("gh_material_used")
        .select("*")
        .in("material_used_id", matIds);

      if (matsErr) throw matsErr;

      const matMap = {};
      mats?.forEach((m) => (matMap[m.material_used_id] = m));

      materials.value = rows.map((r) => ({
        materialUsedId: r.material_used_id,
        name: matMap[r.material_used_id]?.material_name || "Unknown Item",
        uom: r.uom || matMap[r.material_used_id]?.uom,
        amount: r.qty,
        color: randColor(),
      }));
    }
  } catch (e) {
    console.error("Error loading data:", e);
    blockedMessage.value = "Gagal memuat data: " + (e.message || e.details);
  } finally {
    loading.value = false;
  }
});

// ======================================================
// 2. FETCHERS (MASTER DATA)
// ======================================================
const loadLocations = async () => {
  try {
    const { data, error } = await supabase
      .from("gh_location")
      .select("*")
      .order("location", { ascending: true });
    if (error) throw error;
    locations.value = data || [];
  } catch (e) {
    console.error("Gagal load locations:", e);
  }
};

const loadMaterialsForModal = async () => {
  modalLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("gh_material_used")
      .select("material_used_id, material_name, uom")
      .limit(100);

    if (error) throw error;

    const uniqueMap = new Map();
    data.forEach((m) => {
      if (!uniqueMap.has(m.material_name)) {
        uniqueMap.set(m.material_name, {
          id: m.material_used_id,
          name: m.material_name,
          uom: m.uom,
          color: randColor(),
        });
      }
    });
    availableItems.value = Array.from(uniqueMap.values());
  } catch (e) {
    availableItems.value = [];
  } finally {
    modalLoading.value = false;
  }
};

// ======================================================
// 3. COMPUTED & ACTIONS
// ======================================================
const locationOptions = computed(() =>
  locations.value.filter(
    (l) =>
      !fromLocation.value || l.location_id !== fromLocation.value.location_id
  )
);

const filteredItems = computed(() =>
  availableItems.value.filter((item) =>
    (item.name || "")
      .toLowerCase()
      .includes((searchQuery.value || "").toLowerCase())
  )
);

const openMaterialModal = () => {
  showModal.value = true;
  loadMaterialsForModal();
};

const selectItem = (item) => {
  if (materials.value.find((m) => m.name === item.name))
    return alert("Material ini sudah ada.");
  materials.value.push({
    materialUsedId: item.id,
    name: item.name,
    uom: item.uom,
    amount: 0,
    color: item.color,
  });
  showModal.value = false;
};

const removeMaterial = (index) => materials.value.splice(index, 1);

// ======================================================
// 4. SUBMIT UPDATE (Reset Status -> Waiting)
// ======================================================
const submitUpdate = async () => {
  if (isApproved.value) return;

  if (!fromLocation.value || !toLocation.value)
    return alert("Pilih lokasi asal & tujuan");
  if (fromLocation.value.location_id === toLocation.value.location_id)
    return alert("Lokasi asal & tujuan sama");
  if (materials.value.length === 0) return alert("Minimal 1 material");
  if (materials.value.some((m) => m.amount <= 0))
    return alert("Jumlah harus > 0");

  submitLoading.value = true;
  successMsg.value = "";

  try {
    const movementId = route.params.id;
    const now = new Date().toISOString();

    // 1. Update Header (Status -> Waiting)
    const { error: headErr } = await supabase
      .from("gh_movement")
      .update({
        movement_date: selectedDate.value,
        source_location_id: fromLocation.value.location_id,
        target_location_id: toLocation.value.location_id,
        status: "onReview",
        updated_at: now,
      })
      .eq("movement_id", movementId);
    if (headErr) throw headErr;

    // 2. Update Items
    await supabase
      .from("gh_movement_item")
      .delete()
      .eq("movement_id", movementId);
    const newItems = materials.value.map((m) => ({
      movement_id: movementId,
      material_used_id: m.materialUsedId,
      qty: m.amount,
      uom: m.uom,
    }));
    await supabase.from("gh_movement_item").insert(newItems);

    // 3. Reset Approval Record
    const { data: approveRecord } = await supabase
      .from("gh_approve_record")
      .select("record_id")
      .eq("reference_id", movementId)
      .eq("reference_type", "movement")
      .maybeSingle();

    console.log("record_id: ", approveRecord);

    if (approveRecord) {
      await supabase
        .from("gh_approval_level_status")
        .update({ status: "pending", revision_notes: null })
        .eq("record_id", approveRecord.record_id);

      await supabase
        .from("gh_approve_record")
        .update({
          overall_status: "onReview",
          current_level_order: 1,
          updated_at: now,
        })
        .eq("record_id", approveRecord.record_id);
    }

    successMsg.value = "Data diperbarui! Dokumen diajukan ulang.";
    setTimeout(() => {
      successMsg.value = "";
      goBack();
    }, 2000);
  } catch (e) {
    console.error("Update failed:", e);
    alert("Gagal menyimpan perubahan: " + e.message);
  } finally {
    submitLoading.value = false;
  }
};

const goBack = () => router.back();
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: #0071f3;
  border-radius: 10px;
}
</style>