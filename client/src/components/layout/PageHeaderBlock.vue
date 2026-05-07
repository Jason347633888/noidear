<template>
  <section class="app-page-header">
    <div class="app-page-header__copy">
      <p v-if="eyebrow" class="app-page-header__eyebrow">{{ eyebrow }}</p>
      <h1 class="app-page-header__title">{{ title }}</h1>
      <p v-if="description" class="app-page-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="app-page-header__actions">
      <slot name="actions" />
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
