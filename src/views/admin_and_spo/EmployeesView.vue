<!-- src/views/EmployeesView.vue -->
<template>
  <div class="employees-view">
    <!-- Шапка -->
    <header class="view-header">
      <div>
        <h1>Управление сотрудниками</h1>
        <div v-if="isSupervisor" class="department-subtitle">{{ userDepartmentName }}</div>
      </div>
      <div class="header-actions">
        <!-- Кнопка регистрации только для админа -->
        <el-button v-if="isAdmin" type="primary" @click="openRegisterModal">
          <el-icon><Plus /></el-icon> Зарегистрировать сотрудника
        </el-button>
        <!-- Кнопка создания встречи для руководителя -->
        <el-button v-if="isSupervisor" type="primary" @click="openMeetingDialog">
          <el-icon><Calendar /></el-icon> Создать встречу
        </el-button>
      </div>
    </header>

    <!-- Фильтры -->
    <div class="filters-row">
      <el-input
        v-model="search"
        placeholder="Поиск по ФИО или должности"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select
        v-if="!isSupervisor"
        v-model="filterDepartmentId"
        placeholder="Все отделы"
        clearable
        class="department-filter"
      >
        <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
      </el-select>
    </div>

    <!-- Таблица сотрудников -->
    <el-table
      :data="filteredEmployees"
      stripe
      border
      class="data-table"
      @row-click="viewEmployee"
      style="cursor: pointer"
    >
      <el-table-column prop="fullName" label="ФИО" min-width="220" />
      <el-table-column prop="position" label="Должность" width="180" />
      <!-- Колонки Отдел и Роль скрыты для руководителя -->
      <el-table-column v-if="!isSupervisor" prop="departmentName" label="Отдел" width="180" />

      <!-- Колонка Профиль -->
      <el-table-column label="Профиль" min-width="240">
        <template #default="{ row }">
          <div class="profile-cell">
            <div class="profile-name">
              {{ row.profileName || 'Не назначен' }}
              <span v-if="row.profileLevel" class="profile-level">({{ row.profileLevel }})</span>
            </div>
            <!-- Процент слева от линии -->
            <div class="progress-wrapper">
              <span class="progress-percent">{{ row.profileProgress ?? 0 }}%</span>
              <el-progress
                v-if="row.profileProgress !== null && row.profileProgress !== undefined"
                :percentage="row.profileProgress"
                :show-text="false"
                :stroke-width="6"
                class="profile-progress"
              />
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- Колонка Повышение (только для руководителя) -->
      <el-table-column v-if="isSupervisor" label="Повышение" width="150">
        <template #default="{ row }">
          <el-tag :type="isPromotionAvailable(row) ? 'success' : 'info'" size="small">
            {{ isPromotionAvailable(row) ? 'Доступно' : 'Не доступно' }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- Колонка Роль скрыта для руководителя -->
      <el-table-column v-if="!isSupervisor" prop="roleName" label="Роль" width="150" />
    </el-table>

    <!-- 🔹 Модальное окно: Карточка сотрудника -->
    <el-dialog v-model="detailVisible" title="Карточка сотрудника" width="750px" destroy-on-close>
      <div v-if="selectedEmployee" class="employee-detail">
        <!-- Основная информация (режим просмотра / редактирования в одном блоке) -->
        <div class="detail-section">
          <h3 class="section-title">Основная информация</h3>
          <div class="info-grid">
            <!-- ФИО -->
            <div class="info-item">
              <span class="info-label">ФИО:</span>
              <span v-if="!isEditMode || isSupervisor" class="info-value">{{
                selectedEmployee.fullName
              }}</span>
              <div v-else class="info-edit-row">
                <el-input v-model="editForm.lastName" placeholder="Фамилия" class="edit-input" />
                <el-input v-model="editForm.firstName" placeholder="Имя" class="edit-input" />
                <el-input v-model="editForm.patronymic" placeholder="Отчество" class="edit-input" />
              </div>
            </div>
            <!-- Должность -->
            <div class="info-item">
              <span class="info-label">Должность:</span>
              <span v-if="!isEditMode || isSupervisor" class="info-value">{{
                selectedEmployee.position
              }}</span>
              <el-input
                v-else
                v-model="editForm.position"
                placeholder="Должность"
                class="edit-input-full"
              />
            </div>
            <!-- Email -->
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span v-if="!isEditMode || isSupervisor" class="info-value">{{
                selectedEmployee.email
              }}</span>
              <el-input
                v-else
                v-model="editForm.email"
                placeholder="Email"
                class="edit-input-full"
              />
            </div>
            <!-- Отдел -->
            <div class="info-item" v-if="!isSupervisor">
              <span class="info-label">Отдел:</span>
              <span v-if="!isEditMode" class="info-value">{{
                selectedEmployee.departmentName || 'Не назначен'
              }}</span>
              <el-select
                v-else
                v-model="editForm.departmentId"
                placeholder="Не назначен"
                clearable
                class="edit-select-full"
              >
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
            </div>
            <!-- Роль скрыта для руководителя -->
            <div class="info-item" v-if="!isSupervisor">
              <span class="info-label">Роль:</span>
              <span v-if="!isEditMode" class="info-value">{{
                selectedEmployee.roleName || 'Не назначена'
              }}</span>
              <el-select
                v-else-if="isAdmin"
                v-model="editForm.roleId"
                placeholder="Не назначена"
                clearable
                class="edit-select-full"
              >
                <el-option
                  v-for="role in availableRoles"
                  :key="role.id"
                  :label="role.name"
                  :value="role.id"
                />
              </el-select>
              <span v-else class="info-value">{{ getRoleNameById(editForm.roleId) }}</span>
            </div>
          </div>
          <!-- Кнопки управления (скрыты для руководителя) -->
          <div class="detail-actions" v-if="!isSupervisor">
            <el-button v-if="!isEditMode" type="primary" @click="enableEditMode"
              >Редактировать</el-button
            >
            <template v-else>
              <el-button @click="cancelEdit">Отмена</el-button>
              <el-button type="primary" @click="saveEmployeeChanges">Сохранить</el-button>
            </template>
          </div>
          <!-- Кнопка повышения для руководителя -->
          <div
            v-if="isSupervisor && isPromotionAvailable(selectedEmployee)"
            class="promotion-actions"
          >
            <el-button type="success" @click="showPromoteDialog"> Повысить сотрудника </el-button>
          </div>
        </div>

        <!-- Профиль (всегда виден, только просмотр) -->
        <div class="detail-section profile-section">
          <h3 class="section-title">Профиль</h3>
          <!-- Если профиль назначен - показываем карточку -->
          <ProfileCard v-if="selectedProfileData" :profile="selectedProfileData" />

          <!-- Если профиль не назначен -->
          <div v-else class="profile-unassigned">
            <span class="unassigned-text">Профиль не назначен</span>
            <!-- Для руководителя: возможность назначить профиль -->
            <div v-if="isSupervisor" class="assign-profile-section">
              <div class="assign-profile-label">Назначить профиль:</div>
              <div class="profiles-collapse">
                <div v-for="profile in profiles" :key="profile.id" class="profile-collapse-item">
                  <!-- Заголовок профиля с круглым значком выбора -->
                  <div class="profile-collapse-header" @click="toggleProfileExpand(profile.id)">
                    <el-radio
                      v-model="selectedProfileForAssign"
                      :label="profile.id"
                      @click.stop
                      class="profile-radio"
                    />
                    <span class="profile-collapse-title">{{ profile.name }}</span>
                    <el-icon
                      class="collapse-icon"
                      :class="{ expanded: expandedProfiles.includes(profile.id) }"
                    >
                      <ArrowRight />
                    </el-icon>
                  </div>

                  <!-- Содержимое профиля (уровни) -->
                  <el-collapse-transition>
                    <div
                      v-show="expandedProfiles.includes(profile.id)"
                      class="profile-collapse-content"
                    >
                      <div
                        v-for="level in profile.levels || []"
                        :key="level.id"
                        class="level-collapse-item"
                      >
                        <!-- Заголовок уровня -->
                        <div
                          class="level-collapse-header"
                          @click="toggleLevelExpand(profile.id, level.id)"
                        >
                          <span class="level-collapse-title">{{ level.name }}</span>
                          <el-icon
                            class="collapse-icon"
                            :class="{ expanded: expandedLevels[`${profile.id}_${level.id}`] }"
                          >
                            <ArrowRight />
                          </el-icon>
                        </div>

                        <!-- Содержимое уровня (навыки) -->
                        <el-collapse-transition>
                          <div
                            v-show="expandedLevels[`${profile.id}_${level.id}`]"
                            class="level-collapse-content"
                          >
                            <div
                              v-for="skill in level.skills || profile.skills || []"
                              :key="skill.id"
                              class="skill-collapse-item"
                            >
                              <!-- Заголовок навыка -->
                              <div
                                class="skill-collapse-header"
                                @click="toggleSkillExpand(skill.id)"
                              >
                                <span class="skill-collapse-title">{{ skill.name }}</span>
                                <el-icon
                                  class="collapse-icon"
                                  :class="{ expanded: expandedSkills.includes(skill.id) }"
                                >
                                  <ArrowRight />
                                </el-icon>
                              </div>

                              <!-- Содержимое навыка -->
                              <el-collapse-transition>
                                <div
                                  v-show="expandedSkills.includes(skill.id)"
                                  class="skill-collapse-content"
                                >
                                  <!-- Описание навыка -->
                                  <div v-if="skill.description" class="skill-description">
                                    <strong>Описание:</strong> {{ skill.description }}
                                  </div>

                                  <!-- Материалы для подготовки -->
                                  <div v-if="skill.materials?.length" class="skill-materials">
                                    <strong>Материалы для подготовки:</strong>
                                    <ul>
                                      <li v-for="(material, idx) in skill.materials" :key="idx">
                                        {{ material }}
                                      </li>
                                    </ul>
                                  </div>

                                  <!-- Этапы освоения (табы) -->
                                  <div v-if="skill.stages?.length" class="skill-stages">
                                    <div class="stages-tabs">
                                      <div
                                        v-for="stageType in stageTypes"
                                        :key="stageType.key"
                                        class="stage-tab"
                                        :class="{
                                          active: selectedStageType === stageType.key,
                                          'has-content': hasStageContent(
                                            skill.stages,
                                            stageType.key,
                                          ),
                                        }"
                                        @click="selectStageType(stageType.key)"
                                      >
                                        {{ stageType.label }}
                                      </div>
                                    </div>

                                    <!-- Содержимое выбранного этапа -->
                                    <div class="stage-content">
                                      <div
                                        v-for="stage in getStagesByType(
                                          skill.stages,
                                          selectedStageType,
                                        )"
                                        :key="stage.id"
                                        class="stage-item"
                                      >
                                        <div class="stage-title">
                                          {{ getStageContentTitle(selectedStageType) }}
                                        </div>

                                        <!-- Для Аттестации - Вопросы и ответы -->
                                        <div
                                          v-if="
                                            selectedStageType === 'certification' &&
                                            stage.qa?.length
                                          "
                                          class="stage-qa-list"
                                        >
                                          <div
                                            v-for="(qa, idx) in stage.qa"
                                            :key="idx"
                                            class="qa-item"
                                          >
                                            <div
                                              class="qa-question"
                                              @click="toggleQAExpand(skill.id, stage.id, idx)"
                                            >
                                              <span>{{ idx + 1 }}.</span>
                                              <span class="qa-question-text">{{
                                                qa.question
                                              }}</span>
                                              <el-icon
                                                class="collapse-icon"
                                                :class="{
                                                  expanded:
                                                    expandedQA[`${skill.id}_${stage.id}_${idx}`],
                                                }"
                                              >
                                                <ArrowRight />
                                              </el-icon>
                                            </div>
                                            <el-collapse-transition>
                                              <div
                                                v-show="
                                                  expandedQA[`${skill.id}_${stage.id}_${idx}`]
                                                "
                                                class="qa-answer"
                                              >
                                                <strong>Эталонный ответ:</strong> {{ qa.answer }}
                                              </div>
                                            </el-collapse-transition>
                                          </div>
                                        </div>

                                        <!-- Для остальных этапов - Задания и критерии -->
                                        <div v-else class="stage-tasks-criteria">
                                          <div v-if="stage.tasks?.length" class="tasks-list">
                                            <div
                                              v-for="(task, idx) in stage.tasks"
                                              :key="idx"
                                              class="task-item"
                                            >
                                              <div
                                                class="task-title"
                                                @click="toggleTaskExpand(skill.id, stage.id, idx)"
                                              >
                                                <span>{{ idx + 1 }}.</span>
                                                <span class="task-text">{{ task }}</span>
                                                <el-icon
                                                  class="collapse-icon"
                                                  :class="{
                                                    expanded:
                                                      expandedTasks[
                                                        `${skill.id}_${stage.id}_${idx}`
                                                      ],
                                                  }"
                                                >
                                                  <ArrowRight />
                                                </el-icon>
                                              </div>
                                              <el-collapse-transition>
                                                <div
                                                  v-show="
                                                    expandedTasks[`${skill.id}_${stage.id}_${idx}`]
                                                  "
                                                  class="task-criteria"
                                                >
                                                  <strong>Критерий оценивания:</strong>
                                                  <p>
                                                    {{
                                                      stage.criteria?.[idx] || 'Критерий не указан'
                                                    }}
                                                  </p>
                                                </div>
                                              </el-collapse-transition>
                                            </div>
                                          </div>
                                          <div
                                            v-if="stage.criteria?.length && !stage.tasks?.length"
                                            class="criteria-list"
                                          >
                                            <strong>Критерии:</strong>
                                            <ul>
                                              <li
                                                v-for="(criterion, idx) in stage.criteria"
                                                :key="idx"
                                              >
                                                {{ criterion }}
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </el-collapse-transition>
                            </div>
                          </div>
                        </el-collapse-transition>
                      </div>
                    </div>
                  </el-collapse-transition>
                </div>
              </div>
              <!-- Кнопка сохранения назначения профиля -->
              <div class="assign-profile-actions" v-if="selectedProfileForAssign">
                <el-button type="primary" size="small" @click="assignProfileToEmployee">
                  Назначить профиль
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 🔹 Модальное окно: Регистрация сотрудника (только для админа) -->
    <el-dialog
      v-if="isAdmin"
      v-model="registerVisible"
      title="Регистрация нового сотрудника"
      width="650px"
      destroy-on-close
    >
      <el-form
        :model="regForm"
        :rules="regRules"
        ref="regFormRef"
        label-position="top"
        class="reg-form"
      >
        <div class="form-row">
          <el-form-item label="Фамилия" prop="lastName"
            ><el-input v-model="regForm.lastName" placeholder="Иванов"
          /></el-form-item>
          <el-form-item label="Имя" prop="firstName"
            ><el-input v-model="regForm.firstName" placeholder="Иван"
          /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="Отчество" prop="patronymic"
            ><el-input v-model="regForm.patronymic" placeholder="Иванович"
          /></el-form-item>
          <el-form-item label="Email" prop="email"
            ><el-input v-model="regForm.email" placeholder="user@example.com"
          /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="Должность" prop="position"
            ><el-input v-model="regForm.position" placeholder="Например: Frontend Developer"
          /></el-form-item>
          <el-form-item label="Отдел" prop="departmentId">
            <el-select
              v-model="regForm.departmentId"
              placeholder="Можно назначить позже"
              clearable
              style="width: 100%"
            >
              <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="Пароль" prop="password">
            <el-input
              v-model="regForm.password"
              type="password"
              show-password
              placeholder="Минимум 6 символов"
            />
          </el-form-item>
          <el-form-item label="Повторите пароль" prop="confirmPassword">
            <el-input
              v-model="regForm.confirmPassword"
              type="password"
              show-password
              placeholder="Повторите пароль"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="registerVisible = false">Отмена</el-button>
        <el-button type="primary" :loading="isRegistering" @click="submitRegistration"
          >Зарегистрировать</el-button
        >
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: Создание встречи (для руководителя) -->
    <MeetingDialog
      v-if="isSupervisor"
      v-model="meetingDialogVisible"
      :employee="selectedEmployee"
      @close="meetingDialogVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Calendar, ArrowRight } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
// Импорт внешней карточки профиля
import ProfileCard from '@/components/common/ProfileCard.vue'
// Импорт диалога создания встречи
import MeetingDialog from '@/components/common/MeetingDialog.vue'

const authStore = useAuthStore()
const isAdmin = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('admin') || role.includes('администратор')
})
const isSupervisor = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('supervisor') || role.includes('руководитель')
})

// === Состояние ===
const search = ref('')
const filterDepartmentId = ref<number | null>(null)
const detailVisible = ref(false)
const registerVisible = ref(false)
const meetingDialogVisible = ref(false)
const isRegistering = ref(false)
const isEditMode = ref(false)
const selectedEmployee = ref<any>(null)
const regFormRef = ref<FormInstance>()
const editForm = ref<any>({})

// Состояние для назначения профиля (руководитель)
const selectedProfileForAssign = ref<number | null>(null)
const expandedProfiles = ref<number[]>([])
const expandedLevels = ref<Record<string, boolean>>({})
const expandedSkills = ref<number[]>([])
const expandedQA = ref<Record<string, boolean>>({})
const expandedTasks = ref<Record<string, boolean>>({})
const selectedStageType = ref<'practice' | 'certification' | 'performance'>('practice')

// Типы этапов
const stageTypes = [
  { key: 'practice', label: 'Практика' },
  { key: 'certification', label: 'Аттестация' },
  { key: 'performance', label: 'Performance Review' },
]

// Получение названия отдела пользователя
const userDepartmentName = computed(() => {
  if (!isSupervisor.value) return ''
  const deptId = authStore.user?.department_id
  const dept = departments.value.find((d) => d.id === deptId)
  return dept?.name || 'Отдел не назначен'
})

// === Данные ===
const departments = ref([
  { id: 1, name: 'Отдел разработки' },
  { id: 2, name: 'Отдел тестирования' },
  { id: 3, name: 'HR и обучение' },
  { id: 4, name: 'Проектный офис' },
])

const availableRoles = ref([
  { id: 1, name: 'Сотрудник' },
  { id: 2, name: 'Руководитель' },
  { id: 3, name: 'СПО' },
  { id: 4, name: 'Администратор' },
])

const profiles = ref([
  {
    id: 1,
    name: 'Frontend Developer',
    description:
      'Разработка интерфейсов, работа с Vue 3, TypeScript и современными инструментами сборки.',
    levels: [
      {
        id: 1,
        name: 'Ученик',
        skills: [
          {
            id: 101,
            name: 'Vue 3 Composition API',
            description: 'Базовое понимание реактивности и композиции компонентов',
            materials: ['Документация Vue 3', 'Vue School: Composition API'],
            stages: [
              {
                id: 1,
                order: 1,
                name: 'Базовый',
                type: 'practice',
                tasks: [
                  'Создать компонент с использованием setup()',
                  'Использовать ref и reactive',
                ],
                criteria: ['Код компилируется без ошибок', 'Реактивность работает корректно'],
              },
              {
                id: 2,
                order: 2,
                name: 'Базовый',
                type: 'certification',
                qa: [
                  {
                    question: 'Что такое ref?',
                    answer: 'Функция для создания реактивной переменной',
                  },
                  {
                    question: 'В чем разница ref и reactive?',
                    answer: 'ref для примитивов, reactive для объектов',
                  },
                ],
              },
              {
                id: 3,
                order: 3,
                name: 'Продвинутый',
                type: 'performance',
                tasks: ['Реализовать сложный компонент с composables'],
                criteria: ['Код следует best practices', 'Производительность оптимизирована'],
              },
            ],
          },
        ],
      },
      {
        id: 2,
        name: 'Специалист',
        skills: [
          {
            id: 102,
            name: 'State Management (Pinia)',
            description: 'Управление состоянием приложения с использованием Pinia',
            materials: ['Документация Pinia', 'Best practices'],
            stages: [],
          },
        ],
      },
    ],
    skills: [
      {
        id: 101,
        name: 'Vue 3 Composition API',
        materials: ['Документация Vue 3'],
        stages: [],
      },
    ],
  },
  {
    id: 2,
    name: 'QA Engineer',
    description:
      'Ручное и автоматизированное тестирование, написание E2E и API тестов, составление тест-планов.',
    levels: [],
    skills: [
      {
        id: 201,
        name: 'Автотестирование (Cypress)',
        materials: ['Документация Cypress'],
        stages: [],
      },
    ],
  },
])

const employees = ref([
  {
    id: 1,
    lastName: 'Иванов',
    firstName: 'Иван',
    patronymic: 'Иванович',
    position: 'Frontend Developer',
    email: 'ivanov@company.ru',
    departmentId: 1,
    departmentName: 'Отдел разработки',
    profileId: 1,
    profileName: 'Frontend Developer',
    profileLevel: 'Ученик',
    profileProgress: 100,
    roleId: 1,
    roleName: 'Сотрудник',
  },
  {
    id: 2,
    lastName: 'Петрова',
    firstName: 'Анна',
    patronymic: 'Сергеевна',
    position: 'Тимлид',
    email: 'petrova@company.ru',
    departmentId: 1,
    departmentName: 'Отдел разработки',
    profileId: null,
    profileName: 'Не назначен',
    profileLevel: null,
    profileProgress: null,
    roleId: 2,
    roleName: 'Руководитель',
  },
  {
    id: 3,
    lastName: 'Сидоров',
    firstName: 'Алексей',
    patronymic: null,
    position: 'QA Engineer',
    email: 'sidorov@company.ru',
    departmentId: 2,
    departmentName: 'Отдел тестирования',
    profileId: 2,
    profileName: 'QA Engineer',
    profileLevel: 'Ученик',
    profileProgress: 25,
    roleId: 1,
    roleName: 'Сотрудник',
  },
])

// === Вычисляемые ===
const filteredEmployees = computed(() => {
  let result = employees.value
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(
      (e) =>
        `${e.lastName} ${e.firstName} ${e.patronymic || ''}`.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q),
    )
  }
  if (filterDepartmentId.value && !isSupervisor.value) {
    result = result.filter((e) => e.departmentId === filterDepartmentId.value)
  }
  return result
})

const selectedProfileData = computed(() => {
  if (!selectedEmployee.value?.profileId) return null
  return profiles.value.find((p) => p.id === selectedEmployee.value.profileId) || null
})

// === Форма регистрации ===
const regForm = reactive({
  lastName: '',
  firstName: '',
  patronymic: '',
  position: '',
  email: '',
  departmentId: null as number | null,
  password: '',
  confirmPassword: '',
})

const regRules: FormRules = {
  lastName: [{ required: true, message: 'Введите фамилию', trigger: 'blur' }],
  firstName: [{ required: true, message: 'Введите имя', trigger: 'blur' }],
  position: [{ required: true, message: 'Введите должность', trigger: 'blur' }],
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Некорректный формат', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' },
    { min: 6, message: 'Минимум 6 символов', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: 'Подтвердите пароль', trigger: 'blur' },
    {
      validator: (_, value: string, callback: any) => {
        if (value !== regForm.password) callback(new Error('Пароли не совпадают'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

// === Методы ===
const getRoleNameById = (roleId: number | null) => {
  if (!roleId) return 'Не назначена'
  return availableRoles.value.find((r) => r.id === roleId)?.name || 'Не назначена'
}

const getNextLevel = (employee: any) => {
  if (!employee?.profileId || !employee?.profileLevel) return null

  const profile = profiles.value.find((p) => p.id === employee.profileId)
  if (!profile?.levels) return null

  const currentLevelIndex = profile.levels.findIndex(
    (level) => level.name === employee.profileLevel,
  )

  if (currentLevelIndex === -1 || currentLevelIndex >= profile.levels.length - 1) {
    return null // Это последний уровень или уровень не найден
  }

  return profile.levels[currentLevelIndex + 1]
}

const isPromotionAvailable = (employee: any) => {
  if (!employee?.profileProgress || employee.profileProgress !== 100) return false
  const nextLevel = getNextLevel(employee)
  return !!nextLevel
}

const showPromoteDialog = () => {
  if (!selectedEmployee.value) return

  const nextLevel = getNextLevel(selectedEmployee.value)
  if (!nextLevel) return

  ElMessageBox.confirm(
    `Повысить сотрудника ${selectedEmployee.value.fullName} до уровня "${nextLevel.name}"? Прогресс будет сброшен.`,
    'Подтверждение повышения',
    {
      confirmButtonText: 'Повысить',
      cancelButtonText: 'Отмена',
      type: 'warning',
    },
  )
    .then(() => {
      promoteEmployee(nextLevel)
    })
    .catch(() => {
      // Отменено
    })
}

const promoteEmployee = (nextLevel: any) => {
  if (!selectedEmployee.value) return

  const idx = employees.value.findIndex((e) => e.id === selectedEmployee.value.id)
  if (idx !== -1) {
    employees.value[idx] = {
      ...employees.value[idx],
      profileLevel: nextLevel.name,
      profileProgress: 0,
    }
    selectedEmployee.value = { ...employees.value[idx] }
    ElMessage.success(`Сотрудник повышен до уровня "${nextLevel.name}"`)
  }
}

const viewEmployee = (row: any) => {
  selectedEmployee.value = { ...row }
  editForm.value = { ...row }
  isEditMode.value = false
  // Сброс состояния назначения профиля
  selectedProfileForAssign.value = null
  expandedProfiles.value = []
  expandedLevels.value = {}
  expandedSkills.value = []
  expandedQA.value = {}
  expandedTasks.value = {}
  selectedStageType.value = 'practice'
  detailVisible.value = true
}

const enableEditMode = () => {
  isEditMode.value = true
}
const cancelEdit = () => {
  isEditMode.value = false
  editForm.value = { ...selectedEmployee.value }
}

const saveEmployeeChanges = () => {
  const idx = employees.value.findIndex((e: any) => e.id === editForm.value.id)
  if (idx !== -1) {
    employees.value[idx] = {
      ...editForm.value,
      fullName:
        `${editForm.value.lastName} ${editForm.value.firstName} ${editForm.value.patronymic || ''}`.trim(),
      departmentName:
        departments.value.find((d: any) => d.id === editForm.value.departmentId)?.name ||
        'Не назначен',
      roleName: getRoleNameById(editForm.value.roleId),
    }
    selectedEmployee.value = { ...employees.value[idx] }
  }
  isEditMode.value = false
  ElMessage.success('Данные обновлены')
}

const submitRegistration = async () => {
  if (!regFormRef.value) return
  await regFormRef.value.validate(async (valid) => {
    if (!valid) return
    isRegistering.value = true
    try {
      await new Promise((res) => setTimeout(res, 600))
      const newEmp = {
        id: Date.now(),
        ...regForm,
        fullName: `${regForm.lastName} ${regForm.firstName} ${regForm.patronymic || ''}`.trim(),
        departmentName:
          departments.value.find((d: any) => d.id === regForm.departmentId)?.name || 'Не назначен',
        roleName: 'Сотрудник',
        roleId: 1,
        profileName: 'Не назначен',
        profileLevel: null,
        profileProgress: null,
      }
      employees.value.unshift(newEmp)
      ElMessage.success('Сотрудник зарегистрирован')
      registerVisible.value = false
      Object.assign(regForm, {
        lastName: '',
        firstName: '',
        patronymic: '',
        position: '',
        email: '',
        departmentId: null,
        password: '',
        confirmPassword: '',
      })
    } catch {
      ElMessage.error('Ошибка регистрации')
    } finally {
      isRegistering.value = false
    }
  })
}

const openRegisterModal = () => {
  registerVisible.value = true
}

const openMeetingDialog = () => {
  meetingDialogVisible.value = true
}

// Методы для управления раскрытием профиля
const toggleProfileExpand = (profileId: number) => {
  const idx = expandedProfiles.value.indexOf(profileId)
  if (idx === -1) {
    expandedProfiles.value.push(profileId)
  } else {
    expandedProfiles.value.splice(idx, 1)
  }
}

const toggleLevelExpand = (profileId: number, levelId: number) => {
  const key = `${profileId}_${levelId}`
  expandedLevels.value[key] = !expandedLevels.value[key]
}

const toggleSkillExpand = (skillId: number) => {
  const idx = expandedSkills.value.indexOf(skillId)
  if (idx === -1) {
    expandedSkills.value.push(skillId)
  } else {
    expandedSkills.value.splice(idx, 1)
  }
}

const toggleQAExpand = (skillId: number, stageId: number, idx: number) => {
  const key = `${skillId}_${stageId}_${idx}`
  expandedQA.value[key] = !expandedQA.value[key]
}

const toggleTaskExpand = (skillId: number, stageId: number, idx: number) => {
  const key = `${skillId}_${stageId}_${idx}`
  expandedTasks.value[key] = !expandedTasks.value[key]
}

const selectStageType = (type: 'practice' | 'certification' | 'performance') => {
  selectedStageType.value = type
}

const hasStageContent = (stages: any[], type: string) => {
  return stages.some((stage) => stage.type === type)
}

const getStagesByType = (stages: any[], type: string) => {
  return stages.filter((stage) => stage.type === type)
}

const getStageContentTitle = (type: string) => {
  if (type === 'certification') {
    return 'Вопросы и ответы'
  }
  return 'Задания и критерии'
}

// Назначение профиля сотруднику
const assignProfileToEmployee = () => {
  if (!selectedEmployee.value || !selectedProfileForAssign.value) return

  const profile = profiles.value.find((p) => p.id === selectedProfileForAssign.value)
  if (profile) {
    const idx = employees.value.findIndex((e: any) => e.id === selectedEmployee.value.id)
    if (idx !== -1) {
      employees.value[idx] = {
        ...employees.value[idx],
        profileId: profile.id,
        profileName: profile.name,
        profileLevel: profile.levels?.[0]?.name || null,
        profileProgress: 0,
      }
      selectedEmployee.value = { ...employees.value[idx] }
      ElMessage.success('Профиль назначен')
      // Сброс состояния
      selectedProfileForAssign.value = null
      expandedProfiles.value = []
      expandedLevels.value = {}
      expandedSkills.value = []
      expandedQA.value = {}
      expandedTasks.value = {}
      selectedStageType.value = 'practice'
    }
  }
}
</script>

<style scoped>
/* === Основные стили === */
.employees-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
  color: var(--text);
}
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.view-header h1 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: #000;
}
.department-subtitle {
  font-size: 16px;
  color: #666;
  font-weight: var(--font-weight-medium);
}
.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}
.filters-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
  align-items: center;
}
.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}
.department-filter {
  width: 200px;
}
.data-table {
  width: 100%;
  margin-bottom: var(--spacing-md);
}

/* Таблица: обычный шрифт для всех ячеек */
:deep(.el-table .cell) {
  font-weight: 400 !important;
}

/* Профиль в таблице */
.profile-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.profile-name {
  font-weight: normal;
  color: #000;
  font-size: 14px;
}
.profile-level {
  font-size: 14px;
  color: #666;
}

/* Обёртка: процент слева, линия справа */
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.progress-percent {
  font-size: 14px !important;
  color: #666;
  white-space: nowrap;
  min-width: 38px;
  text-align: left;
  font-variant-numeric: tabular-nums;
  font-weight: 400;
}
.profile-progress {
  flex: 1;
  min-width: 0;
}
:deep(.profile-progress .el-progress__text) {
  font-size: 14px !important;
  font-weight: 400;
}

/* Карточка сотрудника */
.employee-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.detail-section {
  background: #fff;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid #e0e0e0;
}
.section-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  color: #000;
}
.info-grid {
  display: grid;
  gap: var(--spacing-xs);
}
.info-item {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  align-items: center;
}
.info-label {
  font-weight: var(--font-weight-medium);
  color: #000;
  min-width: 100px;
}
.info-value {
  color: #000;
  flex: 1;
  font-size: 14px;
}

/* Редактируемые поля в карточке - нормальный шрифт */
.info-edit-row {
  display: flex;
  gap: var(--spacing-xs);
  flex: 1;
}
.edit-input {
  flex: 1;
  min-width: 0;
}
.edit-input-full {
  width: 100%;
}
.edit-select-full {
  width: 100%;
}
:deep(.info-item .el-input__inner),
:deep(.info-item .el-select__input) {
  font-size: 14px !important;
  color: #000;
}
:deep(.info-item .el-input),
:deep(.info-item .el-select) {
  font-size: 14px;
}

.detail-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  justify-content: flex-end;
}

/* Кнопка повышения */
.promotion-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid #e0e0e0;
}

/* Форма регистрации */
.reg-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}
.form-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  width: 100%;
}
.form-row :deep(.el-form-item) {
  flex: 1;
  margin-bottom: 0;
}

/* Профиль не назначен */
.profile-unassigned {
  padding: var(--spacing-sm);
  color: #666;
}
.unassigned-text {
  font-style: italic;
  color: #999;
}

/* Секция назначения профиля для руководителя */
.assign-profile-section {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px dashed #e0e0e0;
}
.assign-profile-label {
  font-weight: var(--font-weight-medium);
  color: #000;
  margin-bottom: var(--spacing-xs);
}
.profiles-collapse {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}
.profile-collapse-item {
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.profile-collapse-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f9f9f9;
  cursor: pointer;
  transition: background 0.2s;
}
.profile-collapse-header:hover {
  background: #f0f0f0;
}
.profile-radio {
  flex-shrink: 0;
}
:deep(.profile-radio .el-radio__label) {
  display: none;
}
.profile-collapse-title {
  flex: 1;
  font-weight: var(--font-weight-medium);
  color: #000;
  font-size: 14px;
}
.collapse-icon {
  transition: transform 0.2s;
  font-size: 14px;
  color: #666;
}
.collapse-icon.expanded {
  transform: rotate(90deg);
}
.profile-collapse-content {
  padding: var(--spacing-sm);
  background: #fff;
}

/* Уровни */
.level-collapse-item {
  margin-bottom: var(--spacing-xs);
}
.level-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs);
  background: #f5f5f5;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
}
.level-collapse-header:hover {
  background: #ebebeb;
}
.level-collapse-title {
  font-weight: var(--font-weight-medium);
  color: #000;
}
.level-collapse-content {
  padding: var(--spacing-xs) 0 0 var(--spacing-sm);
}

/* Навыки */
.skill-collapse-item {
  margin-bottom: var(--spacing-xs);
}
.skill-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs);
  background: #fafafa;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
}
.skill-collapse-header:hover {
  background: #f0f0f0;
}
.skill-collapse-title {
  color: #000;
}
.skill-collapse-content {
  padding: var(--spacing-xs) 0 0 var(--spacing-md);
  font-size: 13px;
  color: #333;
}
.skill-description,
.skill-materials,
.skill-stages {
  margin-bottom: var(--spacing-xs);
}
.skill-materials ul {
  margin: var(--spacing-xs) 0;
  padding-left: var(--spacing-md);
}

/* Этапы - табы */
.stages-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  border-bottom: 2px solid #e0e0e0;
}
.stage-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: #999;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}
.stage-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.stage-tab.has-content:not(.active) {
  color: #666;
}
.stage-tab.has-content:not(.active):hover {
  color: #333;
}

/* Содержимое этапа */
.stage-content {
  margin-top: var(--spacing-sm);
}
.stage-item {
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: #fcfcfc;
  border-radius: var(--radius-sm);
}
.stage-title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
  color: #000;
  font-size: 14px;
}

/* Вопросы и ответы (для Аттестации) */
.stage-qa-list {
  margin-top: var(--spacing-xs);
}
.qa-item {
  margin-bottom: var(--spacing-xs);
  border: 1px solid #e8e8e8;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.qa-question {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f5f5f5;
  cursor: pointer;
  font-size: 13px;
}
.qa-question:hover {
  background: #ebebeb;
}
.qa-question-text {
  flex: 1;
}
.qa-answer {
  padding: var(--spacing-sm);
  background: #fff;
  font-size: 13px;
  color: #333;
  border-top: 1px solid #e8e8e8;
}

/* Задания и критерии (для Практики и Performance Review) */
.stage-tasks-criteria {
  margin-top: var(--spacing-xs);
}
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.task-item {
  border: 1px solid #e8e8e8;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.task-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f5f5f5;
  cursor: pointer;
  font-size: 13px;
}
.task-title:hover {
  background: #ebebeb;
}
.task-text {
  flex: 1;
}
.task-criteria {
  padding: var(--spacing-sm);
  background: #fff;
  font-size: 13px;
  color: #333;
  border-top: 1px solid #e8e8e8;
}
.task-criteria p {
  margin: var(--spacing-xs) 0 0 0;
}
.criteria-list {
  margin-top: var(--spacing-xs);
}
.criteria-list ul {
  margin: var(--spacing-xs) 0;
  padding-left: var(--spacing-md);
}

.assign-profile-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-sm);
}

/* Адаптивность */
@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  .department-filter {
    width: 100%;
  }
  .form-row {
    flex-direction: column;
  }
  .info-edit-row {
    flex-direction: column;
  }
}

/* Deep styles */
:deep(.el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}
:deep(.el-form-item__label) {
  font-weight: var(--font-weight-medium);
  color: #000;
}
:deep(.el-progress-bar__inner) {
  background-color: var(--secondary);
}
</style>
