<script lang="ts" setup>
defineProps<{
  version: string
}>()

const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="footer-wrap border-t border-gray-200 dark:border-gray-700 mt-8">
    <div class="max-w-[1080px] mx-auto px-4 py-6">
      <div class="flex flex-col md:flex-row gap-6 md:gap-12 items-start md:items-center justify-between">
        <!-- Left: version info -->
        <div class="text-xs text-gray-400 space-y-1">
          <div>© {{ currentYear }} omdsh.com</div>
          <div>版本 v{{ version }}</div>
        </div>

        <!-- Right: contact info + QR -->
        <div class="flex items-center gap-4">
          <div class="text-xs text-gray-500 space-y-1 text-right">
            <div>联系我们</div>
            <div>扫码加入飞书群</div>
          </div>
          <img
            src="https://omdsh.com/imgs/feishu-group-qr.jpg"
            alt="飞书群二维码"
            class="w-20 h-20 rounded-md border border-gray-200 dark:border-gray-600 object-cover"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
