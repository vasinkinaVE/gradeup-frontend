import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  // Публичные маршруты
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    component: () => import('@/views/AuthView.vue'),
    meta: { title: 'Вход в систему' },
  },

  // Дашборд
  {
    path: '/dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, title: 'Личный кабинет' },
  },

  // Общие маршруты
  {
    path: '/calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { requiresAuth: true, title: 'Календарь' },
  },

  // Маршруты для руководителей
  {
    path: '/manager/team',
    component: () => import('@/views/manager/TeamView.vue'),
    meta: { requiresAuth: true, roles: ['supervisor'], title: 'Команда' },
  },
  {
    path: '/manager/employee/:id?',
    component: () => import('@/views/manager/EmployeeView.vue'),
    meta: { requiresAuth: true, roles: ['manager'], title: 'Сотрудник' },
  },
  {
    path: '/manager/create-attestation',
    component: () => import('@/views/manager/CreateAttestationView.vue'),
    meta: { requiresAuth: true, roles: ['manager'], title: 'Создать аттестацию' },
  },

  // Маршруты для СПО и админа
  {
    path: '/admin',
    component: () => import('@/views/admin_and_spo/ControlPanelView.vue'),
    meta: { requiresAuth: true, roles: ['spo', 'admin'], title: 'Панель управления' },
  },
  {
    path: '/admin/users',
    component: () => import('@/views/admin_and_spo/EmployeesView.vue'),
    meta: { requiresAuth: true, roles: ['spo', 'admin'], title: 'Сотрудники' },
  },
  // Маршруты для СПО
  {
    path: '/spo/profiles',
    component: () => import('@/views/spo/ProfilesView.vue'),
    meta: { requiresAuth: true, roles: ['spo'], title: 'Профили' },
  },
  {
    path: '/spo/profiles/:id/edit',
    component: () => import('@/views/spo/ProfileEditView.vue'),
    meta: { requiresAuth: true, roles: ['spo'], title: 'Редактирование профиля' },
  },
  {
    path: '/spo/questions',
    component: () => import('@/views/spo/QuestionsView.vue'),
    meta: { requiresAuth: true, roles: ['spo'], title: 'Вопросы' },
  },
  {
    path: '/spo/questions/:id/edit',
    component: () => import('@/views/spo/QuestionEditView.vue'),
    meta: { requiresAuth: true, roles: ['spo'], title: 'Редактирование вопроса' },
  },
  {
    path: '/spo/reports',
    component: () => import('@/views/spo/ReportsView.vue'),
    meta: { requiresAuth: true, roles: ['spo'], title: 'Отчёты' },
  },

  // Маршруты для админа
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

  // 404
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

// 🔐 Guard для проверки авторизации и ролей (Vue Router 4 syntax)
router.beforeEach(async (to, from): ReturnType<NavigationGuardNext> | undefined => {
  const authStore = useAuthStore()

  // Установка заголовка страницы
  if (to.meta.title) {
    document.title = `${to.meta.title} | GradeUp`
  }

  // 🔹 Если есть токен, но пользователь ещё не загружен — загружаем
  const token = localStorage.getItem('access_token')
  if (token && !authStore.user) {
    try {
      await authStore.fetchCurrentUser()
    } catch {
      // Токен невалиден — очищаем и перенаправляем на вход
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      return '/login' // ✅ Возвращаем путь вместо next('/login')
    }
  }

  // 🔹 Проверка авторизации
  if (to.meta.requiresAuth && !authStore.user) {
    return '/login' // ✅ Возвращаем путь вместо next('/login')
  }

  // 🔹 Если уже авторизован и пытается зайти на /login — редирект на дашборд
  if (to.path === '/login' && authStore.user) {
    return '/dashboard' // ✅ Возвращаем путь вместо next('/dashboard')
  }

  // 🔹 Проверка ролей (если указаны в meta)
  const allowedRoles = to.meta.roles as string[] | undefined
  if (allowedRoles && allowedRoles.length > 0) {
    // ✅ Исправлено: используем role_name + toLowerCase() для надёжного сравнения
    const userRole = authStore.user?.role_name?.toLowerCase()
    const normalizedRoles = allowedRoles.map((r) => r.toLowerCase())

    if (!userRole || !normalizedRoles.includes(userRole)) {
      console.warn(
        `Доступ запрещён. Нужны роли: ${allowedRoles.join(', ')}, у пользователя: ${authStore.user?.role_name}`,
      )
      return '/dashboard' // ✅ Возвращаем путь вместо next('/dashboard')
    }
  }

  // Всё ок — разрешаем переход (неявный return undefined = разрешить)
  // ✅ Не нужно писать return true или next(), просто завершаем функцию
})

export default router
