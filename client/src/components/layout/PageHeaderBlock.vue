<template>
  <section class="app-page-header">
    <div class="app-page-header__copy">
      <p v-if="eyebrow" class="app-page-header__eyebrow">{{ eyebrow }}</p>
      <h1 class="app-page-header__title">{{ title }}</h1>
      <p v-if="description" class="app-page-header__description">{{ description }}</p>
    </div>
    <div class="app-page-header__right">
      <div v-if="$slots['compact-summary']" class="app-page-header__summary">
        <slot name="compact-summary" />
      </div>
      <div v-if="$slots.actions" class="app-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  eyebrow?: string;
}>();
</script>

<style scoped>
.app-page-header__right {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-shrink: 0;
}

.app-page-header__summary {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
