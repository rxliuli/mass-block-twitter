import type { Plugin, HmrContext, ModuleNode } from 'vite'
import { toHtml } from 'hast-util-to-html'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { newlineToBreak } from 'mdast-util-newline-to-break'
import { toHast } from 'mdast-util-to-hast'
import { gfm } from 'micromark-extension-gfm'
import type { Root, Heading, Code, Yaml } from 'mdast'
import { readFile } from 'fs/promises'
import { parse as parseYAML } from 'yaml'
import { select, selectAll } from 'unist-util-select'
import { toString } from 'mdast-util-to-string'
import { createHighlighter, type Highlighter } from 'shiki'
import type { Element } from 'hast'
import { inspect } from 'unist-util-inspect'
import path from 'path'

export function parseMarkdown(md: string): Root {
  return fromMarkdown(md, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown(), { transforms: [newlineToBreak] }],
  })
}

export function renderMarkdown(root: Root, highlighter: Highlighter): string {
  const hast = toHast(root, {
    handlers: {
      code: (_state, node, _parent) => {
        const code = node as Code
        const hast = highlighter.codeToHast(code.value, {
          lang: code.lang as any,
          theme: 'github-dark',
        })
        const r = hast.children[0] as Element
        r.properties.code = code.value
        return r
      },
      heading: (_state, node, _parent) => {
        const heading = node as Heading
        const text = toString(heading)
        const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        return {
          type: 'element',
          tagName: `h${heading.depth}`,
          properties: { id },
          children: [
            {
              type: 'element',
              tagName: 'a',
              properties: {
                href: `#${id}`,
                class: 'header-anchor',
                'aria-hidden': true,
              },
              children: [{ type: 'text', value: '#' }],
            },
            ...(_state.all(node) as any),
          ],
        }
      },
    },
    allowDangerousHtml: true,
  })
  const links = selectAll('[tagName="a"]', hast) as Element[]
  links.forEach((link) => {
    const href = link.properties?.href as string | undefined
    if (href?.startsWith('http')) {
      link.properties.target = '_blank'
    }
    if (href?.endsWith('.csv') || href?.endsWith('.json')) {
      link.properties.download = path.basename(href)
    }
  })
  return toHtml(hast, { allowDangerousHtml: true })
}

export function getYamlMeta<T>(root: Root): T {
  const r = select('yaml', root)
  return parseYAML(r ? (r as Yaml).value : '')
}

const markdownCache = new Map<
  string,
  {
    html: string
    meta: {
      title: string
      frontmatter: any
      toc: Array<{ level: number; text: string }>
    }
  }
>()

const fileImporterMap = new Map<string, Set<string>>()

export function markdown(): Plugin {
  let highlighter: Highlighter

  return {
    name: 'vite-plugin-markdown',
    async buildStart() {
      highlighter = await createHighlighter({
        themes: ['github-dark', 'github-light'],
        langs: ['ts', 'js', 'jsx', 'tsx', 'css', 'json', 'html', 'svelte'],
      })
    },
    async load(id) {
      const mdQueryMatch = id.match(/^(.+\.md)\?(html|meta|svelte|react)$/)
      if (!mdQueryMatch) {
        return
      }

      const [, filePath, queryType] = mdQueryMatch
      const importer = (this as any).importer
      if (importer) {
        if (!fileImporterMap.has(filePath)) {
          fileImporterMap.set(filePath, new Set())
        }
        fileImporterMap.get(filePath)?.add(importer)
      }

      try {
        const rawMd = await readFile(filePath, 'utf-8')
        const root = parseMarkdown(rawMd)
        const frontmatter = getYamlMeta(root)

        let cached = markdownCache.get(filePath)
        if (!cached) {
          const html = renderMarkdown(root, highlighter)
          // console.log('root', inspect(root))
          const toc = (selectAll('heading', root) as Heading[]).map(
            (heading) => ({
              level: heading.depth,
              text: toString(heading),
            }),
          )
          const title = toString(
            getYamlMeta<{ title: string }>(root)?.title ??
              select('heading[depth="1"]', root),
          )
          markdownCache.set(filePath, {
            html,
            meta: {
              title,
              frontmatter,
              toc,
            },
          })
          cached = markdownCache.get(filePath)
        }

        switch (queryType) {
          case 'html': {
            return `export default ${JSON.stringify(cached!.html)};`
          }

          case 'meta': {
            return `export default ${JSON.stringify(cached!.meta)};`
          }

          default:
            return null
        }
      } catch (e) {
        console.error(`Error processing ${id}:`, e)
        return null
      }
    },

    async handleHotUpdate(ctx: HmrContext) {
      const { file, server } = ctx
      if (!file.endsWith('.md')) {
        return
      }
      markdownCache.delete(file)
      const rawMd = await readFile(file, 'utf-8')
      const root = parseMarkdown(rawMd)
      const frontmatter = getYamlMeta(root)
      const html = renderMarkdown(root, highlighter)
      const toc = (selectAll('heading', root) as Heading[]).map((heading) => ({
        level: heading.depth,
        text: toString(heading),
      }))
      const title = toString(
        getYamlMeta<{ title: string }>(root)?.title ??
          select('heading[depth="1"]', root),
      )
      markdownCache.set(file, {
        html,
        meta: {
          title,
          frontmatter,
          toc,
        },
      })
      const modulesToUpdate: ModuleNode[] = []
      const htmlImport = `${file}?html`
      const metaImport = `${file}?meta`
      const svelteImport = `${file}?svelte`
      const reactImport = `${file}?react`
      const moduleGraph = server.moduleGraph
      const htmlMod = moduleGraph.getModuleById(htmlImport)
      const metaMod = moduleGraph.getModuleById(metaImport)
      const svelteMod = moduleGraph.getModuleById(svelteImport)
      const reactMod = moduleGraph.getModuleById(reactImport)

      if (htmlMod) modulesToUpdate.push(htmlMod)
      if (metaMod) modulesToUpdate.push(metaMod)
      if (svelteMod) modulesToUpdate.push(svelteMod)
      if (reactMod) modulesToUpdate.push(reactMod)

      const importers = moduleGraph.getModulesByFile(file) || []
      importers.forEach((mod) => {
        if (mod && !modulesToUpdate.includes(mod)) {
          modulesToUpdate.push(mod)
        }
      })

      return modulesToUpdate
    },

    buildEnd() {
      highlighter.dispose()
    },
  }
}
