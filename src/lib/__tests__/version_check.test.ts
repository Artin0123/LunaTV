/**
 * version_check.test.ts
 *
 * Tests for compareVersions (pure function, no network).
 * We mock CURRENT_VERSION via jest.mock.
 */

// Mock version module to control CURRENT_VERSION
jest.mock('@/lib/version', () => ({
  CURRENT_VERSION: '100.0.3',
}));

import { compareVersions, UpdateStatus } from '../version_check';

describe('compareVersions', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // CURRENT_VERSION is mocked as '100.0.3'

  it('returns NO_UPDATE when versions are equal', () => {
    expect(compareVersions('100.0.3')).toBe(UpdateStatus.NO_UPDATE);
  });

  it('returns HAS_UPDATE when remote major is higher', () => {
    expect(compareVersions('101.0.0')).toBe(UpdateStatus.HAS_UPDATE);
  });

  it('returns HAS_UPDATE when remote minor is higher', () => {
    expect(compareVersions('100.1.0')).toBe(UpdateStatus.HAS_UPDATE);
  });

  it('returns HAS_UPDATE when remote patch is higher', () => {
    expect(compareVersions('100.0.4')).toBe(UpdateStatus.HAS_UPDATE);
  });

  it('returns NO_UPDATE when remote version is lower', () => {
    expect(compareVersions('100.0.2')).toBe(UpdateStatus.NO_UPDATE);
    expect(compareVersions('99.9.9')).toBe(UpdateStatus.NO_UPDATE);
  });

  it('handles versions with fewer than 3 parts', () => {
    // '101' should be treated as '101.0.0' > '100.0.3'
    expect(compareVersions('101')).toBe(UpdateStatus.HAS_UPDATE);
    // '100.0' should be treated as '100.0.0' < '100.0.3'
    expect(compareVersions('100.0')).toBe(UpdateStatus.NO_UPDATE);
  });

  it('handles versions with more than 3 parts', () => {
    // '100.0.4.1' should be treated as '100.0.4' > '100.0.3'
    expect(compareVersions('100.0.4.1')).toBe(UpdateStatus.HAS_UPDATE);
  });

  it('falls back to string comparison for invalid format', () => {
    // 'abc' is not a valid version, should fall back
    expect(compareVersions('abc')).toBe(UpdateStatus.HAS_UPDATE);
  });
});
