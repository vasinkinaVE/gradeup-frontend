<!-- src/components/control/MeetingSection.vue -->
<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление встречами</h2>
      <el-button type="primary" @click="openMeetingDialog()">
        <el-icon><Plus /></el-icon>
        Создать встречу
      </el-button>
    </div>

    <!-- Поиск -->
    <div class="filters-row">
      <el-input
        v-model="meetingSearch"
        placeholder="Поиск по названию навыка"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <!-- Таблица встреч -->
    <el-table :data="filteredMeetings" stripe border class="data-table">
      <el-table-column prop="skillName" label="Навык" min-width="200" />
      <el-table-column prop="stageType" label="Тип этапа" width="150">
        <template #default="{ row }">
          <el-tag size="small" :type="getStageTypeTag(row.stageType)">
            {{ getStageTypeLabel(row.stageType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="date" label="Дата и время" width="160" sortable />
      <el-table-column prop="location" label="Место" width="150" />
      <el-table-column prop="duration" label="Длительность" width="100" align="center">
        <template #default="{ row }"> {{ row.duration }} мин. </template>
      </el-table-column>
      <el-table-column prop="participants" label="Участники" min-width="200">
        <template #default="{ row }">
          <div class="participants-display">
            <el-tag size="small" type="warning">Аттестуемый: {{ row.attestedName }}</el-tag>
            <el-tag size="small" type="success">Аттестующий: {{ row.attestorName }}</el-tag>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- ✅ Подключенный компонент MeetingDialog -->
    <MeetingDialog
      v-model="meetingDialogVisible"
      :meeting="editingMeeting"
      :skills="skills"
      :employees="employees"
      @save="handleMeetingSave"
      @close="meetingDialogVisible = false"
    />
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import MeetingDialog from '@/components/common/MeetingDialog.vue'

const props = defineProps({
  meetings: {
    type: Array,
    required: true,
  },
  skills: {
    type: Array,
    required: true,
  },
  employees: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['update:meetings'])

// === Поиск ===
const meetingSearch = ref('')

const filteredMeetings = computed(() => {
  if (!meetingSearch.value) return props.meetings
  const q = meetingSearch.value.toLowerCase()
  return props.meetings.filter((m) => m.skillName?.toLowerCase().includes(q))
})

// === Модальное окно ===
const meetingDialogVisible = ref(false)
const editingMeeting = ref(null)

// === Хелперы ===
const getStageTypeLabel = (type) =>
  ({
    attestation: 'Аттестация',
    practice: 'Практика',
    performance: 'Perf. Review',
  })[type] || type

const getStageTypeTag = (type) =>
  ({
    attestation: 'warning',
    practice: 'success',
    performance: 'danger',
  })[type] || 'info'

// === Встречи: действия ===
const openMeetingDialog = (meeting = null) => {
  editingMeeting.value = meeting
  meetingDialogVisible.value = true
}

const handleMeetingSave = (meetingData, originalMeeting) => {
  if (originalMeeting) {
    // Редактирование
    const idx = props.meetings.findIndex((m) => m.id === originalMeeting.id)
    if (idx !== -1) {
      const updated = [...props.meetings]
      updated[idx] = { ...updated[idx], ...meetingData }
      emit('update:meetings', updated)
    }
    ElMessage.success('Встреча обновлена')
  } else {
    // Создание
    const newMeeting = {
      id: Date.now(),
      ...meetingData,
    }
    emit('update:meetings', [newMeeting, ...props.meetings])
    ElMessage.success('Встреча создана')
  }
  meetingDialogVisible.value = false
}

const deleteMeeting = async (meeting) => {
  try {
    await ElMessageBox.confirm(
      `Удалить встречу по навыку "${meeting.skillName}"?`,
      'Подтверждение',
      { type: 'warning' },
    )
    emit(
      'update:meetings',
      props.meetings.filter((m) => m.id !== meeting.id),
    )
    ElMessage.success('Встреча удалена')
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
}

/* Участники в таблице */
.participants-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
