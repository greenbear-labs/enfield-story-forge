import { FirebaseError } from 'firebase/app';
import { describe, expect, it, vi } from 'vitest';
import { authErrorMessage } from './authActions';

describe('authErrorMessage', () => {
  it('stays quiet when the popup is closed', () => {
    expect(authErrorMessage(new FirebaseError('auth/popup-closed-by-user', ''))).toBeNull();
  });

  it('explains known errors and names the code of unknown ones', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(authErrorMessage(new FirebaseError('auth/unauthorized-domain', ''))).toMatch(
      /isn’t allowed on this web address/,
    );
    expect(authErrorMessage(new FirebaseError('auth/internal-error', ''))).toMatch(
      /\(auth\/internal-error\)/,
    );
  });
});
