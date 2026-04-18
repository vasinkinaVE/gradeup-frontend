<!-- src/views/admin_and_spo/ControlPanelView.vue -->
<template>
  <div class="control-panel">
    <!-- Заголовок -->
    <header class="panel-header">
      <h1>Панель управления</h1>
    </header>

    <!-- Вкладки -->
    <div class="panel-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <el-icon><component :is="tab.icon" /></el-icon>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- 🔹 Секция: НАВЫКИ (ТАБЛИЦА) -->
    <section v-if="activeTab === 'skills'" class="tab-content">
      <div class="section-header">
        <h2>Управление навыками</h2>
        <el-button type="primary" @click="openSkillDialog()">
          <el-icon><Plus /></el-icon>
          Создать навык
        </el-button>
      </div>

      <!-- Поиск -->
      <div class="filters-row">
        <el-input
          v-model="skillSearch"
          placeholder="Поиск по названию навыка"
          prefix-icon="Search"
          clearable
          class="search-input"
        />
      </div>

      <!-- Таблица навыков -->
      <el-table :data="filteredSkills" stripe border class="data-table" @row-click="viewSkill">
        <el-table-column prop="name" label="Название навыка" min-width="250" />
        <el-table-column
          prop="description"
          label="Описание"
          min-width="300"
          show-overflow-tooltip
        />
        <el-table-column prop="stagesCount" label="Этапов" width="100" align="center">
          <template #default="{ row }">
            {{ row.stages?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                type="primary"
                :icon="Edit"
                @click.stop="openSkillDialog(row)"
                title="Редактировать"
              />
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click.stop="deleteSkill(row)"
                title="Удалить"
              />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <!-- 🔹 Секция: Профили (ТАБЛИЦА) -->
    <section v-if="activeTab === 'profiles'" class="tab-content">
      <div class="section-header">
        <h2>Управление профилями</h2>
        <el-button type="primary" @click="openProfileDialog()">
          <el-icon><Plus /></el-icon>
          Создать профиль
        </el-button>
      </div>

      <!-- Поиск -->
      <div class="filters-row">
        <el-input
          v-model="profileSearch"
          placeholder="Поиск по названию профиля"
          prefix-icon="Search"
          clearable
          class="search-input"
        />
      </div>

      <!-- Таблица профилей -->
      <el-table :data="filteredProfiles" stripe border class="data-table" @row-click="viewProfile">
        <el-table-column prop="position" label="Название профиля" min-width="250" />
        <el-table-column
          prop="description"
          label="Описание"
          min-width="300"
          show-overflow-tooltip
        />
        <el-table-column prop="levelsCount" label="Уровней" width="100" align="center">
          <template #default="{ row }">
            {{ row.levels?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="skillsCount" label="Навыков" width="100" align="center">
          <template #default="{ row }">
            {{ countProfileSkills(row) }}
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                type="primary"
                :icon="Edit"
                @click.stop="openProfileDialog(row)"
                title="Редактировать"
              />
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click.stop="deleteProfile(row)"
                title="Удалить"
              />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <!-- 🔹 Секция: Встречи (ТАБЛИЦА без ID) -->
    <section v-if="activeTab === 'meetings'" class="tab-content">
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
        <el-table-column label="Действия" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                type="primary"
                :icon="Edit"
                @click.stop="openMeetingDialog(row)"
                title="Редактировать"
              />
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click.stop="deleteMeeting(row)"
                title="Удалить"
              />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <!-- 🔹 Модальное окно: ПРОСМОТР НАВЫКА -->
    <el-dialog
      v-model="viewSkillVisible"
      title="Просмотр навыка"
      :width="800"
      class="admin-dialog"
      destroy-on-close
    >
      <div v-if="viewingSkill" class="view-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Название">{{ viewingSkill.name }}</el-descriptions-item>
          <el-descriptions-item label="Описание">{{
            viewingSkill.description || '—'
          }}</el-descriptions-item>

          <el-descriptions-item label="Материалы">
            <ul v-if="viewingSkill.materials?.length" class="materials-list-view">
              <li v-for="(mat, i) in viewingSkill.materials" :key="i">{{ mat }}</li>
            </ul>
            <span v-else class="empty-text">Нет материалов</span>
          </el-descriptions-item>

          <el-descriptions-item label="Этапы">
            <el-collapse v-model="expandedStages" class="stages-collapse">
              <el-collapse-item
                v-for="(stage, idx) in viewingSkill.stages"
                :key="idx"
                :name="idx"
                :title="`Этап ${idx + 1}: ${getStageTypeLabel(stage.type)}`"
              >
                <div class="stage-questions-view">
                  <div v-for="(q, qIdx) in stage.questions" :key="qIdx" class="question-view">
                    <p><strong>В:</strong> {{ q.text }}</p>
                    <p><strong>О:</strong> {{ q.answer }}</p>
                  </div>
                  <el-empty
                    v-if="!stage.questions?.length"
                    description="Вопросов нет"
                    :image-size="50"
                  />
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="viewSkillVisible = false">Закрыть</el-button>
        <el-button type="primary" :icon="Edit" @click="handleEditSkill"> Редактировать </el-button>
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: ПРОСМОТР ПРОФИЛЯ -->
    <el-dialog
      v-model="viewProfileVisible"
      title="Просмотр профиля"
      :width="900"
      class="admin-dialog"
      destroy-on-close
    >
      <div v-if="viewingProfile" class="view-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Название профиля">{{
            viewingProfile.position
          }}</el-descriptions-item>
          <el-descriptions-item label="Описание">{{
            viewingProfile.description || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="Уровни">
            <div v-for="(level, lIdx) in viewingProfile.levels" :key="lIdx" class="level-view">
              <h4 class="level-title">{{ level.name || `Уровень ${lIdx + 1}` }}</h4>

              <div v-if="level.categories?.length" class="categories-view">
                <div v-for="(cat, cIdx) in level.categories" :key="cIdx" class="category-view">
                  <strong>Категория:</strong> {{ cat.name }}
                  <ul class="skills-list-view">
                    <li v-for="skillId in cat.skills" :key="skillId">
                      {{ getSkillNameById(skillId) }}
                    </li>
                  </ul>
                </div>
              </div>

              <div v-if="level.uncategorizedSkills?.length" class="uncategorized-view">
                <strong>Навыки без категории:</strong>
                <ul class="skills-list-view">
                  <li v-for="skillId in level.uncategorizedSkills" :key="skillId">
                    {{ getSkillNameById(skillId) }}
                  </li>
                </ul>
              </div>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="viewProfileVisible = false">Закрыть</el-button>
        <el-button type="primary" :icon="Edit" @click="handleEditProfile">
          Редактировать
        </el-button>
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: НАВЫК (редактирование) -->
    <el-dialog
      v-model="skillDialogVisible"
      :title="editingSkill ? 'Редактирование навыка' : 'Новый навык'"
      :width="800"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="skillForm" label-position="top" class="skill-form">
        <el-form-item label="Название навыка *" prop="name">
          <el-input v-model="skillForm.name" placeholder="Например: Проектирование схем БД" />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="skillForm.description"
            type="textarea"
            :rows="2"
            placeholder="Краткое описание навыка"
          />
        </el-form-item>

        <!-- ✅ Материалы для подготовки -->
        <el-form-item label="Материалы для подготовки">
          <div class="materials-list">
            <div v-for="(mat, idx) in skillForm.materials" :key="idx" class="material-item">
              <el-input v-model="skillForm.materials[idx]" placeholder="Ссылка, книга, курс..." />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="skillForm.materials.splice(idx, 1)"
              />
            </div>
            <el-button type="primary" link @click="skillForm.materials.push('')">
              <el-icon><Plus /></el-icon> Добавить материал
            </el-button>
          </div>
        </el-form-item>

        <!-- Этапы подтверждения -->
        <div class="form-section">
          <h4 class="section-title">Этапы подтверждения</h4>
          <div class="stages-list">
            <div v-for="(stage, stIdx) in skillForm.stages" :key="stIdx" class="stage-item">
              <div class="stage-header">
                <span class="stage-number">Этап {{ stIdx + 1 }}</span>
                <el-select
                  v-model="stage.type"
                  placeholder="Тип подтверждения"
                  size="small"
                  class="stage-type-select"
                >
                  <el-option
                    v-for="type in getAvailableStageTypes(stIdx)"
                    :key="type.value"
                    :label="type.label"
                    :value="type.value"
                  />
                </el-select>
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  circle
                  @click="removeStage(stIdx)"
                />
              </div>

              <!-- Вопросы внутри этапа -->
              <div class="stage-questions">
                <div v-for="(q, qIdx) in stage.questions" :key="qIdx" class="question-item">
                  <div class="question-header">
                    <span class="question-number">Вопрос {{ qIdx + 1 }}</span>
                    <el-button
                      size="small"
                      type="danger"
                      :icon="Delete"
                      circle
                      @click="removeQuestion(stIdx, qIdx)"
                    />
                  </div>
                  <el-form-item label="Текст вопроса *" size="small">
                    <el-input
                      v-model="stage.questions[qIdx].text"
                      type="textarea"
                      :rows="2"
                      placeholder="Введите текст вопроса"
                    />
                  </el-form-item>
                  <el-form-item label="Эталонный ответ *" size="small">
                    <el-input
                      v-model="stage.questions[qIdx].answer"
                      type="textarea"
                      :rows="3"
                      placeholder="Введите правильный ответ"
                    />
                  </el-form-item>
                </div>
                <el-button type="primary" link size="small" @click="addQuestion(stIdx)">
                  <el-icon><Plus /></el-icon> Добавить вопрос
                </el-button>
              </div>
            </div>
            <el-button type="primary" link size="small" @click="addStage()">
              <el-icon><Plus /></el-icon> Добавить этап
            </el-button>
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="skillDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveSkill">Сохранить</el-button>
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: Профиль (редактирование) -->
    <el-dialog
      v-model="profileDialogVisible"
      :title="editingProfile ? 'Редактирование профиля' : 'Новый профиль'"
      :width="1000"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="profileForm" label-position="top" class="profile-form">
        <el-form-item label="Название профиля *" prop="position">
          <el-input v-model="profileForm.position" placeholder="Например: Frontend Developer" />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="profileForm.description"
            type="textarea"
            :rows="2"
            placeholder="Краткое описание профиля"
          />
        </el-form-item>

        <!-- Уровни -->
        <div class="form-section">
          <h4 class="section-title">Уровни</h4>
          <div class="levels-list">
            <div v-for="(level, lIdx) in profileForm.levels" :key="lIdx" class="level-item">
              <div class="level-header">
                <el-input
                  v-model="level.name"
                  placeholder="Название уровня (Ученик, 1 Категория...)"
                  class="level-name-input"
                />
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  circle
                  @click="removeLevel(lIdx)"
                />
              </div>

              <!-- Категории -->
              <div class="categories-list">
                <div v-for="(cat, cIdx) in level.categories" :key="cIdx" class="category-item">
                  <div class="category-header">
                    <el-input
                      v-model="cat.name"
                      placeholder="Название категории"
                      class="category-name-input"
                    />
                    <el-tag size="small" type="info">
                      Навыков: {{ cat.skills?.length || 0 }}/4
                    </el-tag>
                    <el-button
                      type="danger"
                      size="small"
                      :icon="Delete"
                      circle
                      @click="removeCategory(lIdx, cIdx)"
                    />
                  </div>

                  <div class="category-skills">
                    <div
                      v-for="(skillId, sIdx) in cat.skills"
                      :key="sIdx"
                      class="skill-select-item"
                    >
                      <el-select
                        v-model="cat.skills[sIdx]"
                        placeholder="Выберите навык"
                        filterable
                        class="skill-select"
                      >
                        <el-option
                          v-for="skill in allSkills"
                          :key="skill.id"
                          :label="skill.name"
                          :value="skill.id"
                        />
                      </el-select>
                      <el-button
                        size="small"
                        type="danger"
                        :icon="Delete"
                        circle
                        @click="cat.skills.splice(sIdx, 1)"
                      />
                    </div>
                    <el-button
                      v-if="(cat.skills?.length || 0) < 4"
                      type="primary"
                      link
                      size="small"
                      @click="cat.skills.push(null)"
                    >
                      <el-icon><Plus /></el-icon> Добавить навык
                    </el-button>
                  </div>
                </div>
                <el-button type="primary" link @click="addCategory(lIdx)" class="add-category-btn">
                  <el-icon><Plus /></el-icon> Добавить категорию
                </el-button>
              </div>

              <!-- Навыки вне категорий -->
              <div class="uncategorized-skills">
                <h5 class="subsection-title">Навыки без категории</h5>
                <div
                  v-for="(skillId, sIdx) in level.uncategorizedSkills"
                  :key="sIdx"
                  class="skill-select-item"
                >
                  <el-select
                    v-model="level.uncategorizedSkills[sIdx]"
                    placeholder="Выберите навык"
                    filterable
                    class="skill-select"
                  >
                    <el-option
                      v-for="skill in allSkills"
                      :key="skill.id"
                      :label="skill.name"
                      :value="skill.id"
                    />
                  </el-select>
                  <el-button
                    size="small"
                    type="danger"
                    :icon="Delete"
                    circle
                    @click="level.uncategorizedSkills.splice(sIdx, 1)"
                  />
                </div>
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="level.uncategorizedSkills.push(null)"
                >
                  <el-icon><Plus /></el-icon> Добавить навык
                </el-button>
              </div>
            </div>
            <el-button type="primary" @click="addLevel" class="add-level-btn">
              <el-icon><Plus /></el-icon> Добавить уровень
            </el-button>
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="profileDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveProfile">Сохранить</el-button>
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: Встреча (ИСПРАВЛЕННОЕ) -->
    <el-dialog
      v-model="meetingDialogVisible"
      :title="editingMeeting ? 'Редактирование встречи' : 'Новая встреча'"
      :width="700"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="meetingForm" label-position="top" class="meeting-form">
        <!-- Участники -->
        <el-form-item label="Участники *" prop="participants">
          <div class="participants-section">
            <div class="participant-row">
              <span class="participant-label">Аттестуемый:</span>
              <el-select
                v-model="meetingForm.attestedId"
                placeholder="Выберите аттестуемого"
                filterable
                class="participant-select"
              >
                <el-option
                  v-for="emp in allEmployees"
                  :key="emp.id"
                  :label="emp.fullName"
                  :value="emp.id"
                />
              </el-select>
            </div>
            <div class="participant-row">
              <span class="participant-label">Аттестующий:</span>
              <el-select
                v-model="meetingForm.attestorId"
                placeholder="Выберите аттестующего"
                filterable
                class="participant-select"
              >
                <el-option
                  v-for="emp in allEmployees"
                  :key="emp.id"
                  :label="emp.fullName"
                  :value="emp.id"
                  :disabled="emp.id === meetingForm.attestedId"
                />
              </el-select>
            </div>
          </div>
        </el-form-item>

        <!-- Навык -->
        <el-form-item label="Навык *" prop="skillId">
          <el-select
            v-model="meetingForm.skillId"
            placeholder="Выберите навык для защиты"
            filterable
            @change="onSkillChange"
          >
            <el-option
              v-for="skill in allSkills"
              :key="skill.id"
              :label="skill.name"
              :value="skill.id"
            />
          </el-select>
        </el-form-item>

        <!-- Тип этапа -->
        <el-form-item label="Тип этапа *" prop="stageType">
          <el-select v-model="meetingForm.stageType" placeholder="Выберите тип этапа">
            <el-option label="Аттестация" value="attestation" />
            <el-option label="Практика" value="practice" />
            <el-option label="Perf. Review" value="performance" />
          </el-select>
        </el-form-item>

        <el-form-item label="Дата и время *" prop="date">
          <el-date-picker
            v-model="meetingForm.date"
            type="datetime"
            placeholder="Выберите дату"
            value-format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="Место *" prop="location">
          <el-input v-model="meetingForm.location" placeholder="Например: Zoom, переговорная 301" />
        </el-form-item>

        <el-form-item label="Длительность (минуты) *" prop="duration">
          <el-input-number
            v-model="meetingForm.duration"
            :min="15"
            :max="180"
            :step="15"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>

        <!-- ✅ Описание встречи (осталось) -->
        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="meetingForm.description"
            type="textarea"
            :rows="3"
            placeholder="Описание встречи, дополнительные заметки"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="meetingDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveMeeting">Сохранить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Delete,
  Edit,
  Search,
  Rank,
  Document,
  Calendar,
  FolderOpened,
} from '@element-plus/icons-vue'
import draggable from 'vuedraggable'

// === Вкладки ===
const tabs = [
  { id: 'skills', label: 'Навыки', icon: FolderOpened },
  { id: 'profiles', label: 'Профили', icon: Document },
  { id: 'meetings', label: 'Встречи', icon: Calendar },
]

const activeTab = ref('skills')

// === Данные: НАВЫКИ ===
const skills = ref([])
const skillSearch = ref('')

const filteredSkills = computed(() => {
  if (!skillSearch.value) return skills.value
  const q = skillSearch.value.toLowerCase()
  return skills.value.filter((s) => s.name?.toLowerCase().includes(q))
})

const allSkills = computed(() => skills.value)

// === Данные: Профили ===
const profiles = ref([])
const profileSearch = ref('')

const filteredProfiles = computed(() => {
  if (!profileSearch.value) return profiles.value
  const q = profileSearch.value.toLowerCase()
  return profiles.value.filter((p) => p.position?.toLowerCase().includes(q))
})

const countProfileSkills = (profile) => {
  if (!profile.levels) return 0
  return profile.levels.reduce((total, level) => {
    let levelSkills = 0
    if (level.categories) {
      level.categories.forEach((cat) => {
        levelSkills += cat.skills?.filter((s) => s).length || 0
      })
    }
    levelSkills += level.uncategorizedSkills?.filter((s) => s).length || 0
    return total + levelSkills
  }, 0)
}

// === Данные: Встречи ===
const meetings = ref([])
const meetingSearch = ref('')

const filteredMeetings = computed(() => {
  if (!meetingSearch.value) return meetings.value
  const q = meetingSearch.value.toLowerCase()
  return meetings.value.filter((m) => m.skillName?.toLowerCase().includes(q))
})

// === Данные: Сотрудники (для выбора в форме встреч) ===
const employees = ref([])
const allEmployees = computed(() => employees.value)

// === Модальные окна ===
const skillDialogVisible = ref(false)
const profileDialogVisible = ref(false)
const meetingDialogVisible = ref(false)
const viewSkillVisible = ref(false)
const viewProfileVisible = ref(false)

const editingSkill = ref(null)
const editingProfile = ref(null)
const editingMeeting = ref(null)
const viewingSkill = ref(null)
const viewingProfile = ref(null)
const expandedStages = ref([])

// === Формы ===
const skillForm = ref({
  name: '',
  description: '',
  materials: [],
  stages: [],
})

const profileForm = ref({
  position: '',
  description: '',
  levels: [],
})

const meetingForm = ref({
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

const getAvailableStageTypes = (currentIndex) => {
  const allTypes = [
    { value: 'attestation', label: 'Аттестация' },
    { value: 'practice', label: 'Практика' },
    { value: 'performance', label: 'Perf. Review' },
  ]

  const usedTypes = skillForm.value.stages
    .filter((_, idx) => idx !== currentIndex)
    .map((s) => s.type)

  return allTypes.filter((t) => !usedTypes.includes(t.value))
}

const getSkillNameById = (id) => skills.value.find((s) => s.id === id)?.name || `Навык #${id}`

// === НАВЫКИ: действия ===
const viewSkill = (skill) => {
  viewingSkill.value = skill
  expandedStages.value = []
  viewSkillVisible.value = true
}

const handleEditSkill = () => {
  openSkillDialog(viewingSkill.value)
  viewSkillVisible.value = false
}

const openSkillDialog = (skill = null) => {
  if (skill) {
    editingSkill.value = skill
    skillForm.value = JSON.parse(JSON.stringify(skill))
  } else {
    editingSkill.value = null
    skillForm.value = {
      name: '',
      description: '',
      materials: [],
      stages: [],
    }
  }
  skillDialogVisible.value = true
}

const addStage = () => {
  const availableTypes = getAvailableStageTypes(skillForm.value.stages.length)
  if (availableTypes.length === 0) {
    ElMessage.warning('Все типы этапов уже добавлены')
    return
  }

  skillForm.value.stages.push({
    type: availableTypes[0].value,
    questions: [],
  })
}

const removeStage = (idx) => {
  skillForm.value.stages.splice(idx, 1)
}

const addQuestion = (stageIdx) => {
  skillForm.value.stages[stageIdx].questions.push({
    text: '',
    answer: '',
  })
}

const removeQuestion = (stageIdx, qIdx) => {
  skillForm.value.stages[stageIdx].questions.splice(qIdx, 1)
}

const saveSkill = () => {
  if (!skillForm.value.name) {
    ElMessage.warning('Введите название навыка')
    return
  }

  if (editingSkill.value) {
    const idx = skills.value.findIndex((s) => s.id === editingSkill.value.id)
    if (idx !== -1) {
      skills.value[idx] = { ...skills.value[idx], ...skillForm.value }
    }
    ElMessage.success('Навык обновлён')
  } else {
    skills.value.unshift({
      id: Date.now(),
      ...skillForm.value,
    })
    ElMessage.success('Навык создан')
  }
  skillDialogVisible.value = false
}

const deleteSkill = async (skill) => {
  try {
    await ElMessageBox.confirm(`Удалить навык "${skill.name}"?`, 'Подтверждение', {
      type: 'warning',
    })
    skills.value = skills.value.filter((s) => s.id !== skill.id)
    ElMessage.success('Навык удалён')
  } catch {
    /* отменено */
  }
}

// === Профили: действия ===
const viewProfile = (profile) => {
  viewingProfile.value = profile
  viewProfileVisible.value = true
}

const handleEditProfile = () => {
  openProfileDialog(viewingProfile.value)
  viewProfileVisible.value = false
}

const openProfileDialog = (profile = null) => {
  if (profile) {
    editingProfile.value = profile
    profileForm.value = JSON.parse(JSON.stringify(profile))
  } else {
    editingProfile.value = null
    profileForm.value = {
      position: '',
      description: '',
      levels: [],
    }
  }
  profileDialogVisible.value = true
}

const addLevel = () => {
  profileForm.value.levels.push({
    name: '',
    categories: [],
    uncategorizedSkills: [],
  })
}

const removeLevel = (idx) => {
  profileForm.value.levels.splice(idx, 1)
}

const addCategory = (levelIdx) => {
  profileForm.value.levels[levelIdx].categories.push({
    name: '',
    skills: [],
  })
}

const removeCategory = (levelIdx, catIdx) => {
  profileForm.value.levels[levelIdx].categories.splice(catIdx, 1)
}

const saveProfile = () => {
  if (!profileForm.value.position) {
    ElMessage.warning('Введите название профиля')
    return
  }

  if (editingProfile.value) {
    const idx = profiles.value.findIndex((p) => p.id === editingProfile.value.id)
    if (idx !== -1) {
      profiles.value[idx] = { ...profiles.value[idx], ...profileForm.value }
    }
    ElMessage.success('Профиль обновлён')
  } else {
    profiles.value.unshift({
      id: Date.now(),
      ...profileForm.value,
    })
    ElMessage.success('Профиль создан')
  }
  profileDialogVisible.value = false
}

const deleteProfile = async (profile) => {
  try {
    await ElMessageBox.confirm(`Удалить профиль "${profile.position}"?`, 'Подтверждение', {
      type: 'warning',
    })
    profiles.value = profiles.value.filter((p) => p.id !== profile.id)
    ElMessage.success('Профиль удалён')
  } catch {
    /* отменено */
  }
}

// === Встречи: действия ===
const onSkillChange = (skillId) => {
  const skill = skills.value.find((s) => s.id === skillId)
  if (skill) {
    meetingForm.value.skillName = skill.name
  }
}

const openMeetingDialog = (meeting = null) => {
  if (meeting) {
    editingMeeting.value = meeting
    meetingForm.value = JSON.parse(JSON.stringify(meeting))
  } else {
    editingMeeting.value = null
    meetingForm.value = {
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
  meetingDialogVisible.value = true
}

const saveMeeting = () => {
  if (!meetingForm.value.skillId || !meetingForm.value.date || !meetingForm.value.location) {
    ElMessage.warning('Заполните все обязательные поля')
    return
  }

  if (!meetingForm.value.attestedId || !meetingForm.value.attestorId) {
    ElMessage.warning('Выберите аттестуемого и аттестующего')
    return
  }

  const attested = employees.value.find((e) => e.id === meetingForm.value.attestedId)
  const attestor = employees.value.find((e) => e.id === meetingForm.value.attestorId)

  if (editingMeeting.value) {
    const idx = meetings.value.findIndex((m) => m.id === editingMeeting.value.id)
    if (idx !== -1) {
      meetings.value[idx] = {
        ...meetings.value[idx],
        ...meetingForm.value,
        attestedName: attested?.fullName || '',
        attestorName: attestor?.fullName || '',
      }
    }
    ElMessage.success('Встреча обновлена')
  } else {
    meetings.value.unshift({
      id: Date.now(),
      ...meetingForm.value,
      attestedName: attested?.fullName || '',
      attestorName: attestor?.fullName || '',
    })
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
    meetings.value = meetings.value.filter((m) => m.id !== meeting.id)
    ElMessage.success('Встреча удалена')
  } catch {
    /* отменено */
  }
}
</script>

<style scoped>
.control-panel {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
  color: var(--text);
}

.panel-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text);
}

.panel-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin: var(--spacing-md) 0 var(--spacing-lg);
  background: var(--background);
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
  width: fit-content;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--gray);
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.1);
}

.tab-btn.active {
  background: var(--primary);
  color: #fff;
}

.tab-btn .el-icon {
  font-size: 16px;
}

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
  color: var(--primary);
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
  cursor: pointer;
}

.data-table :deep(.el-table__row) {
  cursor: pointer;
}

.data-table :deep(.el-table__row:hover) {
  background-color: var(--background);
}

/* Участники в таблице */
.participants-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Формы */
.skill-form,
.profile-form,
.meeting-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}

.form-section {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-md);
}

.section-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
}

.section-description {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 13px;
  color: var(--gray);
  font-style: italic;
}

.subsection-title {
  margin: var(--spacing-md) 0 var(--spacing-sm) 0;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

/* Материалы */
.materials-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.material-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

/* Этапы */
.stages-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.stage-item {
  padding: var(--spacing-md);
  background: #fff;
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}

.stage-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.stage-number {
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
  min-width: 80px;
}

.stage-type-select {
  width: 180px;
}

.stage-questions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: #f9f9f9;
  border-radius: var(--radius-sm);
}

.question-item {
  padding: var(--spacing-md);
  background: #fff;
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.question-number {
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--primary);
}

/* Уровни и категории */
.levels-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.level-item {
  padding: var(--spacing-md);
  background: #fff;
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}

.level-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.level-name-input {
  flex: 1;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding-left: var(--spacing-md);
  border-left: 2px solid var(--background);
}

.category-item {
  padding: var(--spacing-md);
  background: #f9f9f9;
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.category-name-input {
  flex: 1;
}

.category-skills {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.skill-select-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.skill-select {
  flex: 1;
}

.uncategorized-skills {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: #f0f0f0;
  border-radius: var(--radius-sm);
}

/* Участники */
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

/* === Модальные окна просмотра === */
.view-content {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}

.materials-list-view {
  list-style: disc;
  padding-left: var(--spacing-md);
  margin: 0;
}

.materials-list-view li {
  margin-bottom: var(--spacing-xs);
  font-size: 14px;
}

.empty-text {
  color: var(--gray);
  font-style: italic;
}

.stages-collapse {
  border: none;
  background: transparent;
  margin-top: var(--spacing-sm);
}

.stage-questions-view {
  padding: var(--spacing-sm);
}

.question-view {
  background: #fff;
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
  margin-bottom: var(--spacing-sm);
}

.question-view p {
  margin: var(--spacing-xs) 0;
  font-size: 14px;
}

.question-view strong {
  color: var(--primary);
}

.level-view {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: #f9f9f9;
  border-radius: var(--radius-sm);
}

.level-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}

.categories-view,
.uncategorized-view {
  margin-left: var(--spacing-md);
}

.category-view {
  margin-bottom: var(--spacing-sm);
}

.skills-list-view {
  list-style: disc;
  padding-left: var(--spacing-md);
  margin: var(--spacing-xs) 0;
}

.skills-list-view li {
  font-size: 14px;
  margin-bottom: var(--spacing-xs);
}

/* Адаптивность */
@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .skill-form,
  .profile-form,
  .meeting-form {
    max-height: 60vh;
  }

  .participant-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .participant-label {
    min-width: auto;
    margin-bottom: var(--spacing-xs);
  }
}

/* Deep styles для Element Plus */
:deep(.admin-dialog .el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}

:deep(.admin-dialog .el-form-item__label) {
  font-weight: var(--font-weight-medium);
}

:deep(.el-descriptions__label) {
  font-weight: var(--font-weight-medium);
  width: 150px !important;
}
</style>
