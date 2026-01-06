<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div
        class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between"
      >
        <div class="flex items-center gap-4">
          <button
            @click="handleBack"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <span class="text-lg text-gray-700">←</span>
          </button>
          <div>
            <h1
              class="text-2xl font-bold text-gray-900 flex items-center gap-3"
            >
              <span
                class="w-10 h-10 bg-gradient-to-br from-red-500 to-amber-500 rounded-lg flex items-center justify-center text-white text-lg"
              >
                📄
              </span>
              Berita Acara Selisih Barang
            </h1>
            <!-- <p class="text-sm text-gray-500 mt-1">
              Movement:
              <span class="font-semibold">{{ header?.code || "-" }}</span>
            </p> -->
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- ⚠️ WARNING BANNER - Data Belum Tersimpan -->
      <div
        class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl"
      >
        <div class="flex items-start gap-3">
          <span class="text-amber-500 text-2xl">⚠️</span>
          <div class="flex-1">
            <h4 class="font-bold text-amber-800 text-sm">
              Data Penerimaan Belum Tersimpan
            </h4>
            <p class="text-amber-700 text-xs mt-2">
              Data akan tersimpan setelah Anda mengisi alasan kekurangan 
              dan menekan tombol <strong>"Simpan Data"</strong> di bawah.
            </p>
            <p class="text-amber-600 text-xs mt-2 font-semibold">
              ⚡ Jika Anda keluar dari halaman ini tanpa menyimpan, 
              data penerimaan akan hilang!
            </p>
          </div>
        </div>
      </div>

      <!-- FORM BERITA ACARA -->
      <form
        @submit.prevent="handleSubmit"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4"
      >
        <!-- ITEM CARD -->
        <div
          v-for="(row, index) in formRows"
          :key="row.id || index"
          class="border border-gray-100 rounded-xl p-4 space-y-2"
        >
          <!-- HEADER ITEM -->
          <div class="flex justify-between items-center gap-4">
            <div>
              <p class="font-semibold text-gray-800">{{ row.material_name }}</p>
              <p class="text-xs text-gray-500">{{ row.material_code }}</p>
            </div>

            <span
              class="text-xs px-2.5 py-1 rounded-full border font-semibold"
              :class="
                row.qty_lost > 0
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-green-100 text-green-800 border-green-200'
              "
            >
              {{
                row.qty_lost > 0
                  ? `Kurang: ${formatNumber(row.qty_lost)}`
                  : "✅ Sesuai"
              }}
            </span>
          </div>

          <!-- QTY INFO -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600"
          >
            <p>
              Qty Request:
              <span class="font-semibold">{{
                formatNumber(row.qty_request)
              }}</span>
            </p>
            <p>
              Qty Diterima:
              <span class="font-semibold">{{
                formatNumber(row.qty_received)
              }}</span>
            </p>
          </div>

          <!-- INPUT ALASAN (Hanya untuk yang punya selisih) -->
          <div
            v-if="row.qty_lost > 0"
            class="space-y-3 pt-2 border-t border-gray-50 mt-2"
          >
            <!-- Dropdown Kategori Alasan -->
            <div class="space-y-1">
              <label class="block text-xs font-medium text-gray-700">
                Pilih Kategori Alasan <span class="text-red-500">*</span>
              </label>
              <select
                v-model="row.selected_reason"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="" disabled>-- Pilih Alasan --</option>
                <option v-for="opt in reasonOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </div>

            <!-- Textarea Detail (Jika pilih "Lainnya") -->
            <div v-if="row.selected_reason === 'Lainnya'" class="space-y-1">
              <label class="block text-xs font-medium text-gray-700">
                Detail Alasan Lainnya <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="row.custom_reason"
                required
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Jelaskan detail alasan kekurangan barang..."
              ></textarea>
            </div>
          </div>

          <!-- MESSAGE LENGKAP -->
          <div v-else class="pt-2 mt-2 border-t border-gray-50">
            <p class="text-xs text-green-600 italic">
              ✅ Barang diterima lengkap sesuai permintaan.
            </p>
          </div>
        </div>

        <!-- FOOTER ACTIONS -->
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2"
        >
          <div class="text-xs text-gray-500">
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="isChecked" class="w-4 h-4" />
              <span>
                <strong>Saya telah memastikan semua data dengan benar</strong>
              </span>
            </label>
          </div>

          <div class="flex gap-3 justify-end">
            <button
              type="button"
              @click="handleBack"
              class="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="processing || !isFormValid || !isChecked"
              class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <span v-if="processing" class="flex items-center gap-2">
                <span class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Data Disimpan
              </span>
              <span v-else class="flex items-center gap-2">
                <span>💾</span>
                Simpan
              </span>
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
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import logoPG from "@/assets/logoPG.svg";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

// Load data dari localStorage
const data = JSON.parse(localStorage.getItem("movementReceiving")) || {};

const movementId = computed(() => {
  return data.movement_id || route.params.movementId || route.params.id || null;
});

const header = ref(null);
const formRows = ref([]);
const processing = ref(false);
const isChecked = ref(false);

const reasonOptions = [
  "Barang rusak saat perjalanan",
  "Salah hitung saat loading (Kurang Muat)",
  "Barang tertinggal di gudang asal",
  "Kemasan rusak / bocor",
  "Hilang / Tidak diketahui",
  "Lainnya",
];

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("id-ID").format(value);
};

// Hitung jumlah item dengan shortage
const itemsWithShortage = computed(() => {
  return formRows.value.filter(row => row.qty_lost > 0).length;
});

// Validasi form: item dengan selisih wajib isi alasan
const isFormValid = computed(() => {
  if (formRows.value.length === 0) return false;

  return formRows.value.every((row) => {
    // Jika tidak ada selisih, otomatis valid
    if (row.qty_lost <= 0) return true;

    // Jika ada selisih, wajib pilih alasan
    if (!row.selected_reason) return false;

    // Jika pilih "Lainnya", wajib isi custom_reason
    if (row.selected_reason === "Lainnya") {
      return row.custom_reason && row.custom_reason.trim().length > 0;
    }

    return true;
  });
});

// Load data dari localStorage
const loadData = async () => {
  // Validasi: Cek apakah data ada di localStorage
  if (!data || !data.items || !data.is_pending_database) {
    alert("⚠️ Data penerimaan tidak ditemukan!\n\nAnda akan diarahkan kembali ke halaman penerimaan barang.");
    router.push({ name: "goodmovement" });
    return;
  }

  header.value = {
    id: movementId.value,
    code: `MV-${movementId.value || "DUMMY"}`,
  };

  formRows.value = data.items.map((item) => ({
    id: item.movement_item_id,
    movement_item_id: item.movement_item_id,
    material_used_id: item.material_used_id,
    material_code: item.material_code,
    material_name: item.material_name,
    qty_request: item.qty_request,
    qty_received: item.qty_received,
    qty_lost: item.qty_shortage,
    selected_reason: "",
    custom_reason: "",
  }));

  console.log("📦 Loaded items:", formRows.value.length);
  console.log("🔍 Items dengan selisih:", itemsWithShortage.value);
};

// ⭐ FUNGSI SUBMIT - SIMPAN SEMUA KE DATABASE
const handleSubmit = async () => {
  if (!isFormValid.value) {
    alert("⚠️ Harap lengkapi semua alasan untuk barang yang mengalami selisih!");
    return;
  }

  if (!isChecked.value) {
    alert("⚠️ Anda harus mencentang konfirmasi terlebih dahulu!");
    return;
  }

  if (!confirm(
    `Simpan data penerimaan dan berita acara ke database?\n\n` +
    `Data yang akan disimpan:\n` +
    `- Header Penerimaan (1 record)\n` +
    `- Detail Item (${formRows.value.length} records)\n` +
    `- Berita Acara (${itemsWithShortage.value} records)\n\n` +
    `⚠️ Proses ini TIDAK DAPAT dibatalkan!`
  )) {
    return;
  }

  processing.value = true;

  try {
    const receivingData = JSON.parse(localStorage.getItem("movementReceiving"));

    if (!receivingData || !receivingData.is_pending_database) {
      throw new Error("Data penerimaan tidak valid atau sudah tersimpan");
    }

    console.log("🚀 Starting database save process...");
    console.log("📝 Movement ID:", movementId.value);

    // ==========================================
    // STEP 1: INSERT KE gh_movement_receiving
    // ==========================================
    console.log("1️⃣ Inserting receiving header...");

    const { data: receiving, error: receivingError } = await supabase
      .from("gh_movement_receiving")
      .insert([
        {
          movement_id: movementId.value,
          received_by: auth.user?.user_id || receivingData.received_by || "System",
          received_at: new Date().toISOString(),
          total_requested: receivingData.total_requested,
          total_received: receivingData.total_received,
          total_shortage: receivingData.total_shortage,
          status: "partial",
          notes: "Penerimaan parsial - terdapat kekurangan barang. Berita acara telah dibuat.",
        },
      ])
      .select()
      .single();

    if (receivingError) {
      console.error("❌ Error inserting receiving:", receivingError);
      throw new Error(`Gagal menyimpan header penerimaan: ${receivingError.message}`);
    }

    console.log("✅ Receiving header saved, ID:", receiving.receiving_id);

   // ==========================================
    // STEP 2: INSERT KE gh_movement_receiving_item
    // ==========================================
    console.log("2️⃣ Inserting receiving items...");

    const receivingItems = receivingData.items.map((item) => {
      // 1. Cari data inputan user di halaman ini (formRows) berdasarkan ID item
      const currentRow = formRows.value.find(
        (row) => row.movement_item_id === item.movement_item_id
      );

      // 2. Ambil notes lama dari halaman sebelumnya (jika ada)
      let finalNotes = item.notes ? item.notes : "";

      // 3. Jika item ini punya selisih (qty_lost > 0), tambahkan alasannya ke notes
      if (currentRow && currentRow.qty_lost > 0) {
        // Tentukan teks alasan (apakah dari dropdown atau custom text)
        let reasonText = currentRow.selected_reason;
        if (reasonText === "Lainnya") {
          reasonText = currentRow.custom_reason;
        }

        // Format tambahan note: "Alasan Selisih: ..."
        const reasonString = `(Selisih ${currentRow.qty_lost}: ${reasonText})`;

        // Gabungkan dengan notes lama
        if (finalNotes) {
          finalNotes += ` | ${reasonString}`;
        } else {
          finalNotes = reasonString;
        }
      }

      return {
        receiving_id: receiving.receiving_id,
        movement_item_id: item.movement_item_id,
        material_used_id: item.material_used_id,
        qty_requested: item.qty_request,
        qty_received: item.qty_received,
        qty_shortage: item.qty_shortage,
        notes: finalNotes || null, // <--- Notes yang sudah update dimasukkan ke sini
        openbravo_synced: false,
      };
    });

    const { error: itemsError } = await supabase
      .from("gh_movement_receiving_item")
      .insert(receivingItems);

    if (itemsError) {
      console.error("❌ Error inserting receiving items:", itemsError);
      throw new Error(`Gagal menyimpan detail item: ${itemsError.message}`);
    }

    console.log("✅ Receiving items saved:", receivingItems.length, "items");

    // ==========================================
    // STEP 3: INSERT KE gh_berita_acara
    // ==========================================
    console.log("3️⃣ Inserting berita acara...");

    const beritaAcaraPayload = [];

    for (const row of formRows.value) {
      if (row.qty_lost <= 0) continue;

      let finalReason = row.selected_reason;
      if (row.selected_reason === "Lainnya" && row.custom_reason) {
        finalReason = row.custom_reason.trim();
      }

      beritaAcaraPayload.push({
        movement_id: movementId.value,
        material_id: row.material_used_id,
        qty_loss: row.qty_lost,
        loss_reason: finalReason,
        reported_by: auth.user?.user_id || "System",
        created_at: new Date().toISOString(),
      });
    }

    if (beritaAcaraPayload.length > 0) {
      const { error: baError } = await supabase
        .from("gh_berita_acara")
        .insert(beritaAcaraPayload);

      if (baError) {
        console.error("❌ Error inserting berita acara:", baError);
        throw new Error(`Gagal menyimpan berita acara: ${baError.message}`);
      }

      console.log("✅ Berita Acara saved:", beritaAcaraPayload.length, "records");
    }

    // ==========================================
    // STEP 4: UPDATE gh_movement_item
    // ==========================================
    console.log("4️⃣ Updating movement items...");

    const updatePromises = receivingData.items.map((item) =>
      supabase
        .from("gh_movement_item")
        .update({
          qty_received: item.qty_received,
          updated_at: new Date().toISOString(),
        })
        .eq("movement_item_id", item.movement_item_id)
    );

    await Promise.all(updatePromises);
    console.log("✅ Movement items updated");

    // ==========================================
    // STEP 5: UPDATE gh_movement
    // ==========================================
    console.log("5️⃣ Updating movement status...");

    const { error: movementError } = await supabase
      .from("gh_movement")
      .update({
        status: "Approved",
        receive_status: "Partially Received",
        received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("movement_id", movementId.value);

    if (movementError) {
      console.error("❌ Error updating movement:", movementError);
      throw new Error(`Gagal update status movement: ${movementError.message}`);
    }

    console.log("✅ Movement status updated");

    // ==========================================
    // STEP 6: CLEANUP & SUCCESS
    // ==========================================
    console.log("6️⃣ Cleaning up...");

    // Hapus dari localStorage dan sessionStorage
    localStorage.removeItem("movementReceiving");
    sessionStorage.removeItem("movementReceiving_backup");

    console.log("🎉 All data saved successfully!");

    alert(
      `✅ Data berhasil disimpan ke database!\n\n` +
      `📊 Summary:\n` +
      `• Total Request: ${formatNumber(receivingData.total_requested)}\n` +
      `• Total Diterima: ${formatNumber(receivingData.total_received)}\n` +
      `• Kekurangan: ${formatNumber(receivingData.total_shortage)}\n\n` +
      `📄 Berita Acara: ${beritaAcaraPayload.length} item\n` +
      `✅ Status Movement: Partially Received`
    );

    router.push({
        path: `/detailmovement/${movementId.value}`,
        query: { refresh: Date.now() }
    });

    return; 

  } catch (err) {
    console.error("❌ Error submit berita acara:", err);
    alert(
      `❌ Gagal menyimpan data ke database!\n\n` +
      `Error: ${err.message}\n\n` +
      `Data Anda masih tersimpan sementara.\n` +
      `Silakan coba lagi atau hubungi administrator.`
    );
  } finally {
    processing.value = false;
  }
};

// Handle back button dengan konfirmasi
const handleBack = () => {
  if (
    confirm(
      "⚠️ Batalkan pengisian berita acara?\n\n" +
      "Data penerimaan barang yang sudah Anda input BELUM tersimpan ke database.\n\n" +
      "Jika Anda keluar sekarang, data akan hilang dan Anda harus mengulang dari awal.\n\n" +
      "Yakin ingin keluar?"
    )
  ) {
    // Hapus data dari localStorage
    localStorage.removeItem("movementReceiving");
    sessionStorage.removeItem("movementReceiving_backup");
    
    router.back();
  }
};

onMounted(() => {
  loadData();
});
</script>