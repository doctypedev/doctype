import { defineConfig } from 'vitepress'
import { autoSidebar } from './sidebar-auto';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Doctype",
  description: "Autonomous Documentation Platform",
  appearance: 'dark', // Force dark theme
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/api' }
    ],

    sidebar: autoSidebar,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/alessiopelliccione/doctype' }
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
    ['meta', { name: 'theme-color', content: '#000000' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'Doctype' }]
  ]
})
