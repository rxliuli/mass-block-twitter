import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Mass Block Twitter',
  description: 'Mass Block Twitter Spam Users',
  themeConfig: {
    logo: '/icon/128.png',
    nav: [],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rxliuli/mass-block-twitter' },
    ],
  },
  markdown: {
    breaks: true,
  },
})
