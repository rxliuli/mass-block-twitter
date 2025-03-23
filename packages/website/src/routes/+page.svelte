<script lang="ts">
  import UpgradeToPro from '@/components/billing/UpgradeToPro.svelte'

  const features = [
    {
      icon: '🔍',
      title: 'Scan & Block',
      desc: 'Batch blocking of suspicious accounts',
    },
    {
      icon: '📋',
      title: 'Moderation Lists',
      desc: 'Create and subscribe to moderation lists',
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
      desc: 'No 400-keyword limit like free version',
    },
    {
      title: 'Unlimited Moderation Lists',
      desc: 'Create and subscribe to unlimited moderation lists',
    },
    {
      title: 'Unlimited Batch Block',
      desc: 'Block unlimited accounts at once (free version limited to 150)',
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
    <div class="max-w-5xl mx-auto">
      <img
        src="/screenshot.jpg"
        alt="Mass Block Twitter interface showing the batch blocking feature and moderation list management"
        class="w-full rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700"
        width="1280"
        height="720"
        loading="eager"
        decoding="async"
      />
    </div>
  </section>

  <!-- Features Section -->
  <section class="bg-gray-50 dark:bg-gray-900 py-20">
    <div class="container mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-4">Features</h2>
      <p class="text-xl text-gray-600 dark:text-gray-400 text-center mb-12">
        Powerful tools to keep your Twitter feed clean and safe
      </p>

      <!-- Core Features -->
      <div class="grid md:grid-cols-3 gap-8 mb-20">
        {#each features as feature}
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div class="text-4xl mb-4">{feature.icon}</div>
            <h3 class="text-xl font-semibold mb-2">{feature.title}</h3>
            <p class="text-gray-600 dark:text-gray-400">{feature.desc}</p>
          </div>
        {/each}
      </div>

      <!-- Pro Features -->
      <div class="max-w-4xl mx-auto">
        <h3 class="text-2xl font-bold text-center mb-8">Pro Features</h3>
        <div class="grid md:grid-cols-2 gap-8 mb-12">
          {#each proFeatures as feature}
            <div
              class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-2 border-blue-500"
            >
              <h3 class="text-xl font-semibold mb-2">{feature.title}</h3>
              <p class="text-gray-600 dark:text-gray-400">{feature.desc}</p>
            </div>
          {/each}
        </div>
        <div class="text-center">
          <UpgradeToPro size="lg" />
        </div>
      </div>
    </div>
  </section>

  <!-- Demo Video Section -->
  <section class="py-20">
    <div class="container mx-auto px-4">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-3xl font-bold mb-4">Watch How It Works</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          See how Mass Block Twitter helps you clean up your Twitter feed by
          blocking spam accounts, suspicious profiles, and unwanted content in
          just a few clicks.
        </p>
        <iframe
          class="rounded-lg shadow-xl w-full aspect-video"
          src="https://www.youtube.com/embed/cOzua5ffLGw?si=O61zH7PRUrsacRt_"
          title="Mass Block Twitter - Product Demo Video"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          loading="lazy"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  </section>
</main>
