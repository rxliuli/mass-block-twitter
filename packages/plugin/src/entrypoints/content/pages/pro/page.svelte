<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { CheckIcon, XIcon } from 'lucide-svelte'

  const features = [
    {
      name: '🔍 Scan and batch blocking of suspicious accounts',
      free: true,
      pro: true,
    },
    {
      name: '📋 Import/export block lists for sharing',
      free: true,
      pro: true,
    },
    {
      name: '👥 Shared blocklist based on community reports',
      free: true,
      pro: true,
    },
    {
      name: '⚡ One-click instant blocking',
      free: true,
      pro: true,
    },
    {
      name: '🔒 Auto-hide heavily reported accounts',
      free: true,
      pro: true,
    },
    {
      name: '🎯 Enhanced keyword filtering',
      free: true,
      pro: true,
    },
    {
      name: '🛡️ Auto-hide suspicious accounts',
      free: true,
      pro: true,
    },
    {
      name: '🔐 100% open source',
      free: true,
      pro: true,
    },
    {
      name: '🔑 Unlimited muted keywords',
      free: false,
      pro: true,
      description: 'Free version limited to 100 keywords',
    },
    {
      name: '🔍 AI-powered spam tweet detection',
      free: false,
      pro: true,
    },
    {
      name: '🔄 Automatic settings sync',
      free: false,
      pro: true,
    },
    {
      name: '✨ Early access to new features',
      free: false,
      pro: true,
    },
  ]
</script>

<div class="container mx-auto px-4 py-8">
  <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
    <!-- Free Plan -->
    <div class="rounded-lg border p-6 shadow-sm">
      <h2 class="text-2xl font-bold">Free</h2>
      <p class="mt-2 text-gray-500">Get started with basic features</p>
      <div class="mt-6">
        <Button variant="outline" class="w-full">Current Plan</Button>
      </div>
      <div class="mt-6 space-y-4">
        {#each features as feature}
          <div class="flex items-center gap-2">
            {#if feature.free}
              <CheckIcon class="h-5 w-5 text-green-500" />
            {:else}
              <XIcon class="h-5 w-5 text-gray-300" />
            {/if}
            <span class={!feature.free ? 'text-gray-400' : ''}>
              {feature.name}
              {#if feature.description && !feature.free}
                <span class="text-sm text-gray-400"
                  >({feature.description})</span
                >
              {/if}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Pro Plan -->
    <div class="rounded-lg border border-primary bg-primary/5 p-6 shadow-sm">
      <h2 class="text-2xl font-bold">Pro</h2>
      <p class="mt-2 text-gray-500">Unlock all premium features</p>
      <div class="mt-6">
        <Button variant="default" class="w-full">Upgrade to Pro</Button>
      </div>
      <div class="mt-6 space-y-4">
        {#each features as feature}
          <div class="flex items-center gap-2">
            {#if feature.pro}
              <CheckIcon class="h-5 w-5 text-green-500" />
            {:else}
              <XIcon class="h-5 w-5 text-gray-300" />
            {/if}
            <span>{feature.name}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
