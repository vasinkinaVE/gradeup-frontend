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
      <!-- Поиск по сообщению (локальный, т.к. API не поддерживает full-text search) -->
      <el-input
        v-model="logSearch"
        placeholder="Поиск по сообщению"
        :prefix-icon="Search"
        clearable
        class="search-input"
        @input="applyLocalFilters"
      />

      <!-- Тип события (из серверных enum) -->
      <el-select
        v-model="eventTypeFilter"
        placeholder="Тип события"
        clearable
        class="filter-select"
        @change="applyFilters"
      >
        <el-option
          v-for="type in EVENT_TYPES"
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
        @change="applyFilters"
      >
        <el-option v-for="scope in ACCESS_SCOPES" :key="scope" :label="scope" :value="scope" />
      </el-select>

      <!-- Тип цели -->
      <el-select
        v-model="targetTypeFilter"
        placeholder="Тип цели"
        clearable
        class="filter-select"
        @change="applyFilters"
      >
        <el-option
          v-for="type in TARGET_TYPES"
          :key="type"
          :label="getTargetTypeLabel(type)"
          :value="type"
        />
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
        @change="applyFilters"
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

      <!-- Тип цели -->
      <el-table-column prop="target_type" label="Цель" width="130">
        <template #default="{ row }">
          <span v-if="row.target_type">
            {{ getTargetTypeLabel(row.target_type) }}
          </span>
          <span v-else class="text-muted">—</span>
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
  // ✅ Новые пропсы для передачи фильтров на сервер
  apiFilters: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:logs', 'refresh', 'update:apiFilters'])

// === Константы из серверных Enum ===
const EVENT_TYPES = [
  'EVALUATE',
  'GRADEUP',
  'SCHEDULE_MEETING',
  'MEETING_CHANGED',
  'REGISTRATION',
  'SET_PROFILE',
  'SET_DEPARTMENT_SUPERVISOR',
  'SET_DIVISION_SUPERVISOR',
  'REMOVE_DEPARTMENT_SUPERVISOR',
  'REMOVE_DIVISION_SUPERVISOR',
  'ROLE_CHANGED',
]

const TARGET_TYPES = ['USER', 'DEPARTMENT', 'DIVISION', 'USER_STAGE', 'USER_PROFILE', 'MEETING']

const ACCESS_SCOPES = ['Admin', 'Specialist', 'Supervisor', 'Employee']

// === Локальные фильтры ===
const logSearch = ref('')
const eventTypeFilter = ref('')
const accessScopeFilter = ref('')
const targetTypeFilter = ref('')
const dateRange = ref(null) // [start, end] в формате YYYY-MM-DDTHH:mm:ss

// === Инициализация дат по умолчанию: вчера — сегодня ===
const getDefaultDateRange = () => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  // Форматируем в нужный формат: YYYY-MM-DDTHH:mm:ss
  const formatDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  // Начало вчера: 00:00:00
  yesterday.setHours(0, 0, 0, 0)
  // Конец сегодня: 23:59:59
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

// === Применение фильтров (отправка на сервер) ===
const applyFilters = () => {
  const filters = {
    event_type: eventTypeFilter.value || null,
    access_scope: accessScopeFilter.value || null,
    target_type: targetTypeFilter.value || null,
    start_date: dateRange.value?.[0] || null,
    end_date: dateRange.value?.[1] || null,
  }

  const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v != null))

  emit('update:apiFilters', cleanFilters)
  emit('refresh')
}

const applyLocalFilters = () => {
  // Только обновляет отображение через computed свойство
}

// === Обработчик очистки дат ===
const onDateRangeClear = () => {
  dateRange.value = null
  applyFilters()
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

const getTargetTypeLabel = (type) => {
  const labels = {
    USER: 'Пользователь',
    DEPARTMENT: 'Отдел',
    DIVISION: 'Направление',
    USER_STAGE: 'Этап пользователя',
    USER_PROFILE: 'Профиль пользователя',
    MEETING: 'Встреча',
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
  targetTypeFilter.value = ''
  // ✅ При сбросе восстанавливаем дефолтный диапазон дат
  dateRange.value = getDefaultDateRange()
  emit('update:apiFilters', {
    start_date: dateRange.value[0],
    end_date: dateRange.value[1],
  })
  emit('refresh')
}

// === Инициализация при монтировании ===
onMounted(() => {
  // ✅ Если фильтры не переданы извне — устанавливаем дефолтные даты
  if (!props.apiFilters?.start_date && !props.apiFilters?.end_date) {
    dateRange.value = getDefaultDateRange()
    // ✅ Автоматически применяем фильтры при первой загрузке
    applyFilters()
  } else {
    // ✅ Если фильтры переданы — синхронизируем локальное состояние
    if (props.apiFilters.start_date && props.apiFilters.end_date) {
      dateRange.value = [props.apiFilters.start_date, props.apiFilters.end_date]
    }
  }
})

// ✅ Следим за изменениями apiFilters из родителя
watch(
  () => props.apiFilters,
  (newFilters) => {
    if (newFilters?.start_date && newFilters?.end_date) {
      dateRange.value = [newFilters.start_date, newFilters.end_date]
    } else if (!newFilters?.start_date && !newFilters?.end_date) {
      // Если родитель сбросил фильтры — восстанавливаем дефолтные даты
      dateRange.value = getDefaultDateRange()
    }
  },
  { deep: true },
)

defineExpose({
  resetFilters,
  applyFilters,
  getDefaultDateRange, // ✅ Экспортируем для возможного использования извне
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

.text-muted {
  color: var(--gray);
  font-size: 13px;
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
