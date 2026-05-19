<!-- src/components/control/DirectionsSection.vue -->
<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление направлениями</h2>
      <el-button type="primary" @click="openDirectionDialog()">
        <el-icon><Plus /></el-icon>
        Создать направление
      </el-button>
    </div>

    <!-- Поиск -->
    <div class="filters-row">
      <el-input
        v-model="directionSearch"
        placeholder="Поиск по названию направления"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <!-- Таблица направлений -->
    <el-table
      :data="filteredDirections"
      stripe
      border
      class="data-table"
      @row-click="viewDirection"
    >
      <el-table-column prop="name" label="Название направления" min-width="250" />
      <el-table-column prop="departmentsCount" label="Отделов" width="100" align="center">
        <template #default="{ row }">
          {{ row.departmentIds?.length || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="description" label="Описание" min-width="250" show-overflow-tooltip />
      <el-table-column prop="supervisorName" label="Руководитель" min-width="200" />
    </el-table>

    <!-- 🔹 Модальное окно: ПРОСМОТР НАПРАВЛЕНИЯ -->
    <el-dialog
      v-model="viewDirectionVisible"
      title="Просмотр направления"
      :width="600"
      class="admin-dialog"
      destroy-on-close
    >
      <div v-if="viewingDirection" class="view-content">
        <div class="view-row">
          <div class="view-label">Название направления</div>
          <div class="view-value">{{ viewingDirection.name }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Описание</div>
          <div class="view-value">{{ viewingDirection.description || '—' }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Руководитель</div>
          <div class="view-value">{{ viewingDirection.supervisorName || 'Не назначен' }}</div>
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
                {{ dept.name }}
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

    <!-- 🔹 Модальное окно: Направление (создание/редактирование) -->
    <el-dialog
      v-model="directionDialogVisible"
      :title="editingDirection ? 'Редактирование направления' : 'Новое направление'"
      :width="600"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="directionForm" label-position="top">
        <el-form-item label="Название направления *" prop="name">
          <el-input v-model="directionForm.name" placeholder="Например: Разработка ПО" />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="directionForm.description"
            type="textarea"
            :rows="2"
            placeholder="Краткое описание направления"
          />
        </el-form-item>

        <el-form-item label="Руководитель направления" prop="supervisorId">
          <el-select
            v-model="directionForm.supervisorId"
            placeholder="Выберите руководителя"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="emp in allEmployees"
              :key="emp.id"
              :label="emp.fullName"
              :value="emp.id"
            />
          </el-select>
          <div class="form-hint">Выберите сотрудника, который будет руководить направлением</div>
        </el-form-item>

        <el-form-item label="Входящие отделы" prop="departmentIds">
          <el-select
            v-model="directionForm.departmentIds"
            placeholder="Выберите отделы"
            multiple
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="dept in allDepartments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            >
              <span>{{ dept.name }}</span>
              <span v-if="dept.description" class="option-desc"> — {{ dept.description }}</span>
            </el-option>
          </el-select>
          <div class="form-hint">Выберите отделы, входящие в это направление</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="directionDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveDirection">Сохранить</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Edit, Search } from '@element-plus/icons-vue'

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

const emit = defineEmits(['update:directions'])

// === Поиск ===
const directionSearch = ref('')

const filteredDirections = computed(() => {
  if (!directionSearch.value) return props.directions
  const q = directionSearch.value.toLowerCase()
  return props.directions.filter(
    (d) => d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
  )
})

// === Модальные окна ===
const directionDialogVisible = ref(false)
const viewDirectionVisible = ref(false)

const editingDirection = ref(null)
const viewingDirection = ref(null)

// === Форма направления ===
const directionForm = ref({
  name: '',
  description: '',
  supervisorId: null,
  supervisorName: '',
  departmentIds: [],
})

// === Хелперы ===
const getEmployeeNameById = (id) => {
  if (!id) return ''
  const emp = props.allEmployees.find((e) => e.id === id)
  return emp?.fullName || ''
}

const getDepartmentsByIds = (ids) => {
  if (!ids?.length) return []
  return ids.map((id) => props.allDepartments.find((d) => d.id === id)).filter(Boolean)
}

// === Направления: действия ===
const viewDirection = (direction) => {
  viewingDirection.value = {
    ...direction,
    supervisorName: getEmployeeNameById(direction.supervisorId),
    departments: getDepartmentsByIds(direction.departmentIds),
  }
  viewDirectionVisible.value = true
}

const handleEditDirection = () => {
  openDirectionDialog(viewingDirection.value)
  viewDirectionVisible.value = false
}

const confirmDeleteDirection = async () => {
  if (!viewingDirection.value) return
  try {
    await ElMessageBox.confirm(
      `Удалить направление "${viewingDirection.value.name}"?`,
      'Подтверждение',
      {
        type: 'warning',
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
      },
    )
    emit(
      'update:directions',
      props.directions.filter((d) => d.id !== viewingDirection.value.id),
    )
    ElMessage.success('Направление удалено')
    viewDirectionVisible.value = false
  } catch {
    // отменено
  }
}

const editDirection = (direction) => {
  openDirectionDialog(direction)
}

const openDirectionDialog = (direction = null) => {
  if (direction) {
    editingDirection.value = direction
    directionForm.value = {
      name: direction.name || '',
      description: direction.description || '',
      supervisorId: direction.supervisorId || null,
      supervisorName: getEmployeeNameById(direction.supervisorId),
      departmentIds: direction.departmentIds ? [...direction.departmentIds] : [],
    }
  } else {
    editingDirection.value = null
    directionForm.value = {
      name: '',
      description: '',
      supervisorId: null,
      supervisorName: '',
      departmentIds: [],
    }
  }
  directionDialogVisible.value = true
}

const saveDirection = () => {
  if (!directionForm.value.name?.trim()) {
    ElMessage.warning('Введите название направления')
    return
  }

  const supervisorName = getEmployeeNameById(directionForm.value.supervisorId)

  if (editingDirection.value) {
    // Редактирование
    const idx = props.directions.findIndex((d) => d.id === editingDirection.value.id)
    if (idx !== -1) {
      const updated = [...props.directions]
      updated[idx] = {
        ...updated[idx],
        ...directionForm.value,
        supervisorName: supervisorName,
      }
      emit('update:directions', updated)
    }
    ElMessage.success('Направление обновлено')
  } else {
    // Создание
    const newDirection = {
      id: Date.now(),
      ...directionForm.value,
      supervisorName: supervisorName,
    }
    emit('update:directions', [newDirection, ...props.directions])
    ElMessage.success('Направление создано')
  }
  directionDialogVisible.value = false
}

const deleteDirection = async (direction) => {
  try {
    await ElMessageBox.confirm(`Удалить направление "${direction.name}"?`, 'Подтверждение', {
      type: 'warning',
    })
    emit(
      'update:directions',
      props.directions.filter((d) => d.id !== direction.id),
    )
    ElMessage.success('Направление удалено')
  } catch {
    /* отменено */
  }
}
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

.departments-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.dept-tag {
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
