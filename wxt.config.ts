import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Mass Block Twitter',
    description:
      'Mass Block Twitter - Efficiently block multiple spam accounts on Twitter/X with just a few clicks.',
    permissions: ['contextMenus', 'scripting'],
    web_accessible_resources: [
      {
        resources: ['/inject.js', '/scan.js'],
        matches: ['<all_urls>'],
      },
    ],
    host_permissions: ['https://x.com/**'],
  },
  runner: {
    disabled: true,
  },
})
