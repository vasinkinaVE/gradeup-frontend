import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Создаем экземпляр axios с настройками
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Важно для отправки cookies
})

export const authApi = {
  // Логин
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', {
      // ← Убрали API_URL
      email,
      password,
    })
    return response.data
  },

  // Refresh токена
  refreshToken: async () => {
    const response = await apiClient.post('/auth/refresh') // ← Убрали API_URL
    return response.data
  },

  // Logout
  logout: async () => {
    const response = await apiClient.post('/auth/logout') // ← Убрали API_URL
    return response.data
  },

  // Получение текущего пользователя
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me') // ← Убрали API_URL
    return response.data
  },
}
