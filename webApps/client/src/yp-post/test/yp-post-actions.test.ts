import { html, fixture, expect, aTimeout } from '@open-wc/testing';

import { YpPostActions } from '../yp-post-actions.js';
import '../yp-post-actions.js';
import { YpTestHelpers } from '../../common/test/setup-app.js';


describe('YpPostActions', () => {
  let element: YpPostActions;
  let fetchMock: any;

  before(async () => {
    fetchMock = YpTestHelpers.getFetchMock();
    await YpTestHelpers.setupApp();
  });

  beforeEach(async () => {
    element = await fixture(html`
      <yp-post-actions
        .post="${YpTestHelpers.getPost()}"
      ></yp-post-actions>
      ${YpTestHelpers.renderCommonHeader()}
    `);
    await aTimeout(100);
  });

  it('passes the a11y audit', async () => {
    debugger;
    await expect(element).shadowDom.to.be.accessible();
  });

  it('tries anonymous login before prompting when casting a vote', async () => {
    const calls: string[] = [];
    const appUser = window.appUser as any;
    const serverApi = window.serverApi as any;
    const originalEnsureLoginChecked = appUser.ensureLoginChecked;
    const originalSilentAnonymousLogin = appUser.silentAnonymousLoginIfAllowed;
    const originalLoggedIn = appUser.loggedIn;
    const originalLoginForEndorse = appUser.loginForEndorse;
    const originalFingerprintData = appUser.getBrowserFingerprintData;
    const originalEndorsePost = serverApi.endorsePost;

    try {
      appUser.ensureLoginChecked = async () => {
        calls.push('ensureLoginChecked');
        return false;
      };
      appUser.silentAnonymousLoginIfAllowed = async (group: YpGroupData) => {
        calls.push('silentAnonymousLoginIfAllowed');
        expect(group).to.equal(element.post.Group);
        return true;
      };
      appUser.loggedIn = () => false;
      appUser.loginForEndorse = () => calls.push('loginForEndorse');
      appUser.getBrowserFingerprintData = async () => ({});
      serverApi.endorsePost = async () => {
        calls.push('endorsePost');
        return undefined;
      };

      await element.generateEndorsement(1);

      expect(calls).to.deep.equal([
        'ensureLoginChecked',
        'silentAnonymousLoginIfAllowed',
        'endorsePost',
      ]);
    } finally {
      appUser.ensureLoginChecked = originalEnsureLoginChecked;
      appUser.silentAnonymousLoginIfAllowed = originalSilentAnonymousLogin;
      appUser.loggedIn = originalLoggedIn;
      appUser.loginForEndorse = originalLoginForEndorse;
      appUser.getBrowserFingerprintData = originalFingerprintData;
      serverApi.endorsePost = originalEndorsePost;
    }
  });

   it('checks if you are logged in before prompting when casting a vote', async () => {
  	const calls: string[] = [];
    const appUser = window.appUser as any;
    const serverApi = window.serverApi as any;
    const originalEnsureLoginChecked = appUser.ensureLoginChecked;
    const originalSilentAnonymousLogin = appUser.silentAnonymousLoginIfAllowed;
    const originalLoggedIn = appUser.loggedIn;
    const originalLoginForEndorse = appUser.loginForEndorse;
    const originalFingerprintData = appUser.getBrowserFingerprintData;
    const originalEndorsePost = serverApi.endorsePost;
    try {
      appUser.ensureLoginChecked = async () => {
        calls.push('ensureLoginChecked');
        return true;
      };
      appUser.loginForEndorse = () => calls.push('loginForEndorse');
      appUser.getBrowserFingerprintData = async () => ({});
      serverApi.endorsePost = async () => {
        calls.push('endorsePost');
        return undefined;
      };

      await element.generateEndorsement(1);

      expect(calls).to.deep.equal([
        'ensureLoginChecked',
        'endorsePost',
      ]);
    } finally {
      appUser.ensureLoginChecked = originalEnsureLoginChecked;
      appUser.silentAnonymousLoginIfAllowed = originalSilentAnonymousLogin;
      appUser.loggedIn = originalLoggedIn;
      appUser.loginForEndorse = originalLoginForEndorse;
      appUser.getBrowserFingerprintData = originalFingerprintData;
      serverApi.endorsePost = originalEndorsePost;
    }
  });
});
