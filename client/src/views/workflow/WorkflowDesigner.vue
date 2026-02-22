<template>
  <div class="workflow-designer">
    <div class="designer-toolbar">
      <div class="toolbar-left">
        <span class="designer-title">可视化工作流设计器</span>
      </div>
      <div class="toolbar-right">
        <el-button :icon="View" @click="previewVisible = true">预览</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存模板</el-button>
      </div>
    </div>

    <div class="designer-body">
      <!-- Node palette -->
      <div class="node-palette">
        <h4 class="palette-title">节点类型</h4>
        <div
          v-for="node in nodeTypes"
          :key="node.type"
          class="palette-node"
          :style="{ borderColor: node.color }"
          draggable="true"
          @dragstart="onDragStart($event, node.type)"
        >
          <el-icon><component :is="node.icon" /></el-icon>
          <span>{{ node.label }}</span>
        </div>
      </div>

      <!-- Canvas -->
      <div
        ref="canvas"
        class="designer-canvas"
        @dragover.prevent
        @drop="onDrop"
      >
        <div
          v-for="node in nodes"
          :key="node.id"
          class="workflow-node"
          :style="{ left: node.x + 'px', top: node.y + 'px', borderColor: getNodeColor(node.type) }"
          @click="selectNode(node)"
        >
          <div class="node-type-badge" :style="{ background: getNodeColor(node.type) }">
            {{ getNodeLabel(node.type) }}
          </div>
          <div class="node-name">{{ node.name }}</div>
          <el-button
            class="delete-node-btn"
            circle
            size="small"
            type="danger"
            :icon="Close"
            @click.stop="deleteNode(node.id)"
          />
        </div>

        <div v-if="nodes.length === 0" class="canvas-placeholder">
          <p>拖拽左侧节点到此处添加工作流步骤</p>
        </div>
      </div>

      <!-- Node config panel -->
      <div v-if="selectedNode" class="config-panel">
        <h4 class="config-title">节点配置</h4>

        <el-form :model="selectedNode" label-width="80px" size="small">
          <el-form-item label="节点名称">
            <el-input v-model="selectedNode.name" placeholder="输入节点名称" />
          </el-form-item>

          <template v-if="selectedNode.type === 'approval'">
            <el-form-item label="审批人">
              <el-input v-model="selectedNode.approver" placeholder="输入审批人用户名" />
            </el-form-item>
            <el-form-item label="抄送人">
              <el-select
                v-model="selectedNode.ccUsers"
                multiple
                filterable
                placeholder="选择抄送人"
                style="width: 100%"
              >
                <el-option
                  v-for="u in userOptions"
                  :key="u.username"
                  :label="u.name"
                  :value="u.username"
                />
              </el-select>
            </el-form-item>
          </template>

          <template v-if="selectedNode.type === 'condition'">
            <el-form-item label="条件表达式">
              <el-input
                v-model="selectedNode.condition"
                type="textarea"
                :rows="3"
                placeholder="如: amount > 10000"
              />
            </el-form-item>
            <div class="condition-hint">
              <p>支持的运算符：&gt;, &lt;, ==, !=, &gt;=, &lt;=</p>
              <p>示例：amount &gt; 10000 AND department == 'finance'</p>
            </div>
          </template>
        </el-form>
      </div>
    </div>

    <!-- Template name dialog -->
    <el-dialog v-model="saveDialogVisible" title="保存工作流模板" width="400px">
      <el-form label-width="80px">
        <el-form-item label="模板名称" required>
          <el-input v-model="templateName" placeholder="输入模板名称" />
        </el-form-item>
        <el-form-item label="模板描述">
          <el-input v-model="templateDesc" type="textarea" :rows="2" placeholder="输入描述（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="confirmSave">确认保存</el-button>
      </template>
    </el-dialog>

    <!-- Preview dialog -->
    <el-dialog v-model="previewVisible" title="工作流预览" width="600px">
      <div class="preview-content">
        <div v-if="nodes.length === 0" class="preview-empty">暂无节点，请先添加工作流步骤</div>
        <div v-else class="preview-flow">
          <div v-for="(node, index) in nodes" :key="node.id" class="preview-step">
            <div class="preview-node" :style="{ borderColor: getNodeColor(node.type) }">
              <strong>{{ node.name }}</strong>
              <span class="preview-type">{{ getNodeLabel(node.type) }}</span>
              <div v-if="node.approver" class="preview-detail">审批人：{{ node.approver }}</div>
              <div v-if="node.condition" class="preview-detail">条件：{{ node.condition }}</div>
            </div>
            <div v-if="index < nodes.length - 1" class="preview-arrow">↓</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { View, Close } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

interface WorkflowNode {
  id: string;
  type: 'start' | 'approval' | 'condition' | 'end';
  name: string;
  x: number;
  y: number;
  approver?: string;
  ccUsers?: string[];
  condition?: string;
}

interface UserOption {
  id: string;
  username: string;
  name: string;
}

const nodeTypes = [
  { type: 'start', label: '开始节点', color: '#52c41a', icon: 'CircleCheck' },
  { type: 'approval', label: '审批节点', color: '#1890ff', icon: 'User' },
  { type: 'condition', label: '条件节点', color: '#fa8c16', icon: 'Filter' },
  { type: 'end', label: '结束节点', color: '#f5222d', icon: 'CircleClose' },
] as const;

const nodes = ref<WorkflowNode[]>([]);
const selectedNode = ref<WorkflowNode | null>(null);
const saving = ref(false);
const userOptions = ref<UserOption[]>([]);
const saveDialogVisible = ref(false);
const previewVisible = ref(false);
const templateName = ref('');
const templateDesc = ref('');
const canvas = ref<HTMLElement | null>(null);
let dragNodeType = '';

async function fetchUsers() {
  try {
    const res = await request.get<{ list: UserOption[] }>('/users', { params: { limit: 200 } });
    userOptions.value = res.list || [];
  } catch {
    // 获取用户列表失败，使用空列表
  }
}

onMounted(fetchUsers);

function getNodeColor(type: string): string {
  const found = nodeTypes.find((n) => n.type === type);
  return found?.color ?? '#999';
}

function getNodeLabel(type: string): string {
  const found = nodeTypes.find((n) => n.type === type);
  return found?.label ?? type;
}

function onDragStart(event: DragEvent, type: string) {
  dragNodeType = type;
}

function onDrop(event: DragEvent) {
  if (!canvas.value || !dragNodeType) return;
  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left - 60;
  const y = event.clientY - rect.top - 30;

  const newNode: WorkflowNode = {
    id: `node_${Date.now()}`,
    type: dragNodeType as WorkflowNode['type'],
    name: getNodeLabel(dragNodeType),
    x: Math.max(0, x),
    y: Math.max(0, y),
  };
  nodes.value = [...nodes.value, newNode];
  dragNodeType = '';
}

function selectNode(node: WorkflowNode) {
  selectedNode.value = node;
}

function deleteNode(id: string) {
  nodes.value = nodes.value.filter((n) => n.id !== id);
  if (selectedNode.value?.id === id) {
    selectedNode.value = null;
  }
}

function handleSave() {
  if (nodes.value.length === 0) {
    ElMessage.warning('请先添加工作流节点');
    return;
  }
  saveDialogVisible.value = true;
}

async function confirmSave() {
  if (!templateName.value.trim()) {
    ElMessage.warning('请输入模板名称');
    return;
  }
  saving.value = true;
  try {
    await request.post('/workflow/templates', {
      name: templateName.value,
      description: templateDesc.value,
      steps: nodes.value.map((node, index) => ({
        name: node.name,
        type: node.type,
        order: index + 1,
        condition: node.condition,
        approver: node.approver,
        ccUsers: node.ccUsers ?? [],
      })),
    });
    ElMessage.success('工作流模板保存成功');
    saveDialogVisible.value = false;
  } catch {
    ElMessage.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.workflow-designer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.designer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.designer-title {
  font-size: 16px;
  font-weight: 600;
}

.designer-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.node-palette {
  width: 140px;
  border-right: 1px solid #e8e8e8;
  padding: 16px 8px;
  flex-shrink: 0;
}

.palette-title {
  margin: 0 0 12px;
  font-size: 13px;
  color: #666;
}

.palette-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: grab;
  font-size: 12px;
  background: #fafafa;
  transition: background 0.15s;
}

.palette-node:hover {
  background: #f0f5ff;
}

.designer-canvas {
  flex: 1;
  position: relative;
  background: #f9fafb;
  background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
  background-size: 20px 20px;
  overflow: auto;
  min-height: 400px;
}

.canvas-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  pointer-events: none;
}

.workflow-node {
  position: absolute;
  min-width: 120px;
  padding: 10px 12px 10px;
  background: #fff;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.15s;
}

.workflow-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.node-type-badge {
  display: inline-block;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 4px;
}

.node-name {
  font-size: 13px;
  font-weight: 500;
}

.delete-node-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 10px;
}

.config-panel {
  width: 280px;
  border-left: 1px solid #e8e8e8;
  padding: 16px;
  overflow-y: auto;
  flex-shrink: 0;
}

.config-title {
  margin: 0 0 16px;
  font-size: 14px;
}

.condition-hint {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 4px;
  padding: 8px;
  font-size: 11px;
  color: #888;
}

.condition-hint p {
  margin: 2px 0;
}

.preview-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.preview-step {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-node {
  padding: 12px 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  text-align: center;
  width: 240px;
}

.preview-type {
  display: block;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.preview-detail {
  font-size: 12px;
  color: #555;
  margin-top: 4px;
}

.preview-arrow {
  font-size: 20px;
  color: #aaa;
  margin: 4px 0;
}

.preview-empty {
  text-align: center;
  color: #bbb;
  padding: 40px;
}
</style>
