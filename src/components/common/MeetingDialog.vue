<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEditing ? 'Редактирование встречи' : 'Новая встреча'"
    :width="700"
    class="admin-dialog meeting-dialog"
    destroy-on-close
    @close="handleClose"
  >
    <el-form :model="form" label-position="top" class="meeting-form">
      <!-- Участники -->
      <el-form-item label="Участники *" prop="participants">
        <div class="participants-section">
          <div class="participant-row">
            <span class="participant-label">Аттестуемый:</span>
            <el-select
              v-model="form.attestedId"
              placeholder="Выберите аттестуемого"
              filterable
              class="participant-select"
            >
              <el-option
                v-for="emp in employees"
                :key="emp.id"
                :label="emp.fullName"
                :value="emp.id"
              />
            </el-select>
          </div>
          <div class="participant-row">
            <span class="participant-label">Аттестующий:</span>
            <el-select
              v-model="form.attestorId"
              placeholder="Выберите аттестующего"
              filterable
              class="participant-select"
            >
              <el-option
                v-for="emp in employees"
                :key="emp.id"
                :label="emp.fullName"
                :value="emp.id"
                :disabled="emp.id === form.attestedId"
              />
            </el-select>
          </div>
        </div>
      </el-form-item>

      <!-- Навык -->
      <el-form-item label="Навык *" prop="skillId">
        <el-select
          v-model="form.skillId"
          placeholder="Выберите навык для защиты"
          filterable
          @change="onSkillChange"
        >
          <el-option
            v-for="skill in skills"
            :key="skill.id"
            :label="skill.name"
            :value="skill.id"
          />
        </el-select>
      </el-form-item>

      <!-- Тип этапа -->
      <el-form-item label="Тип этапа *" prop="stageType">
        <el-select v-model="form.stageType" placeholder="Выберите тип этапа">
          <el-option label="Аттестация" value="attestation" />
          <el-option label="Практика" value="practice" />
          <el-option label="Perf. Review" value="performance" />
        </el-select>
      </el-form-item>

      <el-form-item label="Дата и время *" prop="date">
        <el-date-picker
          v-model="form.date"
          type="datetime"
          placeholder="Выберите дату"
          value-format="YYYY-MM-DD HH:mm"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="Место *" prop="location">
        <el-input v-model="form.location" placeholder="Например: Zoom, переговорная 301" />
      </el-form-item>

      <el-form-item label="Длительность (минуты) *" prop="duration">
        <el-input-number
          v-model="form.duration"
          :min="15"
          :max="180"
          :step="15"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>

      <!-- Описание встречи -->
      <el-form-item label="Описание" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Описание встречи, дополнительные заметки"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">Отмена</el-button>
      <el-button type="primary" @click="handleSave">Сохранить</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: Boolean,
  meeting: Object,
  skills: {
    type: Array,
    default: () => [],
  },
  employees: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const isEditing = computed(() => !!props.meeting)

const form = ref({
  skillId: null,
  skillName: '',
  stageType: 'attestation',
  attestedId: null,
  attestorId: null,
  attestedName: '',
  attestorName: '',
  date: '',
  location: '',
  duration: 60,
  description: '',
})

const resetForm = () => {
  form.value = {
    skillId: null,
    skillName: '',
    stageType: 'attestation',
    attestedId: null,
    attestorId: null,
    attestedName: '',
    attestorName: '',
    date: '',
    location: '',
    duration: 60,
    description: '',
  }
}

const loadMeeting = () => {
  if (props.meeting) {
    form.value = JSON.parse(JSON.stringify(props.meeting))
  } else {
    resetForm()
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      loadMeeting()
    }
  },
  { immediate: true },
)

watch(
  () => props.meeting,
  () => {
    if (props.modelValue) {
      loadMeeting()
    }
  },
  { deep: true },
)

const onSkillChange = (skillId) => {
  const skill = props.skills.find((s) => s.id === skillId)
  if (skill) {
    form.value.skillName = skill.name
  }
}

const handleSave = () => {
  if (!form.value.skillId || !form.value.date || !form.value.location) {
    ElMessage.warning('Заполните все обязательные поля')
    return
  }

  if (!form.value.attestedId || !form.value.attestorId) {
    ElMessage.warning('Выберите аттестуемого и аттестующего')
    return
  }

  const attested = props.employees.find((e) => e.id === form.value.attestedId)
  const attestor = props.employees.find((e) => e.id === form.value.attestorId)

  const meetingData = {
    ...form.value,
    attestedName: attested?.fullName || '',
    attestorName: attestor?.fullName || '',
  }

  emit('save', meetingData, isEditing.value ? props.meeting : null)
  dialogVisible.value = false
}

const handleCancel = () => {
  dialogVisible.value = false
}

const handleClose = () => {
  emit('close')
  resetForm()
}
</script>

<style scoped>
.meeting-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}

.participants-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.participant-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.participant-label {
  min-width: 140px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

.participant-select {
  flex: 1;
}

@media (max-width: 768px) {
  .participant-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .participant-label {
    min-width: auto;
    margin-bottom: var(--spacing-xs);
  }

  .meeting-form {
    max-height: 60vh;
  }
}
</style>
