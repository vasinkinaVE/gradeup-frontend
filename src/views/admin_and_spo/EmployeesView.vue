<!-- src/views/EmployeesView.vue -->
<template>
  <div class="employees-view">
    <header class="view-header">
      <div>
        <h1>Управление сотрудниками</h1>
        <div v-if="isSupervisor && userDepartmentName" class="department-subtitle">
          {{ userDepartmentName }}
          <span v-if="isSupervisorWithDivision" class="division-badge">
            ({{ userDivisionName }})
          </span>
        </div>
      </div>
      <div class="header-actions">
        <!-- 🔹 Регистрация: только для admin/specialist -->
        <el-button v-if="isAdminOrSPO" type="primary" @click="openRegisterModal">
          <el-icon><Plus /></el-icon> Зарегистрировать сотрудника
        </el-button>
        <!-- 🔹 Создание встречи: для всех руководителей -->
        <el-button v-if="isSupervisor" type="primary" @click="openMeetingDialog">
          <el-icon><Calendar /></el-icon> Создать встречу
        </el-button>
      </div>
    </header>

    <div class="filters-row">
      <el-input
        v-model="search"
        placeholder="Поиск по ФИО или должности"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
      <!-- 🔹 Фильтр по отделам: скрыт для руководителя без направления -->
      <el-select
        v-if="showDepartmentFilter"
        v-model="filterDepartmentId"
        :placeholder="isSupervisorWithDivision ? 'Все отделы направления' : 'Все отделы'"
        clearable
        class="department-filter"
        @change="applyFilters"
      >
        <el-option
          v-for="dept in availableDepartments"
          :key="dept.id"
          :label="dept.name"
          :value="dept.id"
        />
      </el-select>
    </div>

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

      <!-- 🔹 Отдел: показываем, если не руководитель без направления -->
      <el-table-column
        v-if="showDepartmentColumn"
        prop="departmentName"
        label="Отдел"
        width="180"
      />

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

      <!-- 🔹 Роли: отображаются с переводом на русский -->
      <el-table-column label="Роли" width="150">
        <template #default="{ row }">
          <span class="roles-cell">{{ getTranslatedRoles(row.roles) }}</span>
        </template>
      </el-table-column>

      <!-- 🔹 Повышение: показываем, если есть права на управление профилем -->
      <el-table-column v-if="canManageProfiles" label="Повышение" width="150">
        <template #default="{ row }">
          <el-tag :type="isPromotionAvailable(row) ? 'success' : 'info'" size="small">
            {{ isPromotionAvailable(row) ? 'Доступно' : 'Не доступно' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <!-- 🔹 Передаём canEditEmployeeInfo и canEditRole отдельно -->
    <EmployeeCard
      v-if="detailVisible"
      v-model:visible="detailVisible"
      :employee="selectedEmployee"
      :is-admin="isAdminOrSPO"
      :is-supervisor="isSupervisor"
      :can-edit-employee-info="canEditEmployeeInfo"
      :can-edit-role="canEditRole"
      :departments="availableDepartments"
      :available-roles="filteredRoles"
      :available-profiles="availableProfiles"
      :all-profiles-data="allProfilesData"
      :user-full-profile="userFullProfile"
      :department-profiles="departmentProfilesCache"
      :fetch-department-profiles="fetchDepartmentProfiles"
      :supervisor-division-id="supervisorDivisionId"
      :supervisor-department-id="supervisorDepartmentId"
      @update="handleEmployeeUpdate"
      @assign-profile="handleAssignProfile"
      @promote="handlePromoteEmployee"
      @unlink-profile="handleUnlinkProfile"
    />

    <RegistrationDialog
      v-model:visible="registerVisible"
      :departments="availableDepartments"
      @registered="handleRegistration"
    />

    <MeetingDialog
      v-if="isSupervisor"
      v-model="meetingDialogVisible"
      :employee="selectedEmployee"
      :is-supervisor="isSupervisor"
      :supervisor-division-id="supervisorDivisionId"
      :departments="availableDepartments"
      :employees="employees"
      :skills="skills"
      @close="meetingDialogVisible = false"
      @refresh="fetchEmployees"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search, Calendar } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import EmployeeCard from '@/components/employees/EmployeeCard.vue'
import RegistrationDialog from '@/components/employees/RegistrationDialog.vue'
import MeetingDialog from '@/components/common/MeetingDialog.vue'

// === Интерфейсы ===
interface Department {
  id: number
  name: string
  division_id?: number | null
}
interface DivisionWithDepartments {
  id: number
  division_name: string
  supervisor_id: number | null
  supervisor: {
    id: number
    first_name: string
    last_name: string
    patronymic: string
    email: string
  } | null
  departments: Array<{
    id: number
    department_name: string
    supervisor_id: number | null
    description: string
  }>
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
  levels: any[]
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
  roles: string[]
}

const authStore = useAuthStore()
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// === 🔹 Маппинг ролей на русский язык ===
const ROLE_TRANSLATIONS: Record<string, string> = {
  Employee: 'Сотрудник',
  Supervisor: 'Руководитель',
  Specialist: 'СПО',
  Admin: 'Администратор',
}

const getTranslatedRoles = (roles: string[] | undefined): string => {
  if (!roles?.length) return '—'
  return roles.map((r) => ROLE_TRANSLATIONS[r] || r).join('\n')
}

// === 🔹 Проверка прав через массив roles ===
const userRoles = computed(() => authStore.user?.roles?.map((r) => r.toLowerCase()) || [])

const isAdmin = computed(() =>
  userRoles.value.some((r) => ['admin', 'администратор', 'superuser'].includes(r)),
)
const isSPO = computed(() =>
  userRoles.value.some((r) => ['specialist', 'специалист по обучению'].includes(r)),
)
const isAdminOrSPO = computed(() => isAdmin.value || isSPO.value)

const isSupervisor = computed(() => {
  const hasSupervisorFlag = authStore.user?.is_supervisor === true
  const hasSupervisorRole = userRoles.value.some((r) => ['supervisor', 'руководитель'].includes(r))
  return hasSupervisorFlag || hasSupervisorRole
})

const isSupervisorWithDivision = computed(() => {
  return isSupervisor.value && authStore.user?.division_id != null
})

const supervisorDivisionId = computed(() => authStore.user?.division_id ?? null)
const supervisorDepartmentId = computed(() => authStore.user?.department_id ?? null)
const supervisorUserId = computed(() => authStore.user?.id ?? null)

// === Состояния ===
const loading = ref(false)
const search = ref('')
const filterDepartmentId = ref<number | null>(null)
const detailVisible = ref(false)
const registerVisible = ref(false)
const meetingDialogVisible = ref(false)
const selectedEmployee = ref<Employee | null>(null)
const userFullProfile = ref<any>(null)

const departments = ref<Department[]>([])
const availableRoles = ref<Role[]>([
  { id: 1, name: 'Employee', displayName: 'Сотрудник', isSupervisorRole: false },
  { id: 2, name: 'Supervisor', displayName: 'Руководитель', isSupervisorRole: true },
  { id: 3, name: 'Specialist', displayName: 'СПО', isSupervisorRole: false },
  { id: 4, name: 'Admin', displayName: 'Администратор', isSupervisorRole: false },
])
const availableProfiles = ref<Profile[]>([])
const employees = ref<Employee[]>([])
const allProfilesData = ref<Profile[]>([])

// 🔹 ID отделов направления (для руководителя с division_id)
const divisionDepartmentIds = ref<number[]>([])

// 🔹 Кэш профилей по отделам: { [deptId]: Profile[] }
const departmentProfilesCache = ref<Record<number, Profile[]>>({})

// === 🔹 Вычисляемые свойства ===
const showDepartmentFilter = computed(() => !isSupervisor.value || isSupervisorWithDivision.value)
const showDepartmentColumn = computed(() => !isSupervisor.value || isSupervisorWithDivision.value)
const canManageProfiles = computed(() => isAdminOrSPO.value || isSupervisor.value)

// 🔹 Редактирование основной информации (ФИО, email, должность, отдел) — ТОЛЬКО admin/SPO
const canEditEmployeeInfo = computed(() => isAdminOrSPO.value)

// 🔹 🔹 Редактирование роли — ТОЛЬКО admin (SPO не может менять роль)
const canEditRole = computed(() => isAdmin.value)

const availableDepartments = computed(() => {
  if (!isSupervisorWithDivision.value) return departments.value
  return departments.value.filter((dept) => divisionDepartmentIds.value.includes(dept.id))
})

// 🔹 Фильтрованные роли: исключаем "Руководитель" из списка для назначения
const filteredRoles = computed(() => {
  return availableRoles.value.filter((role) => {
    // 🔹 Исключаем роль "Руководитель" — она назначается другим путем
    if (role.isSupervisorRole || role.name === 'Supervisor') return false
    return true
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

  if (supervisorUserId.value) {
    result = result.filter((e) => e.userId !== supervisorUserId.value)
  }

  if (filterDepartmentId.value) {
    result = result.filter((e) => e.departmentId === filterDepartmentId.value)
  }

  return result
})

const userDepartmentName = computed(() => {
  if (!isSupervisor.value) return ''
  const deptId = authStore.user?.department_id
  return departments.value.find((d) => d.id === deptId)?.name || ''
})

const userDivisionName = computed(() => {
  if (!isSupervisorWithDivision.value) return ''
  return authStore.user?.managed_division_name || `Направление #${authStore.user?.division_id}`
})

// === 🔹 HTTP-запросы ===
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401) {
    authStore.logout()
    ElMessage.error('Сессия истекла. Пожалуйста, войдите снова.')
    return null
  }
  if (res.status === 403) {
    ElMessage.error('Недостаточно прав для выполнения этого действия')
    return null
  }
  return res
}

// === 🔹 Загрузка отделов ===
const fetchDepartments = async () => {
  try {
    if (isSupervisorWithDivision.value) {
      const res = await fetchWithAuth(`${API_BASE}/admin/divisions/departments`)
      if (!res) throw new Error('Auth error')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: DivisionWithDepartments[] = await res.json()

      const userDivision = data.find((div) => div.id === supervisorDivisionId.value)

      if (userDivision) {
        divisionDepartmentIds.value = userDivision.departments.map((d) => d.id)
        departments.value = userDivision.departments.map((d) => ({
          id: d.id,
          name: d.department_name || d.name || '',
          division_id: userDivision.id,
        }))
      } else {
        departments.value = []
        divisionDepartmentIds.value = []
      }
    } else {
      const res = await fetchWithAuth(`${API_BASE}/admin/departments/`)
      if (!res) throw new Error('Auth error')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      departments.value = Array.isArray(data)
        ? data.map((d: any) => ({
            id: d.id,
            name: d.department_name || d.name || '',
            division_id: d.division_id || null,
          }))
        : []
    }
  } catch (err) {
    console.error('Error fetching departments:', err)
    departments.value = []
    divisionDepartmentIds.value = []
  }
}

const fetchAvailableProfiles = async () => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/profiles/levels`)
    if (!res) throw new Error('Auth error')
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

// === 🔹 Загрузка профилей конкретного отдела ===
const fetchDepartmentProfiles = async (deptId: number): Promise<Profile[]> => {
  try {
    // Проверяем кэш
    if (departmentProfilesCache.value[deptId]) {
      return departmentProfilesCache.value[deptId]
    }

    const res = await fetchWithAuth(`${API_BASE}/admin/departments/${deptId}`)
    if (!res) throw new Error('Auth error')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    // Извлекаем профили из ответа
    const profiles: Profile[] = Array.isArray(data.profiles)
      ? data.profiles.map((p: any) => ({
          id: p.id,
          title: p.title || p.name || '',
          levels: [], // Загружаются отдельно через fetchAvailableProfiles
        }))
      : []

    // Сохраняем в кэш
    departmentProfilesCache.value[deptId] = profiles
    return profiles
  } catch (err) {
    console.error(`Error fetching profiles for department ${deptId}:`, err)
    return []
  }
}

// === 🔹 Загрузка сотрудников ===
const fetchEmployees = async () => {
  try {
    loading.value = true

    let url = `${API_BASE}/users/profiles/`
    const params = new URLSearchParams()

    let departmentIdsToFilter: number[] = []

    if (isSupervisorWithDivision.value) {
      if (divisionDepartmentIds.value.length > 0) {
        departmentIdsToFilter = [...divisionDepartmentIds.value]
      }
    } else if (isSupervisor.value && supervisorDepartmentId.value) {
      departmentIdsToFilter = [supervisorDepartmentId.value]
    }

    if (departmentIdsToFilter.length > 0) {
      departmentIdsToFilter.forEach((id) => params.append('departments_id', String(id)))
    }

    if (filterDepartmentId.value && !isSupervisor.value) {
      params.append('departments_id', String(filterDepartmentId.value))
    }

    const queryString = params.toString()
    if (queryString) url += `?${queryString}`

    const res = await fetchWithAuth(url)
    if (!res) throw new Error('Auth error')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    employees.value = Array.isArray(data)
      ? data.map((e: any): Employee => {
          const roles = Array.isArray(e.roles)
            ? e.roles.map((r: string) => r?.trim()).filter(Boolean)
            : e.role_name
              ? [e.role_name.trim()]
              : []

          let roleId: number | null = e.role_id ?? null
          let roleName = 'Не назначена'
          if (roleId) {
            const role = availableRoles.value.find((r) => r.id === roleId)
            if (role) roleName = role.displayName
          }

          const profileId = e.profile_id ?? null
          let profileLevel: string | null = null
          if (profileId) {
            const p = allProfilesData.value.find((pr) => pr.id === profileId)
            if (p?.levels?.[0]) {
              profileLevel = p.levels[0].name || p.levels[0].level_name || null
            }
          }

          return {
            id: e.user_id,
            userId: e.user_id,
            lastName: e.last_name || '',
            firstName: e.first_name || '',
            patronymic: e.patronymic || '',
            fullName: `${e.last_name || ''} ${e.first_name || ''} ${e.patronymic || ''}`.trim(),
            position: e.position || '',
            email: e.email || '',
            isSupervisor: e.is_supervisor ?? false,
            departmentId: e.department_id ?? null,
            departmentName: e.department_name || 'Не назначен',
            profileId,
            profileName: e.profile_title || 'Не назначен',
            profileLevel,
            progress: e.progress !== undefined && e.progress !== null ? Number(e.progress) : 0,
            totalCnt: e.total_cnt ?? 0,
            completedCnt: e.completed_cnt ?? 0,
            roleId,
            roleName,
            roles,
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

const fetchEmployeeProfile = async (userId: number): Promise<any | null> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/${userId}/profile/`)
    if (!res) return null
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error(`Error fetching profile for user ${userId}:`, err)
    return null
  }
}

// === 🔹 Действия ===
const applyFilters = () => {
  fetchEmployees()
}

const isPromotionAvailable = (employee: Employee) => {
  if (!employee?.progress || employee.progress < 100) return false
  if (!employee?.profileId) return false
  const profile = allProfilesData.value.find((p) => p.id === employee.profileId)
  if (!profile?.levels || profile.levels.length === 0) return false
  const currentLevelName = employee.profileLevel
  if (!currentLevelName) return !!profile.levels[0]
  const idx = profile.levels.findIndex(
    (l: any) => l.name === currentLevelName || l.level_name === currentLevelName,
  )
  return idx !== -1 && idx < profile.levels.length - 1
}

const viewEmployee = async (row: Employee) => {
  const freshEmployee = employees.value.find((e) => e.userId === row.userId)
  selectedEmployee.value = freshEmployee ? { ...freshEmployee } : { ...row }
  userFullProfile.value = null
  detailVisible.value = true

  if (selectedEmployee.value.profileId && selectedEmployee.value.userId) {
    const profileData = await fetchEmployeeProfile(selectedEmployee.value.userId)
    if (profileData && selectedEmployee.value) {
      selectedEmployee.value = {
        ...selectedEmployee.value,
        profileId: profileData.profile_id ?? profileData.id ?? selectedEmployee.value.profileId,
        profileName: profileData.title ?? selectedEmployee.value.profileName,
        progress: profileData.progress ?? selectedEmployee.value.progress,
      }
      userFullProfile.value = profileData
    }
  }
}

const resetUserFullProfile = () => {
  userFullProfile.value = null
}

const handleEmployeeUpdate = async (updatedData: any) => {
  // 🔹 Проверка прав на редактирование
  if (!canEditEmployeeInfo.value) {
    ElMessage.warning('У вас нет прав на редактирование данных сотрудника')
    return
  }

  // 🔹 Проверка: если меняется роль, но нет прав на это
  if (updatedData.roleId !== selectedEmployee.value?.roleId && !canEditRole.value) {
    ElMessage.warning('У вас нет прав на изменение роли сотрудника')
    return
  }

  try {
    const payload = {
      first_name: updatedData.firstName,
      last_name: updatedData.lastName,
      patronymic: updatedData.patronymic || '',
      email: updatedData.email,
      position: updatedData.position || '',
      role_id: updatedData.roleId || null,
      department_id: updatedData.departmentId || null,
    }
    const res = await fetchWithAuth(`${API_BASE}/users/${updatedData.userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    if (!res) throw new Error('Auth error')
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail?.[0]?.msg || err.detail || `HTTP ${res.status}`)
    }

    const responseData = await res.json()
    const idx = employees.value.findIndex((e) => e.userId === updatedData.userId)
    if (idx !== -1) {
      let roleName = 'Не назначена'
      if (responseData.role_id) {
        const found = availableRoles.value.find((r) => r.id === responseData.role_id)
        roleName = found?.displayName || responseData.role_name || 'Не назначена'
      }
      employees.value[idx] = {
        ...employees.value[idx],
        firstName: responseData.first_name,
        lastName: responseData.last_name,
        patronymic: responseData.patronymic,
        email: responseData.email,
        position: responseData.position || '',
        departmentId: responseData.department_id,
        departmentName: responseData.department_name,
        roleId: responseData.role_id,
        roleName,
        fullName:
          `${responseData.last_name} ${responseData.first_name} ${responseData.patronymic || ''}`.trim(),
        roles: Array.isArray(responseData.roles)
          ? responseData.roles.map((r: string) => r?.trim()).filter(Boolean)
          : employees.value[idx].roles,
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

const handleAssignProfile = async (userId: number, profileId: number) => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/profiles/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, profile_id: profileId }),
    })
    if (!res) throw new Error('Auth error')
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const msg = Array.isArray(errData.detail)
        ? errData.detail.map((d: any) => d.msg).join('\n')
        : typeof errData.detail === 'string'
          ? errData.detail
          : `HTTP ${res.status}`
      throw new Error(msg)
    }
    await fetchEmployees()
    ElMessage.success('Профиль успешно назначен')
  } catch (err: any) {
    console.error('Error assigning profile:', err)
    ElMessage.error(err.message || 'Не удалось назначить профиль')
  }
}

const handlePromoteEmployee = async (employee: Employee, nextLevel: any) => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/${employee.userId}/profile/grade-up`, {
      method: 'POST',
    })
    if (!res) throw new Error('Auth error')
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    await fetchEmployees()
    if (selectedEmployee.value?.userId === employee.userId) {
      selectedEmployee.value = {
        ...selectedEmployee.value,
        profileLevel: nextLevel.name,
        progress: 0,
      }
    }
    ElMessage.success(`Сотрудник повышен до уровня "${nextLevel.name}"`)
  } catch (err: any) {
    console.error('Error promoting employee:', err)
    ElMessage.error(err.message || 'Ошибка при повышении')
  }
}

const handleUnlinkProfile = async (userId: number) => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/${userId}/profile`, {
      method: 'DELETE',
    })

    if (!res) throw new Error('Auth error')
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }

    await fetchEmployees()

    if (selectedEmployee.value?.userId === userId) {
      selectedEmployee.value = {
        ...selectedEmployee.value,
        profileId: null,
        profileName: 'Не назначен',
        profileLevel: null,
        progress: 0,
      }
      userFullProfile.value = null
    }

    ElMessage.success('Профиль успешно отвязан')
  } catch (err: any) {
    console.error('Error unlinking profile:', err)
    ElMessage.error(err.message || 'Не удалось отвязать профиль')
  }
}

const handleRegistration = async () => {
  try {
    await fetchEmployees()
  } catch (err) {
    console.error('Failed to refresh employees after registration:', err)
    ElMessage.warning('Сотрудник зарегистрирован, но список не обновился.')
  }
}

const openRegisterModal = () => {
  registerVisible.value = true
}

const openMeetingDialog = () => {
  meetingDialogVisible.value = true
}

// === 🔹 Watchers и Lifecycle ===
watch(
  () => detailVisible.value,
  (val) => {
    if (!val) resetUserFullProfile()
  },
)

watch(
  () => filterDepartmentId.value,
  () => {
    if (showDepartmentFilter.value) {
      fetchEmployees()
    }
  },
)

onMounted(async () => {
  try {
    await fetchDepartments()
    await fetchAvailableProfiles()
    await fetchEmployees()
  } catch (e) {
    console.error('Failed to load initial data:', e)
  }
})

defineExpose({
  fetchEmployees,
  reload: fetchEmployees,
})
</script>

<style scoped>
/* Стили без изменений — см. предыдущую версию */
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
  color: var(--text);
}
.department-subtitle {
  font-size: 16px;
  color: var(--gray);
  font-weight: var(--font-weight-medium);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
.division-badge {
  font-size: 14px;
  color: var(--primary);
  font-weight: var(--font-weight-semibold);
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
  white-space: pre-line;
}
.roles-cell {
  white-space: pre-line;
  line-height: 1.4;
  font-size: 13px;
  color: var(--text);
  display: block;
}
.profile-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.profile-name {
  font-weight: normal;
  color: var(--text);
  font-size: 14px;
}
.profile-level {
  font-size: 14px;
  color: var(--gray);
}
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.progress-percent {
  font-size: 14px !important;
  color: var(--gray);
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
