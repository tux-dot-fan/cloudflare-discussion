<script lang="ts" setup>
import { toast } from 'vue-sonner'

useHead({ title: '关联 GitHub 账号' })

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const username = typeof route.query.username === 'string' ? route.query.username : ''
const email = typeof route.query.email === 'string' ? route.query.email : ''
const returnTo = typeof route.query.return === 'string' ? route.query.return : '/'

const pending = ref(false)

async function onSubmit() {
  const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]')
  const password = passwordInput?.value || ''

  if (!password) {
    toast.error('请输入密码')
    return
  }

  pending.value = true
  try {
    // The API returns 302 with Location header on success - fetch follows redirects
    await $fetch('/api/auth/github/link/confirm', {
      method: 'POST',
      body: { token, password },
      credentials: 'include',
    })
    // If we get here without error, redirect to returnTo
    location.href = returnTo || '/'
  }
  catch (error: any) {
    const msg = error?.data?.message || error?.message || '关联失败'
    toast.error(msg)
    pending.value = false
  }
}
</script>

<template>
  <UCard class="w-full mt-2 max-w-[400px] mx-auto">
    <template #header>
      <div class="text-center text-sm">
        关联 GitHub 账号
      </div>
    </template>

    <div class="flex flex-col items-center gap-4 py-4">
      <!-- GitHub Icon -->
      <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg class="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </div>

      <!-- Show which account is being linked -->
      <div v-if="username || email" class="text-center">
        <div class="font-medium text-sm">
          正在将 GitHub 账号绑定到
        </div>
        <div class="font-medium text-primary mt-1">
          {{ username }} ({{ email }})
        </div>
      </div>

      <div class="text-center text-sm text-gray-500 dark:text-gray-400">
        此邮箱已注册，请输入密码确认身份并关联 GitHub 账号
      </div>

      <form class="w-full space-y-4" @submit.prevent="onSubmit">
        <UFormGroup label="密码" name="password">
          <UInput
            name="password"
            type="password"
            placeholder="请输入上方账户的密码"
            autocomplete="current-password"
            autofocus
          />
        </UFormGroup>

        <UButton type="submit" :loading="pending" :disabled="pending" block>
          确认关联
        </UButton>

        <div class="text-center">
          <NuxtLink to="/member/login" class="text-primary text-sm underline underline-offset-4">
            返回登录
          </NuxtLink>
        </div>
      </form>
    </div>
  </UCard>
</template>
