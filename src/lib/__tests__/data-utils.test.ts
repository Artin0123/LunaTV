import { ensureString, ensureStringArray } from '../data-utils';

describe('ensureString', () => {
  it('converts number to string', () => {
    expect(ensureString(42)).toBe('42');
  });

  it('converts boolean to string', () => {
    expect(ensureString(true)).toBe('true');
    expect(ensureString(false)).toBe('false');
  });

  it('preserves string input', () => {
    expect(ensureString('hello')).toBe('hello');
  });

  it('converts null to string', () => {
    expect(ensureString(null)).toBe('null');
  });

  it('converts undefined to string', () => {
    expect(ensureString(undefined)).toBe('undefined');
  });

  it('converts object to string', () => {
    expect(ensureString({})).toBe('[object Object]');
  });
});

describe('ensureStringArray', () => {
  it('converts number array to string array', () => {
    expect(ensureStringArray([1, 2, 3])).toEqual(['1', '2', '3']);
  });

  it('converts mixed array to string array', () => {
    expect(ensureStringArray([1, 'two', true, null])).toEqual([
      '1',
      'two',
      'true',
      'null',
    ]);
  });

  it('handles empty array', () => {
    expect(ensureStringArray([])).toEqual([]);
  });

  it('preserves string array', () => {
    expect(ensureStringArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
