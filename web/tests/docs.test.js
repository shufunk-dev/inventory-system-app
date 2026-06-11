import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { markdownToMediaWiki } from '../scripts/sync-wiki.js';

test.describe('Documentation & Wiki Sync Suite', () => {

  const docsDir = path.resolve(process.cwd(), 'docs/manual/inventory-pos');
  const expectedFiles = [
    '01_introduction_and_modes.md',
    '02_scanning_and_ai_pipeline.md',
    '03_multistore_booths.md',
    '04_pos_and_qr_checkouts.md',
    '05_valuation_and_depletions.md'
  ];

  test('Local Markdown files exist and are populated', () => {
    assert.ok(fs.existsSync(docsDir), 'Local documentation directory should exist');
    
    expectedFiles.forEach(file => {
      const filePath = path.join(docsDir, file);
      assert.ok(fs.existsSync(filePath), `Documentation file [${file}] should exist`);
      
      const stat = fs.statSync(filePath);
      assert.ok(stat.size > 100, `Documentation file [${file}] should not be empty`);
    });
  });

  test('Markdown to MediaWiki header conversion', () => {
    const md = '# Main Title\n## Sub Title\n### Section Title';
    const expected = '== Main Title ==\n=== Sub Title ===\n==== Section Title ====';
    const result = markdownToMediaWiki(md);
    assert.strictEqual(result, expected);
  });

  test('Markdown to MediaWiki text styles (bold, italic, code, links)', () => {
    const md = 'This is **bold** text, *italic* text, and `inline code`. Here is a [link](https://example.com).';
    const expected = "This is '''bold''' text, ''italic'' text, and <code>inline code</code>. Here is a [https://example.com link].";
    const result = markdownToMediaWiki(md);
    assert.strictEqual(result, expected);
  });

  test('Markdown to MediaWiki list conversion', () => {
    const md = '* Item 1\n  * Nested Item\n1. Number 1\n  1. Nested Number';
    const expected = '* Item 1\n** Nested Item\n# Number 1\n## Nested Number';
    const result = markdownToMediaWiki(md);
    assert.strictEqual(result, expected);
  });

  test('Markdown to MediaWiki table conversion', () => {
    const md = '| Header 1 | Header 2 |\n| :--- | :--- |\n| Row 1 Col 1 | Row 1 Col 2 |';
    const expected = '{|\n! Header 1 !! Header 2\n|-\n| Row 1 Col 1 || Row 1 Col 2\n|}';
    
    const result = markdownToMediaWiki(md);
    // Since we ignore alignment row and wrap in wikitable class:
    assert.ok(result.includes('{| class="wikitable"'));
    assert.ok(result.includes('! Header 1 !! Header 2'));
    assert.ok(result.includes('Row 1 Col 1 || Row 1 Col 2'));
  });

  test('Category inclusion and metadata stripping', () => {
    const md = 'Created At: 2026-06-10\nFile Path: test.md\n# Actual Header';
    const converted = markdownToMediaWiki(md);
    
    assert.ok(!converted.includes('Created At:'));
    assert.ok(!converted.includes('File Path:'));
    assert.ok(converted.includes('== Actual Header =='));
  });

});
