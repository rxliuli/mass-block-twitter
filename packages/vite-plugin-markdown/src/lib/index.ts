import type { Plugin } from 'vite'
import { toHtml } from 'hast-util-to-html'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { newlineToBreak } from 'mdast-util-newline-to-break'
import { toHast } from 'mdast-util-to-hast'
import { gfm } from 'micromark-extension-gfm'
import type { YAML, Heading, Code } from 'mdast'
import { readFile } from 'fs/promises'
import type { Parent, Root } from 'mdast'
import { parse as parseYAML } from 'yaml'
import { select, selectAll } from 'unist-util-select'
import { toString } from 'mdast-util-to-string'
import { codeToHast, createHighlighter } from 'shiki'
import { visitParents } from 'unist-util-visit-parents'
import type { Element } from 'hast'

export { select, selectAll } from 'unist-util-select'

export function parseMarkdown(md: string): Root {
  return fromMarkdown(md, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown(), { transforms: [newlineToBreak] }],
  })
}

export async function renderMarkdown(root: Root): Promise<string> {
  const highlighter = await createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: ['ts', 'js'],
  })
  return toHtml(
    toHast(root, {
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
      },
    }),
  )
}

export function getYamlMeta<T>(root: Root): T {
  const r = select('yaml', root)
  return parseYAML(r ? (r as YAML).value : '')
}

export function markdown(): Plugin {
  const svelteModules = new Map<string, string>()

  return {
    name: 'vite-plugin-markdown',
    resolveId(id) {
      if (id.endsWith('.md.svelte') && svelteModules.has(id)) {
        return id
      }
    },
    async load(id) {
      if (id.endsWith('.md.svelte') && svelteModules.has(id)) {
        return svelteModules.get(id)
      }
      const mdQueryMatch = id.match(/^(.+\.md)\?(html|meta|svelte|react)$/)
      if (!mdQueryMatch) {
        return null
      }

      const [, filePath, queryType] = mdQueryMatch

      try {
        const rawMd = await readFile(filePath, 'utf-8')
        const root = parseMarkdown(rawMd)
        const frontmatter = getYamlMeta(root)

        switch (queryType) {
          case 'html': {
            const html = renderMarkdown(root)
            return `export default ${JSON.stringify(html)};`
          }

          case 'meta': {
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
            return `export default ${JSON.stringify({
              title,
              frontmatter,
              toc,
            })};`
          }

          case 'svelte': {
            const html = await renderMarkdown(root)
            const virtualId = `${filePath}.svelte`
            svelteModules.set(virtualId, html)
            return `export { default } from '${virtualId}';`
          }

          case 'react': {
            const html = renderMarkdown(root)
            return `
                import React from 'react';
                
                const MarkdownComponent = (props) => {
                  return React.createElement('div', {
                    dangerouslySetInnerHTML: { __html: ${JSON.stringify(
                      html,
                    )} },
                    className: "markdown-body",
                    ...props
                  });
                };
                
                export default MarkdownComponent;
              `
          }

          default:
            return null
        }
      } catch (e) {
        console.error(`Error processing ${id}:`, e)
        return null
      }
    },

    configureServer(server) {
      return () => {
        server.watcher.on('change', async (file) => {
          if (file.endsWith('.md')) {
            const virtualId = `${file}.md.svelte`
            if (svelteModules.has(virtualId)) {
              svelteModules.delete(virtualId)
              const module = server.moduleGraph.getModuleById(virtualId)
              if (module) {
                module.lastHMRTimestamp = Date.now()
              }
            }
          }
        })
      }
    },
  }
}
