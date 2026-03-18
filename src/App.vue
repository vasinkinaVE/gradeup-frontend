<template>
  <div class="app">
    <AppHeader v-if="isAuthenticated" />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'

const route = useRoute()

const isAuthenticated = computed(() => {
  return route.path !== '/login'
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  background-color: var(--background);
}
</style>
