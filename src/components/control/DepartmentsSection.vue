<!-- src/components/control/DepartmentsSection.vue -->
<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление отделами</h2>
      <el-button type="primary" @click="openDepartmentDialog()" :loading="loading">
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
      :width="600"
      class="admin-dialog"
      destroy-on-close
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
              <el-button
                v-if="isAdmin"
                type="danger"
                link
                size="small"
                @click="confirmUnlinkSupervisor"
                :loading="actionLoading"
                class="unlink-btn"
              >
                Отвязать
              </el-button>
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
        <el-button :icon="Edit" @click="handleEditDepartment" :loading="actionLoading"
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
      :width="600"
      class="admin-dialog"
      destroy-on-close
      @open="onDialogOpen"
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

        <el-form-item v-if="editingDepartment" label="Руководитель" prop="supervisor_id">
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
          <div class="form-hint">
            {{
              departmentForm.supervisor_id
                ? 'Нажмите "Сохранить" для применения'
                : 'Можно назначить позже через редактирование'
            }}
          </div>
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
        <el-button @click="departmentDialogVisible = false" :disabled="actionLoading"
          >Отмена</el-button
        >
        <el-button type="primary" @click="saveDepartment" :loading="actionLoading"
          >Сохранить</el-button
        >
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Edit, Search } from '@element-plus/icons-vue'
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

// ✅ Список сотрудников КОНКРЕТНОГО отдела
const departmentEmployees = ref([])

const departmentForm = ref({
  name: '',
  description: '',
  supervisor_id: null,
  profiles: [],
})

// ✅ Используем сотрудников текущего отдела
const availableSupervisors = computed(() => {
  return departmentEmployees.value.filter((emp) => emp.id && emp.first_name && emp.last_name)
})

// ✅ Загружаем сотрудников конкретного отдела
const fetchDepartmentEmployees = async (departmentId) => {
  if (!departmentId) {
    departmentEmployees.value = []
    return
  }

  try {
    supervisorsLoading.value = true
    // ✅ Передаем departments_id для фильтрации по отделу
    const params = new URLSearchParams()
    params.append('departments_id', departmentId)

    const res = await fetch(`${API_BASE}/users/?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    // ✅ Извлекаем ТОЛЬКО нужные поля (без email и position)
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

const prepareDepartmentForBackend = (frontendDept, isUpdate = false) => {
  const payload = {
    department_name: frontendDept.name || frontendDept.department_name || '',
    description: frontendDept.description || '',
    profiles: frontendDept.profiles || [],
  }

  if (isUpdate) {
    payload.supervisor_id = frontendDept.supervisor_id || null
  }

  return payload
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
    const payload = prepareDepartmentForBackend(departmentData, false)

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
    const payload = prepareDepartmentForBackend(departmentData, true)

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

const confirmUnlinkSupervisor = async () => {
  if (!viewingDepartment.value?.id) return
  try {
    await ElMessageBox.confirm(
      `Открепить руководителя от отдела "${viewingDepartment.value.name}"?`,
      'Подтверждение',
      {
        type: 'warning',
        confirmButtonText: 'Отвязать',
        cancelButtonText: 'Отмена',
      },
    )
    actionLoading.value = true
    await unlinkSupervisor(viewingDepartment.value.id)
    ElMessage.success('Руководитель отвязан')
    const updated = await fetchDepartmentById(viewingDepartment.value.id)
    if (updated) {
      viewingDepartment.value = updated
      const idx = props.departments.findIndex((d) => d.id === updated.id)
      if (idx !== -1) {
        const newDepts = [...props.departments]
        newDepts[idx] = updated
        emit('update:departments', newDepts)
      }
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Error unlinking supervisor:', err)
      ElMessage.error(err.message || 'Ошибка при отвязке руководителя')
    }
  } finally {
    actionLoading.value = false
  }
}

const onDialogOpen = () => {
  // ✅ При открытии диалога редактирования загружаем сотрудников отдела
  if (editingDepartment.value?.id) {
    fetchDepartmentEmployees(editingDepartment.value.id)
  } else {
    // При создании отдела список сотрудников пуст
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
    const payload = prepareDepartmentForBackend(departmentForm.value, isUpdate)

    if (isUpdate) {
      await updateDepartment(editingDepartment.value.id, payload)
      ElMessage.success('Отдел обновлён')
    } else {
      await createDepartment(payload)
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
/* Стили без изменений */
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
}
</style>
