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
      <!-- Node palette (left panel) -->
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
        <div class="palette-hint">
          <p>拖拽节点到右侧画布</p>
          <p>点击节点连线端口建立连线</p>
        </div>
      </div>

      <!-- VueFlow Canvas -->
      <div
        class="canvas-wrapper"
        @dragover.prevent
        @drop="onDrop"
      >
        <VueFlow
          v-model:nodes="flowNodes"
          v-model:edges="flowEdges"
          :default-viewport="{ zoom: 1 }"
          :min-zoom="0.3"
          :max-zoom="2"
          fit-view-on-init
          @connect="onConnect"
          @node-click="onNodeClick"
        >
          <Background pattern-color="#e0e0e0" :gap="20" />
          <Controls />
          <template #node-custom="nodeProps">
            <div
              class="workflow-node"
              :style="{ borderColor: getNodeColor(nodeProps.data.type) }"
            >
              <div class="node-type-badge" :style="{ background: getNodeColor(nodeProps.data.type) }">
                {{ getNodeLabel(nodeProps.data.type) }}
              </div>
              <div class="node-name">{{ nodeProps.data.label }}</div>
              <el-button
                class="delete-node-btn"
                circle
                size="small"
                type="danger"
                :icon="Close"
                @click.stop="deleteNode(nodeProps.id)"
              />
              <Handle type="source" :position="Position.Bottom" />
              <Handle type="target" :position="Position.Top" />
            </div>
          </template>
        </VueFlow>
        <div v-if="flowNodes.length === 0" class="canvas-placeholder">
          <p>拖拽左侧节点到此处添加工作流步骤</p>
        </div>
      </div>

      <!-- Node config panel (right panel) -->
      <div v-if="selectedNodeData" class="config-panel">
        <h4 class="config-title">节点配置</h4>

        <el-form :model="selectedNodeData" label-width="80px" size="small">
          <el-form-item label="节点名称">
            <el-input v-model="selectedNodeData.label" placeholder="输入节点名称" @input="syncNodeLabel" />
          </el-form-item>

          <template v-if="selectedNodeData.type === 'approval'">
            <el-form-item label="审批人">
              <el-input v-model="selectedNodeData.approver" placeholder="输入审批人用户名" />
            </el-form-item>
            <el-form-item label="抄送人">
              <el-select
                v-model="selectedNodeData.ccUsers"
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

          <template v-if="selectedNodeData.type === 'condition'">
            <el-form-item label="条件表达式">
              <el-input
                v-model="selectedNodeData.condition"
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
        <div v-if="flowNodes.length === 0" class="preview-empty">暂无节点，请先添加工作流步骤</div>
        <div v-else class="preview-flow">
          <div v-for="(node, index) in flowNodes" :key="node.id" class="preview-step">
            <div class="preview-node" :style="{ borderColor: getNodeColor(node.data.type) }">
              <strong>{{ node.data.label }}</strong>
              <span class="preview-type">{{ getNodeLabel(node.data.type) }}</span>
              <div v-if="node.data.approver" class="preview-detail">审批人：{{ node.data.approver }}</div>
              <div v-if="node.data.condition" class="preview-detail">条件：{{ node.data.condition }}</div>
            </div>
            <div v-if="index < flowNodes.length - 1" class="preview-arrow">↓</div>
          </div>
          <div v-if="flowEdges.length > 0" class="preview-edges">
            <h5>连线关系（{{ flowEdges.length }} 条）</h5>
            <div v-for="edge in flowEdges" :key="edge.id" class="preview-edge">
              {{ getNodeById(edge.source)?.data?.label ?? edge.source }}
              →
              {{ getNodeById(edge.target)?.data?.label ?? edge.target }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { View, Close } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { VueFlow, useVueFlow, Position, Handle } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import request from '@/api/request';

interface NodeData {
  type: 'start' | 'approval' | 'condition' | 'end';
  label: string;
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

const { addEdges } = useVueFlow();

const flowNodes = ref<any[]>([]);
const flowEdges = ref<any[]>([]);
const selectedNodeId = ref<string | null>(null);
const saving = ref(false);
const userOptions = ref<UserOption[]>([]);
const saveDialogVisible = ref(false);
const previewVisible = ref(false);
const templateName = ref('');
const templateDesc = ref('');
let dragNodeType = '';
let nodeCounter = 0;

const selectedNodeData = computed<NodeData | null>(() => {
  if (!selectedNodeId.value) return null;
  const node = flowNodes.value.find((n) => n.id === selectedNodeId.value);
  return node?.data ?? null;
});

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

function getNodeById(id: string) {
  return flowNodes.value.find((n) => n.id === id) ?? null;
}

function onDragStart(_event: DragEvent, type: string) {
  dragNodeType = type;
}

function onDrop(event: DragEvent) {
  if (!dragNodeType) return;
  const canvasEl = (event.currentTarget as HTMLElement);
  const rect = canvasEl.getBoundingClientRect();
  const x = event.clientX - rect.left - 60;
  const y = event.clientY - rect.top - 30;

  nodeCounter++;
  const newNode = {
    id: `node_${nodeCounter}`,
    type: 'custom',
    position: { x: Math.max(0, x), y: Math.max(0, y) },
    data: {
      type: dragNodeType as NodeData['type'],
      label: getNodeLabel(dragNodeType),
      approver: '',
      ccUsers: [],
      condition: '',
    },
  };
  flowNodes.value = [...flowNodes.value, newNode];
  dragNodeType = '';
}

function onNodeClick({ node }: { node: any }) {
  selectedNodeId.value = node.id;
}

function onConnect(params: any) {
  if (params.source === params.target) {
    ElMessage.warning('节点不能连接到自身');
    return;
  }
  // Cycle detection: check if adding this edge would create a cycle
  if (wouldCreateCycle(params.source, params.target)) {
    ElMessage.warning('检测到循环连线，已阻止');
    return;
  }
  addEdges([{ ...params, animated: true }]);
}

function wouldCreateCycle(source: string, target: string): boolean {
  // BFS from target, checking if we can reach source via existing edges
  const visited = new Set<string>();
  const queue = [target];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const outgoing = flowEdges.value.filter((e) => e.source === current);
    outgoing.forEach((e) => queue.push(e.target));
  }
  return false;
}

function deleteNode(id: string) {
  flowNodes.value = flowNodes.value.filter((n) => n.id !== id);
  flowEdges.value = flowEdges.value.filter((e) => e.source !== id && e.target !== id);
  if (selectedNodeId.value === id) {
    selectedNodeId.value = null;
  }
}

function syncNodeLabel() {
  // Node label is bound via selectedNodeData (reactive), VueFlow re-renders automatically
}

function handleSave() {
  if (flowNodes.value.length === 0) {
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
      steps: flowNodes.value.map((node, index) => ({
        name: node.data.label,
        type: node.data.type,
        order: index + 1,
        condition: node.data.condition,
        approver: node.data.approver,
        ccUsers: node.data.ccUsers ?? [],
      })),
      edges: flowEdges.value.map((e) => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
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
  flex-shrink: 0;
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
  overflow-y: auto;
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

.palette-hint {
  margin-top: 16px;
  font-size: 11px;
  color: #bbb;
  line-height: 1.5;
}

.palette-hint p { margin: 2px 0; }

.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.canvas-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  pointer-events: none;
  z-index: 1;
}

.workflow-node {
  position: relative;
  min-width: 120px;
  padding: 10px 12px;
  background: #fff;
  border: 2px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  user-select: none;
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
  width: 20px !important;
  height: 20px !important;
  padding: 0 !important;
  font-size: 10px !important;
  min-height: unset !important;
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

.preview-edges {
  margin-top: 16px;
  width: 100%;
  text-align: left;
}

.preview-edges h5 {
  margin: 0 0 8px;
  font-size: 13px;
  color: #666;
}

.preview-edge {
  font-size: 12px;
  color: #555;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}
</style>
