<script setup lang="ts">
import { initializePaddle, Paddle } from '@paddle/paddle-js'
import { ref, onMounted } from 'vue'

let paddle = ref<Paddle | undefined>()

async function initPaddle() {
  paddle.value = await initializePaddle({
    environment: 'sandbox',
    token: 'test_c0efb0e5f6384c2d2cb15d01f4c',
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
        priceId: 'pri_01jgvfper0t9qs1g4gyf4kc1kb',
        quantity: 5,
      },
    ],
  })
}
</script>

<template>
  <button class="sponsor-button" @click="openCheckout">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart">
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
    Sponsor
  </button>
</template>

<style scoped>
.sponsor-button {
  @apply flex items-center gap-2;
}
</style>
