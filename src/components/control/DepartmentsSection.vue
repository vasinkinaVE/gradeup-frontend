<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление отделами</h2>
      <el-button
        type="primary"
        class="btn-create-dept"
        @click="openDepartmentDialog()"
        :loading="loading"
      >
        <el-icon><Plus /></el-icon>
        Создать отдел
      </el-button>
    </div>

    <div class="filters-row">
      <el-input
        v-model="departmentSearch"
        placeholder="Поиск по названию отдела"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <el-table
      :data="filteredDepartments"
      stripe
      border
      class="data-table"
      @row-click="viewDepartment"
      v-loading="loading"
      :empty-text="loading ? 'Загрузка...' : 'Нет отделов'"
    >
      <el-table-column prop="name" label="Название отдела" min-width="250" />
      <el-table-column label="Руководитель" min-width="200">
        <template #default="{ row }">
          {{
            row.supervisor
              ? `${row.supervisor.last_name} ${row.supervisor.first_name} ${row.supervisor.patronymic || ''}`.trim()
              : '—'
          }}
        </template>
      </el-table-column>
      <el-table-column label="Профилей" width="100" align="center">
        <template #default="{ row }">
          {{ row.profiles?.length || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="description" label="Описание" min-width="250" show-overflow-tooltip />
    </el-table>

    <el-dialog
      v-model="viewDepartmentVisible"
      title="Просмотр отдела"
      width="90%"
      :style="{ maxWidth: '700px' }"
      class="admin-dialog"
      destroy-on-close
      align-center
    >
      <div v-if="viewingDepartment" class="view-content" v-loading="viewLoading">
        <div class="view-row">
          <div class="view-label">Название отдела</div>
          <div class="view-value">{{ viewingDepartment.name }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Описание</div>
          <div class="view-value">{{ viewingDepartment.description || '—' }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Руководитель</div>
          <div class="view-value">
            <div v-if="viewingDepartment.supervisor" class="supervisor-info">
              <span>
                {{
                  `${viewingDepartment.supervisor.last_name} ${viewingDepartment.supervisor.first_name} ${viewingDepartment.supervisor.patronymic || ''}`.trim()
                }}
              </span>
            </div>
            <span v-else>—</span>
          </div>
        </div>

        <div class="view-row">
          <div class="view-label">Доступные профили</div>
          <div class="view-value">
            <div v-if="viewingDepartment.profiles?.length" class="profiles-list">
              <el-tag
                v-for="profile in viewingDepartment.profiles"
                :key="profile.id"
                size="small"
                class="profile-tag"
              >
                {{ profile.title }}
              </el-tag>
            </div>
            <span v-else>Профили не добавлены</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button
          class="btn-edit-dept"
          :icon="Edit"
          @click="handleEditDepartment"
          :loading="actionLoading"
          >Редактировать</el-button
        >
        <el-button
          type="danger"
          :icon="Delete"
          @click="confirmDeleteDepartment"
          :loading="actionLoading"
          >Удалить</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      v-model="departmentDialogVisible"
      :title="editingDepartment ? 'Редактирование отдела' : 'Новый отдел'"
      width="95%"
      :style="{ maxWidth: '700px' }"
      class="admin-dialog"
      destroy-on-close
      @open="onDialogOpen"
      align-center
    >
      <el-form :model="departmentForm" label-position="top" v-loading="actionLoading">
        <el-form-item label="Название отдела *" prop="name">
          <el-input v-model="departmentForm.name" placeholder="Например: Отдел разработки" />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="departmentForm.description"
            type="textarea"
            :rows="2"
            placeholder="Краткое описание отдела"
          />
        </el-form-item>

        <el-form-item
          v-if="editingDepartment && canManageSupervisor"
          label="Руководитель"
          prop="supervisor_id"
        >
          <el-select
            v-model="departmentForm.supervisor_id"
            placeholder="Выберите руководителя"
            clearable
            filterable
            style="width: 100%"
            :loading="supervisorsLoading"
          >
            <el-option
              v-for="emp in availableSupervisors"
              :key="emp.id"
              :label="`${emp.last_name} ${emp.first_name} ${emp.patronymic || ''}`.trim()"
              :value="emp.id"
            >
              <span>{{ `${emp.last_name} ${emp.first_name} ${emp.patronymic || ''}`.trim() }}</span>
            </el-option>
          </el-select>

          <el-button
            v-if="editingDepartment && canManageSupervisor && departmentForm.supervisor_id"
            type="danger"
            size="small"
            @click="confirmUnlinkSupervisorInEdit"
            :loading="actionLoading"
            style="margin-top: 8px"
          >
            <el-icon><Remove /></el-icon>
            Отвязать руководителя
          </el-button>
        </el-form-item>

        <el-form-item label="Доступные профили" prop="profiles">
          <el-select
            v-model="departmentForm.profiles"
            placeholder="Выберите профили"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            :max-collapse-tags="3"
            style="width: 100%"
          >
            <el-option
              v-for="profile in allProfiles"
              :key="profile.id"
              :label="profile.title"
              :value="profile.id"
            >
              <span>{{ profile.title }}</span>
              <span v-if="profile.description" class="option-desc">
                — {{ profile.description }}</span
              >
            </el-option>
          </el-select>
          <div class="form-hint">Профили, которые могут быть назначены в этом отделе</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button
          class="btn-cancel-dept"
          @click="departmentDialogVisible = false"
          :disabled="actionLoading"
          >Отмена</el-button
        >
        <el-button
          class="btn-save-dept"
          type="primary"
          @click="saveDepartment"
          :loading="actionLoading"
          >Сохранить</el-button
        >
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Edit, Search, Remove } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  departments: {
    type: Array,
    required: true,
  },
  allProfiles: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:departments', 'refresh'])

const authStore = useAuthStore()
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const isAdmin = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('admin') || role.includes('администратор')
})

const canManageSupervisor = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('admin') || role.includes('администратор')
})

const departmentSearch = ref('')

const filteredDepartments = computed(() => {
  if (!departmentSearch.value) return props.departments || []
  const q = departmentSearch.value.toLowerCase()
  return (props.departments || []).filter(
    (d) => d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
  )
})

const departmentDialogVisible = ref(false)
const viewDepartmentVisible = ref(false)
const viewLoading = ref(false)
const actionLoading = ref(false)
const supervisorsLoading = ref(false)

const editingDepartment = ref(null)
const viewingDepartment = ref(null)

const departmentEmployees = ref([])

const departmentForm = ref({
  name: '',
  description: '',
  supervisor_id: null,
  profiles: [],
})

const availableSupervisors = computed(() => {
  return departmentEmployees.value.filter((emp) => emp.id && emp.first_name && emp.last_name)
})

const fetchDepartmentEmployees = async (departmentId) => {
  if (!departmentId) {
    departmentEmployees.value = []
    return
  }

  try {
    supervisorsLoading.value = true
    const params = new URLSearchParams()
    params.append('departments_id', departmentId)

    const res = await fetch(`${API_BASE}/users/?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    departmentEmployees.value = data.map((emp) => ({
      id: emp.id,
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      patronymic: emp.patronymic || '',
    }))

    console.log(
      `✅ Loaded ${departmentEmployees.value.length} employees for department ${departmentId}`,
    )
  } catch (err) {
    console.error('Error fetching department employees:', err)
    ElMessage.warning('Не удалось загрузить сотрудников отдела')
    departmentEmployees.value = []
  } finally {
    supervisorsLoading.value = false
  }
}

const normalizeDepartmentFromBackend = (backendDept) => {
  if (!backendDept) return null

  let data = backendDept
  if (typeof backendDept === 'string') {
    try {
      data = JSON.parse(backendDept)
    } catch {
      return null
    }
  }

  return {
    id: data.id,
    name: data.department_name || data.name || '',
    description: data.description || '',
    supervisor_id: data.supervisor_id || data.supervisor?.id || null,
    supervisor: data.supervisor || null,
    profiles: Array.isArray(data.profiles)
      ? data.profiles.map((p) =>
          typeof p === 'object' ? { id: p.id, title: p.title } : { id: p, title: '' },
        )
      : [],
  }
}

const prepareDepartmentForCreate = (frontendDept) => {
  return {
    department_name: frontendDept.name || frontendDept.department_name || '',
    description: frontendDept.description || '',
    supervisor_id: frontendDept.supervisor_id || null,
    profiles: frontendDept.profiles || [],
  }
}

const prepareDepartmentForUpdate = (frontendDept) => {
  return {
    department_name: frontendDept.name || frontendDept.department_name || '',
    description: frontendDept.description || '',
    supervisor_id: frontendDept.supervisor_id || null,
  }
}

const prepareProfilesForUpdate = (profileIds) => {
  return {
    profiles: Array.isArray(profileIds) ? profileIds : [],
  }
}

const fetchDepartments = async () => {
  try {
    emit('refresh')
    const res = await fetch(`${API_BASE}/admin/departments/profiles`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()

    const normalized = Array.isArray(data) ? data.map(normalizeDepartmentFromBackend) : []

    emit('update:departments', normalized)
    return normalized
  } catch (err) {
    console.error('Error fetching departments:', err)
    ElMessage.error('Не удалось загрузить отделы')
    emit('update:departments', [])
    return []
  }
}

const fetchDepartmentById = async (departmentId) => {
  try {
    const res = await fetch(`${API_BASE}/admin/departments/${departmentId}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()
    return normalizeDepartmentFromBackend(data)
  } catch (err) {
    console.error('Error fetching department:', err)
    ElMessage.error('Не удалось загрузить отдел')
    return null
  }
}

const createDepartment = async (departmentData) => {
  try {
    const payload = prepareDepartmentForCreate(departmentData)

    const res = await fetch(`${API_BASE}/admin/departments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail?.[0]?.msg || err.detail || `HTTP ${res.status}`)
    }

    return await res.json()
  } catch (error) {
    console.error('Error creating department:', error)
    throw error
  }
}

const updateDepartment = async (departmentId, departmentData) => {
  try {
    const payload = prepareDepartmentForUpdate(departmentData)

    const res = await fetch(`${API_BASE}/admin/departments/${departmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail?.[0]?.msg || err.detail || `HTTP ${res.status}`)
    }

    return await res.json()
  } catch (error) {
    console.error('Error updating department:', error)
    throw error
  }
}

const updateDepartmentProfiles = async (departmentId, profileIds) => {
  try {
    const payload = prepareProfilesForUpdate(profileIds)

    const res = await fetch(`${API_BASE}/admin/departments/${departmentId}/profiles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail?.[0]?.msg || err.detail || `HTTP ${res.status}`)
    }

    return await res.json()
  } catch (error) {
    console.error('Error updating department profiles:', error)
    throw error
  }
}

const deleteDepartment = async (departmentId) => {
  try {
    const res = await fetch(`${API_BASE}/admin/departments/${departmentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }

    return await res.json()
  } catch (error) {
    console.error('Error deleting department:', error)
    throw error
  }
}

const unlinkSupervisor = async (departmentId) => {
  try {
    const res = await fetch(`${API_BASE}/admin/departments/${departmentId}/supervisor`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }

    return await res.json()
  } catch (error) {
    console.error('Error unlinking supervisor:', error)
    throw error
  }
}

const viewDepartment = async (department) => {
  try {
    viewLoading.value = true
    const fullDept = await fetchDepartmentById(department.id)
    if (fullDept) {
      viewingDepartment.value = fullDept
    } else {
      viewingDepartment.value = normalizeDepartmentFromBackend(department)
    }
    viewDepartmentVisible.value = true
  } catch (err) {
    console.error('Error viewing department:', err)
    ElMessage.error('Не удалось загрузить отдел')
    viewingDepartment.value = normalizeDepartmentFromBackend(department)
    viewDepartmentVisible.value = true
  } finally {
    viewLoading.value = false
  }
}

const handleEditDepartment = () => {
  if (viewingDepartment.value) {
    openDepartmentDialog(viewingDepartment.value)
  }
  viewDepartmentVisible.value = false
}

const confirmDeleteDepartment = async () => {
  if (!viewingDepartment.value?.id) return
  try {
    await ElMessageBox.confirm(
      `Удалить отдел "${viewingDepartment.value.name}"?`,
      'Подтверждение',
      {
        type: 'warning',
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
      },
    )
    actionLoading.value = true
    emit('refresh')
    await deleteDepartment(viewingDepartment.value.id)
    ElMessage.success('Отдел удалён')
    await fetchDepartments()
    viewDepartmentVisible.value = false
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Error deleting department:', err)
      ElMessage.error(err.message || 'Ошибка при удалении отдела')
    }
  } finally {
    actionLoading.value = false
  }
}

const confirmUnlinkSupervisorInEdit = async () => {
  if (!editingDepartment.value?.id) return
  try {
    await ElMessageBox.confirm(
      `Открепить руководителя от отдела "${editingDepartment.value.name}"?`,
      'Подтверждение',
      {
        type: 'warning',
        confirmButtonText: 'Отвязать',
        cancelButtonText: 'Отмена',
      },
    )
    actionLoading.value = true
    await unlinkSupervisor(editingDepartment.value.id)
    ElMessage.success('Руководитель отвязан')

    departmentForm.value.supervisor_id = null

    const updated = await fetchDepartmentById(editingDepartment.value.id)
    if (updated) {
      if (viewingDepartment.value?.id === updated.id) {
        viewingDepartment.value = updated
      }
      const idx = props.departments.findIndex((d) => d.id === updated.id)
      if (idx !== -1) {
        const newDepts = [...props.departments]
        newDepts[idx] = updated
        emit('update:departments', newDepts)
      }
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Error unlinking supervisor in edit:', err)
      ElMessage.error(err.message || 'Ошибка при отвязке руководителя')
    }
  } finally {
    actionLoading.value = false
  }
}

const confirmUnlinkSupervisor = async () => {
  if (!viewingDepartment.value?.id) return
  handleEditDepartment()
  ElMessage.info('Перейдите в режим редактирования для управления руководителем')
}

const onDialogOpen = () => {
  if (editingDepartment.value?.id) {
    fetchDepartmentEmployees(editingDepartment.value.id)
  } else {
    departmentEmployees.value = []
  }
}

const openDepartmentDialog = (department = null) => {
  if (department) {
    editingDepartment.value = department
    const normalized = normalizeDepartmentFromBackend(department)
    departmentForm.value = {
      name: normalized.name || '',
      description: normalized.description || '',
      supervisor_id: normalized.supervisor_id || null,
      profiles: normalized.profiles?.map((p) => p.id) || [],
    }
  } else {
    editingDepartment.value = null
    departmentForm.value = {
      name: '',
      description: '',
      supervisor_id: null,
      profiles: [],
    }
  }
  departmentDialogVisible.value = true
}

const saveDepartment = async () => {
  if (!departmentForm.value.name?.trim()) {
    return ElMessage.warning('Введите название отдела')
  }

  try {
    actionLoading.value = true
    emit('refresh')

    const isUpdate = !!editingDepartment.value?.id

    if (isUpdate) {
      await updateDepartment(editingDepartment.value.id, departmentForm.value)
      await updateDepartmentProfiles(editingDepartment.value.id, departmentForm.value.profiles)
      ElMessage.success('Отдел обновлён')
    } else {
      await createDepartment(departmentForm.value)
      ElMessage.success('Отдел создан')
    }

    await fetchDepartments()
    departmentDialogVisible.value = false
  } catch (err) {
    console.error('Error saving department:', err)
    ElMessage.error(err.message || 'Ошибка сохранения отдела')
  } finally {
    actionLoading.value = false
  }
}

const reload = async () => {
  await fetchDepartments()
}

defineExpose({
  reload,
  fetchDepartments,
})
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}

.filters-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.data-table {
  width: 100%;
  margin-bottom: var(--spacing-md);
  cursor: pointer;
}

.data-table :deep(.el-table__row) {
  cursor: pointer;
}

.data-table :deep(.el-table__row:hover) {
  background-color: var(--background);
}

:deep(.data-table.el-table),
:deep(.data-table .el-table__body-wrapper) {
  overflow-x: auto;
}

:deep(.data-table .el-table__body tr > td:first-child),
:deep(.data-table .el-table__header tr > th:first-child) {
  position: sticky;
  left: 0;
  z-index: 10;
  background: #fff;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05);
}

:deep(.data-table .el-table__body tr:hover > td:first-child) {
  background: #f5f7fa !important;
}
:deep(.data-table .el-table__body tr.el-table__row--striped:hover > td:first-child) {
  background: #fafafa !important;
}

:deep(.data-table .el-table__header tr > th:first-child) {
  background: #fafafa;
}

:deep(.admin-dialog .el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}

:deep(.admin-dialog .el-form-item__label) {
  font-weight: var(--font-weight-medium);
}

.form-hint {
  font-size: 12px;
  color: var(--gray);
  margin-top: 4px;
}

.option-desc {
  color: var(--gray);
  font-size: 12px;
}

.view-content {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}

.view-row {
  margin-bottom: var(--spacing-md);
}

.view-label {
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin-bottom: var(--spacing-xs);
  font-size: 14px;
}

.view-value {
  font-size: 14px;
  color: var(--text);
  line-height: 1.6;
}

.supervisor-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.unlink-btn {
  font-size: 12px;
  padding: 0;
}

.profiles-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.profile-tag {
  margin: 2px 0;
}

:deep(.admin-dialog .el-dialog) {
  margin: 0 auto !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

:deep(.admin-dialog .el-dialog__body) {
  overflow-y: auto;
  flex: 1;
}

@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .supervisor-info {
    flex-direction: column;
    align-items: flex-start;
  }

  :deep(.admin-dialog .el-dialog) {
    width: 95% !important;
    max-width: 95vw !important;
  }

  :deep(.admin-dialog .el-dialog__header),
  :deep(.admin-dialog .el-dialog__body),
  :deep(.admin-dialog .el-dialog__footer) {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  :deep(.admin-dialog .el-dialog__title) {
    font-size: 16px;
  }

  .view-content {
    max-height: 70vh;
  }
}

@media (max-width: 480px) {
  :deep(.admin-dialog .el-dialog) {
    width: 98% !important;
  }

  :deep(.admin-dialog .el-dialog__header),
  :deep(.admin-dialog .el-dialog__body),
  :deep(.admin-dialog .el-dialog__footer) {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  :deep(.admin-dialog .el-dialog__title) {
    font-size: 15px;
  }
}

@media (max-width: 420px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .section-header h2 {
    font-size: 18px;
  }

  .section-header .el-button {
    align-self: flex-end;
    width: auto;
  }
}
</style>

<style>
.btn-create-dept.el-button--primary {
  background-color: #4a2c6d !important;
  border-color: #4a2c6d !important;
  color: #fff !important;
}
.btn-create-dept.el-button--primary:hover {
  background-color: #3a2255 !important;
  border-color: #3a2255 !important;
  color: #fff !important;
}
.btn-create-dept.el-button--primary:active {
  background-color: #2d1a42 !important;
  border-color: #2d1a42 !important;
}

.btn-save-dept.el-button--primary {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #fff !important;
}
.btn-save-dept.el-button--primary:hover {
  background-color: #5daf34 !important;
  border-color: #5daf34 !important;
  color: #fff !important;
}
.btn-save-dept.el-button--primary:active {
  background-color: #53a32f !important;
  border-color: #53a32f !important;
}

.btn-cancel-dept.el-button {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
.btn-cancel-dept.el-button:hover {
  background-color: #e8e8e8 !important;
  border-color: #c0c4cc !important;
  color: #606266 !important;
}

.btn-edit-dept.el-button {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
.btn-edit-dept.el-button:hover {
  background-color: #e8e8e8 !important;
  border-color: #c0c4cc !important;
  color: #606266 !important;
}
</style>
