// src/api/auth.ts
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Создаем экземпляр axios с настройками
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // ✅ Важно для отправки cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor для добавления токена (если используется localStorage)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor для обработки ошибок авторизации
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 обрабатывается в authStore после неудачного fetchCurrentUser
    return Promise.reject(error)
  },
)

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password })
    return response.data
  },

  refreshToken: async () => {
    const response = await apiClient.post('/auth/refresh')
    return response.data
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout')
    return response.data
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}
