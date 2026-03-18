<template>
  <header class="main-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-text">GradeUp</span>
      </div>
      <nav class="main-nav">
        <router-link to="/dashboard" class="nav-link" active-class="active">
          <el-icon><HomeFilled /></el-icon>
          <span>Личный кабинет</span>
        </router-link>
        <router-link to="/profile" class="nav-link" active-class="active">
          <el-icon><List /></el-icon>
          <span>Профиль</span>
        </router-link>
        <router-link to="/calendar" class="nav-link" active-class="active">
          <el-icon><Calendar /></el-icon>
          <span>Календарь</span>
        </router-link>
        <!-- Кнопка "Моя команда" только для руководителей -->
        <router-link v-if="isManager" to="/manager/team" class="nav-link" active-class="active">
          <el-icon><UserFilled /></el-icon>
          <span>Моя команда</span>
        </router-link>
        <!-- Кнопка "Панель управления" только для SPO и администраторов -->
        <router-link v-if="isSPOOrAdmin" to="/admin" class="nav-link" active-class="active">
          <el-icon><Setting /></el-icon>
          <span>Панель управления</span>
        </router-link>
      </nav>
    </div>

    <div class="header-right">
      <el-badge :value="3" class="notification-badge">
        <el-button text :icon="Bell" class="notification-btn" />
      </el-badge>

      <el-dropdown @command="handleMenuCommand">
        <div class="user-menu">
          <el-avatar :size="32" class="user-avatar">
            {{ userInitials }}
          </el-avatar>
          <span class="user-name">{{ userShortName }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item divided command="logout">
              <span class="logout-item">Выйти</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bell,
  HomeFilled,
  List,
  Calendar,
  ArrowDown,
  UserFilled,
  Setting,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const currentUser = computed(() => authStore.currentUser)

// Проверка роли: руководитель/менеджер
const isManager = computed(() => {
  const user = currentUser.value
  if (!user) return false

  if (user.role) {
    return ['MANAGER', 'manager', 'Руководитель', 'руководитель'].includes(user.role)
  }
  return false
})

// Проверка роли: SPO или администратор
const isSPOOrAdmin = computed(() => {
  const user = currentUser.value
  if (!user) return false

  if (user.role) {
    return [
      'SPO',
      'spo',
      'Специалист по обучению',
      'специалист по обучению',
      'ADMIN',
      'admin',
      'Администратор',
      'администратор',
      'SUPERUSER',
      'superuser',
    ].includes(user.role)
  }
  return false
})

const userShortName = computed(() => {
  const user = currentUser.value
  if (!user) return ''
  return `${user.lastName} ${user.firstName.charAt(0)}.`
})

const userInitials = computed(() => {
  const user = currentUser.value
  if (!user) return '?'
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
})

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('Вы действительно хотите выйти?', 'Выход из системы', {
      confirmButtonText: 'Выйти',
      cancelButtonText: 'Отмена',
      type: 'warning',
    })
    authStore.logout()
    ElMessage.success('Вы успешно вышли из системы')
    router.push('/login')
  } catch {
    // Отменено
  }
}

const handleMenuCommand = (command: string) => {
  if (command === 'logout') {
    handleLogout()
  }
}
</script>

<style scoped>
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background: linear-gradient(135deg, #4a2c6d 0%, #6a4c8d 100%);
  box-shadow: 0 2px 8px rgba(74, 44, 109, 0.2);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 24px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
}

.main-nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link.active {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.nav-link .el-icon {
  font-size: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-badge {
  cursor: pointer;
}

.notification-btn {
  color: white;
  font-size: 20px;
  padding: 8px;
}

.notification-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-menu:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.user-avatar {
  background-color: rgba(255, 255, 255, 0.3);
  color: white;
  font-weight: 600;
}

.user-name {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.user-menu .el-icon {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.logout-item {
  color: #f56c6c;
}
</style>
