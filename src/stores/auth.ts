// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ============================================
// 👥 Типы ролей (постоянные роли пользователей)
// ============================================
export type UserRole = 'employee' | 'manager' | 'spo' | 'admin'

export interface User {
  id: string
  lastName: string
  firstName: string
  middleName: string
  email: string
  role: UserRole
  position: string
  category: string
  department?: string
}

// ============================================
// 👤 Демо-пользователи (для прототипа)
// ============================================
const DEMO_USERS: Record<string, User & { password: string }> = {
  'employee@dns.ru': {
    id: '1',
    lastName: 'Иванов',
    firstName: 'Иван',
    middleName: 'Иванович',
    email: 'employee@dns.ru',
    password: 'password123',
    role: 'employee',
    position: 'Разработчик',
    category: '1 категория',
    department: 'Разработка ПО',
  },
  'manager@dns.ru': {
    id: '2',
    lastName: 'Петров',
    firstName: 'Пётр',
    middleName: 'Петрович',
    email: 'manager@dns.ru',
    password: 'password123',
    role: 'manager',
    position: 'Тимлид',
    category: '2 категория',
    department: 'Разработка ПО',
  },
  'spo@dns.ru': {
    id: '3',
    lastName: 'Смирнова',
    firstName: 'Елена',
    middleName: 'Дмитриевна',
    email: 'spo@dns.ru',
    password: 'password123',
    role: 'spo',
    position: 'СПО',
    category: 'Эксперт',
    department: 'Обучение и развитие',
  },
  'admin@dns.ru': {
    id: '4',
    lastName: 'Администратор',
    firstName: 'Системный',
    middleName: '',
    email: 'admin@dns.ru',
    password: 'password123',
    role: 'admin',
    position: 'Администратор системы',
    category: 'Админ',
    department: 'IT',
  },
}

// ============================================
// 🏪 Pinia Store
// ============================================

export const useAuthStore = defineStore(
  'auth',
  () => {
    const currentUser = ref<User | null>(null)
    const token = ref<string | null>(null)
    const isLoading = ref<boolean>(false)

    const isAuthenticated = computed<boolean>(() => {
      return !!currentUser.value && !!token.value
    })

    const hasRole = (role: UserRole): boolean => {
      return currentUser.value?.role === role
    }

    const login = async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      isLoading.value = true

      try {
        // Имитация задержки сети
        await new Promise((resolve) => setTimeout(resolve, 800))

        // Поиск пользователя
        const emailLower = email.toLowerCase().trim()
        const user = Object.values(DEMO_USERS).find((u) => u.email.toLowerCase() === emailLower)

        if (!user || user.password !== password) {
          return { success: false, error: 'Неверный email или пароль' }
        }

        // Сохраняем пользователя (без пароля!)
        const { password: _, ...userWithoutPassword } = user
        currentUser.value = userWithoutPassword
        token.value = 'mock-token-' + Date.now()

        return { success: true }
      } catch (error) {
        console.error('Login error:', error)
        return { success: false, error: 'Ошибка авторизации' }
      } finally {
        isLoading.value = false
      }
    }

    const logout = (): void => {
      currentUser.value = null
      token.value = null
    }

    return {
      currentUser,
      token,
      isLoading,
      isAuthenticated,
      hasRole,
      login,
      logout,
    }
  },
  {
    persist: {
      key: 'gradeup_auth',
      paths: ['token', 'currentUser'],
    },
  },
)
