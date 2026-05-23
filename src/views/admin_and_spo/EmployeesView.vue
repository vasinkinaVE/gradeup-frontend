<!-- src/views/EmployeesView.vue -->
<template>
  <div class="employees-view">
    <!-- Шапка -->
    <header class="view-header">
      <div>
        <h1>Управление сотрудниками</h1>
        <div v-if="isSupervisor" class="department-subtitle">{{ userDepartmentName }}</div>
      </div>
      <div class="header-actions">
        <el-button v-if="isAdmin" type="primary" @click="openRegisterModal">
          <el-icon><Plus /></el-icon> Зарегистрировать сотрудника
        </el-button>
        <el-button v-if="isSupervisor" type="primary" @click="openMeetingDialog">
          <el-icon><Calendar /></el-icon> Создать встречу
        </el-button>
      </div>
    </header>

    <!-- Фильтры -->
    <div class="filters-row">
      <el-input
        v-model="search"
        placeholder="Поиск по ФИО или должности"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select
        v-if="!isSupervisor"
        v-model="filterDepartmentId"
        placeholder="Все отделы"
        clearable
        class="department-filter"
        @change="applyFilters"
      >
        <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
      </el-select>
    </div>

    <!-- Таблица сотрудников -->
    <el-table
      :data="filteredEmployees"
      stripe
      border
      class="data-table"
      @row-click="viewEmployee"
      style="cursor: pointer"
      v-loading="loading"
    >
      <el-table-column prop="fullName" label="ФИО" min-width="220" />
      <el-table-column prop="position" label="Должность" width="180" />
      <el-table-column v-if="!isSupervisor" prop="departmentName" label="Отдел" width="180" />

      <!-- Колонка Профиль -->
      <el-table-column label="Профиль" min-width="240">
        <template #default="{ row }">
          <div class="profile-cell">
            <div class="profile-name">
              {{ row.profileName || 'Не назначен' }}
              <span v-if="row.profileLevel" class="profile-level">({{ row.profileLevel }})</span>
            </div>
            <div class="progress-wrapper">
              <span class="progress-percent">{{ row.progress ?? 0 }}%</span>
              <el-progress
                v-if="row.progress !== null && row.progress !== undefined"
                :percentage="row.progress"
                :show-text="false"
                :stroke-width="6"
                class="profile-progress"
              />
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column v-if="isSupervisor || isAdmin" label="Повышение" width="150">
        <template #default="{ row }">
          <el-tag :type="isPromotionAvailable(row) ? 'success' : 'info'" size="small">
            {{ isPromotionAvailable(row) ? 'Доступно' : 'Не доступно' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column v-if="!isSupervisor" prop="roleName" label="Роль" width="150" />
    </el-table>

    <!-- 🔹 Модальное окно: Карточка сотрудника -->
    <EmployeeCard
      v-if="detailVisible"
      v-model:visible="detailVisible"
      :employee="selectedEmployee"
      :is-admin="isAdmin"
      :is-supervisor="isSupervisor"
      :departments="departments"
      :available-roles="filteredRoles"
      :available-profiles="availableProfiles"
      :all-profiles-data="allProfilesData"
      @update="handleEmployeeUpdate"
      @assign-profile="handleAssignProfile"
      @promote="handlePromoteEmployee"
    />

    <!-- 🔹 Модальное окно: Регистрация сотрудника -->
    <RegistrationDialog
      v-model:visible="registerVisible"
      :departments="departments"
      @registered="handleRegistration"
    />

    <!-- 🔹 Модальное окно: Создание встречи (для руководителя) -->
    <MeetingDialog
      v-if="isSupervisor"
      v-model="meetingDialogVisible"
      :employee="selectedEmployee"
      @close="meetingDialogVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search, Calendar } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import EmployeeCard from '@/components/employees/EmployeeCard.vue'
import RegistrationDialog from '@/components/employees/RegistrationDialog.vue'
import MeetingDialog from '@/components/common/MeetingDialog.vue'

// 🔹 Интерфейсы для типизации
interface Department {
  id: number
  name: string
}

interface Role {
  id: number
  name: string
  displayName: string
  isSupervisorRole: boolean
}

interface Profile {
  id: number
  title: string
  levels: Array<{
    id: number
    name: string
    level_name?: string
    [key: string]: any
  }>
  [key: string]: any
}

interface Employee {
  id: number
  userId: number
  lastName: string
  firstName: string
  patronymic: string
  fullName: string
  position: string
  email: string
  isSupervisor: boolean
  departmentId: number | null
  departmentName: string
  profileId: number | null
  profileName: string
  profileLevel: string | null
  progress: number | null
  totalCnt: number
  completedCnt: number
  roleId: number | null
  roleName: string
}

const authStore = useAuthStore()
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const isAdmin = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('admin') || role.includes('администратор')
})
const isSupervisor = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('supervisor') || role.includes('руководитель')
})

// === Состояние ===
const loading = ref(false)
const search = ref('')
const filterDepartmentId = ref<number | null>(null)
const detailVisible = ref(false)
const registerVisible = ref(false)
const meetingDialogVisible = ref(false)
const selectedEmployee = ref<Employee | null>(null)

// === Данные ===
const departments = ref<Department[]>([])
const availableRoles = ref<Role[]>([
  { id: 1, name: 'Employee (Сотрудник)', displayName: 'Сотрудник', isSupervisorRole: false },
  { id: 2, name: 'Supervisor (Руководитель)', displayName: 'Руководитель', isSupervisorRole: true },
  { id: 3, name: 'Specialist (СПО)', displayName: 'СПО', isSupervisorRole: false },
  { id: 4, name: 'Admin (Администратор)', displayName: 'Администратор', isSupervisorRole: false },
])
const availableProfiles = ref<Profile[]>([])
const employees = ref<Employee[]>([])
const allProfilesData = ref<Profile[]>([])

const filteredRoles = computed(() => {
  return availableRoles.value.filter((role) => {
    if (role.isSupervisorRole) return false
    const roleName = role.name?.toLowerCase() || ''
    const displayName = role.displayName?.toLowerCase() || ''
    return !roleName.includes('supervisor') && !displayName.includes('руководитель')
  })
})

const filteredEmployees = computed(() => {
  let result = employees.value
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(
      (e) =>
        `${e.lastName} ${e.firstName} ${e.patronymic || ''}`.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q),
    )
  }
  if (filterDepartmentId.value && !isSupervisor.value) {
    result = result.filter((e) => e.departmentId === filterDepartmentId.value)
  }
  return result
})

const userDepartmentName = computed(() => {
  if (!isSupervisor.value) return ''
  const deptId = authStore.user?.department_id
  const dept = departments.value.find((d) => d.id === deptId)
  return dept?.name || 'Отдел не назначен'
})

// === Методы загрузки данных ===

const fetchDepartments = async () => {
  try {
    const res = await fetch(`${API_BASE}/admin/departments/`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    departments.value = Array.isArray(data)
      ? data.map((d: any) => ({
          id: d.id,
          name: d.department_name || d.name || '',
        }))
      : []
  } catch (err) {
    console.error('Error fetching departments:', err)
    departments.value = []
  }
}

const fetchAvailableProfiles = async () => {
  try {
    const res = await fetch(`${API_BASE}/profiles/levels`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    availableProfiles.value = Array.isArray(data) ? data : []
    allProfilesData.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Error fetching profiles:', err)
    availableProfiles.value = []
    allProfilesData.value = []
  }
}

const fetchEmployees = async () => {
  try {
    loading.value = true
    const onlySubordinates = isSupervisor.value ? true : false
    let url = `${API_BASE}/users/?only_subordinates=${onlySubordinates}`

    if (filterDepartmentId.value) {
      url += `&departments_id=${filterDepartmentId.value}`
    }

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    const data = await res.json()

    employees.value = Array.isArray(data)
      ? data.map((e: any): Employee => {
          let roleId: number | null = null
          let roleName = 'Не назначена'

          if (e.roles && Array.isArray(e.roles)) {
            const firstRole = e.roles[0]
            if (firstRole) {
              const found = availableRoles.value.find(
                (r) =>
                  r.name.toLowerCase().includes(firstRole.toLowerCase()) ||
                  r.displayName.toLowerCase().includes(firstRole.toLowerCase()),
              )
              if (found) {
                roleId = found.id
                roleName = found.displayName
              } else {
                roleName = firstRole
              }
            }
          }

          if (e.role_name) {
            roleName = e.role_name
            const found = availableRoles.value.find(
              (r) =>
                r.name.toLowerCase().includes(e.role_name.toLowerCase()) ||
                r.displayName.toLowerCase().includes(e.role_name.toLowerCase()),
            )
            if (found) {
              roleId = found.id
              roleName = found.displayName
            }
          }

          return {
            id: e.id,
            userId: e.id,
            lastName: e.last_name || '',
            firstName: e.first_name || '',
            patronymic: e.patronymic || '',
            fullName: `${e.last_name || ''} ${e.first_name || ''} ${e.patronymic || ''}`.trim(),
            position: e.position || '',
            email: e.email || '',
            isSupervisor: e.is_supervisor ?? false,
            departmentId: e.department_id,
            departmentName: e.department_name || 'Не назначен',
            profileId: null,
            profileName: 'Не назначен',
            profileLevel: null,
            progress: 0,
            totalCnt: 0,
            completedCnt: 0,
            roleId,
            roleName,
          }
        })
      : []
  } catch (err: any) {
    console.error('Error fetching employees:', err)
    ElMessage.error(`Не удалось загрузить сотрудников: ${err.message}`)
    employees.value = []
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  // filteredEmployees - computed, автоматически обновится
}

const isPromotionAvailable = (employee: Employee) => {
  if (!employee?.progress || employee.progress !== 100) return false
  if (!employee?.profileId) return null
  const profile = allProfilesData.value.find((p) => p.id === employee.profileId)
  if (!profile?.levels) return null

  const currentLevelName = employee.profileLevel
  if (!currentLevelName) return profile.levels[0] || null

  const currentLevelIndex = profile.levels.findIndex(
    (level: any) => level.name === currentLevelName,
  )

  if (currentLevelIndex === -1 || currentLevelIndex >= profile.levels.length - 1) {
    return null
  }
  return profile.levels[currentLevelIndex + 1]
}

// === Обработчики событий ===

const viewEmployee = (row: Employee) => {
  selectedEmployee.value = { ...row }
  detailVisible.value = true
}

const handleEmployeeUpdate = async (updatedData: any) => {
  try {
    const payload = {
      first_name: updatedData.firstName,
      last_name: updatedData.lastName,
      patronymic: updatedData.patronymic || '',
      email: updatedData.email,
      profile_id: updatedData.profileId || null,
      role_id: updatedData.roleId || null,
      department_id: updatedData.departmentId || null,
    }

    const res = await fetch(`${API_BASE}/users/${updatedData.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail?.[0]?.msg || err.detail || `HTTP ${res.status}`)
    }

    const responseData = await res.json()

    const idx = employees.value.findIndex((e) => e.userId === updatedData.userId)
    if (idx !== -1) {
      let roleName = 'Не назначена'
      if (responseData.role_name) {
        const found = availableRoles.value.find(
          (r) =>
            r.name.toLowerCase().includes(responseData.role_name.toLowerCase()) ||
            r.displayName.toLowerCase().includes(responseData.role_name.toLowerCase()),
        )
        roleName = found?.displayName || responseData.role_name
      }

      employees.value[idx] = {
        ...employees.value[idx],
        firstName: responseData.first_name,
        lastName: responseData.last_name,
        patronymic: responseData.patronymic,
        email: responseData.email,
        departmentId: responseData.department_id,
        departmentName: responseData.department_name,
        roleId: responseData.role_id,
        roleName,
        fullName:
          `${responseData.last_name} ${responseData.first_name} ${responseData.patronymic || ''}`.trim(),
      }
    }

    ElMessage.success('Данные обновлены')
    await fetchEmployees()
    detailVisible.value = false
  } catch (err: any) {
    console.error('Error saving employee:', err)
    ElMessage.error(err.message || 'Ошибка сохранения')
  }
}

// 🔧 ОБНОВЛЁННЫЙ ОБРАБОТЧИК НАЗНАЧЕНИЯ ПРОФИЛЯ
const handleAssignProfile = async (userId: number, profileId: number) => {
  try {
    const payload = {
      user_id: userId,
      profile_id: profileId,
    }

    const res = await fetch(`${API_BASE}/users/profiles/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      // 🔧 Корректная обработка 422 от FastAPI
      const errData = await res.json().catch(() => ({}))
      let errorMsg = `Ошибка сервера: ${res.status}`

      if (Array.isArray(errData.detail)) {
        errorMsg = errData.detail.map((d: any) => d.msg).join('\n')
      } else if (errData.detail) {
        errorMsg =
          typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail)
      }
      throw new Error(errorMsg)
    }

    // 🔧 Точечное обновление сотрудника в списке
    const profile = availableProfiles.value.find((p) => p.id === profileId)
    const idx = employees.value.findIndex((e) => e.userId === userId)

    if (idx !== -1 && profile) {
      employees.value[idx] = {
        ...employees.value[idx],
        profileId: profile.id,
        profileName: profile.title,
        profileLevel: profile.levels?.[0]?.name || profile.levels?.[0]?.level_name || null,
        progress: 0,
      }
    }

    ElMessage.success('Профиль успешно назначен')

    // 🔧 Опционально: раскомментируйте, если нужно закрывать диалог после назначения
    // detailVisible.value = false
  } catch (err: any) {
    console.error('Error assigning profile:', err)
    ElMessage.error(err.message || 'Не удалось назначить профиль')
  }
}

const handlePromoteEmployee = async (employee: Employee, nextLevel: any) => {
  try {
    const res = await fetch(
      `${API_BASE}/users/${employee.userId}/profiles/${employee.profileId}/grade-up`,
      { method: 'POST' },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }

    const idx = employees.value.findIndex((e) => e.userId === employee.userId)
    if (idx !== -1) {
      employees.value[idx] = {
        ...employees.value[idx],
        profileLevel: nextLevel.name,
        progress: 0,
      }
    }

    ElMessage.success(`Сотрудник повышен до уровня "${nextLevel.name}"`)
    await fetchEmployees()
    detailVisible.value = false
  } catch (err: any) {
    console.error('Error promoting employee:', err)
    ElMessage.error(err.message || 'Ошибка при повышении')
  }
}

// 🔧 ИСПРАВЛЕННЫЙ ОБРАБОТЧИК РЕГИСТРАЦИИ
const handleRegistration = async () => {
  // 🔹 RegistrationDialog сам закрылся и показал уведомление.
  // 🔹 Наша задача — только обновить список сотрудников.
  try {
    await fetchEmployees()
  } catch (err) {
    console.error('Failed to refresh employees after registration:', err)
    // Мягкое предупреждение: регистрация прошла, но список не обновился
    ElMessage.warning({
      message: 'Сотрудник зарегистрирован, но список не обновился. Попробуйте обновить страницу.',
      duration: 4000,
    })
  }
}

const openRegisterModal = () => {
  registerVisible.value = true
}

const openMeetingDialog = () => {
  meetingDialogVisible.value = true
}

// === Инициализация ===
onMounted(async () => {
  try {
    await fetchDepartments()
  } catch (e) {
    console.error('Failed to load departments:', e)
  }

  try {
    await fetchAvailableProfiles()
  } catch (e) {
    console.error('Failed to load profiles:', e)
  }

  try {
    await fetchEmployees()
  } catch (e) {
    console.error('Failed to load employees:', e)
  }
})
</script>

<style scoped>
/* === Основные стили === */
.employees-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
  color: var(--text);
}
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.view-header h1 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: #000;
}
.department-subtitle {
  font-size: 16px;
  color: #666;
  font-weight: var(--font-weight-medium);
}
.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}
.filters-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
  align-items: center;
}
.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}
.department-filter {
  width: 200px;
}
.data-table {
  width: 100%;
  margin-bottom: var(--spacing-md);
}

:deep(.el-table .cell) {
  font-weight: 400 !important;
}

.profile-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.profile-name {
  font-weight: normal;
  color: #000;
  font-size: 14px;
}
.profile-level {
  font-size: 14px;
  color: #666;
}

.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.progress-percent {
  font-size: 14px !important;
  color: #666;
  white-space: nowrap;
  min-width: 38px;
  text-align: left;
  font-variant-numeric: tabular-nums;
  font-weight: 400;
}
.profile-progress {
  flex: 1;
  min-width: 0;
}
:deep(.profile-progress .el-progress__text) {
  font-size: 14px !important;
  font-weight: 400;
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  .department-filter {
    width: 100%;
  }
}
</style>
