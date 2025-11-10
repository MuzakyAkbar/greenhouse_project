// /src/stores/material.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useMaterialStore = defineStore('material', () => {
  const materialStock = ref([])
  const materialUsed = ref([])
  const loading = ref(false)
  const error = ref(null)

  // ========================================
  // GH_MATERIAL_STOCK
  // ========================================
  
  /**
   * Fetch material stock dengan filter
   */
  async function fetchStock(filters = {}) {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase
        .from('gh_material_stock')
        .select('*')
        .order('material_id', { ascending: true })
      
      if (filters.location_id) {
        query = query.eq('location_id', filters.location_id)
      }
      if (filters.material_name) {
        query = query.eq('material_name', filters.material_name)
      }
      
      const { data, error: err } = await query
      
      if (err) {
        console.error('Error fetching material stock:', err)
        error.value = err
        return { data: null, error: err }
      }
      
      materialStock.value = data || []
      console.log(`✅ Fetched ${data?.length || 0} material stocks`)
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error in fetchStock:', err)
      error.value = err
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  /**
   * Get stock by material name and location
   */
  async function getStockByMaterial(material_name, location_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_material_stock')
        .select('*')
        .eq('material_name', material_name)
        .eq('location_id', location_id)
        .single()
      
      if (err && err.code !== 'PGRST116') {
        console.error('Error getting stock:', err)
        return { data: null, error: err }
      }
      
      return { data, error: null }
    } catch (err) {
      console.error('Error getting stock by material:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Create or update material stock
   */
  async function upsertStock(payload) {
    try {
      console.log('💾 Upserting stock:', payload)
      
      // Check if stock exists
      const { data: existing } = await supabase
        .from('gh_material_stock')
        .select('material_id, qty')
        .eq('material_name', payload.material_name)
        .eq('location_id', payload.location_id)
        .single()
      
      if (existing) {
        // Update existing stock
        const newQty = parseFloat(existing.qty || 0) + parseFloat(payload.qty || 0)
        
        const { data, error: err } = await supabase
          .from('gh_material_stock')
          .update({
            qty: newQty,
            uom: payload.uom || existing.uom,
            updated_by: payload.updated_by,
            updated_at: new Date().toISOString()
          })
          .eq('material_id', existing.material_id)
          .select()
        
        if (err) throw err
        
        console.log(`✅ Stock updated: ${payload.material_name} = ${newQty}`)
        return { data, error: null }
      } else {
        // Insert new stock
        const { data, error: err } = await supabase
          .from('gh_material_stock')
          .insert([{
            material_name: payload.material_name,
            qty: payload.qty,
            uom: payload.uom,
            location_id: payload.location_id,
            updated_by: payload.updated_by,
            updated_at: new Date().toISOString()
          }])
          .select()
        
        if (err) throw err
        
        console.log(`✅ Stock created: ${payload.material_name}`)
        return { data, error: null }
      }
    } catch (err) {
      console.error('Error upserting stock:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Reduce stock when material is used
   */
  async function reduceStock(material_name, qty, location_id) {
    try {
      console.log('🔍 Reducing stock:', { material_name, qty, location_id })
      
      // Find existing stock
      const { data: stockData, error: fetchErr } = await supabase
        .from('gh_material_stock')
        .select('*')
        .eq('material_name', material_name)
        .eq('location_id', location_id)
        .single()
      
      if (fetchErr && fetchErr.code !== 'PGRST116') {
        throw fetchErr
      }
      
      if (!stockData) {
        console.warn('⚠️ Stock not found for:', material_name)
        return { data: null, error: new Error('Stock not found') }
      }
      
      const currentQty = parseFloat(stockData.qty) || 0
      const reduceQty = parseFloat(qty) || 0
      const newQty = currentQty - reduceQty
      
      if (newQty < 0) {
        console.warn('⚠️ Insufficient stock for:', material_name)
        return { data: null, error: new Error('Insufficient stock') }
      }
      
      console.log(`📊 ${material_name}: ${currentQty} - ${reduceQty} = ${newQty}`)
      
      // Update stock
      const { data, error: updateErr } = await supabase
        .from('gh_material_stock')
        .update({
          qty: newQty,
          updated_at: new Date().toISOString()
        })
        .eq('material_id', stockData.material_id)
        .select()
      
      if (updateErr) throw updateErr
      
      console.log('✅ Stock reduced successfully')
      await fetchStock({ location_id })
      
      return { data, error: null }
    } catch (err) {
      console.error('Error reducing stock:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Update stock manually
   */
  async function updateStock(material_id, qty, updated_by) {
    try {
      const { data, error: err } = await supabase
        .from('gh_material_stock')
        .update({
          qty: parseFloat(qty),
          updated_by,
          updated_at: new Date().toISOString()
        })
        .eq('material_id', material_id)
        .select()
      
      if (err) throw err
      
      console.log('✅ Stock updated manually')
      return { data, error: null }
    } catch (err) {
      console.error('Error updating stock:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Delete stock
   */
  async function removeStock(material_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_material_stock')
        .delete()
        .eq('material_id', material_id)
      
      if (!err) {
        await fetchStock()
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Error removing stock:', err)
      return { data: null, error: err }
    }
  }

  // ========================================
  // GH_MATERIAL_USED
  // ========================================
  
  /**
   * Fetch material used records
   */
  async function fetchUsed(filters = {}) {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase
        .from('gh_material_used')
        .select(`
          *,
          activity:gh_activity(
            activity_id,
            act_name,
            report:gh_report(report_id, report_date, batch_id, location_id)
          )
        `)
        .order('material_used_id', { ascending: false })
      
      if (filters.activity_id) {
        query = query.eq('activity_id', filters.activity_id)
      }
      
      const { data, error: err } = await query
      
      if (err) {
        console.error('Error fetching material used:', err)
        error.value = err
        return { data: null, error: err }
      }
      
      materialUsed.value = data || []
      console.log(`✅ Fetched ${data?.length || 0} material used records`)
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error in fetchUsed:', err)
      error.value = err
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  /**
   * Add material to used (called when creating activity)
   */
  async function addToUsed(payload) {
    try {
      console.log('➕ Adding to material used:', payload)
      
      const { data, error: err } = await supabase
        .from('gh_material_used')
        .insert([payload])
        .select()
      
      if (err) {
        console.error('❌ Error adding to material used:', err)
        throw err
      }
      
      console.log('✅ Material added to used')
      return { data, error: null }
    } catch (err) {
      console.error('Error adding to material used:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Update material used
   */
  async function updateUsed(material_used_id, payload) {
    try {
      const { data, error: err } = await supabase
        .from('gh_material_used')
        .update(payload)
        .eq('material_used_id', material_used_id)
        .select()
      
      if (err) throw err
      
      return { data, error: null }
    } catch (err) {
      console.error('Error updating material used:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Delete material used
   */
  async function removeUsed(material_used_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_material_used')
        .delete()
        .eq('material_used_id', material_used_id)
      
      if (!err) {
        await fetchUsed()
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Error removing material used:', err)
      return { data: null, error: err }
    }
  }

  // Tambahkan di bagian function sebelum return
async function fetchAll(filters = {}) {
  try {
    // Ambil semua stock
    await fetchStock(filters)
    // Ambil semua material used
    await fetchUsed(filters)
    console.log('✅ fetchAll completed: stock + used')
  } catch (err) {
    console.error('❌ Error in fetchAll:', err)
  }
}

// Di return statement, cukup tambahkan fetchAll
return { 
  materialStock,
  materialUsed,
  loading, 
  error,
  // Stock operations
  fetchStock,
  getStockByMaterial,
  upsertStock,
  reduceStock,
  updateStock,
  removeStock,
  // Used operations
  fetchUsed,
  addToUsed,
  updateUsed,
  removeUsed,
  // New combined fetch
  fetchAll
}
})