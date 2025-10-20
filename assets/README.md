# ModestBench Assets

This directory contains design assets for ModestBench.

## header.ans

This file contains the ANSI art header design with Unicode block characters and ANSI color codes.

**Purpose:** This is a reference/design file that can be edited with text editors that support ANSI preview (like VS Code with ANSI preview extensions).

**Usage:**

1. Edit the `header.ans` file visually using an editor with ANSI preview support
2. When happy with the design, copy the content
3. Paste it into `src/reporters/human.ts` in the `onStart()` method where the header is generated

**Note:** This file is NOT automatically loaded by the code - it's purely for design/reference purposes. The actual header is hardcoded in the TypeScript source for performance and to avoid file I/O during benchmark runs.

## unicode-cp437-chars.txt

A reference palette of Unicode characters that mimic CP437 block and outline characters.

**Purpose:** Quick copy/paste reference for ANSI art editing. Contains block elements, box drawing characters, geometric shapes, and other symbols commonly used in CP437-style art.

**Contents:**

- Block elements: █ ▓ ▒ ░
- Box drawing (single and double lines)
- Triangles and arrows
- Geometric shapes
- Special symbols and gradients

Use this as a character palette when designing ANSI art in `header.ans`.

## ansi-color-reference.ans

A comprehensive ANSI color reference showing all color combinations.

**Purpose:** Visual reference for choosing foreground and background color combinations. View in a terminal or with an ANSI preview extension to see the colors rendered.

**Contents:**

- All 16 foreground colors (8 basic + 8 bright)
- All 16 background colors (8 basic + 8 bright)
- Complete matrix showing every foreground/background combination (256+ combinations)
- Text styles (bold, dim, underline, inverse)
- Escape code reference for TypeScript/JavaScript

**Usage:** Open this file to see how different color combinations look, then use the escape codes shown to add colors to your ANSI art designs.
