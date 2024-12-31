<script lang="ts">
  let count = $state(0)

  function increment() {
    count++
  }
</script>

<div class="flex flex-col items-center justify-center h-screen">
  <p>Count: {count}</p>
  <button onclick={increment}>Click me</button>
</div>
