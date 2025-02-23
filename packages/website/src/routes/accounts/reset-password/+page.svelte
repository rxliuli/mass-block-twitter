<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { createMutation } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { toast } from 'svelte-sonner'
  import type { ResetPasswordRequest } from '@mass-block-twitter/server'

  const formState = $state({
    email: '',
    code: '',
    password: '',
    confirmPassword: '',
  })
  let formRef = $state<HTMLFormElement>()

  const submitMutation = createMutation({
    mutationFn: async () => {
      if (formState.password !== formState.confirmPassword) {
        toast.error('Password and confirm password do not match')
        return
      }
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({
            email: formState.email,
            code: formState.code,
            password: formState.password,
          } satisfies ResetPasswordRequest),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      if (!resp.ok) {
        const error = await resp.json()
        console.error('Failed to reset password', error)
        throw new Error('Failed to reset password')
      }
      toast.success('Password reset successfully, redirecting to login page...')
    },
    onSuccess() {
      setTimeout(() => {
        goto('/accounts/login')
      }, 1000)
    },
    onError(error) {
      console.error('Failed to reset password', error)
      toast.error('Failed to reset password')
    },
  })

  const sendMailMutation = createMutation({
    mutationFn: async () => {
      if (!formState.email) {
        const emailInput = formRef?.querySelector<HTMLInputElement>('#email')
        if (!emailInput) {
          return
        }
        if (!emailInput.checkValidity()) {
          emailInput.reportValidity()
        }
        return
      }
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: formState.email }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
      if (!resp.ok) {
        const error = await resp.json()
        console.error('Failed to send mail', error)
        throw new Error('Failed to send mail')
      }
      toast.success('Mail sent')
      return resp.json()
    },
  })
</script>

<div class="flex h-screen w-screen items-center justify-center">
  <Card.Root class="mx-auto w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-2xl">Reset Password</Card.Title>
    </Card.Header>
    <Card.Content>
      <form
        class="grid gap-4"
        bind:this={formRef}
        onsubmit={() => $submitMutation.mutate()}
      >
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="m@example.com"
            required
            bind:value={formState.email}
          />
        </div>
        <div class="grid gap-2">
          <Label for="code">Enter the code sent to your email</Label>
          <div class="flex items-center gap-2">
            <Input id="code" name="code" required bind:value={formState.code} />
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
        <div>
          <Label for="password">New Password</Label>
          <Input
            id="password"
            type="password"
            name="password"
            required
            bind:value={formState.password}
          />
        </div>
        <div>
          <Label for="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            required
            bind:value={formState.confirmPassword}
          />
        </div>
        <Button
          type="submit"
          class="w-full"
          disabled={$submitMutation.isPending}
        >
          {$submitMutation.isPending ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </Card.Content>
  </Card.Root>
</div>
