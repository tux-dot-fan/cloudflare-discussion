<script setup lang="ts">
import type { SysConfigDTO } from './types'

const global = useGlobalConfig()
const { data: configData } = useFetch<{ data: SysConfigDTO, version: string }>('/api/config', {
  method: 'GET',
  server: false,
})

watch(configData, (response) => {
  if (response?.data) {
    global.value = { sysConfig: response.data, version: response.version || '' }
  }
}, { immediate: true })

const sysConfig = computed(() => global.value.sysConfig ?? {} as SysConfigDTO)

useHead(computed(() => ({
  titleTemplate: `%s - ${sysConfig.value?.websiteName || 'Discussion'}`,
  meta: [
    { name: 'keywords', content: sysConfig.value?.websiteKeywords || '' },
    { name: 'description', content: sysConfig.value?.websiteDescription || '' },
  ],
  script: [
    { src: 'https://www.googletagmanager.com/gtag/js?id=G-1WYTSD07C1', async: true, tagPosition: 'head' },
    {
      innerHTML: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-1WYTSD07C1');
`,
      tagPosition: 'head',
      type: 'text/javascript',
    },
  ],
})))
</script>

<template>
  <NuxtLoadingIndicator />
  <NuxtLayout>
    <NuxtPage :transition="{ name: 'page' }" />
  </NuxtLayout>
  <UModals />
</template>

<style>
html,
body,
#__nuxt {
  width: 100%;
  height: 100%;
  @apply bg-slate-50 dark:bg-slate-800;
}

.page-enter-active {
  transition: opacity 0.12s ease;
}
.page-leave-active {
  transition: opacity 0.07s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
