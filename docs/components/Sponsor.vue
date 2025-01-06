<script setup lang="ts">
import { initializePaddle, Paddle } from '@paddle/paddle-js'
import { ref, onMounted } from 'vue'

let paddle = ref<Paddle | undefined>()

async function initPaddle() {
  paddle.value = await initializePaddle({
    environment: import.meta.env.VITE_PADDLE_ENVIRONMENT,
    token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
  })
  if (!paddle.value) {
    throw new Error('Failed to initialize Paddle')
  }
  console.log('Paddle initialized')
}

onMounted(initPaddle)

async function openCheckout() {
  if (!paddle.value) {
    throw new Error('Paddle not initialized')
  }
  await paddle.value.Checkout.open({
    items: [
      {
        priceId: import.meta.env.VITE_PADDLE_PRICE_ID,
        quantity: 5,
      },
    ],
  })
}
</script>

<template>
  <a href="#" @click="openCheckout">
    ☕️ Buy me a coffee
  </a>
</template>
