import { defineConfig } from 'wxt'
import path from 'path'

const host_permissions = [
  'https://x.com/**',
  'https://mass-block-twitter-server.rxliuli.com/',
]
if (process.env.NODE_ENV === 'development') {
  host_permissions.push('http://localhost:8787/**')
}
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-svelte'],
  manifestVersion: 3,
  manifest: {
    name: 'Mass Block Twitter',
    description:
      'Mass Block Twitter - Efficiently block multiple spam accounts on Twitter/X with just a few clicks.',
    permissions: ['contextMenus', 'scripting'],
    web_accessible_resources: [
      {
        resources: ['/inject.js'],
        matches: ['<all_urls>'],
      },
    ],
    action: {
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '128': 'icon/128.png',
      },
    },
    host_permissions,
    browser_specific_settings: {
      gecko: {
        id: 'mass-block-twitter@rxliuli.com',
      },
    },
  },
  runner: {
    disabled: true,
  },
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      manifest.content_scripts ??= []
      manifest.content_scripts.push({
        // Build extension once to see where your CSS get's written to
        css: ['assets/style.css'],
        matches: ['https://x.com/**'],
      })
    },
  },
  vite: () => ({
    resolve: {
      alias: {
        $lib: path.resolve('./src/lib'),
      },
    },
  }),
})
