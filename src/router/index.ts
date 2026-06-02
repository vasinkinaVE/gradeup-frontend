import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    component: () => import('@/views/AuthView.vue'),
    meta: { title: 'Вход в систему', public: true },
  },
  {
    path: '/dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, title: 'Личный кабинет' },
  },
  {
    path: '/calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { requiresAuth: true, title: 'Календарь' },
  },
  {
    path: '/admin',
    component: () => import('@/views/admin_and_spo/ControlPanelView.vue'),
    meta: { requiresAuth: true, roles: ['specialist', 'admin'], title: 'Панель управления' },
  },
  {
    path: '/admin/users',
    component: () => import('@/views/admin_and_spo/EmployeesView.vue'),
    meta: { requiresAuth: true, roles: ['specialist', 'admin', 'supervisor'], title: 'Сотрудники' },
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '404' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()

  if (to.meta.title) {
    document.title = `${to.meta.title} | GradeUp`
  }

  if (to.meta.public) {
    return true
  }

  if (!authStore.isInitialized) {
    return true
  }

  if (to.meta.requiresAuth && !authStore.user) {
    return { name: 'login' }
  }

  if (to.path === '/login' && authStore.user) {
    return { path: '/dashboard' }
  }

  const allowedRoles = to.meta.roles as string[] | undefined
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = authStore.user?.roles?.map((r) => r.toLowerCase()) || []
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase())

    const hasAccess = userRoles.some((role) => normalizedAllowedRoles.includes(role))

    if (!hasAccess) {
      console.warn(
        `Доступ запрещён. Нужны роли: ${allowedRoles.join(', ')}, у пользователя: ${authStore.user?.roles?.join(', ')}`,
      )
      return { path: '/dashboard' }
    }
  }

  return true
})

export default router
