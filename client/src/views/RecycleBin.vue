<template>
  <div class="recycle-bin">
    <h2>回收站</h2>

    <el-tabs v-model="activeType" @tab-change="fetchData">
      <el-tab-pane label="文档" name="document"></el-tab-pane>
      <el-tab-pane label="模板" name="template"></el-tab-pane>
      <el-tab-pane label="任务" name="task"></el-tab-pane>
    </el-tabs>

    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索..."
        style="width: 200px"
        @input="handleSearch"
      />
      <el-button
        :disabled="!selectedIds.length"
        @click="handleBatchRestore"
      >
        批量恢复
      </el-button>
      <el-button
        type="danger"
        :disabled="!selectedIds.length"
        @click="handleBatchDelete"
      >
        批量永久删除
      </el-button>
    </div>

    <el-table
      :data="tableData"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column label="标题" prop="title" />
      <el-table-column label="编号" prop="number" />
      <el-table-column label="删除人" width="120">
        <template #default="{ row }">
          <div v-if="row.deletedBy" class="user-info">
            <div class="user-avatar">{{ getUserInitial(row.deletedBy) }}</div>
            <span>{{ getUserName(row.deletedBy) }}</span>
          </div>
          <span v-else class="empty-text">-</span>
        </template>
      </el-table-column>
      <el-table-column label="删除时间" prop="deletedAt" width="180">
        <template #default="{ row }">
          {{ formatDate(row.deletedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" @click="handleRestore(row.id)">
            恢复
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="handlePermanentDelete(row.id)"
          >
            永久删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.limit"
      :total="pagination.total"
      @current-change="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import recycleBinApi from '@/api/recycle-bin';

const activeType = ref('document');
const searchKeyword = ref('');
const tableData = ref([]);
const selectedIds = ref<string[]>([]);
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
});

onMounted(() => {
  fetchData();
});

const fetchData = async () => {
  try {
    const { list, total } = await recycleBinApi.findAll(
      activeType.value,
      pagination.value.page,
      pagination.value.limit,
      searchKeyword.value,
    );
    tableData.value = list;
    pagination.value.total = total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '获取数据失败');
  }
};

const handleRestore = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定恢复该项目？', '提示', {
      type: 'warning',
    });
    await recycleBinApi.restore(activeType.value, id);
    ElMessage.success('恢复成功');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '恢复失败');
    }
  }
};

const handlePermanentDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm(
      '永久删除后无法恢复，确定删除？',
      '警告',
      { type: 'error' },
    );
    await recycleBinApi.permanentDelete(activeType.value, id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
};

const handleBatchRestore = async () => {
  try {
    await ElMessageBox.confirm('确定批量恢复选中项目？', '提示', {
      type: 'warning',
    });
    await recycleBinApi.batchRestore(activeType.value, selectedIds.value);
    ElMessage.success('批量恢复成功');
    selectedIds.value = [];
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '批量恢复失败');
    }
  }
};

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      '批量永久删除后无法恢复，确定删除？',
      '警告',
      { type: 'error' },
    );
    await recycleBinApi.batchPermanentDelete(activeType.value, selectedIds.value);
    ElMessage.success('批量删除成功');
    selectedIds.value = [];
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '批量删除失败');
    }
  }
};

const handleSelectionChange = (selection: any[]) => {
  selectedIds.value = selection.map(item => item.id);
};

const handleSearch = () => {
  setTimeout(() => {
    pagination.value.page = 1;
    fetchData();
  }, 500);
};

const formatDate = (date: string): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const getUserName = (user: any): string => {
  if (typeof user === 'string') return user;
  return user?.name || user?.username || '-';
};

const getUserInitial = (user: any): string => {
  const name = getUserName(user);
  return name.charAt(0) || 'U';
};
</script>

<style scoped>
.recycle-bin {
  padding: 20px;
}

.toolbar {
  margin: 20px 0;
  display: flex;
  gap: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #1a1a2e;
  color: #c9a227;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.empty-text {
  color: #ccc;
}
</style>
