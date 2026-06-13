<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление встречами</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        Создать встречу
      </el-button>
    </div>

    <div class="filters-row">
      <el-input
        v-model="searchQuery"
        placeholder="Поиск по навыку или участнику"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <el-table
      :data="filteredMeetings"
      stripe
      border
      class="data-table"
      @row-click="openViewDialog"
      style="cursor: pointer"
    >
      <el-table-column prop="title" label="Навык" width="170" />
      <el-table-column prop="confirmation_type" label="Тип этапа" min-width="140">
        <template #default="{ row }">
          <el-tag size="small" :type="getStageTypeTag(row.confirmation_type)">
            {{ getStageTypeLabel(row.confirmation_type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="started_at" label="Дата и время" width="170" sortable>
        <template #default="{ row }">
          {{ formatDateTime(row.started_at) }}
        </template>
      </el-table-column>
      <el-table-column prop="location" label="Место" min-width="140" />
      <el-table-column prop="duration" label="Длительность" width="100" align="center">
        <template #default="{ row }">{{ row.duration }} мин.</template>
      </el-table-column>
      <el-table-column label="Участники" min-width="200">
        <template #default="{ row }">
          <div class="participants-display">
            <el-tag size="small" type="warning">
              Аттестуемый: {{ row.student?.full_name || '—' }}
            </el-tag>
            <el-tag size="small" type="success">
              Аттестующий: {{ row.examiner?.full_name || '—' }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <MeetingDialog
      v-model="dialogVisible"
      :meeting="selectedMeeting"
      @save="onMeetingSaved"
      @close="onDialogClose"
    />

    <el-dialog
      v-model="viewDialogVisible"
      title="Просмотр встречи"
      width="90%"
      :style="{ maxWidth: '500px' }"
      :close-on-click-modal="true"
      class="admin-dialog"
      align-center
    >
      <div v-if="viewMeeting" class="view-content">
        <div class="view-row">
          <span class="label">Навык:</span>
          <span class="value">{{ viewMeeting.title }}</span>
        </div>
        <div class="view-row">
          <span class="label">Тип этапа:</span>
          <el-tag size="small" :type="getStageTypeTag(viewMeeting.confirmation_type)">
            {{ getStageTypeLabel(viewMeeting.confirmation_type) }}
          </el-tag>
        </div>
        <div class="view-row">
          <span class="label">Дата и время:</span>
          <span class="value">{{ formatDateTime(viewMeeting.started_at) }}</span>
        </div>
        <div class="view-row">
          <span class="label">Место:</span>
          <span class="value">{{ viewMeeting.location }}</span>
        </div>
        <div class="view-row">
          <span class="label">Длительность:</span>
          <span class="value">{{ viewMeeting.duration }} мин.</span>
        </div>
        <div class="view-row">
          <span class="label">Аттестуемый:</span>
          <span class="value">{{ viewMeeting.student?.full_name }}</span>
        </div>
        <div class="view-row">
          <span class="label">Аттестующий:</span>
          <span class="value">{{ viewMeeting.examiner?.full_name }}</span>
        </div>
        <div class="view-row" v-if="viewMeeting.description">
          <span class="label">Описание:</span>
          <span class="value">{{ viewMeeting.description }}</span>
        </div>
      </div>

      <template #footer>
        <el-button :icon="Edit" @click="openEditDialog(viewMeeting)">Редактировать</el-button>
        <el-button type="danger" :icon="Delete" @click="confirmDelete">Удалить</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import MeetingDialog from '@/components/common/MeetingDialog.vue'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface Meeting {
  id: number
  title: string
  confirmation_type: string
  started_at: string
  location: string
  duration: number
  description?: string
  status: string
  student?: { id: number; full_name: string }
  examiner?: { id: number; full_name: string }
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  patronymic?: string
  department_name?: string
}

const props = defineProps<{
  employees?: Employee[]
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const meetings = ref<Meeting[]>([])
const searchQuery = ref('')
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const selectedMeeting = ref<Meeting | null>(null)
const viewMeeting = ref<Meeting | null>(null)

const fetchMeetings = async () => {
  try {
    const res = await axios.get<Meeting[]>(`${API_BASE}/meetings/`)
    if (Array.isArray(res.data)) {
      meetings.value = res.data
    } else {
      console.error('Expected array but got:', res.data)
      meetings.value = []
      ElMessage.error('Неверный формат данных встреч')
    }
  } catch (err: any) {
    console.error('Ошибка загрузки встреч:', err)
    const errorMsg = err.response?.data?.detail || err.message || 'Не удалось загрузить встречи'
    ElMessage.error(errorMsg)
    meetings.value = []
  }
}

const filteredMeetings = computed(() => {
  if (!Array.isArray(meetings.value)) return []
  if (!searchQuery.value) return meetings.value
  const q = searchQuery.value.toLowerCase()
  return meetings.value.filter((m) => {
    const skill = m.title?.toLowerCase() || ''
    const student = m.student?.full_name?.toLowerCase() || ''
    const examiner = m.examiner?.full_name?.toLowerCase() || ''
    return skill.includes(q) || student.includes(q) || examiner.includes(q)
  })
})

const getStageTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    Аттестация: 'Аттестация',
    'Практическое задание': 'Практическое задание',
    'Performance review': 'Performance review',
  }
  return map[type] || type
}

const getStageTypeTag = (type: string) => {
  const map: Record<string, string> = {
    Аттестация: 'warning',
    'Практическое задание': 'success',
    'Performance review': 'danger',
  }
  return (map[type] || 'info') as 'success' | 'warning' | 'danger' | 'info'
}

const formatDateTime = (dt: string) => {
  if (!dt) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dt))
}

const openCreateDialog = () => {
  selectedMeeting.value = null
  dialogVisible.value = true
}

const openEditDialog = (meeting: Meeting) => {
  selectedMeeting.value = meeting
  dialogVisible.value = true
  viewDialogVisible.value = false
}

const openViewDialog = (meeting: Meeting) => {
  viewMeeting.value = meeting
  viewDialogVisible.value = true
}

const onMeetingSaved = () => {
  fetchMeetings()
}

const onDialogClose = () => {
  selectedMeeting.value = null
}

const confirmDelete = async () => {
  if (!viewMeeting.value) return
  try {
    await ElMessageBox.confirm('Удалить эту встречу?', 'Подтверждение', {
      type: 'warning',
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
    })
    await axios.delete(`${API_BASE}/meetings/${viewMeeting.value.id}`)
    ElMessage.success('Встреча удалена')
    viewDialogVisible.value = false
    fetchMeetings()
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('Ошибка удаления:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Не удалось удалить встречу'
      ElMessage.error(errorMsg)
    }
  }
}

onMounted(() => {
  fetchMeetings()
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
}
.filters-row {
  margin-bottom: var(--spacing-md);
}
.search-input {
  max-width: 400px;
}
.data-table :deep(.el-table__row) {
  cursor: pointer;
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

:deep(.data-table .el-table__cell) {
  padding: 8px 0;
}
:deep(.data-table .el-table__cell .cell) {
  white-space: nowrap;
  padding: 0 12px;
  line-height: 1.4;
}
:deep(.data-table .el-table__body tr) {
  height: auto !important;
}

.participants-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.view-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.view-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: var(--spacing-sm);
  align-items: baseline;
}
.view-row .label {
  color: var(--gray);
  font-weight: var(--font-weight-medium);
}
.view-row .value {
  color: var(--text);
}

@media (max-width: 440px) {
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

@media (max-width: 350px) {
  .view-row {
    grid-template-columns: 1fr;
    gap: var(--spacing-xs);
  }
}
</style>

<style>
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
