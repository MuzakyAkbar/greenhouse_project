import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import AddBatch from "../views/AddBatch.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "login",
      component: () => import("../views/login.vue"),
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("../views/dashboard.vue"),
      meta: { requiresAuth: true, roles: ["manager", "admin"] },
    },
    {
      path: "/dashboard-staff",
      name: "dashboardStaff",
      component: () => import("../views/DashboardStaff.vue"),
      meta: { requiresAuth: true, roles: ["staff"] },
    },
    {
      path: "/planningReportList",
      name: "planningReportList",
      component: () => import("../views/planningReportList.vue"),
      meta: { requiresAuth: true },
    },
    
    // ✅ PLANNING ROUTES - Menggunakan planning_id sebagai param
    {
      path: "/planningActivityReview/:planning_id",
      name: "planningActivityReview",
      component: () => import("../views/planningActivityReview.vue"),
      meta: { requiresAuth: true },
      beforeEnter: (to, from, next) => {
        console.log('🔍 planningActivityReview beforeEnter guard')
        console.log('  - to.params.planning_id:', to.params.planning_id)
        console.log('  - from.path:', from.path)
        
        if (!to.params.planning_id) {
          console.log('❌ No planning_id in params - Redirecting to planningReportList')
          alert('⚠️ Planning ID tidak valid')
          next({ name: 'planningReportList' })
        } else {
          console.log('✅ Valid planning_id - Proceeding')
          next()
        }
      }
    },
    {
      path: "/planningActivityView/:planning_id",
      name: "planningActivityView",
      component: () => import("../views/planningActivityView.vue"),
      meta: { requiresAuth: true },
      beforeEnter: (to, from, next) => {
        console.log('🔍 planningActivityView beforeEnter guard')
        console.log('  - to.params.planning_id:', to.params.planning_id)
        
        if (!to.params.planning_id) {
          console.log('❌ No planning_id in params - Redirecting to planningReportList')
          alert('⚠️ Planning ID tidak valid')
          next({ name: 'planningReportList' })
        } else {
          console.log('✅ Valid planning_id - Proceeding')
          next()
        }
      }
    },
    
    // ✅ REPORT ACTIVITY ROUTES - Menggunakan report_id sebagai param
    {
      path: "/reportActivityReview/:report_id",
      name: "reportActivityReview",
      component: () => import("../views/ReportActivityReview.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/reportActivityView/:report_id",
      name: "reportActivityView",
      component: () => import("../views/ReportActivityView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/reportActivityEdit/:report_id",
      name: "reportActivityEdit",
      component: () => import("../views/ReportActivityEdit.vue"),
      meta: { requiresAuth: true },
      beforeEnter: (to, from, next) => {
        console.log('🔍 reportActivityEdit beforeEnter guard')
        console.log('  - to.params.report_id:', to.params.report_id)
        console.log('  - from.path:', from.path)
        
        if (!to.params.report_id) {
          console.log('❌ No report_id in params - Redirecting to planningReportList')
          alert('⚠️ Report ID tidak valid')
          next({ name: 'planningReportList' })
        } else {
          console.log('✅ Valid report_id - Proceeding')
          next()
        }
      }
    },
    
    // Form pages
    {
      path: "/formReportActivity",
      name: "formReportActivity",
      component: () => import("../views/formReportActivity.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/planningActivity",
      name: "planningActivity",
      component: () => import("../views/planningActivity.vue"),
      meta: { requiresAuth: true },
    },
    
    // Batch routes
    {
      path: "/batch/:id",
      name: "BatchDetail",
      component: () => import("../views/BatchDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/add-batch",
      name: "AddBatch",
      component: AddBatch,
      meta: { requiresAuth: true },
    },
    
    // ✅ PRODUCTION ROUTES (DIUBAH UNTUK MENGGUNAKAN :record_id)
    {
      path: "/reportProductionReview/:record_id",
      name: "reportProductionReview",
      component: () => import("../views/reportProductionReview.vue"),
      meta: { requiresAuth: true },
      beforeEnter: (to, from, next) => {
        if (!to.params.record_id) {
          alert('⚠️ Approval Record ID tidak valid')
          next({ name: 'planningReportList' })
        } else {
          next()
        }
      }
    },
    {
      path: "/reportProductionView/:record_id",
      name: "reportProductionView",
      component: () => import("../views/reportProductionView.vue"),
      meta: { requiresAuth: true },
      beforeEnter: (to, from, next) => {
        if (!to.params.record_id) {
          alert('⚠️ Approval Record ID tidak valid')
          next({ name: 'planningReportList' })
        } else {
          next()
        }
      }
    },
    {
      path: "/reportProductionEdit/:record_id", // ✅ Rute Edit Baru
      name: "reportProductionEdit",
      component: () => import("../views/reportProductionEdit.vue"),
      meta: { requiresAuth: true },
      beforeEnter: (to, from, next) => {
        if (!to.params.record_id) {
          alert('⚠️ Approval Record ID tidak valid')
          next({ name: 'planningReportList' })
        } else {
          next()
        }
      }
    },
    {
      path: "/report-production",
      name: "reportProduction",
      component: () => import("../views/reportProduction.vue"),
      meta: { requiresAuth: true },
    },
    
    // Good movement routes
    {
      path: "/goodmovement",
      name: "goodmovement",
      component: () => import("../views/goodmovement.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/movement-edit/:id",
      name: "movement-edit",
      component: () => import("@/views/MovementEditView.vue"),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: "/addnewgm",
      name: "addnewgm",
      component: () => import("../views/addnewgm.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/detailmovement/:id",
      name: "detailmovement",
      component: () => import("../views/detailmovement.vue"),
      meta: { requiresAuth: true },
    },
    
    // Location routes
    {
      path: "/add-location",
      name: "addlocation",
      component: () => import("../views/addlocation.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/location",
      name: "location",
      component: () => import("../views/location.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/locationdetail/:location_id",
      name: "locationdetail",
      component: () => import("../views/LocationDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/add-phase",
      name: "addphase",
      component: () => import("../views/AddPhase.vue"),
      meta: { requiresAuth: true },
    },
  ],
});

// 🔒 Middleware auth guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isLoggedIn = !!authStore.isLoggedIn;
  const userRole = authStore.user?.role?.toLowerCase() || null;

  console.log('🔐 Router Guard:', {
    to: to.path,
    from: from.path,
    isLoggedIn,
    userRole
  })

  // 1) Butuh auth tapi belum login → ke login
  if (to.meta.requiresAuth && !isLoggedIn) {
    if (to.name !== "login") {
      console.log('❌ Not logged in - Redirect to login')
      return next({ name: "login", query: { redirect: to.fullPath } });
    }
    return next();
  }

  // 2) Sudah login tapi ke login → arahkan sesuai role
  if (to.name === "login" && isLoggedIn) {
    const target = userRole === "staff" ? "dashboardStaff" : "dashboard";
    if (to.name !== target) {
      console.log('✅ Already logged in - Redirect to', target)
      return next({ name: target });
    }
    return next();
  }

  // 3) Role-based access
  if (to.meta.roles && to.meta.roles.length > 0) {
    if (userRole && !to.meta.roles.includes(userRole)) {
      const fallback = userRole === "staff" ? "dashboardStaff" : "dashboard";
      if (to.name !== fallback) {
        console.log('❌ Role mismatch - Redirect to', fallback)
        return next({ name: fallback });
      }
      return next();
    }
  }

  console.log('✅ Navigation allowed')
  return next();
});

// ✅ Global after hook untuk debugging
router.afterEach((to, from) => {
  console.log('📍 Navigation completed:')
  console.log('  - From:', from.path)
  console.log('  - To:', to.path)
  console.log('  - Params:', to.params)
})

export default router;