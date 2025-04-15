/**
 * If the function is called multiple times, it will only be executed once.
 * @param fn
 * @returns
 */
export function once<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  let flag = false,
    res: Promise<T> | null = null
  return (async (...args) => {
    if (flag) {
      return res
    }
    try {
      res = fn(...args)
      flag = true
      await res
      return res
    } catch (e) {
      flag = false
      throw e
    }
  }) as T
}
