<!-- src/components/control/DepartmentsSection.vue -->
<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление отделами</h2>
      <el-button type="primary" @click="openDepartmentDialog()">
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
    >
      <el-table-column prop="name" label="Название отдела" min-width="250" />
      <el-table-column prop="profilesCount" label="Профилей" width="100" align="center">
        <template #default="{ row }">
          {{ row.availableProfileIds?.length || 0 }}
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
      <div v-if="viewingDepartment" class="view-content">
        <div class="view-row">
          <div class="view-label">Название отдела</div>
          <div class="view-value">{{ viewingDepartment.name }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Описание</div>
          <div class="view-value">{{ viewingDepartment.description || '—' }}</div>
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
                {{ profile.position }}
              </el-tag>
            </div>
            <span v-else>Профили не добавлены</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button :icon="Edit" @click="handleEditDepartment">Редактировать</el-button>
        <el-button type="danger" :icon="Delete" @click="confirmDeleteDepartment">Удалить</el-button>
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
      <el-form :model="departmentForm" label-position="top">
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

        <el-form-item label="Доступные профили" prop="availableProfileIds">
          <el-select
            v-model="departmentForm.availableProfileIds"
            placeholder="Выберите профили"
            multiple
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="profile in allProfiles"
              :key="profile.id"
              :label="profile.position"
              :value="profile.id"
            >
              <span>{{ profile.position }}</span>
              <span v-if="profile.description" class="option-desc">
                — {{ profile.description }}</span
              >
            </el-option>
          </el-select>
          <div class="form-hint">Выберите профили, которые могут быть назначены в этом отделе</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="departmentDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveDepartment">Сохранить</el-button>
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
})

const emit = defineEmits(['update:departments'])

// === Поиск ===
const departmentSearch = ref('')

const filteredDepartments = computed(() => {
  if (!departmentSearch.value) return props.departments
  const q = departmentSearch.value.toLowerCase()
  return props.departments.filter(
    (d) => d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
  )
})

// === Модальные окна ===
const departmentDialogVisible = ref(false)
const viewDepartmentVisible = ref(false)

const editingDepartment = ref(null)
const viewingDepartment = ref(null)

// === Форма отдела ===
const departmentForm = ref({
  name: '',
  description: '',
  availableProfileIds: [],
})

// === Хелперы ===
const getProfileById = (id) => {
  return props.allProfiles.find((p) => p.id === id)
}

const getProfilesByIds = (ids) => {
  if (!ids?.length) return []
  return ids.map((id) => getProfileById(id)).filter(Boolean)
}

// === Отделы: действия ===
const viewDepartment = (department) => {
  viewingDepartment.value = {
    ...department,
    profiles: getProfilesByIds(department.availableProfileIds),
  }
  viewDepartmentVisible.value = true
}

const handleEditDepartment = () => {
  openDepartmentDialog(viewingDepartment.value)
  viewDepartmentVisible.value = false
}

const confirmDeleteDepartment = async () => {
  if (!viewingDepartment.value) return
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
    emit(
      'update:departments',
      props.departments.filter((d) => d.id !== viewingDepartment.value.id),
    )
    ElMessage.success('Отдел удалён')
    viewDepartmentVisible.value = false
  } catch {
    // отменено
  }
}

const editDepartment = (department) => {
  openDepartmentDialog(department)
}

const openDepartmentDialog = (department = null) => {
  if (department) {
    editingDepartment.value = department
    departmentForm.value = {
      name: department.name || '',
      description: department.description || '',
      availableProfileIds: department.availableProfileIds
        ? [...department.availableProfileIds]
        : [],
    }
  } else {
    editingDepartment.value = null
    departmentForm.value = {
      name: '',
      description: '',
      availableProfileIds: [],
    }
  }
  departmentDialogVisible.value = true
}

const saveDepartment = () => {
  if (!departmentForm.value.name?.trim()) {
    ElMessage.warning('Введите название отдела')
    return
  }

  if (editingDepartment.value) {
    // Редактирование
    const idx = props.departments.findIndex((d) => d.id === editingDepartment.value.id)
    if (idx !== -1) {
      const updated = [...props.departments]
      updated[idx] = { ...updated[idx], ...departmentForm.value }
      emit('update:departments', updated)
    }
    ElMessage.success('Отдел обновлён')
  } else {
    // Создание
    const newDepartment = {
      id: Date.now(),
      ...departmentForm.value,
    }
    emit('update:departments', [newDepartment, ...props.departments])
    ElMessage.success('Отдел создан')
  }
  departmentDialogVisible.value = false
}

const deleteDepartment = async (department) => {
  try {
    await ElMessageBox.confirm(`Удалить отдел "${department.name}"?`, 'Подтверждение', {
      type: 'warning',
    })
    emit(
      'update:departments',
      props.departments.filter((d) => d.id !== department.id),
    )
    ElMessage.success('Отдел удалён')
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
