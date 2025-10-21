import { createRouter, createWebHistory } from 'vue-router'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/login.vue'),
    },
    {
      path: '/report',
      name: 'report',
      component: () => import('../views/report.vue'),
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('../views/review.vue'),
    },
    {
      path: '/form',
      name: 'form',
      component: () => import('../views/form.vue'),
    },
    {
      path: '/viewform',
      name: 'viewform',
      component: () => import('../views/viewform.vue'),
    },
  ],
})

export default router
