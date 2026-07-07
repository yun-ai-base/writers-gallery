<template>
  <div class="compare-panel">
    <!-- Selector Bar -->
    <div class="compare-selector-bar">
      <div
        v-for="(slot, idx) in columnCount"
        :key="idx"
        class="compare-select-group"
      >
        <label class="selector-label">作家 {{ idx + 1 }}</label>
        <select
          class="selector-dropdown"
          :value="selectedWriters[idx] || ''"
          @change="onSelectWriter(idx, ($event.target).value)"
        >
          <option value="" disabled>选择作家...</option>
          <option
            v-for="w in availableWriters(idx)"
            :key="w.id"
            :value="w.id"
          >{{ w.name }}</option>
        </select>
      </div>

      <div class="column-toggle">
        <button
          class="toggle-btn"
          :class="{ active: columnCount === 2 }"
          @click="columnCount = 2"
          title="对比2位作家"
        >2列</button>
        <button
          class="toggle-btn"
          :class="{ active: columnCount === 3 }"
          @click="columnCount = 3"
          title="对比3位作家"
        >3列</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="selectedList.length === 0" class="compare-empty">
      <div class="empty-icon">⟷</div>
      <div class="empty-text">选择作家开始对比</div>
      <div class="empty-hint">在上方下拉框中选择2~3位作家，并排对比他们的生平、思想与作品</div>
    </div>

    <!-- Comparison Panels -->
    <div
      v-else
      class="compare-grid"
      :class="`cols-${columnCount}`"
    >
      <div
        v-for="writer in selectedList"
        :key="writer.id"
        class="compare-col"
        :class="writer.nationality === '中国' ? 'cn-col' : 'en-col'"
      >
        <!-- Basic Info -->
        <div class="col-section col-basic">
          <div class="col-avatar" :class="writer.nationality === '中国' ? 'cn-avatar' : 'en-avatar'">
            {{ writer.name.charAt(0) }}
          </div>
          <h3 class="col-name">{{ writer.name }}</h3>
          <div class="col-name-en" v-if="writer.nameEn">{{ writer.nameEn }}</div>
          <div class="col-meta-line">
            <span>{{ writer.nationality }}</span>
            <span class="meta-dot">·</span>
            <span>{{ writer.era }}</span>
          </div>
          <div class="col-meta-line col-lifespan">
            {{ writer.birthYear }} – {{ writer.deathYear }}
            <span class="lifespan-age">({{ writer.deathYear - writer.birthYear }}岁)</span>
          </div>
          <div class="col-movement" v-if="writer.literaryMovement">
            {{ writer.literaryMovement }}
          </div>
          <div class="col-summary" v-if="writer.summary">{{ writer.summary }}</div>
        </div>

        <!-- Influence Score -->
        <div class="col-section col-score">
          <div class="section-label">影响力评分</div>
          <div class="score-display">
            <span class="score-num">{{ writer.influenceScore || '—' }}</span>
            <span class="score-max">/ 10</span>
          </div>
          <div class="score-bar-wrap">
            <div
              class="score-bar-fill"
              :style="{ width: ((writer.influenceScore || 0) * 10) + '%' }"
              :class="writer.nationality === '中国' ? 'cn-bar' : 'en-bar'"
            ></div>
          </div>
        </div>

        <!-- Thought Evolution -->
        <div class="col-section col-thoughts">
          <div class="section-label">思想脉络</div>
          <div v-if="getThoughts(writer.id).length > 0">
            <div
              v-for="(thought, ti) in getThoughts(writer.id).slice(0, 2)"
              :key="ti"
              class="mini-thought"
            >
              <div class="thought-period" v-if="thought.period">{{ thought.period }}</div>
              <div class="thought-arrow">
                <span class="from-label">{{ thought.from }}</span>
                <span class="arrow-symbol">→</span>
                <span class="to-label">{{ thought.to }}</span>
              </div>
              <div class="thought-catalyst" v-if="thought.catalyst">
                <span class="catalyst-tag">契机</span> {{ thought.catalyst }}
              </div>
            </div>
          </div>
          <div v-else class="nodata">暂无思想脉络数据</div>
        </div>

        <!-- Works -->
        <div class="col-section col-works">
          <div class="section-label">代表作品</div>
          <div v-if="getWorks(writer.id).length > 0">
            <div
              v-for="work in getWorks(writer.id).slice(0, 3)"
              :key="work.id"
              class="mini-work"
            >
              <div class="mini-work-header">
                <span class="mini-work-title">{{ work.title }}</span>
                <span class="mini-work-year">{{ work.publishYear }}</span>
              </div>
              <div class="mini-work-rating" v-if="work.rating !== undefined">
                <span class="rating-stars">{{ '★'.repeat(Math.round(work.rating / 2)) }}{{ '☆'.repeat(5 - Math.round(work.rating / 2)) }}</span>
                <span class="rating-num">{{ work.rating }}/10</span>
              </div>
            </div>
          </div>
          <div v-else class="nodata">暂无作品数据</div>
        </div>

        <!-- Quote -->
        <div class="col-section col-quote">
          <div class="section-label">核心言论</div>
          <div v-if="getQuotes(writer.id).length > 0" class="mini-quote-card">
            <div class="mini-quote-text">"{{ getQuotes(writer.id)[0].text }}"</div>
            <div class="mini-quote-source" v-if="getQuotes(writer.id)[0].source">
              —— {{ getQuotes(writer.id)[0].source }}
            </div>
          </div>
          <div v-else class="nodata">暂无言论数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  writers: String,
  thoughtsData: String,
  quotesData: String,
  worksData: String
});

/* ---- Parse props ---- */
const allWriters = computed(() => {
  try { return JSON.parse(props.writers || '[]'); } catch { return []; }
});

const allThoughts = computed(() => {
  try { return JSON.parse(props.thoughtsData || '{}'); } catch { return {}; }
});

const allQuotes = computed(() => {
  try { return JSON.parse(props.quotesData || '{}'); } catch { return {}; }
});

const allWorks = computed(() => {
  try { return JSON.parse(props.worksData || '{}'); } catch { return {}; }
});

/* ---- State ---- */
const selectedWriters = ref(['', '', '']);
const columnCount = ref(2);

/* ---- Computed ---- */
const selectedList = computed(() => {
  return selectedWriters.value
    .slice(0, columnCount.value)
    .map(id => allWriters.value.find(w => w.id === id))
    .filter(Boolean);
});

/* ---- Methods ---- */
function onSelectWriter(index, writerId) {
  const newVal = [...selectedWriters.value];
  newVal[index] = writerId;
  selectedWriters.value = newVal;
}

function availableWriters(currentIndex) {
  const excludeIds = selectedWriters.value
    .filter((id, idx) => id && idx !== currentIndex);
  return allWriters.value.filter(w => !excludeIds.includes(w.id));
}

function getThoughts(writerId) {
  return allThoughts.value[writerId] || [];
}

function getQuotes(writerId) {
  return allQuotes.value[writerId] || [];
}

function getWorks(writerId) {
  return allWorks.value[writerId] || [];
}
</script>

<style scoped>
/* ===== Container ===== */
.compare-panel {
  width: 100%;
}

/* ===== Selector Bar ===== */
.compare-selector-bar {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.compare-select-group {
  flex: 1;
  min-width: 160px;
}

.selector-label {
  display: block;
  font-family: var(--f-serif);
  font-size: 0.75rem;
  color: var(--c-ink-4);
  margin-bottom: 0.375rem;
  letter-spacing: 0.06em;
}

.selector-dropdown {
  width: 100%;
  padding: 0.625rem 1rem;
  border: 1px solid var(--c-border);
  border-radius: var(--r-full);
  background: var(--c-bg-card);
  color: var(--c-ink);
  font-size: 0.875rem;
  font-family: var(--f-serif);
  letter-spacing: 0.04em;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a09a88' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  padding-right: 2.5rem;
  transition: border-color 0.25s, box-shadow 0.25s;
}

.selector-dropdown:focus {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 4px var(--c-accent-bg), var(--shadow-ink);
}

/* ===== Column Toggle ===== */
.column-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--c-border);
  border-radius: var(--r-full);
  overflow: hidden;
  flex-shrink: 0;
}

.toggle-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: var(--c-bg-card);
  cursor: pointer;
  font-family: var(--f-sans);
  font-size: 0.75rem;
  color: var(--c-ink-4);
  font-weight: 500;
  letter-spacing: 0.04em;
  transition: all 0.25s;
}

.toggle-btn:first-child {
  border-right: 1px solid var(--c-border);
}

.toggle-btn.active {
  background: var(--c-accent);
  color: #fff;
  font-weight: 600;
}

.toggle-btn:hover:not(.active) {
  background: var(--c-bg-deep);
  color: var(--c-ink-2);
}

/* ===== Empty State ===== */
.compare-empty {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 3rem;
  color: var(--c-ink-5);
  margin-bottom: 1rem;
}

.empty-text {
  font-family: var(--f-display);
  font-size: 1.25rem;
  color: var(--c-ink-3);
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-family: var(--f-serif);
  font-size: 0.875rem;
  color: var(--c-ink-4);
  letter-spacing: 0.04em;
  max-width: 360px;
  margin: 0 auto;
  line-height: 1.7;
}

/* ===== Comparison Grid ===== */
.compare-grid {
  display: grid;
  gap: 1.5rem;
}

.compare-grid.cols-2 {
  grid-template-columns: 1fr 1fr;
}

.compare-grid.cols-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

/* ===== Comparison Column ===== */
.compare-col {
  border-radius: var(--r-xl);
  border: 1px solid var(--c-border-light);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  position: relative;
}

.compare-col::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
}

.cn-col {
  background: linear-gradient(180deg, var(--c-bg-card-cn) 0%, #fef0d0 50%, var(--c-bg-card) 100%);
}

.en-col {
  background: linear-gradient(180deg, var(--c-bg-card-en) 0%, #eef0f0 50%, var(--c-bg-card) 100%);
}

/* ===== Column Sections ===== */
.col-section {
  padding: 1.25rem 1.5rem;
  position: relative;
  z-index: 1;
}

.col-section + .col-section {
  border-top: 1px solid var(--c-border-light);
}

.section-label {
  font-family: var(--f-display);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--c-ink-2);
  letter-spacing: 0.08em;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-label::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 2px;
  flex-shrink: 0;
}

.cn-col .section-label::before {
  background: var(--c-accent);
}

.en-col .section-label::before {
  background: var(--c-blue);
}

/* ===== Basic Info ===== */
.col-basic {
  text-align: center;
  padding-top: 1.75rem;
}

.col-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--f-display);
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.cn-avatar {
  background: radial-gradient(circle, var(--c-accent-bg) 30%, #fce0d0 100%);
  color: var(--c-accent-dark);
  border: 2px solid rgba(191, 58, 42, 0.2);
  box-shadow: 0 2px 8px rgba(191, 58, 42, 0.1);
}

.en-avatar {
  background: radial-gradient(circle, var(--c-blue-bg) 30%, #e0e8ec 100%);
  color: var(--c-blue);
  border: 2px solid rgba(42, 107, 124, 0.2);
  box-shadow: 0 2px 8px rgba(42, 107, 124, 0.1);
}

.col-name {
  font-family: var(--f-display);
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--c-ink);
  letter-spacing: 0.08em;
  line-height: 1.3;
}

.col-name-en {
  font-size: 0.6875rem;
  color: var(--c-ink-4);
  font-family: var(--f-sans);
  letter-spacing: 0.02em;
  margin-top: 2px;
}

.col-meta-line {
  font-size: 0.8125rem;
  color: var(--c-ink-3);
  margin-top: 4px;
  letter-spacing: 0.02em;
}

.meta-dot {
  margin: 0 0.25rem;
  color: var(--c-ink-4);
}

.col-lifespan {
  color: var(--c-ink-2);
  font-family: var(--f-mono);
  font-size: 0.8125rem;
  font-weight: 500;
}

.lifespan-age {
  color: var(--c-ink-4);
  font-weight: 400;
  font-size: 0.75rem;
}

.col-movement {
  font-size: 0.75rem;
  color: var(--c-ink-3);
  margin-top: 6px;
  letter-spacing: 0.02em;
  font-family: var(--f-serif);
}

.col-summary {
  font-size: 0.8125rem;
  color: var(--c-ink-3);
  line-height: 1.7;
  margin-top: 0.5rem;
  font-family: var(--f-serif);
  letter-spacing: 0.02em;
}

/* ===== Influence Score ===== */
.col-score {
  text-align: center;
}

.score-display {
  margin-bottom: 0.5rem;
}

.score-num {
  font-family: var(--f-mono);
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--c-ink);
  line-height: 1;
}

.score-max {
  font-family: var(--f-mono);
  font-size: 1rem;
  color: var(--c-ink-4);
}

.score-bar-wrap {
  height: 6px;
  background: var(--c-bg-deep);
  border-radius: 3px;
  overflow: hidden;
  margin: 0 auto;
  max-width: 200px;
}

.score-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.score-bar-fill.cn-bar {
  background: linear-gradient(90deg, var(--c-accent) 0%, var(--c-accent-soft) 100%);
}

.score-bar-fill.en-bar {
  background: linear-gradient(90deg, var(--c-blue) 0%, var(--c-blue-soft) 100%);
}

/* ===== Mini Thought ===== */
.mini-thought {
  background: linear-gradient(135deg, var(--c-bg-card) 0%, var(--c-bg-deep) 100%);
  border: 1px solid var(--c-border-light);
  border-radius: var(--r-md);
  padding: 0.875rem 1rem;
  margin-bottom: 0.5rem;
  position: relative;
}

.mini-thought::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  border-radius: 2px;
}

.cn-col .mini-thought::before {
  background: linear-gradient(180deg, var(--c-accent) 0%, var(--c-accent-soft) 100%);
}

.en-col .mini-thought::before {
  background: linear-gradient(180deg, var(--c-blue) 0%, var(--c-blue-soft) 100%);
}

.thought-period {
  font-family: var(--f-display);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--c-accent);
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}

.cn-col .thought-period {
  color: var(--c-accent);
}

.en-col .thought-period {
  color: var(--c-blue);
}

.thought-arrow {
  font-family: var(--f-sans);
  font-size: 0.75rem;
  color: var(--c-ink-4);
  letter-spacing: 0.02em;
  margin-bottom: 4px;
}

.thought-arrow .from-label {
  color: var(--c-ink-3);
}

.thought-arrow .arrow-symbol {
  color: var(--c-gold);
  margin: 0 0.375rem;
  font-weight: 700;
}

.thought-arrow .to-label {
  font-weight: 600;
}

.cn-col .thought-arrow .to-label {
  color: var(--c-accent);
}

.en-col .thought-arrow .to-label {
  color: var(--c-blue);
}

.thought-catalyst {
  font-family: var(--f-serif);
  font-size: 0.6875rem;
  color: var(--c-ink-3);
  line-height: 1.5;
  letter-spacing: 0.02em;
}

.catalyst-tag {
  font-family: var(--f-mono);
  font-size: 0.625rem;
  padding: 1px 6px;
  border-radius: var(--r-xs);
  font-weight: 600;
}

.cn-col .catalyst-tag {
  background: var(--c-accent-bg);
  color: var(--c-accent);
  border: 1px solid rgba(191, 58, 42, 0.15);
}

.en-col .catalyst-tag {
  background: var(--c-blue-bg);
  color: var(--c-blue);
  border: 1px solid rgba(42, 107, 124, 0.15);
}

/* ===== Mini Work ===== */
.mini-work {
  padding: 0.625rem 0.75rem;
  border-radius: var(--r-md);
  margin-bottom: 0.375rem;
  transition: background 0.2s;
  background: linear-gradient(135deg, var(--c-bg-card) 0%, var(--c-bg-deep) 100%);
  border: 1px solid var(--c-border-light);
}

.mini-work-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.mini-work-title {
  font-family: var(--f-display);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--c-ink);
  letter-spacing: 0.04em;
}

.mini-work-year {
  font-family: var(--f-mono);
  font-size: 0.6875rem;
  color: var(--c-ink-4);
}

.mini-work-rating {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 4px;
}

.rating-stars {
  font-size: 0.625rem;
  letter-spacing: 1px;
}

.cn-col .rating-stars {
  color: var(--c-accent-soft);
}

.en-col .rating-stars {
  color: var(--c-blue-soft);
}

.rating-num {
  font-family: var(--f-mono);
  font-size: 0.625rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--r-xs);
}

.cn-col .rating-num {
  background: var(--c-accent-bg);
  color: var(--c-accent);
  border: 1px solid rgba(191, 58, 42, 0.15);
}

.en-col .rating-num {
  background: var(--c-blue-bg);
  color: var(--c-blue);
  border: 1px solid rgba(42, 107, 124, 0.15);
}

/* ===== Mini Quote ===== */
.mini-quote-card {
  background: linear-gradient(135deg, var(--c-bg-card) 0%, var(--c-bg-deep) 100%);
  border: 1px solid var(--c-border-light);
  border-radius: var(--r-lg);
  padding: 1rem 1.25rem;
  position: relative;
  overflow: hidden;
}

.cn-col .mini-quote-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0.5rem;
  right: 0.5rem;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--c-accent) 20%, var(--c-accent) 80%, transparent 100%);
  opacity: 0.3;
  border-radius: 1px;
}

.en-col .mini-quote-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0.5rem;
  right: 0.5rem;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--c-blue) 20%, var(--c-blue) 80%, transparent 100%);
  opacity: 0.3;
  border-radius: 1px;
}

.mini-quote-text {
  font-family: var(--f-display);
  font-size: 0.9375rem;
  line-height: 1.8;
  color: var(--c-ink);
  letter-spacing: 0.06em;
}

.mini-quote-source {
  font-family: var(--f-sans);
  font-size: 0.6875rem;
  color: var(--c-ink-4);
  margin-top: 0.75rem;
  letter-spacing: 0.04em;
  text-align: right;
}

/* ===== No Data ===== */
.nodata {
  font-family: var(--f-serif);
  font-size: 0.75rem;
  color: var(--c-ink-4);
  letter-spacing: 0.04em;
  font-style: italic;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .compare-selector-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .compare-select-group {
    min-width: 0;
  }

  .column-toggle {
    align-self: center;
  }

  .compare-grid.cols-2,
  .compare-grid.cols-3 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .compare-grid.cols-3 {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
