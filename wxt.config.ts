import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Mass Block Twitter',
    description: 'Mass Block Twitter Spam Users',
    permissions: ['contextMenus'],
    web_accessible_resources: [
      {
        resources: ['/inject.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
  runner: {
    disabled: true,
  },
})
