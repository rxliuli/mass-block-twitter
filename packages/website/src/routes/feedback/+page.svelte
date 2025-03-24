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
  import { onMount } from 'svelte'
  import { getAuthInfo } from '@/components/auth/auth.svelte'
  import { cn } from '@/utils'

  let selectedReason = $state<FeedbackRequest['reason']>('missing')
  let suggestion = $state('')

  const reasons = [
    { value: 'missing', label: 'Missing features' },
    { value: 'broken', label: 'Features not working properly' },
    { value: 'confused', label: "Don't know how to use" },
    { value: 'alternative', label: 'Found a better alternative' },
    { value: 'other', label: 'Other reasons' },
  ]

  const mutation = createMutation({
    mutationFn: async () => {
      if (!selectedReason) {
        return
      }
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/feedback/submit',
        {
          method: 'POST',
          body: JSON.stringify({
            reason: selectedReason,
            suggestion,
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

        <form onsubmit={() => $mutation.mutate()} class="space-y-6">
          <div class="space-y-4">
            <Label>Please select a reason for uninstalling</Label>
            <RadioGroup bind:value={selectedReason} class="grid gap-4">
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
              bind:value={suggestion}
              placeholder="Please share your thoughts..."
              rows={4}
            />
          </div>

          <Button
            type="submit"
            class="w-full"
            disabled={!selectedReason || $mutation.isPending}
          >
            {$mutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      {/if}
    </CardContent>
  </Card>
</div>
