import { defineConfig, UserManifest } from 'wxt'
import path from 'path'

export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-svelte'],
  manifestVersion: 3,
  manifest: (env) => {
    const manifest: UserManifest = {
      name: 'Mass Block Twitter',
      description:
        'Mass Block Twitter - Efficiently block multiple spam accounts on Twitter/X with just a few clicks.',
      permissions: ['contextMenus', 'scripting', 'storage'],
      web_accessible_resources: [],
      action: {
        default_icon: {
          '16': 'icon/16.png',
          '32': 'icon/32.png',
          '48': 'icon/48.png',
          '128': 'icon/128.png',
        },
      },
      host_permissions: [
        'https://x.com/**',
        'https://mass-block-twitter-server.rxliuli.com/**',
        'https://mass-block-twitter.rxliuli.com/**',
      ],
    }
    if (env.browser === 'firefox') {
      manifest.browser_specific_settings = {
        gecko: {
          id: 'mass-block-twitter@rxliuli.com',
        },
      }
      manifest.permissions!.push('declarativeNetRequest')
      manifest.declarative_net_request = {
        rule_resources: [
          {
            id: 'ruleset',
            enabled: true,
            path: 'rules.json',
          },
        ],
      }
    }
    return manifest
  },
  zip: {
    name: 'mass-block-twitter',
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
