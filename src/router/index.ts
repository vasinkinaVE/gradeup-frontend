// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, NavigationGuardNext } from 'vue-router'
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
    path: '/manager/team',
    component: () => import('@/views/manager/TeamView.vue'),
    meta: { requiresAuth: true, roles: ['supervisor'], title: 'Команда' },
  },
  {
    path: '/manager/employee/:id?',
    component: () => import('@/views/manager/EmployeeView.vue'),
    meta: { requiresAuth: true, roles: ['supervisor'], title: 'Сотрудник' },
  },
  {
    path: '/manager/create-attestation',
    component: () => import('@/views/manager/CreateAttestationView.vue'),
    meta: { requiresAuth: true, roles: ['supervisor'], title: 'Создать аттестацию' },
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
    path: '/spo/profiles',
    component: () => import('@/views/spo/ProfilesView.vue'),
    meta: { requiresAuth: true, roles: ['specialist'], title: 'Профили' },
  },
  {
    path: '/spo/profiles/:id/edit',
    component: () => import('@/views/spo/ProfileEditView.vue'),
    meta: { requiresAuth: true, roles: ['specialist'], title: 'Редактирование профиля' },
  },
  {
    path: '/spo/questions',
    component: () => import('@/views/spo/QuestionsView.vue'),
    meta: { requiresAuth: true, roles: ['specialist'], title: 'Вопросы' },
  },
  {
    path: '/spo/questions/:id/edit',
    component: () => import('@/views/spo/QuestionEditView.vue'),
    meta: { requiresAuth: true, roles: ['specialist'], title: 'Редактирование вопроса' },
  },
  {
    path: '/spo/reports',
    component: () => import('@/views/spo/ReportsView.vue'),
    meta: { requiresAuth: true, roles: ['specialist'], title: 'Отчёты' },
  },
  {
    path: '/admin/users/:id/edit',
    component: () => import('@/views/admin/UserEditView.vue'),
    meta: { requiresAuth: true, roles: ['admin'], title: 'Редактирование пользователя' },
  },
  {
    path: '/admin/roles',
    component: () => import('@/views/admin/RolesView.vue'),
    meta: { requiresAuth: true, roles: ['admin'], title: 'Роли' },
  },
  {
    path: '/admin/settings',
    component: () => import('@/views/admin/SettingsView.vue'),
    meta: { requiresAuth: true, roles: ['admin'], title: 'Настройки' },
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

// 🔐 Guard для проверки авторизации и ролей
router.beforeEach(async (to, from): ReturnType<NavigationGuardNext> | undefined => {
  const authStore = useAuthStore()

  // Установка заголовка страницы
  if (to.meta.title) {
    document.title = `${to.meta.title} | GradeUp`
  }

  // 🔹 Пропускаем публичные маршруты
  if (to.meta.public) {
    return
  }

  // 🔹 Если есть токен, но пользователь ещё не загружен — загружаем
  const token = localStorage.getItem('access_token')
  if (token && !authStore.user) {
    try {
      await authStore.fetchCurrentUser()
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      return '/login'
    }
  }

  // 🔹 Проверка авторизации
  if (to.meta.requiresAuth && !authStore.user) {
    return '/login'
  }

  // 🔹 Если уже авторизован и пытается зайти на /login — редирект на дашборд
  if (to.path === '/login' && authStore.user) {
    return '/dashboard'
  }

  // 🔹 Проверка ролей по массиву roles
  const allowedRoles = to.meta.roles as string[] | undefined
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = authStore.user?.roles?.map((r) => r.toLowerCase()) || []
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase())

    const hasAccess = userRoles.some((role) => normalizedAllowedRoles.includes(role))

    if (!hasAccess) {
      console.warn(
        `Доступ запрещён. Нужны роли: ${allowedRoles.join(', ')}, у пользователя: ${authStore.user?.roles?.join(', ')}`,
      )
      return '/dashboard'
    }
  }

  // Всё ок — разрешаем переход
})

export default router
