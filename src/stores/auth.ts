import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { useRouter } from 'vue-router'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  patronymic: string
  role_name: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const router = useRouter()

  const isAuthenticated = computed(() => !!user.value)

  // Логин
  const login = async (email: string, password: string) => {
    isLoading.value = true
    error.value = null

    try {
      const data = await authApi.login(email, password)

      // Сохраняем токены
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token)
      }

      // Получаем информацию о пользователе
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
      user.value = data
    } catch (err) {
      user.value = null
      throw err
    }
  }

  // Logout
  const logout = async () => {
    try {
      // Пытаемся уведомить сервер (не критично, если упадёт)
      await authApi.logout()
    } catch (err) {
      console.error('Server logout error:', err)
    } finally {
      // Всегда очищаем локальные данные
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      user.value = null
      // Редирект на страницу входа
      router.push('/login')
    }
  }

  // Инициализация при загрузке приложения
  const initAuth = async () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      try {
        await fetchCurrentUser()
      } catch (err) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }
    }
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    fetchCurrentUser,
    initAuth,
  }
})
