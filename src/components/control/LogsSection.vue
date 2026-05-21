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
      <el-input
        v-model="logSearch"
        placeholder="Поиск по сообщению или типу"
        :prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select
        v-model="eventTypeFilter"
        placeholder="Тип события"
        clearable
        class="filter-select"
      >
        <el-option v-for="type in uniqueEventTypes" :key="type" :label="type" :value="type" />
      </el-select>
      <el-date-picker
        v-model="dateFilter"
        type="date"
        placeholder="Фильтр по дате"
        clearable
        class="filter-select"
        value-format="YYYY-MM-DD"
      />
    </div>

    <!-- Таблица логов -->
    <el-table :data="filteredLogs" stripe border class="data-table">
      <!-- Дата и время -->
      <el-table-column prop="timestamp" label="Дата и время" width="170" sortable>
        <template #default="{ row }">
          {{ formatDateTime(row.timestamp) }}
        </template>
      </el-table-column>

      <!-- Тип события -->
      <el-table-column prop="event_type" label="Тип события" width="140">
        <template #default="{ row }">
          <el-tag size="small" :type="getEventTypeTag(row.event_type)">
            {{ row.event_type || '—' }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- Кто -->
      <el-table-column prop="actor" label="Кто" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatActor(row.actor) }}
        </template>
      </el-table-column>

      <!-- Кому -->
      <el-table-column prop="target" label="Кому" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.target || '—' }}
        </template>
      </el-table-column>

      <!-- Сообщение -->
      <el-table-column prop="message" label="Сообщение" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.message || '—' }}
        </template>
      </el-table-column>
    </el-table>
    <!-- ✅ Пустое состояние обрабатывается самим el-table -->
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'

const props = defineProps({
  logs: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:logs', 'refresh'])

// === Поиск и фильтры ===
const logSearch = ref('')
const eventTypeFilter = ref('')
const dateFilter = ref('')

// Уникальные типы событий для фильтра
const uniqueEventTypes = computed(() => {
  const types = new Set(props.logs.map((log) => log.event_type).filter(Boolean))
  return Array.from(types)
})

// Фильтрация логов
const filteredLogs = computed(() => {
  let result = [...props.logs]

  // Поиск по тексту
  if (logSearch.value) {
    const q = logSearch.value.toLowerCase()
    result = result.filter(
      (log) =>
        log.message?.toLowerCase().includes(q) ||
        log.event_type?.toLowerCase().includes(q) ||
        log.actor?.toLowerCase?.().includes(q) ||
        log.target?.toLowerCase?.().includes(q),
    )
  }

  // Фильтр по типу события
  if (eventTypeFilter.value) {
    result = result.filter((log) => log.event_type === eventTypeFilter.value)
  }

  // Фильтр по дате
  if (dateFilter.value) {
    result = result.filter((log) => {
      if (!log.timestamp) return false
      const logDate = new Date(log.timestamp).toISOString().split('T')[0]
      return logDate === dateFilter.value
    })
  }

  // Сортировка: новые сверху
  return result.sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime()
    const timeB = new Date(b.timestamp || 0).getTime()
    return timeB - timeA
  })
})

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

const formatActor = (actor) => {
  if (!actor) return '—'
  if (typeof actor === 'string') return actor
  if (typeof actor === 'object') {
    return actor.name || actor.username || actor.email || 'Система'
  }
  return String(actor)
}

// === Цвет тега для типа события ===
const getEventTypeTag = (type) => {
  const map = {
    create: 'success',
    update: 'warning',
    delete: 'danger',
    login: '',
    logout: 'info',
    error: 'danger',
    access: 'warning',
  }
  return map[type?.toLowerCase()] || 'info'
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

.filter-select {
  min-width: 160px;
  max-width: 200px;
}

.data-table {
  width: 100%;
  margin-bottom: var(--spacing-md);
}

/* Адаптивность */
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .filters-row {
    flex-direction: column;
  }

  .search-input,
  .filter-select {
    width: 100%;
    max-width: none;
  }
}
</style>
