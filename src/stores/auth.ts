import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'

export interface User {
  id: number
  email: string
  name?: string
  roles: string[]
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null)
    const isInitialized = ref(false)

    const fetchCurrentUser = async () => {
      const data = await authApi.getCurrentUser()
      user.value = data
      return data
    }

    const initAuth = async () => {
      try {
        await fetchCurrentUser()
      } catch (error: any) {
        if (error?.response?.status === 401) {
          user.value = null
        } else {
          console.error('Ошибка при инициализации аутентификации:', error)
        }
      } finally {
        isInitialized.value = true
      }
    }

    const login = async (email: string, password: string) => {
      await authApi.login(email, password)
      await fetchCurrentUser()
    }

    // Логаут
    const logout = async () => {
      try {
        await authApi.logout()
      } catch (error) {
        console.error('Ошибка при логауте:', error)
      } finally {
        user.value = null
      }
    }

    const hasRole = (role: string): boolean => {
      return user.value?.roles?.some((r) => r.toLowerCase() === role.toLowerCase()) ?? false
    }

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
    persist: {
      key: 'gradeup-auth',
      paths: ['user'],
      storage: localStorage,
    },
  },
)
