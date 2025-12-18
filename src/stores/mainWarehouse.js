// /src/stores/mainWarehouse.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import openbravoApi from '@/lib/openbravo'

export const useMainWarehouseStore = defineStore('mainWarehouse', () => {
  const warehouses = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Fetch semua warehouse dari OpenBravo
  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const { data } = await openbravoApi.get(
        '/Warehouse',
        {
          params: {
            _selectedProperties: 'id,name,searchKey,description',
            _orderBy: 'name',
          },
        }
      )
      
      const rows = data?.response?.data || []
      warehouses.value = rows.map(w => ({
        warehouse_id: w.id,
        warehouse_name: w.name || w._identifier,
        search_key: w.searchKey,
        description: w.description,
        raw: w
      }))
      
      return { data: warehouses.value, error: null }
    } catch (err) {
      console.error('Gagal fetch warehouses:', err)
      error.value = err.message || 'Gagal mengambil data warehouse'
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Fetch warehouse by ID
  async function fetchById(id) {
    try {
      const { data } = await openbravoApi.get(
        '/Warehouse',
        {
          params: {
            _where: `id='${id}'`,
            _selectedProperties: 'id,name,searchKey,description',
            _startRow: 0,
            _endRow: 1,
          },
        }
      )
      
      const row = data?.response?.data?.[0]
      if (!row) return { data: null, error: 'Warehouse tidak ditemukan' }
      
      const warehouse = {
        warehouse_id: row.id,
        warehouse_name: row.name || row._identifier,
        search_key: row.searchKey,
        description: row.description,
        raw: row
      }
      
      return { data: warehouse, error: null }
    } catch (err) {
      console.error('Gagal fetch warehouse by ID:', err)
      return { data: null, error: err }
    }
  }

  // Fetch locators dari warehouse tertentu
  async function fetchLocators(warehouseId) {
    try {
      const { data } = await openbravoApi.get(
        '/Locator',
        {
          params: {
            _where: `warehouse='${warehouseId}'`,
            _selectedProperties: 'id,searchKey,warehouse',
            _orderBy: 'searchKey',
          },
        }
      )
      
      const rows = data?.response?.data || []
      return {
        data: rows.map(l => ({
          locator_id: l.id,
          locator_name: l.searchKey || l._identifier,
          warehouse_id: l.warehouse,
          warehouse_name: l['warehouse$_identifier'],
          raw: l
        })),
        error: null
      }
    } catch (err) {
      console.error('Gagal fetch locators:', err)
      return { data: [], error: err }
    }
  }

  // Fetch stock by warehouse (dari MaterialMgmtStorageDetail)
  async function fetchStock(warehouseId = null) {
    try {
      let whereClause = 'quantityOnHand>0'
      if (warehouseId) {
        whereClause += ` and warehouse='${warehouseId}'`
      }

      const { data } = await openbravoApi.get(
        '/MaterialMgmtStorageDetail',
        {
          params: {
            _where: whereClause,
            _selectedProperties: 'id,product,quantityOnHand,warehouse,storageBin',
            _orderBy: 'product.name',
          },
        }
      )
      
      const rows = data?.response?.data || []
      return {
        data: rows.map(s => ({
          id: s.id,
          product_id: s.product,
          product_name: s['product$_identifier'],
          qty: s.quantityOnHand,
          warehouse_id: s.warehouse,
          warehouse_name: s['warehouse$_identifier'],
          locator_id: s.storageBin,
          locator_name: s['storageBin$_identifier'],
          raw: s
        })),
        error: null
      }
    } catch (err) {
      console.error('Gagal fetch stock:', err)
      return { data: [], error: err }
    }
  }

  // Sync data dari OpenBravo ke Supabase (opsional)
  async function syncToSupabase() {
    try {
      const { data: obWarehouses } = await fetchAll()
      if (!obWarehouses || obWarehouses.length === 0) {
        return { success: false, error: 'Tidak ada data warehouse dari OpenBravo' }
      }

      // Import supabase hanya jika digunakan
      const { supabase } = await import('../lib/supabase')
      
      // Upsert ke Supabase
      const { error: upsertError } = await supabase
        .from('public.gh_main_warehouse')
        .upsert(
          obWarehouses.map(w => ({
            warehouse_id: w.warehouse_id,
            material_name: w.warehouse_name,
            qty: 0, // Default qty, bisa diupdate manual
            location_id: null,
            material_id: null
          })),
          { onConflict: 'warehouse_id' }
        )

      if (upsertError) throw upsertError

      return { success: true, data: obWarehouses }
    } catch (err) {
      console.error('Gagal sync ke Supabase:', err)
      return { success: false, error: err }
    }
  }

  return { 
    warehouses, 
    loading, 
    error, 
    fetchAll, 
    fetchById, 
    fetchLocators,
    fetchStock,
    syncToSupabase
  }
})