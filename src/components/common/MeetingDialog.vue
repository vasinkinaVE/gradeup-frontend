<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEditing ? 'Редактирование встречи' : 'Новая встреча'"
    width="95%"
    :style="{ maxWidth: '550px' }"
    class="admin-dialog meeting-dialog"
    destroy-on-close
    @close="handleClose"
    align-center
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-position="top" class="meeting-form">
      <el-form-item label="Участники" prop="participants">
        <div class="participants-section">
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

      <el-form-item label="Навык">
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

      <el-form-item label="Тип этапа" prop="stage_id">
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

      <div class="form-row with-top-margin">
        <el-form-item label="Дата и время" prop="started_at" class="form-col">
          <el-date-picker
            v-model="form.started_at"
            type="datetime"
            placeholder="Выберите дату"
            value-format="YYYY-MM-DDTHH:mm:ss"
            class="full-width-select"
            :disabled-date="disablePastDates"
          />
        </el-form-item>
        <el-form-item label="Длительность (мин)" prop="duration" class="form-col">
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

      <el-form-item label="Место" prop="location" class="with-top-margin">
        <el-input v-model="form.location" placeholder="Например: Переговорная 305, Zoom" />
      </el-form-item>

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
    student: { id: number; user_id?: number; full_name: string }
    examiner: { id: number; user_id?: number; full_name: string }
    stage_id: number
    started_at: string
    location: string
    duration: number
    description?: string
    title?: string
    confirmation_type?: string
    student_id?: number
    examiner_id?: number
    skill_id?: number
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

const employeesList = ref<Employee[]>([])
const selectedSkillId = ref<number | null>(null)
const availableSkills = ref<Skill[]>([])
const availableStages = ref<Array<{ id: number; confirmation_type: string }>>([])

const currentStudentLabel = computed(() => {
  if (!form.value.student_id || !props.meeting) return ''
  return props.meeting.student?.full_name || ''
})

const currentExaminerLabel = computed(() => {
  if (!form.value.examiner_id || !props.meeting) return ''
  return props.meeting.examiner?.full_name || ''
})

const currentSkillLabel = computed(() => {
  if (!selectedSkillId.value) return ''
  const skill = availableSkills.value.find((s) => s.id === selectedSkillId.value)
  if (skill) return skill.title
  return props.meeting?.title || ''
})

const currentStageLabel = computed(() => {
  if (!form.value.stage_id) return ''
  const stage = availableStages.value.find((s) => s.id === form.value.stage_id)
  if (stage) return getStageTypeLabel(stage.confirmation_type)
  return props.meeting?.confirmation_type || ''
})

const rules = {
  student_id: [{ required: true, message: 'Выберите аттестуемого', trigger: 'change' }],
  examiner_id: [{ required: true, message: 'Выберите аттестующего', trigger: 'change' }],
  stage_id: [{ required: true, message: 'Выберите этап', trigger: 'change' }],
  started_at: [{ required: true, message: 'Выберите дату', trigger: 'change' }],
  location: [{ required: true, message: 'Укажите место', trigger: 'blur' }],
  duration: [{ required: true, message: 'Укажите длительность', trigger: 'blur' }],
}

const availableExaminers = computed(() => {
  if (!Array.isArray(employeesList.value)) return []
  return employeesList.value.filter((emp) => emp.id !== form.value.student_id)
})

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
  } catch (err: any) {
    console.error('Error fetching employees:', err)
    ElMessage.error('Не удалось загрузить список сотрудников')
    employeesList.value = []
  } finally {
    employeesLoading.value = false
  }
}

const loadMeeting = async () => {
  if (!props.meeting) {
    resetForm()
    return
  }

  if (employeesLoading.value) {
    await new Promise((res) => setTimeout(res, 150))
    if (employeesLoading.value) return
  }

  const studentId =
    props.meeting.student?.user_id ??
    props.meeting.student?.id ??
    (props.meeting as any).student_id ??
    null
  const examinerId =
    props.meeting.examiner?.user_id ??
    props.meeting.examiner?.id ??
    (props.meeting as any).examiner_id ??
    null
  const stageId = props.meeting.stage_id ?? null
  const skillId = (props.meeting as any).skill_id ?? null

  form.value.student_id = studentId
  form.value.examiner_id = examinerId
  form.value.started_at = props.meeting.started_at || null
  form.value.location = props.meeting.location || ''
  form.value.duration = props.meeting.duration || 60
  form.value.description = props.meeting.description || ''
  form.value.stage_id = null
  selectedSkillId.value = null

  if (studentId) {
    await loadAvailableSkills(studentId)

    if (stageId && availableSkills.value.length > 0) {
      const matchedSkill = availableSkills.value.find(
        (skill) => Array.isArray(skill.stages) && skill.stages.some((s) => s.id === stageId),
      )

      if (matchedSkill) {
        selectedSkillId.value = matchedSkill.id
        availableStages.value = matchedSkill.stages || []
        form.value.stage_id = stageId
      } else if (skillId) {
        selectedSkillId.value = skillId
        const skill = availableSkills.value.find((s) => s.id === skillId)
        if (skill) {
          availableStages.value = skill.stages || []
          form.value.stage_id = stageId
        }
      }
    }
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

const loadAvailableSkills = async (userId: number) => {
  if (!userId || typeof userId !== 'number' || isNaN(userId)) {
    ElMessage.error('Некорректный ID аттестуемого')
    availableSkills.value = []
    skillsLoading.value = false
    return
  }

  try {
    skillsLoading.value = true
    availableSkills.value = []
    availableStages.value = []

    const url = `${API_BASE}/users/${userId}/skills/available`
    const res = await axios.get<AvailableSkillsResponse>(url)

    if (res.data?.current_level?.skills) {
      availableSkills.value = res.data.current_level.skills
    } else {
      ElMessage.warning('Навыки не найдены')
    }
  } catch (err: any) {
    console.error('Ошибка загрузки навыков:', err)
    const errorMsg = err.response?.data?.detail || err.message || 'Не удалось загрузить навыки'
    ElMessage.error(errorMsg)
    availableSkills.value = []
  } finally {
    skillsLoading.value = false
  }
}

const onStudentChange = (userId: number) => {
  if (userId) {
    loadAvailableSkills(userId)
    if (!isEditing.value) {
      selectedSkillId.value = null
      availableStages.value = []
      form.value.stage_id = null
    }
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

const onSkillChange = (skillId: number) => {
  const skill = availableSkills.value.find((s) => s.id === skillId)
  availableStages.value = skill?.stages || []
  if (!isEditing.value) {
    form.value.stage_id = null
  }
}

const getStageTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    Аттестация: 'Аттестация',
    'Практическое задание': 'Практическое задание',
    'Performance review': 'Performance review',
  }
  return map[type] || type
}

const disablePastDates = (date: Date) => date.getTime() < Date.now() - 60 * 60 * 1000

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
    const msg =
      err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Ошибка сохранения'
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

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      await fetchAvailableEmployees()
      if (props.meeting) await loadMeeting()
    }
  },
  { immediate: true },
)

watch(
  () => props.meeting,
  async (newVal) => {
    if (props.modelValue && newVal) await loadMeeting()
  },
  { deep: true },
)

onMounted(async () => {
  if (props.modelValue) {
    await fetchAvailableEmployees()
    if (props.meeting) await loadMeeting()
  }
})
</script>

<style scoped>
.meeting-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 8px;
}
.form-row {
  display: flex;
  gap: 12px;
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
  gap: 12px;
}
.participant-row {
  display: flex;
  align-items: center;
}
.participant-label {
  min-width: 110px;
  flex-shrink: 0;
  font-weight: 500;
  color: #303133;
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
  color: #909399;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}
.loading-text {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.current-item :deep(.el-select-dropdown__item) {
  background-color: #f5f7fa;
  font-weight: 600;
  color: #303133;
}
@media (max-width: 375px) {
  .participant-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .participant-label {
    min-width: auto;
    margin-bottom: 2px;
  }
  .participant-select {
    width: 100%;
    min-width: auto;
  }
  .meeting-form {
    max-height: 60vh;
  }
}
@media (max-width: 446px) {
  .form-row {
    flex-direction: column;
    gap: 8px;
  }
  .form-row .el-form-item {
    width: 100%;
    flex: none;
  }
  .full-width-input {
    width: 40%;
  }
  .full-width-select {
    width: 100%;
    max-width: 100%;
  }
  .meeting-form {
    max-height: 60vh;
  }
}
</style>
