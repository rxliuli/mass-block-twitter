<script lang="ts">
  import Header from '@/components/layout/Header.svelte'
  import '../app.css'
  import { ModeWatcher } from 'mode-watcher'
  import Footer from '@/components/layout/Footer.svelte'

  let { children } = $props()
</script>

<ModeWatcher />

<Header />

{@render children()}

<Footer />
