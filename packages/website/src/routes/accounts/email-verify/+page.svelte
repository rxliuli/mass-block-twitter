<script lang="ts">
  import * as Card from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Button } from '@/components/ui/button'
  import { createMutation } from '@tanstack/svelte-query'
  import { page } from '$app/state'
  import { toast } from 'svelte-sonner'
  import { setAuthInfo, type AuthInfo } from '@/components/auth/auth.svelte'

  const email = page.url.searchParams.get('email')

  const sendMailMutation = createMutation({
    mutationFn: async () => {
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/auth/send-verify-email',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      if (!resp.ok) {
        throw new Error('Failed to send email')
      }
      toast.success('Email sent')
    },
    onError: () => {
      toast.error('Failed to send email')
    },
  })

  const mutation = createMutation({
    mutationFn: async (event: SubmitEvent) => {
      event.preventDefault()
      const formData = new FormData(event.target as HTMLFormElement)
      const code = formData.get('code')
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/auth/verify-email',
        {
          method: 'POST',
          body: JSON.stringify({ email, code }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      if (!resp.ok) {
        throw new Error('Failed to verify email')
      }
      const r = (await resp.json()) as {
        code: 'success'
        data: AuthInfo
      }
      await setAuthInfo(r.data)
      toast.success('Email verified, redirecting...')
      setTimeout(() => {
        location.href = page.url.searchParams.get('redirect') ?? '/'
      }, 1000)
    },
    onError: () => {
      toast.error('Failed to verify email')
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
          <Label for="email">{email}</Label>
        </div>
        <div class="grid gap-2">
          <Label for="code">Enter the code sent to your email</Label>
          <div class="flex items-center gap-2">
            <Input id="code" name="code" required />
            <Button
              variant="outline"
              type="button"
              onclick={() => $sendMailMutation.mutate()}
              disabled={$sendMailMutation.isPending}
            >
              {$sendMailMutation.isPending ? 'Sending...' : 'Send Mail'}
            </Button>
          </div>
        </div>
        <Button type="submit" class="w-full" disabled={$mutation.isPending}>
          {$mutation.isPending ? 'Verifying...' : 'Verify Email'}
        </Button>
      </form>
      <div class="mt-4 text-center text-sm">
        Already have an account? <a href="/accounts/login">Login</a>
      </div>
      <div class="mt-4 text-center text-sm">
        By signing in, you agree to our
        <a href="/docs/terms" class="underline">Terms of Service</a> and
        <a href="/docs/privacy" class="underline">Privacy Policy</a>
      </div>
    </Card.Content>
  </Card.Root>
</div>
