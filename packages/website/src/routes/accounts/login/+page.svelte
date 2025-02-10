<script lang="ts">
  import { page } from '$app/state'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { setAuthInfo, type AuthInfo } from '@/components/auth/auth.svelte'
  import { createMutation } from '@tanstack/svelte-query'
  import { toast } from 'svelte-sonner'

  const mutation = createMutation({
    mutationFn: async (event: SubmitEvent) => {
      event.preventDefault()
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
      if (resp.ok) {
        toast.success('Login successful, redirecting...')
        const data = (await resp.json()) as AuthInfo
        await setAuthInfo(data)
        setTimeout(() => {
          location.href = page.url.searchParams.get('redirect') ?? '/'
        }, 3000)
      } else {
        toast.error('Login failed, please check your email and password')
      }
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
              href="/accounts/reset-password"
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
