import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// ✅ Единый экземпляр axios для cookie-аутентификации
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // 🔥 Обязательно: отправлять/получать cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// ❌ Никаких интерцепторов с localStorage — токен в HttpOnly cookie

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 обрабатываем в компоненте или store, не здесь
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
