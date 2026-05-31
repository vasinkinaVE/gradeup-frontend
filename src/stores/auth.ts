import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'

// 🔹 Тип пользователя — замените на ваш реальный интерфейс
export interface User {
  id: number
  email: string
  name?: string
  roles: string[]
  // ... остальные поля
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null)
    const isInitialized = ref(false) // 🔥 Флаг: завершена ли проверка аутентификации

    // Загрузка данных текущего пользователя
    const fetchCurrentUser = async () => {
      const data = await authApi.getCurrentUser()
      user.value = data
      return data
    }

    // 🔥 Инициализация при старте приложения
    const initAuth = async () => {
      try {
        // Пытаемся получить пользователя — браузер автоматически приложит куку
        await fetchCurrentUser()
      } catch (error: any) {
        // 401 = не авторизован, это нормальная ситуация
        if (error?.response?.status === 401) {
          user.value = null
        } else {
          console.error('Ошибка при инициализации аутентификации:', error)
        }
      } finally {
        // ✅ Всегда устанавливаем флаг, чтобы роутер продолжил работу
        isInitialized.value = true
      }
    }

    // Логин
    const login = async (email: string, password: string) => {
      await authApi.login(email, password)
      // После успешного логина сервер установит куку, загружаем данные пользователя
      await fetchCurrentUser()
    }

    // Логаут
    const logout = async () => {
      try {
        await authApi.logout() // Сервер удалит куку
      } catch (error) {
        console.error('Ошибка при логауте:', error)
      } finally {
        user.value = null // Очищаем состояние на фронтенде
      }
    }

    // Проверка наличия роли
    const hasRole = (role: string): boolean => {
      return user.value?.roles?.some((r) => r.toLowerCase() === role.toLowerCase()) ?? false
    }

    // Проверка наличия одной из ролей
    const hasAnyRole = (roles: string[]): boolean => {
      if (!user.value?.roles) return false
      const userRoles = user.value.roles.map((r) => r.toLowerCase())
      return roles.some((role) => userRoles.includes(role.toLowerCase()))
    }

    return {
      user,
      isInitialized,
      initAuth,
      fetchCurrentUser,
      login,
      logout,
      hasRole,
      hasAnyRole,
    }
  },
  {
    // ✅ Persist только для user (данные), НЕ для токена!
    persist: {
      key: 'gradeup-auth',
      paths: ['user'], // Кэшируем данные пользователя для мгновенного отображения
      storage: localStorage,
    },
  },
)
