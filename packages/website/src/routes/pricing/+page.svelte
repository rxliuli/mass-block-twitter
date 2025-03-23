<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Check } from 'lucide-svelte'
  import UpgradeToPro from '@/components/billing/UpgradeToPro.svelte'

  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for getting started',
      features: [
        'Scan and batch blocking',
        'Create and Subscribe to Moderation List',
        'One-click instant blocking',
        'Enhanced keyword filtering',
        'Shared blocklist based on community reports',
        'Auto-hide heavily reported accounts',
        'Auto-hide suspicious accounts',
        '100% open source',
      ],
    },
    {
      name: 'Pro',
      price: '$9.99',
      period: 'one-time payment',
      description: 'Everything you need for advanced spam control',
      features: [
        'All Free features',
        'Unlimited batch blocking (no 150 account limit)',
        'Unlimited Moderation Lists',
        'Unlimited muted keywords',
        '(Dev) Settings sync across devices',
        'Priority access to new features',
        'Premium support',
      ],
      highlighted: true,
    },
  ]
</script>

<div class="py-12">
  <!-- Header -->
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
    <p class="text-lg text-muted-foreground">
      Choose the plan that's right for you
    </p>
  </div>

  <!-- Pricing Cards -->
  <div class="container max-w-5xl mx-auto px-4">
    <div class="grid md:grid-cols-2 gap-8">
      {#each plans as plan}
        <div
          class={`
          rounded-lg border p-8 flex flex-col justify-between
          ${plan.highlighted ? 'border-primary shadow-lg' : 'border-border'}
        `}
        >
          <div class="mb-6">
            <h3 class="text-2xl font-bold">{plan.name}</h3>
            <div class="mt-2">
              <span class="text-3xl font-bold">{plan.price}</span>
              {#if plan.period}
                <span class="text-muted-foreground ml-1">{plan.period}</span>
              {/if}
            </div>
            <p class="text-muted-foreground mt-2">{plan.description}</p>
          </div>

          <ul class="space-y-3 mb-6">
            {#each plan.features as feature}
              <li class="flex items-center">
                <Check class="h-4 w-4 text-primary mr-2" />
                <span>{feature}</span>
              </li>
            {/each}
          </ul>

          {#if plan.highlighted}
            <UpgradeToPro class="w-full mt-auto" />
          {:else}
            <a href="/">
              <Button variant="outline" class="w-full mt-auto">
                Get Started
              </Button>
            </a>
          {/if}
        </div>
      {/each}
    </div>

    <!-- FAQ Section -->
    <div class="mt-20">
      <h2 class="text-2xl font-bold text-center mb-8">
        Frequently Asked Questions
      </h2>
      <div class="space-y-6 max-w-3xl mx-auto">
        <div>
          <h3 class="font-semibold mb-2">Is this a subscription?</h3>
          <p class="text-muted-foreground">
            No, Pro is a one-time payment that gives you lifetime access to all
            Pro features.
          </p>
        </div>
        <div>
          <h3 class="font-semibold mb-2">Can I use it on multiple browsers?</h3>
          <p class="text-muted-foreground">
            Yes, your Pro license works across all supported browsers and
            devices.
          </p>
        </div>
        <div>
          <h3 class="font-semibold mb-2">
            What payment methods do you accept?
          </h3>
          <p class="text-muted-foreground">
            We accept credit cards, PayPal, and other major payment methods
            through our secure payment processor.
          </p>
        </div>
        <div>
          <h3 class="font-semibold mb-2">What's your refund policy?</h3>
          <p class="text-muted-foreground">
            We offer a 30-day money-back guarantee. If you're not satisfied,
            just let us know and we'll process your refund.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
