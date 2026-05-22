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

    <!-- Поиск -->
    <div class="filters-row">
      <el-input
        v-model="departmentSearch"
        placeholder="Поиск по названию отдела"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <!-- Таблица отделов -->
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
          {{ row.profiles?.length || row.availableProfileIds?.length || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="description" label="Описание" min-width="250" show-overflow-tooltip />
    </el-table>

    <!-- 🔹 Модальное окно: ПРОСМОТР ОТДЕЛА -->
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
            {{
              viewingDepartment.supervisor
                ? `${viewingDepartment.supervisor.last_name} ${viewingDepartment.supervisor.first_name} ${viewingDepartment.supervisor.patronymic || ''}`.trim()
                : '—'
            }}
          </div>
        </div>

        <div class="view-row">
          <div class="view-label">Доступные профили</div>
          <div class="view-value">
            <div v-if="getDepartmentProfiles(viewingDepartment).length" class="profiles-list">
              <el-tag
                v-for="profile in getDepartmentProfiles(viewingDepartment)"
                :key="profile.id"
                size="small"
                class="profile-tag"
              >
                {{ profile.title || profile.position }}
              </el-tag>
            </div>
            <span v-else>Профили не добавлены</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button :icon="Edit" @click="handleEditDepartment" :loading="loading"
          >Редактировать</el-button
        >
        <el-button type="danger" :icon="Delete" @click="confirmDeleteDepartment" :loading="loading"
          >Удалить</el-button
        >
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: Отдел (создание/редактирование) -->
    <el-dialog
      v-model="departmentDialogVisible"
      :title="editingDepartment ? 'Редактирование отдела' : 'Новый отдел'"
      :width="600"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="departmentForm" label-position="top" v-loading="loading">
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

        <!-- 🔹 Руководитель (опционально) -->
        <el-form-item label="Руководитель" prop="supervisor_id">
          <el-select
            v-model="departmentForm.supervisor_id"
            placeholder="Выберите руководителя"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="emp in availableSupervisors"
              :key="emp.id"
              :label="`${emp.last_name} ${emp.first_name} ${emp.patronymic || ''}`.trim()"
              :value="emp.id"
            />
          </el-select>
          <div class="form-hint">Необязательно: можно назначить позже</div>
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
              :label="profile.title || profile.position"
              :value="profile.id"
            >
              <span>{{ profile.title || profile.position }}</span>
              <span v-if="profile.description" class="option-desc">
                — {{ profile.description }}</span
              >
            </el-option>
          </el-select>
          <div class="form-hint">Профили, которые могут быть назначены в этом отделе</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="departmentDialogVisible = false" :disabled="loading">Отмена</el-button>
        <el-button type="primary" @click="saveDepartment" :loading="loading">Сохранить</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Edit, Search } from '@element-plus/icons-vue'

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
  // Опционально: список сотрудников для выбора руководителя
  employees: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:departments', 'refresh'])

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// === Поиск ===
const departmentSearch = ref('')

const filteredDepartments = computed(() => {
  if (!departmentSearch.value) return props.departments || []
  const q = departmentSearch.value.toLowerCase()
  return (props.departments || []).filter(
    (d) => d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
  )
})

// === Модальные окна ===
const departmentDialogVisible = ref(false)
const viewDepartmentVisible = ref(false)
const viewLoading = ref(false)

const editingDepartment = ref(null)
const viewingDepartment = ref(null)

// === Форма отдела ===
const departmentForm = ref({
  name: '',
  description: '',
  supervisor_id: null,
  profiles: [], // массив ID профилей
})

// === Доступные руководители (фильтруем сотрудников) ===
const availableSupervisors = computed(() => {
  return (props.employees || []).filter((emp) => emp.id && emp.first_name)
})

// === Хелперы: нормализация данных ===

/**
 * Преобразует ответ бэкенда в формат для фронтенда
 */
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
    // Backend возвращает profiles как массив объектов {id, title} или просто [id]
    profiles: Array.isArray(data.profiles)
      ? data.profiles.map((p) => (typeof p === 'object' ? p.id : p))
      : [],
    // Для обратной совместимости
    availableProfileIds: Array.isArray(data.profiles)
      ? data.profiles.map((p) => (typeof p === 'object' ? p.id : p))
      : [],
  }
}

/**
 * Подготавливает данные формы для отправки на бэкенд
 */
const prepareDepartmentForBackend = (frontendDept) => {
  return {
    department_name: frontendDept.name || frontendDept.department_name || '',
    description: frontendDept.description || '',
    supervisor_id: frontendDept.supervisor_id || null,
    profiles: frontendDept.profiles || frontendDept.availableProfileIds || [],
  }
}

/**
 * Получает полные объекты профилей по их ID
 */
const getDepartmentProfiles = (department) => {
  const profileIds = department.profiles || department.availableProfileIds || []
  return profileIds
    .map((id) => props.allProfiles?.find((p) => p.id === id || String(p.id) === String(id)))
    .filter(Boolean)
}

// === Серверные методы: Departments ===

/**
 * Получить все отделы
 */
const fetchDepartments = async () => {
  try {
    emit('refresh')
    const res = await fetch(`${API_BASE}/admin/departments/`, {
      headers: { 'Content-Type': 'application/json' },
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

/**
 * Получить отдел по ID
 */
const fetchDepartmentById = async (departmentId) => {
  try {
    const res = await fetch(`${API_BASE}/admin/departments/${departmentId}`, {
      headers: { 'Content-Type': 'application/json' },
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

/**
 * Создать новый отдел
 */
const createDepartment = async (departmentData) => {
  try {
    const res = await fetch(`${API_BASE}/admin/departments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(departmentData),
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

/**
 * Обновить отдел
 */
const updateDepartment = async (departmentId, departmentData) => {
  try {
    const res = await fetch(`${API_BASE}/admin/departments/${departmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(departmentData),
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

/**
 * Удалить отдел
 */
const deleteDepartment = async (departmentId) => {
  try {
    const res = await fetch(`${API_BASE}/admin/departments/${departmentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
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

// === Отделы: действия ===

/**
 * Просмотр отдела с загрузкой полных данных
 */
const viewDepartment = async (department) => {
  try {
    viewLoading.value = true
    // Загружаем полные данные с сервера (с руководителем и профилями)
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
    emit('refresh')
    await deleteDepartment(viewingDepartment.value.id)
    ElMessage.success('Отдел удалён')
    // Перезагружаем список
    await fetchDepartments()
    viewDepartmentVisible.value = false
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Error deleting department:', err)
      ElMessage.error(err.message || 'Ошибка при удалении отдела')
    }
  }
}

/**
 * Открыть диалог создания/редактирования
 */
const openDepartmentDialog = (department = null) => {
  if (department) {
    editingDepartment.value = department
    const normalized = normalizeDepartmentFromBackend(department)
    departmentForm.value = {
      name: normalized.name || '',
      description: normalized.description || '',
      supervisor_id: normalized.supervisor_id || null,
      profiles: normalized.profiles || normalized.availableProfileIds || [],
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

/**
 * Сохранить отдел (создание или обновление)
 */
const saveDepartment = async () => {
  if (!departmentForm.value.name?.trim()) {
    return ElMessage.warning('Введите название отдела')
  }

  try {
    emit('refresh')
    const payload = prepareDepartmentForBackend(departmentForm.value)

    if (editingDepartment.value?.id) {
      // Обновление
      await updateDepartment(editingDepartment.value.id, payload)
      ElMessage.success('Отдел обновлён')
    } else {
      // Создание
      await createDepartment(payload)
      ElMessage.success('Отдел создан')
    }

    // Перезагружаем список
    await fetchDepartments()
    departmentDialogVisible.value = false
  } catch (err) {
    console.error('Error saving department:', err)
    ElMessage.error(err.message || 'Ошибка сохранения отдела')
  }
}

// === Публичные методы для родителя ===
const reload = async () => {
  await fetchDepartments()
}

defineExpose({
  reload,
  fetchDepartments,
})
</script>

<style scoped>
/* === Секция === */
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

/* Формы */
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

/* === Модальные окна просмотра === */
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

.profiles-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.profile-tag {
  margin: 2px 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }
}
</style>
