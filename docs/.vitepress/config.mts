import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Doctype",
  description: "Autonomous Documentation Platform",
  appearance: 'dark', // Force dark theme
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/guide/getting-started' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        collapsed: false,
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Core Concepts', link: '/guide/core-concepts' }
        ]
      },
      {
        text: 'CLI Commands',
        collapsed: false,
        items: [
          { text: 'doctype check', link: '/cli/check' },
          { text: 'doctype fix', link: '/cli/fix' }
        ]
      },
      {
        text: 'Core Modules',
        collapsed: false,
        items: [
          { text: 'ASTAnalyzer', link: '/api/ast-analyzer' },
          { text: 'SignatureHasher', link: '/api/signature-hasher' }
        ]
      },
      {
        text: 'Content & Mapping',
        collapsed: false,
        items: [
          { text: 'MarkdownParser', link: '/api/markdown-parser' },
          { text: 'DoctypeMapManager', link: '/api/map-manager' },
          { text: 'ContentInjector', link: '/api/content-injector' }
        ]
      }
    ],

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
