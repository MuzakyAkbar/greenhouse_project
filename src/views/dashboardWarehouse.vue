<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50"
  >
    <header
      class="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm"
    >
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0"
      >
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <div
            class="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 sm:w-6 sm:h-6 text-white"
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
          <div class="flex-1 sm:flex-none">
            <h1
              class="text-lg sm:text-xl font-bold text-gray-900 leading-tight"
            >
              Sistem Gudang
            </h1>
            <p class="text-xs text-gray-500">Manajemen Persediaan Cerdas</p>
          </div>
        </div>

        <div
          class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto"
        >
          <button
            @click="refreshAllData"
            class="bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-gray-300 transition font-medium text-xs sm:text-sm shadow-sm hover:shadow flex items-center justify-center gap-2 w-full sm:w-auto"
            title="Refresh Data"
          >
            <svg
              class="w-3.5 h-3.5 sm:w-4 sm:h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span class="hidden sm:inline">Refresh</span>
            <span class="sm:hidden">Refresh</span>
          </button>

          <button
            class="bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-gray-300 transition font-medium text-xs sm:text-sm shadow-sm hover:shadow flex items-center justify-center gap-2 w-full sm:w-auto"
            @click="logout()"
          >
            <svg
              class="w-3.5 h-3.5 sm:w-4 sm:h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 512 512"
            >
              <path
                d="M505 273c9.4-9.4 9.4-24.6 0-33.9L361 95c-6.9-6.9-17.2-8.9-26.2-5.2S320 102.3 320 112l0 80-112 0c-26.5 0-48 21.5-48 48l0 32c0 26.5 21.5 48 48 48l112 0 0 80c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2L505 273zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"
              />
            </svg>
            <span class="hidden sm:inline">Logout</span>
            <span class="sm:hidden">Keluar</span>
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6"
      >
        <div
          class="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-2xl sm:text-3xl font-bold text-gray-900">
                {{ totalTransfers }}
              </h3>
              <p class="text-xs sm:text-sm text-gray-600">Total Transfers</p>
            </div>
            <svg
              class="w-6 h-6 sm:w-8 sm:h-8 text-gray-400"
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

        <div
          class="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 sm:p-5 text-white shadow-lg cursor-pointer hover:opacity-90 transition"
          @click="goToApprovals"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-2xl sm:text-3xl font-bold">
                {{ needWarehouseApproval }}
              </h3>
              <p class="text-xs sm:text-sm opacity-90">Need Approval</p>
            </div>
            <svg
              class="w-6 h-6 sm:w-8 sm:h-8 opacity-80"
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

        <div
          class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 sm:p-5 text-white shadow-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-2xl sm:text-3xl font-bold">
                {{ warehouseList.length }}
              </h3>
              <p class="text-xs sm:text-sm opacity-90">Gudang</p>
            </div>
            <svg
              class="w-6 h-6 sm:w-8 sm:h-8 opacity-80"
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

      <div
        class="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-6 bg-white rounded-xl p-1.5 border border-gray-200 shadow-sm"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="relative flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0 px-2 sm:px-3 py-2.5 sm:py-5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center"
          :class="[
            activeTab === tab.id
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          <span class="truncate">{{ tab.label }}</span>

          <span
            v-if="tab.id === 'approvals' && needWarehouseApproval > 0"
            class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shadow text-[10px] sm:text-xs"
          >
            {{ needWarehouseApproval > 9 ? "9+" : needWarehouseApproval }}
          </span>
        </button>
      </div>

      <div v-if="loading[activeTab]" class="text-center py-8 sm:py-12">
        <div
          class="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-blue-600 border-t-transparent"
        ></div>
        <p class="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">
          Memuat data...
        </p>
      </div>

      <div v-else-if="activeTab === 'overview'" class="space-y-4 sm:space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div
            class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div
              class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"
            >
              <div class="flex items-center gap-3">
                <h3 class="font-semibold text-gray-800 text-sm sm:text-base">
                 Harga Barang di Gudang
                </h3>
                <Dropdown
                  @select="onSelectWarehousePrice"
                  class="w-40"
                  :key="'price-dropdown'"
                />
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs sm:text-sm text-left">
                <thead
                  class="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold"
                >
                  <tr>
                    <th class="px-4 py-3">Produk</th>
                    <th
                      class="px-4 py-3 cursor-pointer hover:bg-gray-100"
                      @click="toggleSort('avgPrice')"
                    >
                      Harga Unit
                      <span v-if="priceSortKey === 'avgPrice'">
                        {{ priceSortOrder === "desc" ? "↓" : "↑" }}
                      </span>
                      <span v-else>↕</span>
                    </th>
                    <th
                      class="px-4 py-3 cursor-pointer hover:bg-gray-100"
                      @click="toggleSort('total')"
                    >
                      Total Value
                      <span v-if="priceSortKey === 'total'">
                        {{ priceSortOrder === "desc" ? "↓" : "↑" }}
                      </span>
                      <span v-else>↕</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="item in sortedHighestPriceProducts.slice(0, 10)"
                    :key="item.productId + item.warehouseId"
                    class="hover:bg-gray-50"
                  >
                    <td class="px-4 py-3">
                      <p class="font-bold text-gray-900 truncate w-32 sm:w-48">
                        {{ item.materialName }}
                      </p>
                      <p class="text-[10px] text-gray-500">
                        {{ item.warehouse }}
                      </p>
                    </td>
                    <td class="px-4 py-3">
                      {{ formatCurrency(item.avgPrice) }}
                    </td>
                    <td class="px-4 py-3 font-bold text-blue-700">
                      {{ formatCurrency(item.total) }}
                    </td>
                  </tr>
                  <tr v-if="sortedHighestPriceProducts.length === 0">
                    <td colspan="3" class="px-4 py-8 text-center text-gray-400">
                      Tidak ada data top value items
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
          >
            <div
              class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"
            >
              <div class="flex items-center gap-3">
                <h3 class="font-semibold text-gray-800 text-sm sm:text-base">
                  Paling Sering Digunakan
                </h3>
              </div>
              <span
                class="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase tracking-wider"
              >
                Aktivitas
              </span>
            </div>
            <div class="p-4 flex-1">
              <div
                v-if="filteredTopUsedItems.length === 0"
                class="text-center py-10 text-gray-400 italic"
              >
                Tidak ada data aktivitas
              </div>
              <div
                v-for="(item, index) in filteredTopUsedItems.slice(0, 10)"
                :key="index"
                class="flex items-center gap-3 mb-4 last:mb-0"
              >
                <div
                  class="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold"
                >
                  #{{ index + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">
                    {{ item.name }}
                  </p>
                  <p class="text-[10px] text-gray-500">
                    {{ item.count }} Kali Digunakan
                  </p>
                </div>
                <div
                  class="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-blue-500"
                    :style="{
                      width:
                        item.maxCount > 0
                          ? (item.count / item.maxCount) * 100 + '%'
                          : '0%',
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 class="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-2">
                History Transfer
                <span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-200 font-bold">
                  {{ filteredStockList.length }}
                </span>
              </h3>
              
              <div class="flex flex-wrap items-center gap-2">
                <input 
                  type="date" 
                  v-model="filterStartDate"
                  class="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-600 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  placeholder="Mulai"
                />
                <span class="text-gray-400 text-xs">-</span>
                <input 
                  type="date" 
                  v-model="filterEndDate"
                  class="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-600 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  placeholder="Sampai"
                />
                <button 
                  v-if="filterStartDate || filterEndDate"
                  @click="resetDateFilter"
                  class="text-xs text-red-500 hover:text-red-700 font-medium px-2"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          <div
            class="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto p-2 sm:p-3"
          >
            <div
              v-for="transfer in filteredStockList"
              :key="transfer.movement_id"
              class="p-2 sm:p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0"
              >
                <div class="flex-1">
                  <p class="font-medium text-sm sm:text-base">
                    {{ transfer.reference_no }}
                  </p>
                  <p class="text-xs sm:text-sm text-gray-500 truncate">
                    {{ transfer.source_name }} → {{ transfer.target_name }}
                  </p>
                  <p class="text-xs text-gray-500 mt-0.5 sm:mt-1">
                    {{ formatDate(transfer.created_at) }}
                  </p>
                </div>
                <div
                  class="flex flex-col sm:flex-col justify-center items-start sm:items-end gap-1 sm:gap-2"
                >
                  <span
                    :class="[
                      'px-2 py-1 text-xs rounded-full whitespace-nowrap',
                      getStatusBadgeClass(transfer.status),
                    ]"
                  >
                    {{ transfer.status }}
                  </span>
                  <button
                    @click="viewTransferDetail(transfer)"
                    class="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-xs sm:text-sm w-full sm:w-auto text-center"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            </div>
            
            <div v-if="filteredStockList.length === 0" class="text-center py-6 text-gray-400 text-sm">
                <span v-if="filterStartDate || filterEndDate">Tidak ada data pada rentang tanggal ini</span>
                <span v-else>Belum ada riwayat transfer</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'stock'" class="space-y-4 sm:space-y-6">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div
              class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0"
            >
              <div class="flex-1">
                <h3 class="text-sm sm:text-base font-semibold text-gray-800">
                  Stock Inventory
                </h3>
                <div class="text-xs sm:text-sm text-gray-500 mt-1">
                  Showing {{ filteredStock.length }} of
                  {{ stockList.length }} items
                  <span
                    v-if="selectedWarehouse"
                    class="text-blue-600 font-medium"
                  >
                    • Filtered by: {{ selectedWarehouse }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="relative w-full sm:w-auto">
                  <Dropdown
                    @select="filteredWarehouse"
                    class="w-full sm:w-48"
                  />
                </div>
                <button
                  @click="refreshAllData"
                  class="px-2.5 py-2 sm:px-3 sm:py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 sm:gap-2"
                  title="Refresh data"
                >
                  <svg
                    class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span class="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto -mx-4 sm:mx-0">
            <div class="min-w-full inline-block align-middle">
              <table class="w-full text-xs sm:text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      class="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-gray-600 uppercase text-xs"
                    >
                      Bahan Baku
                    </th>
                    <th
                      class="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-gray-600 uppercase text-xs"
                    >
                      Gudang
                    </th>
                    <th
                      class="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-gray-600 uppercase text-xs"
                    >
                      Tersedia
                    </th>
                    <th
                      class="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-gray-600 uppercase text-xs"
                    >
                      UoM
                    </th>
                    <th
                      class="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-gray-600 uppercase text-xs"
                    >
                      Diperbarui
                    </th>
                    <th
                      class="px-3 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-600 uppercase text-xs"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="(item, index) in filteredStock"
                    :key="index"
                    class="hover:bg-blue-50/50 transition-colors"
                  >
                    <td class="px-3 py-2 sm:px-4 sm:py-3">
                      <div class="min-w-[120px] sm:min-w-0">
                        <p
                          class="font-medium text-gray-800 text-xs sm:text-sm truncate"
                          :title="item.productName"
                        >
                          {{ item.productName }}
                        </p>
                        <p class="text-xs text-gray-500 truncate">
                          ID: {{ item.productId || "-" }}
                        </p>
                      </div>
                    </td>

                    <td class="px-3 py-2 sm:px-4 sm:py-3">
                      <span
                        class="bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs whitespace-nowrap"
                      >
                        {{ item.warehouse }}
                      </span>
                    </td>
                    <td class="px-3 py-2 sm:px-4 sm:py-3">
                      <span
                        class="font-bold text-gray-800 text-sm sm:text-base"
                        >{{ formatNumber(item.qtyOnHand) }}</span
                      >
                    </td>

                    <td class="px-3 py-2 sm:px-4 sm:py-3">
                      <span class="text-gray-600 text-xs sm:text-sm">{{
                        item.uom
                      }}</span>
                    </td>
                    <td class="px-3 py-2 sm:px-4 sm:py-3">
                      <span class="text-xs text-gray-500 whitespace-nowrap">
                        {{ formatDate(item.lastUpdated) }}
                      </span>
                    </td>
                    
                    <td class="px-3 py-2 sm:px-4 sm:py-3 text-center">
                      <div v-if="item.qtyOnHand <= 10 && !item.isEmptyWarehouse" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold animate-pulse">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        Menipis
                      </div>
                      <div v-else-if="!item.isEmptyWarehouse" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        Aman
                      </div>
                      <div v-else class="text-xs text-gray-400">
                         -
                      </div>
                    </td>

                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            v-if="stockList.length === 0"
            class="text-center py-6 sm:py-8 text-gray-500"
          >
            <div class="text-3xl sm:text-4xl mb-2">📭</div>
            <p class="text-sm sm:text-base">No stock data found</p>
            <p class="text-xs sm:text-sm mt-1">
              Coba perbarui data atau periksa koneksi OpenBravo
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'approvals'" class="space-y-3 sm:space-y-4">
        <div
          v-if="transfersAwaitingMyApproval.length === 0"
          class="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base"
        >
          Tidak ada transfer yang menunggu approval Anda
        </div>

        <div
          v-for="transfer in transfersAwaitingMyApproval"
          :key="transfer.movement_id"
          class="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div
            class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4"
          >
            <div class="flex-1">
              <div
                class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2"
              >
                <h3
                  class="text-base sm:text-lg font-bold text-gray-900 truncate"
                >
                  {{ transfer.reference_no }}
                </h3>
                <span
                  :class="[
                    'px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                    getStatusBadgeClass(transfer.status),
                  ]"
                >
                  {{ transfer.status }}
                </span>
              </div>
              <div
                class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600"
              >
                <span class="flex items-center gap-1 whitespace-nowrap">
                  <svg
                    class="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
                <span class="hidden sm:inline">•</span>
                <span class="whitespace-nowrap">{{
                  formatDate(transfer.created_at)
                }}</span>
                <span class="hidden sm:inline">•</span>
                <span class="whitespace-nowrap"
                  >{{ transfer.items.length }} items</span
                >
              </div>
            </div>

            <div class="flex gap-2 pt-2 sm:pt-0">
              <button
                @click="viewTransferDetail(transfer)"
                class="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-xs sm:text-sm flex-1 sm:flex-none text-center"
              >
                Lihat Detail
              </button>
            </div>
          </div>

          <div class="border-t pt-3 sm:pt-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div
                v-for="item in transfer.items.slice(0, 3)"
                :key="item.movement_item_id"
                class="bg-gray-50 rounded-lg p-2 sm:p-3"
              >
                <div class="flex justify-between items-center">
                  <div class="flex-1 min-w-0">
                    <p
                      class="font-medium text-xs sm:text-sm truncate"
                      :title="item.material_name"
                    >
                      {{ item.material_name }}
                    </p>
                    <p class="text-xs text-gray-500 truncate">
                      {{ item.material_code }}
                    </p>
                  </div>
                  <div class="text-right pl-2">
                    <p
                      class="font-bold text-gray-800 text-xs sm:text-sm whitespace-nowrap"
                    >
                      {{ item.qty }} {{ item.uom }}
                    </p>
                    <p
                      v-if="item.qty_received"
                      class="text-xs text-green-600 whitespace-nowrap"
                    >
                      Received: {{ item.qty_received }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-if="transfer.items.length > 3"
                class="bg-blue-50 rounded-lg p-2 sm:p-3 flex items-center justify-center"
              >
                <span class="text-blue-700 font-medium text-xs sm:text-sm">
                  +{{ transfer.items.length - 3 }} more items
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="transfer.approval_levels"
            class="border-t mt-3 sm:mt-4 pt-3 sm:pt-4"
          >
            <p class="text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Approval Status:
            </p>
            <div class="flex flex-wrap items-center gap-3 sm:gap-4">
              <div class="flex items-center gap-1.5 sm:gap-2">
                <div
                  :class="[
                    'w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full',
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
              <div class="flex items-center gap-1.5 sm:gap-2">
                <div
                  :class="[
                    'w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full',
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

      <div
        v-else-if="activeTab === 'warehouses'"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
      >
        <div
          v-for="warehouse in warehouseList"
          :key="warehouse.location_id || warehouse.id"
          class="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow"
        >
          <div class="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div
              class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center"
            >
              <svg
                class="w-4 h-4 sm:w-5 sm:h-5 text-white"
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
            <div class="flex-1 min-w-0">
              <h3
                class="font-bold text-gray-800 text-sm sm:text-base truncate"
                :title="warehouse._identifier || warehouse.name"
              >
                {{ warehouse._identifier || warehouse.name }}
              </h3>
            </div>
          </div>

          <div class="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Status:</span>
              <span
                :class="[
                  'px-1.5 sm:px-2 py-0.5 rounded text-xs',
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
          class="col-span-full text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base"
        >
          Tidak ada data gudang yang tersedia
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
import { ref, onMounted, computed, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { supabase } from "@/lib/supabase";
import openbravoApi from "@/lib/openbravo";
import Dropdown from "@/components/Dropdown.vue";
import logoPG from "@/assets/logoPG.svg";

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
const loadingPriceTable = ref(false);
const selectedWarehouse = ref(null);
const selectedWarehouseForPrice = ref(null);
const selectedWarehouseForUsage = ref(null);
const priceSortKey = ref("total"); 
const priceSortOrder = ref("desc"); 

const topUsedItems = ref([]);
const loadingTopUsed = ref(false);
const highestPriceProducts = ref([]);

// Filter Tanggal
const filterStartDate = ref('');
const filterEndDate = ref('');

const loadTopUsedMaterials = async () => {
  loadingTopUsed.value = true;
  try {
    console.log("📡 Fetching Internal Movement data...");
    const { data } = await openbravoApi.get(
      "/MaterialMgmtInternalMovementLine",
      {
        params: {
          _maxResults: 300,
          _orderBy: "creationDate desc",
        },
      }
    );

    const movementLines = data?.response?.data || [];

    if (movementLines.length === 0) {
      topUsedItems.value = [];
      return;
    }

    const usageMap = {};
    movementLines.forEach((line) => {
      const productId = line.product;
      const productName = line["product$_identifier"] || "Unknown Product";
      const warehouseId =
        line["warehouse"] || line["M_Warehouse_ID"] || "unknown";
      const warehouseName =
        line["warehouse$_identifier"] || "Unknown Warehouse";

      // Buat key unik berdasarkan product dan warehouse
      const key = `${productId}_${warehouseId}`;

      if (!usageMap[key]) {
        usageMap[key] = {
          id: productId,
          name: productName,
          warehouseId: warehouseId,
          warehouseName: warehouseName,
          count: 0,
          totalQty: 0,
          uom: line["uOM$_identifier"] || "",
        };
      }
      usageMap[key].count += 1;
      usageMap[key].totalQty += Math.abs(line.movementQuantity || 0);
    });

    // Ubah map ke array, urutkan berdasarkan count terbanyak, ambil top 10
    const sortedData = Object.values(usageMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log("✅ Top Used Items Loaded:", sortedData);
    topUsedItems.value = sortedData;
  } catch (err) {
    console.error("❌ Error loading usage stats:", err);
    topUsedItems.value = [];
  } finally {
    loadingTopUsed.value = false;
  }
};

/* SINKRONISASI SEMUA DATA */
const refreshAllData = async () => {
  const currentTab = activeTab.value;
  loading.value[currentTab] = true;

  try {
    console.log("🔄 Starting full data refresh...");

    // Jalankan load data dasar secara paralel
    await Promise.all([
      loadMaterialsFromOpenBravo(),
      loadMovementTransfers(),
      loadPendingApprovals(),
      loadWarehouses(),
    ]);

    // Jalankan fungsi analitik
    await buildHighestPriceProducts();
    await loadTopUsedMaterials();

    console.log("✅ Dashboard refreshed.");
  } catch (err) {
    console.error("❌ Refresh error:", err);
  } finally {
    loading.value[currentTab] = false;
  }
};

const getMaterialPrice = async (item) => {
  try {
    if (
      !item.productId ||
      item.productId === "NO_PRODUCT" ||
      item.productId === "ERROR"
    )
      return 0;

    const costingRes = await openbravoApi.get(
      "/MaterialMgmtCosting",
      {
        params: {
          _where: `product='${item.productId}'`,
          _orderBy: "updated desc",
          _maxResults: 50,
        },
      }
    );

    const costings = costingRes?.data?.response?.data || [];

    if (costings.length > 0) {
      const validCostings = costings.filter(
        (c) => parseFloat(c.price || c.cost) > 0
      );

      if (validCostings.length === 0) return 0;

      const totalPrice = validCostings.reduce(
        (sum, c) => sum + parseFloat(c.price || c.cost),
        0
      );
      const averagePrice = totalPrice / validCostings.length;

      console.log(
        `📊 ${item.productName}: ${validCostings.length} lines, avg price: ${averagePrice}`
      );
      return averagePrice;
    }
    return 0;
  } catch (err) {
    console.error(`❌ Error fetching price for ${item.productName}:`, err);
    return 0;
  }
};

const buildHighestPriceProducts = async () => {
  loadingPriceTable.value = true;
  const result = [];

  if (!stockList.value || stockList.value.length === 0) {
    console.warn("⚠️ Stock list kosong, tidak bisa build top value items");
    highestPriceProducts.value = [];
    return;
  }

  for (const stock of stockList.value) {
    if (
      stock.productId &&
      stock.productId !== "NO_PRODUCT" &&
      stock.productId !== "ERROR"
    ) {
      const avgPrice = await getMaterialPrice(stock);

      if (avgPrice > 0) {
        result.push({
          warehouse: stock.warehouse,
          warehouseId: stock.warehouseId,
          materialName: stock.productName,
          productId: stock.productId,
          avgPrice: avgPrice,
          qty: stock.qtyOnHand || 0,
          total: avgPrice * (stock.qtyOnHand || 0),
        });
      }
    }
  }

  highestPriceProducts.value = result;
  loadingPriceTable.value = false;
};

const onSelectWarehousePrice = (item) => {
  selectedWarehouseForPrice.value = item?._identifier || null;
  console.log(
    "🏭 Selected warehouse for price filtering:",
    selectedWarehouseForPrice.value
  );
};

const onSelectWarehouseUsage = (item) => {
  selectedWarehouseForUsage.value = item?._identifier || null;
  console.log(
    "🏭 Selected warehouse for usage filtering:",
    selectedWarehouseForUsage.value
  );
};

const sortedHighestPriceProducts = computed(() => {
  let filtered = highestPriceProducts.value;

  if (selectedWarehouseForPrice.value) {
    filtered = filtered.filter(
      (item) =>
        item.warehouse === selectedWarehouseForPrice.value ||
        item.warehouse.includes(selectedWarehouseForPrice.value)
    );
  }

  filtered = filtered.filter((item) => item.total > 0);

  return [...filtered].sort((a, b) => {
    const valA = priceSortKey.value === "avgPrice" ? a.avgPrice : a.total;

    const valB = priceSortKey.value === "avgPrice" ? b.avgPrice : b.total;

    return priceSortOrder.value === "asc" ? valA - valB : valB - valA;
  });
});

const filteredTopUsedItems = computed(() => {
  let filtered = topUsedItems.value;

  // Filter berdasarkan warehouse jika dipilih
  if (selectedWarehouseForUsage.value) {
    filtered = filtered.filter(
      (item) =>
        item.warehouseName === selectedWarehouseForUsage.value ||
        item.warehouseName.includes(selectedWarehouseForUsage.value)
    );
  }

  // Hitung maxCount untuk progress bar
  const maxCount =
    filtered.length > 0 ? Math.max(...filtered.map((item) => item.count)) : 0;

  return filtered.map((item) => ({
    ...item,
    maxCount: maxCount,
  }));
});

const toggleSort = (key) => {
  if (priceSortKey.value === key) {
    priceSortOrder.value = priceSortOrder.value === "asc" ? "desc" : "asc";
  } else {
    priceSortKey.value = key;
    priceSortOrder.value = "desc";
  }
  console.log(`🔄 Sorting by ${key} ${priceSortOrder.value}`);
};

const goToApprovals = () => {
  activeTab.value = "approvals";
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
};

const formatCurrency = (value) => {
  // Pastikan value adalah angka
  const numValue = parseFloat(value) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(numValue);
};

const resetDateFilter = () => {
  filterStartDate.value = '';
  filterEndDate.value = '';
};

/* ---------------------------------------------------
   COMPUTED PROPERTIES
--------------------------------------------------- */
const totalTransfers = computed(() => {
  return transferList.value.length;
});

const needWarehouseApproval = computed(() => {
  return transfersAwaitingMyApproval.value.length;
});

// ✅ REVISI: Tampilkan SEMUA history + Filter Tanggal
const filteredStockList = computed(() => {
  let items = transferList.value; // Ambil semua data agar sesuai Total Transfer

  // Filter Tanggal
  if (filterStartDate.value) {
    const start = new Date(filterStartDate.value);
    start.setHours(0, 0, 0, 0); // Set ke awal hari
    items = items.filter(item => new Date(item.created_at) >= start);
  }

  if (filterEndDate.value) {
    const end = new Date(filterEndDate.value);
    end.setHours(23, 59, 59, 999); // Set ke akhir hari
    items = items.filter(item => new Date(item.created_at) <= end);
  }

  return items;
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
   LOAD WAREHOUSE DATA
--------------------------------------------------- */
const loadWarehouses = async () => {
  loading.value.warehouses = true;
  try {
    const { data } = await openbravoApi.get(
      "/Warehouse"
    );

    if (data?.response?.data) {
      warehouseList.value = data.response.data;
      console.log(
        "🏭 Warehouse List loaded:",
        warehouseList.value.length,
        "warehouses"
      );
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
   LOAD MATERIALS FROM OPENBRAVO
--------------------------------------------------- */
const loadMaterialsFromOpenBravo = async () => {
  loading.value.stock = true;
  try {
    console.log("📦 Loading materials from OpenBravo...");

    await loadWarehouses();

    if (warehouseList.value.length === 0) {
      console.warn("⚠️ Tidak ada warehouse, tidak bisa load materials");
      stockList.value = [];
      return;
    }

    let allMaterials = [];

    for (const warehouse of warehouseList.value) {
      try {
        const { data: locatorRes } = await openbravoApi.get(
          "/Locator",
          { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } }
        );

        const locators = locatorRes?.response?.data || [];

        if (locators.length === 0) {
          console.log(
            `⚠️ Tidak ada locator untuk warehouse: ${warehouse.name}`
          );

          allMaterials.push({
            productId: "NO_PRODUCT",
            productName: "No Material Available",
            uomId: null,
            uom: "-",
            stock: 0,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            warehouseCode: warehouse._identifier,
            locatorId: null,
            locatorName: "No Locator",
            isEmptyWarehouse: true,
          });
          continue;
        }

        const locatorId = locators[0].id;
        const locatorName =
          locators[0]._identifier || locators[0].searchKey || "Default Bin";

        const { data: materialsRes } = await openbravoApi.get(
          "/MaterialMgmtStorageDetail",
          {
            params: { _where: `M_Locator_ID='${locatorId}'` },
          }
        );

        const rows = materialsRes?.response?.data || [];

        console.log(
          `📊 Warehouse ${warehouse.name}: ${rows.length} materials found`
        );

        if (rows.length === 0) {
          allMaterials.push({
            productId: "NO_PRODUCT",
            productName: "No Material Available",
            uomId: null,
            uom: "-",
            stock: 0,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            warehouseCode: warehouse._identifier,
            locatorId: locatorId,
            locatorName: locatorName,
            isEmptyWarehouse: true,
          });
        } else {
          const formattedRows = rows.map((r) => ({
            productId: r.product,
            productName: r["product$_identifier"] || "(Tanpa Nama Produk)",
            uomId: r.uOM,
            uom: r["uOM$_identifier"] || null,
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
        console.warn(
          `❌ Gagal load materials untuk warehouse ${warehouse.name}:`,
          err
        );

        allMaterials.push({
          productId: "ERROR",
          productName: "Error Loading Materials",
          uomId: null,
          uom: "-",
          stock: 0,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          warehouseCode: warehouse._identifier,
          locatorId: null,
          locatorName: "Error",
          isEmptyWarehouse: true,
          hasError: true,
        });
      }
    }

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
      uom: material.uom || "Unit",
      lastUpdated: new Date().toISOString(),
      locator: material.locatorName,
      isEmptyWarehouse: material.isEmptyWarehouse || false,
      hasError: material.hasError || false,
    }));

    console.log("✅ Materials loaded:", stockList.value.length, "items");
  } catch (err) {
    console.error("❌ ERROR loadMaterialsFromOpenBravo:", err);
    useFallbackData();
  } finally {
    loading.value.stock = false;
  }
};

/* ---------------------------------------------------
   FILTER WAREHOUSE FUNCTION
--------------------------------------------------- */
const filteredWarehouse = async (item) => {
  if (item && item._identifier) {
    selectedWarehouse.value = item._identifier;
    console.log(`🔍 Filtering by warehouse: ${item._identifier}`);
  } else {
    selectedWarehouse.value = null;
    console.log("🔍 Clearing warehouse filter");
  }
};

/* ---------------------------------------------------
   LOAD TRANSFERS WITH APPROVAL STATUS
--------------------------------------------------- */
const loadMovementTransfers = async () => {
  loading.value.transfers = true;
  try {
    const { data: movements, error: mvError } = await supabase
      .from("gh_movement")
      .select("*")
      .order("created_at", { ascending: false });

    if (mvError) throw mvError;

    if (!movements || movements.length === 0) {
      transferList.value = [];
      return;
    }

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
    console.log(
      "📋 Pending Approvals:",
      approvalRecords.value.length,
      "records"
    );
  } catch (err) {
    console.error("❌ ERROR loadPendingApprovals:", err);
  } finally {
    loading.value.approvals = false;
  }
};

/* ---------------------------------------------------
   VIEW TRANSFER DETAIL
--------------------------------------------------- */
const viewTransferDetail = (transfer) => {
  console.log(transfer.movement_id);
  return router.push({
    name: "detailmovement",
    params: { id: transfer.movement_id },
  });
};

/* ---------------------------------------------------
   COMPUTED PROPERTIES
--------------------------------------------------- */
const filteredStock = computed(() => {
  if (!selectedWarehouse.value) return stockList.value;

  const filtered = stockList.value.filter(
    (x) =>
      x.warehouse === selectedWarehouse.value ||
      x.warehouseCode === selectedWarehouse.value
  );

  if (filtered.length === 0 && selectedWarehouse.value) {
    const warehouse = warehouseList.value.find(
      (w) =>
        w.name === selectedWarehouse.value ||
        w._identifier === selectedWarehouse.value
    );

    if (warehouse) {
      return [
        {
          productId: "NO_PRODUCT",
          productName: "No Material Available in this Warehouse",
          productCode: "NO_PRODUCT",
          warehouseId: warehouse.id,
          warehouse: warehouse.name,
          qtyOnHand: 0,
          qtyAvailable: 0,
          qtyReserved: 0,
          uom: "-",
          lastUpdated: new Date().toISOString(),
          locator: "No Data",
          isEmptyWarehouse: true,
        },
      ];
    }
  }
  return filtered;
});

const transfersAwaitingMyApproval = computed(() => {
  return transferList.value.filter((t) => t.needMyWarehouseAction);
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