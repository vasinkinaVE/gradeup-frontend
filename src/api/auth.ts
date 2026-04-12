import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const authApi = {
  // Логин
  login: async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    })
    return response.data
  },

  // Refresh токена
  refreshToken: async () => {
    const response = await axios.post(`${API_URL}/auth/refresh`)
    return response.data
  },

  // Logout
  logout: async () => {
    const response = await axios.post(`${API_URL}/auth/logout`)
    return response.data
  },

  // Получение текущего пользователя
  getCurrentUser: async () => {
    const response = await axios.get(`${API_URL}/auth/me`)
    return response.data
  },
}
