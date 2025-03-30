export type MiddlewareHandler<C> = (
  c: C,
  next: () => Promise<void>,
) => void | Promise<void>

class Middleware<C> {
  constructor(private c: C) {}
  private stack: MiddlewareHandler<C>[] = []
  use(handler: MiddlewareHandler<C>) {
    this.stack.push(handler)
    return this
  }
  async run() {
    const compose = (i: number): Promise<void> => {
      if (i >= this.stack.length) {
        return Promise.resolve()
      }
      return this.stack[i](this.c, () => compose(i + 1)) as Promise<void>
    }
    await compose(0)
  }
}

export function middleware<C>(c: C): Middleware<C> {
  return new Middleware<C>(c)
}
