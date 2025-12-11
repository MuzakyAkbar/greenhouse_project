<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50"
  >
    <!-- HEADER -->
    <header
      class="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm"
    >
      <div
        class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Sistem Gudang</h1>
            <p class="text-xs text-gray-500">Manajemen Persediaan Cerdas</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Refresh Button -->
          <button
            @click="refreshAllData"
            class="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg border border-gray-300 transition font-medium text-sm shadow-sm hover:shadow flex items-center gap-2"
            title="Refresh Data"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>

          <button
            class="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg border border-gray-300 transition font-medium text-sm shadow-sm hover:shadow flex items-center gap-2"
            @click="logout()"
          >
            <svg
              class="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 512 512"
            >
              <path
                d="M505 273c9.4-9.4 9.4-24.6 0-33.9L361 95c-6.9-6.9-17.2-8.9-26.2-5.2S320 102.3 320 112l0 80-112 0c-26.5 0-48 21.5-48 48l0 32c0 26.5 21.5 48 48 48l112 0 0 80c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2L505 273zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- MAIN -->
    <div class="max-w-7xl mx-auto px-6 py-6">
      <!-- STATS CARDS -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <!-- TOTAL ITEMS -->
        <div
          class="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-5 text-white shadow-lg shadow-blue-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          @click="viewEmptyWarehouses"
          title="Klik untuk melihat gudang dengan stok kosong"
        >
          <div class="flex items-center justify-between">
            <div>
              <!-- Tampilkan jumlah gudang dengan stok 0 -->
              <h3 class="text-3xl font-bold">{{ emptyWarehousesCount }}</h3>
              <p class="text-sm opacity-90">Gudang Kosong</p>
              <p class="text-xs opacity-80 mt-1">Klik untuk detail →</p>
            </div>
            <svg
              class="w-8 h-8 opacity-80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <!-- Ikon warehouse dengan tanda peringatan -->
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
              <!-- Tanda seru di atas ikon -->
              <circle cx="12" cy="8" r="1" fill="currentColor" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 11v3" />
            </svg>
          </div>
        </div>
        <!-- TOTAL TRANSFERS -->
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-3xl font-bold text-gray-900">
                {{ totalTransfers }}
              </h3>
              <p class="text-sm text-gray-600">Total Transfers</p>
            </div>
            <svg
              class="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
        </div>

        <!-- NEED APPROVAL -->
        <div
          class="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-3xl font-bold">{{ needWarehouseApproval }}</h3>
              <p class="text-sm opacity-90">Need Approval</p>
            </div>
            <svg
              class="w-8 h-8 opacity-80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <!-- WAREHOUSES -->
        <div
          class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-3xl font-bold">{{ warehouseList.length }}</h3>
              <p class="text-sm opacity-90">Gudang</p>
            </div>
            <svg
              class="w-8 h-8 opacity-80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- TABS -->
      <div
        class="flex gap-2 mb-6 bg-white rounded-xl p-1.5 border border-gray-200 shadow-sm"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="relative flex-1 px-4 py-5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center"
          :class="[
            activeTab === tab.id
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          <span>{{ tab.label }}</span>

          <!-- Badge -->
          <span
            v-if="tab.id === 'approvals' && needWarehouseApproval > 0"
            class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow"
          >
            {{ needWarehouseApproval }}
          </span>
        </button>
      </div>

      <!-- LOADING STATE -->
      <div v-if="loading[activeTab]" class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"
        ></div>
        <p class="mt-4 text-gray-600">Memuat data...</p>
      </div>

      <!-- OVERVIEW TAB -->
      <div v-else-if="activeTab === 'overview'" class="space-y-6">
        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Warehouse Summary Section di Overview Tab -->
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">
              Warehouse Summary
            </h3>
            <div class="space-y-3">
              <div
                v-for="summary in warehouseStockSummary"
                :key="summary.warehouse"
                class="flex items-center justify-between p-3 rounded-lg border"
                :class="
                  summary.isWarehouseEmpty 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
                "
              >
                <div class="flex items-center gap-3">
                  <div>
                    <p class="font-medium">{{ summary.warehouse }}</p>
                    <p class="text-sm text-gray-500">
                      {{ summary.uniqueProducts }} produk
                      <span v-if="summary.isWarehouseEmpty" class="text-amber-600">
                        • Empty
                      </span>
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-xl font-bold" 
                    :class="summary.totalQty === 0 ? 'text-gray-500' : 'text-blue-600'">
                    {{ formatNumber(summary.totalQty) }}
                  </p>
                  <p class="text-xs text-gray-500">total qty</p>
                </div>
              </div>
            </div>
            
            <div v-if="warehouseStockSummary.length === 0" class="text-center py-4 text-gray-500">
              No warehouse data available
            </div>
          </div>
          <!-- Recent Transfers -->
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">
              Recent Transfers
            </h3>
            <div class="space-y-3">
              <div
                v-for="transfer in transferList.slice(0, 5)"
                :key="transfer.movement_id"
                class="p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium">{{ transfer.reference_no }}</p>
                    <p class="text-sm text-gray-500">
                      {{ transfer.source_name }} → {{ transfer.target_name }}
                    </p>
                  </div>
                  <span
                    :class="[
                      'px-2 py-1 text-xs rounded-full',
                      getStatusBadgeClass(transfer.status),
                    ]"
                  >
                    {{ transfer.status }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  {{ formatDate(transfer.created_at) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Approval Required -->
        <div
          v-if="pendingApprovals.length > 0"
          class="bg-amber-50 border border-amber-200 rounded-xl p-6"
        >
          <h3 class="text-lg font-semibold text-amber-800 mb-4">
            ⚠️ Menunggu Approval Anda
          </h3>
          <div class="space-y-4">
            <div
              v-for="transfer in pendingApprovals"
              :key="transfer.movement_id"
              class="bg-white rounded-lg border border-amber-100 p-4"
            >
              <div class="flex justify-between items-center">
                <div>
                  <h4 class="font-bold">{{ transfer.reference_no }}</h4>
                  <p class="text-sm text-gray-600">
                    {{ transfer.source_name }} → {{ transfer.target_name }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ transfer.items.length }} barang
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="approveWarehouse(transfer)"
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Approve
                  </button>
                  <button
                    @click="rejectWarehouse(transfer)"
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STOCK TAB -->
      <div v-else-if="activeTab === 'stock'" class="space-y-6">
        <!-- Stock Summary -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-800">
                Stock Inventory (Real-time from OpenBravo)
              </h3>
              <span class="text-sm text-gray-500">
                Showing {{ filteredStock.length }} of {{ stockList.length }} items
                <span v-if="selectedWarehouse" class="text-blue-600 font-medium">
                  • Filtered by: {{ selectedWarehouse }}
                </span>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <div class="relative">
                <Dropdown @select="filteredWarehouse" />
              </div>
              <button 
                @click="refreshAllData"
                class="px-3 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium flex items-center gap-2"
                title="Refresh data"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase"
                  >
                    Bahan Baku
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase"
                  >
                    Gudang
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase"
                  >
                    Tersedia
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase"
                  >
                    UoM
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase"
                  >
                    Diperbarui Terakhir
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="(item, index) in filteredStock"
                  :key="index"
                  class="hover:bg-blue-50/50"
                >
                  <td class="px-4 py-3">
                    <div>
                      <p class="font-medium text-gray-800">
                        {{ item.productName }}
                      </p>
                      <p class="text-xs text-gray-500">
                        ID: {{ item.productId || '-' }}
                      </p>
                    </div>
                  </td>

                  <td class="px-4 py-3">
                    <span
                      class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
                    >
                      {{ item.warehouse }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="font-bold text-gray-800">{{
                      formatNumber(item.qtyOnHand)
                    }}</span>
                  </td>

                  <td class="px-4 py-3">
                    <span class="text-gray-600">{{ item.uom }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-xs text-gray-500">
                      {{ formatDate(item.lastUpdated) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="stockList.length === 0"
            class="text-center py-8 text-gray-500"
          >
            <div class="text-4xl mb-2">📭</div>
            <p>No stock data found</p>
            <p class="text-sm mt-1">Coba perbarui data atau periksa koneksi OpenBravo</p>
          </div>
        </div>
      </div>

      <!-- TRANSFERS TAB -->
      <div v-else-if="activeTab === 'approvals'" class="space-y-4">
        <div
          v-if="transfersAwaitingMyApproval.length === 0"
          class="text-center py-12 text-gray-500"
        >
          Tidak ada transfer yang menunggu approval Anda
        </div>

        <div
          v-for="transfer in transfersAwaitingMyApproval"
          :key="transfer.movement_id"
          class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div
            class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4"
          >
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-bold text-gray-900">
                  {{ transfer.reference_no }}
                </h3>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-medium',
                    getStatusBadgeClass(transfer.status),
                  ]"
                >
                  {{ transfer.status }}
                </span>
              </div>
              <div class="flex items-center gap-4 text-sm text-gray-600">
                <span class="flex items-center gap-1">
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  {{ transfer.source_name }} → {{ transfer.target_name }}
                </span>
                <span>•</span>
                <span>{{ formatDate(transfer.created_at) }}</span>
                <span>•</span>
                <span>{{ transfer.items.length }} items</span>
              </div>
            </div>

            <div class="flex gap-2">
              <button
                @click="viewTransferDetail(transfer)"
                class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm"
              >
                View Details
              </button>
            </div>
          </div>

          <!-- Transfer Items -->
          <div class="border-t pt-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="item in transfer.items.slice(0, 3)"
                :key="item.movement_item_id"
                class="bg-gray-50 rounded-lg p-3"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <p class="font-medium text-sm">{{ item.material_name }}</p>
                    <p class="text-xs text-gray-500">
                      {{ item.material_code }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-bold text-gray-800">
                      {{ item.qty }} {{ item.uom }}
                    </p>
                    <p v-if="item.qty_received" class="text-xs text-green-600">
                      Received: {{ item.qty_received }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-if="transfer.items.length > 3"
                class="bg-blue-50 rounded-lg p-3 flex items-center justify-center"
              >
                <span class="text-blue-700 font-medium">
                  +{{ transfer.items.length - 3 }} more items
                </span>
              </div>
            </div>
          </div>

          <!-- Approval Status -->
          <div v-if="transfer.approval_levels" class="border-t mt-4 pt-4">
            <p class="text-sm font-medium text-gray-700 mb-2">
              Approval Status:
            </p>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <div
                  :class="[
                    'w-3 h-3 rounded-full',
                    transfer.manager_status === 'approved'
                      ? 'bg-green-500'
                      : transfer.manager_status === 'rejected'
                      ? 'bg-red-500'
                      : 'bg-yellow-500',
                  ]"
                ></div>
                <span class="text-xs"
                  >Manager: {{ transfer.manager_status || "pending" }}</span
                >
              </div>
              <div class="flex items-center gap-2">
                <div
                  :class="[
                    'w-3 h-3 rounded-full',
                    transfer.warehouse_status === 'approved'
                      ? 'bg-green-500'
                      : transfer.warehouse_status === 'rejected'
                      ? 'bg-red-500'
                      : 'bg-yellow-500',
                  ]"
                ></div>
                <span class="text-xs"
                  >Warehouse: {{ transfer.warehouse_status || "pending" }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- WAREHOUSES TAB -->
      <div
        v-else-if="activeTab === 'warehouses'"
        class="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div
          v-for="warehouse in warehouseList"
          :key="warehouse.location_id || warehouse.id"
          class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-gray-800">
                {{ warehouse._identifier || warehouse.name }}
              </h3>
            </div>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Status:</span>
              <span
                :class="[
                  'px-2 py-0.5 rounded text-xs',
                  warehouse.active !== false
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800',
                ]"
              >
                {{ warehouse.active !== false ? "Active" : "Inactive" }}
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="warehouseList.length === 0"
          class="col-span-3 text-center py-12 text-gray-500"
        >
          Tidak ada data gudang yang tersedia
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { supabase } from "@/lib/supabase";
import openbravoApi from "@/lib/openbravo";
import Dropdown from "../components/Dropdown.vue";

const auth = useAuthStore();
const router = useRouter();

/* STATE */
const warehouseList = ref([]);
const materialList = ref([]);
const stockList = ref([]);
const transferList = ref([]);
const movementItems = ref([]);
const approvalLevels = ref([]);
const approvalRecords = ref([]);
const searchQuery = ref("");
const activeTab = ref("overview");
const loading = ref({
  warehouses: false,
  stock: false,
  transfers: false,
  approvals: false,
});
const selectedWarehouse = ref(null);

/* ---------------------------------------------------
   COMPUTED PROPERTIES
--------------------------------------------------- */

// Hitung jumlah gudang dengan qtyAvailable = 0
const emptyWarehousesCount = computed(() => {
  if (stockList.value.length === 0) return 0;
  
  // Dapatkan daftar unik warehouse dengan qtyAvailable = 0
  const emptyWarehouseSet = new Set();
  
  stockList.value.forEach(item => {
    // Periksa item yang memiliki qtyAvailable = 0
    // Tapi jangan hitung item khusus (NO_PRODUCT, ERROR) karena itu adalah placeholder
    if (Number(item.qtyAvailable) === 0 && 
        item.productId !== 'NO_PRODUCT' && 
        item.productId !== 'ERROR' &&
        !item.isEmptyWarehouse) {
      emptyWarehouseSet.add(item.warehouse);
    }
  });
  
  return emptyWarehouseSet.size;
});

// Daftar gudang yang memiliki item dengan qtyAvailable = 0
const emptyWarehouses = computed(() => {
  if (stockList.value.length === 0) return [];
  
  const emptyWarehouseMap = new Map(); // Untuk menyimpan nama warehouse dan jumlah item kosong
  
  stockList.value.forEach(item => {
    // Periksa item yang memiliki qtyAvailable = 0
    // Tapi jangan hitung item khusus (NO_PRODUCT, ERROR) karena itu adalah placeholder
    if (Number(item.qtyAvailable) === 0 && 
        item.productId !== 'NO_PRODUCT' && 
        item.productId !== 'ERROR' &&
        !item.isEmptyWarehouse) {
      
      const currentCount = emptyWarehouseMap.get(item.warehouse) || 0;
      emptyWarehouseMap.set(item.warehouse, currentCount + 1);
    }
  });
  
  // Konversi ke array dan urutkan berdasarkan jumlah item kosong (descending)
  return Array.from(emptyWarehouseMap.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([warehouseName]) => warehouseName);
});

// Gudang yang benar-benar kosong (tidak ada item sama sekali atau hanya placeholder)
const completelyEmptyWarehouses = computed(() => {
  if (stockList.value.length === 0) return [];
  
  const warehouseItemCount = new Map();
  
  // Hitung jumlah item nyata per warehouse
  stockList.value.forEach(item => {
    if (item.productId !== 'NO_PRODUCT' && 
        item.productId !== 'ERROR' &&
        !item.isEmptyWarehouse) {
      
      const currentCount = warehouseItemCount.get(item.warehouse) || 0;
      warehouseItemCount.set(item.warehouse, currentCount + 1);
    }
  });
  
  // Warehouse yang tidak memiliki item nyata sama sekali
  const completelyEmpty = [];
  
  warehouseList.value.forEach(warehouse => {
    const itemCount = warehouseItemCount.get(warehouse.name) || 0;
    if (itemCount === 0) {
      completelyEmpty.push(warehouse.name);
    }
  });
  
  return completelyEmpty;
});

/* ---------------------------------------------------
   METHODS BARU
--------------------------------------------------- */
const viewEmptyWarehouses = () => {
  // 1. Pindah ke tab Stock
  activeTab.value = "stock";

  setTimeout(() => {
    // 2. Cari warehouse yang punya item qtyAvailable = 0
    const targetWarehouse = emptyWarehouses.value[0];

    if (!targetWarehouse) {
      alert("Tidak ada gudang dengan stok 0");
      return;
    }

    // 3. Set dropdown warehouse
    selectedWarehouse.value = targetWarehouse;

    // 4. Filter stock (yang sudah built-in)
    filteredWarehouse({
      _identifier: targetWarehouse,
    });

    // 5. Tunggu tabel render lalu filter lagi hanya qty = 0
    setTimeout(() => {
      const tableRows = document.querySelectorAll("tbody tr");

      tableRows.forEach((row) => {
        const qtyCell = row.children[2];
        if (!qtyCell) return;

        const qty = Number(qtyCell.textContent.replace(/\./g, ""));

        if (qty !== 0) {
          row.style.display = "none"; // hide rows not zero
        } else {
          // highlight rows with zero
          row.style.background = "#fff7d6";
          row.style.borderLeft = "4px solid #f59e0b";
        }
      });

      // Auto scroll
      document
        .querySelector("table")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  }, 150);
};


// Method untuk menampilkan notifikasi gudang dengan item qtyAvailable = 0
const showEmptyWarehouseNotification = (warehouseName) => {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2 animate-fade-in';
  toast.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
    <div>
      <span class="font-medium">Gudang: ${warehouseName}</span>
      <p class="text-sm opacity-90">Memiliki item dengan stok tersedia = 0</p>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 4000);
};

// Method untuk menampilkan notifikasi gudang yang benar-benar kosong
const showCompletelyEmptyWarehouseNotification = (warehouseName) => {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2 animate-fade-in';
  toast.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <span class="font-medium">Gudang: ${warehouseName}</span>
      <p class="text-sm opacity-90">Tidak memiliki produk sama sekali</p>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 4000);
};

// Method untuk notifikasi tidak ada gudang kosong
const showNoEmptyWarehouseNotification = () => {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2 animate-fade-in';
  toast.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <span class="font-medium">Semua gudang memiliki stok!</span>
      <p class="text-sm opacity-90">Tidak ada item dengan qty tersedia = 0</p>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
};

// Method untuk highlight item dengan qtyAvailable = 0
const highlightZeroAvailableItems = () => {
  // Tunggu sebentar agar tabel dirender
  setTimeout(() => {
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach(row => {
      // Cari kolom qtyAvailable (kolom ke-3, index 2)
      const qtyCell = row.children[2];
      if (qtyCell) {
        const qtyText = qtyCell.textContent.trim();
        const qtyNumber = Number(qtyText.replace(/\./g, ''));
        
        if (qtyNumber === 0) {
          row.style.backgroundColor = '#fef3c7'; // bg-amber-50
          row.style.borderLeft = '4px solid #f59e0b'; // border-amber-500
          
          // Tambahkan ikon peringatan
          const warningIcon = document.createElement('span');
          warningIcon.innerHTML = '⚠️';
          warningIcon.className = 'mr-2';
          qtyCell.insertBefore(warningIcon, qtyCell.firstChild);
        }
      }
    });
  }, 300);
};

// Method untuk mereset highlight
const resetHighlight = () => {
  const tableRows = document.querySelectorAll('tbody tr');
  tableRows.forEach(row => {
    row.style.backgroundColor = '';
    row.style.borderLeft = '';
    
    // Hapus ikon peringatan
    const warningIcon = row.querySelector('span[innerHTML="⚠️"]');
    if (warningIcon) {
      warningIcon.remove();
    }
  });
};

// Tambahkan watcher untuk reset highlight ketika selectedWarehouse berubah
watch(selectedWarehouse, () => {
  if (activeTab.value === 'stock') {
    // Tunggu tabel dirender ulang
    setTimeout(() => {
      resetHighlight();
    }, 200);
  }
});

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "stock", label: "Stock" },
  { id: "warehouses", label: "Warehouses" },
  { id: "approvals", label: "Approvals" },
];

/* ---------------------------------------------------
   LOGOUT
--------------------------------------------------- */
const logout = async () => {
  const status = await auth.logout();
  if (status) {
    alert("Logout Berhasil!");
    router.replace({ name: "login" });
    return;
  }
  return alert("Gagal Logout!");
};

/* ---------------------------------------------------
   LOAD WAREHOUSE DATA (FROM OPENBRAVO - SAMA SEPERTI ADDNEWGM)
--------------------------------------------------- */
const loadWarehouses = async () => {
  loading.value.warehouses = true;
  try {
    const { data } = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Warehouse',
    );
    
    if (data?.response?.data) {
      warehouseList.value = data.response.data.map((w) => ({
        id: w.id,
        name: w.name,
        _identifier: w._identifier,
        active: w.active !== false,
      }));
      console.log("🏭 Warehouse List loaded:", warehouseList.value.length, "warehouses");
    } else {
      console.warn("⚠️ Tidak ada data warehouse dari OpenBravo");
      warehouseList.value = [];
    }
  } catch (err) {
    console.error("❌ ERROR loadWarehouses:", err);
    alert("Gagal memuat data warehouse dari OpenBravo");
  } finally {
    loading.value.warehouses = false;
  }
};

/* ---------------------------------------------------
   LOAD MATERIALS FROM OPENBRAVO (SAMA SEPERTI ADDNEWGM)
--------------------------------------------------- */
/* ---------------------------------------------------
   LOAD MATERIALS FROM OPENBRAVO (SEMUA MATERIAL TERMASUK YANG QTY 0)
--------------------------------------------------- */
const loadMaterialsFromOpenBravo = async () => {
  loading.value.stock = true;
  try {
    console.log("📦 Loading materials from OpenBravo...");
    
    // Ambil semua warehouse dulu
    await loadWarehouses();
    
    if (warehouseList.value.length === 0) {
      console.warn("⚠️ Tidak ada warehouse, tidak bisa load materials");
      stockList.value = [];
      return;
    }
    
    let allMaterials = [];
    
    // Untuk setiap warehouse, ambil locator pertama dan materialnya
    for (const warehouse of warehouseList.value) {
      try {
        // 1. Ambil locator/bin untuk warehouse ini
        const { data: locatorRes } = await openbravoApi.get(
          '/org.openbravo.service.json.jsonrest/Locator',
          { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } }
        );
        
        const locators = locatorRes?.response?.data || [];
        
        if (locators.length === 0) {
          console.log(`⚠️ Tidak ada locator untuk warehouse: ${warehouse.name}`);
          
          // Tambahkan warehouse kosong ke daftar
          allMaterials.push({
            productId: 'NO_PRODUCT',
            productName: 'No Material Available',
            uomId: null,
            uom: '-',
            stock: 0,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            warehouseCode: warehouse._identifier,
            locatorId: null,
            locatorName: 'No Locator',
            isEmptyWarehouse: true,
          });
          continue;
        }
        
        // 2. Ambil locator pertama
        const locatorId = locators[0].id;
        const locatorName = locators[0]._identifier || locators[0].searchKey || 'Default Bin';
        
        // 3. Ambil SEMUA material dari locator ini (termasuk yang qty = 0)
        const { data: materialsRes } = await openbravoApi.get(
          '/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail',
          {
            params: { _where: `M_Locator_ID='${locatorId}'` }, // HAPUS: AND quantityOnHand > 0
          }
        );
        
        const rows = materialsRes?.response?.data || [];
        
        console.log(`📊 Warehouse ${warehouse.name}: ${rows.length} materials found (including zero qty)`);
        
        if (rows.length === 0) {
          // Jika tidak ada material sama sekali di warehouse ini
          allMaterials.push({
            productId: 'NO_PRODUCT',
            productName: 'No Material Available',
            uomId: null,
            uom: '-',
            stock: 0,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            warehouseCode: warehouse._identifier,
            locatorId: locatorId,
            locatorName: locatorName,
            isEmptyWarehouse: true,
          });
        } else {
          // Format data
          const formattedRows = rows.map((r) => ({
            productId: r.product,
            productName: r['product$_identifier'] || '(Tanpa Nama Produk)',
            uomId: r.uOM,
            uom: r['uOM$_identifier'] || null,
            stock: r.quantityOnHand ?? 0,
            storageBin: r.storageBin,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            warehouseCode: warehouse._identifier,
            locatorId: locatorId,
            locatorName: locatorName,
            isEmptyWarehouse: false,
          }));
          
          allMaterials = [...allMaterials, ...formattedRows];
        }
      } catch (err) {
        console.warn(`❌ Gagal load materials untuk warehouse ${warehouse.name}:`, err);
        
        // Tambahkan warehouse error sebagai entry kosong
        allMaterials.push({
          productId: 'ERROR',
          productName: 'Error Loading Materials',
          uomId: null,
          uom: '-',
          stock: 0,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          warehouseCode: warehouse._identifier,
          locatorId: null,
          locatorName: 'Error',
          isEmptyWarehouse: true,
          hasError: true,
        });
      }
    }
    
    // 5. Konversi ke format yang dibutuhkan dashboard
    stockList.value = allMaterials.map((material) => ({
      productId: material.productId,
      productName: material.productName,
      productCode: material.productId,
      warehouseId: material.warehouseId,
      warehouse: material.warehouseName,
      warehouseCode: material.warehouseCode,
      qtyOnHand: Number(material.stock),
      qtyAvailable: Number(material.stock),
      qtyReserved: 0,
      uom: material.uom || 'Unit',
      lastUpdated: new Date().toISOString(),
      locator: material.locatorName,
      isEmptyWarehouse: material.isEmptyWarehouse || false,
      hasError: material.hasError || false,
    }));
    
    console.log('✅ Materials loaded:', stockList.value.length, 'items');
    
  } catch (err) {
    console.error('❌ ERROR loadMaterialsFromOpenBravo:', err);
    useFallbackData();
  } finally {
    loading.value.stock = false;
  }
};

/* ---------------------------------------------------
   LOAD MATERIALS BY SPECIFIC WAREHOUSE (TERMASUK YANG KOSONG)
--------------------------------------------------- */
const loadMaterialsByWarehouseId = async (warehouseId) => {
  try {
    // 1. Cari warehouse berdasarkan ID atau nama
    const warehouse = warehouseList.value.find(w => 
      w.id === warehouseId || w._identifier === warehouseId || w.name === warehouseId
    );
    
    if (!warehouse) {
      console.warn(`⚠️ Warehouse tidak ditemukan: ${warehouseId}`);
      return [];
    }
    
    // 2. Ambil locator pertama untuk warehouse ini
    const { data: locatorRes } = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Locator',
      { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } }
    );
    
    const locators = locatorRes?.response?.data || [];
    if (locators.length === 0) {
      console.warn(`⚠️ Tidak ada locator untuk warehouse: ${warehouse.name}`);
      return [{
        productId: 'NO_PRODUCT',
        productName: 'No Material Available',
        productCode: 'NO_PRODUCT',
        warehouseId: warehouse.id,
        warehouse: warehouse.name,
        qtyOnHand: 0,
        qtyAvailable: 0,
        qtyReserved: 0,
        uom: '-',
        lastUpdated: new Date().toISOString(),
        locator: 'No Locator',
        isEmptyWarehouse: true,
      }];
    }
    
    const locatorId = locators[0].id;
    const locatorName = locators[0]._identifier || 'Default Bin';
    
    // 3. Ambil SEMUA material dari locator ini (termasuk yang qty = 0)
    const { data: materialsRes } = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail',
      {
        params: { _where: `M_Locator_ID='${locatorId}'` }, // HAPUS filter quantityOnHand > 0
      }
    );
    
    const rows = materialsRes?.response?.data || [];
    
    if (rows.length === 0) {
      return [{
        productId: 'NO_PRODUCT',
        productName: 'No Material Available',
        productCode: 'NO_PRODUCT',
        warehouseId: warehouse.id,
        warehouse: warehouse.name,
        qtyOnHand: 0,
        qtyAvailable: 0,
        qtyReserved: 0,
        uom: '-',
        lastUpdated: new Date().toISOString(),
        locator: locatorName,
        isEmptyWarehouse: true,
      }];
    }
    
    // 4. Format data
    return rows.map((r) => ({
      productId: r.product,
      productName: r['product$_identifier'] || '(Tanpa Nama Produk)',
      productCode: r.product,
      warehouseId: warehouse.id,
      warehouse: warehouse.name,
      qtyOnHand: Number(r.quantityOnHand ?? 0),
      qtyAvailable: Number(r.quantityOnHand ?? 0),
      qtyReserved: 0,
      uom: r['uOM$_identifier'] || 'Unit',
      lastUpdated: new Date().toISOString(),
      locator: locatorName,
      isEmptyWarehouse: false,
    }));
  } catch (err) {
    console.error('❌ ERROR loadMaterialsByWarehouseId:', err);
    return [{
      productId: 'ERROR',
      productName: 'Error Loading Materials',
      productCode: 'ERROR',
      warehouseId: warehouseId,
      warehouse: warehouseId,
      qtyOnHand: 0,
      qtyAvailable: 0,
      qtyReserved: 0,
      uom: '-',
      lastUpdated: new Date().toISOString(),
      locator: 'Error',
      isEmptyWarehouse: true,
      hasError: true,
    }];
  }
};

/* ---------------------------------------------------
   FILTER WAREHOUSE FUNCTION
--------------------------------------------------- */
const filteredWarehouse = async (item) => {
  if (item && item._identifier) {
    selectedWarehouse.value = item._identifier;
    console.log(`🔍 Filtering by warehouse: ${item._identifier}`);
    
    // Jika memilih warehouse tertentu, load material untuk warehouse itu saja
    const materials = await loadMaterialsByWarehouseId(item._identifier);
    stockList.value = materials;
  } else {
    selectedWarehouse.value = null;
    console.log('🔍 Clearing warehouse filter');
    // Jika clear filter, load semua materials
    await loadMaterialsFromOpenBravo();
  }
};

/* ---------------------------------------------------
   FALLBACK DATA FUNCTION
--------------------------------------------------- */
const useFallbackData = () => {
  console.log("🔄 Using fallback data from Supabase");
  
  // Coba load dari Supabase jika OpenBravo gagal
  loadMaterialStock().then(() => {
    if (materialList.value.length > 0) {
      stockList.value = materialList.value.map((material) => ({
        productId: material.material_used_id,
        productName: material.material_name,
        productCode: material.openbravo_id || material.material_code || "-",
        warehouse: material.warehouse_location || "Main Warehouse",
        qtyOnHand: Number(material.current_stock || material.qty || 0),
        qtyAvailable: Number(material.current_stock || material.qty || 0),
        qtyReserved: 0,
        uom: material.uom || "pcs",
        lastUpdated: new Date().toISOString(),
      }));
      
      console.log("📊 Fallback stock data loaded:", stockList.value.length, "items");
    } else {
      console.warn("⚠️ No fallback data available");
      stockList.value = [];
    }
  });
};

/* ---------------------------------------------------
   LOAD MATERIAL STOCK FROM SUPABASE (FALLBACK)
--------------------------------------------------- */
const loadMaterialStock = async () => {
  try {
    const { data: materials, error } = await supabase
      .from("gh_material_used")
      .select("*")
      .order("material_name", { ascending: true });
    
    if (error) throw error;
    
    materialList.value = materials || [];
    console.log("📦 Material List (Supabase):", materialList.value.length, "items");
  } catch (err) {
    console.error("❌ ERROR loadMaterialStock:", err);
    materialList.value = [];
  }
};

/* ---------------------------------------------------
   LOAD TRANSFERS WITH APPROVAL STATUS
--------------------------------------------------- */
const loadMovementTransfers = async () => {
  loading.value.transfers = true;
  try {
    // Load movements
    const { data: movements, error: mvError } = await supabase
      .from("gh_movement")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (mvError) throw mvError;
    
    if (!movements || movements.length === 0) {
      transferList.value = [];
      return;
    }
    
    // Load locations
    const { data: locations, error: locError } = await supabase
      .from("gh_location")
      .select("*");
    
    if (locError) throw locError;
    
    const locationMap = {};
    locations?.forEach((l) => {
      locationMap[l.location_id] = {
        name: l.location,
        code: l.id_openbravo,
      };
    });
    
    // Load movement items
    const movementIds = movements.map((m) => m.movement_id);
    const { data: items, error: itemsError } = await supabase
      .from("gh_movement_item")
      .select(
        `
        *,
        material:gh_material_used(material_name, openbravo_id, uom)
      `
      )
      .in("movement_id", movementIds);
    
    if (itemsError) throw itemsError;
    
    // Load approval records
    const { data: approvalRecords } = await supabase
      .from("gh_approve_record")
      .select(
        `
        *,
        levels:gh_approval_level_status(*)
      `
      )
      .eq("reference_type", "movement")
      .in(
        "reference_id",
        movementIds.map((id) => id.toString())
      );
    
    const approvalMap = {};
    approvalRecords?.forEach((record) => {
      approvalMap[record.reference_id] = record;
    });
    
    const itemsByMovement = {};
    items?.forEach((item) => {
      if (!itemsByMovement[item.movement_id]) {
        itemsByMovement[item.movement_id] = [];
      }
      itemsByMovement[item.movement_id].push({
        ...item,
        material_name: item.material?.material_name || "Unknown",
        material_code: item.material?.openbravo_id || "N/A",
        uom: item.material?.uom || "pcs",
      });
    });
    
    transferList.value = movements.map((movement) => {
      const approvalRecord = approvalMap[movement.movement_id?.toString()];
      const approvalLevels = approvalRecord?.levels || [];
      
      const managerRow = approvalLevels.find((lvl) => lvl.level_order === 1);
      const warehouseRow = approvalLevels.find((lvl) => lvl.level_order === 2);
      
      const currentLevel = Number(approvalRecord?.current_level_order || 1);
      const overallStatus = approvalRecord?.overall_status || "onReview";
      
      // Tentukan Status Visual Manager
      let displayManagerStatus = "pending";
      if (currentLevel > 1) {
        displayManagerStatus = "approved";
      } else if (overallStatus === "rejected" && currentLevel === 1) {
        displayManagerStatus = "rejected";
      } else {
        displayManagerStatus = managerRow?.status || "pending";
      }
      
      let displayWarehouseStatus = "pending";
      if (currentLevel > 2) {
        displayWarehouseStatus = "approved";
      } else if (currentLevel === 2) {
        displayWarehouseStatus =
          overallStatus === "rejected" ? "rejected" : "pending";
      } else {
        displayWarehouseStatus = "waiting";
      }
      
      const userRole = auth.user?.role?.toLowerCase() || "";
      const isKepalaGudang = userRole.includes("gudang");
      
      const isAwaitingWarehouseApproval =
        currentLevel === 2 && overallStatus === "onReview";
      
      const needMyWarehouseAction =
        isAwaitingWarehouseApproval && isKepalaGudang;
      
      return {
        ...movement,
        source_name:
          locationMap[movement.source_location_id]?.name || "Unknown",
        source_code: locationMap[movement.source_location_id]?.code,
        target_name:
          locationMap[movement.target_location_id]?.name || "Unknown",
        target_code: locationMap[movement.target_location_id]?.code,
        items: itemsByMovement[movement.movement_id] || [],
        
        approval_record: approvalRecord,
        approval_levels: approvalLevels,
        
        manager_status: displayManagerStatus,
        warehouse_status: displayWarehouseStatus,
        
        isAwaitingWarehouseApproval,
        needMyWarehouseAction,
      };
    });
    
    console.log("🚚 Transfer List:", transferList.value.length, "transfers");
  } catch (err) {
    console.error("❌ ERROR loadMovementTransfers:", err);
    alert("Gagal memuat data transfer");
  } finally {
    loading.value.transfers = false;
  }
};

/* ---------------------------------------------------
   LOAD PENDING APPROVALS
--------------------------------------------------- */
const loadPendingApprovals = async () => {
  loading.value.approvals = true;
  try {
    const { data: records, error } = await supabase
      .from("gh_approve_record")
      .select(
        `
        *,
        levels:gh_approval_level_status(*)
      `
      )
      .eq("reference_type", "movement")
      .eq("overall_status", "pending");
    
    if (error) throw error;
    
    let enrichedRecords = records || [];
    
    if (enrichedRecords.length > 0) {
      const movementIds = enrichedRecords.map((r) => parseInt(r.reference_id));
      const { data: movements, error: mvError } = await supabase
        .from("gh_movement")
        .select("*")
        .in("movement_id", movementIds);
      
      if (mvError) throw mvError;
      
      enrichedRecords = enrichedRecords.map((record) => {
        const movement = movements?.find(
          (m) => m.movement_id === parseInt(record.reference_id)
        );
        return {
          ...record,
          movement,
        };
      });
    }
    
    approvalRecords.value = enrichedRecords;
    console.log("📋 Pending Approvals:", approvalRecords.value.length, "records");
  } catch (err) {
    console.error("❌ ERROR loadPendingApprovals:", err);
  } finally {
    loading.value.approvals = false;
  }
};

/* ---------------------------------------------------
   APPROVE TRANSFER (KEPALA GUDANG)
--------------------------------------------------- */
const approveWarehouse = async (transfer) => {
  if (
    !confirm(
      `Approve transfer ${transfer.reference_no}?\n\nFrom: ${transfer.source_name}\nTo: ${transfer.target_name}`
    )
  ) {
    return;
  }
  
  try {
    const { data: approvalRecord } = await supabase
      .from("gh_approve_record")
      .select("*")
      .eq("reference_type", "movement")
      .eq("reference_id", transfer.movement_id.toString())
      .single();
    
    if (!approvalRecord) {
      throw new Error("Approval record not found");
    }
    
    const now = new Date().toISOString();
    const { error: levelError } = await supabase
      .from("gh_approval_level_status")
      .update({
        status: "approved",
        approved_by: auth.user?.user_id || auth.user?.name,
        approved_at: now,
        level_name: "Kepala Gudang",
      })
      .eq("record_id", approvalRecord.record_id)
      .eq("level_order", 2);
    
    if (levelError) throw levelError;
    
    const { error: recordError } = await supabase
      .from("gh_approve_record")
      .update({
        current_level: 3,
        overall_status: "approved",
        completed_at: now,
      })
      .eq("record_id", approvalRecord.record_id);
    
    if (recordError) throw recordError;
    
    const { error: movementError } = await supabase
      .from("gh_movement")
      .update({
        status: "Approved",
        updated_at: now,
      })
      .eq("movement_id", transfer.movement_id);
    
    if (movementError) throw movementError;
    
    alert(`✅ Transfer ${transfer.reference_no} approved!`);
    
    await loadMovementTransfers();
    await loadPendingApprovals();
  } catch (err) {
    console.error("❌ ERROR approveWarehouse:", err);
    alert("Gagal melakukan approval");
  }
};

/* ---------------------------------------------------
   REJECT TRANSFER (KEPALA GUDANG)
--------------------------------------------------- */
const rejectWarehouse = async (transfer) => {
  const reason = prompt("Alasan penolakan:", "");
  if (!reason) return;
  
  if (
    !confirm(`Tolak transfer ${transfer.reference_no}?\n\nAlasan: ${reason}`)
  ) {
    return;
  }
  
  try {
    const { data: approvalRecord } = await supabase
      .from("gh_approve_record")
      .select("*")
      .eq("reference_type", "movement")
      .eq("reference_id", transfer.movement_id.toString())
      .single();
    
    if (!approvalRecord) {
      throw new Error("Approval record not found");
    }
    
    const now = new Date().toISOString();
    const { error: levelError } = await supabase
      .from("gh_approval_level_status")
      .update({
        status: "rejected",
        revision_notes: reason,
        revision_requested_by: auth.user?.user_id || auth.user?.name,
        revision_requested_at: now,
        level_name: "Kepala Gudang",
      })
      .eq("record_id", approvalRecord.record_id)
      .eq("level_order", 2);
    
    if (levelError) throw levelError;
    
    const { error: recordError } = await supabase
      .from("gh_approve_record")
      .update({
        overall_status: "rejected",
        completed_at: now,
      })
      .eq("record_id", approvalRecord.record_id);
    
    if (recordError) throw recordError;
    
    const { error: movementError } = await supabase
      .from("gh_movement")
      .update({
        status: "Rejected",
        rejection_reason: reason,
        updated_at: now,
      })
      .eq("movement_id", transfer.movement_id);
    
    if (movementError) throw movementError;
    
    alert(`❌ Transfer ${transfer.reference_no} ditolak!`);
    
    await loadMovementTransfers();
    await loadPendingApprovals();
  } catch (err) {
    console.error("❌ ERROR rejectWarehouse:", err);
    alert("Gagal melakukan penolakan");
  }
};

/* ---------------------------------------------------
   VIEW TRANSFER DETAIL
--------------------------------------------------- */
const viewTransferDetail = (transfer) => {
  console.log(transfer.movement_id)
  return router.push({
    name: "detailmovement",
    params: { id: transfer.movement_id },
  });
};

/* ---------------------------------------------------
   COMPUTED PROPERTIES
--------------------------------------------------- */
const totalItems = computed(() => {
  return stockList.value.reduce((sum, row) => sum + Number(row.qtyOnHand), 0);
});

const totalTransfers = computed(() => {
  return transferList.value.length;
});

const needWarehouseApproval = computed(() => {
  return transfersAwaitingMyApproval.value.length;
});

const pendingApprovals = computed(() => {
  return transfersAwaitingMyApproval.value;
});

const filteredStock = computed(() => {
  if (!selectedWarehouse.value) return stockList.value;
  
  const filtered = stockList.value.filter((x) => 
    x.warehouse === selectedWarehouse.value || 
    x.warehouseCode === selectedWarehouse.value
  );
  
  // Jika filter menghasilkan array kosong, tambahkan entry untuk warehouse yang kosong
  if (filtered.length === 0 && selectedWarehouse.value) {
    const warehouse = warehouseList.value.find(w => 
      w.name === selectedWarehouse.value || w._identifier === selectedWarehouse.value
    );
    
    if (warehouse) {
      return [{
        productId: 'NO_PRODUCT',
        productName: 'No Material Available in this Warehouse',
        productCode: 'NO_PRODUCT',
        warehouseId: warehouse.id,
        warehouse: warehouse.name,
        qtyOnHand: 0,
        qtyAvailable: 0,
        qtyReserved: 0,
        uom: '-',
        lastUpdated: new Date().toISOString(),
        locator: 'No Data',
        isEmptyWarehouse: true,
      }];
    }
  }
  return filtered;
});

const transfersAwaitingMyApproval = computed(() => {
  return transferList.value.filter((t) => t.needMyWarehouseAction);
});

const warehouseStockSummary = computed(() => {
  const summary = {};
  
  // Inisialisasi semua warehouse terlebih dahulu
  warehouseList.value.forEach((warehouse) => {
    summary[warehouse.name] = {
      warehouseName: warehouse.name,
      totalQty: 0,
      uniqueProducts: new Set(),
      isWarehouseEmpty: true,
    };
  });
  
  // Isi data dari stockList
  stockList.value.forEach((item) => {
    if (!summary[item.warehouse]) {
      summary[item.warehouse] = {
        warehouseName: item.warehouse,
        totalQty: 0,
        uniqueProducts: new Set(),
        isWarehouseEmpty: false,
      };
    }
    
    // Hanya hitung jika bukan entry khusus (NO_PRODUCT, ERROR)
    if (item.productId !== 'NO_PRODUCT' && item.productId !== 'ERROR') {
      summary[item.warehouse].totalQty += item.qtyOnHand;
      summary[item.warehouse].uniqueProducts.add(item.productId);
      summary[item.warehouse].isWarehouseEmpty = false;
    }
  });
  
  // Konversi ke array dan urutkan berdasarkan nama
  return Object.values(summary)
    .sort((a, b) => a.warehouseName.localeCompare(b.warehouseName))
    .map((data) => ({
      warehouse: data.warehouseName,
      totalQty: data.totalQty,
      uniqueProducts: data.uniqueProducts.size,
      isWarehouseEmpty: data.isWarehouseEmpty,
    }));
});

/* ---------------------------------------------------
   UTILITY FUNCTIONS
--------------------------------------------------- */
const formatNumber = (num) => {
  return new Intl.NumberFormat("id-ID").format(num);
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

const getStatusBadgeClass = (status) => {
  const statusLower = (status || "").toLowerCase();
  if (statusLower.includes("approved") || statusLower.includes("completed")) {
    return "bg-green-100 text-green-800";
  } else if (
    statusLower.includes("pending") ||
    statusLower.includes("waiting")
  ) {
    return "bg-yellow-100 text-yellow-800";
  } else if (
    statusLower.includes("rejected") ||
    statusLower.includes("cancelled")
  ) {
    return "bg-red-100 text-red-800";
  } else if (
    statusLower.includes("progress") ||
    statusLower.includes("processing")
  ) {
    return "bg-blue-100 text-blue-800";
  }
  return "bg-gray-100 text-gray-800";
};

/* ---------------------------------------------------
   REFRESH ALL DATA
--------------------------------------------------- */
const refreshAllData = async () => {
  try {
    console.log("🔄 Refreshing dashboard data...");
    
    // Load materials dari OpenBravo (sama seperti addnewgm)
    await loadMaterialsFromOpenBravo();
    console.log("✅ Materials loaded");
    
    // Load transfers and approvals
    await loadMovementTransfers();
    console.log("✅ Transfers loaded");
    
    await loadPendingApprovals();
    console.log("✅ Approvals loaded");
    
    console.log("🎉 All data refreshed successfully");
  } catch (err) {
    console.error("❌ Error refreshing all data:", err);
  }
};

/* ---------------------------------------------------
   INITIALIZATION
--------------------------------------------------- */
onMounted(async () => {
  console.log("🚀 Initializing Warehouse Dashboard...");
  console.log("👤 User Role:", auth.user?.role);
  
  await refreshAllData();
  
  // Auto-refresh setiap 60 detik
  setInterval(async () => {
    if (document.visibilityState === "visible") {
      console.log("🔄 Auto-refreshing stock data...");
      await loadMaterialsFromOpenBravo();
      await loadMovementTransfers();
    }
  }, 60000);
});
</script>