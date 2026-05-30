<!-- src/views/admin_and_spo/EmployeesView.vue -->
<template>
  <div class="employees-view">
    <header class="view-header">
      <div>
        <h1>Управление сотрудниками</h1>
        <!-- ✅ ИСПРАВЛЕНО: единое вычисляемое свойство для названия орг. единицы -->
        <div v-if="isSupervisor && userOrgUnitName" class="department-subtitle">
          {{ userOrgUnitName }}
        </div>
      </div>
      <div class="header-actions">
        <el-button v-if="isAdminOrSPO" type="primary" @click="openRegisterModal">
          <el-icon><Plus /></el-icon> Зарегистрировать сотрудника
        </el-button>
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
      <el-table-column label="Роли" width="150">
        <template #default="{ row }">
          <span class="roles-cell">{{ getTranslatedRoles(row.roles) }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="canPromoteEmployees" label="Повышение" width="150">
        <template #default="{ row }">
          <el-tag :type="isPromotionAvailable(row) ? 'success' : 'info'" size="small">
            {{ isPromotionAvailable(row) ? 'Доступно' : 'Не доступно' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

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
      :can-assign-profile="canAssignProfiles"
      :can-promote-employees="canPromoteEmployees"
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

interface Department {
  id: number
  name: string
  division_id?: number | null
}
interface DivisionData {
  id: number
  division_name: string
  departments: Array<{
    id: number
    department_name: string
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
  description?: string
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
  readyGradeup: boolean
}

const authStore = useAuthStore()
const API_BASE = import.meta.env.VITE_API_URL || '/api'

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
  return isSupervisor.value && authStore.user?.managed_division_id != null
})

const supervisorDivisionId = computed(() => authStore.user?.managed_division_id ?? null)
const supervisorDepartmentId = computed(() => authStore.user?.department_id ?? null)
const supervisorUserId = computed(() => authStore.user?.id ?? null)

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

const divisionDepartmentIds = ref<number[]>([])
const departmentProfilesCache = ref<Record<number, Profile[]>>({})

const showDepartmentFilter = computed(() => !isSupervisor.value || isSupervisorWithDivision.value)
const showDepartmentColumn = computed(() => !isSupervisor.value || isSupervisorWithDivision.value)

const canAssignProfiles = computed(() => isAdmin.value || isSupervisor.value)
const canPromoteEmployees = computed(() => isAdmin.value || isSupervisor.value)
const canManageProfiles = computed(() => canAssignProfiles.value || canPromoteEmployees.value)
const canEditEmployeeInfo = computed(() => isAdminOrSPO.value)
const canEditRole = computed(() => isAdmin.value)

const availableDepartments = computed(() => {
  if (!isSupervisorWithDivision.value) return departments.value
  return departments.value.filter((dept) => divisionDepartmentIds.value.includes(dept.id))
})

const filteredRoles = computed(() => {
  return availableRoles.value.filter((role) => {
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

// ✅ ИСПРАВЛЕНО: единое вычисляемое свойство для названия орг. единицы
const userOrgUnitName = computed(() => {
  if (!isSupervisor.value) return ''

  // Для руководителя направления — показываем название направления
  if (isSupervisorWithDivision.value) {
    return (
      authStore.user?.managed_division_name || `Направление #${authStore.user?.managed_division_id}`
    )
  }

  // Для руководителя отдела — показываем название отдела
  const deptId = authStore.user?.department_id
  return departments.value.find((d) => d.id === deptId)?.name || ''
})

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

const fetchDepartments = async () => {
  try {
    if (isSupervisorWithDivision.value && supervisorDivisionId.value) {
      const res = await fetchWithAuth(`${API_BASE}/admin/divisions/${supervisorDivisionId.value}`)
      if (!res) throw new Error('Auth error')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: DivisionData = await res.json()

      divisionDepartmentIds.value = data.departments.map((d) => d.id)
      departments.value = data.departments.map((d) => ({
        id: d.id,
        name: d.department_name || d.name || '',
        division_id: data.id,
      }))
    } else if (isSupervisor.value) {
      if (supervisorDepartmentId.value) {
        departments.value = [
          {
            id: supervisorDepartmentId.value,
            name: authStore.user?.department_name || 'Отдел',
            division_id: null,
          },
        ]
        divisionDepartmentIds.value = [supervisorDepartmentId.value]
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

const fetchAvailableProfiles = async (departmentIds?: number[]) => {
  try {
    let url = `${API_BASE}/profiles/levels`

    if (departmentIds && departmentIds.length > 0) {
      const params = new URLSearchParams()
      departmentIds.forEach((id) => params.append('departments_id', String(id)))
      url += `?${params.toString()}`
    }

    const res = await fetchWithAuth(url)
    if (!res) throw new Error('Auth error')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    const profiles: Profile[] = Array.isArray(data)
      ? data.map((p: any) => ({
          id: p.id,
          title: p.title || p.name || '',
          description: p.description || '',
          levels: p.levels || [],
        }))
      : []

    availableProfiles.value = profiles
    allProfilesData.value = profiles
  } catch (err) {
    console.error('Error fetching profiles:', err)
    availableProfiles.value = []
    allProfilesData.value = []
  }
}

const fetchDepartmentProfiles = async (deptId: number): Promise<Profile[]> => {
  try {
    if (departmentProfilesCache.value[deptId]) {
      return departmentProfilesCache.value[deptId]
    }

    const res = await fetchWithAuth(`${API_BASE}/profiles/levels?departments_id=${deptId}`)
    if (!res) throw new Error('Auth error')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    const profiles: Profile[] = Array.isArray(data)
      ? data.map((p: any) => ({
          id: p.id,
          title: p.title || p.name || '',
          description: p.description || '',
          levels: p.levels || [],
        }))
      : []

    departmentProfilesCache.value[deptId] = profiles
    return profiles
  } catch (err) {
    console.error(`Error fetching profiles for department ${deptId}:`, err)
    return []
  }
}

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
          const rawId = e.id || e.user_id
          const userId = rawId != null ? Number(rawId) : 0

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
              profileLevel = p.levels[0].level_name || p.levels[0].name || null
            }
          }

          return {
            id: userId,
            userId: userId,
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
            profileName: e.title || 'Не назначен',
            profileLevel: e.level_name || null,
            progress: e.progress !== undefined && e.progress !== null ? Number(e.progress) : 0,
            totalCnt: e.total_cnt ?? 0,
            completedCnt: e.completed_cnt ?? 0,
            roleId,
            roleName,
            roles,
            readyGradeup: e.ready_gradeup ?? false,
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

const applyFilters = () => {
  fetchEmployees()
}

const isPromotionAvailable = (employee: Employee) => {
  return employee?.readyGradeup === true
}

const viewEmployee = async (row: Employee) => {
  selectedEmployee.value = { ...row }
  userFullProfile.value = null
  detailVisible.value = true

  if (selectedEmployee.value.profileId && selectedEmployee.value.userId) {
    const profileData = await fetchEmployeeProfile(selectedEmployee.value.userId)
    if (profileData && selectedEmployee.value) {
      selectedEmployee.value = {
        ...selectedEmployee.value,
        profileId: profileData.profile_id ?? profileData.id ?? selectedEmployee.value.profileId,
        profileName: profileData.title ?? selectedEmployee.value.profileName,
        progress: profileData.profile_progress ?? selectedEmployee.value.progress,
      }
      userFullProfile.value = profileData
    }
  }
}

const resetUserFullProfile = () => {
  userFullProfile.value = null
}

const handleEmployeeUpdate = async (updatedData: any) => {
  console.log('handleEmployeeUpdate called with:', updatedData)

  if (!canEditEmployeeInfo.value) {
    ElMessage.warning('У вас нет прав на редактирование данных сотрудника')
    return
  }

  if (updatedData.roleId !== selectedEmployee.value?.roleId && !canEditRole.value) {
    ElMessage.warning('У вас нет прав на изменение роли сотрудника')
    return
  }

  const userId = Number(updatedData.userId)
  if (!userId || isNaN(userId)) {
    console.error('Invalid userId:', updatedData.userId)
    ElMessage.error('Ошибка: некорректный ID сотрудника')
    return
  }

  try {
    const payload: any = {
      first_name: updatedData.firstName,
      last_name: updatedData.lastName,
      patronymic: updatedData.patronymic || '',
      email: updatedData.email,
      position: updatedData.position || '',
    }

    if (
      updatedData.role_id !== undefined &&
      updatedData.role_id !== null &&
      updatedData.role_id !== ''
    ) {
      const roleIdNum = Number(updatedData.role_id)
      if (!isNaN(roleIdNum)) {
        payload.role_id = roleIdNum
      }
    }

    if (
      updatedData.department_id !== undefined &&
      updatedData.department_id !== null &&
      updatedData.department_id !== ''
    ) {
      const deptIdNum = Number(updatedData.department_id)
      if (!isNaN(deptIdNum)) {
        payload.department_id = deptIdNum
      }
    }

    console.log(`PATCH /users/${userId} with payload:`, payload)

    const res = await fetchWithAuth(`${API_BASE}/users/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    if (!res) throw new Error('Auth error')
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Server error:', err)
      throw new Error(err.detail?.[0]?.msg || err.detail || `HTTP ${res.status}`)
    }

    const responseData = await res.json()
    console.log('Server response:', responseData)

    const idx = employees.value.findIndex((e) => e.userId === userId)
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
        readyGradeup: responseData.ready_gradeup ?? employees.value[idx].readyGradeup,
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
  console.log('Assigning profile:', { userId, profileId })

  if (!canAssignProfiles.value) {
    ElMessage.warning('У вас нет прав на назначение профиля')
    return
  }

  try {
    const userIdNum = Number(userId)
    const profileIdNum = Number(profileId)

    if (isNaN(userIdNum) || isNaN(profileIdNum)) {
      throw new Error('Некорректные ID пользователя или профиля')
    }

    const res = await fetchWithAuth(`${API_BASE}/users/profiles/`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: userIdNum,
        profile_id: profileIdNum,
      }),
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

    ElMessage.success('Профиль успешно назначен')

    await fetchEmployees()

    const updatedEmployee = employees.value.find((e) => e.userId === userIdNum)
    if (updatedEmployee && selectedEmployee.value?.userId === userIdNum) {
      if (updatedEmployee.profileId) {
        const profileData = await fetchEmployeeProfile(userIdNum)
        if (profileData) {
          selectedEmployee.value = {
            ...updatedEmployee,
            profileId: profileData.profile_id ?? profileData.id ?? updatedEmployee.profileId,
            profileName: profileData.title ?? updatedEmployee.profileName,
            progress: profileData.profile_progress ?? updatedEmployee.progress,
          }
          userFullProfile.value = profileData
        }
      } else {
        selectedEmployee.value = { ...updatedEmployee }
        userFullProfile.value = null
      }
    }
  } catch (err: any) {
    console.error('Error assigning profile:', err)
    ElMessage.error(err.message || 'Не удалось назначить профиль')
  }
}

const handlePromoteEmployee = async (employee: Employee, nextLevel: any) => {
  if (!canPromoteEmployees.value) {
    ElMessage.warning('У вас нет прав на повышение сотрудника')
    return
  }

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
        profileLevel: nextLevel.level_name || nextLevel.name,
        progress: 0,
      }
    }
    ElMessage.success(`Сотрудник повышен до уровня "${nextLevel.level_name || nextLevel.name}"`)
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
        readyGradeup: false,
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

    if (
      isSupervisorWithDivision.value &&
      supervisorDivisionId.value &&
      divisionDepartmentIds.value.length > 0
    ) {
      console.log('Loading profiles for division departments:', divisionDepartmentIds.value)
      await fetchAvailableProfiles(divisionDepartmentIds.value)
      console.log('Loaded profiles:', availableProfiles.value.length)
    } else if (isSupervisor.value && supervisorDepartmentId.value) {
      await fetchAvailableProfiles([supervisorDepartmentId.value])
    } else {
      await fetchAvailableProfiles()
    }

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
