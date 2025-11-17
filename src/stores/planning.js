import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const usePlanningStore = defineStore('planning', {
  state: () => ({
    plannings: [],
    currentPlanning: null,
    activities: [],
    materials: [],
    loading: false,
    error: null
  }),

  getters: {
    getPlanningById: (state) => (planning_id) => {
      return state.plannings.find(p => p.planning_id === Number(planning_id))
    },

    getActivitiesByPlanningId: (state) => (planning_id) => {
      return state.activities.filter(a => a.planning_id === Number(planning_id))
    },

    getMaterialsByActivityId: (state) => (activity_id) => {
      return state.materials.filter(m => m.activity_id === Number(activity_id))
    }
  },

  actions: {
    // 📋 Fetch All Planning Reports
    async fetchAll() {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await supabase
          .from('gh_planning_report')
          .select(`
            *,
            gh_location:location_id(location_id, location),
            gh_batch:batch_id(batch_id, batch_name)
          `)
          .order('planning_id', { ascending: false }) // ✅ Sort by ID descending

        if (error) throw error

        this.plannings = data || []
        console.log('✅ Planning fetched:', this.plannings.length)
        
        return { success: true, data: this.plannings }
      } catch (error) {
        console.error('❌ Error fetching planning:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    // 📋 Fetch Planning by ID with Activities and Materials
    async fetchById(planning_id) {
      this.loading = true
      this.error = null
      
      try {
        // Fetch planning report with relations
        const { data: planningData, error: planningError } = await supabase
          .from('gh_planning_report')
          .select(`
            *,
            gh_location:location_id(location_id, location),
            gh_batch:batch_id(batch_id, batch_name)
          `)
          .eq('planning_id', planning_id)
          .single()

        if (planningError) throw planningError

        this.currentPlanning = planningData

        // Fetch activities
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('gh_planning_activity')
          .select('*')
          .eq('planning_id', planning_id)
          .order('order_index', { ascending: true })

        if (activitiesError) throw activitiesError

        this.activities = activitiesData || []

        // Fetch materials for all activities
        if (this.activities.length > 0) {
          const activityIds = this.activities.map(a => a.activity_id)
          
          const { data: materialsData, error: materialsError } = await supabase
            .from('gh_planning_material')
            .select('*')
            .in('activity_id', activityIds)

          if (materialsError) throw materialsError

          this.materials = materialsData || []
        } else {
          this.materials = []
        }

        console.log('✅ Planning fetched:', this.currentPlanning)
        console.log('✅ Activities fetched:', this.activities.length)
        console.log('✅ Materials fetched:', this.materials.length)
        
        return { 
          success: true, 
          data: {
            planning: this.currentPlanning,
            activities: this.activities,
            materials: this.materials
          }
        }
      } catch (error) {
        console.error('❌ Error fetching planning by ID:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    // ➕ Create New Planning Report
    async create(planningData) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await supabase
          .from('gh_planning_report')
          .insert([{
            planning_date: planningData.planning_date,
            phase_plan: planningData.phase_plan,
            location_id: planningData.location_id,
            batch_id: planningData.batch_id,
            status: planningData.status || 'onReview', // ✅ Default onReview
            created_by: planningData.created_by
          }])
          .select()
          .single()

        if (error) throw error

        this.plannings.unshift(data)
        console.log('✅ Planning created:', data)
        
        return { success: true, data }
      } catch (error) {
        console.error('❌ Error creating planning:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    // ✏️ Update Planning Report
    async update(planning_id, planningData) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await supabase
          .from('gh_planning_report')
          .update({
            planning_date: planningData.planning_date,
            phase_plan: planningData.phase_plan,
            location_id: planningData.location_id,
            batch_id: planningData.batch_id,
            status: planningData.status
            // ✅ updated_at will be auto-updated by trigger
          })
          .eq('planning_id', planning_id)
          .select()
          .single()

        if (error) throw error

        // Update in local state
        const index = this.plannings.findIndex(p => p.planning_id === planning_id)
        if (index !== -1) {
          this.plannings[index] = data
        }

        console.log('✅ Planning updated:', data)
        
        return { success: true, data }
      } catch (error) {
        console.error('❌ Error updating planning:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    // 🗑️ Delete Planning Report
    async delete(planning_id) {
      this.loading = true
      this.error = null
      
      try {
        const { error } = await supabase
          .from('gh_planning_report')
          .delete()
          .eq('planning_id', planning_id)

        if (error) throw error

        // Remove from local state
        this.plannings = this.plannings.filter(p => p.planning_id !== planning_id)
        
        console.log('✅ Planning deleted')
        
        return { success: true }
      } catch (error) {
        console.error('❌ Error deleting planning:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    // ➕ Create Activity
    async createActivity(activityData) {
      try {
        const { data, error } = await supabase
          .from('gh_planning_activity')
          .insert([{
            planning_id: activityData.planning_id,
            act_name: activityData.act_name,
            coa: activityData.coa || 0,
            manpower: activityData.manpower || '',
            order_index: activityData.order_index || 1
          }])
          .select()
          .single()

        if (error) throw error

        this.activities.push(data)
        console.log('✅ Activity created:', data)
        
        return { success: true, data }
      } catch (error) {
        console.error('❌ Error creating activity:', error)
        return { success: false, error: error.message }
      }
    },

    // ✏️ Update Activity
    async updateActivity(activity_id, activityData) {
      try {
        const { data, error } = await supabase
          .from('gh_planning_activity')
          .update({
            act_name: activityData.act_name,
            coa: activityData.coa,
            manpower: activityData.manpower,
            order_index: activityData.order_index
            // ✅ updated_at will be auto-updated by trigger
          })
          .eq('activity_id', activity_id)
          .select()
          .single()

        if (error) throw error

        // Update in local state
        const index = this.activities.findIndex(a => a.activity_id === activity_id)
        if (index !== -1) {
          this.activities[index] = data
        }

        console.log('✅ Activity updated:', data)
        
        return { success: true, data }
      } catch (error) {
        console.error('❌ Error updating activity:', error)
        return { success: false, error: error.message }
      }
    },

    // 🗑️ Delete Activity
    async deleteActivity(activity_id) {
      try {
        const { error } = await supabase
          .from('gh_planning_activity')
          .delete()
          .eq('activity_id', activity_id)

        if (error) throw error

        // Remove from local state
        this.activities = this.activities.filter(a => a.activity_id !== activity_id)
        this.materials = this.materials.filter(m => m.activity_id !== activity_id)
        
        console.log('✅ Activity deleted')
        
        return { success: true }
      } catch (error) {
        console.error('❌ Error deleting activity:', error)
        return { success: false, error: error.message }
      }
    },

    // ➕ Create Material
    async createMaterial(materialData) {
      try {
        const { data, error } = await supabase
          .from('gh_planning_material')
          .insert([{
            activity_id: materialData.activity_id,
            material_name: materialData.material_name,
            qty: materialData.qty || 0,
            uom: materialData.uom || ''
          }])
          .select()
          .single()

        if (error) throw error

        this.materials.push(data)
        console.log('✅ Material created:', data)
        
        return { success: true, data }
      } catch (error) {
        console.error('❌ Error creating material:', error)
        return { success: false, error: error.message }
      }
    },

    // ✏️ Update Material
    async updateMaterial(material_id, materialData) {
      try {
        const { data, error } = await supabase
          .from('gh_planning_material')
          .update({
            material_name: materialData.material_name,
            qty: materialData.qty,
            uom: materialData.uom
            // ✅ updated_at will be auto-updated by trigger
          })
          .eq('material_id', material_id)
          .select()
          .single()

        if (error) throw error

        // Update in local state
        const index = this.materials.findIndex(m => m.material_id === material_id)
        if (index !== -1) {
          this.materials[index] = data
        }

        console.log('✅ Material updated:', data)
        
        return { success: true, data }
      } catch (error) {
        console.error('❌ Error updating material:', error)
        return { success: false, error: error.message }
      }
    },

    // 🗑️ Delete Material
    async deleteMaterial(material_id) {
      try {
        const { error } = await supabase
          .from('gh_planning_material')
          .delete()
          .eq('material_id', material_id)

        if (error) throw error

        // Remove from local state
        this.materials = this.materials.filter(m => m.material_id !== material_id)
        
        console.log('✅ Material deleted')
        
        return { success: true }
      } catch (error) {
        console.error('❌ Error deleting material:', error)
        return { success: false, error: error.message }
      }
    },

    // 📝 Update Planning Status
    async updateStatus(planning_id, status) {
      try {
        const { data, error } = await supabase
          .from('gh_planning_report')
          .update({ status })
          .eq('planning_id', planning_id)
          .select()
          .single()

        if (error) throw error

        // Update in local state
        const index = this.plannings.findIndex(p => p.planning_id === planning_id)
        if (index !== -1) {
          this.plannings[index] = data
        }

        if (this.currentPlanning?.planning_id === planning_id) {
          this.currentPlanning.status = status
        }

        console.log('✅ Planning status updated:', status)
        
        return { success: true, data }
      } catch (error) {
        console.error('❌ Error updating status:', error)
        return { success: false, error: error.message }
      }
    },

    // 🔄 Clear Current Planning
    clearCurrent() {
      this.currentPlanning = null
      this.activities = []
      this.materials = []
    }
  }
})