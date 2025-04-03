<script lang="ts" generics="T extends SingleProps | RangeProps">
  import type { SingleProps, RangeProps } from './props'

  let {
    value = $bindable(0),
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    range = false,
  }: T & {
    min?: number
    max?: number
    step?: number
  } = $props()

  let isDragging = false
  let startX = 0
  let startValue: number | [number, number] = 0
  let sliderWidth = 0
  let sliderElement: HTMLDivElement
  let activeThumb: 'start' | 'end' | null = null

  function calculateValue(clientX: number) {
    const rect = sliderElement.getBoundingClientRect()
    const percentage = (clientX - rect.left) / rect.width
    const range = max - min
    const newValue = Math.round((min + percentage * range) / step) * step
    return Math.min(Math.max(newValue, min), max)
  }

  function handleMouseDown(
    e: MouseEvent,
    thumb: 'start' | 'end' | null = null,
  ) {
    if (range && !thumb) return

    // Calculate value immediately when mouse is pressed
    const newValue = calculateValue(e.clientX)
    if (range) {
      const currentValue = value as [number, number]
      const newRangeValue: [number, number] = [...currentValue]
      if (thumb === 'start') {
        newRangeValue[0] = Math.min(newValue, currentValue[1])
      } else {
        newRangeValue[1] = Math.max(newValue, currentValue[0])
      }
      if (JSON.stringify(newRangeValue) !== JSON.stringify(value)) {
        value = newRangeValue
        ;(onValueChange as (value: [number, number]) => void)?.(newRangeValue)
      }
    } else {
      if (newValue !== value) {
        value = newValue
        ;(onValueChange as (value: number) => void)?.(newValue)
      }
    }

    isDragging = true
    startX = e.clientX
    startValue = value
    sliderWidth = sliderElement.offsetWidth
    activeThumb = thumb

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return

    const newValue = calculateValue(e.clientX)
    const clampedValue = Math.min(Math.max(newValue, min), max)

    if (range && activeThumb) {
      const currentValue = value as [number, number]
      const newRangeValue: [number, number] = [...currentValue]
      if (activeThumb === 'start') {
        newRangeValue[0] = Math.min(clampedValue, currentValue[1])
      } else {
        newRangeValue[1] = Math.max(clampedValue, currentValue[0])
      }
      if (JSON.stringify(newRangeValue) !== JSON.stringify(value)) {
        value = newRangeValue
        ;(onValueChange as (value: [number, number]) => void)?.(newRangeValue)
      }
    } else if (!range && clampedValue !== value) {
      value = clampedValue
      ;(onValueChange as (value: number) => void)?.(clampedValue)
    }
  }

  function handleMouseUp() {
    isDragging = false
    activeThumb = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  function handleClick(e: MouseEvent) {
    if (isDragging) return

    if (range) {
      const newValue = calculateValue(e.clientX)
      const currentValue = value as [number, number]
      const newRangeValue: [number, number] = [...currentValue]

      // Determine which thumb to move based on which is closer
      const distanceToStart = Math.abs(newValue - currentValue[0])
      const distanceToEnd = Math.abs(newValue - currentValue[1])

      if (distanceToStart < distanceToEnd) {
        newRangeValue[0] = Math.min(newValue, currentValue[1])
      } else {
        newRangeValue[1] = Math.max(newValue, currentValue[0])
      }

      if (JSON.stringify(newRangeValue) !== JSON.stringify(value)) {
        value = newRangeValue
        ;(onValueChange as (value: [number, number]) => void)?.(newRangeValue)
      }
    } else {
      const newValue = calculateValue(e.clientX)
      if (newValue !== value) {
        value = newValue
        ;(onValueChange as (value: number) => void)?.(newValue)
      }
    }
  }

  $effect(() => {
    if (range) {
      const rangeValue = value as [number, number]
      if (rangeValue[0] < min) rangeValue[0] = min
      if (rangeValue[1] > max) rangeValue[1] = max
      if (rangeValue[0] > rangeValue[1]) {
        const temp = rangeValue[0]
        rangeValue[0] = rangeValue[1]
        rangeValue[1] = temp
      }
    } else {
      const singleValue = value as number
      if (singleValue < min) value = min
      if (singleValue > max) value = max
    }
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
  {#if range}
    {@const rangeValue = value as [number, number]}
    <div
      class="absolute h-1 bg-blue-500 rounded-full"
      style="left: {((rangeValue[0] - min) / (max - min)) *
        100}%; width: {((rangeValue[1] - rangeValue[0]) / (max - min)) * 100}%"
    ></div>
  {:else}
    {@const singleValue = value as number}
    <div
      class="absolute h-1 bg-blue-500 rounded-full"
      style="width: {((singleValue - min) / (max - min)) * 100}%"
    ></div>
  {/if}

  <!-- Thumb(s) -->
  {#if range}
    {@const rangeValue = value as [number, number]}

    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_role_has_required_aria_props -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-sm transition-transform hover:scale-110 active:scale-110"
      style="left: {((rangeValue[0] - min) / (max - min)) * 100}%"
      onmousedown={(e) => handleMouseDown(e, 'start')}
    ></div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-sm transition-transform hover:scale-110 active:scale-110"
      style="left: {((rangeValue[1] - min) / (max - min)) * 100}%"
      onmousedown={(e) => handleMouseDown(e, 'end')}
    ></div>
  {:else}
    {@const singleValue = value as number}
    <div
      class="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-sm transition-transform hover:scale-110 active:scale-110"
      style="left: {((singleValue - min) / (max - min)) * 100}%"
    ></div>
  {/if}
</div>

<style>
  /* Prevent text selection while dragging */
  :global(body.dragging) {
    user-select: none;
  }
</style>
