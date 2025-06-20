<script lang="ts">
  import * as Card from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Button } from '@/components/ui/button'
  import { createMutation } from '@tanstack/svelte-query'
  import { page } from '$app/state'
  import { toast } from 'svelte-sonner'
  import {
    onPluginLoggedIn,
    setAuthInfo,
    type AuthInfo,
  } from '@/components/auth/auth.svelte'
  import type {
    SendVerifyEmailRequest,
    VerifyEmailRequest,
  } from '@mass-block-twitter/server'

  const sendMailMutation = createMutation({
    mutationFn: async () => {
      const email = page.url.searchParams.get('email')
      if (!email) {
        throw new Error('Email is required')
      }
      const resp = await fetch(
         '/api/auth/send-verify-email',
        {
          method: 'POST',
          body: JSON.stringify({ email } satisfies SendVerifyEmailRequest),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      if (!resp.ok) {
        throw new Error('Failed to send email')
      }
    },
    onSuccess: () => {
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
      const code = formData.get('code') as string
      const email = page.url.searchParams.get('email')
      if (!email) {
        throw new Error('Email is required')
      }
      const resp = await fetch(
         '/api/auth/verify-email',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            code,
          } satisfies VerifyEmailRequest),
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
      if (page.url.searchParams.get('from') === 'plugin') {
        onPluginLoggedIn({ ...r.data })
        return
      }
      toast.success('Email verified, redirecting...')
      setTimeout(() => {
        location.href = page.url.searchParams.get('redirect') ?? '/'
      }, 1000)
    },
    onError: () => {
      toast.error('Failed to verify email')
    },
  })

  let email = $state('')
  $effect(() => {
    email = page.url.searchParams.get('email') ?? ''
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
