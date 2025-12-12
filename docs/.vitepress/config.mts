import { defineConfig } from 'vitepress'
import { autoSidebar } from './sidebar-auto';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Sintesi",
  description: "Autonomous Documentation Platform",
  appearance: 'dark', // Force dark theme
  ignoreDeadLinks: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/configuration' },
      { text: 'Reference', link: '/reference/commands' }
    ],

    sidebar: autoSidebar,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/doctypedev/sintesi' }
    ],

    // Brand color for buttons and accents
    outline: {
      level: [2, 3]
    },

    search: {
      provider: 'local'
    }
  },

  head: [
    ['meta', { name: 'theme-color', content: '#ff3131' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'Sintesi' }]
  ],

  markdown: {
    theme: 'github-dark-dimmed'
  }
})
