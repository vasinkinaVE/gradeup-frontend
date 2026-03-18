<template>
  <div class="control-panel">
    <!-- Заголовок панели -->
    <header class="panel-header">
      <div>
        <h1>Панель управления</h1>
      </div>
    </header>

    <!-- Навигация по разделам -->
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
        <el-badge v-if="tab.badge" :value="tab.badge" :max="99" class="tab-badge" />
      </button>
    </div>

    <!-- Секция: Аттестации (Темы) -->
    <section v-if="activeTab === 'certifications'" class="tab-content">
      <div class="section-header">
        <h2>Управление темами</h2>
        <el-button type="primary" @click="openCertificationDialog()">
          <el-icon><Plus /></el-icon>
          Создать тему
        </el-button>
      </div>

      <!-- Фильтры и поиск -->
      <div class="filters-row">
        <el-input
          v-model="certSearch"
          placeholder="Поиск по теме или ID"
          prefix-icon="Search"
          clearable
          class="search-input"
          @input="filterCertifications"
        />
        <el-select
          v-model="certFilterPosition"
          placeholder="Все должности"
          clearable
          class="filter-select"
        >
          <el-option label="Все должности" value="" />
          <el-option v-for="pos in availablePositions" :key="pos" :label="pos" :value="pos" />
        </el-select>
        <el-select
          v-model="certFilterCategory"
          placeholder="Все категории"
          clearable
          class="filter-select"
        >
          <el-option label="Все категории" value="" />
          <el-option v-for="cat in availableCategories" :key="cat" :label="cat" :value="cat" />
        </el-select>
      </div>

      <!-- Таблица тем -->
      <el-table
        :data="filteredCertifications"
        stripe
        border
        class="data-table"
        @row-click="openCertificationDialog"
      >
        <el-table-column prop="id" label="ID" width="80" sortable />
        <el-table-column prop="topicName" label="Тема" min-width="200">
          <template #default="{ row }">
            <div class="cert-name-cell">
              <span class="cert-name">{{ row.topicName }}</span>
              <el-tag v-if="row.isDraft" size="small" type="info">Черновик</el-tag>
              <el-tag v-else-if="row.isActive" size="small" type="success">Активна</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="position" label="Должность" width="180" />
        <el-table-column prop="category" label="Категория" width="120" />
        <el-table-column prop="section" label="Раздел" width="150" />
        <el-table-column prop="certificationType" label="Тип" width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="getTypeTag(row.certificationType)">
              {{ getTypeLabel(row.certificationType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="questionsCount" label="Вопросов" width="100" align="center" />
        <el-table-column prop="updatedAt" label="Обновлена" width="150" sortable />
        <el-table-column label="Действия" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                type="primary"
                :icon="Edit"
                @click.stop="openCertificationDialog(row)"
                title="Редактировать"
              />
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click.stop="deleteCertification(row)"
                title="Удалить"
              />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- Пагинация -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="certPage"
          v-model:page-size="certPageSize"
          :total="certifications.length"
          :page-sizes="[10, 25, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </section>

    <!-- Секция: Вопросы -->
    <section v-if="activeTab === 'questions'" class="tab-content">
      <div class="section-header">
        <h2>База вопросов</h2>
        <el-button type="primary" @click="openQuestionDialog()">
          <el-icon><Plus /></el-icon>
          Добавить вопрос
        </el-button>
      </div>

      <!-- Фильтры -->
      <div class="filters-row">
        <el-input
          v-model="questionSearch"
          placeholder="Поиск по тексту вопроса или ответа"
          prefix-icon="Search"
          clearable
          class="search-input"
          @input="filterQuestions"
        />
        <el-select
          v-model="questionSection"
          placeholder="Все разделы"
          clearable
          class="filter-select"
        >
          <el-option label="Все разделы" value="" />
          <el-option v-for="cat in questionCategories" :key="cat" :label="cat" :value="cat" />
        </el-select>
        <el-select
          v-model="questionDifficulty"
          placeholder="Сложность"
          clearable
          class="filter-select"
        >
          <el-option label="Любая" value="" />
          <el-option label="Лёгкий" value="easy" />
          <el-option label="Средний" value="medium" />
          <el-option label="Сложный" value="hard" />
        </el-select>
      </div>

      <!-- Список вопросов (таблица) -->
      <el-table
        :data="filteredQuestions"
        stripe
        border
        class="data-table"
        @row-click="openQuestionDialog"
      >
        <el-table-column prop="id" label="ID" width="80" sortable />
        <el-table-column prop="text" label="Вопрос" min-width="300" show-overflow-tooltip />
        <el-table-column prop="section" label="Раздел" width="150" />
        <el-table-column prop="difficulty" label="Сложность" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getDifficultyTag(row.difficulty)">
              {{ getDifficultyLabel(row.difficulty) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="topicsCount" label="Тем" width="80" align="center" />
        <el-table-column label="Действия" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                type="primary"
                :icon="Edit"
                @click.stop="openQuestionDialog(row)"
                title="Редактировать"
              />
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click.stop="deleteQuestion(row)"
                title="Удалить"
              />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="questionPage"
          v-model:page-size="questionPageSize"
          :total="questions.length"
          :page-sizes="[10, 25, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </section>

    <!-- Секция: Профили (ОБНОВЛЁННАЯ) -->
    <section v-if="activeTab === 'profiles'" class="tab-content">
      <div class="section-header">
        <h2>Управление профилями</h2>
        <el-button type="primary" @click="openProfileDialog()">
          <el-icon><Plus /></el-icon>
          Создать профиль
        </el-button>
      </div>

      <!-- Фильтры -->
      <div class="filters-row">
        <el-input
          v-model="profileSearch"
          placeholder="Поиск по должности"
          prefix-icon="Search"
          clearable
          class="search-input"
        />
      </div>

      <!-- Список профилей -->
      <div class="profiles-list">
        <div
          v-for="profile in filteredProfiles"
          :key="profile.id"
          class="profile-card"
          @click="openProfileDialog(profile)"
        >
          <div class="profile-header">
            <h3 class="profile-name">{{ profile.position }}</h3>
          </div>
          <p class="profile-description">{{ profile.description }}</p>
          <div class="profile-stats">
            <span
              >Уровней: <strong>{{ profile.levels?.length || 0 }}</strong></span
            >
            <span
              >Тем: <strong>{{ countProfileTopics(profile) }}</strong></span
            >
          </div>
          <div class="profile-actions">
            <el-button size="small" type="primary" @click.stop="openProfileDialog(profile)">
              Редактировать
            </el-button>
            <el-button size="small" type="danger" @click.stop="deleteProfile(profile)">
              Удалить
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- Секция: Сотрудники -->
    <section v-if="activeTab === 'employees'" class="tab-content">
      <div class="section-header">
        <h2>Профили сотрудников</h2>
      </div>

      <div class="filters-row">
        <el-input
          v-model="employeeSearch"
          placeholder="Поиск сотрудника"
          prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-select
          v-model="filterPosition"
          placeholder="Все должности"
          class="filter-select"
          clearable
        >
          <el-option label="Все должности" value="" />
          <el-option v-for="pos in uniquePositions" :key="pos" :label="pos" :value="pos" />
        </el-select>
      </div>

      <div class="employees-list">
        <div
          v-for="employee in filteredEmployees"
          :key="employee.id"
          class="employee-item"
          @click="viewEmployeeProfile(employee)"
        >
          <div class="employee-avatar">
            <span>{{ getInitials(employee.fullName) }}</span>
          </div>
          <div class="employee-info">
            <h3 class="employee-name">{{ employee.fullName }}</h3>
            <p class="employee-position">{{ employee.position }}</p>
            <div class="employee-meta">
              <span class="badge category">{{ employee.currentProfile || 'Не назначен' }}</span>
            </div>
          </div>
          <div class="employee-progress">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: employee.progress + '%' }"></div>
            </div>
            <span class="progress-percent">{{ employee.progress }}%</span>
          </div>
          <div class="employee-stats">
            <span>Тем: {{ employee.closedTopics || 0 }}/{{ employee.totalTopics || 0 }}</span>
            <span v-if="employee.nextAttestation" class="next-attestation">
              След: {{ employee.nextAttestation }}
            </span>
          </div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>
    </section>

    <!-- Модальное окно: Аттестация (Тема) -->
    <el-dialog
      v-model="certDialogVisible"
      :title="editingCertification ? 'Редактирование темы' : 'Новая тема'"
      :width="900"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="certForm" label-position="top" class="cert-form">
        <div class="form-row">
          <el-form-item label="Тема *" prop="topicName">
            <el-input v-model="certForm.topicName" placeholder="Например: Проектирование схем БД" />
          </el-form-item>
          <el-form-item label="Тип подтверждения *" prop="certificationType">
            <el-select v-model="certForm.certificationType" placeholder="Выберите тип">
              <el-option label="Аттестация" value="attestation" />
              <el-option label="Практика" value="practice" />
              <el-option label="Performance Review" value="performance" />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="Должность *" prop="position">
            <el-select
              v-model="certForm.position"
              placeholder="Выберите должность"
              filterable
              allow-create
            >
              <el-option v-for="pos in availablePositions" :key="pos" :label="pos" :value="pos" />
            </el-select>
          </el-form-item>
          <el-form-item label="Категория *" prop="category">
            <el-select v-model="certForm.category" placeholder="Выберите категорию">
              <el-option v-for="cat in availableCategories" :key="cat" :label="cat" :value="cat" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="Раздел" prop="section">
          <el-input
            v-model="certForm.section"
            placeholder="Например: Базы данных (обобщенная тематика)"
          />
        </el-form-item>

        <el-form-item label="Статус" prop="status">
          <el-radio-group v-model="certForm.status">
            <el-radio label="draft">Черновик</el-radio>
            <el-radio label="active">Активна</el-radio>
            <el-radio label="archived">Архив</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="certForm.description"
            type="textarea"
            :rows="3"
            placeholder="Описание темы, цели, требования"
          />
        </el-form-item>

        <!-- Материалы для подготовки -->
        <el-form-item label="Материалы для подготовки">
          <div class="materials-list">
            <div v-for="(mat, idx) in certForm.materials" :key="idx" class="material-item">
              <el-input
                v-model="certForm.materials[idx]"
                placeholder="Ссылка или название материала"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="certForm.materials.splice(idx, 1)"
              />
            </div>
            <el-button type="primary" link @click="certForm.materials.push('')">
              <el-icon><Plus /></el-icon> Добавить материал
            </el-button>
          </div>
        </el-form-item>

        <!-- Вопросы аттестации -->
        <el-form-item label="Вопросы и задания">
          <div class="questions-list-manager">
            <draggable
              v-model="certForm.questionsList"
              item-key="id"
              class="questions-drag-list"
              @end="reorderQuestions"
            >
              <template #item="{ element }">
                <div class="question-drag-item">
                  <el-icon class="drag-handle"><Rank /></el-icon>
                  <div class="question-info">
                    <span class="question-text-short">{{ element.text }}</span>
                    <span class="question-meta-info">
                      <el-tag size="small" :type="getDifficultyTag(element.difficulty)">
                        {{ getDifficultyLabel(element.difficulty) }}
                      </el-tag>
                      <span class="question-category">{{ element.section }}</span>
                    </span>
                  </div>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    size="small"
                    @click="removeQuestionFromCert(element.id)"
                    title="Удалить из темы"
                  />
                </div>
              </template>
            </draggable>

            <div class="add-question-section">
              <el-button type="primary" @click="openAddQuestionDialog">
                <el-icon><Plus /></el-icon>
                Добавить вопрос
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="certDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveCertification">Сохранить</el-button>
      </template>
    </el-dialog>

    <!-- Модальное окно: Выбор вопроса для добавления -->
    <el-dialog
      v-model="addQuestionDialogVisible"
      title="Добавить вопрос в тему"
      :width="700"
      class="admin-dialog"
      destroy-on-close
    >
      <el-input
        v-model="questionSearchFilter"
        placeholder="Поиск вопроса"
        prefix-icon="Search"
        clearable
        class="search-input"
        style="margin-bottom: 16px"
      />

      <el-table
        :data="filteredAvailableQuestions"
        stripe
        border
        class="questions-select-table"
        @row-click="addQuestionToCert"
      >
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="text" label="Вопрос" min-width="300" show-overflow-tooltip />
        <el-table-column prop="section" label="Раздел" width="150" />
        <el-table-column prop="difficulty" label="Сложность" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getDifficultyTag(row.difficulty)">
              {{ getDifficultyLabel(row.difficulty) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Действие" width="100" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="addQuestionToCert(row)">
              Добавить
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- Модальное окно: Вопрос -->
    <el-dialog
      v-model="questionDialogVisible"
      :title="editingQuestion ? 'Редактирование вопроса' : 'Новый вопрос'"
      :width="700"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="questionForm" label-position="top" class="question-form">
        <el-form-item label="Текст вопроса *" prop="text">
          <el-input
            v-model="questionForm.text"
            type="textarea"
            :rows="3"
            placeholder="Введите текст вопроса"
          />
        </el-form-item>

        <el-form-item label="Эталонный ответ *" prop="answer">
          <el-input
            v-model="questionForm.answer"
            type="textarea"
            :rows="4"
            placeholder="Введите правильный ответ"
          />
        </el-form-item>

        <div class="form-row">
          <el-form-item label="Раздел" prop="section">
            <el-select v-model="questionForm.section" placeholder="Выберите раздел" filterable>
              <el-option v-for="cat in questionCategories" :key="cat" :label="cat" :value="cat" />
            </el-select>
          </el-form-item>
          <el-form-item label="Сложность" prop="difficulty">
            <el-select v-model="questionForm.difficulty" placeholder="Выберите сложность">
              <el-option label="Лёгкий" value="easy" />
              <el-option label="Средний" value="medium" />
              <el-option label="Сложный" value="hard" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="Дополнительные материалы">
          <div class="materials-list">
            <div v-for="(mat, idx) in questionForm.materials" :key="idx" class="material-item">
              <el-input
                v-model="questionForm.materials[idx]"
                placeholder="Ссылка, файл или текст"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="questionForm.materials.splice(idx, 1)"
              />
            </div>
            <el-button type="primary" link @click="questionForm.materials.push('')">
              <el-icon><Plus /></el-icon> Добавить материал
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="Привязка к темам">
          <el-select
            v-model="questionForm.topics"
            multiple
            filterable
            placeholder="Выберите темы"
            class="w-100"
          >
            <el-option
              v-for="topic in availableTopics"
              :key="topic.id"
              :label="topic.name"
              :value="topic.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="questionDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveQuestion">Сохранить</el-button>
      </template>
    </el-dialog>

    <!-- Модальное окно: Профиль (ОБНОВЛЁННОЕ) -->
    <el-dialog
      v-model="profileDialogVisible"
      :title="editingProfile ? 'Редактирование профиля' : 'Новый профиль'"
      :width="1000"
      class="admin-dialog profile-dialog"
      destroy-on-close
    >
      <el-form :model="profileForm" label-position="top" class="profile-form">
        <!-- Основная информация -->
        <div class="form-row">
          <el-form-item label="Должность *" prop="position">
            <el-input v-model="profileForm.position" placeholder="Например: Frontend Developer" />
          </el-form-item>
          <el-form-item label="Количество уровней *" prop="levelsCount">
            <el-input-number
              v-model="profileForm.levelsCount"
              :min="1"
              :max="10"
              controls-position="right"
              @change="handleLevelsCountChange"
            />
          </el-form-item>
        </div>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="profileForm.description"
            type="textarea"
            :rows="2"
            placeholder="Описание профиля"
          />
        </el-form-item>

        <!-- Названия уровней -->
        <div v-if="profileForm.levelsCount > 0" class="levels-section">
          <h3 class="section-title">Названия уровней</h3>
          <div class="levels-names">
            <div v-for="(level, idx) in profileForm.levels" :key="idx" class="level-name-item">
              <span class="level-label">Уровень {{ idx + 1 }}:</span>
              <el-input
                v-model="level.name"
                placeholder="Например: Ученик, 1 Категория..."
                @input="updateLevelsStructure"
              />
            </div>
          </div>
        </div>

        <!-- Структура: Уровни → Разделы → Темы -->
        <div v-if="profileForm.levels.length > 0" class="levels-structure-section">
          <h3 class="section-title">Структура профиля</h3>

          <div v-for="(level, levelIdx) in profileForm.levels" :key="levelIdx" class="level-block">
            <div class="level-header">
              <h4>{{ level.name || `Уровень ${levelIdx + 1}` }}</h4>
              <el-button size="small" type="primary" @click="addSectionToLevel(levelIdx)">
                <el-icon><Plus /></el-icon> Добавить раздел
              </el-button>
            </div>

            <!-- Разделы внутри уровня -->
            <div class="sections-container">
              <div
                v-for="(section, sectionIdx) in level.sections"
                :key="sectionIdx"
                class="section-block"
              >
                <div class="section-header">
                  <el-input
                    v-model="section.name"
                    placeholder="Название раздела (например: Базы данных)"
                    class="section-name-input"
                  />
                  <el-button
                    type="danger"
                    size="small"
                    @click="removeSectionFromLevel(levelIdx, sectionIdx)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>

                <!-- Темы внутри раздела -->
                <div class="topics-container">
                  <div
                    v-for="(topic, topicIdx) in section.topics"
                    :key="topicIdx"
                    class="topic-item"
                  >
                    <div class="topic-header">
                      <el-select
                        v-model="topic.topicId"
                        placeholder="Выберите тему"
                        filterable
                        class="topic-select"
                      >
                        <el-option
                          v-for="t in availableTopics"
                          :key="t.id"
                          :label="t.name"
                          :value="t.id"
                        />
                      </el-select>
                      <el-button
                        type="danger"
                        size="small"
                        @click="removeTopicFromSection(levelIdx, sectionIdx, topicIdx)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <div class="topic-settings">
                      <el-form-item label="Тип" size="small">
                        <el-select v-model="topic.confirmationType" placeholder="Тип">
                          <el-option label="Аттестация" value="attestation" />
                          <el-option label="Практика" value="practice" />
                          <el-option label="Perf. Review" value="performance" />
                        </el-select>
                      </el-form-item>
                      <el-form-item label="Обязательно" size="small">
                        <el-switch v-model="topic.isRequired" />
                      </el-form-item>
                    </div>
                  </div>
                  <el-button
                    type="primary"
                    link
                    @click="addTopicToSection(levelIdx, sectionIdx)"
                    class="add-topic-btn"
                  >
                    <el-icon><Plus /></el-icon> Добавить тему
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="profileDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveProfile">Сохранить</el-button>
      </template>
    </el-dialog>

    <!-- Модальное окно: Просмотр профиля сотрудника -->
    <el-dialog
      v-model="employeeProfileVisible"
      title="Профиль сотрудника"
      :width="900"
      class="admin-dialog employee-profile-dialog"
      destroy-on-close
    >
      <div v-if="selectedEmployee" class="employee-profile-view">
        <div class="employee-header">
          <div class="employee-avatar">{{ getInitials(selectedEmployee.fullName) }}</div>
          <div>
            <h2>{{ selectedEmployee.fullName }}</h2>
            <p>{{ selectedEmployee.position }} • {{ selectedEmployee.department }}</p>
            <el-tag>{{ selectedEmployee.currentProfile || 'Профиль не назначен' }}</el-tag>
          </div>
        </div>

        <!-- Категории -->
        <div class="categories-section">
          <div
            v-for="cat in employeeProfile.categories"
            :key="cat.id"
            class="category-row"
            :class="{ active: cat.isCurrent }"
            @click="toggleCategory(cat.id)"
          >
            <div class="category-info">
              <span class="category-name">{{ cat.name }}</span>
              <span v-if="cat.isCurrent" class="badge current">Текущая</span>
              <span v-else-if="cat.completed" class="badge completed">✓ Завершена</span>
            </div>
            <div class="category-progress">
              <span class="progress-value">{{ cat.progress }}%</span>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" :style="{ width: cat.progress + '%' }"></div>
              </div>
              <el-icon class="expand-icon">
                <ArrowUp v-if="cat.isCurrent || expandedCategories.includes(cat.id)" />
                <ArrowDown v-else />
              </el-icon>
            </div>
          </div>
        </div>

        <!-- Темы по категориям -->
        <div class="topics-section">
          <div
            v-for="category in employeeProfile.categories.filter(
              (c) => expandedCategories.includes(c.id) || c.isCurrent,
            )"
            :key="category.id"
            class="category-block"
          >
            <div v-for="section in category.sections" :key="section.id" class="topic-section">
              <h4 class="section-title">{{ section.name }}</h4>
              <div class="topics-table">
                <table>
                  <thead>
                    <tr>
                      <th>Название темы</th>
                      <th>Тип закрытия</th>
                      <th>Прогресс</th>
                      <th>Этапы</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="topic in section.topics" :key="topic.id">
                      <td class="topic-name">{{ topic.title }}</td>
                      <td>
                        <span class="badge type" :class="getTypeClass(topic.type)">
                          {{ getTypeLabel(topic.type) }}
                        </span>
                      </td>
                      <td>
                        <div class="topic-progress">
                          <span class="progress-percent">{{ topic.progress }}%</span>
                          <div class="progress-bar-bg">
                            <div
                              class="progress-bar-fill"
                              :style="{ width: topic.progress + '%' }"
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td class="stages">{{ topic.stagesCompleted }} / {{ topic.totalStages }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="section-block">
          <h3>Ближайшая аттестация</h3>
          <p>{{ selectedEmployee.nextAttestation || 'Не назначена' }}</p>
        </div>

        <div class="section-block">
          <h3>Контакты</h3>
          <p>Email: {{ selectedEmployee.email || 'Не указан' }}</p>
        </div>
      </div>

      <template #footer>
        <el-button class="btn-close" @click="employeeProfileVisible = false">Закрыть</el-button>
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
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Document,
  QuestionFilled,
  FolderOpened,
  User,
} from '@element-plus/icons-vue'
import draggable from 'vuedraggable'

// === Вкладки ===
const tabs = [
  { id: 'certifications', label: 'Аттестации', icon: Document, badge: null },
  { id: 'questions', label: 'Вопросы', icon: QuestionFilled, badge: null },
  { id: 'profiles', label: 'Профили', icon: FolderOpened, badge: null },
  { id: 'employees', label: 'Сотрудники', icon: User, badge: null },
]

const activeTab = ref('certifications')

// === Доступные значения ===
const availablePositions = [
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Developer',
  'DevOps Engineer',
  'QA Engineer',
]

const availableCategories = [
  'Ученик',
  '1 Категория',
  '2 Категория',
  '3 Категория',
  'Senior',
  'Lead',
]

// === Данные: Аттестации (Темы) ===
const certifications = ref([
  {
    id: 1,
    topicName: 'Проектирование схем БД',
    position: 'Frontend Developer',
    category: '3 Категория',
    section: 'Базы данных',
    certificationType: 'attestation',
    description: 'Умение проектировать нормализованные схемы данных',
    status: 'active',
    questionsCount: 15,
    updatedAt: '15.03.2026',
    isDraft: false,
    isActive: true,
    materials: ['Книга: "Проектирование реляционных баз данных"'],
    questionsList: [
      { id: 1, text: 'Что такое нормализация?', section: 'Базы данных', difficulty: 'medium' },
    ],
  },
])

const certSearch = ref('')
const certFilterPosition = ref('')
const certFilterCategory = ref('')
const certPage = ref(1)
const certPageSize = ref(10)

const filteredCertifications = computed(() => {
  let result = [...certifications.value]

  if (certSearch.value) {
    const q = certSearch.value.toLowerCase()
    result = result.filter(
      (c) =>
        c.topicName.toLowerCase().includes(q) ||
        String(c.id).includes(q) ||
        c.section.toLowerCase().includes(q),
    )
  }

  if (certFilterPosition.value) {
    result = result.filter((c) => c.position === certFilterPosition.value)
  }

  if (certFilterCategory.value) {
    result = result.filter((c) => c.category === certFilterCategory.value)
  }

  return result
})

// === Данные: Вопросы ===
const questionCategories = [
  'Базы данных',
  'Frontend',
  'Backend',
  'Архитектура',
  'Тестирование',
  'DevOps',
]

const availableTopics = [
  { id: 1, name: 'Проектирование схем БД' },
  { id: 2, name: 'Оптимизация запросов' },
  { id: 3, name: 'Vue 3 Composition API' },
  { id: 4, name: 'Микросервисная архитектура' },
]

const questions = ref([
  {
    id: 1,
    text: 'Что такое нормализация и зачем она нужна?',
    answer: 'Процесс организации данных для уменьшения избыточности',
    section: 'Базы данных',
    difficulty: 'medium',
    materials: ['Книга: "Проектирование реляционных баз данных"'],
    topics: [1],
  },
])

const questionSearch = ref('')
const questionSection = ref('')
const questionDifficulty = ref('')
const questionPage = ref(1)
const questionPageSize = ref(10)

const filteredQuestions = computed(() => {
  let result = [...questions.value]

  if (questionSearch.value) {
    const q = questionSearch.value.toLowerCase()
    result = result.filter(
      (qs) => qs.text.toLowerCase().includes(q) || qs.answer.toLowerCase().includes(q),
    )
  }

  if (questionSection.value) {
    result = result.filter((qs) => qs.section === questionSection.value)
  }

  if (questionDifficulty.value) {
    result = result.filter((qs) => qs.difficulty === questionDifficulty.value)
  }

  return result
})

// === Данные: Профили (ОБНОВЛЁННАЯ СТРУКТУРА) ===
const profiles = ref([
  {
    id: 1,
    position: 'Frontend Developer',
    description: 'Профиль для фронтенд-разработчиков',
    levels: [
      {
        name: 'Ученик',
        sections: [
          {
            name: 'Базы данных',
            topics: [{ topicId: 1, confirmationType: 'attestation', isRequired: true }],
          },
        ],
      },
      {
        name: '1 Категория',
        sections: [
          {
            name: 'Frontend Разработка',
            topics: [{ topicId: 3, confirmationType: 'practice', isRequired: true }],
          },
        ],
      },
    ],
  },
])

const profileSearch = ref('')

const filteredProfiles = computed(() => {
  let result = [...profiles.value]

  if (profileSearch.value) {
    const q = profileSearch.value.toLowerCase()
    result = result.filter((p) => p.position.toLowerCase().includes(q))
  }

  return result
})

// Подсчёт общего количества тем в профиле
const countProfileTopics = (profile) => {
  if (!profile.levels) return 0
  return profile.levels.reduce((total, level) => {
    return (
      total +
      level.sections.reduce((sectionTotal, section) => {
        return sectionTotal + (section.topics?.length || 0)
      }, 0)
    )
  }, 0)
}

// === Данные: Сотрудники ===
const employees = ref([
  {
    id: 1,
    fullName: 'Иванов Иван Иванович',
    position: 'Frontend Developer',
    department: 'Отдел разработки',
    currentProfile: 'Frontend - 3 Категория',
    progress: 56,
    closedTopics: 14,
    totalTopics: 25,
    nextAttestation: '17.03.2026',
    email: 'ivanov@company.ru',
  },
])

const employeeSearch = ref('')
const filterPosition = ref('')

const uniquePositions = computed(() => {
  const positions = new Set(employees.value.map((e) => e.position))
  return Array.from(positions)
})

const filteredEmployees = computed(() => {
  let result = [...employees.value]

  if (employeeSearch.value) {
    const q = employeeSearch.value.toLowerCase()
    result = result.filter(
      (e) => e.fullName.toLowerCase().includes(q) || e.position.toLowerCase().includes(q),
    )
  }

  if (filterPosition.value) {
    result = result.filter((e) => e.position === filterPosition.value)
  }

  return result
})

// === Модальные окна ===
const certDialogVisible = ref(false)
const questionDialogVisible = ref(false)
const profileDialogVisible = ref(false)
const employeeProfileVisible = ref(false)
const addQuestionDialogVisible = ref(false)
const questionSearchFilter = ref('')

const editingCertification = ref(null)
const editingQuestion = ref(null)
const editingProfile = ref(null)
const selectedEmployee = ref(null)
const expandedCategories = ref([])

// Формы
const certForm = ref({
  topicName: '',
  position: '',
  category: '',
  section: '',
  certificationType: 'attestation',
  description: '',
  status: 'draft',
  materials: [],
  questionsList: [],
})

const questionForm = ref({
  text: '',
  answer: '',
  section: '',
  difficulty: 'medium',
  materials: [],
  topics: [],
})

const profileForm = ref({
  position: '',
  description: '',
  levelsCount: 1,
  levels: [
    {
      name: '',
      sections: [
        {
          name: '',
          topics: [],
        },
      ],
    },
  ],
})

// === Профиль сотрудника с детальной информацией ===
const employeeProfile = ref({
  categories: [
    {
      id: 1,
      name: 'Ученик',
      progress: 100,
      completed: true,
      isCurrent: false,
      sections: [
        {
          id: 101,
          name: 'Базы данных',
          topics: [
            {
              id: 1001,
              title: 'Проектирование схем БД',
              type: 'attestation',
              progress: 100,
              stagesCompleted: 2,
              totalStages: 2,
            },
          ],
        },
      ],
    },
    {
      id: 4,
      name: '3 Категория',
      progress: 56,
      completed: false,
      isCurrent: true,
      sections: [
        {
          id: 401,
          name: 'Базы данных',
          topics: [
            {
              id: 4001,
              title: 'Проектирование схем БД',
              type: 'attestation',
              progress: 50,
              stagesCompleted: 1,
              totalStages: 2,
            },
          ],
        },
      ],
    },
  ],
})

// === Хелперы ===
const getDifficultyLabel = (diff) =>
  ({
    easy: 'Лёгкий',
    medium: 'Средний',
    hard: 'Сложный',
  })[diff] || diff

const getDifficultyTag = (diff) =>
  ({
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  })[diff] || 'info'

const getTypeLabel = (type) =>
  ({
    attestation: 'Аттестация',
    practice: 'Практика',
    performance: 'Perf. Review',
  })[type] || type

const getTypeTag = (type) =>
  ({
    attestation: 'warning',
    practice: 'success',
    performance: 'danger',
  })[type] || 'info'

const getTypeClass = (type) => `type-${type}`

const getInitials = (name) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

const availableQuestions = computed(() => questions.value)

const filteredAvailableQuestions = computed(() => {
  if (!questionSearchFilter.value) return availableQuestions.value
  const q = questionSearchFilter.value.toLowerCase()
  return availableQuestions.value.filter((quest) => quest.text.toLowerCase().includes(q))
})

// === Действия: Аттестации ===
const openCertificationDialog = (cert = null) => {
  if (cert) {
    editingCertification.value = cert
    certForm.value = {
      topicName: cert.topicName,
      position: cert.position,
      category: cert.category,
      section: cert.section,
      certificationType: cert.certificationType,
      description: cert.description,
      status: cert.status,
      materials: [...(cert.materials || [])],
      questionsList: [...(cert.questionsList || [])],
    }
  } else {
    editingCertification.value = null
    certForm.value = {
      topicName: '',
      position: '',
      category: '',
      section: '',
      certificationType: 'attestation',
      description: '',
      status: 'draft',
      materials: [],
      questionsList: [],
    }
  }
  certDialogVisible.value = true
}

const saveCertification = () => {
  if (!certForm.value.topicName) {
    ElMessage.warning('Введите название темы')
    return
  }
  if (!certForm.value.position) {
    ElMessage.warning('Выберите должность')
    return
  }
  if (!certForm.value.category) {
    ElMessage.warning('Выберите категорию')
    return
  }

  if (editingCertification.value) {
    const idx = certifications.value.findIndex((c) => c.id === editingCertification.value.id)
    if (idx !== -1) {
      certifications.value[idx] = {
        ...certifications.value[idx],
        ...certForm.value,
        questionsCount: certForm.value.questionsList.length,
        updatedAt: new Date().toLocaleDateString('ru-RU'),
      }
    }
    ElMessage.success('Тема обновлена')
  } else {
    certifications.value.unshift({
      id: Date.now(),
      ...certForm.value,
      questionsCount: certForm.value.questionsList.length,
      updatedAt: new Date().toLocaleDateString('ru-RU'),
      isDraft: certForm.value.status === 'draft',
      isActive: certForm.value.status === 'active',
    })
    ElMessage.success('Тема создана')
  }
  certDialogVisible.value = false
}

const deleteCertification = async (cert) => {
  try {
    await ElMessageBox.confirm(`Удалить тему "${cert.topicName}"?`, 'Подтверждение', {
      type: 'warning',
    })
    certifications.value = certifications.value.filter((c) => c.id !== cert.id)
    ElMessage.success('Тема удалена')
  } catch {
    // Отменено
  }
}

const reorderQuestions = () => {
  ElMessage.info('Порядок вопросов обновлён')
}

const removeQuestionFromCert = (questionId) => {
  certForm.value.questionsList = certForm.value.questionsList.filter((q) => q.id !== questionId)
}

const openAddQuestionDialog = () => {
  questionSearchFilter.value = ''
  addQuestionDialogVisible.value = true
}

const addQuestionToCert = (question) => {
  const exists = certForm.value.questionsList.some((q) => q.id === question.id)
  if (exists) {
    ElMessage.warning('Этот вопрос уже добавлен')
    return
  }

  certForm.value.questionsList.push({
    id: question.id,
    text: question.text,
    section: question.section,
    difficulty: question.difficulty,
  })
  ElMessage.success('Вопрос добавлен')
  addQuestionDialogVisible.value = false
}

// === Действия: Вопросы ===
const openQuestionDialog = (question = null) => {
  if (question) {
    editingQuestion.value = question
    questionForm.value = {
      text: question.text,
      answer: question.answer,
      section: question.section,
      difficulty: question.difficulty,
      materials: [...(question.materials || [])],
      topics: [...(question.topics || [])],
    }
  } else {
    editingQuestion.value = null
    questionForm.value = {
      text: '',
      answer: '',
      section: '',
      difficulty: 'medium',
      materials: [],
      topics: [],
    }
  }
  questionDialogVisible.value = true
}

const saveQuestion = () => {
  if (!questionForm.value.text || !questionForm.value.answer) {
    ElMessage.warning('Заполните текст вопроса и ответ')
    return
  }

  if (editingQuestion.value) {
    const idx = questions.value.findIndex((q) => q.id === editingQuestion.value.id)
    if (idx !== -1) {
      questions.value[idx] = { ...questions.value[idx], ...questionForm.value }
    }
    ElMessage.success('Вопрос обновлён')
  } else {
    questions.value.unshift({
      id: Date.now(),
      ...questionForm.value,
    })
    ElMessage.success('Вопрос добавлен')
  }
  questionDialogVisible.value = false
}

const deleteQuestion = async (question) => {
  try {
    await ElMessageBox.confirm(`Удалить вопрос?`, 'Подтверждение', {
      type: 'warning',
    })
    questions.value = questions.value.filter((q) => q.id !== question.id)
    ElMessage.success('Вопрос удалён')
  } catch {
    // Отменено
  }
}

// === Действия: Профили (ОБНОВЛЁННЫЕ) ===
const openProfileDialog = (profile = null) => {
  if (profile) {
    editingProfile.value = profile
    profileForm.value = {
      position: profile.position,
      description: profile.description,
      levelsCount: profile.levels?.length || 1,
      levels: JSON.parse(
        JSON.stringify(profile.levels || [{ name: '', sections: [{ name: '', topics: [] }] }]),
      ),
    }
  } else {
    editingProfile.value = null
    profileForm.value = {
      position: '',
      description: '',
      levelsCount: 1,
      levels: [
        {
          name: '',
          sections: [
            {
              name: '',
              topics: [],
            },
          ],
        },
      ],
    }
  }
  profileDialogVisible.value = true
}

// Обработка изменения количества уровней
const handleLevelsCountChange = () => {
  const currentLength = profileForm.value.levels.length
  const newLength = profileForm.value.levelsCount

  if (newLength > currentLength) {
    // Добавляем новые уровни
    for (let i = currentLength; i < newLength; i++) {
      profileForm.value.levels.push({
        name: '',
        sections: [
          {
            name: '',
            topics: [],
          },
        ],
      })
    }
  } else if (newLength < currentLength) {
    // Удаляем лишние уровни
    profileForm.value.levels = profileForm.value.levels.slice(0, newLength)
  }
}

// Обновление структуры уровней
const updateLevelsStructure = () => {
  // Можно добавить дополнительную логику при необходимости
}

// Добавить раздел в уровень
const addSectionToLevel = (levelIdx) => {
  profileForm.value.levels[levelIdx].sections.push({
    name: '',
    topics: [],
  })
}

// Удалить раздел из уровня
const removeSectionFromLevel = (levelIdx, sectionIdx) => {
  profileForm.value.levels[levelIdx].sections.splice(sectionIdx, 1)
}

// Добавить тему в раздел
const addTopicToSection = (levelIdx, sectionIdx) => {
  profileForm.value.levels[levelIdx].sections[sectionIdx].topics.push({
    topicId: null,
    confirmationType: 'attestation',
    isRequired: true,
  })
}

// Удалить тему из раздела
const removeTopicFromSection = (levelIdx, sectionIdx, topicIdx) => {
  profileForm.value.levels[levelIdx].sections[sectionIdx].topics.splice(topicIdx, 1)
}

const saveProfile = () => {
  if (!profileForm.value.position) {
    ElMessage.warning('Введите должность')
    return
  }

  if (editingProfile.value) {
    const idx = profiles.value.findIndex((p) => p.id === editingProfile.value.id)
    if (idx !== -1) {
      profiles.value[idx] = {
        ...profiles.value[idx],
        ...profileForm.value,
      }
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
    // Отменено
  }
}

// === Действия: Сотрудники ===
const viewEmployeeProfile = (employee) => {
  selectedEmployee.value = employee
  employeeProfileVisible.value = true
}

const toggleCategory = (categoryId) => {
  const index = expandedCategories.value.indexOf(categoryId)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(categoryId)
  }
}

// === Фильтрация ===
const filterCertifications = () => {
  certPage.value = 1
}

const filterQuestions = () => {
  questionPage.value = 1
}
</script>

<style scoped>
/* Существующие стили остаются... */
.control-panel {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 24px;
  color: #333;
}

.panel-header h1 {
  margin: 0;
  font-size: 28px;
  color: #000;
  font-weight: 600;
}

.panel-tabs {
  display: flex;
  gap: 4px;
  margin: 20px 0 24px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 8px;
  width: fit-content;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
  position: relative;
}

.tab-btn.active {
  background: #6a4c8d;
  color: #fff;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #4a2c6d;
}

.filters-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.filter-select {
  width: 180px;
}

.data-table {
  width: 100%;
  margin-bottom: 16px;
}

.cert-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Employees List */
.employees-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.employee-item {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  align-items: center;
  gap: 20px;
}

.employee-item:hover {
  box-shadow: 0 4px 12px rgba(74, 44, 109, 0.15);
  border-color: #6a4c8d;
  transform: translateX(4px);
}

.employee-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #6a4c8d;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.employee-info {
  min-width: 0;
}

.employee-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.employee-position {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
}

.employee-meta {
  display: flex;
  gap: 8px;
}

.employee-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
}

.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #6a4c8d;
  transition: width 0.5s ease;
}

.progress-percent {
  font-weight: 600;
  color: #6a4c8d;
  min-width: 45px;
  text-align: right;
}

.employee-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #666;
  text-align: right;
}

.arrow-icon {
  color: #6a4c8d;
  font-size: 20px;
}

/* Profiles List */
.profiles-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.profile-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.profile-card:hover {
  box-shadow: 0 4px 12px rgba(74, 44, 109, 0.15);
  border-color: #6a4c8d;
}

.profile-header {
  margin-bottom: 10px;
}

.profile-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.profile-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.profile-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.profile-stats strong {
  color: #4a2c6d;
}

.profile-actions {
  display: flex;
  gap: 8px;
}

/* Forms */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.material-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Questions List Manager */
.questions-list-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.questions-drag-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-drag-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.drag-handle {
  color: #999;
  cursor: move;
}

.question-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.question-text-short {
  font-size: 14px;
  font-weight: 500;
}

.question-meta-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.question-category {
  font-size: 12px;
  color: #666;
}

.add-question-section {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px dashed #ddd;
}

.questions-select-table {
  max-height: 400px;
  overflow-y: auto;
}

/* Profile Dialog - NEW STYLES */
.profile-dialog :deep(.el-dialog__body) {
  max-height: 70vh;
  overflow-y: auto;
}

.levels-section {
  margin: 24px 0;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #4a2c6d;
  font-weight: 600;
}

.levels-names {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.level-name-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-label {
  min-width: 100px;
  font-weight: 500;
  color: #666;
}

.levels-structure-section {
  margin-top: 24px;
}

.level-block {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f5fc;
  border-radius: 8px;
  border: 1px solid #e0d4f0;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #d0c0e0;
}

.level-header h4 {
  margin: 0;
  font-size: 16px;
  color: #4a2c6d;
}

.sections-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-block {
  padding: 16px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.section-name-input {
  flex: 1;
}

.topics-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 12px;
  border-left: 2px solid #f0e6f5;
}

.topic-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
}

.topic-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.topic-select {
  flex: 1;
}

.topic-settings {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
}

.topic-settings :deep(.el-form-item) {
  margin-bottom: 0;
}

.add-topic-btn {
  align-self: flex-start;
}

/* Employee Profile Dialog */
.employee-profile-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.employee-profile-view {
  padding: 24px;
}

.employee-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
  margin-bottom: 24px;
}

.employee-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #333;
}

.employee-header p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.categories-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.category-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
}

.category-row.active {
  background: #f8f5fc;
  border-color: #6a4c8d;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-name {
  font-weight: 600;
  font-size: 15px;
}

.badge.current {
  background: #6a4c8d;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.badge.completed {
  background: #4caf50;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.category-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-value {
  font-weight: 600;
  color: #6a4c8d;
  min-width: 45px;
  text-align: right;
}

.category-progress .progress-bar-bg {
  width: 150px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.category-progress .progress-bar-fill {
  height: 100%;
  background: #6a4c8d;
}

.expand-icon {
  color: #6a4c8d;
  font-size: 16px;
}

.topics-section {
  margin-bottom: 24px;
}

.category-block {
  margin-bottom: 24px;
}

.topic-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
  padding-left: 10px;
  border-left: 3px solid #6a4c8d;
}

.topics-table table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.topics-table th {
  text-align: left;
  padding: 12px 15px;
  background: #f9f9f9;
  color: #666;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #e0e0e0;
}

.topics-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
  font-size: 14px;
}

.topic-name {
  font-weight: 500;
  color: #333;
}

.badge.type {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.type-attestation {
  background: #f4b942;
  color: #333;
}

.type-practice {
  background: #4caf50;
  color: #fff;
}

.type-performance {
  background: #e74c3c;
  color: #fff;
}

.topic-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topic-progress .progress-bar-bg {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.topic-progress .progress-bar-fill {
  height: 100%;
  background: #6a4c8d;
}

.progress-percent {
  font-weight: 600;
  color: #6a4c8d;
  min-width: 35px;
  font-size: 13px;
}

.stages {
  font-family: monospace;
  color: #666;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.section-block {
  margin-bottom: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.section-block h3 {
  font-size: 15px;
  color: #6a4c8d;
  margin: 0 0 8px 0;
}

.section-block p {
  margin: 0;
  font-size: 14px;
  color: #555;
}

.btn-close {
  background: #e74c3c;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.admin-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .filters-row {
    flex-direction: column;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }

  .employee-item {
    grid-template-columns: 1fr;
  }

  .arrow-icon {
    display: none;
  }
}
</style>
