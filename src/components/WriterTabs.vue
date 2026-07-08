<template>
  <div>
    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'biography' }"
        @click="activeTab = 'biography'"
      >生平</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'works' }"
        @click="activeTab = 'works'"
      >作品</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'thoughts' }"
        @click="activeTab = 'thoughts'"
      >思想脉络</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'quotes' }"
        @click="activeTab = 'quotes'"
      >言论</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'timeline' }"
        @click="activeTab = 'timeline'"
      >时间线</button>
    </div>

    <div class="tab-content">
      <!-- Biography -->
      <div v-if="activeTab === 'biography'" class="bio-content" v-html="biographyHtml"></div>

      <!-- Works -->
      <div v-if="activeTab === 'works'">
        <a
          v-for="work in worksList"
          :key="work.id"
          :href="`${baseUrl}work/${work.id}.html`"
          class="work-card"
        >
          <div class="work-title">{{ work.title }}</div>
          <div class="work-meta">{{ work.publishYear }} · {{ work.genre?.join(' / ') }}</div>
          <div class="work-synopsis">{{ work.synopsis }}</div>
          <div class="work-rating">评分 {{ work.rating }}/10</div>
        </a>
        <div v-if="worksList.length === 0" class="empty-state">暂无作品数据</div>
      </div>

      <!-- Thoughts -->
      <div v-if="activeTab === 'thoughts'" class="thought-flow">
        <div v-for="(thought, i) in thoughtsList" :key="i" class="thought-node">
          <div class="period">{{ thought.period }}</div>
          <div v-if="thought.from || thought.to" class="transition-arrow">
            <span class="from-label">{{ thought.from }}</span>
            <span class="arrow-symbol">→</span>
            <span class="to-label">{{ thought.to }}</span>
          </div>
          <div v-if="thought.keywords?.length" class="thought-keywords">
            <span v-for="kw in thought.keywords" :key="kw" class="kw-tag">{{ kw }}</span>
          </div>
          <div class="description">{{ thought.description }}</div>
        </div>
        <div v-if="thoughtsList.length === 0" class="empty-state">暂无思想脉络数据</div>
      </div>

      <!-- Quotes with Card Generator -->
      <div v-if="activeTab === 'quotes'">
        <div v-for="(quote, i) in quotesList" :key="i" class="quote-card">
          <div class="quote-text">{{ quote.text }}</div>
          <div v-if="quote.original" class="quote-original">{{ quote.original }}</div>
          <div class="quote-source">{{ quote.source }}{{ quote.context ? ` (${quote.context})` : '' }}</div>
          <QuoteCardGenerator
            :quote-text="quote.text"
            :quote-source="quote.source + (quote.context ? ` (${quote.context})` : '')"
            :writer-name="writerName"
            :writer-id="writerIdProp"
          />
        </div>
        <div v-if="quotesList.length === 0" class="empty-state">暂无言论数据</div>
      </div>

      <!-- Timeline -->
      <div v-if="activeTab === 'timeline'">
        <ul class="timeline-list">
          <li v-for="(item, i) in timelineList" :key="i" class="timeline-item">
            <div class="tl-year">{{ item.year }}</div>
            <div class="tl-event">{{ item.event }}</div>
            <div class="tl-detail" v-if="item.detail">{{ item.detail }}</div>
          </li>
        </ul>
        <div v-if="timelineList.length === 0" class="empty-state">暂无时间线数据</div>
      </div>
    </div>

    <!-- Favorite button -->
    <div class="fav-section">
      <button
        class="fav-btn"
        :class="{ 'is-fav': isFavorited }"
        @click="toggleFavorite"
      >
        <span class="fav-icon">{{ isFavorited ? '❤️' : '🤍' }}</span>
        <span class="fav-text">{{ isFavorited ? '已收藏' : '收藏此作家' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import QuoteCardGenerator from './QuoteCardGenerator.vue';

const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';

const props = defineProps({
  biographyHtml: String,
  timeline: String,
  thoughts: String,
  quotes: String,
  works: String,
  writerId: String,
  writerName: String,
  isCn: String
});

const writerIdProp = computed(() => props.writerId || '');
const activeTab = ref('biography');
const isFavorited = ref(false);

onMounted(() => {
  const favs = JSON.parse(localStorage.getItem('writerFavorites') || '[]');
  isFavorited.value = favs.includes(props.writerId);
});

function toggleFavorite() {
  const favs = JSON.parse(localStorage.getItem('writerFavorites') || '[]');
  if (isFavorited.value) {
    const idx = favs.indexOf(props.writerId);
    if (idx > -1) favs.splice(idx, 1);
  } else {
    favs.push(props.writerId);
  }
  localStorage.setItem('writerFavorites', JSON.stringify(favs));
  isFavorited.value = !isFavorited.value;
}

const biographyHtml = computed(() => {
  try { return JSON.parse(props.biographyHtml); } catch { return props.biographyHtml || ''; }
});

const timelineList = computed(() => {
  try {
    const list = JSON.parse(props.timeline);
    // Unify: description → detail
    return list.map(item => ({
      year: item.year,
      event: item.event,
      detail: item.detail || item.description || ''
    }));
  } catch { return []; }
});

const thoughtsList = computed(() => {
  try {
    const list = JSON.parse(props.thoughts);
    // Unify multiple schemas
    return list.map(item => ({
      period: item.period || `${item.phase || ''}${item.phase && item.period ? '（' + item.period + '）' : item.period || ''}`,
      from: item.from || '',
      to: item.to || '',
      description: item.description || '',
      keywords: item.keywords || []
    }));
  } catch { return []; }
});

const quotesList = computed(() => {
  try {
    const list = JSON.parse(props.quotes);
    // Unify: quote → text, preserve original for foreign writers
    return list.map(item => ({
      text: item.text || item.quote || '',
      source: item.source || '',
      context: item.context || '',
      original: item.original || ''
    }));
  } catch { return []; }
});

const worksList = computed(() => {
  try { return JSON.parse(props.works); } catch { return []; }
});
</script>

<style scoped>
.thought-keywords {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.kw-tag {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  background: var(--c-accent, #c04851);
  color: #fff;
  opacity: 0.85;
}
.quote-original {
  font-style: italic;
  color: var(--c-ink-3, #8b7e6a);
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
  font-family: var(--f-serif, Georgia, serif);
}
.bio-content {
  line-height: 2;
  font-size: 0.9375rem;
  color: var(--c-ink-2, #5c4b3a);
  text-align: justify;
  letter-spacing: 0.02em;
}
.bio-content h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1.5rem 0 0.8rem;
  color: var(--c-ink-1, #2d1f14);
  border-bottom: 1px solid var(--c-accent, #c04851);
  padding-bottom: 0.3rem;
}
.bio-content h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: var(--c-ink-1, #2d1f14);
}
.bio-content p {
  margin-bottom: 1rem;
}
.bio-content strong {
  color: var(--c-accent, #c04851);
  font-weight: 600;
}
.bio-content em {
  color: var(--c-blue, #2e7d8c);
}
</style>
