<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEditing ? 'Редактирование встречи' : 'Новая встреча'"
    :width="550"
    class="admin-dialog meeting-dialog"
    destroy-on-close
    @close="handleClose"
  >
    <el-form :model="form" label-position="top" class="meeting-form">
      <!-- Отдел (для admin и specialist) -->
      <el-form-item v-if="isAdmin || isSpecialist" label="Отдел *" prop="departmentId">
        <el-select
          v-model="form.departmentId"
          placeholder="Выберите отдел"
          filterable
          class="department-select"
        >
          <el-option
            v-for="dept in departments"
            :key="dept.id"
            :label="dept.name"
            :value="dept.id"
          />
        </el-select>
      </el-form-item>

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

      <!-- Навык и Тип этапа -->
      <div class="form-row">
        <el-form-item label="Навык *" prop="skillId" class="form-col">
          <el-select
            v-model="form.skillId"
            placeholder="Выберите навык для защиты"
            filterable
            class="full-width-select"
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
        <el-form-item label="Тип этапа *" prop="stageType" class="form-col">
          <el-select
            v-model="form.stageType"
            placeholder="Выберите тип этапа"
            class="full-width-select"
          >
            <el-option label="Аттестация" value="attestation" />
            <el-option label="Практика" value="practice" />
            <el-option label="Perf. Review" value="performance" />
          </el-select>
        </el-form-item>
      </div>

      <!-- Дата и время и Длительность -->
      <div class="form-row with-top-margin">
        <el-form-item label="Дата и время *" prop="date" class="form-col">
          <el-date-picker
            v-model="form.date"
            type="datetime"
            placeholder="Выберите дату"
            value-format="YYYY-MM-DD HH:mm"
            class="full-width-select"
          />
        </el-form-item>
        <el-form-item label="Длительность (мин) *" prop="duration" class="form-col">
          <el-input-number
            v-model="form.duration"
            :min="15"
            :max="180"
            :step="15"
            controls-position="right"
            class="full-width-input"
          />
        </el-form-item>
      </div>

      <!-- Место -->
      <el-form-item label="Место *" prop="location" class="with-top-margin">
        <el-input v-model="form.location" placeholder="Например: Zoom, переговорная 301" />
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
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: Boolean,
  meeting: Object,
  skills: { type: Array, default: () => [] },
  employees: { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const authStore = useAuthStore()

// Определение ролей
const isAdmin = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('admin') || role.includes('администратор')
})

const isSpecialist = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('specialist') || role.includes('специалист')
})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const isEditing = computed(() => !!props.meeting)

const form = ref({
  departmentId: null,
  departmentName: '',
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
    departmentId: null,
    departmentName: '',
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
  const department = props.departments.find((d) => d.id === form.value.departmentId)

  const meetingData = {
    ...form.value,
    attestedName: attested?.fullName || '',
    attestorName: attestor?.fullName || '',
    departmentName: department?.name || '',
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
  padding-right: var(--spacing-sm, 8px);
}

.form-row {
  display: flex;
  gap: var(--spacing-md, 12px);
  margin-bottom: 0;
}

.form-row.with-top-margin {
  margin-top: 18px;
}

.form-row .el-form-item {
  flex: 1;
  margin-bottom: 0;
}

.el-form-item.with-top-margin {
  margin-top: 18px;
}

.full-width-select,
.full-width-input {
  width: 100%;
}

.department-select {
  width: auto;
  min-width: 200px;
}

.participants-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 12px);
}

.participant-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 12px);
}

.participant-label {
  min-width: 140px;
  flex-shrink: 0;
  font-weight: var(--font-weight-medium, 500);
  color: var(--text, #303133);
}

.participant-select {
  flex: 1;
  min-width: 200px;
}

@media (max-width: 768px) {
  .participant-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .participant-label {
    min-width: auto;
    margin-bottom: var(--spacing-xs, 4px);
  }

  .participant-select {
    width: 100%;
    min-width: auto;
  }

  .form-row {
    flex-direction: column;
    gap: var(--spacing-sm, 8px);
  }

  .meeting-form {
    max-height: 60vh;
  }
}
</style>
