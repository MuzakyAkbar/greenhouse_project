<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <!-- HEADER -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between"
      >
        <div class="flex items-center gap-4">
          <button @click="handleBack" class="text-gray-500 hover:text-gray-700">
            <svg
              class="w-5 h-5 text-gray-700"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 448 512"
            >
              <path
                d="M257.5 445.1L92.6 280.2c-12.5-12.5-12.5-32.8 0-45.3L257.5 69.3c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L160.3 256l142.5 141.5c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0z"
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
                🚚
              </span>
              Detail Perpindahan Barang
            </h1>

            <p class="text-sm text-gray-500 mt-1">
              ID Movement:
              <span class="font-semibold">{{ movement?.code || "-" }}</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- Tombol Revisi untuk Staff -->
          <button
            v-if="showRevisionButton"
            @click="openRevisionModal"
            class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-2 text-sm transition-colors"
          >
            <span>✏️</span>
            Ajukan Revisi
          </button>

          <router-link
            v-if="isStaff"
            :to="`/movementReceiving/${movement?.id}`"
            class="px-4 py-2.5 rounded-xl bg-[#0071f3] text-white text-sm hover:bg-blue-500 flex items-center gap-2 font-medium"
          >
            <span>📦</span>
            Penerimaan Barang
          </router-link>
          <button
            @click="printPage"
            class="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 flex items-center gap-2 font-medium"
          >
            <span class="text-lg">🖨</span>
            Cetak
          </button>
        </div>
      </div>
    </div>

    <!-- ALERT REVISI DIPERLUKAN -->
    <div
      v-if="needRevision"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"
    >
      <div class="bg-red-50 border-2 border-red-500 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <span class="text-2xl mt-1">⚠️</span>
          <div class="flex-1">
            <p class="font-semibold text-amber-800 mb-1">Revisi Diperlukan</p>
            <p class="text-sm text-amber-700">
              Dokumen ini memerlukan revisi dari staff.
              <span v-if="revisionNotes" class="font-medium">
                Catatan: "{{ revisionNotes }}"
              </span>
            </p>
            <p class="text-xs text-amber-600 mt-2">
              Diminta oleh: {{ revisionRequestedBy }} •
              {{ formatDateTime(revisionRequestedAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- STATUS + INFO -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- PROGRES APPROVAL -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
          <h2 class="font-semibold text-gray-800 mb-4">Progres Persetujuan</h2>

          <div v-if="approvalProgress.length > 0" class="space-y-3">
            <div
              v-for="level in approvalProgress"
              :key="level.level_status_id"
              class="flex items-start gap-4 p-4 rounded-lg border transition-all"
              :class="{
                'bg-green-50 border-green-200': level.level_status === 'approved',
                'bg-yellow-50 border-yellow-200': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                'bg-red-50 border-red-200': level.level_status === 'needRevision',
                'bg-gray-50 border-gray-200': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
              }"
            >
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm"
                :class="{
                  'bg-green-500': level.level_status === 'approved',
                  'bg-blue-500': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                  'bg-red-500': level.level_status === 'needRevision',
                  'bg-gray-400': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
                }"
              >
                {{ level.level_order }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div>
                    <p class="font-bold text-gray-900">
                      {{ level.level_name || `Level ${level.level_order}` }}
                    </p>

                    <p class="text-sm text-gray-600 mt-0.5">
                      <span v-if="level.level_status === 'approved'">
                        ✅ Disetujui oleh <span class="font-medium">{{ level.approver_name || 'Admin' }}</span>
                      </span>
                      <span v-else-if="level.level_status === 'needRevision'">
                        🔄 Revisi diminta oleh <span class="font-medium">{{ level.revisor_name || 'Admin' }}</span>
                      </span>
                      <span v-else-if="level.level_order === currentUserLevel?.level_order">
                        ⏳ Menunggu Persetujuan Anda
                      </span>
                      <span v-else>⏸️ Menunggu Giliran</span>
                    </p>

                    <p v-if="level.approved_at" class="text-xs text-gray-400 mt-1">
                      {{ formatDateTime(level.approved_at) }}
                    </p>
                  </div>

                  <span
                    class="px-2.5 py-0.5 rounded-full font-semibold text-[10px] border whitespace-nowrap"
                    :class="{
                      'bg-green-100 text-green-700 border-green-200': level.level_status === 'approved',
                      'bg-yellow-100 text-yellow-700 border-yellow-200': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                      'bg-red-100 text-red-700 border-red-200': level.level_status === 'needRevision',
                      'bg-gray-100 text-gray-600 border-gray-200': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
                    }"
                  >
                    {{
                      level.level_status === 'approved' ? 'DISETUJUI' :
                      level.level_status === 'needRevision' ? 'REVISI' : 'MENUNGGU'
                    }}
                  </span>
                </div>

                <div v-if="approvalHistory.length > 0" class="mt-3 space-y-2">
                  <template
                    v-for="history in approvalHistory.filter(
                      (h) => h.level_order === level.level_order
                    )"
                    :key="history.history_id"
                  >
                    <div
                      v-if="history.action === 'approved'"
                      class="p-3 bg-white/80 border border-green-200 rounded-lg text-sm"
                    >
                      <div class="flex justify-between items-center mb-1">
                        <span class="font-semibold text-green-700 text-xs flex items-center gap-1">
                          💬 Komentar {{ history.user_name }}
                        </span>
                        <span class="text-[10px] text-gray-400">{{ formatDateTime(history.action_at) }}</span>
                      </div>
                      <p class="text-gray-700 pl-4 border-l-2 border-green-300">
                        {{ history.comment || 'Tidak ada komentar' }}
                      </p>
                    </div>

                    <div
                      v-else-if="history.action === 'revision_requested'"
                      class="p-3 bg-white/80 border border-red-200 rounded-lg text-sm"
                    >
                      <div class="flex justify-between items-center mb-1">
                        <span class="font-semibold text-red-700 text-xs flex items-center gap-1">
                          🔴 Revisi: {{ history.user_name }}
                        </span>
                        <span class="text-[10px] text-gray-400">{{ formatDateTime(history.action_at) }}</span>
                      </div>
                      <p class="text-gray-700 pl-4 border-l-2 border-red-300">
                        {{ history.comment || 'Tidak ada catatan revisi' }}
                      </p>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
            Belum ada data progres persetujuan.
          </div>

          <!-- Pelaksanaan & Penerimaan -->
          <div class="flex items-start gap-3 mt-6 mb-6">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border flex-shrink-0"
              :class="
                movement?.execution_status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-gray-100 text-gray-400 border-gray-300'
              "
            >
              3
            </div>

            <div>
              <p class="font-medium text-gray-800">
                Pelaksanaan & Penerimaan
              </p>

              <p class="text-xs text-gray-500">
                Status:
                <span :class="badgeExecution(movement?.execution_status)">
                  {{ formatExecution(movement?.execution_status) }}
                </span>
              </p>
            </div>
          </div>

          <!-- Tombol Persetujuan -->
          <div
            v-if="showApproveButton && approvalRecord?.overall_status !== 'approved'"
            class="mt-6 pt-6 border-t border-gray-100"
          >
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                @click="approveCurrentLevel"
                :disabled="processing"
                class="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-2.5 rounded-xl shadow-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                <span v-if="processing && processingType === 'approve'" class="animate-spin">⏳</span>
                <span>✅ Setujui Level {{ currentUserLevel?.level_order }}</span>
              </button>

              <button
                @click="openRevisionModal"
                :disabled="processing"
                class="flex-1 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 font-bold py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                <span>🔄 Minta Revisi</span>
              </button>
            </div>
          </div>
        </div>

        <!-- INFORMASI SAMPING -->
        <div
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4"
        >
          <h2 class="font-semibold text-gray-800">Informasi Movement</h2>

          <div class="text-sm space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-500">Diminta Oleh</span>
              <span class="font-medium">{{ movement?.requested_by }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-gray-500">Tanggal Permintaan</span>
              <span class="font-medium">{{ formatDateTime(movement?.requested_at) }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-gray-500">Dari Lokasi</span>
              <span class="font-medium">{{ movement?.from_location }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-gray-500">Ke Lokasi</span>
              <span class="font-medium">{{ movement?.to_location }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-gray-500">Tanggal Movement</span>
              <span class="font-medium">{{ formatDate(movement?.movement_date) }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-gray-500">Status Dokumen</span>
              <span :class="documentStatusClass" class="px-2 py-1 rounded-full text-xs">
                {{ documentStatusText }}
              </span>
            </div>

            <!-- Info Level Saat Ini -->
            <div v-if="currentUserLevel" class="pt-2 border-t border-gray-100">
              <div class="flex justify-between">
                <span class="text-gray-500">Level Saat Ini</span>
                <span class="font-medium">{{ currentUserLevel.level_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Status Persetujuan</span>
                <span :class="getStatusBadge(approvalRecord?.overall_status).class" class="px-2 py-1 rounded-full text-xs">
                  {{ getStatusBadge(approvalRecord?.overall_status).text }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DETAIL BARANG DARI ADDNEWGM -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-gray-800">Detail Barang yang Ditransfer</h2>
          <div class="flex items-center gap-3">
            <p class="text-xs text-gray-500">
              Total Item: <span class="font-semibold">{{ items.length }}</span>
            </p>
          </div>
        </div>

        <!-- TABEL DETAIL BARANG -->
        <div class="overflow-x-auto rounded-xl border border-gray-200">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50">
              <tr class="text-xs uppercase text-gray-500">
                <th class="px-4 py-3 text-left">No</th>
                <th class="px-4 py-3 text-left">Material</th>
                <th class="px-4 py-3 text-left">Kode Material</th>
                <th class="px-4 py-3 text-right">Kuantitas Diminta</th>
                <th class="px-4 py-3 text-right">Satuan</th>
                <th class="px-4 py-3 text-right" v-if="showRevisionNotes">Catatan Revisi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in items"
                :key="row.id"
                class="border-t border-gray-100 hover:bg-gray-50"
                :class="row.needsRevision ? 'bg-amber-50' : ''"
              >
                <td class="px-4 py-3 text-gray-500 text-center">{{ index + 1 }}</td>

                <td class="px-4 py-3">
                  <p class="font-medium text-gray-800">{{ row.material_name }}</p>
                </td>

                <td class="px-4 py-3 text-gray-600">
                  {{ row.material_code }}
                </td>

                <td class="px-4 py-3 text-right font-semibold text-gray-800">
                  {{ formatNumber(row.qty_request) }}
                </td>

                <td class="px-4 py-3 text-right text-gray-600">
                  {{ row.uom || '-' }}
                </td>

                <td v-if="showRevisionNotes" class="px-4 py-3 text-right">
                  <span
                    v-if="row.revision_notes"
                    class="text-xs text-amber-600 italic"
                  >
                    {{ row.revision_notes }}
                  </span>
                  <span v-else class="text-xs text-gray-400">-</span>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="items.length > 0" class="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colspan="3" class="px-4 py-3 text-right font-semibold text-gray-700">
                  TOTAL:
                </td>
                <td class="px-4 py-3 text-right font-bold text-gray-800">
                  {{ formatNumber(totalQtyRequest) }}
                </td>
                <td class="px-4 py-3 text-right"></td>
                <td v-if="showRevisionNotes" class="px-4 py-3 text-right"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-if="items.length === 0 && !loading" class="text-center py-8">
          <div class="text-5xl mb-4">📭</div>
          <p class="text-gray-500 font-medium">Belum ada data barang</p>
        </div>

        <p v-if="loading" class="text-center text-sm text-gray-500 mt-4">
          Memuat data movement...
        </p>
      </div>

      <!-- INFORMASI APPROVAL -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 class="font-semibold text-gray-800 mb-4">Riwayat Persetujuan</h2>
        
        <div v-if="approvalHistory.length > 0" class="space-y-4">
          <!-- Grup berdasarkan level -->
          <div v-for="level in [1, 2]" :key="level">
            <h3 class="font-medium text-gray-700 mb-2">
              {{ level === 1 ? 'Manager' : 'Kepala Gudang' }} Persetujuan
            </h3>
            <div class="space-y-3">
              <div
                v-for="history in approvalHistory.filter(h => h.level_order === level)"
                :key="history.history_id"
                class="border border-gray-200 rounded-lg p-4"
                :class="{
                  'border-green-200 bg-green-50': history.action === 'approved',
                  'border-red-200 bg-red-50': history.action === 'rejected' || history.action === 'revision_requested'
                }"
              >
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <p class="font-semibold text-gray-800">
                      {{ history.user_name }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ formatDateTime(history.action_at) }}
                    </p>
                  </div>
                  <span
                    :class="{
                      'bg-green-100 text-green-800': history.action === 'approved',
                      'bg-red-100 text-red-800': history.action === 'rejected',
                      'bg-amber-100 text-amber-800': history.action === 'revision_requested'
                    }"
                    class="px-2 py-1 rounded-full text-xs font-semibold"
                  >
                    {{
                      history.action === 'approved'
                        ? '✅ Disetujui'
                        : history.action === 'rejected'
                        ? '❌ Ditolak'
                        : '🔄 Permintaan Revisi'
                    }}
                  </span>
                </div>
                <p
                  v-if="history.comment"
                  class="text-sm text-gray-700 mt-2 italic"
                >
                  "{{ history.comment }}"
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-8 text-gray-500">
          <div class="text-3xl mb-2">📝</div>
          <p>Belum ada riwayat persetujuan</p>
        </div>
      </div>
    </div>

    <!-- MODAL PENOLAKAN -->
    <div
      v-if="showRejectModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        @click="showRejectModal = false"
      ></div>

      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="font-bold text-lg text-gray-900 mb-4">
          {{ rejectType === 'manager' ? 'Tolak (Manager)' : 'Tolak (Kepala Gudang)' }}
        </h3>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Alasan Penolakan <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="rejectReason"
            rows="4"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            placeholder="Masukkan alasan penolakan..."
            required
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">Alasan akan tercatat dalam sistem dan dilihat oleh staff.</p>
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="showRejectModal = false"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            :disabled="processing"
          >
            Batal
          </button>
          <button
            @click="confirmReject"
            :disabled="!rejectReason.trim() || processing"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            <span v-if="processing">⏳</span>
            <span>Konfirmasi Penolakan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL REVISI (DUAL MODE: UNTUK APPROVER DAN STAFF) -->
    <div
      v-if="showRevisionModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        @click="closeRevisionModal"
      ></div>

      <div
        class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <h3 class="font-bold text-lg text-gray-900 mb-4">
          {{ canApproveCurrentLevel ? 'Permintaan Revisi' : 'Ajukan Revisi' }}
        </h3>

        <!-- Mode: Approver Request Revision -->
        <div v-if="canApproveCurrentLevel">
          <div class="mb-6">
            <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
              📋 Seluruh Laporan (Level {{ currentUserLevel?.level_order }})
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Catatan Revisi <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="generalRevisionNote"
              rows="6"
              placeholder="Tuliskan dengan jelas apa yang perlu diperbaiki..."
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0071f3] focus:outline-none transition resize-none"
              :disabled="processing"
            ></textarea>
            <div class="mt-3 flex items-center gap-2 text-sm">
              <span
                class="font-semibold"
                :class="generalRevisionNote.trim().length < 10 ? 'text-red-600' : 'text-green-600'"
              >
                {{ generalRevisionNote.trim().length }} / 10
              </span>
              <span class="text-gray-500">karakter</span>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              @click="closeRevisionModal"
              :disabled="processing"
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              @click="requestRevisionForLevel"
              :disabled="!generalRevisionNote.trim() || generalRevisionNote.trim().length < 10 || processing"
              class="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              <span>{{ processing ? 'Mengirim...' : 'Kirim Revisi' }}</span>
            </button>
          </div>
        </div>

        <!-- Mode: Staff Submit Revision -->
        <div v-else>
          <!-- Info revisi yang diminta -->
          <div v-if="revisionNotes" class="mb-4 bg-amber-50 p-4 rounded-lg">
            <p class="font-medium text-amber-800 mb-2">Catatan Revisi:</p>
            <p class="text-amber-700">{{ revisionNotes }}</p>
          </div>

          <!-- Form revisi items -->
          <div class="space-y-4">
            <div
              v-for="(item, index) in revisionItems"
              :key="item.id"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex justify-between items-start mb-3">
                <div>
                  <p class="font-medium">{{ item.material_name }}</p>
                  <p class="text-sm text-gray-500">{{ item.material_code }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-600">
                    Stok: {{ formatNumber(item.current_stock) }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Sebelumnya
                  </label>
                  <input
                    type="number"
                    :value="item.original_qty"
                    disabled
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Revisi *
                  </label>
                  <input
                    v-model.number="item.revised_qty"
                    type="number"
                    :min="0"
                    :max="item.current_stock"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    @input="validateRevisedQty(item)"
                  />
                  <p v-if="item.error" class="text-xs text-red-600 mt-1">
                    {{ item.error }}
                  </p>
                </div>
              </div>

              <div class="mt-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Catatan Revisi (Opsional)
                </label>
                <textarea
                  v-model="item.revision_note"
                  rows="2"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Catatan untuk item ini..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Catatan umum -->
          <div class="mt-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Catatan Umum Revisi
            </label>
            <textarea
              v-model="generalRevisionNote"
              rows="3"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Masukkan catatan umum revisi..."
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              @click="closeRevisionModal"
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Batal
            </button>
            <button
              @click="submitRevision"
              :disabled="processing || !isRevisionValid"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <span v-if="processing" class="animate-spin">↻</span>
              Ajukan Revisi
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/* -----------------------------
   IMPORTS
------------------------------*/
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import openbravoApi from '@/lib/openbravo';
import axios from 'axios';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

/* -----------------------------
   CONSTANTS & CONFIG
------------------------------*/
const FLOW_ID = 4; // Wajib: ID Flow Good Movement
const MOVEMENT_ID = Number(route.params.id);

/* -----------------------------
   ENVIRONMENT VARIABLES
------------------------------*/
const API_USER = import.meta.env.VITE_API_USER;
const API_PASS = import.meta.env.VITE_API_PASS;
const API_URL = import.meta.env.VITE_OPENBRAVO_URL?.trim() || 'http://202.59.169.85';
const API_PORT = import.meta.env.VITE_API_PORT?.trim() || '8090';

/* -----------------------------
   STATE MANAGEMENT
------------------------------*/
const movement = ref(null);
const items = ref([]);
const approvalRecord = ref(null);
const approvalLevels = ref([]);
const approvalHistory = ref([]);
const loading = ref(true);
const processing = ref(false);
const processingType = ref("");
const approverNames = ref({});

// Approval State (Seperti reportActivityReview)
const currentUserLevel = ref(null);
const canApproveCurrentLevel = ref(false);
const approvalProgress = ref([]);

// Modal State
const showRejectModal = ref(false);
const showRevisionModal = ref(false);
const rejectReason = ref("");
const rejectType = ref(""); 
const revisionItems = ref([]);
const generalRevisionNote = ref("");

// Warehouse Info
const warehouseInfo = ref({
  warehouse: null,
  bin: null,
  location_name: null
});

/* -----------------------------
   1. UTILITY: GET USER ID
------------------------------*/
const getCurrentUserId = () => {
  return auth.user?.user_id || auth.user?.id;
};

/* -----------------------------
   2. ENSURE APPROVAL DATA INTEGRITY (FIXED)
------------------------------*/
const ensureApprovalDataIntegrity = async () => {
  try {
    console.log("🛠️ Memulai pengecekan & perbaikan data approval...");

    // A. Cari movement data
    const { data: moveData } = await supabase
      .from("gh_movement")
      .select("created_by, status")
      .eq("movement_id", MOVEMENT_ID)
      .single();

    if (!moveData) throw new Error("Movement ID tidak valid");

    // B. Map movement status ke approval status
    let overallStatus = "onReview";
    let currentLevel = 1;
    
    // ✅ FIX: Mapping yang benar antara movement status dan approval status
    if (moveData.status === 'Approved' || moveData.status === 'approved') { 
      overallStatus = 'approved'; 
      currentLevel = 2; 
    }
    else if (moveData.status === 'Need Revision' || moveData.status === 'needRevision') { 
      overallStatus = 'needRevision'; 
      currentLevel = 2; 
    }
    else if (moveData.status === 'Need Revision' || moveData.status === 'needRevision') { 
      overallStatus = 'needRevision'; 
      currentLevel = 1; 
    }
    else if (moveData.status === 'Waiting' || moveData.status === 'onReview') { 
      overallStatus = 'onReview'; 
      currentLevel = 1; 
    }

    // C. Cari atau buat approval record
    let { data: existingRecord } = await supabase
      .from("gh_approve_record")
      .select("*")
      .eq("reference_type", "movement")
      .eq("reference_id", MOVEMENT_ID)
      .eq("flow_id", FLOW_ID)
      .maybeSingle();

    let recordId;
    
    if (existingRecord) {
      recordId = existingRecord.record_id;
      approvalRecord.value = existingRecord;
      
      // Update jika status berubah
      if (existingRecord.overall_status !== overallStatus) {
        await supabase
          .from("gh_approve_record")
          .update({
            overall_status: overallStatus,
            current_level_order: currentLevel,
            updated_at: new Date().toISOString()
          })
          .eq("record_id", recordId);
      }
    } else {
      console.log("⚠️ Record tidak ditemukan, membuat baru...");

      const { data: newRecord, error: insertError } = await supabase
        .from("gh_approve_record")
        .insert({
          flow_id: FLOW_ID,
          reference_type: "movement",
          reference_id: MOVEMENT_ID,
          current_level_order: currentLevel,
          overall_status: overallStatus,
          submitted_by: moveData.created_by || getCurrentUserId(),
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;
      recordId = newRecord.record_id;
      approvalRecord.value = newRecord;
    }

    // D. Sinkronisasi Level Status dengan Master Data
    // ✅ FIX: Ambil data dari gh_approval_flow_level untuk flow_id=4 (Good Movement)
    const { data: masterLevels } = await supabase
      .from("gh_approval_flow_level")
      .select("*")
      .eq("flow_id", FLOW_ID)
      .order("level_order");

    if (!masterLevels || masterLevels.length === 0) {
      console.warn("⚠️ Master Flow Level belum didefinisikan!");
      return;
    }

    const { data: currentLevels } = await supabase
      .from("gh_approval_level_status")
      .select("*")
      .eq("record_id", recordId);

    // E. Loop setiap Master Level untuk memastikan sinkronisasi
    for (const master of masterLevels) {
      const existing = currentLevels?.find(l => l.level_order === master.level_order);

      if (!existing) {
        console.log(`➕ Membuat Level ${master.level_order} (${master.level_name})...`);
        
        // Tentukan status level berdasarkan overall status
        let levelStatus = "pending";
        if (overallStatus === 'approved' && master.level_order <= currentLevel) {
          levelStatus = "approved";
        } else if (overallStatus === 'needRevision' && master.level_order === 1) {
          levelStatus = "needRevision";
        }
        
        await supabase.from("gh_approval_level_status").insert({
          record_id: recordId,
          flow_level_id: master.flow_level_id,
          level_order: master.level_order,
          level_name: master.level_name,
          status: levelStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        // Update jika ada perubahan
        if (existing.level_name !== master.level_name || !existing.flow_level_id) {
          console.log(` Memperbaiki Nama Level ${master.level_order}...`);
          await supabase.from("gh_approval_level_status")
            .update({ 
              level_name: master.level_name,
              flow_level_id: master.flow_level_id,
              updated_at: new Date().toISOString()
            })
            .eq("level_status_id", existing.level_status_id);
        }
      }
    }

    return approvalRecord.value;

  } catch (err) {
    console.error("❌ Error ensureApprovalDataIntegrity:", err);
    return null;
  }
};

/* -----------------------------
   3. LOAD APPROVAL DATA (FIXED - SEPERTI reportActivityReview)
------------------------------*/
const loadApprovalData = async () => {
  try {
    // 1. Pastikan data integrity dulu
    const record = await ensureApprovalDataIntegrity();
    if (!record) {
      canApproveCurrentLevel.value = false;
      currentUserLevel.value = { level_order: 0, level_name: 'Staff/No Approval Flow', is_final_level: false };
      return;
    }

    approvalRecord.value = record;

    // 2. Get Level Statuses
    const { data: levels } = await supabase
      .from("gh_approval_level_status")
      .select("*")
      .eq("record_id", record.record_id)
      .order("level_order");

    approvalLevels.value = levels || [];

    // 3. Get Approver Names
    const userIds = levels
      ?.flatMap(l => [l.approved_by, l.rejected_by, l.revision_requested_by])
      .filter(id => id && id.length > 10) || [];
    
    if (userIds.length > 0) {
      await fetchApproverNames([...new Set(userIds)]);
    }

    // 4. Load Approval History
    await loadApprovalHistory(record.record_id);

    // 5. Setup Approval Progress (SEPERTI reportActivityReview)
    await setupApprovalProgress(record, levels);

  } catch (err) {
    console.error("Error loading approval data:", err);
    canApproveCurrentLevel.value = false;
    currentUserLevel.value = { level_order: 0, level_name: 'Error', is_final_level: false };
  }
};

// FUNGSI INI SAMA DENGAN reportActivityReview - FIXED
const setupApprovalProgress = async (record, levelStatuses) => {
  try {
    const currentLevelOrder = record?.current_level_order || 1;
    const lastLevel = 2; // Untuk Good Movement: Manager(1) -> Kepala Gudang(2)
    
    // Build approval progress array
    approvalProgress.value = levelStatuses.map(level => ({
      ...level,
      approver_name: level.approved_by ? approverNames.value[level.approved_by] : null,
      revisor_name: level.revision_requested_by ? approverNames.value[level.revision_requested_by] : null,
      is_final_level: level.level_order === lastLevel,
      level_status: level.status
    }));

    // Determine current user's level and approval capability
    const currentLevelStatus = levelStatuses.find(s => s.level_order === currentLevelOrder);
    
    // ✅ FIX: PERBAIKAN INI - Gunakan kondisi yang sama dengan reportActivityReview
    const { data: userLevel } = await supabase
      .from('gh_user_approval_level')
      .select('level_order, flow_id')
      .eq('user_id', auth.user.user_id)
      .eq('flow_id', record.flow_id)
      .eq('level_order', currentLevelOrder)
      .eq('is_active', true)
      .maybeSingle();

    // ✅ FIX: DUA KONDISI SEPERTI DI reportActivityReview
    canApproveCurrentLevel.value = !!userLevel && 
      currentLevelStatus?.status === 'pending' && 
      record.overall_status === 'onReview';
    
    currentUserLevel.value = { 
      level_order: currentLevelOrder, 
      level_name: currentLevelStatus?.level_name || `Level ${currentLevelOrder}`, 
      is_final_level: currentLevelOrder === lastLevel 
    };

  } catch (err) {
    console.error("Error setting up approval progress:", err);
    canApproveCurrentLevel.value = false;
    currentUserLevel.value = { level_order: 1, level_name: 'Error', is_final_level: false };
  }
};

const loadApprovalHistory = async (recordId) => {
  try {
    const { data, error } = await supabase
      .from('gh_approval_history')
      .select('*')
      .eq('record_id', recordId)
      .order('action_at', { ascending: true });
    
    if (error) throw error;
    
    const userIds = [...new Set(data.map(h => h.user_id).filter(Boolean))];
    let userNames = {};
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('user')
        .select('user_id, username, email')
        .in('user_id', userIds);
      
      if (users) {
        userNames = users.reduce((acc, user) => {
          acc[user.user_id] = user.username || user.email;
          return acc;
        }, {});
      }
    }
    
    approvalHistory.value = data.map(h => ({
      ...h,
      user_name: h.user_id ? (userNames[h.user_id] || 'Unknown') : 'System'
    }));
    
  } catch (err) {
    console.error('❌ Error loading approval history:', err);
    approvalHistory.value = [];
  }
};

const fetchApproverNames = async (ids) => {
  if (!ids.length) return;
  try {
    const { data } = await supabase.from("user").select("user_id, username, email").in("user_id", ids);
    data?.forEach(u => approverNames.value[u.user_id] = u.username || u.email || "User");
  } catch (e) { console.error(e); }
};

/* -----------------------------
   4. LOAD MOVEMENT DATA
------------------------------*/
const loadMovement = async () => {
  loading.value = true;
  try {
    // 1. Header
    const { data: header, error: headError } = await supabase
      .from("gh_movement")
      .select("*")
      .eq("movement_id", MOVEMENT_ID)
      .single();

    if (headError) throw headError;

    // 2. Locations
    let fromLocName = "-";
    let toLocName = "-";
    const locIds = [header.source_location_id, header.target_location_id].filter(Boolean);
    if (locIds.length > 0) {
      const { data: locs } = await supabase.from("gh_location").select("location_id, location").in("location_id", locIds);
      if (locs) {
        const src = locs.find(l => l.location_id == header.source_location_id);
        const tgt = locs.find(l => l.location_id == header.target_location_id);
        fromLocName = src ? src.location : "-";
        toLocName = tgt ? tgt.location : "-";
      }
    }

    // 3. Items & Material
    const { data: rawItems } = await supabase.from("gh_movement_item").select("*").eq("movement_id", MOVEMENT_ID);
    const matIds = rawItems.map(i => i.material_used_id).filter(Boolean);
    let matMap = {};
    if (matIds.length > 0) {
      const { data: mats } = await supabase.from("gh_material_used").select("material_used_id, material_name, openbravo_id, uom").in("material_used_id", matIds);
      mats?.forEach(m => matMap[m.material_used_id] = m);
    }

    items.value = rawItems.map(item => {
      const mat = matMap[item.material_used_id] || {};
      return {
        id: item.movement_item_id,
        material_name: mat.material_name || '-',
        material_code: mat.openbravo_id || '-',
        qty_request: item.qty,
        uom: item.uom || mat.uom,
        qty_received: item.qty_received,
        revision_notes: item.revision_notes,
        needsRevision: !!item.revision_notes
      };
    });

    // ✅ FIX: Map movement status ke format yang konsisten
    let movementStatus = header.status;
    if (header.status === 'Waiting') movementStatus = 'On Review';
    if (header.status === 'Need Revision') movementStatus = 'Need Revision';

    movement.value = {
      id: header.movement_id,
      code: header.reference_no,
      status: movementStatus, // ✅ Gunakan mapped status
      movement_date: header.movement_date,
      requested_by: header.created_by,
      requested_at: header.created_at,
      from_location: fromLocName,
      to_location: toLocName,
      execution_status: header.receive_status === 'Received' ? 'completed' : 
                       header.receive_status === 'Partially Received' ? 'partial' : 'not_started'
    };

    // 4. Load Approval Data (akan melakukan sinkronisasi)
    await loadApprovalData();

    // 5. Load Warehouse Info for Internal Movement
    if (header.source_location_id) {
      await loadWarehouseAndBin(header.source_location_id);
    }

  } catch (err) {
    console.error("Error loadMovement:", err);
  } finally {
    loading.value = false;
  }
};

/* -----------------------------
   5. WAREHOUSE LOADER
------------------------------*/
const loadWarehouseAndBin = async (locationId) => {
  try {
    const { data: location } = await supabase
      .from("gh_location")
      .select("location")
      .eq("location_id", locationId)
      .single();

    if (!location) return;
    warehouseInfo.value.location_name = location.location;
    
    const warehouseRes = await openbravoApi.get('/Warehouse', { 
      params: { _where: `name='${location.location}'` } 
    });
    
    const warehouses = warehouseRes?.data?.response?.data || [];
    if (!warehouses.length) return;
    
    const warehouse = warehouses[0];
    warehouseInfo.value.warehouse = warehouse;
    
    const binRes = await openbravoApi.get('/Locator', { 
      params: { _where: `M_Warehouse_ID='${warehouse.id}'` } 
    });
    
    const bins = binRes?.data?.response?.data || [];
    if (!bins.length) return;
    
    warehouseInfo.value.bin = bins[0];
    
  } catch (err) { 
    console.error('❌ Error loading warehouse/bin:', err); 
  }
};

/* -----------------------------
   6. APPROVAL ACTIONS (FIXED - UNTUK HINDARI CONSTRAINT ERROR)
------------------------------*/
// ✅ APPROVE CURRENT LEVEL - FIXED UNTUK CONSTRAINT
const approveCurrentLevel = async () => {
  if (!canApproveCurrentLevel.value || !currentUserLevel.value) return;
  
  const levelName = currentUserLevel.value.level_name;
  const comment = prompt(
    `Tambahkan komentar untuk approval Level ${currentUserLevel.value.level_order} (opsional):`, 
    ''
  );
  
  if (comment === null) return;
  
  if (!confirm(`✅ Approve good movement ini untuk level "${levelName}"?`)) return;

  try {
    processing.value = true;
    processingType.value = 'approve';
    const currentLevelOrder = currentUserLevel.value.level_order;
    const username = auth.user?.username || auth.user?.email || 'Admin';
    const now = new Date();
    const recordId = approvalRecord.value.record_id;

    // ✅ FIX: Format timestamp yang benar untuk PostgreSQL
    const validTimestamp = now.toISOString();

    // 1. Update Current Level Status
    const { error: updateLevelErr } = await supabase
      .from("gh_approval_level_status")
      .update({ 
        status: "approved", 
        approved_by: auth.user.user_id, 
        approved_at: validTimestamp,
        updated_at: validTimestamp,
        // Pastikan field yang tidak digunakan di-set null untuk constraint
        revision_notes: null,
        revision_requested_by: null,
        revision_requested_at: null,
      })
      .eq("record_id", recordId)
      .eq("level_order", currentLevelOrder);
    
    if (updateLevelErr) {
      console.error("Update level error:", updateLevelErr);
      throw new Error(`Gagal update level: ${updateLevelErr.message}`);
    }

    // 2. Insert History
    const { error: historyError } = await supabase
      .from("gh_approval_history")
      .insert({
        record_id: recordId,
        flow_id: FLOW_ID,
        user_id: auth.user.user_id,
        level_order: currentLevelOrder,
        level_name: levelName,
        action: 'approved',
        comment: comment.trim() || `Approved by ${username}`,
        action_at: validTimestamp
      });
    
    if (historyError) {
      console.error("Insert history error:", historyError);
      throw new Error(`Gagal menyimpan history: ${historyError.message}`);
    }

    // 3. Check if Final Level
    const lastLevel = 2; // Untuk Good Movement flow_id=4, last_level=2
    const isFinalLevel = currentLevelOrder === lastLevel;

    if (isFinalLevel) {
      console.log('🎉 FINAL APPROVAL - Processing Good Movement...');
      
      // Update approval record
      await supabase
        .from("gh_approve_record")
        .update({ 
          overall_status: "approved", 
          completed_at: validTimestamp,
          updated_at: validTimestamp
        })
        .eq("record_id", recordId);
      
      // ✅ FIX: Update movement status ke "Approved" (bukan "approved")
      await supabase
        .from("gh_movement")
        .update({ 
          status: "Approved", 
          updated_at: validTimestamp 
        })
        .eq("movement_id", MOVEMENT_ID);

      // Process internal movement to Openbravo
      const processResults = await createAndProcessInternalMovement();
      
      // Display results
      let message = `✅ Good Movement telah disetujui sepenuhnya.\n\n`;
      
      if (processResults.success) {
        message += `📦 INTERNAL MOVEMENT DIBUAT:\n`;
        message += `• Document ID: ${processResults.movementId}\n`;
        message += `• Items Diproses: ${processResults.successCount}/${processResults.totalItems}\n`;
        
        if (processResults.warning) {
          message += `\n⚠️ PERINGATAN:\n${processResults.warning}\n`;
        }
        
        if (processResults.errors) {
          message += `\n❌ ERROR:\n${processResults.errors.join('\n')}\n`;
        }
      } else {
        message += `❌ Gagal membuat internal movement:\n${processResults.errors}`;
      }
      
      alert(message);
      
    } else {
      // Not final level - proceed to next level
      await supabase
        .from("gh_approve_record")
        .update({ 
          current_level_order: currentLevelOrder + 1,
          updated_at: validTimestamp
        })
        .eq("record_id", recordId);
      
      // Update next level status to pending
      await supabase
        .from("gh_approval_level_status")
        .update({ 
          status: "pending",
          updated_at: validTimestamp,
          // Pastikan field lain null
          approved_by: null,
          approved_at: null,
          revision_notes: null,
          revision_requested_by: null,
          revision_requested_at: null,
        })
        .eq("record_id", recordId)
        .eq("level_order", currentLevelOrder + 1);
      
      // Update movement status tetap "On Review"
      await supabase
        .from("gh_movement")
        .update({ 
          status: "On Review", 
          updated_at: validTimestamp 
        })
        .eq("movement_id", MOVEMENT_ID);
      
      alert(`✅ Level ${currentLevelOrder} Disetujui.\n\nMelanjutkan ke Level ${currentLevelOrder + 1}.`);
    }

    await loadMovement();

  } catch (err) {
    console.error('❌ Approval Error:', err);
    alert(`❌ Gagal approve:\n\n${err.message}`);
  } finally {
    processing.value = false;
    processingType.value = '';
  }
};

// ✅ REQUEST REVISION - FIXED UNTUK CONSTRAINT
const requestRevisionForLevel = async () => {
  if (!canApproveCurrentLevel.value) return;
  if (!generalRevisionNote.value || generalRevisionNote.value.trim().length < 10) {
    alert('⚠️ Catatan revisi minimal 10 karakter'); 
    return;
  }
  if (!confirm('🔄 Kirim permintaan revisi good movement?')) return;

  try {
    processing.value = true;
    const currentLevel = currentUserLevel.value;
    const now = new Date();
    const recordId = approvalRecord.value.record_id;
    
    // ✅ FIX: Format timestamp yang benar
    const validTimestamp = now.toISOString();
    
    // 1. Update Current Level Status to needRevision
    const { error: levelError } = await supabase
      .from("gh_approval_level_status")
      .update({
        status: 'needRevision', 
        revision_notes: generalRevisionNote.value,
        revision_requested_by: auth.user.user_id, 
        revision_requested_at: validTimestamp,
        updated_at: validTimestamp,
        // Pastikan field lain null untuk constraint
        approved_by: null,
        approved_at: null,
      })
      .eq("record_id", recordId)
      .eq("level_order", currentLevel.level_order);

    if (levelError) {
      console.error("Level revision error:", levelError);
      throw levelError;
    }

    // 2. Insert History
    await supabase
      .from("gh_approval_history")
      .insert({
        record_id: recordId, 
        flow_id: FLOW_ID,
        user_id: auth.user.user_id,
        level_order: currentLevel.level_order, 
        level_name: currentLevel.level_name, 
        action: 'revision_requested', 
        comment: generalRevisionNote.value,
        action_at: validTimestamp
      });

    // 3. Update gh_approve_record
    await supabase
      .from("gh_approve_record")
      .update({ 
        overall_status: 'needRevision', 
        current_level_order: 1,
        updated_at: validTimestamp
      })
      .eq("record_id", recordId);

    // ✅ FIX: Update movement status ke "Need Revision" (bukan "needRevision")
    await supabase
      .from("gh_movement")
      .update({ 
        status: 'Need Revision', 
        updated_at: validTimestamp 
      })
      .eq("movement_id", MOVEMENT_ID);
    
    // 4. Reset other levels - PASTIKAN SEMUA FIELD NULL
    await supabase
      .from("gh_approval_level_status")
      .update({ 
        status: 'pending', 
        updated_at: validTimestamp,
        // Pastikan semua field null untuk constraint
        approved_by: null, 
        approved_at: null,
        revision_notes: null,
        revision_requested_by: null,
        revision_requested_at: null
      })
      .eq("record_id", recordId)
      .neq('level_order', currentLevel.level_order);

    await loadMovement();
    closeRevisionModal();
    alert('✅ Permintaan revisi dikirim! Status direset ke Level 1.');

  } catch (err) {
    console.error('❌ Revision Error:', err);
    alert('❌ Gagal revisi: ' + err.message);
  } finally {
    processing.value = false;
  }
};

/* -----------------------------
   7. CREATE AND PROCESS INTERNAL MOVEMENT
------------------------------*/
const createAndProcessInternalMovement = async () => {
  // [Kode ini tetap sama seperti sebelumnya]
  if (!items.value || items.value.length === 0) {
    return { success: false, errors: 'No items provided' };
  }
  
  const obUser = localStorage.getItem('OB_USER');
  const obKey = localStorage.getItem('OB_KEY');
  
  if (!obUser || !obKey) {
    return { 
      success: false, 
      errors: 'Kredensial Openbravo hilang. Silakan Logout & Login ulang.' 
    };
  }

  if (!warehouseInfo.value.bin || !warehouseInfo.value.warehouse) {
    return { 
      success: false, 
      errors: 'Warehouse/Bin tidak ditemukan untuk location ini' 
    };
  }

  const warehouse = warehouseInfo.value.warehouse;
  const bin = warehouseInfo.value.bin;
  const warehouseId = warehouse.id;
  const binId = bin.id; 
  
  const DEFAULT_CLIENT_ID = '025F309A89714992995442D9CDE13A15';
  const DEFAULT_ORG_ID = '96D7D37973EF450383B8ADCFDB666725';

  const orgId = warehouse.organization?.id || warehouse.organization || DEFAULT_ORG_ID;
  const clientId = warehouse.client?.id || warehouse.client || DEFAULT_CLIENT_ID;
  
  const PATH_SERVICE = '';

  try {
    // STEP 1: CREATE HEADER
    const now = new Date();
    const movementDate = movement.value.movement_date ? 
      new Date(movement.value.movement_date).toISOString().split('T')[0] : 
      now.toISOString().split('T')[0];
    
    const movementName = `GM-${movement.value.code}-${Date.now()}`;
    
    const movementPayload = {
      data: [{
        _entityName: 'MaterialMgmtInternalConsumption',
        organization: orgId,
        client: clientId,
        warehouse: warehouseId,
        movementDate: movementDate,
        name: movementName,
        description: `Good Movement: ${movement.value.code}`
      }]
    };

    const createRes = await openbravoApi.post(`${PATH_SERVICE}/MaterialMgmtInternalConsumption`, movementPayload);

    if (createRes.data.response && createRes.data.response.status !== 0) {
      throw new Error(`Openbravo Reject: ${createRes.data.response.error?.message}`);
    }

    let movementId = null;
    const rData = createRes.data.response?.data || createRes.data.data;
    if (Array.isArray(rData) && rData.length > 0) movementId = rData[0].id;
    else if (rData && rData.id) movementId = rData.id;

    if (!movementId) throw new Error('Gagal mendapatkan ID Header');

    // STEP 2: CREATE LINES
    let successCount = 0;
    const errors = [];

    for (const item of items.value) {
      try {
        const escapedName = item.material_name.replace(/'/g, "''");
        const prodRes = await openbravoApi.get(`${PATH_SERVICE}/Product`, { 
          params: { _where: `name='${escapedName}'`, _selectedProperties: 'id,name,uOM', _startRow: 0, _endRow: 1 } 
        });
        
        const products = prodRes.data.response?.data || [];
        if (!products.length) {
          errors.push(`Produk '${item.material_name}' tidak ditemukan`);
          continue;
        }

        const product = products[0];
        let uomId = product.uOM?.id || product.uOM;

        if (item.uom) {
          const uomRes = await openbravoApi.get(`${PATH_SERVICE}/UOM`, { params: { _where: `name='${item.uom}'`, _startRow: 0, _endRow: 1 } });
          const uoms = uomRes?.data?.response?.data || [];
          if (uoms.length > 0) uomId = uoms[0].id;
        }

        // Check Stock
        const stockRes = await openbravoApi.get(`${PATH_SERVICE}/MaterialMgmtStorageDetail`, {
          params: { _where: `storageBin='${binId}' AND product='${product.id}'`, _selectedProperties: 'quantityOnHand', _startRow: 0, _endRow: 1 }
        });

        const stockDetails = stockRes?.data?.response?.data || [];
        const currentStock = stockDetails[0]?.quantityOnHand || 0;
        const qty = Math.abs(Number(item.qty_request) || 0);

        if (currentStock < qty) {
          errors.push(`${item.material_name}: Stok kurang (${currentStock}/${qty})`);
          continue;
        }

        const linePayload = {
          data: [{
            _entityName: 'MaterialMgmtInternalConsumptionLine',
            organization: orgId,
            client: clientId,
            internalConsumption: movementId,
            lineNo: (successCount + 1) * 10,
            product: product.id,
            uOM: uomId,
            movementQuantity: qty,
            storageBin: binId
          }]
        };

        const lineRes = await openbravoApi.post(`${PATH_SERVICE}/MaterialMgmtInternalConsumptionLine`, linePayload);
        if (lineRes?.data?.response?.status === -1) throw new Error('Failed to create line');
        
        successCount++;
      } catch (err) {
        errors.push(`${item.material_name}: ${err.message}`);
      }
    }

    if (successCount === 0) {
      await openbravoApi.delete(`${PATH_SERVICE}/MaterialMgmtInternalConsumption/${movementId}`).catch(() => {});
      throw new Error(`Gagal insert item: ${errors.join(', ')}`);
    }

    // STEP 3: PROCESS
    if (!API_USER || !API_PASS) {
      return {
        success: true, movementId: movementId, successCount, totalItems: items.value.length,
        errors: errors.length > 0 ? errors : null,
        warning: 'Credential ENV missing for Processing.'
      };
    }

    const baseUrl = API_URL.replace(/\/+$/, '').replace(/:\d+$/, '');
    const endpoint = `${baseUrl}:${API_PORT}/api/process`;
    
    const authToken = btoa(unescape(encodeURIComponent(`${API_USER}:${API_PASS}`)));

    const processPayload = {
      ad_process_id: "800131",
      ad_client_id: clientId,
      ad_org_id: orgId,
      data: [
        { id: movementId }
      ]
    };

    try {
      const processRes = await axios.post(endpoint, processPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`
        },
        timeout: 45000
      });

      const resultData = processRes.data?.data?.[0];
      
      if (resultData && resultData.result === 1) {
        return {
          success: true,
          movementId: movementId,
          successCount,
          totalItems: items.value.length,
          errors: errors.length > 0 ? errors : null
        };
      } else {
        const msg = resultData?.errormsg || 'Unknown Error (Result not 1)';
        throw new Error(msg);
      }

    } catch (procErr) {
      console.error('❌ API Error:', procErr.message);
      
      return { 
        success: true,
        movementId: movementId, 
        successCount, 
        totalItems: items.value.length,
        errors: errors.length > 0 ? errors : null,
        warning: `Processing Failed: ${procErr.message}. Silakan proses manual dokumen ${movementId}`
      };
    }

  } catch (err) {
    console.error(`❌ CRITICAL ERROR:`, err);
    return { success: false, errors: err.message };
  }
};

/* -----------------------------
   8. REJECT FUNCTION - FIXED UNTUK CONSTRAINT
------------------------------*/
/* -----------------------------
   8. REJECT FUNCTION - FIXED UNTUK CONSTRAINT
------------------------------*/
const confirmReject = async () => {
  if (!rejectReason.value.trim()) return alert("Isi alasan!");
  
  const userId = getCurrentUserId();
  if (!userId) return alert("Sesi kadaluarsa.");

  processing.value = true;
  try {
    const now = new Date();
    const recordId = approvalRecord.value.record_id;
    const levelOrder = rejectType.value === 'manager' ? 1 : 2;
    const levelName = rejectType.value === 'manager' ? "Manager" : "Kepala Gudang";

    // ✅ FIX: Format timestamp yang benar untuk PostgreSQL
    const validTimestamp = now.toISOString();

    // Update Level Status - PASTIKAN SEMUA FIELD LAIN NULL
    const { error: levelError } = await supabase
      .from("gh_approval_level_status")
      .update({ 
        status: "rejected", 
        updated_at: validTimestamp,
        // Pastikan semua field lain null untuk constraint
        approved_by: null,
        approved_at: null,
        revision_notes: null,
        revision_requested_by: null,
        revision_requested_at: null
      })
      .eq("record_id", recordId)
      .eq("level_order", levelOrder);

    if (levelError) {
      console.error("Update level error:", levelError);
      throw new Error(`Gagal update level status: ${levelError.message}`);
    }

    // Insert History
    await supabase
      .from("gh_approval_history")
      .insert({
        record_id: recordId,
        flow_id: FLOW_ID,
        user_id: auth.user.user_id,
        level_order: levelOrder,
        level_name: levelName,
        action: 'rejected',
        comment: rejectReason.value,
        action_at: validTimestamp
      });

    // Update Record
    await supabase
      .from("gh_approve_record")
      .update({ 
        overall_status: "rejected", 
        updated_at: validTimestamp,
        completed_at: validTimestamp
      })
      .eq("record_id", recordId);

    // Update Movement
    await supabase
      .from("gh_movement")
      .update({ 
        status: "Rejected", 
        updated_at: validTimestamp 
      })
      .eq("movement_id", MOVEMENT_ID);

    alert("❌ Good Movement ditolak.");
    showRejectModal.value = false;
    rejectReason.value = "";
    await loadMovement();

  } catch (err) {
    console.error("Reject Error:", err);
    alert("Gagal menolak: " + err.message);
  } finally {
    processing.value = false;
  }
};

/* -----------------------------
   9. REVISION FUNCTION (UNTUK STAFF) - FIXED UNTUK CONSTRAINT
------------------------------*/
// ✅ REVISION FUNCTION (UNTUK STAFF) - FIXED UNTUK CONSTRAINT
const submitRevision = async () => {
  const userId = getCurrentUserId();
  if (!userId) return alert("Sesi kadaluarsa.");

  processing.value = true;
  try { 
    const now = new Date();
    const recordId = approvalRecord.value.record_id;
    
    // ✅ FIX: Format timestamp yang benar
    const validTimestamp = now.toISOString();

    // Update Items with Revision
    for (const item of revisionItems.value) {
      if (item.revised_qty !== item.original_qty || item.revision_note) {
        await supabase.from("gh_movement_item")
          .update({ 
            qty: item.revised_qty, 
            revision_notes: item.revision_note, 
            updated_at: validTimestamp 
          })
          .eq("movement_item_id", item.id);
      }
    }

    // Reset Level Status - PASTIKAN SEMUA FIELD NULL
    await supabase.from("gh_approval_level_status")
      .update({ 
        status: "pending", 
        updated_at: validTimestamp,
        // Pastikan semua field null untuk constraint
        revision_notes: null, 
        revision_requested_by: null,
        revision_requested_at: null,
        approved_by: null,
        approved_at: null
      })
      .eq("record_id", recordId)
      .gte("level_order", 1);

    // Update Record
    await supabase.from("gh_approve_record")
      .update({ 
        overall_status: "onReview", 
        current_level_order: 1, 
        updated_at: validTimestamp 
      })
      .eq("record_id", recordId);

    // Update Movement
    await supabase.from("gh_movement")
      .update({ 
        status: "On Review", 
        updated_at: validTimestamp 
      })
      .eq("movement_id", MOVEMENT_ID);

    // Log History
    await supabase.from("gh_approval_history").insert({
      record_id: recordId,
      flow_id: FLOW_ID,
      level_order: 0,
      action: "revision_submitted",
      user_id: userId,
      comment: `Revisi diajukan staff: ${generalRevisionNote.value || 'Tidak ada catatan'}`,
      level_name: "Staff",
      action_at: validTimestamp
    });

    alert("✅ Revisi terkirim.");
    showRevisionModal.value = false;
    revisionItems.value = [];
    generalRevisionNote.value = "";
    await loadMovement();

  } catch (err) {
    console.error("Revision Error:", err);
    alert("Gagal mengirim revisi: " + err.message);
  } finally {
    processing.value = false;
  }
};

/* -----------------------------
   10. COMPUTED PROPERTIES (DIPERBARUI)
------------------------------*/
const currentLevelOrder = computed(() => approvalRecord.value?.current_level_order || 1);
const managerLevel = computed(() => approvalLevels.value.find(l => l.level_order === 1) || { status: 'pending' });
const warehouseLevel = computed(() => approvalLevels.value.find(l => l.level_order === 2) || { status: 'pending' });

const currentRole = computed(() => {
  const r = auth.user?.role?.toLowerCase();
  if (r === 'kepalagudang' || r === 'head_warehouse') return 'kepalagudang';
  return r;
});

// TOMBOL ACTION LAMA (DIGANTI DENGAN SISTEM BARU)
const showManagerAction = computed(() => 
  currentRole.value === 'manager' && 
  currentLevelOrder.value === 1 && 
  managerLevel.value.status === 'pending' &&
  approvalRecord.value?.overall_status === 'onReview'
);

const showWarehouseAction = computed(() => 
  currentRole.value === 'kepalagudang' && 
  currentLevelOrder.value === 2 && 
  warehouseLevel.value.status === 'pending' &&
  approvalRecord.value?.overall_status === 'onReview'
);

// TOMBOL UNTUK SISTEM BARU (MIRIP reportActivityReview)
const showApproveButton = computed(() => 
  canApproveCurrentLevel.value && 
  approvalRecord.value?.overall_status === 'onReview'
);

const showRevisionRequestButton = computed(() => 
  canApproveCurrentLevel.value && 
  approvalRecord.value?.overall_status === 'onReview'
);

const isStaff = computed(() => currentRole.value === 'staff');
const needRevision = computed(() => 
  approvalRecord.value?.overall_status === 'needRevision' ||
  managerLevel.value.status === 'needRevision' || 
  warehouseLevel.value.status === 'needRevision'
);

const showRevisionButton = computed(() => 
  isStaff.value && needRevision.value
);

const showRevisionNotes = computed(() => 
  items.value.some(i => i.revision_notes)
);

const totalQtyRequest = computed(() => 
  items.value.reduce((sum, i) => sum + Number(i.qty_request), 0)
);

const documentStatusText = computed(() => {
  const status = approvalRecord.value?.overall_status;
  if (status === 'approved') return "Disetujui";
  if (status === 'rejected') return "Ditolak";
  if (status === 'needRevision') return "Perlu Revisi";
  return "Dalam Review";
});

const documentStatusClass = computed(() => {
  const status = approvalRecord.value?.overall_status;
  if (status === 'approved') return "bg-green-100 text-green-800";
  if (status === 'rejected') return "bg-red-100 text-red-800";
  if (status === 'needRevision') return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
});

// Status badge function (sama dengan reportActivityReview)
const getStatusBadge = (status) => {
  const badges = {
    'onReview': { text: '⏳ Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'needRevision': { text: '🔄 Revision', class: 'bg-red-100 text-red-800 border-red-200' },
    'approved': { text: '✅ Approved', class: 'bg-green-100 text-green-800 border-green-200' },
    'rejected': { text: '❌ Rejected', class: 'bg-red-100 text-red-800 border-red-200' }
  };
  return badges[status || 'onReview'] || badges['onReview'];
};

/* -----------------------------
   11. UI HANDLERS
------------------------------*/
const openRejectModal = (type) => { 
  rejectType.value = type; 
  rejectReason.value = ""; 
  showRejectModal.value = true; 
};

const openRevisionModal = async () => {
  if (canApproveCurrentLevel.value) {
    // Untuk approver yang request revision
    generalRevisionNote.value = "";
    showRevisionModal.value = true;
  } else if (isStaff.value && needRevision.value) {
    // Untuk staff yang submit revision
    revisionItems.value = items.value.map(i => ({ 
      ...i, 
      original_qty: i.qty_request, 
      revised_qty: i.qty_request, 
      revision_note: i.revision_notes || "",
      current_stock: 1000
    }));
    showRevisionModal.value = true;
  }
};

const closeRevisionModal = () => {
  showRevisionModal.value = false;
  generalRevisionNote.value = "";
  revisionItems.value = [];
};

const validateRevisedQty = (item) => { 
  if (item.revised_qty < 0) {
    item.error = "Minimal 0";
  } else if (item.revised_qty > item.current_stock) {
    item.error = `Maksimal ${formatNumber(item.current_stock)}`;
  } else {
    item.error = null;
  }
};

const isRevisionValid = computed(() => {
  if (canApproveCurrentLevel.value) {
    // Untuk approver: hanya butuh catatan
    return generalRevisionNote.value.trim().length >= 10;
  } else {
    // Untuk staff: butuh perubahan quantity atau catatan
    return revisionItems.value.some(item => 
      item.revised_qty !== item.original_qty || item.revision_note
    );
  }
});

/* -----------------------------
   12. UTILITY FUNCTIONS
------------------------------*/
const handleBack = () => router.back();
const printPage = () => window.print();

const formatNumber = (v) => v == null ? "-" : new Intl.NumberFormat("id-ID").format(v);
const formatDate = (v) => v ? new Intl.DateTimeFormat("id-ID").format(new Date(v)) : "-";
const formatDateTime = (v) => v ? new Date(v).toLocaleString("id-ID") : "-";
const formatStatus = (s) => {
  switch(s) {
    case 'approved': return 'Disetujui';
    case 'rejected': return 'Ditolak';
    case 'needRevision': return 'Perlu Revisi';
    case 'pending': return 'Menunggu';
    default: return 'Pending';
  }
};

const badgeStatus = (s) => {
  switch(s) {
    case 'approved': return 'bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs';
    case 'rejected': return 'bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs';
    case 'needRevision': return 'bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs';
    default: return 'bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs';
  }
};

const badgeExecution = (s) => {
  if (s === 'completed') {
    return 'bg-green-100 text-green-800';
  }
  if (s === 'partial') {
    return 'bg-yellow-100 text-yellow-800';
  }
  return 'bg-gray-100 text-gray-800';
};

const formatExecution = (s) => {
  if (s === 'completed') return 'Selesai';
  if (s === 'partial') return 'Sebagian Diterima';
  return 'Belum';
};

const getApproverName = (id) => approverNames.value[id] || (id ? "User" : "-");

const revisionRequestedBy = computed(() => {
  const level = managerLevel.value.status === 'needRevision' ? managerLevel.value : warehouseLevel.value;
  return level?.revision_requested_by ? getApproverName(level.revision_requested_by) : "-";
});

const revisionRequestedAt = computed(() => {
  const level = managerLevel.value.status === 'needRevision' ? managerLevel.value : warehouseLevel.value;
  return level?.revision_requested_at || "";
});

const revisionNotes = computed(() => {
  const level = managerLevel.value.status === 'needRevision' ? managerLevel.value : warehouseLevel.value;
  return level?.revision_notes || "";
});

const showApprovalDetails = computed(() => {
  return approvalLevels.value.some(level => 
    level.approved_by || level.rejected_by || level.revision_notes
  );
});

onMounted(() => {
  loadMovement();
});

watch(
  () => route.query.refresh,
  async () => {
    console.log("🔄 DetailMovement reload triggered");
    await loadMovement(); // ⬅️ INI KUNCI UTAMA
  }
);

</script>