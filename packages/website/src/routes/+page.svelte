<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import UpgradeToPro from '@/components/billing/UpgradeToPro.svelte'
  import Footer from '@/components/layout/Footer.svelte'
  import Header from '@/components/layout/Header.svelte'

  const features = [
    {
      icon: '🔍',
      title: 'Smart Scan',
      desc: 'Batch blocking of suspicious accounts',
    },
    {
      icon: '📋',
      title: 'Moderation Lists',
      desc: '',
    },
    {
      icon: '👥',
      title: 'Community Driven',
      desc: 'Shared blocklist based on reports',
    },
    {
      icon: '⚡',
      title: 'Instant Blocking',
      desc: 'One-click solution to clean up spam',
    },
    {
      icon: '🎯',
      title: 'Advanced Filtering',
      desc: 'Enhanced keyword & profile filtering',
    },
    {
      icon: '🔒',
      title: 'Privacy First',
      desc: '100% open source',
    },
  ]

  const proFeatures = [
    {
      title: 'Unlimited Keywords',
      desc: 'No 100-keyword limit like free version',
    },
    {
      title: '(Dev) AI-Powered Detection',
      desc: 'Smart spam tweet identification',
    },
    {
      title: '(Dev) Settings Sync',
      desc: 'Sync your settings across devices',
    },
    { title: 'Early Access', desc: 'Try new features before others' },
  ]
</script>

<main class="min-h-screen">
  <!-- Hero Section -->
  <section class="container mx-auto px-4 py-20 text-center">
    <h1 class="text-5xl font-bold mb-6">Mass Block Twitter</h1>
    <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
      One-Click Solution to Clean Up Twitter/X Spam
    </p>
    <div class="flex justify-center gap-4 mb-12">
      <a
        href="https://chromewebstore.google.com/detail/mass-block-twitter/eaghpebepefbcadjdppjjopoagckdhej"
        target="_blank"
      >
        <img src="/chrome.png" alt="Chrome Web Store" class="h-12" />
      </a>
      <a
        href="https://addons.mozilla.org/firefox/addon/mass-block-twitter/"
        target="_blank"
      >
        <img src="/firefox.png" alt="Firefox Add-ons" class="h-12" />
      </a>
      <a
        href="https://microsoftedge.microsoft.com/addons/detail/jfmhejlgepjmbgeceljmdeimmdolfadf"
        target="_blank"
      >
        <img src="/edge.png" alt="Edge Add-ons" class="h-12" />
      </a>
    </div>
    <img
      src="/screenshot.jpg"
      alt="Product Screenshot"
      class="rounded-lg shadow-xl mx-auto w-full max-w-3xl"
    />
  </section>

  <!-- Features Section -->
  <section class="bg-gray-50 dark:bg-gray-900 py-20">
    <div class="container mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-12">Key Features</h2>
      <div class="grid md:grid-cols-3 gap-8">
        {#each features as feature}
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div class="text-4xl mb-4">{feature.icon}</div>
            <h3 class="text-xl font-semibold mb-2">{feature.title}</h3>
            <p class="text-gray-600 dark:text-gray-400">{feature.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Pro Features Section -->
  <!-- TODO wait for paddle review -->
  <!-- <section class="py-20">
    <div class="container mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-12">Pro Features</h2>
      <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {#each proFeatures as feature}
          <div class="border p-6 rounded-lg">
            <h3 class="text-xl font-semibold mb-2">{feature.title}</h3>
            <p class="text-gray-600 dark:text-gray-400">{feature.desc}</p>
          </div>
        {/each}
      </div>
      <div class="text-center mt-12">
        <UpgradeToPro size="lg" />
      </div>
    </div>
  </section> -->
</main>
