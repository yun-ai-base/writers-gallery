<template>
  <div class="influence-graph">
    <!-- 缩放控制 -->
    <div class="graph-controls">
      <button class="ctrl-btn" @click="zoomIn" aria-label="放大">＋</button>
      <button class="ctrl-btn" @click="zoomOut" aria-label="缩小">−</button>
      <button class="ctrl-btn" @click="resetZoom" aria-label="重置">⟲</button>
    </div>

    <div class="graph-viewport" ref="viewport">
      <svg
        :viewBox="`0 0 ${VBW} ${VBH}`"
        class="graph-svg"
        :style="{ width: '100%', height: svgHeight + 'px' }"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="作家影响力关系网络图"
        @wheel.prevent="onWheel"
        @mousedown="onPanStart"
        @mousemove="onPanMove"
        @mouseup="onPanEnd"
        @mouseleave="onPanEnd"
      >
        <title>作家影响力关系网络</title>
        <desc>展示中外作家之间影响关系的网络图</desc>

        <defs>
          <marker id="arrow-cn" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,1 L9,5 L0,9 Z" style="fill: var(--c-accent)" />
          </marker>
          <marker id="arrow-en" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,1 L9,5 L0,9 Z" style="fill: var(--c-blue)" />
          </marker>
          <marker id="arrow-cross" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,1 L9,5 L0,9 Z" style="fill: var(--c-gold)" />
          </marker>
        </defs>

        <g :transform="`translate(${panX}, ${panY}) scale(${zoom})`">
          <!-- 区域标签 & 分隔线 -->
          <text :x="CN_CENTER_X" y="35" class="region-label" text-anchor="middle">中 国 作 家</text>
          <text :x="EN_CENTER_X" y="35" class="region-label" text-anchor="middle">外 国 作 家</text>
          <line :x1="DIVIDER_X" y1="55" :x2="DIVIDER_X" :y2="VBH - 30" class="divider" />

          <!-- 连线层 -->
          <g class="edges-layer">
            <g
              v-for="(edge, i) in edges"
              :key="`edge-${i}`"
              :class="['edge-group', edge.type, {
                active: isEdgeActive(edge) || hoveredEdge === edge,
                dimmed: isEdgeDimmed(edge)
              }]"
              @mouseenter="onEdgeHover(edge)"
              @mouseleave="onEdgeLeave"
            >
              <line
                :x1="edge.x1" :y1="edge.y1"
                :x2="edge.x2" :y2="edge.y2"
                class="edge-line"
                :marker-end="`url(#arrow-${edge.type})`"
              />
              <line
                :x1="edge.x1" :y1="edge.y1"
                :x2="edge.x2" :y2="edge.y2"
                class="edge-hit"
              />
            </g>
          </g>

          <!-- 节点层 -->
          <g class="nodes-layer">
            <g
              v-for="node in nodes"
              :key="node.id"
              :class="['node-group', node.isCn ? 'cn' : 'en', {
                active: hoveredNode === node.id,
                dimmed: isNodeDimmed(node)
              }]"
              tabindex="0"
              role="link"
              :aria-label="`${node.name} - 查看详情`"
              @mouseenter="hoveredNode = node.id"
              @mouseleave="hoveredNode = null"
              @click="onNodeClick(node.id)"
              @keydown.enter="onNodeClick(node.id)"
            >
              <circle
                :cx="node.x" :cy="node.y"
                :r="node.r"
                class="node-circle"
              />
              <text
                :x="node.x" :y="node.y"
                class="node-text"
                text-anchor="middle"
                dominant-baseline="central"
              >{{ node.circleText }}</text>
              <text
                :x="node.x" :y="node.y + node.r + 14"
                class="node-label"
                text-anchor="middle"
              >{{ node.shortLabel }}</text>
            </g>
          </g>

          <!-- 连线提示框 -->
          <g
            v-if="hoveredEdge"
            :transform="`translate(${tooltipPos.x}, ${tooltipPos.y})`"
            class="edge-tooltip"
            pointer-events="none"
          >
            <rect
              :x="-tooltipWidth / 2" y="-30"
              :width="tooltipWidth" height="34"
              rx="6"
              class="tooltip-bg"
            />
            <text
              x="0" y="-8"
              text-anchor="middle"
              class="tooltip-text"
            >{{ hoveredEdge.tooltipText }}</text>
          </g>
        </g>
      </svg>
    </div>

    <!-- 图例 -->
    <div class="graph-legend">
      <span class="legend-item">
        <span class="legend-dot cn"></span>中国作家
      </span>
      <span class="legend-item">
        <span class="legend-dot en"></span>外国作家
      </span>
      <span class="legend-item">
        <span class="legend-line cn"></span>中国 → 中国
      </span>
      <span class="legend-item">
        <span class="legend-line en"></span>外国 → 外国
      </span>
      <span class="legend-item">
        <span class="legend-line cross"></span>跨文化影响
      </span>
    </div>
    <p class="graph-hint">滚轮缩放 · 拖拽平移 · 点击节点查看详情</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const baseUrl = import.meta.env.BASE_URL;

const props = defineProps({
  writers: String
});

// === 画布常量 ===
const VBW = 1700;
const VBH = 1180;
const DIVIDER_X = 770;
const CN_CENTER_X = 400;
const EN_CENTER_X = 1180;

const svgHeight = ref(700);

// === 缩放 & 平移 ===
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0, px: 0, py: 0 });

function zoomIn() {
  zoom.value = Math.min(3, zoom.value * 1.25);
}
function zoomOut() {
  zoom.value = Math.max(0.4, zoom.value / 1.25);
}
function resetZoom() {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
}
function onWheel(e) {
  if (e.deltaY < 0) zoomIn();
  else zoomOut();
}
function onPanStart(e) {
  isPanning.value = true;
  panStart.value = { x: e.clientX, y: e.clientY, px: panX.value, py: panY.value };
}
function onPanMove(e) {
  if (!isPanning.value) return;
  panX.value = panStart.value.px + (e.clientX - panStart.value.x);
  panY.value = panStart.value.py + (e.clientY - panStart.value.y);
}
function onPanEnd() {
  isPanning.value = false;
}

// === 数据解析 ===
const writersData = computed(() => {
  try { return JSON.parse(props.writers); } catch { return []; }
});

// === 动态布局：按国籍分区 + 按出生年排序的网格 ===
const layout = computed(() => {
  const all = writersData.value;
  const cnWriters = all.filter(w => w.nationality === '中国').sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));
  const enWriters = all.filter(w => w.nationality !== '中国').sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));

  const positions = {};

  // 中国作家网格：5列 x N行
  const cnCols = 5;
  const cnXStart = 100;
  const cnXStep = 145;
  const cnYStart = 100;
  const cnYStep = 200;
  cnWriters.forEach((w, i) => {
    const col = i % cnCols;
    const row = Math.floor(i / cnCols);
    positions[w.id] = {
      x: cnXStart + col * cnXStep,
      y: cnYStart + row * cnYStep,
    };
  });

  // 外国作家网格：8列 x N行
  const enCols = 8;
  const enXStart = 820;
  const enXStep = 112;
  const enYStart = 90;
  const enYStep = 105;
  enWriters.forEach((w, i) => {
    const col = i % enCols;
    const row = Math.floor(i / enCols);
    positions[w.id] = {
      x: enXStart + col * enXStep,
      y: enYStart + row * enYStep,
    };
  });

  return positions;
});

// === 节点圆内文字 ===
function getCircleText(writer) {
  const name = writer.name;
  if (name.length <= 3) return name;
  return name.charAt(0) + '·';
}

// === 节点下方短标签 ===
function getShortLabel(writer) {
  const name = writer.name;
  if (name.length <= 3) return name;
  if (writer.alias && writer.alias.length <= 4) return writer.alias;
  const parts = name.split('·');
  const last = parts[parts.length - 1];
  return last.length <= 4 ? last : last.substring(0, 4);
}

// === influenceScore (5-10) → 节点半径 ===
function getRadius(writer) {
  const score = writer.influenceScore || 5;
  return Math.max(14, Math.min(26, 16 + (score - 5) * 2));
}

// === 构建节点 ===
const nodes = computed(() => {
  const pos = layout.value;
  return writersData.value
    .filter(w => pos[w.id])
    .map(w => ({
      id: w.id,
      name: w.name,
      x: pos[w.id].x,
      y: pos[w.id].y,
      r: getRadius(w),
      isCn: w.nationality === '中国',
      circleText: getCircleText(w),
      shortLabel: getShortLabel(w),
    }));
});

// === 构建连线 ===
const edges = computed(() => {
  const pos = layout.value;
  const nodeIds = new Set(Object.keys(pos));
  const writerMap = {};
  writersData.value.forEach(w => { writerMap[w.id] = w; });

  const result = [];
  writersData.value.forEach(w => {
    if (!pos[w.id]) return;
    const influenced = w.influenced || [];
    influenced.forEach(targetId => {
      if (!nodeIds.has(targetId) || !pos[targetId]) return;

      const target = writerMap[targetId];
      if (!target) return;
      const sourceIsCn = w.nationality === '中国';
      const targetIsCn = target.nationality === '中国';

      let type;
      if (sourceIsCn && targetIsCn) type = 'cn';
      else if (!sourceIsCn && !targetIsCn) type = 'en';
      else type = 'cross';

      const sx = pos[w.id].x;
      const sy = pos[w.id].y;
      const tx = pos[targetId].x;
      const ty = pos[targetId].y;
      const sr = getRadius(w);
      const tr = getRadius(target);

      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;
      const ux = dx / dist;
      const uy = dy / dist;
      const gap = 5;

      result.push({
        source: w.id,
        target: targetId,
        sourceName: w.name,
        targetName: target.name,
        type,
        x1: sx + ux * sr,
        y1: sy + uy * sr,
        x2: tx - ux * (tr + gap),
        y2: ty - uy * (tr + gap),
        midX: (sx + tx) / 2,
        midY: (sy + ty) / 2,
        tooltipText: `${target.name} 受 ${w.name} 影响`,
      });
    });
  });
  return result;
});

// === 交互状态 ===
const hoveredNode = ref(null);
const hoveredEdge = ref(null);

const connectedNodeIds = computed(() => {
  if (!hoveredNode.value) return new Set();
  const ids = new Set([hoveredNode.value]);
  edges.value.forEach(e => {
    if (e.source === hoveredNode.value) ids.add(e.target);
    if (e.target === hoveredNode.value) ids.add(e.source);
  });
  return ids;
});

function isEdgeActive(edge) {
  return !!hoveredNode.value && (edge.source === hoveredNode.value || edge.target === hoveredNode.value);
}

function isEdgeDimmed(edge) {
  return !!hoveredNode.value && !isEdgeActive(edge);
}

function isNodeDimmed(node) {
  return !!hoveredNode.value && !connectedNodeIds.value.has(node.id);
}

function onEdgeHover(edge) {
  if (!hoveredNode.value) hoveredEdge.value = edge;
}

function onEdgeLeave() {
  hoveredEdge.value = null;
}

const tooltipWidth = computed(() => {
  if (!hoveredEdge.value) return 0;
  return hoveredEdge.value.tooltipText.length * 14 + 24;
});

const tooltipPos = computed(() => {
  if (!hoveredEdge.value) return { x: 0, y: 0 };
  const halfW = tooltipWidth.value / 2;
  const x = Math.max(halfW + 10, Math.min(VBW - halfW - 10, hoveredEdge.value.midX));
  const y = Math.max(45, Math.min(VBH - 30, hoveredEdge.value.midY));
  return { x, y };
});

function onNodeClick(id) {
  window.location.href = `${baseUrl}writer/${id}.html`;
}
</script>

<style scoped>
.influence-graph {
  background: linear-gradient(135deg, var(--c-bg-card) 0%, var(--c-bg-deep) 100%);
  border: 1px solid var(--c-border-light);
  border-radius: var(--r-xl);
  padding: 1.5rem;
  box-shadow: var(--shadow-card);
  position: relative;
}

/* 缩放控制 */
.graph-controls {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.375rem;
  z-index: 10;
}

.ctrl-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  background: var(--c-bg-card);
  color: var(--c-ink-2);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.ctrl-btn:hover {
  background: var(--c-accent-bg);
  border-color: var(--c-accent);
  color: var(--c-accent);
}

.graph-viewport {
  overflow: hidden;
  border-radius: var(--r-md);
  cursor: grab;
}

.graph-viewport:active {
  cursor: grabbing;
}

.graph-svg {
  width: 100%;
  display: block;
  user-select: none;
}

/* 区域标签 */
.region-label {
  font-family: var(--f-display);
  font-size: 14px;
  fill: var(--c-ink-4);
  letter-spacing: 0.3em;
  font-weight: 600;
}

.divider {
  stroke: var(--c-border);
  stroke-width: 1;
  stroke-dasharray: 3 8;
  opacity: 0.35;
}

/* === 连线 === */
.edge-group {
  opacity: 0.4;
  transition: opacity 0.25s ease;
}

.edge-group.active {
  opacity: 1;
}

.edge-group.dimmed {
  opacity: 0.06;
}

.edge-line {
  fill: none;
  stroke-width: 1.2;
  pointer-events: none;
  transition: stroke-width 0.2s ease;
}

.edge-group.active .edge-line {
  stroke-width: 2.5;
}

.edge-group.cn .edge-line    { stroke: var(--c-accent); }
.edge-group.en .edge-line    { stroke: var(--c-blue); }
.edge-group.cross .edge-line { stroke: var(--c-gold); }

.edge-hit {
  stroke: transparent;
  stroke-width: 16;
  fill: none;
  cursor: pointer;
}

/* === 节点 === */
.node-group {
  transition: opacity 0.25s ease;
}

.node-group:focus {
  outline: none;
}

.node-group.dimmed {
  opacity: 0.12;
}

.node-circle {
  stroke-width: 2;
  cursor: pointer;
  transition: stroke-width 0.2s ease, filter 0.2s ease;
}

.node-group.cn .node-circle {
  fill: var(--c-accent-bg);
  stroke: var(--c-accent);
}

.node-group.en .node-circle {
  fill: var(--c-blue-bg);
  stroke: var(--c-blue);
}

.node-group.active .node-circle,
.node-group:focus-visible .node-circle {
  stroke-width: 3;
}

.node-group.cn.active .node-circle,
.node-group.cn:focus-visible .node-circle {
  filter: drop-shadow(0 0 6px var(--c-accent-soft));
}

.node-group.en.active .node-circle,
.node-group.en:focus-visible .node-circle {
  filter: drop-shadow(0 0 6px var(--c-blue-soft));
}

.node-text {
  font-family: var(--f-display);
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
  user-select: none;
}

.node-group.cn .node-text {
  fill: var(--c-accent-dark);
}

.node-group.en .node-text {
  fill: var(--c-blue);
}

.node-label {
  font-family: var(--f-serif);
  font-size: 10px;
  fill: var(--c-ink-3);
  pointer-events: none;
  user-select: none;
  transition: fill 0.2s ease;
}

.node-group.active .node-label,
.node-group:focus-visible .node-label {
  fill: var(--c-ink);
  font-weight: 600;
}

/* === 提示框 === */
.tooltip-bg {
  fill: var(--c-ink);
  opacity: 0.92;
}

.tooltip-text {
  fill: var(--c-bg);
  font-family: var(--f-serif);
  font-size: 12px;
  letter-spacing: 0.04em;
}

/* === 图例 === */
.graph-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  justify-content: center;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--c-border-light);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: var(--f-serif);
  font-size: 0.8125rem;
  color: var(--c-ink-3);
  letter-spacing: 0.04em;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.legend-dot.cn {
  background: var(--c-accent-bg);
  border: 2px solid var(--c-accent);
}

.legend-dot.en {
  background: var(--c-blue-bg);
  border: 2px solid var(--c-blue);
}

.legend-line {
  width: 24px;
  height: 2px;
  display: inline-block;
  flex-shrink: 0;
  border-radius: 1px;
}

.legend-line.cn    { background: var(--c-accent); }
.legend-line.en    { background: var(--c-blue); }
.legend-line.cross { background: var(--c-gold); }

.graph-hint {
  text-align: center;
  font-family: var(--f-serif);
  font-size: 0.75rem;
  color: var(--c-ink-4);
  margin-top: 0.5rem;
  letter-spacing: 0.06em;
}

/* === 响应式 === */
@media (max-width: 768px) {
  .influence-graph {
    padding: 1rem;
  }

  .region-label {
    font-size: 12px;
  }

  .node-text {
    font-size: 9px;
  }

  .node-label {
    font-size: 8px;
  }

  .graph-legend {
    gap: 0.5rem 1rem;
  }

  .legend-item {
    font-size: 0.75rem;
  }
}
</style>
