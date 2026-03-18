import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
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
    path: '/profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true, title: 'Профиль' },
  },
  {
    path: '/calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { requiresAuth: true, title: 'Календарь' },
  },

  // Маршруты для руководителей
  {
    path: '/manager/team',
    component: () => import('@/views/manager/TeamView.vue'),
    meta: { requiresAuth: true, roles: ['manager'], title: 'Команда' },
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
  //Маршруты для СПО и админа
  {
    path: '/admin',
    component: () => import('@/views/admin and spo/ControlPanelView.vue'),
    meta: { requiresAuth: true, roles: ['spo', 'admin'], title: 'Панель управления' },
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
    path: '/admin/users',
    component: () => import('@/views/admin/UsersView.vue'),
    meta: { requiresAuth: true, roles: ['admin'], title: 'Пользователи' },
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

// Guard
router.beforeEach((to, _from) => {
  const authStore = useAuthStore()

  // Установка заголовка
  if (to.meta.title) {
    document.title = `${to.meta.title} | GradeUp`
  }

  // Проверка авторизации
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  // Редирект с /login
  if (to.path === '/login' && authStore.isAuthenticated) {
    const userRole = authStore.currentUser?.role

    // Редирект на соответствующий дашборд
    switch (userRole) {
      case 'employee':
        return '/dashboard'
      case 'manager':
        return '/manager/dashboard'
      case 'spo':
        return '/spo/dashboard'
      case 'admin':
        return '/admin/dashboard'
      default:
        return '/dashboard'
    }
  }

  // Проверка ролей
  const roles = to.meta.roles as string[] | undefined
  if (roles && roles.length > 0) {
    const userRole = authStore.currentUser?.role
    if (!userRole || !roles.includes(userRole)) {
      console.warn(`Доступ запрещён. Нужны роли: ${roles.join(', ')}`)

      // Редирект на свой дашборд
      switch (userRole) {
        case 'employee':
          return '/dashboard'
        case 'manager':
          return '/manager/dashboard'
        case 'spo':
          return '/spo/dashboard'
        case 'admin':
          return '/admin/dashboard'
        default:
          return '/dashboard'
      }
    }
  }

  return true
})

export default router
