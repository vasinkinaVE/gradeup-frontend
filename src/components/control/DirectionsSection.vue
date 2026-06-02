<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление направлениями</h2>
      <el-button type="primary" @click="openDirectionDialog()">
        <el-icon><Plus /></el-icon>
        Создать направление
      </el-button>
    </div>

    <div class="filters-row">
      <el-input
        v-model="directionSearch"
        placeholder="Поиск по названию направления"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <el-table
      :data="filteredDirections"
      stripe
      border
      class="data-table"
      @row-click="viewDirection"
    >
      <el-table-column prop="division_name" label="Название направления" min-width="250" />
      <el-table-column prop="departmentsCount" label="Отделов" width="100" align="center">
        <template #default="{ row }">
          {{ row.departments?.length || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="description" label="Описание" min-width="250" show-overflow-tooltip />
      <el-table-column label="Руководитель" min-width="200">
        <template #default="{ row }">
          {{ formatSupervisorName(row.supervisor) }}
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="viewDirectionVisible"
      title="Просмотр направления"
      width="95%"
      :style="{ maxWidth: '700px' }"
      class="admin-dialog"
      destroy-on-close
      align-center
    >
      <div v-if="viewingDirection" class="view-content">
        <div class="view-row">
          <div class="view-label">Название направления</div>
          <div class="view-value">{{ viewingDirection.division_name }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Описание</div>
          <div class="view-value">{{ viewingDirection.description || '—' }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Руководитель</div>
          <div class="view-value">
            {{ formatSupervisorName(viewingDirection.supervisor) || 'Не назначен' }}
          </div>
        </div>

        <div class="view-row">
          <div class="view-label">Входящие отделы</div>
          <div class="view-value">
            <div v-if="viewingDirection.departments?.length" class="departments-list">
              <el-tag
                v-for="dept in viewingDirection.departments"
                :key="dept.id"
                size="small"
                class="dept-tag"
              >
                {{ dept.department_name || dept.name }}
              </el-tag>
            </div>
            <span v-else>Отделы не добавлены</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button :icon="Edit" @click="handleEditDirection">Редактировать</el-button>
        <el-button type="danger" :icon="Delete" @click="confirmDeleteDirection">Удалить</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="directionDialogVisible"
      :title="editingDirection ? 'Редактирование направления' : 'Новое направление'"
      width="95%"
      :style="{ maxWidth: '700px' }"
      class="admin-dialog"
      destroy-on-close
      align-center
    >
      <el-form :model="directionForm" label-position="top">
        <el-form-item label="Название направления *" prop="division_name">
          <el-input v-model="directionForm.division_name" placeholder="Например: Разработка ПО" />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="directionForm.description"
            type="textarea"
            :rows="2"
            placeholder="Краткое описание направления"
          />
        </el-form-item>

        <el-form-item v-if="editingDirection" label="Руководитель направления" prop="supervisor_id">
          <el-select
            v-model="directionForm.supervisor_id"
            placeholder="Выберите руководителя"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="emp in availableSupervisors"
              :key="emp.id"
              :label="formatEmployeeName(emp)"
              :value="emp.id"
            />
          </el-select>

          <el-button
            v-if="editingDirection && directionForm.supervisor_id"
            type="danger"
            size="small"
            @click="unassignSupervisor"
            style="margin-top: 8px"
          >
            <el-icon><Remove /></el-icon>
            Открепить руководителя
          </el-button>
        </el-form-item>

        <el-form-item label="Входящие отделы" prop="departments">
          <el-select
            v-model="directionForm.departments"
            placeholder="Выберите отделы"
            multiple
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="dept in allDepartments"
              :key="dept.id"
              :label="dept.name || dept.department_name"
              :value="dept.id"
            >
              <span>{{ dept.name || dept.department_name }}</span>
              <span v-if="dept.description" class="option-desc"> — {{ dept.description }}</span>
            </el-option>
          </el-select>
          <div class="form-hint">Выберите отделы, входящие в это направление</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="directionDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveDirection" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Edit, Search, Remove } from '@element-plus/icons-vue'

const props = defineProps({
  directions: {
    type: Array,
    required: true,
  },
  allDepartments: {
    type: Array,
    required: true,
  },
  allEmployees: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['update:directions', 'refresh'])

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const directionSearch = ref('')

const filteredDirections = computed(() => {
  if (!directionSearch.value) return props.directions
  const q = directionSearch.value.toLowerCase()
  return props.directions.filter(
    (d) => d.division_name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
  )
})

const availableSupervisors = computed(() => {
  return (props.allEmployees || []).filter((emp) => emp.is_supervisor === false)
})

const directionDialogVisible = ref(false)
const viewDirectionVisible = ref(false)

const editingDirection = ref(null)
const viewingDirection = ref(null)
const saving = ref(false)

const directionForm = ref({
  division_name: '',
  description: '',
  supervisor_id: null,
  departments: [],
})

const formatEmployeeName = (emp) => {
  if (!emp) return ''
  const parts = [emp.last_name, emp.first_name, emp.patronymic].filter(Boolean)
  return parts.join(' ') || emp.fullName || ''
}

const formatSupervisorName = (supervisor) => {
  if (!supervisor) return ''
  const parts = [supervisor.last_name, supervisor.first_name, supervisor.patronymic].filter(Boolean)
  return parts.join(' ') || supervisor.fullName || ''
}

const fetchDirections = async () => {
  try {
    const res = await fetch(`${API_BASE}/admin/divisions/departments`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()
    emit('update:directions', data)
    return data
  } catch (err) {
    console.error('Error fetching directions:', err)
    ElMessage.error('Не удалось загрузить направления')
    return []
  }
}

const fetchDirectionById = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/admin/divisions/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    return await res.json()
  } catch (err) {
    console.error('Error fetching direction:', err)
    ElMessage.error('Не удалось загрузить направление')
    return null
  }
}

const fetchAvailableSupervisors = async () => {
  try {
    const res = await fetch(`${API_BASE}/users/`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()

    return data
      .filter((user) => user.is_supervisor === false)
      .map((user) => ({
        id: user.id,
        last_name: user.last_name || '',
        first_name: user.first_name || '',
        patronymic: user.patronymic || '',
      }))
  } catch (err) {
    console.error('Error fetching available supervisors:', err)
    ElMessage.error('Не удалось загрузить список сотрудников')
    return []
  }
}

const createDirection = async (payload) => {
  try {
    const res = await fetch(`${API_BASE}/admin/divisions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.detail?.[0]?.msg || `HTTP ${res.status}: ${res.statusText}`)
    }
    return await res.json()
  } catch (err) {
    console.error('Error creating direction:', err)
    throw err
  }
}

const updateDirection = async (id, payload) => {
  try {
    const res = await fetch(`${API_BASE}/admin/divisions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.detail?.[0]?.msg || `HTTP ${res.status}: ${res.statusText}`)
    }
    return await res.json()
  } catch (err) {
    console.error('Error updating direction:', err)
    throw err
  }
}

const deleteDirection = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/admin/divisions/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    return await res.json()
  } catch (err) {
    console.error('Error deleting direction:', err)
    throw err
  }
}

const unassignSupervisorFromDirection = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/admin/divisions/${id}/supervisor`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    return await res.json()
  } catch (err) {
    console.error('Error unassigning supervisor:', err)
    throw err
  }
}

const viewDirection = async (direction) => {
  try {
    const data = await fetchDirectionById(direction.id)
    if (data) {
      viewingDirection.value = data
      viewDirectionVisible.value = true
    }
  } catch (err) {}
}

const handleEditDirection = () => {
  openDirectionDialog(viewingDirection.value)
  viewDirectionVisible.value = false
}

const confirmDeleteDirection = async () => {
  if (!viewingDirection.value) return
  try {
    await ElMessageBox.confirm(
      `Удалить направление "${viewingDirection.value.division_name}"?`,
      'Подтверждение',
      {
        type: 'warning',
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
      },
    )
    await deleteDirection(viewingDirection.value.id)
    ElMessage.success('Направление удалено')
    viewDirectionVisible.value = false
    await fetchDirections()
    emit('refresh')
  } catch (err) {
    if (err?.message !== 'cancel' && err !== 'cancel') {
      ElMessage.error('Ошибка при удалении направления')
    }
  }
}

const openDirectionDialog = (direction = null) => {
  if (direction) {
    editingDirection.value = direction
    directionForm.value = {
      division_name: direction.division_name || '',
      description: direction.description || '',
      supervisor_id: direction.supervisor_id || direction.supervisor?.id || null,
      departments: direction.departments?.map((d) => d.id) || [],
    }
  } else {
    editingDirection.value = null
    directionForm.value = {
      division_name: '',
      description: '',
      supervisor_id: null,
      departments: [],
    }
  }
  directionDialogVisible.value = true
}

const unassignSupervisor = async () => {
  if (!editingDirection.value?.id) return
  try {
    await ElMessageBox.confirm('Открепить руководителя от направления?', 'Подтверждение', {
      type: 'warning',
      confirmButtonText: 'Открепить',
      cancelButtonText: 'Отмена',
    })
    await unassignSupervisorFromDirection(editingDirection.value.id)
    directionForm.value.supervisor_id = null
    ElMessage.success('Руководитель откреплён')

    await fetchDirections()
  } catch (err) {
    if (err?.message !== 'cancel' && err !== 'cancel') {
      ElMessage.error('Ошибка при откреплении руководителя')
    }
  }
}

const saveDirection = async () => {
  if (!directionForm.value.division_name?.trim()) {
    ElMessage.warning('Введите название направления')
    return
  }

  saving.value = true
  try {
    if (editingDirection.value) {
      const payload = {
        division_name: directionForm.value.division_name,
        description: directionForm.value.description || '',
        supervisor_id: directionForm.value.supervisor_id,
        departments: directionForm.value.departments || [],
      }
      await updateDirection(editingDirection.value.id, payload)
      ElMessage.success('Направление обновлено')
    } else {
      const payload = {
        division_name: directionForm.value.division_name,
        description: directionForm.value.description || '',
        departments: directionForm.value.departments || [],
      }
      await createDirection(payload)
      ElMessage.success('Направление создано')
    }
    directionDialogVisible.value = false
    await fetchDirections()
    emit('refresh')
  } catch (err) {
    ElMessage.error(err.message || 'Ошибка при сохранении направления')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!props.directions?.length) {
    await fetchDirections()
  }
})

defineExpose({
  fetchDirections,
  fetchAvailableSupervisors,
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

.departments-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.dept-tag {
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

@media (max-width: 500px) {
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

/* Адаптивность */
@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
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
</style>

<style>
.section-header .el-button--primary {
  background-color: #4a2c6d !important;
  border-color: #4a2c6d !important;
  color: #fff !important;
}
.section-header .el-button--primary:hover {
  background-color: #3a2255 !important;
  border-color: #3a2255 !important;
  color: #fff !important;
}
.section-header .el-button--primary:active {
  background-color: #2d1a42 !important;
  border-color: #2d1a42 !important;
}

.admin-dialog .el-dialog__footer .el-button--primary:last-child {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #fff !important;
}
.admin-dialog .el-dialog__footer .el-button--primary:last-child:hover {
  background-color: #5daf34 !important;
  border-color: #5daf34 !important;
  color: #fff !important;
}
.admin-dialog .el-dialog__footer .el-button--primary:last-child:active {
  background-color: #53a32f !important;
  border-color: #53a32f !important;
}

.admin-dialog .el-dialog__footer .el-button:not(.el-button--primary):first-child:hover {
  background-color: #e8e8e8 !important;
  border-color: #c0c4cc !important;
  color: #606266 !important;
}

.admin-dialog .el-dialog__footer .el-button:first-child:hover {
  background-color: #e8e8e8 !important;
  border-color: #c0c4cc !important;
  color: #606266 !important;
}
</style>
