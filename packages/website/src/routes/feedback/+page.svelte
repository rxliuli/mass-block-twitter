<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card'
  import { Label } from '$lib/components/ui/label'
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group'
  import { Textarea } from '$lib/components/ui/textarea'
  import type { FeedbackRequest } from '@mass-block-twitter/server'
  import { createMutation } from '@tanstack/svelte-query'
  import { toast } from 'svelte-sonner'
  import { getContext } from './utils/getContext'
  import { getAuthInfo, useAuthInfo } from '@/components/auth/auth.svelte'
  import { cn } from '@/utils'
  import { Input } from '@/components/ui/input'
  import { onMount } from 'svelte'

  let formState = $state<{
    reason: FeedbackRequest['reason']
    suggestion: string
    email: string
  }>({
    reason: 'missing',
    suggestion: '',
    email: '',
  })
  onMount(async () => {
    const authInfo = await getAuthInfo()
    formState.email = authInfo?.email ?? ''
  })
  const reasons = [
    { value: 'missing', label: 'Missing features' },
    { value: 'broken', label: 'Features not working properly' },
    { value: 'confused', label: "Don't know how to use" },
    { value: 'alternative', label: 'Found a better alternative' },
    { value: 'other', label: 'Other reasons' },
  ]

  const mutation = createMutation({
    mutationFn: async () => {
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/feedback/submit',
        {
          method: 'POST',
          body: JSON.stringify({
            reason: formState.reason,
            suggestion: formState.suggestion,
            email: formState.email,
            context: getContext(),
          } satisfies FeedbackRequest),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await getAuthInfo())?.token}`,
          },
        },
      )
      if (!resp.ok) {
        // throw new Error('Failed to submit feedback')
        console.error(await resp.json())
      }
    },
    onSuccess: () => {
      sessionStorage.setItem('feedback-submitted', 'true')
      toast.success('Thank you for your feedback!')
    },
    // onError: () => {
    //   toast.error('Submission failed, please try again later')
    // },
  })

  const isSubmitted = $derived(
    (typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('feedback-submitted')) ||
      $mutation.isSuccess,
  )
</script>

<div class="container mx-auto max-w-2xl p-4">
  <Card class={cn(import.meta.env.SSR && 'hidden')}>
    <CardHeader>
      <CardTitle class="text-center">
        {#if isSubmitted}
          Thank You for Your Feedback!
        {:else}
          Thank You for Using Our Extension
        {/if}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {#if isSubmitted}
        <div class="text-center space-y-4">
          <p class="text-muted-foreground">
            Your feedback is valuable to us and will help us improve our
            product.
          </p>
        </div>
      {:else}
        <p class="text-center text-muted-foreground mb-6">
          We're sorry to see you uninstall our extension. To help us improve,
          please let us know why you're uninstalling.
        </p>

        <form
          onsubmit={(ev) => {
            ev.preventDefault()
            $mutation.mutate()
          }}
          class="space-y-6"
        >
          <div class="space-y-4">
            <Label>Please select a reason for uninstalling</Label>
            <RadioGroup bind:value={formState.reason} class="grid gap-4">
              {#each reasons as reason}
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label for={reason.value}>{reason.label}</Label>
                </div>
              {/each}
            </RadioGroup>
          </div>

          <div class="space-y-2">
            <Label for="suggestion">Do you have any suggestions?</Label>
            <Textarea
              id="suggestion"
              name="suggestion"
              bind:value={formState.suggestion}
              placeholder="Please share your thoughts..."
              rows={4}
            />
          </div>

          <div class="space-y-2">
            <Label for="email">Please enter your email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              bind:value={formState.email}
              placeholder="Your email"
              required
            />
            <p class="text-sm text-muted-foreground">
              We need your email to follow up with you if we have any questions
              about your feedback.
            </p>
          </div>

          <Button type="submit" class="w-full" disabled={$mutation.isPending}>
            {$mutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      {/if}
    </CardContent>
  </Card>
</div>
