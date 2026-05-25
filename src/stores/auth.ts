// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { useRouter } from 'vue-router'

// ✅ Обновлённый интерфейс пользователя с полями из /auth/me
export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  patronymic: string
  position: string
  role_id: number
  role_name: string
  is_supervisor: boolean
  roles: string[]
  department_name: string | null
  division_id: number | null
  managed_division_id: number | null
  managed_division_name: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const router = useRouter()

  const isAuthenticated = computed(() => !!user.value)

  // ✅ Проверка: есть ли у пользователя хотя бы одна из указанных ролей
  const hasRole = (roleNames: string | string[]): boolean => {
    if (!user.value?.roles) return false
    const roles = Array.isArray(roleNames) ? roleNames : [roleNames]
    const userRolesLower = user.value.roles.map((r) => r.toLowerCase())
    return roles.some((role) => userRolesLower.includes(role.toLowerCase()))
  }

  // ✅ Проверка: является ли пользователь руководителем
  const isSupervisor = computed(() => {
    return user.value?.is_supervisor === true || hasRole('supervisor')
  })

  // ✅ Проверка: является ли пользователем с правами администратора/специалиста
  const isSPOOrAdmin = computed(() => {
    return hasRole(['admin', 'specialist', 'администратор', 'специалист по обучению', 'superuser'])
  })

  // Логин
  const login = async (email: string, password: string) => {
    isLoading.value = true
    error.value = null

    try {
      await authApi.login(email, password)
      await fetchCurrentUser()
      return { success: true }
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Ошибка авторизации'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Получение текущего пользователя
  const fetchCurrentUser = async () => {
    try {
      const data = await authApi.getCurrentUser()
      // ✅ Нормализация данных: гарантируем, что roles — массив
      user.value = {
        ...data,
        roles: Array.isArray(data.roles) ? data.roles : data.role_name ? [data.role_name] : [],
        // ✅ Гарантируем числовые значения для ID полей
        division_id: data.division_id !== null ? Number(data.division_id) : null,
        managed_division_id:
          data.managed_division_id !== null ? Number(data.managed_division_id) : null,
      }
    } catch (err) {
      user.value = null
      throw err
    }
  }

  // Logout
  const logout = async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.error('Server logout error:', err)
    } finally {
      user.value = null
      router.push('/login')
    }
  }

  // Инициализация при загрузке приложения
  const initAuth = async () => {
    try {
      await fetchCurrentUser()
    } catch (err) {
      user.value = null
    }
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    isSupervisor,
    isSPOOrAdmin,
    hasRole,
    login,
    logout,
    fetchCurrentUser,
    initAuth,
  }
})
