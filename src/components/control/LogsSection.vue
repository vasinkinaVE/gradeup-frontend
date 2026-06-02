<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Журнал событий</h2>
    </div>

    <div class="filters-row">
      <el-input
        v-model="logSearch"
        placeholder="Поиск по сообщению"
        :prefix-icon="Search"
        clearable
        class="search-input"
        @input="applyLocalFilters"
      />

      <el-select
        v-model="eventTypeFilter"
        placeholder="Тип события"
        clearable
        class="filter-select"
        :disabled="eventTypesLoading"
        @change="onFilterChange"
      >
        <el-option
          v-for="type in eventTypes"
          :key="type"
          :label="getEventTypeLabel(type)"
          :value="type"
        />
      </el-select>

      <el-select
        v-model="accessScopeFilter"
        placeholder="Доступ"
        clearable
        class="filter-select"
        @change="onFilterChange"
      >
        <el-option v-for="scope in ACCESS_SCOPES" :key="scope" :label="scope" :value="scope" />
      </el-select>

      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="—"
        start-placeholder="Начало"
        end-placeholder="Конец"
        clearable
        class="filter-select date-range"
        value-format="YYYY-MM-DD"
        @change="onFilterChange"
        @clear="onDateRangeClear"
      />
    </div>

    <el-table
      :data="displayedLogs"
      stripe
      border
      class="data-table"
      :empty-text="loading ? 'Загрузка...' : 'Нет записей'"
    >
      <el-table-column prop="created_at" label="Дата и время" width="170" sortable>
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>

      <el-table-column prop="event_type" label="Тип события" width="160">
        <template #default="{ row }">
          <el-tag size="small" :type="getEventTypeTag(row.event_type)">
            {{ getEventTypeLabel(row.event_type) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="access_scope" label="Доступ" width="120">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">
            {{ row.access_scope || '—' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="actor_name" label="Кто" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.actor_name || `ID: ${row.actor_id}` }}
        </template>
      </el-table-column>

      <el-table-column prop="message" label="Сообщение" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.message || '—' }}
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  logs: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  apiFilters: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:logs', 'refresh', 'update:apiFilters'])

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const eventTypes = ref([])
const eventTypesLoading = ref(false)

const ACCESS_SCOPES = ['Admin', 'Specialist', 'Supervisor', 'Employee']

const logSearch = ref('')
const eventTypeFilter = ref('')
const accessScopeFilter = ref('')
const dateRange = ref(null)

const lastEmittedFilters = ref(null)

const fetchEventTypes = async () => {
  try {
    eventTypesLoading.value = true
    const res = await fetch(`${API_BASE}/admin/event-types`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

    const data = await res.json()

    if (data && typeof data === 'object') {
      eventTypes.value = Object.values(data).filter((v) => typeof v === 'string' && v.trim())
    }
  } catch (err) {
    console.error('Error fetching event types:', err)
    ElMessage.error('Не удалось загрузить типы событий')
    eventTypes.value = []
  } finally {
    eventTypesLoading.value = false
  }
}

const getDefaultDateRange = () => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const formatDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }

  return [formatDate(yesterday), formatDate(today)]
}

const displayedLogs = computed(() => {
  let result = [...props.logs]

  if (logSearch.value?.trim()) {
    const q = logSearch.value.toLowerCase()
    result = result.filter((log) => log.message?.toLowerCase().includes(q))
  }

  return result.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime()
    const timeB = new Date(b.created_at || 0).getTime()
    return timeB - timeA
  })
})

const collectAllFilters = () => ({
  event_type: eventTypeFilter.value || null,
  access_scope: accessScopeFilter.value || null,
  start_date: dateRange.value?.[0] || null,
  end_date: dateRange.value?.[1] || null,
})

const applyFilters = () => {
  const filters = collectAllFilters()

  emit('update:apiFilters', filters)
  emit('refresh')

  lastEmittedFilters.value = { ...filters }
}

const onFilterChange = () => {
  applyFilters()
}

const onDateRangeClear = () => {
  dateRange.value = null
  applyFilters()
}

const applyLocalFilters = () => {}

const formatDateTime = (timestamp) => {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getEventTypeLabel = (type) => {
  const labels = {
    EVALUATE: 'Оценка этапа',
    GRADEUP: 'Повышение уровня',
    SCHEDULE_MEETING: 'Назначение встречи',
    MEETING_CHANGED: 'Изменение встречи',
    REGISTRATION: 'Регистрация',
    SET_PROFILE: 'Назначение профиля',
    SET_DEPARTMENT_SUPERVISOR: 'Назнач. рук. отдела',
    SET_DIVISION_SUPERVISOR: 'Назнач. рук. направления',
    REMOVE_DEPARTMENT_SUPERVISOR: 'Откреп. рук. отдела',
    REMOVE_DIVISION_SUPERVISOR: 'Откреп. рук. направления',
    ROLE_CHANGED: 'Изменение роли',
  }
  return labels[type] || type || '—'
}

const getEventTypeTag = (type) => {
  const map = {
    EVALUATE: 'success',
    GRADEUP: 'success',
    SCHEDULE_MEETING: 'primary',
    MEETING_CHANGED: 'warning',
    REGISTRATION: 'info',
    SET_PROFILE: 'primary',
    SET_DEPARTMENT_SUPERVISOR: 'primary',
    SET_DIVISION_SUPERVISOR: 'primary',
    REMOVE_DEPARTMENT_SUPERVISOR: 'danger',
    REMOVE_DIVISION_SUPERVISOR: 'danger',
    ROLE_CHANGED: 'warning',
  }
  return map[type] || 'info'
}

const resetFilters = () => {
  logSearch.value = ''
  eventTypeFilter.value = ''
  accessScopeFilter.value = ''
  dateRange.value = getDefaultDateRange()

  const filters = {
    event_type: null,
    access_scope: null,
    start_date: dateRange.value[0],
    end_date: dateRange.value[1],
  }
  emit('update:apiFilters', filters)
  emit('refresh')

  lastEmittedFilters.value = { ...filters }
}

const syncFiltersFromProps = (newFilters) => {
  if (newFilters?.start_date && newFilters?.end_date) {
    dateRange.value = [newFilters.start_date, newFilters.end_date]
  } else {
    dateRange.value = null
  }

  if (newFilters?.event_type !== undefined) {
    eventTypeFilter.value = newFilters.event_type || ''
  }

  if (newFilters?.access_scope !== undefined) {
    accessScopeFilter.value = newFilters.access_scope || ''
  }
}

onMounted(async () => {
  await fetchEventTypes()

  if (Object.keys(props.apiFilters).length > 0) {
    syncFiltersFromProps(props.apiFilters)
  } else {
    dateRange.value = getDefaultDateRange()
    applyFilters()
  }
})

watch(
  () => props.apiFilters,
  (newFilters) => {
    if (
      lastEmittedFilters.value &&
      JSON.stringify(newFilters) === JSON.stringify(lastEmittedFilters.value)
    ) {
      return
    }
    syncFiltersFromProps(newFilters)
  },
  { deep: true },
)

defineExpose({
  resetFilters,
  applyFilters,
  getDefaultDateRange,
  fetchEventTypes,
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
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 180px;
  max-width: 280px;
}

.filter-select {
  min-width: 140px;
  max-width: 180px;
}

.filter-select.date-range {
  min-width: 240px;
  max-width: 320px;
}

.data-table {
  width: 100%;
  margin-bottom: var(--spacing-md);
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

@media (max-width: 1180px) {
  .filters-row {
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .search-input {
    order: 0;
    flex: 1 1 45%;
    max-width: 48%;
    min-width: 160px;
  }

  .filter-select.date-range {
    order: 1;
    flex: 1 1 45%;
    max-width: 48%;
    min-width: 200px;
  }

  .filter-select:not(.date-range) {
    order: 2;
    flex: 1 1 45%;
    max-width: 48%;
    min-width: 130px;
  }
}

@media (max-width: 1024px) {
  .filter-select {
    min-width: 120px;
  }
  .filter-select.date-range {
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .filters-row {
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .search-input {
    order: 0;
    flex: 1 1 48%;
    max-width: 48%;
    min-width: 140px;
  }

  .filter-select.date-range {
    order: 1;
    flex: 1 1 48%;
    max-width: 48%;
    min-width: 160px;
  }

  .filter-select:not(.date-range) {
    order: 2;
    flex: 1 1 48%;
    max-width: 48%;
    min-width: 130px;
  }
}

@media (max-width: 480px) {
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
    max-width: none;
    order: unset;
  }

  .filter-select.date-range {
    width: 100%;
  }
}
</style>
