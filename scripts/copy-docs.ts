#!/usr/bin/env npx tsx
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface DocFile {
  dest: string;
  frontmatter: string;
  source: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const siteContentDir = join(rootDir, 'site/src/content/docs/reference');

// Ensure the reference directory exists
mkdirSync(siteContentDir, { recursive: true });

console.log('🖼️  Copying assets...');

// Ensure public directory exists and copy assets
const publicDir = join(rootDir, 'public');
mkdirSync(publicDir, { recursive: true });

// Copy logo for splash page to public
copyFileSync(
  join(rootDir, 'assets/logo-512.png'),
  join(publicDir, 'logo-512.png'),
);
console.log('✓ Copied logo-512.png → public/');

// Copy small logo for site header to site/src/assets
const assetsDir = join(rootDir, 'site/src/assets');
mkdirSync(assetsDir, { recursive: true });
copyFileSync(
  join(rootDir, 'assets/logo-no-text-64.png'),
  join(assetsDir, 'logo-no-text-64.png'),
);
console.log('✓ Copied logo-no-text-64.png → site/src/assets/');

// Copy favicon to site root for Starlight to pick up
const siteDir = join(rootDir, 'site');
copyFileSync(
  join(rootDir, 'assets/favicon/favicon.svg'),
  join(siteDir, 'favicon.svg'),
);
console.log('✓ Copied favicon.svg → site/');

// Copy font files to public/fonts
const fontsDir = join(publicDir, 'fonts');
mkdirSync(fontsDir, { recursive: true });
copyFileSync(
  join(rootDir, 'assets/HandelGothic Regular.woff2'),
  join(fontsDir, 'HandelGothic Regular.woff2'),
);
console.log('✓ Copied HandelGothic Regular.woff2 → public/fonts/');

// Copy JSON schema to public for serving at site root
copyFileSync(
  join(rootDir, 'dist/schema/modestbench-config.schema.json'),
  join(publicDir, 'modestbench-config.schema.json'),
);
console.log('✓ Copied modestbench-config.schema.json → public/');

// Files to copy with their frontmatter
const files: DocFile[] = [
  {
    dest: join(siteContentDir, 'architecture.md'),
    frontmatter: `---
title: Architecture
description: modestbench system architecture and design documentation
---

`,

    source: join(rootDir, 'ARCHITECTURE.md'),
  },
  {
    dest: join(siteContentDir, 'contributing.md'),
    frontmatter: `---
title: Contributing
description: Guide for contributing to modestbench
---

`,
    source: join(rootDir, 'CONTRIBUTING.md'),
  },
];

console.log('📝 Copying documentation files...');

for (const file of files) {
  try {
    const content = readFileSync(file.source, 'utf8');

    // Remove the first # heading line since Starlight handles titles
    const contentWithoutTitle = content.replace(/^#\s+.*\n\n?/, '');

    // Add frontmatter and write
    const finalContent = file.frontmatter + contentWithoutTitle;
    writeFileSync(file.dest, finalContent);

    console.log(`✓ Copied ${file.source} → ${file.dest}`);
  } catch (error) {
    console.error(`✗ Failed to copy ${file.source}:`, (error as Error).message);
    process.exit(1);
  }
}

console.log('✨ Documentation files copied successfully!');
