import { it } from 'vitest'
import {
  createRawSnippet,
  hydrate,
  mount,
  unmount,
  type Component,
  type Snippet,
} from 'svelte'
import type { HTMLAttributes } from 'svelte/elements'
import { render } from 'vitest-browser-svelte'

it('render in programmatic way', async () => {
  type SvelteConfig =
    | {
        render: (target: Element) => void
        component: Snippet
      }
    | {
        render: (target: Element) => void
        component: Component<any>
      }
    | {
        render: (target: Element) => void
        component: string
      }

  function createElementByComponent<T extends Record<string, any>>(
    component: Component<T>,
    props: T,
  ): SvelteConfig {
    return {
      render: (target) => {
        hydrate(component, { target, props })
      },
      component,
    }
  }

  function createElementByTag(
    tag: string,
    props?: HTMLAttributes<HTMLElement> | null,
    children: (string | SvelteConfig)[] = [],
  ): SvelteConfig {
    let _target: Element | null = null
    const snippet = createRawSnippet(() => ({
      render() {
        return `<${tag}></${tag}>`
      },
      setup(target) {
        _target = target
        Object.entries(props ?? {}).forEach(([key, value]) => {
          target.setAttribute(key, value)
        })
        children.forEach((child) => {
          if (typeof child === 'string') {
            target.appendChild(document.createTextNode(child))
          } else if (typeof child === 'object' && 'render' in child) {
            child.render(target)
          } else {
            throw new Error('Invalid child')
          }
        })
        return () => {
          _target = null
        }
      },
    }))
    return {
      render: (target) => {
        const el = mount(snippet, { target })
        return () => unmount(el)
      },
      component: snippet,
    }
  }

  function createElementByString(str: string): SvelteConfig {
    return {
      render(target) {
        target.appendChild(document.createTextNode(str))
      },
      component: str,
    }
  }

  function createElement(
    tag: string,
    props?: HTMLAttributes<HTMLElement> | null,
    children?: string | (string | SvelteConfig)[],
  ): {
    render: (target: Element) => void
    component: Snippet
  }
  function createElement(
    tag: string,
    children?: string | (string | SvelteConfig)[],
  ): {
    render: (target: Element) => void
    component: Snippet
  }
  function createElement<T extends Record<string, any>>(
    tag: Component<T>,
    props?: T,
  ): {
    render: (target: Element) => void
    component: Component<any>
  }
  function createElement(
    tag: string | Component<any>,
    props?: any,
    children?: string | (string | SvelteConfig)[],
  ): SvelteConfig {
    if (typeof props === 'string' || Array.isArray(props)) {
      children = props
      props = null
    }
    if (typeof tag === 'string') {
      return createElementByTag(
        tag,
        props,
        children
          ? Array.isArray(children)
            ? children
            : [children]
          : undefined,
      )
    } else {
      return createElementByComponent(tag, props)
    }
  }

  // const screen = render(AutoSizer, {
  //   target: document.body,
  //   props: {
  //     child: createRawSnippet<[{ width: number; height: number }]>(
  //       (size) => ({
  //         render() {
  //           return `<div style="width: ${size().width}px; height: ${
  //             size().height
  //           }px;" title="test-child"></div>`
  //         },
  //       }),
  //     ),
  //   },
  // })

  const screen = render(
    createElement('div', [
      createElement('div', 'test-child-1'),
      createElement('div', 'test-child-2'),
      createElement('div', 'test-child-3'),
    ]).component,
  )
  console.log(screen.baseElement)

  // const screen = render(
  //   createElement(
  //     'div',
  //     {
  //       title: 'test-parent',
  //       style: 'width: 400px; height: 400px;',
  //     },
  //     [
  //       createElement(AutoSizer, {
  //         child: createRawSnippet<[{ width: number; height: number }]>(
  //           (size) => ({
  //             render() {
  //               return `<div style="width: ${size().width}px; height: ${
  //                 size().height
  //               }px;" title="test-child"></div>`
  //             },
  //           }),
  //         ),
  //         // child: ({ width, height }) => {
  //         //   return createElement('div', {
  //         //     title: 'test-child',
  //         //     style: `width: ${width}px; height: ${height}px;`,
  //         //   }).component as any
  //         // },
  //       }),
  //     ],
  //   ).component,
  // )
  // console.log(screen.baseElement)

  // const TestComp = createRawSnippet(() => ({
  //   render() {
  //     return `<div title="test-parent"></div>`
  //   },
  //   setup(target) {
  //     hydrate(AutoSizer, {
  //       target,
  //       props: {
  //         child: createRawSnippet<[{ width: number; height: number }]>(
  //           (size) => ({
  //             render() {
  //               return ``
  //               // return `<div style="width: ${size().width}px; height: ${
  //               //   size().height
  //               // }px;" title="test-child"></div>`
  //             },
  //           }),
  //         ),
  //       },
  //     })
  //   },
  // }))

  // const screen = render(
  //   createElement(
  //     'div',
  //     {
  //       title: 'test',
  //     },
  //     ['hello world'],
  //   ),
  // )
  // await expect.element(screen.getByText('hello world')).toBeInTheDocument()
})
