<template>
  <section class="hero-section" aria-label="关于 Oh My DSH">
    <div class="hero-inner">
      <div class="hero-badge">🎯 社区驱动 · 持续更新</div>

      <h1 class="hero-title">
        <span class="hero-title-main">Oh My DSH</span>
        <span class="hero-title-sub">DeepSeek Harness 中文社区</span>
      </h1>

      <p class="hero-desc">
        Oh My DSH 是 DSH（DeepSeek Harness）生态的中文社区站点，提供插件搜索、技术讨论和每日资讯。
        DSH 是一个开源的 AI Agent 框架，让大模型真正替你完成复杂任务——不只是聊天，而是自主规划、执行和检查结果。
      </p>

      <div class="hero-highlight">
        <span class="hero-highlight-icon">⭐</span>
        <div class="hero-highlight-text">
          <strong>重点关注：oh-my-dsh</strong>
          <span>
            530 个 DSH 插件生态，TypeScript 类型检查 0 错误、3731 个测试全绿、2183 个端到端注册检查通过。
            严格追踪每个实现 gap 来源，质量在 DSH 生态里独一档。
            <a href="https://github.com/LaplaceYoung/oh-my-dsh" target="_blank" rel="noopener">GitHub →</a>
          </span>
        </div>
      </div>

      <div class="hero-install">
        <h2 class="hero-install-title">🚀 快速安装</h2>
        <div class="hero-install-code">
          <code>npx @deepseek-ai/dsh web</code>
          <button class="hero-copy-btn" @click="copyInstall" :title="copyTip">
            <span v-if="copied">✅ 已复制</span>
            <span v-else>📋 复制</span>
          </button>
        </div>
        <p class="hero-install-note">需要 Node.js 18+，首次运行自动检测并安装依赖。</p>
      </div>

      <div class="hero-features">
        <div class="hero-feature">
          <div class="hero-feature-icon">🔌</div>
          <div class="hero-feature-text">
            <strong>插件生态</strong>
            <span>1.6 万+ 插件，涵盖工具、记忆、UI 等所有层面</span>
          </div>
        </div>
        <div class="hero-feature">
          <div class="hero-feature-icon">🧠</div>
          <div class="hero-feature-text">
            <strong>真正能做事</strong>
            <span>读代码、写文件、跑终端、调 API，模型自主完成</span>
          </div>
        </div>
        <div class="hero-feature">
          <div class="hero-feature-icon">🛡️</div>
          <div class="hero-feature-text">
            <strong>权限可控</strong>
            <span>插件需授权，敏感操作可限制，可审核工具调用</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const copied = ref(false)
const copyTip = computed(() => copied.value ? '已复制' : '复制安装命令')

async function copyInstall() {
  try {
    await navigator.clipboard.writeText('npx @deepseek-ai/dsh web')
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
  catch {
    // clipboard unavailable
  }
}
</script>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding: 2.5rem 1.5rem 2rem;
  margin-bottom: 0;
}

.hero-inner {
  max-width: 720px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-block;
  background: rgba(79, 209, 197, 0.15);
  color: #4fc9c5;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(79, 209, 197, 0.3);
  margin-bottom: 1rem;
  letter-spacing: 0.02em;
}

.hero-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
}

.hero-title-main {
  font-size: 2rem;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.hero-title-sub {
  font-size: 1rem;
  font-weight: 400;
  color: #94a3b8;
}

.hero-desc {
  font-size: 0.9375rem;
  color: #cbd5e1;
  line-height: 1.7;
  margin-bottom: 1.5rem;
}

.hero-install {
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.hero-install-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 0.75rem;
}

.hero-install-code {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
  margin-bottom: 0.5rem;
}

.hero-install-code code {
  flex: 1;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.875rem;
  color: #a5f3fc;
}

.hero-copy-btn {
  font-size: 0.75rem;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: color 0.15s;
  white-space: nowrap;
}

.hero-copy-btn:hover {
  color: #fff;
}

.hero-install-note {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
}

.hero-features {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hero-highlight {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.hero-highlight-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  line-height: 1.5;
}

.hero-highlight-text {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.hero-highlight-text strong {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fbbf24;
}

.hero-highlight-text span {
  font-size: 0.8125rem;
  color: #94a3b8;
  line-height: 1.6;
}

.hero-highlight-text a {
  color: #4fc9c5;
  text-decoration: none;
}

.hero-highlight-text a:hover {
  text-decoration: underline;
}

.hero-feature {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.hero-feature-icon {
  font-size: 1.25rem;
  line-height: 1.5;
  flex-shrink: 0;
}

.hero-feature-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.hero-feature-text strong {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e2e8f0;
}

.hero-feature-text span {
  font-size: 0.8125rem;
  color: #64748b;
}

/* dark mode adjustments */
@media (prefers-color-scheme: light) {
  .hero-section {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%);
    border-bottom-color: rgba(0,0,0,0.08);
  }
  .hero-title-main { color: #0c4a6e; }
  .hero-title-sub { color: #0369a1; }
  .hero-desc { color: #334155; }
  .hero-install { background: rgba(255,255,255,0.7); border-color: rgba(0,0,0,0.1); }
  .hero-install-code { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.1); }
  .hero-install-code code { color: #0369a1; }
  .hero-install-note { color: #94a1aa; }
  .hero-feature-text strong { color: #1e3a5f; }
  .hero-feature-text span { color: #64748b; }
}
</style>
