<!-- src/views/NotFoundView.vue -->
<template>
  <div class="not-found">
    <div class="not-found-content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">Страница не найдена</h2>
      <p class="error-message">
        Извините, страница, которую вы ищете, не существует или была перемещена.
      </p>
      <el-button type="primary" size="large" @click="goHome"> Вернуться на главную </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--background);
}

.not-found-content {
  text-align: center;
  padding: var(--spacing-lg);
  max-width: 480px;
}

.error-code {
  font-size: 120px;
  font-weight: var(--font-weight-bold);
  color: var(--primary);
  margin: 0;
  line-height: 1;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.error-title {
  font-size: 24px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin: var(--spacing-md) 0;
}

.error-message {
  font-size: 16px;
  color: var(--gray);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}
</style>
