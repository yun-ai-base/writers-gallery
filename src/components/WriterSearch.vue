<template>
  <div>
    <div class="search-filter-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索作家姓名、国籍、流派..."
        />
      </div>
      <div class="filter-pills">
        <button
          class="filter-pill"
          :class="{ active: filter === 'all' }"
          @click="filter = 'all'"
        >全部</button>
        <button
          class="filter-pill"
          :class="{ active: filter === '中国' }"
          @click="filter = '中国'"
        >中国</button>
        <button
          class="filter-pill"
          :class="{ active: filter === 'foreign' }"
          @click="filter = 'foreign'"
        >外国</button>
      </div>
    </div>

    <!-- 标签筛选区 -->
    <div class="tag-filter-section" v-if="allTags.length">
      <div class="tag-filter-header">
        <span class="tag-filter-title">🏷️ 标签筛选</span>
        <button v-if="activeTag" class="tag-clear-btn" @click="activeTag = null">✕ 清除筛选</button>
      </div>
      <div class="tag-cloud">
        <button
          v-for="tag in allTags"
          :key="tag.name"
          class="tag-pill"
          :class="{ active: activeTag === tag.name }"
          @click="toggleTag(tag.name)"
        >
          {{ tag.name }}
          <span class="tag-count">{{ tag.count }}</span>
        </button>
      </div>
    </div>

    <!-- 结果统计 -->
    <div class="result-stats" v-if="activeTag">
      标签「<strong>{{ activeTag }}</strong>」筛选出 <strong>{{ filteredWriters.length }}</strong> 位作家
    </div>

    <div class="writers-grid">
      <a
        v-for="writer in displayedWriters"
        :key="writer.id"
        :href="`/writer/${writer.id}.html`"
        class="writer-card"
        :class="writer.nationality === '中国' ? 'cn-writer' : 'en-writer'"
      >
        <div class="card-seal"></div>
        <div class="card-header">
          <div class="avatar">{{ writer.name.charAt(0) }}</div>
          <div class="card-info">
            <div class="card-name">{{ writer.name }}</div>
            <div class="card-name-en" v-if="writer.nameEn">{{ writer.nameEn }}</div>
            <div class="card-meta">{{ writer.nationality }} · {{ writer.era }} · {{ writer.birthYear }}–{{ writer.deathYear }}</div>
          </div>
        </div>
        <div class="card-summary" v-if="writer.summary">{{ writer.summary }}</div>
        <div class="card-tags">
          <span
            v-for="tag in writer.tags?.slice(0, 4)"
            :key="tag"
            class="tag"
            :class="{ 'tag-clickable': true, 'tag-active': activeTag === tag }"
            @click.prevent="toggleTag(tag)"
          >{{ tag }}</span>
        </div>
      </a>
    </div>

    <!-- 加载更多 -->
    <div class="load-more-section" v-if="hasMore">
      <button class="load-more-btn" @click="loadMore">
        <span>加载更多</span>
        <span class="load-more-count">（{{ displayedWriters.length }} / {{ filteredWriters.length }}）</span>
      </button>
    </div>

    <div v-if="filteredWriters.length === 0" class="empty-state">
      未找到匹配的作家，试试其他关键词？
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  writers: String
});

const writersData = JSON.parse(props.writers);
const searchQuery = ref('');
const filter = ref('all');
const activeTag = ref(null);

// 分页
const pageSize = 24;
const displayCount = ref(pageSize);

// 收集所有标签（出现≥2次）
const allTags = computed(() => {
  const tagCount = {};
  writersData.forEach(w => {
    (w.tags || []).forEach(t => {
      tagCount[t] = (tagCount[t] || 0) + 1;
    });
  });
  return Object.entries(tagCount)
    .filter(([, count]) => count >= 2)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
});

function toggleTag(tagName) {
  if (activeTag.value === tagName) {
    activeTag.value = null;
  } else {
    activeTag.value = tagName;
  }
  displayCount.value = pageSize;
}

const filteredWriters = computed(() => {
  let result = writersData;

  if (filter.value === '中国') {
    result = result.filter(w => w.nationality === '中国');
  } else if (filter.value === 'foreign') {
    result = result.filter(w => w.nationality !== '中国');
  }

  if (activeTag.value) {
    result = result.filter(w => w.tags && w.tags.includes(activeTag.value));
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(w =>
      w.name.toLowerCase().includes(q) ||
      (w.nameEn && w.nameEn.toLowerCase().includes(q)) ||
      (w.alias && w.alias.toLowerCase().includes(q)) ||
      w.nationality.toLowerCase().includes(q) ||
      w.literaryMovement.toLowerCase().includes(q) ||
      w.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  return result;
});

const displayedWriters = computed(() => filteredWriters.value.slice(0, displayCount.value));

const hasMore = computed(() => displayCount.value < filteredWriters.value.length);

function loadMore() {
  displayCount.value += pageSize;
}
</script>

<style scoped>
/* 标签筛选区 */
.tag-filter-section {
  margin: 1rem 0 1.5rem;
  padding: 1.125rem 1.25rem;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border-light);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
}
.tag-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.tag-filter-title {
  font-family: var(--f-serif);
  font-size: 0.8125rem;
  color: var(--c-ink-3);
  letter-spacing: 0.04em;
}
.tag-clear-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--f-sans);
  font-size: 0.75rem;
  color: var(--c-accent);
  transition: opacity 0.2s;
}
.tag-clear-btn:hover {
  opacity: 0.7;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--c-border);
  border-radius: var(--r-full);
  background: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: var(--f-serif);
  color: var(--c-ink-4);
  font-weight: 500;
  transition: all 0.2s;
  letter-spacing: 0.03em;
}
.tag-pill:hover {
  border-color: var(--c-ink-3);
  color: var(--c-ink-2);
  background: var(--c-bg-deep);
}
.tag-pill.active {
  border-color: var(--c-accent);
  background: var(--c-accent-bg);
  color: var(--c-accent);
  font-weight: 600;
}
.tag-count {
  font-family: var(--f-mono);
  font-size: 0.625rem;
  opacity: 0.6;
  background: var(--c-bg-deep);
  padding: 1px 5px;
  border-radius: 8px;
}
.tag-pill.active .tag-count {
  background: rgba(191, 58, 42, 0.12);
  color: var(--c-accent);
}

/* 结果统计 */
.result-stats {
  font-family: var(--f-serif);
  font-size: 0.8125rem;
  color: var(--c-ink-4);
  margin-bottom: 1rem;
  letter-spacing: 0.03em;
}
.result-stats strong {
  color: var(--c-accent);
  font-weight: 600;
}

/* 卡片标签可点击 */
.tag-clickable {
  cursor: pointer;
  transition: all 0.2s;
}
.tag-clickable:hover {
  background: var(--c-accent-bg);
  color: var(--c-accent);
  border-color: var(--c-accent);
}
.tag-active {
  background: var(--c-accent-bg) !important;
  color: var(--c-accent) !important;
  border-color: var(--c-accent) !important;
  font-weight: 600;
}

/* 加载更多 */
.load-more-section {
  text-align: center;
  padding: 2rem 0 1rem;
}
.load-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.75rem;
  border: 1px solid var(--c-border);
  border-radius: var(--r-full);
  background: var(--c-bg-card);
  cursor: pointer;
  font-family: var(--f-serif);
  font-size: 0.875rem;
  color: var(--c-ink-2);
  transition: all 0.25s;
  letter-spacing: 0.04em;
}
.load-more-btn:hover {
  border-color: var(--c-accent);
  background: var(--c-accent-bg);
  color: var(--c-accent);
}
.load-more-count {
  font-family: var(--f-mono);
  font-size: 0.75rem;
  opacity: 0.6;
}
</style>
