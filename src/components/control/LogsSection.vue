<!-- src/components/control/LogsSection.vue -->
<template>
  <section class="tab-content">
    <!-- Заголовок секции (кнопка обновить удалена) -->
    <div class="section-header">
      <h2>Журнал событий</h2>
    </div>

    <!-- Поиск и фильтры -->
    <div class="filters-row">
      <!-- Поиск по сообщению (локальный, так как нет в API) -->
      <el-input
        v-model="logSearch"
        placeholder="Поиск по сообщению"
        :prefix-icon="Search"
        clearable
        class="search-input"
        @input="applyLocalFilters"
      />

      <!-- Тип события (event_type) -->
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
        value-format="YYYY-MM-DD"
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

// === Серверные данные ===
const eventTypes = ref([])
const eventTypesLoading = ref(false)

// === Статические значения (из API spec) ===
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
    // Предполагаем, что эндпоинт для типов событий отдельный
    const res = await fetch(`${API_BASE}/admin/event-types`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

    const data = await res.json()

    if (data && typeof data === 'object') {
      // Фильтруем значения, доступные для event_type
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

// === Инициализация дат по умолчанию (формат: YYYY-MM-DD) ===
const getDefaultDateRange = () => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  // ✅ Форматируем как YYYY-MM-DD (без времени)
  const formatDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }

  return [formatDate(yesterday), formatDate(today)]
}

// === Локальная фильтрация (только поиск по сообщению) ===
// Этот метод НЕ триггерит запрос к серверу
const displayedLogs = computed(() => {
  let result = [...props.logs]

  // Применяем только локальный поиск по тексту
  if (logSearch.value?.trim()) {
    const q = logSearch.value.toLowerCase()
    result = result.filter((log) => log.message?.toLowerCase().includes(q))
  }

  // Сортировка по дате (новые сверху)
  return result.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime()
    const timeB = new Date(b.created_at || 0).getTime()
    return timeB - timeA
  })
})

// === Сбор ВСЕХ фильтров для отправки на сервер ===
const collectAllFilters = () => ({
  event_type: eventTypeFilter.value || null,
  access_scope: accessScopeFilter.value || null,
  start_date: dateRange.value?.[0] || null,
  end_date: dateRange.value?.[1] || null,
  // actor_id и target_id не реализованы в UI, но могут быть добавлены при необходимости
})

// === Применение фильтров (отправка родителю) ===
// Родитель должен перехватить 'update:apiFilters' и выполнить запрос к /admin/events
const applyFilters = () => {
  const filters = collectAllFilters()

  // Отправляем фильтры родителю
  emit('update:apiFilters', filters)
  emit('refresh') // Сигнал родителю, что нужно обновить данные

  // Сохраняем копию для защиты от "эха"
  lastEmittedFilters.value = { ...filters }
}

// === Единый обработчик изменений фильтров ===
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
  // Просто пересчитывает displayedLogs через computed свойство
}

// === Форматирование даты для отображения в таблице ===
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

// === Маппинг меток для типов событий ===
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

// === Цвета тегов для типов событий ===
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

  // Сбрасываем фильтры для сервера (оставляем только даты по умолчанию)
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

// === Синхронизация локальных фильтров с пропсами (от родителя) ===
const syncFiltersFromProps = (newFilters) => {
  // Синхронизация дат
  if (newFilters?.start_date && newFilters?.end_date) {
    dateRange.value = [newFilters.start_date, newFilters.end_date]
  } else {
    dateRange.value = null
  }

  // Синхронизация типа события
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

  // Если есть фильтры от родителя — синхронизируем
  if (Object.keys(props.apiFilters).length > 0) {
    syncFiltersFromProps(props.apiFilters)
  } else {
    // Иначе устанавливаем дефолтные даты и применяем
    dateRange.value = getDefaultDateRange()
    applyFilters()
  }
})

// Watch на apiFilters с защитой от "эха" (когда родитель отдает обратно то, что мы отправили)
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

/* ✅ Горизонтальная прокрутка таблицы */
:deep(.data-table.el-table),
:deep(.data-table .el-table__body-wrapper) {
  overflow-x: auto;
}

/* ✅ Фиксация первого столбца (Дата и время) */
:deep(.data-table .el-table__body tr > td:first-child),
:deep(.data-table .el-table__header tr > th:first-child) {
  position: sticky;
  left: 0;
  z-index: 10;
  background: #fff;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05);
}

/* ✅ Корректный фон при наведении на строку для фиксированной ячейки */
:deep(.data-table .el-table__body tr:hover > td:first-child) {
  background: #f5f7fa !important;
}
:deep(.data-table .el-table__body tr.el-table__row--striped:hover > td:first-child) {
  background: #fafafa !important;
}

/* ✅ Фон заголовка фиксированного столбца */
:deep(.data-table .el-table__header tr > th:first-child) {
  background: #fafafa;
}

/* ✅ Адаптивность: при ≤ 1180px — два ряда фильтров */
@media (max-width: 1180px) {
  .filters-row {
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  /* Поиск всегда первый */
  .search-input {
    order: 0;
    flex: 1 1 45%;
    max-width: 48%;
    min-width: 160px;
  }

  /* Даты сразу после поиска (в том же ряду) */
  .filter-select.date-range {
    order: 1;
    flex: 1 1 45%;
    max-width: 48%;
    min-width: 200px;
  }

  /* Фильтры на втором ряду */
  .filter-select:not(.date-range) {
    order: 2;
    flex: 1 1 45%;
    max-width: 48%;
    min-width: 130px;
  }
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

/* ✅ При ≤ 768px: чёткое разделение на две строки */
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

  /* Строка 1: Поиск + Даты */
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

  /* Строка 2: Тип события + Доступ */
  .filter-select:not(.date-range) {
    order: 2;
    flex: 1 1 48%;
    max-width: 48%;
    min-width: 130px;
  }
}

/* ✅ При ≤ 480px: всё в одну колонку для удобства */
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
