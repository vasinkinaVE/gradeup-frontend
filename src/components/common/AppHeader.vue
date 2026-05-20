<template>
  <header class="main-header">
    <div class="header-left">
      <!-- Кнопка гамбургер (видна только на мобильных и планшетах) -->
      <el-button text :icon="Fold" class="mobile-menu-btn" @click="mobileMenuVisible = true" />

      <div class="logo">
        <span class="logo-text">GradeUp</span>
      </div>

      <!-- Десктопная навигация -->
      <nav class="main-nav desktop-nav">
        <router-link to="/dashboard" class="nav-link" active-class="active">
          <el-icon><HomeFilled /></el-icon>
          <span class="nav-text">Личный кабинет</span>
        </router-link>
        <router-link to="/calendar" class="nav-link" active-class="active">
          <el-icon><Calendar /></el-icon>
          <span class="nav-text">Календарь</span>
        </router-link>

        <!--<router-link v-if="isManager" to="/manager/team" class="nav-link" active-class="active">
          <el-icon><UserFilled /></el-icon>
          <span class="nav-text">Моя команда</span>
        </router-link>-->

        <!-- 🔹 Ссылка: Сотрудники (только для SPO/Admin) -->
        <router-link
          v-if="isSPOOrAdminOrManager"
          to="/admin/users"
          class="nav-link"
          active-class="active"
        >
          <el-icon><User /></el-icon>
          <span class="nav-text">Сотрудники</span>
        </router-link>

        <router-link v-if="isSPOOrAdmin" to="/admin" class="nav-link" active-class="active">
          <el-icon><Setting /></el-icon>
          <span class="nav-text">Панель управления</span>
        </router-link>
      </nav>
    </div>

    <div class="header-right">
      <!-- Уведомления убраны по запросу -->

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

    <!-- Мобильное меню (Drawer) -->
    <el-drawer
      v-model="mobileMenuVisible"
      title="Меню"
      direction="ltr"
      size="280px"
      class="mobile-drawer"
      :lock-scroll="true"
      :modal="true"
    >
      <nav class="mobile-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="mobile-nav-link"
          active-class="active"
          @click="mobileMenuVisible = false"
        >
          <el-icon :size="20"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>

        <!--<router-link
          v-if="isManager"
          to="/manager/team"
          class="mobile-nav-link"
          active-class="active"
          @click="mobileMenuVisible = false"
        >
          <el-icon :size="20"><UserFilled /></el-icon>
          <span>Моя команда</span>
        </router-link>-->

        <!-- 🔹 Ссылка в мобильном меню: Сотрудники -->
        <router-link
          v-if="isSPOOrAdminOrManager"
          to="/admin/users"
          class="mobile-nav-link"
          active-class="active"
          @click="mobileMenuVisible = false"
        >
          <el-icon :size="20"><User /></el-icon>
          <span>Сотрудники</span>
        </router-link>

        <router-link
          v-if="isSPOOrAdmin"
          to="/admin"
          class="mobile-nav-link"
          active-class="active"
          @click="mobileMenuVisible = false"
        >
          <el-icon :size="20"><Setting /></el-icon>
          <span>Панель управления</span>
        </router-link>
      </nav>
    </el-drawer>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, markRaw } from 'vue' // ✅ Добавили markRaw
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bell,
  HomeFilled,
  Calendar,
  ArrowDown,
  UserFilled,
  Setting,
  User,
  Fold,
  WarningFilled,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const mobileMenuVisible = ref(false)

const currentUser = computed(() => authStore.user)

const isManager = computed(() => {
  const role = currentUser.value?.role_name
  if (!role) return false
  const r = role.toLowerCase()
  return ['supervisor', 'руководитель'].includes(r)
})

const isSPOOrAdmin = computed(() => {
  const role = currentUser.value?.role_name
  if (!role) return false
  const r = role.toLowerCase()
  return ['specialist', 'специалист по обучению', 'admin', 'администратор', 'superuser'].includes(r)
})

const isSPOOrAdminOrManager = computed(() => {
  const role = currentUser.value?.role_name
  if (!role) return false
  const r = role.toLowerCase()
  return [
    'specialist',
    'специалист по обучению',
    'admin',
    'администратор',
    'supervisor',
    'руководитель',
  ].includes(r)
})

const userShortName = computed(() => {
  const user = currentUser.value
  if (!user) return ''
  const { first_name = '', last_name = '' } = user
  return `${last_name} ${first_name.charAt(0) || ''}.`.trim()
})

const userInitials = computed(() => {
  const user = currentUser.value
  if (!user) return '?'
  const { first_name = '', last_name = '' } = user
  return `${(first_name[0] || '') + (last_name[0] || '')}`.toUpperCase()
})

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('Вы действительно хотите выйти?', 'Выход из системы', {
      confirmButtonText: 'Выйти',
      cancelButtonText: 'Отмена',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
      icon: markRaw(WarningFilled), // ✅ Оборачиваем в markRaw
    })

    await authStore.logout()
    ElMessage.success('Вы успешно вышли из системы')
  } catch (err: any) {
    const isCancel =
      err?.type === 'cancel' ||
      err === 'cancel' ||
      err?.message?.includes('cancel') ||
      err?.name === 'ElMessageBox'

    if (isCancel) {
      return
    }

    console.error('Logout error:', err)
    ElMessage.error('Не удалось выйти. Попробуйте ещё раз')
  }
}

const handleMenuCommand = (command: string) => {
  if (command === 'logout') {
    handleLogout()
  }
}

// Элементы навигации для мобильного меню (без Профиля)
const navItems = [
  { path: '/dashboard', label: 'Личный кабинет', icon: HomeFilled },
  { path: '/calendar', label: 'Календарь', icon: Calendar },
]
</script>

<style scoped>
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--spacing-lg);
  height: 64px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  box-shadow: 0 2px 8px rgba(74, 44, 109, 0.2);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

/* Кнопка гамбургер — скрыта по умолчанию */
.mobile-menu-btn {
  color: #fff !important;
  font-size: 24px;
  padding: 8px;
  display: none;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 24px;
  font-weight: var(--font-weight-bold);
  color: #fff;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* Десктопная навигация */
.desktop-nav {
  display: flex;
  gap: var(--spacing-sm);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  transition: all 0.3s ease;
  white-space: nowrap;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-link.active {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.nav-link .el-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

/* notification-badge и notification-btn убраны */

.user-menu {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 6px var(--spacing-md);
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
  color: #fff;
  font-weight: var(--font-weight-semibold);
}

.user-name {
  color: #fff;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
}

.user-menu .el-icon {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.logout-item {
  color: var(--danger);
}

/* Мобильная навигация */
.mobile-nav {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  color: var(--text);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  transition: background-color 0.2s;
  margin-bottom: var(--spacing-xs);
}

.mobile-nav-link:hover {
  background-color: var(--background);
  color: var(--primary);
}

.mobile-nav-link.active {
  background-color: var(--primary);
  color: #fff;
}

/* Drawer стили */
:deep(.mobile-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: var(--spacing-md) var(--spacing-lg);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: #fff;
  border-bottom: none;
}

:deep(.mobile-drawer .el-drawer__close-btn) {
  color: #fff;
}

:deep(.mobile-drawer .el-drawer__body) {
  padding: 0;
}

/* ========================================
   MEDIA QUERIES — АДАПТИВНОСТЬ
   ======================================== */

/* Планшеты и мобильные (до 1024px) — показываем гамбургер, скрываем десктопное меню */
@media (max-width: 1024px) {
  .mobile-menu-btn {
    display: inline-flex;
  }

  .desktop-nav {
    display: none;
  }

  .header-right {
    gap: var(--spacing-xs);
  }

  .user-menu {
    padding: 4px 8px;
    gap: var(--spacing-xs);
  }

  .user-name {
    display: none;
  }

  .user-menu .el-icon {
    display: none;
  }

  .logo-text {
    font-size: 20px;
  }
}

/* Маленькие экраны (до 360px) */
@media (max-width: 360px) {
  .main-header {
    height: 56px;
  }

  .logo-text {
    font-size: 18px;
  }
}
</style>

<!-- ✅ Глобальные стили для модального окна выхода (не в scoped) -->
<style>
/* === Стили для ElMessageBox (модальное окно подтверждения) === */

/* 🔹 Иконка предупреждения — красная */
.el-message-box .el-message-box__status.el-icon-warning {
  color: #f44336 !important;
}

/* 🔹 Крестик закрытия — красный при наведении */
.el-message-box .el-message-box__headerbtn {
  transition: color 0.2s;
}

.el-message-box .el-message-box__headerbtn:hover,
.el-message-box .el-message-box__headerbtn:hover .el-message-box__close {
  color: #f44336 !important;
}

/* 🔹 Кнопка "Отмена" — серая при наведении */
.el-message-box .el-message-box__btns button:first-child {
  transition: all 0.2s;
}

.el-message-box .el-message-box__btns button:first-child:hover {
  background-color: #c5c5c5 !important;
  border-color: #909399 !important;
  color: #fff !important;
}

/* 🔹 Кнопка "Выйти" (confirm) — оставляем красной как есть */
.el-message-box .el-message-box__btns button:last-child {
  background-color: #f44336;
  border-color: #f44336;
}

.el-message-box .el-message-box__btns button:last-child:hover {
  background-color: #c22d2a !important;
  border-color: #e53935 !important;
}
</style>
