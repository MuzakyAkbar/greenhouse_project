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
      path: "/reportActivityList",
      name: "reportActivityList",
      component: () => import("../views/ReportActivityList.vue"),
      meta: { requiresAuth: true },
    },
    // ✅ Gunakan :report_id
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
    },
    {
      path: "/formReportActivity",
      name: "formReportActivity",
      component: () => import("../views/formReportActivity.vue"),
      meta: { requiresAuth: true },
    },
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
    {
      path: "/reportProductionReview",
      name: "reportProductionReview",
      component: () => import("../views/reportProductionReview.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/reportProductionView",
      name: "reportProductionView",
      component: () => import("../views/reportProductionView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/report-production",
      name: "reportProduction",
      component: () => import("../views/reportProduction.vue"),
      meta: { requiresAuth: true },
    },
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
  ],
});

// 🔒 Middleware auth guard — aman anti infinite redirect
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isLoggedIn = !!authStore.isLoggedIn;
  const userRole = authStore.user?.role?.toLowerCase() || null;

  // 1) Butuh auth tapi belum login → ke login (hindari redirect berulang)
  if (to.meta.requiresAuth && !isLoggedIn) {
    if (to.name !== "login") {
      return next({ name: "login", query: { redirect: to.fullPath } });
    }
    return next();
  }

  // 2) Sudah login tapi ke login → arahkan sesuai role (fix: nama route benar)
  if (to.name === "login" && isLoggedIn) {
    const target = userRole === "staff" ? "dashboardStaff" : "dashboard";
    if (to.name !== target) {
      return next({ name: target });
    }
    return next();
  }

  // 3) Role-based access: hanya cek kalau role sudah ada
  if (to.meta.roles && to.meta.roles.length > 0) {
    if (userRole && !to.meta.roles.includes(userRole)) {
      const fallback = userRole === "staff" ? "dashboardStaff" : "dashboard";
      // Hindari redirect ke route yang sama
      if (to.name !== fallback) {
        return next({ name: fallback });
      }
      return next();
    }
    // Jika role belum terisi (store belum ter-hydrate), jangan redirect dulu
    // biar tidak loop — izinkan lanjut
  }

  return next();
});

export default router;