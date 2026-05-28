<!-- src/components/common/MeetingDialog.vue -->
<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEditing ? 'Редактирование встречи' : 'Новая встреча'"
    :width="550"
    class="admin-dialog meeting-dialog"
    destroy-on-close
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-position="top" class="meeting-form">
      <!-- ✅ Участники -->
      <el-form-item label="Участники *" prop="participants">
        <div class="participants-section">
          <!-- Аттестуемый -->
          <div class="participant-row">
            <span class="participant-label">Аттестуемый:</span>
            <el-select
              v-model="form.student_id"
              placeholder="Выберите аттестуемого"
              filterable
              class="participant-select"
              :disabled="isEditing"
              @change="onStudentChange"
              :loading="employeesLoading"
            >
              <el-option
                v-for="emp in employeesList"
                :key="emp.id"
                :label="
                  `${emp.last_name} ${emp.first_name} ${emp.patronymic || ''} — ${emp.department_name || 'Без отдела'}`.trim()
                "
                :value="emp.id"
              >
                <div class="option-content">
                  <span class="option-name">{{
                    `${emp.last_name} ${emp.first_name} ${emp.patronymic || ''}`.trim()
                  }}</span>
                  <span class="option-department">{{ emp.department_name || 'Без отдела' }}</span>
                </div>
              </el-option>
            </el-select>
          </div>
          <!-- Аттестующий -->
          <div class="participant-row">
            <span class="participant-label">Аттестующий:</span>
            <el-select
              v-model="form.examiner_id"
              placeholder="Выберите аттестующего"
              filterable
              class="participant-select"
              :loading="employeesLoading"
            >
              <el-option
                v-for="emp in availableExaminers"
                :key="emp.id"
                :label="
                  `${emp.last_name} ${emp.first_name} ${emp.patronymic || ''} — ${emp.department_name || 'Без отдела'}`.trim()
                "
                :value="emp.id"
                :disabled="emp.id === form.student_id"
              >
                <div class="option-content">
                  <span class="option-name">{{
                    `${emp.last_name} ${emp.first_name} ${emp.patronymic || ''}`.trim()
                  }}</span>
                  <span class="option-department">{{ emp.department_name || 'Без отдела' }}</span>
                </div>
              </el-option>
            </el-select>
          </div>
        </div>
      </el-form-item>

      <!-- ✅ Навык (без prop — валидируем через stage_id) -->
      <el-form-item label="Навык *">
        <el-select
          v-model="selectedSkillId"
          placeholder="Сначала выберите аттестуемого"
          filterable
          class="full-width-select"
          :disabled="!form.student_id || skillsLoading"
          @change="onSkillChange"
        >
          <el-option
            v-for="skill in availableSkills"
            :key="skill.id"
            :label="skill.title"
            :value="skill.id"
          />
        </el-select>
        <div v-if="skillsLoading" class="loading-text">Загрузка навыков...</div>
      </el-form-item>

      <!-- ✅ Тип этапа (prop="stage_id" — валидация выбора конкретного этапа) -->
      <el-form-item label="Тип этапа *" prop="stage_id">
        <el-select
          v-model="form.stage_id"
          placeholder="Сначала выберите навык"
          class="full-width-select"
          :disabled="!selectedSkillId"
        >
          <el-option
            v-for="stage in availableStages"
            :key="stage.id"
            :label="getStageTypeLabel(stage.confirmation_type)"
            :value="stage.id"
          />
        </el-select>
      </el-form-item>

      <!-- ✅ Дата/время и Длительность -->
      <div class="form-row with-top-margin">
        <el-form-item label="Дата и время *" prop="started_at" class="form-col">
          <el-date-picker
            v-model="form.started_at"
            type="datetime"
            placeholder="Выберите дату"
            value-format="YYYY-MM-DDTHH:mm:ss"
            class="full-width-select"
            :disabled-date="disablePastDates"
          />
        </el-form-item>
        <el-form-item label="Длительность (мин) *" prop="duration" class="form-col">
          <el-input-number
            v-model="form.duration"
            :min="15"
            :max="480"
            :step="15"
            controls-position="right"
            class="full-width-input"
          />
        </el-form-item>
      </div>

      <!-- ✅ Место -->
      <el-form-item label="Место *" prop="location" class="with-top-margin">
        <el-input v-model="form.location" placeholder="Например: Переговорная 305, Zoom" />
      </el-form-item>

      <!-- ✅ Описание -->
      <el-form-item label="Описание" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Дополнительная информация о встрече"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">Отмена</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSave">
        {{ isEditing ? 'Сохранить' : 'Создать' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface Employee {
  id: number
  first_name: string
  last_name: string
  patronymic?: string
  department_name?: string
}

interface Skill {
  id: number
  title: string
  stages: Array<{ id: number; confirmation_type: string }>
}

interface AvailableSkillsResponse {
  profile_id: number
  user_id: number
  current_level: {
    num: number
    level_name: string
    skills: Skill[]
  }
}

interface MeetingForm {
  student_id: number | null
  examiner_id: number | null
  stage_id: number | null
  started_at: string | null
  location: string
  duration: number
  description: string
}

const props = defineProps<{
  modelValue: boolean
  meeting?: {
    id: number
    student: { id: number; full_name: string }
    examiner: { id: number; full_name: string }
    stage_id: number
    started_at: string
    location: string
    duration: number
    description?: string
    skill_title?: string
    confirmation_type?: string
  } | null
  employees?: Employee[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', meeting: any): void
  (e: 'close'): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const isEditing = computed(() => !!props.meeting?.id)

const formRef = ref()
const submitting = ref(false)
const skillsLoading = ref(false)
const employeesLoading = ref(false)

const form = ref<MeetingForm>({
  student_id: null,
  examiner_id: null,
  stage_id: null,
  started_at: null,
  location: '',
  duration: 60,
  description: '',
})

// ✅ Локальный список сотрудников (загружается внутри компонента)
const employeesList = ref<Employee[]>([])

const selectedSkillId = ref<number | null>(null)
const availableSkills = ref<Skill[]>([])
const availableStages = ref<Array<{ id: number; confirmation_type: string }>>([])

// ✅ Правила валидации (убрано skill_id — валидируем только stage_id)
const rules = {
  student_id: [{ required: true, message: 'Выберите аттестуемого', trigger: 'change' }],
  examiner_id: [{ required: true, message: 'Выберите аттестующего', trigger: 'change' }],
  stage_id: [{ required: true, message: 'Выберите этап', trigger: 'change' }],
  started_at: [{ required: true, message: 'Выберите дату', trigger: 'change' }],
  location: [{ required: true, message: 'Укажите место', trigger: 'blur' }],
  duration: [{ required: true, message: 'Укажите длительность', trigger: 'blur' }],
}

// ✅ Фильтрация: аттестующий не может быть тем же, кто выбран как аттестуемый
const availableExaminers = computed(() => {
  if (!Array.isArray(employeesList.value)) return []
  return employeesList.value.filter((emp) => emp.id !== form.value.student_id)
})

// ✅ Загрузка сотрудников с only_subordinates=true
const fetchAvailableEmployees = async () => {
  try {
    employeesLoading.value = true
    const url = `${API_BASE}/users/?only_subordinates=true`
    const res = await axios.get<Employee[]>(url, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })

    employeesList.value = res.data.map((emp) => ({
      id: emp.id,
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      patronymic: emp.patronymic || '',
      department_name: emp.department_name || '',
    }))

    console.log('✅ MeetingDialog: employees loaded:', employeesList.value.length)
  } catch (err: any) {
    console.error('❌ Error fetching employees for meetings:', err)
    ElMessage.error('Не удалось загрузить список сотрудников')
    employeesList.value = []
  } finally {
    employeesLoading.value = false
  }
}

// ✅ Загрузка формы при редактировании
const loadMeeting = () => {
  if (props.meeting) {
    form.value = {
      student_id: props.meeting.student?.id ?? null,
      examiner_id: props.meeting.examiner?.id ?? null,
      stage_id: props.meeting.stage_id ?? null,
      started_at: props.meeting.started_at ?? null,
      location: props.meeting.location || '',
      duration: props.meeting.duration || 60,
      description: props.meeting.description || '',
    }
    // При редактировании загружаем навыки для аттестуемого
    if (form.value.student_id) {
      loadAvailableSkills(form.value.student_id)
    }
  } else {
    resetForm()
  }
}

const resetForm = () => {
  form.value = {
    student_id: null,
    examiner_id: null,
    stage_id: null,
    started_at: null,
    location: '',
    duration: 60,
    description: '',
  }
  selectedSkillId.value = null
  availableSkills.value = []
  availableStages.value = []
}

// ✅ Загрузка доступных навыков для аттестуемого: GET /users/{user_id}/skills/available
const loadAvailableSkills = async (userId: number) => {
  try {
    skillsLoading.value = true
    availableSkills.value = []
    availableStages.value = []
    selectedSkillId.value = null
    form.value.stage_id = null

    const res = await axios.get<AvailableSkillsResponse>(
      `${API_BASE}/users/${userId}/skills/available`,
    )

    if (res.data && res.data.current_level && Array.isArray(res.data.current_level.skills)) {
      availableSkills.value = res.data.current_level.skills
    } else {
      console.warn('Неверный формат ответа API навыков:', res.data)
      ElMessage.warning('Навыки не найдены или неверный формат ответа')
    }
  } catch (err: any) {
    console.error('Ошибка загрузки навыков:', err)
    const errorMsg =
      err.response?.data?.detail || err.message || 'Не удалось загрузить доступные навыки'
    ElMessage.error(errorMsg)
    availableSkills.value = []
  } finally {
    skillsLoading.value = false
  }
}

// ✅ Обработчик изменения аттестуемого
const onStudentChange = (userId: number) => {
  if (userId) {
    loadAvailableSkills(userId)
    if (form.value.examiner_id === userId) {
      form.value.examiner_id = null
    }
  } else {
    availableSkills.value = []
    availableStages.value = []
    selectedSkillId.value = null
    form.value.stage_id = null
  }
}

// ✅ Обработчик изменения навыка
const onSkillChange = (skillId: number) => {
  const skill = availableSkills.value.find((s) => s.id === skillId)
  if (skill && Array.isArray(skill.stages)) {
    availableStages.value = skill.stages
  } else {
    availableStages.value = []
  }
  form.value.stage_id = null
}

// ✅ Форматирование типа этапа
const getStageTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    Аттестация: 'Аттестация',
    'Практическое задание': 'Практическое задание',
    'Performance review': 'Performance review',
  }
  return map[type] || type
}

// ✅ Валидация даты: нельзя выбрать прошлое
const disablePastDates = (date: Date) => {
  return date.getTime() < Date.now() - 60 * 60 * 1000
}

// ✅ Сохранение: POST или PUT
const handleSave = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('Заполните все обязательные поля')
    return
  }
  submitting.value = true
  try {
    const payload = {
      stage_id: form.value.stage_id,
      started_at: form.value.started_at,
      location: form.value.location,
      duration: form.value.duration,
      description: form.value.description || '',
      student_id: form.value.student_id,
      examiner_id: form.value.examiner_id,
    }

    let response
    if (isEditing.value && props.meeting?.id) {
      const { student_id, ...editPayload } = payload
      response = await axios.put(`${API_BASE}/meetings/${props.meeting.id}`, editPayload)
      ElMessage.success('Встреча обновлена')
    } else {
      response = await axios.post(`${API_BASE}/meetings/`, payload)
      ElMessage.success('Встреча создана')
    }

    emit('save', response.data)
    dialogVisible.value = false
  } catch (err: any) {
    console.error('Ошибка сохранения встречи:', err)
    const msg =
      err.response?.data?.detail?.[0]?.msg ||
      err.response?.data?.detail ||
      'Ошибка при сохранении встречи'
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  dialogVisible.value = false
}

const handleClose = () => {
  emit('close')
  resetForm()
}

// ✅ Watchers
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      fetchAvailableEmployees()
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

onMounted(() => {
  if (props.modelValue) {
    fetchAvailableEmployees()
  }
})
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

.option-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.option-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-department {
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.loading-text {
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
  margin-top: 4px;
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
