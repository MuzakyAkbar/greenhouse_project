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
              Detail Good Movement
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
        <!-- APPROVAL PROGRESS -->
        <div
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:col-span-2"
        >
          <h2 class="font-semibold text-gray-800 mb-4">Progress Approval</h2>

          <ol class="space-y-4">
            <!-- MANAGER -->
            <li class="flex items-start gap-3">
              <div
                class="mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border"
                :class="[
                  managerLevel?.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : managerLevel?.status === 'rejected'
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : needRevision && managerLevel?.status === 'needRevision'
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : currentLevelOrder === 1
                    ? 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse'
                    : 'bg-gray-100 text-gray-400 border-gray-300',
                ]"
              >
                1
              </div>

              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium text-gray-800">Manager Approval</p>
                    <p class="text-xs text-gray-500">
                      Status:
                      <span :class="badgeStatus(managerLevel?.status)">
                        {{ formatStatus(managerLevel?.status) }}
                      </span>
                    </p>
                  </div>

                  <!-- Tombol action untuk manager -->
                  <div v-if="showManagerAction && !needRevision" class="flex gap-2">
                    <button
                      @click="handleManagerApprove"
                      :disabled="processing"
                      class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg v-if="!processing" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                      <span v-if="processing">⏳</span>
                      <span>{{ processing && processingType === 'manager-approve' ? 'Processing...' : 'Approve' }}</span>
                    </button>
                    <button
                      @click="openRejectModal('manager')"
                      :disabled="processing"
                      class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg v-if="!processing" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                      </svg>
                      <span v-if="processing">⏳</span>
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                <!-- Detail approval -->
                <div
                  v-if="showApprovalDetails && managerLevel"
                  class="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg"
                >
                  <div v-if="managerLevel.approved_by" class="space-y-1">
                    <p>
                      <span class="font-medium">Approved By:</span>
                      {{ getApproverName(managerLevel.approved_by) }}
                    </p>
                    <p>
                      <span class="font-medium">Approved At:</span>
                      {{ formatDateTime(managerLevel.approved_at) }}
                    </p>
                  </div>
                  <div
                    v-if="
                      managerLevel.status === 'needRevision' &&
                      managerLevel.revision_notes
                    "
                    class="mt-2"
                  >
                    <p class="font-medium text-amber-600">Revision Notes:</p>
                    <p class="text-amber-500">
                      {{ managerLevel.revision_notes }}
                    </p>
                    <p
                      v-if="managerLevel.revision_requested_at"
                      class="text-gray-500 text-xs mt-1"
                    >
                      Requested at:
                      {{ formatDateTime(managerLevel.revision_requested_at) }}
                    </p>
                  </div>
                  <div v-if="managerLevel.rejected_by" class="space-y-1 mt-2">
                    <p>
                      <span class="font-medium">Rejected By:</span>
                      {{ getApproverName(managerLevel.rejected_by) }}
                    </p>
                    <p>
                      <span class="font-medium">Rejected At:</span>
                      {{ formatDateTime(managerLevel.rejected_at) }}
                    </p>
                    <p v-if="managerLevel.reject_reason" class="text-red-600">
                      <span class="font-medium">Reason:</span>
                      {{ managerLevel.reject_reason }}
                    </p>
                  </div>
                </div>
              </div>
            </li>

            <!-- KEPALA GUDANG -->
            <li class="flex items-start gap-3">
              <div
                class="mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border"
                :class="[
                  warehouseLevel?.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : warehouseLevel?.status === 'rejected'
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : needRevision && warehouseLevel?.status === 'needRevision'
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : currentLevelOrder === 2
                    ? 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse'
                    : 'bg-gray-100 text-gray-400 border-gray-300',
                ]"
              >
                2
              </div>

              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium text-gray-800">
                      Kepala Gudang Approval
                    </p>
                    <p class="text-xs text-gray-500">
                      Status:
                      <span :class="badgeStatus(warehouseLevel?.status)">
                        {{ formatStatus(warehouseLevel?.status) }}
                      </span>
                    </p>
                  </div>

                  <!-- Tombol action untuk kepala gudang -->
                  <div v-if="showWarehouseAction && !needRevision" class="flex gap-2">
                    <button
                      @click="handleWarehouseApprove"
                      :disabled="processing"
                      class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg v-if="!processing" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                      <span v-if="processing">⏳</span>
                      <span>{{ processing && processingType === 'warehouse-approve' ? 'Processing...' : 'Approve' }}</span>
                    </button>
                    <button
                      @click="openRejectModal('warehouse')"
                      :disabled="processing"
                      class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg v-if="!processing" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                      </svg>
                      <span v-if="processing">⏳</span>
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                <!-- Detail approval -->
                <div
                  v-if="showApprovalDetails && warehouseLevel"
                  class="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg"
                >
                  <div v-if="warehouseLevel.approved_by" class="space-y-1">
                    <p>
                      <span class="font-medium">Approved By:</span>
                      {{ getApproverName(warehouseLevel.approved_by) }}
                    </p>
                    <p>
                      <span class="font-medium">Approved At:</span>
                      {{ formatDateTime(warehouseLevel.approved_at) }}
                    </p>
                  </div>
                  <div
                    v-if="
                      warehouseLevel.status === 'needRevision' &&
                      warehouseLevel.revision_notes
                    "
                    class="mt-2"
                  >
                    <p class="font-medium text-amber-600">Revision Notes:</p>
                    <p class="text-amber-500">
                      {{ warehouseLevel.revision_notes }}
                    </p>
                    <p
                      v-if="warehouseLevel.revision_requested_at"
                      class="text-gray-500 text-xs mt-1"
                    >
                      Requested at:
                      {{ formatDateTime(warehouseLevel.revision_requested_at) }}
                    </p>
                  </div>
                  <div v-if="warehouseLevel.rejected_by" class="space-y-1 mt-2">
                    <p>
                      <span class="font-medium">Rejected By:</span>
                      {{ getApproverName(warehouseLevel.rejected_by) }}
                    </p>
                    <p>
                      <span class="font-medium">Rejected At:</span>
                      {{ formatDateTime(warehouseLevel.rejected_at) }}
                    </p>
                    <p v-if="warehouseLevel.reject_reason" class="text-red-600">
                      <span class="font-medium">Reason:</span>
                      {{ warehouseLevel.reject_reason }}
                    </p>
                  </div>
                </div>
              </div>
            </li>

            <!-- RECEIVING -->
            <li class="flex items-start gap-3">
              <div
                class="mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border"
                :class="
                  movement?.status_step >= 3
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
            </li>
          </ol>
        </div>

        <!-- INFO SIDE -->
        <div
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4"
        >
          <h2 class="font-semibold text-gray-800">Informasi Movement</h2>

          <div class="text-sm space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-500">Request By</span>
              <span class="font-medium">{{ movement?.requested_by }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-gray-500">Tanggal Request</span>
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

        <!-- TABLE DETAIL BARANG -->
        <div class="overflow-x-auto rounded-xl border border-gray-200">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50">
              <tr class="text-xs uppercase text-gray-500">
                <th class="px-4 py-3 text-left">No</th>
                <th class="px-4 py-3 text-left">Material</th>
                <th class="px-4 py-3 text-left">Kode Material</th>
                <th class="px-4 py-3 text-right">Quantity Request</th>
                <th class="px-4 py-3 text-right">UoM</th>
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
          Loading data movement...
        </p>
      </div>

      <!-- INFORMASI APPROVAL -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 class="font-semibold text-gray-800 mb-4">Riwayat Approval</h2>
        
        <div class="space-y-4">
          <!-- Manager Approval History -->
          <div v-if="managerLevel?.approved_by || managerLevel?.rejected_by" 
               class="border border-gray-200 rounded-lg p-4">
            <h3 class="font-medium text-gray-700 mb-2">Manager Approval</h3>
            <div class="text-sm text-gray-600 space-y-1">
              <div v-if="managerLevel.approved_by" class="flex justify-between">
                <span>Disetujui oleh:</span>
                <span class="font-medium">{{ getApproverName(managerLevel.approved_by) }}</span>
              </div>
              <div v-if="managerLevel.approved_at" class="flex justify-between">
                <span>Waktu:</span>
                <span>{{ formatDateTime(managerLevel.approved_at) }}</span>
              </div>
              <div v-if="managerLevel.rejected_by" class="flex justify-between">
                <span>Ditolak oleh:</span>
                <span class="font-medium text-red-600">{{ getApproverName(managerLevel.rejected_by) }}</span>
              </div>
              <div v-if="managerLevel.rejected_at" class="flex justify-between">
                <span>Waktu:</span>
                <span>{{ formatDateTime(managerLevel.rejected_at) }}</span>
              </div>
              <div v-if="managerLevel.reject_reason" class="mt-2">
                <p class="text-red-600 text-sm"><span class="font-medium">Alasan:</span> {{ managerLevel.reject_reason }}</p>
              </div>
            </div>
          </div>

          <!-- Kepala Gudang Approval History -->
          <div v-if="warehouseLevel?.approved_by || warehouseLevel?.rejected_by" 
               class="border border-gray-200 rounded-lg p-4">
            <h3 class="font-medium text-gray-700 mb-2">Kepala Gudang Approval</h3>
            <div class="text-sm text-gray-600 space-y-1">
              <div v-if="warehouseLevel.approved_by" class="flex justify-between">
                <span>Disetujui oleh:</span>
                <span class="font-medium">{{ getApproverName(warehouseLevel.approved_by) }}</span>
              </div>
              <div v-if="warehouseLevel.approved_at" class="flex justify-between">
                <span>Waktu:</span>
                <span>{{ formatDateTime(warehouseLevel.approved_at) }}</span>
              </div>
              <div v-if="warehouseLevel.rejected_by" class="flex justify-between">
                <span>Ditolak oleh:</span>
                <span class="font-medium text-red-600">{{ getApproverName(warehouseLevel.rejected_by) }}</span>
              </div>
              <div v-if="warehouseLevel.rejected_at" class="flex justify-between">
                <span>Waktu:</span>
                <span>{{ formatDateTime(warehouseLevel.rejected_at) }}</span>
              </div>
              <div v-if="warehouseLevel.reject_reason" class="mt-2">
                <p class="text-red-600 text-sm"><span class="font-medium">Alasan:</span> {{ warehouseLevel.reject_reason }}</p>
              </div>
            </div>
          </div>

          <div v-if="!managerLevel?.approved_by && !warehouseLevel?.approved_by && 
                     !managerLevel?.rejected_by && !warehouseLevel?.rejected_by" 
               class="text-center py-4 text-gray-500">
            Belum ada riwayat approval
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL REJECT -->
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
            <span>Konfirmasi Tolak</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL REVISI -->
    <div
      v-if="showRevisionModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        @click="showRevisionModal = false"
      ></div>

      <div
        class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <h3 class="font-bold text-lg text-gray-900 mb-4">Ajukan Revisi</h3>

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
            @click="showRevisionModal = false"
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
</template>

<script setup>
/* -----------------------------
   IMPORTS
------------------------------*/
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

/* -----------------------------
   CONSTANTS & CONFIG
------------------------------*/
const FLOW_ID = 4; // Wajib: ID Flow Good Movement
const MOVEMENT_ID = Number(route.params.id);

/* -----------------------------
   STATE MANAGEMENT
------------------------------*/
const movement = ref(null);
const items = ref([]);
const approvalRecord = ref(null);
const approvalLevels = ref([]);
const loading = ref(true);
const processing = ref(false);
const processingType = ref("");
const approverNames = ref({});

// Modal State
const showRejectModal = ref(false);
const showRevisionModal = ref(false);
const rejectReason = ref("");
const rejectType = ref(""); 
const revisionItems = ref([]);
const generalRevisionNote = ref("");

/* -----------------------------
   1. UTILITY: GET USER ID
------------------------------*/
const getCurrentUserId = () => {
  return auth.user?.user_id || auth.user?.id;
};

/* -----------------------------
   2. FUNGSI INISIALISASI (PERBAIKAN DATA KOSONG)
   Sekarang fungsi ini juga memperbaiki 'level_name' yang kosong
------------------------------*/
const ensureApprovalDataIntegrity = async () => {
  try {
    console.log("🛠️ Memulai pengecekan & perbaikan data approval...");

    // A. Pastikan Approval Record Ada
    let recordId = null;
    
    let { data: existingRecord } = await supabase
      .from("gh_approve_record")
      .select("*")
      .eq("reference_type", "movement")
      .eq("reference_id", MOVEMENT_ID)
      .eq("flow_id", FLOW_ID)
      .maybeSingle();

    if (existingRecord) {
      recordId = existingRecord.record_id;
      approvalRecord.value = existingRecord;
    } else {
      console.log("⚠️ Record tidak ditemukan, membuat baru...");
      
      const { data: moveData } = await supabase
        .from("gh_movement")
        .select("created_by, status")
        .eq("movement_id", MOVEMENT_ID)
        .single();

      if (!moveData) throw new Error("Movement ID tidak valid");

      let overallStatus = "onReview";
      let currentLevel = 1;
      if (moveData.status === 'Approved') { overallStatus = 'approved'; currentLevel = 3; }
      else if (moveData.status === 'Rejected') { overallStatus = 'rejected'; currentLevel = 3; }
      else if (moveData.status === 'Need Revision') { overallStatus = 'needRevision'; currentLevel = 1; }

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

    // B. Sinkronisasi Level Status dengan Master Data (Fix Level Name Kosong)
    
    // 1. Ambil Master Flow Level (Acuan Benar)
    const { data: masterLevels } = await supabase
      .from("gh_approval_flow_level")
      .select("*")
      .eq("flow_id", FLOW_ID)
      .order("level_order");

    if (!masterLevels || masterLevels.length === 0) {
      console.warn("⚠️ Master Flow Level belum didefinisikan!");
      return;
    }

    // 2. Ambil Level Status yang ada di DB
    const { data: currentLevels } = await supabase
      .from("gh_approval_level_status")
      .select("*")
      .eq("record_id", recordId);

    const overallStatus = approvalRecord.value.overall_status;

    // 3. Loop setiap Master Level untuk memastikan sinkronisasi
    for (const master of masterLevels) {
      const existing = currentLevels?.find(l => l.level_order === master.level_order);

      if (!existing) {
        // KASUS 1: Belum ada -> Insert
        console.log(`➕ Membuat Level ${master.level_order} (${master.level_name})...`);
        await supabase.from("gh_approval_level_status").insert({
          record_id: recordId,
          flow_level_id: master.flow_level_id,
          level_order: master.level_order,
          level_name: master.level_name, // Pastikan ini terisi dari master
          status: overallStatus === 'approved' ? 'approved' : 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        // KASUS 2: Sudah ada tapi nama kosong/salah -> Update
        if (!existing.level_name || existing.level_name !== master.level_name || !existing.flow_level_id) {
          console.log(` Memperbaiki Nama Level ${master.level_order}...`);
          await supabase.from("gh_approval_level_status")
            .update({ 
              level_name: master.level_name,
              flow_level_id: master.flow_level_id, // Link ulang ke master
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
   3. LOAD DATA (MANUAL FETCH)
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

    movement.value = {
      id: header.movement_id,
      code: header.reference_no,
      status: header.status,
      movement_date: header.movement_date,
      requested_by: header.created_by,
      requested_at: header.created_at,
      from_location: fromLocName,
      to_location: toLocName,
      execution_status: header.receive_status === 'Received' ? 'completed' : 'not_started'
    };

    // 4. Load Approval (Integritas Data dicek disini)
    await loadApprovalData();

  } catch (err) {
    console.error("Error loadMovement:", err);
  } finally {
    loading.value = false;
  }
};

const loadApprovalData = async () => {
  try {
    // Panggil fungsi perbaikan data
    const record = await ensureApprovalDataIntegrity();
    if (!record) return;

    approvalRecord.value = record;

    // Fetch Level Status (Sekarang datanya pasti sudah benar)
    const { data: levels } = await supabase
      .from("gh_approval_level_status")
      .select("*")
      .eq("record_id", record.record_id)
      .order("level_order");

    approvalLevels.value = levels || [];

    // Fetch Approver Names
    const userIds = levels
      .flatMap(l => [l.approved_by, l.rejected_by, l.revision_requested_by])
      .filter(id => id && id.length > 10);
    
    if (userIds.length > 0) {
      await fetchApproverNames([...new Set(userIds)]);
    }

  } catch (err) {
    console.error("Error loading approval data:", err);
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
   4. APPROVAL ACTIONS (FIXED LOGGING)
------------------------------*/
const logApprovalHistory = async (recordId, level, action, user, notes, levelName) => {
  if (!user) return console.error("User ID missing for log");

  const payload = {
    record_id: recordId,
    flow_id: FLOW_ID,
    level_order: level,
    action: action,
    user_id: user,
    comment: notes || "", 
    level_name: levelName || (level === 1 ? "Manager" : "Kepala Gudang"), // Fallback name
    action_at: new Date().toISOString()
  };

  const { error } = await supabase.from("gh_approval_history").insert(payload);
  if (error) console.error("History Log Error:", error);
};

// --- MANAGER APPROVE ---
const handleManagerApprove = async () => {
  if (!confirm("Setujui sebagai Manager?")) return;
  
  const userId = getCurrentUserId();
  if (!userId) return alert("Sesi kadaluarsa. Silakan refresh.");

  processing.value = true;
  try {
    const now = new Date().toISOString();
    const recordId = approvalRecord.value.record_id;

    // 1. UPDATE LEVEL 1
    const { error: levelError } = await supabase
      .from("gh_approval_level_status")
      .update({ 
        status: "approved", 
        approved_by: userId, 
        approved_at: now, 
        updated_at: now 
      })
      .eq("record_id", recordId)
      .eq("level_order", 1);
    
    if (levelError) throw levelError;

    // 2. UPDATE RECORD
    await supabase.from("gh_approve_record")
      .update({ current_level_order: 2, overall_status: "onReview", updated_at: now })
      .eq("record_id", recordId);

    // 3. LOG HISTORY
    await logApprovalHistory(recordId, 1, "approved", userId, "Manager menyetujui", "Manager");

    alert("✅ Approved by Manager.");
    await loadMovement();

  } catch (err) {
    console.error("Manager Error:", err);
    alert("Gagal: " + err.message);
  } finally {
    processing.value = false;
  }
};

// --- WAREHOUSE APPROVE ---
const handleWarehouseApprove = async () => {
  if (!confirm("Setujui sebagai Kepala Gudang?")) return;

  const userId = getCurrentUserId();
  if (!userId) return alert("Sesi kadaluarsa.");

  processing.value = true;
  try {
    const now = new Date().toISOString();
    const recordId = approvalRecord.value.record_id;

    // 1. UPDATE LEVEL 2
    const { error: levelError } = await supabase
      .from("gh_approval_level_status")
      .update({ 
        status: "approved", 
        approved_by: userId, 
        approved_at: now, 
        updated_at: now 
      })
      .eq("record_id", recordId)
      .eq("level_order", 2);

    if (levelError) throw levelError;

    // 2. UPDATE RECORD
    await supabase.from("gh_approve_record")
      .update({ current_level_order: 3, overall_status: "approved", completed_at: now, updated_at: now })
      .eq("record_id", recordId);

    // 3. UPDATE MOVEMENT
    await supabase.from("gh_movement")
      .update({ status: "Approved", updated_at: now })
      .eq("movement_id", MOVEMENT_ID);
      
    // 4. LOG
    await logApprovalHistory(recordId, 2, "approved", userId, "Kepala Gudang menyetujui", "Kepala Gudang");

    alert("✅ Approved by Kepala Gudang.");
    await loadMovement();

  } catch (err) {
    console.error("Warehouse Error:", err);
    alert("Gagal: " + err.message);
  } finally {
    processing.value = false;
  }
};

// --- REJECT ---
const confirmReject = async () => {
  if (!rejectReason.value) return alert("Isi alasan!");
  
  const userId = getCurrentUserId();
  if (!userId) return alert("Sesi kadaluarsa.");

  processing.value = true;
  try {
    const now = new Date().toISOString();
    const recordId = approvalRecord.value.record_id;
    const levelOrder = rejectType.value === 'manager' ? 1 : 2;
    const levelName = rejectType.value === 'manager' ? "Manager" : "Kepala Gudang";

    await supabase.from("gh_approval_level_status")
      .update({ 
        status: "rejected", 
        rejected_by: userId, 
        rejected_at: now, 
        reject_reason: rejectReason.value, 
        updated_at: now 
      })
      .eq("record_id", recordId).eq("level_order", levelOrder);

    await supabase.from("gh_approve_record")
      .update({ overall_status: "rejected", updated_at: now }).eq("record_id", recordId);

    await supabase.from("gh_movement")
      .update({ status: "Rejected", updated_at: now }).eq("movement_id", MOVEMENT_ID);

    await logApprovalHistory(recordId, levelOrder, "rejected", userId, rejectReason.value, levelName);

    alert("❌ Ditolak.");
    showRejectModal.value = false;
    await loadMovement();

  } catch (err) {
    console.error("Reject Error:", err);
  } finally {
    processing.value = false;
  }
};

// --- REVISION ---
const submitRevision = async () => {
  const userId = getCurrentUserId();
  if (!userId) return alert("Sesi kadaluarsa.");

  processing.value = true;
  try {
    const now = new Date().toISOString();
    const recordId = approvalRecord.value.record_id;

    for (const item of revisionItems.value) {
      if (item.revised_qty !== item.original_qty || item.revision_note) {
        await supabase.from("gh_movement_item")
          .update({ qty: item.revised_qty, revision_notes: item.revision_note, updated_at: now })
          .eq("movement_item_id", item.id);
      }
    }

    // Reset Level Status
    await supabase.from("gh_approval_level_status")
      .update({ status: "pending", revision_notes: null, revision_requested_by: null })
      .eq("record_id", recordId).gte("level_order", 1);

    await supabase.from("gh_approve_record")
      .update({ overall_status: "onReview", current_level_order: 1, updated_at: now })
      .eq("record_id", recordId);

    await supabase.from("gh_movement")
      .update({ status: "On Review", updated_at: now })
      .eq("movement_id", MOVEMENT_ID);

    await logApprovalHistory(recordId, 0, "revision_requested", userId, "Revisi diajukan staff", "Staff");

    alert("✅ Revisi terkirim.");
    showRevisionModal.value = false;
    await loadMovement();

  } catch (err) {
    console.error("Revision Error:", err);
  } finally {
    processing.value = false;
  }
};

/* -----------------------------
   UTILITIES
------------------------------*/
const handleBack = () => router.back();
const printPage = () => window.print();

const currentLevelOrder = computed(() => approvalRecord.value?.current_level_order || 1);
const managerLevel = computed(() => approvalLevels.value.find(l => l.level_order === 1) || { status: 'pending' });
const warehouseLevel = computed(() => approvalLevels.value.find(l => l.level_order === 2) || { status: 'pending' });

const currentRole = computed(() => {
  const r = auth.user?.role?.toLowerCase();
  if (r === 'kepalagudang' || r === 'head_warehouse') return 'kepalagudang';
  return r;
});

const showManagerAction = computed(() => currentRole.value === 'manager' && currentLevelOrder.value === 1 && managerLevel.value.status === 'pending');
const showWarehouseAction = computed(() => currentRole.value === 'kepalagudang' && currentLevelOrder.value === 2 && warehouseLevel.value.status === 'pending');
const isStaff = computed(() => currentRole.value === 'staff');
const needRevision = computed(() => managerLevel.value.status === 'needRevision' || warehouseLevel.value.status === 'needRevision');
const showRevisionButton = computed(() => isStaff.value && needRevision.value);
const showRevisionNotes = computed(() => items.value.some(i => i.revision_notes));
const totalQtyRequest = computed(() => items.value.reduce((sum, i) => sum + Number(i.qty_request), 0));

const documentStatusText = computed(() => {
  if (movement.value?.status === 'Approved') return "Disetujui";
  if (movement.value?.status === 'Rejected') return "Ditolak";
  if (needRevision.value) return "Perlu Revisi";
  return "Dalam Review";
});
const documentStatusClass = computed(() => {
  if (movement.value?.status === 'Approved') return "bg-green-100 text-green-800";
  if (movement.value?.status === 'Rejected') return "bg-red-100 text-red-800";
  if (needRevision.value) return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
});

const openRejectModal = (type) => { rejectType.value = type; rejectReason.value = ""; showRejectModal.value = true; };
const openRevisionModal = async () => {
  revisionItems.value = items.value.map(i => ({ ...i, original_qty: i.qty_request, revised_qty: i.qty_request, revision_note: i.revision_notes || "" }));
  showRevisionModal.value = true;
};

const validateRevisedQty = (item) => { 
  if(item.revised_qty < 0) item.error = "Minimal 0";
  else item.error = null;
};

const formatNumber = (v) => v == null ? "-" : new Intl.NumberFormat("id-ID").format(v);
const formatDate = (v) => v ? new Intl.DateTimeFormat("id-ID").format(new Date(v)) : "-";
const formatDateTime = (v) => v ? new Date(v).toLocaleString("id-ID") : "-";
const formatStatus = (s) => s === 'approved' ? 'Disetujui' : s === 'rejected' ? 'Ditolak' : s === 'needRevision' ? 'Revisi' : 'Pending';
const badgeStatus = (s) => {
  if (s === 'approved') return 'bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs';
  if (s === 'rejected') return 'bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs';
  if (s === 'needRevision') return 'bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs';
  return 'bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs';
};
const badgeExecution = (s) => s === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
const formatExecution = (s) => s === 'completed' ? 'Selesai' : 'Belum';
const getApproverName = (id) => approverNames.value[id] || (id ? "User" : "-");

onMounted(() => {
  loadMovement();
});
</script>