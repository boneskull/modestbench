import starlight from '@astrojs/starlight';
import starlightClientMermaid from '@pasqal-io/starlight-client-mermaid';
import astroBrokenLinksChecker from 'astro-broken-link-checker';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  base: '/',

  integrations: [
    astroBrokenLinksChecker({
      checkExternalLinks: false, // External link checking is slow without disk caching
      logFilePath: 'broken-links.log',
      throwError: true, // Fail the build if broken links are found
    }),
    starlight({
      customCss: ['./site/src/styles/custom.css'],
      description: 'A full-ass benchmarking framework for Node.js',
      logo: {
        src: './assets/logo-no-text-64.png',
      },
      plugins: [starlightClientMermaid()],
      sidebar: [
        { label: 'Getting Started', link: '/getting-started/' },
        {
          items: [
            { label: 'Configuration', link: '/guides/configuration/' },
            { label: 'CLI Reference', link: '/guides/cli/' },
            { label: 'Output Formats', link: '/guides/output/' },
            { label: 'Understanding Statistics', link: '/guides/statistics/' },
            { label: 'Advanced Usage', link: '/guides/advanced/' },
          ],
          label: 'Guides',
        },
        {
          items: [
            { label: 'API Documentation', link: '/reference/api/' },
            { label: 'Architecture', link: '/reference/architecture/' },
            { label: 'Contributing', link: '/reference/contributing/' },
            { label: 'Error Reference', link: '/reference/errors/' },
          ],
          label: 'Reference',
        },
      ],
      social: [
        {
          href: 'https://github.com/boneskull/modestbench',
          icon: 'github',
          label: 'GitHub',
        },
      ],
      title: 'modestbench',
    }),
  ],
  outDir: './docs',
  publicDir: './public',
  site: 'https://modestbench.dev',
  srcDir: './site/src',
  // see https://github.com/withastro/astro/issues/14117#issuecomment-3117797751
  vite: {
    optimizeDeps: {
      include: ['asciinema-player'],
    },
    ssr: {
      noExternal: ['zod'],
    },
  },
});
