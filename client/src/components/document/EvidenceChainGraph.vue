<template>
  <div class="evidence-chain-graph">
    <div v-if="loading" class="evidence-chain-loading">加载中...</div>
    <div v-else-if="!chain" class="evidence-chain-empty">暂无证据链数据</div>
    <template v-else>
      <!-- Warnings -->
      <div v-if="chain.warnings.length" class="evidence-chain-warnings">
        <div v-for="w in chain.warnings" :key="w.id" class="evidence-chain-warning">
          {{ w.message }}
        </div>
      </div>

      <!-- Nodes grouped by depth -->
      <div
        v-for="[depth, nodes] in nodesByDepth"
        :key="depth"
        class="evidence-depth-group"
      >
        <div
          v-for="node in nodes"
          :key="node.nodeId"
          class="evidence-node"
          :data-routable="node.route ? 'true' : undefined"
        >
          <span class="evidence-node-label">{{ node.label }}</span>
          <span class="evidence-node-type">{{ node.type }}</span>
          <span v-if="node.status" class="evidence-node-status">{{ node.status }}</span>
        </div>
      </div>

      <!-- Edges -->
      <div class="evidence-chain-edges">
        <div v-for="edge in chain.edges" :key="edge.id" class="evidence-edge">
          {{ edge.label }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EvidenceChainResult, EvidenceNode } from '@noidear/types'

const props = defineProps<{
  chain: EvidenceChainResult | null
  loading?: boolean
}>()

const nodesByDepth = computed((): Map<number, EvidenceNode[]> => {
  if (!props.chain) return new Map()

  const map = new Map<number, EvidenceNode[]>()
  for (const node of props.chain.nodes) {
    const existing = map.get(node.depth) ?? []
    map.set(node.depth, [...existing, node])
  }

  return new Map([...map.entries()].sort(([a], [b]) => a - b))
})
</script>
