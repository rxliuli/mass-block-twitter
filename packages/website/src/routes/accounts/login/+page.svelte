<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import {
    clearAuthInfo,
    getAuthInfo,
    onPluginLoggedIn,
    setAuthInfo,
  } from '@/components/auth/auth.svelte'
  import { createMutation } from '@tanstack/svelte-query'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'
  import type { LoginResponse } from '@mass-block-twitter/server'

  // onMount(async () => {
  //   if (page.url.searchParams.get('from') !== 'plugin') {
  //     return
  //   }
  //   const authInfo = await getAuthInfo()
  //   if (!authInfo) {
  //     return
  //   }
  //   const resp = await fetch(
  //     import.meta.env.VITE_API_URL + '/api/accounts/settings',
  //     { headers: { Authorization: `Bearer ${authInfo.token}` } },
  //   )
  //   if (!resp.ok) {
  //     clearAuthInfo()
  //     // location.reload()
  //     return
  //   }
  //   toast.success('Already logged in, redirecting...')
  //   onPluginLoggedIn({ ...authInfo })
  // })

  const mutation = createMutation({
    mutationFn: async (event: SubmitEvent) => {
      event.preventDefault()
      const isPlugin = page.url.searchParams.get('from') === 'plugin'
      const formData = new FormData(event.target as HTMLFormElement)
      const email = formData.get('email')
      const password = formData.get('password')
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      if (!resp.ok) {
        toast.error('Login failed, please check your email and password')
        return
      }
      const data = (await resp.json()) as LoginResponse
      if (data.code === 'verify-email') {
        const params = new URLSearchParams([
          ...page.url.searchParams,
          ['email', email as string],
        ])
        goto('/accounts/email-verify?' + params.toString())
        return
      }
      await setAuthInfo(data.data)
      toast.success('Login successful, redirecting...')
      if (isPlugin) {
        console.log('onPluginLoggedIn')
        onPluginLoggedIn(data.data)
        return
      }
      console.log('onWebLoggedIn')
      setTimeout(() => {
        location.href = page.url.searchParams.get('redirect') ?? '/'
      }, 1000)
    },
  })
</script>

<div class="flex h-screen w-screen items-center justify-center">
  <Card.Root class="mx-auto w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-2xl">Login</Card.Title>
      <Card.Description>
        Enter your email below to login to your account
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <form class="grid gap-4" onsubmit={(ev) => $mutation.mutate(ev)}>
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </div>
        <div class="grid gap-2">
          <div class="flex items-center">
            <Label for="password">Password</Label>
            <a
              href={'/accounts/reset-password'}
              class="ml-auto inline-block text-sm underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button type="submit" class="w-full" disabled={$mutation.isPending}>
          {$mutation.isPending ? 'Logging in...' : 'Login'}
        </Button>
      </form>
      <div class="mt-4 text-center text-sm">
        First time login will automatically register an account
      </div>
      <div class="mt-4 text-center text-sm">
        By signing in, you agree to our
        <a href="/docs/terms" class="underline">Terms of Service</a> and
        <a href="/docs/privacy" class="underline">Privacy Policy</a>
      </div>
    </Card.Content>
  </Card.Root>
</div>
