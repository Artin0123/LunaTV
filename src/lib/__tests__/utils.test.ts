/**
 * @jest-environment jsdom
 */

import { cleanHtmlTags } from '../utils';

describe('cleanHtmlTags', () => {
  it('removes HTML tags and replaces with newlines', () => {
    expect(cleanHtmlTags('<p>Hello</p><p>World</p>')).toBe('Hello\nWorld');
  });

  it('decodes HTML entities', () => {
    expect(cleanHtmlTags('Tom &amp; Jerry')).toBe('Tom & Jerry');
  });

  it('decodes &lt; and &gt;', () => {
    expect(cleanHtmlTags('1 &lt; 2 &gt; 0')).toBe('1 < 2 > 0');
  });

  it('decodes &quot; and &#39;', () => {
    expect(cleanHtmlTags('&quot;hello&quot; &#39;world&#39;')).toBe(
      '"hello" \'world\'',
    );
  });

  it('collapses multiple newlines', () => {
    expect(cleanHtmlTags('<p></p><p></p><p>Content</p>')).toBe('Content');
  });

  it('collapses multiple spaces', () => {
    expect(cleanHtmlTags('Hello     World')).toBe('Hello World');
  });

  it('handles empty string', () => {
    expect(cleanHtmlTags('')).toBe('');
  });

  it('handles null/undefined-like input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(cleanHtmlTags(null as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(cleanHtmlTags(undefined as any)).toBe('');
  });

  it('handles plain text without tags', () => {
    expect(cleanHtmlTags('Just plain text')).toBe('Just plain text');
  });

  it('handles complex HTML with nested tags', () => {
    const input = '<div><span>Episode 1</span><br/><em>Subtitle</em></div>';
    const result = cleanHtmlTags(input);
    expect(result).toContain('Episode 1');
    expect(result).toContain('Subtitle');
    expect(result).not.toContain('<');
  });
});
