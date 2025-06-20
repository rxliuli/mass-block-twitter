<script lang="ts">
  import { Button, type ButtonProps } from '$lib/components/ui/button'
  import { initializePaddle } from '@paddle/paddle-js'
  import { mode } from 'mode-watcher'
  import { get } from 'svelte/store'
  import { getAuthInfo, setAuthInfo, useAuthInfo } from '../auth/auth.svelte'
  import { goto } from '$app/navigation'
  import { toast } from 'svelte-sonner'
  import type { CheckoutCompleteRequest } from '@mass-block-twitter/server'

  const props: ButtonProps = $props()

  const authInfo = useAuthInfo()

  async function handleUpgrade() {
    if (!authInfo) {
      const confirmed = confirm('Please login to upgrade to Pro')
      if (!confirmed) {
        return
      }
      goto('/accounts/login?redirect=' + location.pathname)
      return
    }
    if (authInfo.isPro) {
      toast.info('You are already a Pro user')
      return
    }
    const resp = await fetch(
       '/api/accounts/settings',
      {
        headers: {
          Authorization: `Bearer ${authInfo.token}`,
        },
      },
    )
    if (!resp.ok) {
      const confirmed = confirm('Please login to upgrade to Pro')
      if (!confirmed) {
        return
      }
      goto('/accounts/login?redirect=' + location.pathname)
      return
    }
    // Paddle payment integration
    const paddle = await initializePaddle({
      environment: import.meta.env.VITE_PADDLE_ENVIRONMENT,
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
      async eventCallback(event) {
        console.log('event', event)

        if (event.name === 'checkout.completed' && event.data) {
          paddle?.Checkout.close()
          const resp = await fetch(
             '/api/billing/checkout/complete',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${(await getAuthInfo())?.token}`,
              },
              body: JSON.stringify({
                transactionId: event.data.transaction_id,
                countryCode: event.data.customer.address!.country_code,
              } satisfies CheckoutCompleteRequest),
            },
          )
          if (!resp.ok) {
            console.error('Failed to complete checkout', resp.statusText)
            toast.error('Failed to complete checkout')
            return
          }
          const authInfo = await getAuthInfo()
          if (!authInfo) {
            toast.error('Failed to complete checkout')
            return
          }
          await setAuthInfo({
            ...authInfo,
            isPro: true,
          })
          document.dispatchEvent(
            new CustomEvent('LoginSuccess', {
              detail: {
                ...authInfo,
                isPro: true,
              },
            }),
          )
          toast.success('Upgraded to Pro')
          goto('/')
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

<Button
  {...props}
  onclick={handleUpgrade}
  disabled={authInfo.isPro}
  data-testid="upgrade-button"
>
  {authInfo.isPro ? 'You are already a Pro user' : 'Upgrade to Pro'}
</Button>
