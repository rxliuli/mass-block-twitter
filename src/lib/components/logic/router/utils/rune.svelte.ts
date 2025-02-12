export function ref<T>(value: T): { value: T } {
  return reactive({ value })
}

export function reactive<T extends object>(v: T): T {
  let s = $state(v)
  return new Proxy(
    {},
    {
      get: (_, p) => s[p as keyof T],
      set: (_, p, v) => {
        s[p as keyof T] = v
        return true
      },
      getOwnPropertyDescriptor(_target, prop) {
        return Object.getOwnPropertyDescriptor(v, prop)
      },
      ownKeys(_target) {
        return Reflect.ownKeys(v)
      },
    },
  ) as T
}

export function computed<T extends object>(t: () => T): Readonly<T> {
  const v = $derived(t())
  return new Proxy(
    {},
    {
      get: (_, p) => v[p as keyof T],
      getOwnPropertyDescriptor(_target, prop) {
        return Object.getOwnPropertyDescriptor(v, prop)
      },
      ownKeys(_target) {
        return Reflect.ownKeys(v)
      },
    },
  ) as T
}
