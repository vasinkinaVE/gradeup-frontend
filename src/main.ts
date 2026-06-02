import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ruLocale from 'element-plus/es/locale/lang/ru'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './assets/styles/variables.css'

const app = createApp(App)
const pinia = createPinia()

pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: ruLocale })
;(async () => {
  const authStore = useAuthStore()

  await authStore.initAuth()

  app.mount('#app')
})()
