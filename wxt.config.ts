import { defineConfig } from 'wxt'
import path from 'path'

// See https://wxt.dev/api/config.html
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
    host_permissions: ['https://x.com/**'],
  },
  runner: {
    disabled: true,
  },
  vite: () => ({
    resolve: {
      alias: {
        $lib: path.resolve('./src/lib'),
      },
    },
  }),
})
