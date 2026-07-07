<template>
  <div class="quote-card-generator">
    <button class="gen-card-btn" @click="generateCard" title="生成名片卡片">
      <span class="btn-icon">🎴</span>
      <span class="btn-text">生成卡片</span>
    </button>

    <!-- 预览浮层 -->
    <Teleport to="body">
      <div v-if="showPreview" class="card-preview-overlay" @click.self="showPreview = false">
        <div class="card-preview-inner">
          <button class="preview-close" @click="showPreview = false" title="关闭">&times;</button>
          <img :src="cardImageUrl" alt="名言卡片" class="preview-image" />
          <div class="preview-actions">
            <button class="btn-download" @click="downloadCard">下载 PNG</button>
            <button class="btn-close" @click="showPreview = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  quoteText: {
    type: String,
    required: true,
    default: ''
  },
  quoteSource: {
    type: String,
    required: true,
    default: ''
  },
  writerName: {
    type: String,
    required: true,
    default: ''
  },
  writerId: {
    type: String,
    required: false,
    default: ''
  }
})

const showPreview = ref(false)
const cardImageUrl = ref('')

/**
 * 在 Canvas 上绘制带噪点的宣纸纹理背景
 */
function drawPaperBackground(ctx, width, height) {
  // 暖黄色宣纸底色
  ctx.fillStyle = '#f7f2e7'
  ctx.fillRect(0, 0, width, height)

  // 叠加轻微噪点纹理（模拟宣纸纤维感）
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    // 每4个像素生成一次噪点偏移，减少计算量
    if (i % 16 === 0) {
      const noise = (Math.random() - 0.5) * 12
      data[i] = Math.min(255, Math.max(0, data[i] + noise))       // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)) // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7)) // B（偏暖）
    }
  }
  ctx.putImageData(imageData, 0, 0)

  // 第二层：更大粒度的随机半透明噪点，模拟纸张纤维
  ctx.globalAlpha = 0.03
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (Math.random() > 0.6) {
        ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#8b7355'
        ctx.fillRect(x, y, 2, 2)
      }
    }
  }
  ctx.globalAlpha = 1
}

/**
 * 绘制顶部朱砂红装饰线
 */
function drawDecorativeLine(ctx, width) {
  const lineY = 60
  const lineColor = '#c43b3b'

  // 主线
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(60, lineY)
  ctx.lineTo(width - 60, lineY)
  ctx.stroke()

  // 细双线装饰
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, lineY + 8)
  ctx.lineTo(width - 60, lineY + 8)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(60, lineY - 8)
  ctx.lineTo(width - 60, lineY - 8)
  ctx.stroke()
}

/**
 * 绘制底部作家名和出处
 */
function drawSourceInfo(ctx, width, height) {
  const infoY = height - 80
  const infoColor = '#c43b3b'

  // 作家名 — 朱砂色，字号稍大
  ctx.fillStyle = infoColor
  ctx.font = '16px "Noto Serif SC", "Source Han Serif SC", "SimSun", "STSong", serif'
  ctx.textAlign = 'right'
  ctx.fillText(`—— ${props.writerName}`, width - 80, infoY)

  // 出处 — 灰色小字
  if (props.quoteSource) {
    ctx.fillStyle = '#8c7b6b'
    ctx.font = '13px "Noto Serif SC", "Source Han Serif SC", "SimSun", "STSong", serif'
    ctx.fillText(`《${props.quoteSource}》`, width - 80, infoY + 22)
  }
}

/**
 * 绘制印章装饰（右下角红方块 + 白色文字）
 */
function drawSeal(ctx, width, height) {
  const sealSize = 40
  const sealX = width - 80
  const sealY = height - 130

  // 印章方块
  ctx.fillStyle = '#c43b3b'
  ctx.fillRect(sealX, sealY, sealSize, sealSize)

  // 印章内部白色文字（取 writerId/作家名首字或首两字）
  const sealText = props.writerId
    ? props.writerId.slice(0, 2)
    : props.writerName.slice(0, 2)

  ctx.fillStyle = '#f7f2e7'
  ctx.font = 'bold 18px "Noto Serif SC", "Source Han Serif SC", "SimSun", "STSong", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(sealText, sealX + sealSize / 2, sealY + sealSize / 2)
}

/**
 * 绘制名言文字（自动换行，衬线体 28px，居中对齐）
 */
function drawQuoteText(ctx, width, height) {
  const fontSize = 28
  const lineHeight = 48
  const maxWidth = width - 120        // 左右各留 60px 边距
  const textColor = '#3c3028'
  const text = props.quoteText

  ctx.fillStyle = textColor
  ctx.font = `${fontSize}px "Noto Serif SC", "Source Han Serif SC", "SimSun", "STSong", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // 按最大宽度逐字换行
  const lines = wrapText(ctx, text, maxWidth)

  // 计算起始Y坐标，使文字区域在垂直方向居中
  const textBlockHeight = lines.length * lineHeight
  const textAreaTop = 100           // 文字区域顶部
  const textAreaBottom = height - 140 // 文字区域底部（留出底部信息区域）
  const textAreaHeight = textAreaBottom - textAreaTop
  let startY = textAreaTop + (textAreaHeight - textBlockHeight) / 2
  if (startY < textAreaTop) startY = textAreaTop

  // 逐行绘制
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, startY + i * lineHeight)
  }
}

/**
 * 文字自动换行辅助函数
 */
function wrapText(ctx, text, maxWidth) {
  const lines = []
  let currentLine = ''

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const testLine = currentLine + ch
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = ch
    } else {
      currentLine = testLine
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines
}

/**
 * 主生成函数：Canvas 渲染 + 显示预览
 */
function generateCard() {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 500
  const ctx = canvas.getContext('2d')

  // 1. 背景
  drawPaperBackground(ctx, canvas.width, canvas.height)

  // 2. 顶部朱砂装饰线
  drawDecorativeLine(ctx, canvas.width)

  // 3. 名言文字
  drawQuoteText(ctx, canvas.width, canvas.height)

  // 4. 底部信息（作家名 + 出处）
  drawSourceInfo(ctx, canvas.width, canvas.height)

  // 5. 印章
  drawSeal(ctx, canvas.width, canvas.height)

  // 6. 导出图片 URL
  cardImageUrl.value = canvas.toDataURL('image/png')
  showPreview.value = true
}

/**
 * 下载 PNG
 */
function downloadCard() {
  const link = document.createElement('a')
  link.href = cardImageUrl.value
  link.download = `${props.writerName}-quote.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.quote-card-generator {
  display: inline-block;
}

/* 生成按钮 */
.gen-card-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--c-border, #d4cfc4);
  border-radius: 6px;
  cursor: pointer;
  font-family: var(--f-serif, "Noto Serif SC", "SimSun", serif);
  font-size: 13px;
  color: var(--c-text, #5a5248);
  transition: border-color 0.2s, color 0.2s;
}

.gen-card-btn:hover {
  border-color: var(--c-accent, #c43b3b);
  color: var(--c-accent, #c43b3b);
}

.btn-icon {
  font-size: 15px;
  line-height: 1;
}

.btn-text {
  line-height: 1;
}

/* ====== 预览浮层 ====== */
.card-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.card-preview-inner {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.25);
}

.preview-close {
  position: absolute;
  top: 8px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #999;
  cursor: pointer;
  border-radius: 50%;
  transition: color 0.2s, background 0.2s;
}

.preview-close:hover {
  color: #333;
  background: #f0f0f0;
}

.preview-image {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.preview-actions {
  display: flex;
  gap: 12px;
}

.preview-actions button {
  padding: 10px 28px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-family: var(--f-serif, "Noto Serif SC", "SimSun", serif);
  cursor: pointer;
  transition: opacity 0.2s;
}

.preview-actions button:hover {
  opacity: 0.85;
}

.btn-download {
  background: var(--c-accent, #c43b3b);
  color: #fff;
}

.btn-close {
  background: #e8e4dc;
  color: #5a5248;
}
</style>
