<template>
  <div class="profile-view">
    <!-- Заголовок профиля -->
    <header class="profile-header">
      <div class="employee-info">
        <h1>Профиль сотрудника</h1>
        <div class="meta">
          <span class="badge level">Frontend Developer</span>
          <span class="badge level">2 Категория</span>
        </div>
      </div>
    </header>

    <!-- Категории (аккордеон) -->
    <section class="categories-accordion">
      <div
        v-for="category in allCategories"
        :key="category.id"
        class="category-item"
        :class="{ completed: category.isCompleted, current: category.isCurrent }"
      >
        <!-- Заголовок категории (всегда виден) -->
        <div class="category-header" @click="toggleCategory(category.id)">
          <div class="category-title-section">
            <h3 class="category-title">{{ category.name }}</h3>
            <span v-if="category.isCompleted" class="completed-badge-small">✓ Завершена</span>
            <span v-if="category.isCurrent" class="current-badge-small">Текущая</span>
          </div>
          <div class="category-meta">
            <div class="progress-info">
              <span class="progress-text">{{ category.progress }}%</span>
              <div class="mini-progress-bar">
                <div class="mini-fill" :style="{ width: category.progress + '%' }"></div>
              </div>
            </div>
            <button class="toggle-btn" :class="{ open: category.isOpen }">
              <svg
                class="arrow-icon"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 4L6 8L10 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Содержимое категории (разворачивается) -->
        <div v-if="category.isOpen" class="category-content">
          <div
            v-for="topicCategory in category.categories"
            :key="topicCategory.id"
            class="topic-category-block"
          >
            <h4 class="topic-category-name">{{ topicCategory.name }}</h4>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Название темы</th>
                    <th>Тип закрытия</th>
                    <th>Прогресс</th>
                    <th class="stages-header">Этапы</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="topic in topicCategory.topics"
                    :key="topic.id"
                    @click="openModal(topic)"
                    class="topic-row"
                  >
                    <td class="topic-name">
                      {{ topic.title }}
                      <span
                        v-if="topic.stagesCompleted < topic.totalStages && topic.progress < 100"
                        class="stage-indicator"
                        >◦</span
                      >
                    </td>
                    <td>
                      <span :class="['badge', 'type', getTypeClass(topic.type)]">
                        {{ getTypeLabel(topic.type) }}
                      </span>
                    </td>
                    <td>
                      <div class="progress-cell">
                        <span class="percent">{{ topic.progress }}%</span>
                        <div class="mini-progress-bar">
                          <div class="mini-fill" :style="{ width: topic.progress + '%' }"></div>
                        </div>
                      </div>
                    </td>
                    <td class="stages">
                      <span class="stages-badge"
                        >{{ topic.stagesCompleted }} / {{ topic.totalStages }}</span
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Модальное окно -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <button class="close-btn" @click="closeModal">&times;</button>

        <div v-if="selectedTopic">
          <div class="modal-header">
            <h2>{{ selectedTopic.title }}</h2>
            <span :class="['badge', 'type', getTypeClass(selectedTopic.type)]">
              {{ getTypeLabel(selectedTopic.type) }}
            </span>
          </div>

          <div class="modal-body">
            <div class="section-block">
              <h3>Описание и критерии</h3>
              <p>{{ selectedTopic.description }}</p>
            </div>

            <div class="section-block">
              <h3>Список литературы</h3>
              <ul class="literature-list">
                <li v-for="(item, index) in selectedTopic.literature" :key="index">
                  {{ item }}
                </li>
              </ul>
            </div>

            <div class="section-block">
              <h3>Вопросы для подготовки</h3>
              <ul class="questions-list">
                <li v-for="(q, index) in selectedTopic.questions" :key="index">
                  {{ q }}
                </li>
              </ul>
            </div>

            <div class="section-block progress-detail">
              <h3>Статус этапов</h3>
              <p>
                Завершено этапов: <strong>{{ selectedTopic.stagesCompleted }}</strong> из
                {{ selectedTopic.totalStages }}
              </p>
              <p>
                Вклад в прогресс: <strong>{{ selectedTopic.progress }}%</strong>
              </p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-close" @click="closeModal">Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// --- Состояние ---
const isModalOpen = ref(false)
const selectedTopic = ref(null)

// --- Данные по категориям ---
const allCategories = ref([
  {
    id: 'student',
    name: 'Ученик',
    isCompleted: true,
    isCurrent: false,
    isOpen: false,
    progress: 100,
    categories: [
      {
        id: 1,
        name: 'Основы программирования',
        topics: [
          {
            id: 1,
            title: 'Переменные и типы данных',
            type: 'attestation',
            progress: 100,
            stagesCompleted: 1,
            totalStages: 1,
            description: 'Базовые понятия программирования',
            literature: ['Книга: "Основы программирования"'],
            questions: ['Что такое переменная?'],
          },
        ],
      },
    ],
  },
  {
    id: 'category1',
    name: '1 Категория',
    isCompleted: true,
    isCurrent: false,
    isOpen: false,
    progress: 100,
    categories: [
      {
        id: 2,
        name: 'Базы данных (начальный уровень)',
        topics: [
          {
            id: 2,
            title: 'Основы SQL',
            type: 'attestation',
            progress: 100,
            stagesCompleted: 1,
            totalStages: 1,
            description: 'Базовые SQL-запросы',
            literature: ['Книга: "SQL для начинающих"'],
            questions: ['Что такое SELECT?'],
          },
        ],
      },
    ],
  },
  {
    id: 'category2',
    name: '2 Категория',
    isCompleted: true,
    isCurrent: false,
    isOpen: false,
    progress: 100,
    categories: [
      {
        id: 3,
        name: 'Frontend основы',
        topics: [
          {
            id: 3,
            title: 'HTML/CSS',
            type: 'practice',
            progress: 100,
            stagesCompleted: 2,
            totalStages: 2,
            description: 'Вёрстка страниц',
            literature: ['MDN Web Docs'],
            questions: ['Что такое flexbox?'],
          },
        ],
      },
    ],
  },
  {
    id: 'category3',
    name: '3 Категория',
    isCompleted: false,
    isCurrent: true,
    isOpen: true,
    progress: 56,
    categories: [
      {
        id: 4,
        name: 'Базы данных',
        topics: [
          {
            id: 101,
            title: 'Проектирование схем БД',
            type: 'attestation',
            progress: 50,
            stagesCompleted: 1,
            totalStages: 2,
            description:
              'Умение проектировать нормализованные схемы данных, создавать индексы и понимать транзакции.',
            literature: [
              'Книга: "Проектирование реляционных баз данных"',
              'Документация PostgreSQL: Индексы',
              'Статья: Нормальные формы (1NF-3NF)',
            ],
            questions: [
              'Что такое нормализация и зачем она нужна?',
              'В чем разница между Clustered и Non-Clustered индексом?',
              'Опишите уровни изоляции транзакций.',
            ],
          },
          {
            id: 102,
            title: 'Оптимизация запросов',
            type: 'practice',
            progress: 0,
            stagesCompleted: 0,
            totalStages: 1,
            description: 'Навык написания эффективных SQL-запросов, использование EXPLAIN.',
            literature: ['Документация: EXPLAIN ANALYZE'],
            questions: ['Как прочитать план выполнения запроса?'],
          },
        ],
      },
      {
        id: 5,
        name: 'Frontend Разработка',
        topics: [
          {
            id: 201,
            title: 'Работа с состоянием (Vue)',
            type: 'practice',
            progress: 75,
            stagesCompleted: 3,
            totalStages: 4,
            description: 'Глубокое понимание реактивности, Vuex/Pinia, Composition API.',
            literature: ['Vue 3 Docs', 'Pinia Docs'],
            questions: [
              'Как работает reactivity в Vue 3?',
              'Когда использовать computed, а когда watch?',
            ],
          },
          {
            id: 202,
            title: 'Performance Review Q3',
            type: 'performance',
            progress: 100,
            stagesCompleted: 1,
            totalStages: 1,
            description:
              'Выполнение KPI по скорости загрузки страниц и отсутствию багов в продакшене.',
            literature: ['Отчет Jira', 'Метрики Lighthouse'],
            questions: [],
          },
        ],
      },
    ],
  },
])

// --- Методы ---
const toggleCategory = (categoryId) => {
  const category = allCategories.value.find((c) => c.id === categoryId)
  if (category) {
    category.isOpen = !category.isOpen
  }
}

const openModal = (topic) => {
  selectedTopic.value = topic
  isModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeModal = () => {
  isModalOpen.value = false
  selectedTopic.value = null
  document.body.style.overflow = ''
}

// Хелперы для отображения типов
const getTypeLabel = (type) => {
  const map = {
    attestation: 'Аттестация',
    practice: 'Практика',
    performance: 'Perf. Review',
  }
  return map[type] || type
}

const getTypeClass = (type) => {
  return `type-${type}`
}
</script>

<style scoped>
.profile-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
}

/* Header */
.profile-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.employee-info h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
}

.meta {
  display: flex;
  gap: 10px;
}

/* Accordion */
.categories-accordion {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.category-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow 0.2s;
}

.category-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.category-item.completed {
  background: #f9f9f9;
}

.category-item.current {
  border-left: 4px solid #6a4c8d;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  cursor: pointer;
  background: #fff;
  transition: background 0.2s;
}

.category-header:hover {
  background: #f5f5f5;
}

.category-item.current .category-header {
  background: #faf8fc;
}

.category-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.category-title {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.completed-badge-small,
.current-badge-small {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.completed-badge-small {
  background: #4caf50;
  color: #fff;
}

.current-badge-small {
  background: #6a4c8d;
  color: #fff;
}

.category-meta {
  display: flex;
  align-items: center;
  gap: 20px;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
}

.progress-text {
  font-weight: 600;
  color: #6a4c8d;
  min-width: 45px;
  text-align: right;
}

.mini-progress-bar {
  flex-grow: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  min-width: 80px;
}

.mini-fill {
  height: 100%;
  background: #6a4c8d;
  transition: width 0.5s ease;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6a4c8d;
  padding: 0;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: rgba(106, 76, 141, 0.1);
  border-radius: 6px;
}

.arrow-icon {
  transition: transform 0.3s ease;
}

.toggle-btn.open .arrow-icon {
  transform: rotate(180deg);
}

/* Category content */
.category-content {
  border-top: 1px solid #eee;
  background: #fff;
}

.topic-category-block {
  padding: 20px;
}

.topic-category-block:not(:last-child) {
  border-bottom: 1px solid #eee;
}

.topic-category-name {
  margin: 0 0 15px 0;
  font-size: 15px;
  color: #555;
  padding-left: 10px;
  border-left: 3px solid #6a4c8d;
}

/* Table */
.table-container {
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  border: 1px solid #eee;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

th {
  text-align: left;
  padding: 15px;
  background: #f9f9f9;
  color: #666;
  font-weight: 600;
  font-size: 14px;
}

th.stages-header {
  padding-left: 20px;
  width: 120px;
}

td {
  padding: 15px;
  border-top: 1px solid #eee;
  vertical-align: middle;
}

td.stages {
  padding-left: 20px;
}

.topic-row {
  cursor: pointer;
  transition: background 0.2s;
}

.topic-row:hover {
  background: #f5f0fa;
}

.topic-name {
  font-weight: 500;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stage-indicator {
  color: #999;
  font-size: 12px;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge.level {
  background: #eef2f7;
  color: #555;
  border: 1px solid #ddd;
}

.badge.type {
  color: #fff;
}

.type-attestation {
  background: #f4b942;
  color: #333;
}
.type-practice {
  background: #4caf50;
}
.type-performance {
  background: #e74c3c;
}

/* Progress in Table */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.percent {
  width: 35px;
  font-size: 13px;
  font-weight: bold;
}

.mini-progress-bar {
  flex-grow: 1;
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
  min-width: 80px;
}

.mini-fill {
  height: 100%;
  background: #6a4c8d;
}

.stages {
  font-family: monospace;
  color: #666;
}

.stages-badge {
  background: #f5f5f5;
  padding: 6px 12px;
  border-radius: 4px;
  display: inline-block;
  font-weight: 500;
  white-space: nowrap;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #fff;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  border-radius: 12px;
  padding: 30px;
  position: relative;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 20px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  line-height: 1;
  z-index: 10;
}

.close-btn:hover {
  color: #333;
}

.modal-header {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-right: 40px;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
  color: #2c3e50;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.section-block h3 {
  font-size: 16px;
  color: #6a4c8d;
  margin-bottom: 10px;
}

.section-block p {
  line-height: 1.6;
  color: #555;
  margin: 0;
}

.literature-list,
.questions-list {
  margin: 0;
  padding-left: 20px;
  color: #555;
  line-height: 1.6;
}

.literature-list li,
.questions-list li {
  margin-bottom: 8px;
}

.progress-detail {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.modal-footer {
  margin-top: 30px;
  text-align: right;
}

.btn-close {
  background: #e74c3c;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-close:hover {
  background: #c0392b;
}

/* Responsive */
@media (max-width: 768px) {
  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .category-meta {
    width: 100%;
    justify-content: space-between;
  }

  .modal-header {
    flex-direction: column;
    gap: 10px;
    padding-right: 40px;
  }
}
</style>
