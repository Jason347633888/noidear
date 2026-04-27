<template>
  <div class="system-document-center">
    <el-tabs v-model="activeView">
      <el-tab-pane label="文件库" name="library">
        <SystemFileLibrary />
      </el-tab-pane>
      <el-tab-pane label="台账" name="ledger">
        <Level1List />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SystemFileLibrary from './SystemFileLibrary.vue';
import Level1List from './Level1List.vue';

const activeView = ref('library');
</script>

<style scoped>
.system-document-center {
  min-width: 0;
}
</style>
