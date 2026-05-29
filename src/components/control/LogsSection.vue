<!-- src/components/control/LogsSection.vue -->
<template>
  <section class="tab-content">
    <!-- Заголовок секции -->
    <div class="section-header">
      <h2>Журнал событий</h2>
      <el-button type="primary" @click="emit('refresh')" :loading="loading">
        <el-icon><Refresh /></el-icon>
        Обновить
      </el-button>
    </div>

    <!-- Поиск и фильтры -->
    <div class="filters-row">
      <!-- Поиск по сообщению (локальный) -->
      <el-input
        v-model="logSearch"
        placeholder="Поиск по сообщению"
        :prefix-icon="Search"
        clearable
        class="search-input"
        @input="applyLocalFilters"
      />

      <!-- Тип события (загружается с сервера) -->
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

      <!-- Доступ (access_scope) -->
      <el-select
        v-model="accessScopeFilter"
        placeholder="Доступ"
        clearable
        class="filter-select"
        @change="onFilterChange"
      >
        <el-option v-for="scope in ACCESS_SCOPES" :key="scope" :label="scope" :value="scope" />
      </el-select>

      <!-- Диапазон дат (по умолчанию: вчера — сегодня) -->
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="—"
        start-placeholder="Начало"
        end-placeholder="Конец"
        clearable
        class="filter-select date-range"
        value-format="YYYY-MM-DDTHH:mm:ss"
        @change="onFilterChange"
        @clear="onDateRangeClear"
      />
    </div>

    <!-- Таблица логов -->
    <el-table
      :data="displayedLogs"
      stripe
      border
      class="data-table"
      :empty-text="loading ? 'Загрузка...' : 'Нет записей'"
    >
      <!-- Дата и время -->
      <el-table-column prop="created_at" label="Дата и время" width="170" sortable>
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>

      <!-- Тип события -->
      <el-table-column prop="event_type" label="Тип события" width="160">
        <template #default="{ row }">
          <el-tag size="small" :type="getEventTypeTag(row.event_type)">
            {{ getEventTypeLabel(row.event_type) }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- Доступ (access_scope) -->
      <el-table-column prop="access_scope" label="Доступ" width="120">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">
            {{ row.access_scope || '—' }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- Кто (actor_name) -->
      <el-table-column prop="actor_name" label="Кто" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.actor_name || `ID: ${row.actor_id}` }}
        </template>
      </el-table-column>

      <!-- Сообщение -->
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
import { Search, Refresh } from '@element-plus/icons-vue'
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

// === Серверные данные ===
const eventTypes = ref([])
const eventTypesLoading = ref(false)

// === Статические значения ===
const ACCESS_SCOPES = ['Admin', 'Specialist', 'Supervisor', 'Employee']

// === Локальные фильтры ===
const logSearch = ref('')
const eventTypeFilter = ref('')
const accessScopeFilter = ref('')
const dateRange = ref(null)

// === Для отслеживания "эха" от родителя ===
const lastEmittedFilters = ref(null)

// === Загрузка типов событий с сервера ===
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

// === Инициализация дат по умолчанию ===
const getDefaultDateRange = () => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const formatDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  yesterday.setHours(0, 0, 0, 0)
  today.setHours(23, 59, 59, 999)

  return [formatDate(yesterday), formatDate(today)]
}

// === Локальная фильтрация (поиск по сообщению) ===
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

// === Сбор ВСЕХ фильтров (включая null для очищенных) ===
const collectAllFilters = () => ({
  event_type: eventTypeFilter.value || null,
  access_scope: accessScopeFilter.value || null,
  start_date: dateRange.value?.[0] || null,
  end_date: dateRange.value?.[1] || null,
})

// === Применение фильтров ===
const applyFilters = () => {
  const filters = collectAllFilters()

  // ✅ Отправляем ВСЕ фильтры, включая null (родитель очистит лишнее)
  emit('update:apiFilters', filters)
  emit('refresh')

  // ✅ Сохраняем для сравнения с "эхом" от родителя
  lastEmittedFilters.value = { ...filters }
}

// === Единый обработчик изменений ===
const onFilterChange = () => {
  applyFilters()
}

// === Обработчик очистки дат ===
const onDateRangeClear = () => {
  dateRange.value = null
  applyFilters()
}

// === Локальный поиск (не триггерит сервер) ===
const applyLocalFilters = () => {
  // Только пересчитывает displayedLogs через computed
}

// === Форматирование ===
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

// === Сброс всех фильтров ===
const resetFilters = () => {
  logSearch.value = ''
  eventTypeFilter.value = ''
  accessScopeFilter.value = ''
  dateRange.value = getDefaultDateRange()

  // ✅ Отправляем только даты (остальные фильтры очищены = null)
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

// === Синхронизация локальных фильтров с пропсами ===
const syncFiltersFromProps = (newFilters) => {
  // Синхронизация дат
  if (newFilters?.start_date && newFilters?.end_date) {
    dateRange.value = [newFilters.start_date, newFilters.end_date]
  } else {
    dateRange.value = null
  }

  // Синхронизация типа события (может быть пустая строка после очистки)
  if (newFilters?.event_type !== undefined) {
    eventTypeFilter.value = newFilters.event_type || ''
  }

  // Синхронизация доступа
  if (newFilters?.access_scope !== undefined) {
    accessScopeFilter.value = newFilters.access_scope || ''
  }
}

// === Инициализация при монтировании ===
onMounted(async () => {
  await fetchEventTypes()

  // ✅ Если есть фильтры от родителя — синхронизируем
  if (Object.keys(props.apiFilters).length > 0) {
    syncFiltersFromProps(props.apiFilters)
  } else {
    // ✅ Иначе устанавливаем дефолтные даты и применяем
    dateRange.value = getDefaultDateRange()
    applyFilters()
  }
})

// ✅ Watch на apiFilters с защитой от "эха"
watch(
  () => props.apiFilters,
  (newFilters) => {
    // Если новые фильтры совпадают с последними отправленными — это наше "эхо", игнорируем
    if (
      lastEmittedFilters.value &&
      JSON.stringify(newFilters) === JSON.stringify(lastEmittedFilters.value)
    ) {
      return
    }

    // Иначе — это внешнее изменение (переключение вкладки, сброс), синхронизируем
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

/* Адаптивность */
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
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
    max-width: none;
  }

  .filter-select.date-range {
    width: 100%;
  }
}
</style>
