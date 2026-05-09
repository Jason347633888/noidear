<template>
  <div :class="['app-filter-bar', standalone && 'app-filter-bar--standalone']">
    <slot />
    <div v-if="$slots.actions" class="app-filter-bar__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  standalone?: boolean;
}>();
</script>

<style scoped>
.app-filter-bar__actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
