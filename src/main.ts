import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ruLocale from 'element-plus/es/locale/lang/ru'

import App from './App.vue'
import router from './router'
//import './plugins/validation'
import { useAuthStore } from './stores/auth'
import './assets/styles/variables.css'

const app = createApp(App)
const pinia = createPinia()

// Подключаем плагин для сохранения состояния Pinia
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: ruLocale })

// 👇 Инициализация аутентификации (внутри async IIFE, так как top-level await требует настройки)
;(async () => {
  const authStore = useAuthStore()
  await authStore.initAuth()

  app.mount('#app')
})()
