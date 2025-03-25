<script lang="ts">
  let {
    value = $bindable(0),
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
  }: {
    value?: number
    onValueChange?: (value: number) => void
    min?: number
    max?: number
    step?: number
  } = $props()

  let isDragging = false
  let startX = 0
  let startValue = 0
  let sliderWidth = 0
  let sliderElement: HTMLDivElement

  function calculateValue(clientX: number) {
    const rect = sliderElement.getBoundingClientRect()
    const percentage = (clientX - rect.left) / rect.width
    const range = max - min
    const newValue = Math.round((min + percentage * range) / step) * step
    return Math.min(Math.max(newValue, min), max)
  }

  function handleMouseDown(e: MouseEvent) {
    // Calculate value immediately when mouse is pressed
    const newValue = calculateValue(e.clientX)
    if (newValue !== value) {
      value = newValue
      onValueChange?.(newValue)
    }

    isDragging = true
    startX = e.clientX
    startValue = value
    sliderWidth = sliderElement.offsetWidth

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return

    const deltaX = e.clientX - startX
    const percentage = deltaX / sliderWidth
    const range = max - min
    const newValue = Math.round((startValue + percentage * range) / step) * step

    // Clamp value between min and max
    const clampedValue = Math.min(Math.max(newValue, min), max)

    if (clampedValue !== value) {
      value = clampedValue
      onValueChange?.(clampedValue)
    }
  }

  function handleMouseUp() {
    isDragging = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  function handleClick(e: MouseEvent) {
    if (isDragging) {
      return
    }

    const newValue = calculateValue(e.clientX)
    if (newValue !== value) {
      value = newValue
      onValueChange?.(newValue)
    }
  }

  $effect(() => {
    if (value < min) value = min
    if (value > max) value = max
  })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_role_has_required_aria_props -->
<div
  class="relative w-full h-6 flex items-center cursor-pointer select-none"
  onmousedown={handleMouseDown}
  onclick={handleClick}
  bind:this={sliderElement}
  role="slider"
  tabindex="0"
>
  <!-- Track -->
  <div class="absolute w-full h-1 bg-gray-200 rounded-full"></div>

  <!-- Filled track -->
  <div
    class="absolute h-1 bg-blue-500 rounded-full"
    style="width: {((value - min) / (max - min)) * 100}%"
  ></div>

  <!-- Thumb -->
  <div
    class="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-sm transition-transform hover:scale-110 active:scale-110"
    style="left: {((value - min) / (max - min)) * 100}%"
  ></div>
</div>

<style>
  /* Prevent text selection while dragging */
  :global(body.dragging) {
    user-select: none;
  }
</style>
