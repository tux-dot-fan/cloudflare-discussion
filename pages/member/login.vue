<script lang="ts" setup>
import { toast } from 'vue-sonner'
import type { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { type SysConfigDTO, loginRequestSchema } from '~/types'

useHead({
  title: `登录`,
})

type Schema = z.output<typeof loginRequestSchema>

const state = reactive<Schema>({
  password: '',
  username: '',
})
const pending = ref(false)
const route = useRoute()
const global = useGlobalConfig()
const sysconfig = global.value?.sysConfig as SysConfigDTO
const turnstileRef = ref<{ execute: () => Promise<string> } | null>(null)

const showGoogleLogin = computed(() => !!(sysconfig as any)?.googleClientId)

function googleLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  const returnParam = redirect !== '/' ? `?return=${encodeURIComponent(redirect)}` : ''
  location.href = `/api/auth/google${returnParam}`
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  pending.value = true
  try {
    const token = sysconfig.turnstile?.enable ? await turnstileRef.value?.execute() || '' : ''
    await login(event.data, token)
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : '人机验证失败')
  }
  finally {
    pending.value = false
  }
}

async function login(data: Schema, token: string = '') {
  const result = await $fetch<{
    success: boolean
    tokenKey?: string
    message?: string
  }>('/api/member/login', {
    method: 'POST',
    body: { ...data, token },
  })
  if (result.success && result.tokenKey) {
    toast.success(`登录成功,自动跳转中...`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    location.href = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
  }
  else if (result.message) {
    toast.error(`登录失败,${result.message}`)
  }
}
</script>

<template>
  <UCard class="w-full mt-2">
    <template #header>
      <div class="text-center text-sm">
        登录
      </div>
    </template>
    <div class="flex flex-col my-2 lg:w-[300px] mx-auto">
      <!-- Google 登录按钮 -->
      <UButton
        v-if="showGoogleLogin"
        class="mb-4"
        block
        @click="googleLogin"
      >
        <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        使用 Google 登录
      </UButton>

      <div v-if="showGoogleLogin" class="flex items-center gap-2 mb-4">
        <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span class="text-xs text-gray-400">或</span>
        <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <UForm
        :schema="loginRequestSchema" :state="state" :validate-on="['submit']" class="space-y-4" autocomplete="off"
        @submit="onSubmit"
      >
        <UFormGroup label="用户名" name="username">
          <UInput v-model="state.username" autocomplete="off" />
        </UFormGroup>
        <UFormGroup label="密码" name="password">
          <UInput v-model="state.password" type="password" autocomplete="off" />
        </UFormGroup>
        <XTurnstile
          v-if="sysconfig.turnstile?.enable"
          ref="turnstileRef"
          :site-key="sysconfig.turnstile.siteKey"
          action="login"
        />
        <div class="flex gap-2 items-center">
          <UButton type="submit" :loading="pending" :disabled="pending">
            登录
          </UButton>
          <UButton color="gray" variant="solid" class="button" @click="navigateTo('/member/forgotPassword')">
            忘记密码了
          </UButton>

          <NuxtLink to="/member/reg" class="text-primary text-sm ml-2 underline underline-offset-4">
            没有账户?去注册
          </NuxtLink>
        </div>
      </UForm>
    </div>
  </UCard>
</template>

<style scoped></style>
