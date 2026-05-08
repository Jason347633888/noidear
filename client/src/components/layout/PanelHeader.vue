<template>
  <div class="app-panel-header">
    <h3 class="app-panel-header__title">{{ title }}</h3>
    <div v-if="$slots.actions" class="app-panel-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>
