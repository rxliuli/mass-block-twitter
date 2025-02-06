<script lang="ts">
  import { Button, type ButtonProps } from '$lib/components/ui/button'
  import { initializePaddle } from '@paddle/paddle-js'
  import { mode } from 'mode-watcher'
  import { get } from 'svelte/store'

  const props: ButtonProps = $props()

  async function handleUpgrade() {
    // Paddle payment integration
    const paddle = await initializePaddle({
      environment: import.meta.env.VITE_PADDLE_ENVIRONMENT,
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
      eventCallback(event) {
        console.log('event', event)
        if (event.type === 'checkout.completed') {
          console.log('checkout.completed')
        }
      },
      checkout: {
        settings: {
          theme: get(mode),
          locale: 'en',
        },
      },
    })
    if (!paddle) {
      throw new Error('Failed to initialize Paddle')
    }
    console.log('Upgrade')
    paddle.Checkout.open({
      items: [
        {
          priceId: import.meta.env.VITE_PADDLE_PRICE_ID,
          quantity: 1,
        },
      ],
    })
  }
</script>

<Button {...props} onclick={handleUpgrade}>Upgrade to Pro</Button>
