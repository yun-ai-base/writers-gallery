<template>
  <div class="interactive-timeline">
    <!-- 图例 -->
    <div class="tl-legend">
      <span class="legend-item">
        <span class="legend-dot cn-dot"></span>中国作家
      </span>
      <span class="legend-item">
        <span class="legend-dot en-dot"></span>外国作家
      </span>
      <span class="legend-item">
        <span class="legend-dot era-dot"></span>时代分隔
      </span>
    </div>

    <!-- 筛选栏 -->
    <div class="tl-filter-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索作家、事件、作品关键词..."
        />
      </div>
      <div class="filter-section">
        <div class="filter-group">
          <span class="filter-label">国籍</span>
          <div class="filter-pills">
            <button
              class="filter-pill"
              :class="{ active: nationalityFilter === 'all' }"
              @click="nationalityFilter = 'all'"
            >全部</button>
            <button
              class="filter-pill"
              :class="{ active: nationalityFilter === '中国' }"
              @click="nationalityFilter = '中国'"
            >中国</button>
            <button
              class="filter-pill"
              :class="{ active: nationalityFilter === '外国' }"
              @click="nationalityFilter = '外国'"
            >外国</button>
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">时代</span>
          <div class="filter-pills">
            <button
              class="filter-pill"
              :class="{ active: eraFilter === 'all' }"
              @click="eraFilter = 'all'"
            >全部</button>
            <button
              v-for="era in ERA_DEFS"
              :key="era.name"
              class="filter-pill"
              :class="{ active: eraFilter === era.name }"
              @click="eraFilter = era.name"
            >{{ era.name }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计 -->
    <div class="tl-stats">
      共 <strong>{{ filteredEvents.length }}</strong> 个事件
      <span v-if="groupedEvents.length"> · 跨越 {{ groupedEvents.length }} 个时代</span>
    </div>

    <!-- 时间线主体 -->
    <div class="timeline-track" v-if="filteredEvents.length">
      <template v-for="era in groupedEvents" :key="era.name">
        <!-- 时代分隔 -->
        <div class="era-divider">
          <span class="era-line"></span>
          <span class="era-badge">
            <span class="era-name">{{ era.name }}</span>
            <span class="era-range">{{ era.range }}</span>
          </span>
          <span class="era-line"></span>
        </div>

        <!-- 时代分组 -->
        <div class="era-group">
          <div
            v-for="(ev, i) in getVisibleEvents(era)"
            :key="`${era.name}-${i}`"
            class="tl-node"
            :class="isCn(ev) ? 'cn' : 'en'"
          >
            <div class="tl-rail">
              <span class="tl-dot"></span>
            </div>
            <div
              class="tl-card"
              :class="{ expanded: expandedSet.has(`${era.name}-${i}`) }"
              @click="toggleExpand(`${era.name}-${i}`)"
            >
              <div class="tl-card-head">
                <span class="tl-year">{{ ev.year }}</span>
                <a
                  :href="`${baseUrl}writer/${ev.writerId}.html`"
                  class="tl-writer"
                  @click.stop
                >{{ ev.writerName }}</a>
                <span class="tl-nation-tag">{{ ev.nationality }}</span>
              </div>
              <div class="tl-event-text">{{ ev.event }}</div>
              <div class="tl-detail-float" v-if="ev.detail">
                <span class="tl-detail-arrow"></span>
                {{ ev.detail }}
              </div>
            </div>
          </div>
        </div>

        <!-- 时代展开更多 -->
        <div
          v-if="era.events.length > ERA_PREVIEW"
          class="era-load-more"
          :key="`more-${era.name}`"
        >
          <button class="era-more-btn" @click="toggleEraExpand(era.name)">
            {{ expandedEras.has(era.name)
              ? '收起'
              : `展开更多（${era.events.length - ERA_PREVIEW} 条）` }}
          </button>
        </div>
      </template>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      未找到匹配的事件，试试其他筛选条件？
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const baseUrl = import.meta.env.BASE_URL;

const props = defineProps({
  events: String,
  writers: String
});

// 解析事件数据
const eventsData = computed(() => {
  try { return JSON.parse(props.events); } catch { return []; }
});

// 解析作家 meta，建立查找表用于补全事件缺失字段
const writerMap = computed(() => {
  const m = new Map();
  try {
    const list = JSON.parse(props.writers);
    for (const w of list) {
      if (w.id) m.set(w.id, w);
    }
  } catch { /* ignore */ }
  return m;
});

// 时代定义：年份区间与显示范围
const ERA_DEFS = [
  { name: '文艺复兴', min: -9999, max: 1799, range: '14–18世纪' },
  { name: '19世纪', min: 1800, max: 1899, range: '1800–1899' },
  { name: '近现代', min: 1900, max: 1949, range: '1900–1949' },
  { name: '20世纪', min: 1950, max: 9999, range: '1950–至今' }
];

function classifyEra(year) {
  const era = ERA_DEFS.find(e => year >= e.min && year <= e.max);
  return era ? era.name : '近现代';
}

function isCn(ev) {
  return ev.nationality === '中国';
}

// 筛选状态
const searchQuery = ref('');
const nationalityFilter = ref('all');
const eraFilter = ref('all');

// 移动端点击展开的详情（桌面端用 hover）
const expandedSet = ref(new Set());
function toggleExpand(key) {
  const next = new Set(expandedSet.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedSet.value = next;
}

// 每个时代默认显示前 N 条事件
const ERA_PREVIEW = 8;
const expandedEras = ref(new Set());

function toggleEraExpand(eraName) {
  const next = new Set(expandedEras.value);
  if (next.has(eraName)) next.delete(eraName);
  else next.add(eraName);
  expandedEras.value = next;
}

function getVisibleEvents(era) {
  if (expandedEras.value.has(era.name)) return era.events;
  return era.events.slice(0, ERA_PREVIEW);
}

// 补全事件国籍（若事件本身缺失则查 writers meta）
const enrichedEvents = computed(() => {
  return eventsData.value.map(ev => {
    if (ev.nationality) return ev;
    const w = writerMap.value.get(ev.writerId);
    return { ...ev, nationality: w?.nationality || '外国' };
  });
});

// 筛选 + 排序
const filteredEvents = computed(() => {
  let result = enrichedEvents.value;

  if (nationalityFilter.value === '中国') {
    result = result.filter(e => isCn(e));
  } else if (nationalityFilter.value === '外国') {
    result = result.filter(e => !isCn(e));
  }

  if (eraFilter.value !== 'all') {
    result = result.filter(e => classifyEra(e.year) === eraFilter.value);
  }

  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    result = result.filter(e =>
      (e.event && e.event.toLowerCase().includes(q)) ||
      (e.detail && e.detail.toLowerCase().includes(q)) ||
      (e.writerName && e.writerName.toLowerCase().includes(q)) ||
      (e.nationality && e.nationality.toLowerCase().includes(q))
    );
  }

  return [...result].sort((a, b) => a.year - b.year);
});

// 按时代分组，保持 ERA_DEFS 顺序
const groupedEvents = computed(() => {
  const map = new Map();
  for (const ev of filteredEvents.value) {
    const eraName = classifyEra(ev.year);
    if (!map.has(eraName)) map.set(eraName, []);
    map.get(eraName).push(ev);
  }
  const groups = [];
  for (const def of ERA_DEFS) {
    if (map.has(def.name)) {
      groups.push({ name: def.name, range: def.range, events: map.get(def.name) });
    }
  }
  return groups;
});
</script>

<style scoped>
.interactive-timeline {
  position: relative;
}

/* ===== 图例 ===== */
.tl-legend {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--f-serif);
  font-size: 0.8125rem;
  color: var(--c-ink-3);
  letter-spacing: 0.04em;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-dot.cn-dot {
  background: var(--c-accent);
  box-shadow: 0 0 0 3px var(--c-accent-bg);
}
.legend-dot.en-dot {
  background: var(--c-blue);
  box-shadow: 0 0 0 3px var(--c-blue-bg);
}
.legend-dot.era-dot {
  background: var(--c-gold);
  box-shadow: 0 0 0 3px rgba(184, 144, 64, 0.15);
}

/* ===== 筛选栏 ===== */
.tl-filter-bar {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
  padding: 1.25rem;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border-light);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
}
.tl-filter-bar .search-box {
  flex: 1;
  min-width: 220px;
  position: relative;
}
.tl-filter-bar .search-box input {
  width: 100%;
  padding: 0.625rem 1.125rem 0.625rem 2.5rem;
  border: 1px solid var(--c-border);
  border-radius: var(--r-full);
  background: var(--c-bg);
  color: var(--c-ink);
  font-size: 0.875rem;
  font-family: var(--f-sans);
  outline: none;
  transition: border-color 0.25s, box-shadow 0.25s;
  letter-spacing: 0.02em;
}
.tl-filter-bar .search-box input:focus {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 4px var(--c-accent-bg);
}
.tl-filter-bar .search-box .search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-ink-4);
  font-size: 0.9rem;
}
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}
.filter-label {
  font-family: var(--f-serif);
  font-size: 0.75rem;
  color: var(--c-ink-4);
  letter-spacing: 0.08em;
  flex-shrink: 0;
}
.filter-pills {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}
.filter-pill {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--c-border);
  border-radius: var(--r-full);
  background: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: var(--f-serif);
  color: var(--c-ink-4);
  font-weight: 500;
  transition: all 0.25s;
  letter-spacing: 0.04em;
}
.filter-pill:hover {
  border-color: var(--c-ink-3);
  color: var(--c-ink-2);
  background: var(--c-bg-deep);
}
.filter-pill.active {
  border-color: var(--c-accent);
  background: var(--c-accent-bg);
  color: var(--c-accent);
  font-weight: 600;
}

/* ===== 统计行 ===== */
.tl-stats {
  font-family: var(--f-serif);
  font-size: 0.8125rem;
  color: var(--c-ink-4);
  margin-bottom: 1.5rem;
  letter-spacing: 0.04em;
}
.tl-stats strong {
  color: var(--c-accent);
  font-family: var(--f-mono);
  font-weight: 600;
}

/* ===== 时间线轨道 ===== */
.timeline-track {
  position: relative;
}

/* ===== 时代分隔 ===== */
.era-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0 1.25rem;
}
.era-divider:first-child {
  margin-top: 0;
}
.era-divider .era-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--c-gold) 50%, transparent 100%);
  opacity: 0.6;
}
.era-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 1.125rem;
  border: 1px solid var(--c-gold);
  border-radius: var(--r-full);
  background: var(--c-bg-card);
  box-shadow: 0 2px 10px rgba(184, 144, 64, 0.12);
  white-space: nowrap;
}
.era-badge .era-name {
  font-family: var(--f-display);
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--c-gold);
  letter-spacing: 0.1em;
}
.era-badge .era-range {
  font-family: var(--f-mono);
  font-size: 0.6875rem;
  color: var(--c-ink-4);
  letter-spacing: 0.02em;
  padding-left: 0.625rem;
  border-left: 1px solid var(--c-border);
}

/* ===== 时代分组（内含连续竖线） ===== */
.era-group {
  position: relative;
}
.era-group::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--c-border);
  border-radius: 1px;
}

/* ===== 事件节点 ===== */
.tl-node {
  position: relative;
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 1rem;
  padding-bottom: 1.25rem;
}
.tl-node:last-child {
  padding-bottom: 0.5rem;
}

/* 节点圆点 */
.tl-rail {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 0.75rem;
  position: relative;
  z-index: 1;
}
.tl-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform 0.25s, box-shadow 0.25s;
  position: relative;
}
.tl-node.cn .tl-dot {
  background: var(--c-accent);
  border: 3px solid var(--c-bg-card);
  box-shadow: 0 0 0 2px var(--c-accent), 0 2px 6px rgba(191, 58, 42, 0.2);
}
.tl-node.en .tl-dot {
  background: var(--c-blue);
  border: 3px solid var(--c-bg-card);
  box-shadow: 0 0 0 2px var(--c-blue), 0 2px 6px rgba(42, 107, 124, 0.2);
}
.tl-node:hover .tl-dot {
  transform: scale(1.25);
}

/* ===== 事件卡片 ===== */
.tl-card {
  position: relative;
  border: 1px solid var(--c-border-light);
  border-radius: var(--r-lg);
  padding: 0.875rem 1.25rem;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s;
}
.tl-node.cn .tl-card {
  background: linear-gradient(135deg, var(--c-bg-card-cn) 0%, var(--c-bg-card) 100%);
  border-left: 3px solid var(--c-accent);
}
.tl-node.en .tl-card {
  background: linear-gradient(135deg, var(--c-bg-card-en) 0%, var(--c-bg-card) 100%);
  border-left: 3px solid var(--c-blue);
}
.tl-card:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-card-hover);
}
.tl-node.cn .tl-card:hover {
  border-color: var(--c-accent-soft);
}
.tl-node.en .tl-card:hover {
  border-color: var(--c-blue-soft);
}

.tl-card-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.tl-year {
  font-family: var(--f-mono);
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.tl-node.cn .tl-year { color: var(--c-accent); }
.tl-node.en .tl-year { color: var(--c-blue); }

.tl-writer {
  font-family: var(--f-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--c-ink);
  letter-spacing: 0.06em;
  transition: color 0.2s;
  position: relative;
}
.tl-writer::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  border-radius: 1px;
  transition: width 0.3s ease;
}
.tl-node.cn .tl-writer::after { background: var(--c-accent); }
.tl-node.en .tl-writer::after { background: var(--c-blue); }
.tl-writer:hover::after { width: 100%; }

.tl-nation-tag {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: var(--r-full);
  font-family: var(--f-sans);
  font-weight: 500;
  letter-spacing: 0.04em;
}
.tl-node.cn .tl-nation-tag {
  background: var(--c-accent-bg);
  color: var(--c-accent);
  border: 1px solid rgba(191, 58, 42, 0.15);
}
.tl-node.en .tl-nation-tag {
  background: var(--c-blue-bg);
  color: var(--c-blue);
  border: 1px solid rgba(42, 107, 124, 0.15);
}

.tl-event-text {
  font-family: var(--f-serif);
  font-size: 0.9375rem;
  color: var(--c-ink-2);
  line-height: 1.7;
  margin-top: 0.375rem;
  letter-spacing: 0.02em;
}

/* ===== 详情浮层（hover 显示） ===== */
.tl-detail-float {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  padding: 0.75rem 1rem 0.75rem 1.5rem;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-float);
  font-family: var(--f-serif);
  font-size: 0.8125rem;
  color: var(--c-ink-3);
  line-height: 1.7;
  letter-spacing: 0.02em;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-6px);
  transition: opacity 0.25s ease, transform 0.25s ease, visibility 0.25s;
  z-index: 20;
  pointer-events: none;
}
.tl-detail-arrow {
  position: absolute;
  top: -6px;
  left: 22px;
  width: 10px;
  height: 10px;
  background: var(--c-bg-card);
  border-left: 1px solid var(--c-border);
  border-top: 1px solid var(--c-border);
  transform: rotate(45deg);
}
.tl-card:hover .tl-detail-float,
.tl-card.expanded .tl-detail-float {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

/* ===== 时代展开更多 ===== */
.era-load-more {
  text-align: center;
  padding: 0.5rem 0 1rem 40px;
}
.era-more-btn {
  padding: 0.375rem 1.25rem;
  border: 1px dashed var(--c-border);
  border-radius: var(--r-full);
  background: none;
  cursor: pointer;
  font-family: var(--f-serif);
  font-size: 0.75rem;
  color: var(--c-ink-4);
  transition: all 0.2s;
  letter-spacing: 0.04em;
}
.era-more-btn:hover {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: var(--c-accent-bg);
  border-style: solid;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .tl-filter-bar {
    flex-direction: column;
    gap: 0.875rem;
  }
  .filter-section {
    width: 100%;
  }
  .filter-group {
    align-items: flex-start;
  }
  .tl-legend {
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .tl-node {
    grid-template-columns: 28px 1fr;
    gap: 0.625rem;
  }
  .era-group::before {
    left: 14px;
  }
  .tl-rail {
    padding-top: 0.625rem;
  }
  .tl-dot {
    width: 10px;
    height: 10px;
  }
  .tl-card {
    padding: 0.75rem 1rem;
  }
  .tl-event-text {
    font-size: 0.875rem;
  }
}
</style>
