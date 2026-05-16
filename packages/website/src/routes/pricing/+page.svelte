<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Check } from 'lucide-svelte'

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
      price: '$19.99',
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

  <!-- Migration Notice -->
  <div class="container max-w-3xl mx-auto px-4 mb-12">
    <div
      class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg p-6"
    >
      <h2 class="text-xl font-bold mb-2">Pro is no longer sold here</h2>
      <p class="text-muted-foreground mb-3">
        The features in MBT Pro have been rebuilt and split across two
        cross-platform (incl. iOS Safari) extensions:
      </p>
      <ul
        class="text-muted-foreground space-y-2 mb-3 list-disc list-inside text-sm"
      >
        <li>
          <a
            href="https://store.rxliuli.com/extensions/twitter-blocker"
            class="underline font-semibold">Twitter Blocker</a
          > ($19.99) — unlimited batch blocking that runs in true background for
          days or weeks (no foreground tab, breaks past MBT's 500/day limit), plus
          a one-click block button in many surfaces with no multi-step popups.
        </li>
        <li>
          <a
            href="https://store.rxliuli.com/extensions/twitter-filter"
            class="underline font-semibold">Twitter Filter</a
          > (free) — Moderation Lists and unlimited keyword filtering (rebuilt as
          expression-based rules), with mark / hide / dynamic-block actions on your
          timeline. All previously-public moderation lists have been migrated as
          published community rules.
        </li>
      </ul>
      <p class="text-sm text-muted-foreground">
        The plans below show what Pro previously included. Already a Pro user?
        <a href="https://store.rxliuli.com/support" class="underline"
          >Contact support</a
        > with your receipt for a 100% upgrade coupon on Twitter Blocker.
      </p>
    </div>
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
            <a
              href="https://store.rxliuli.com/extensions/twitter-blocker"
              class="mt-auto"
            >
              <Button class="w-full">Get Twitter Blocker — $19.99</Button>
            </a>
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
          <h3 class="font-semibold mb-2">
            I'm already a Pro user. Can I get Twitter Blocker for free?
          </h3>
          <p class="text-muted-foreground">
            Yes.
            <a href="https://store.rxliuli.com/support" class="underline"
              >Contact support</a
            > with your original purchase receipt and you'll receive a one-time 100%
            discount code for Twitter Blocker.
          </p>
        </div>
        <div>
          <h3 class="font-semibold mb-2">
            Will my existing Pro license keep working?
          </h3>
          <p class="text-muted-foreground">
            Yes. MBT continues to function and your Pro license remains valid
            for the existing extension. MBT will no longer receive major
            updates, so for new features and iOS Safari support we recommend
            migrating to Twitter Blocker and Twitter Filter.
          </p>
        </div>
        <div>
          <h3 class="font-semibold mb-2">
            Which old Pro feature went to which extension?
          </h3>
          <p class="text-muted-foreground mb-2">
            <strong>Twitter Blocker</strong> inherits unlimited batch blocking
            (now in true background — can run for days or weeks without keeping
            a tab open, breaking past MBT's 500/day limit) and the one-click
            quick-block button (click the button in the UI to block immediately,
            no multi-step popups). CSV import is included.
          </p>
          <p class="text-muted-foreground">
            <strong>Twitter Filter</strong> inherits Moderation Lists (full
            migration — all previously-public moderation lists are now available
            as published community rules) and unlimited keyword filtering
            (rebuilt as expression-based rules with no count limit), plus mark /
            hide / dynamic-block actions. See the
            <a
              href="https://store.rxliuli.com/blog/mass-block-twitter-vs-twitter-blocker-filter"
              class="underline">full comparison</a
            >.
          </p>
        </div>
        <div>
          <h3 class="font-semibold mb-2">Can I use it on multiple browsers?</h3>
          <p class="text-muted-foreground">
            Yes. Twitter Blocker and Twitter Filter both work on Chrome, Edge,
            Firefox, and Safari — including iOS Safari, which MBT does not
            support.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
