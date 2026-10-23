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
    `);
    await aTimeout(100);
  });

  describe('group vote limits', () => {
    let originalUserState: any;
    let originalDialogs: typeof window.appDialogs;
    let originalEndorsePost: typeof window.serverApi.endorsePost;
    let requests: { value: number; method: string }[];

    beforeEach(async () => {
      const appUser = window.appUser;
      originalUserState = {
        user: appUser.user,
        endorsementPostsIndex: appUser.endorsementPostsIndex,
        groupCurrentVoteCountIndex: appUser.groupCurrentVoteCountIndex,
        ensureLoginChecked: appUser.ensureLoginChecked,
        getBrowserFingerprintData: appUser.getBrowserFingerprintData,
      };
      originalDialogs = window.appDialogs;
      originalEndorsePost = window.serverApi.endorsePost;
      window.appDialogs = {
        getDialogAsync: (_name: string, callback: Function) => callback({}),
      } as unknown as typeof window.appDialogs;
      appUser.user = { ...YpTestHelpers.getUser(), Endorsements: [] };
      appUser.endorsementPostsIndex = {};
      appUser.groupCurrentVoteCountIndex = {};
      appUser.ensureLoginChecked = async () => true;
      appUser.getBrowserFingerprintData = async () => ({});
      requests = [];
      window.serverApi.endorsePost = async (_postId, method, body) => {
        requests.push({ value: body.value as number, method });
        return undefined;
      };
      const post = YpTestHelpers.getPost();
      post.Group.configuration.maxNumberOfGroupVotes = 1;
      element.post = post;
      await element.updateComplete;
    });

    afterEach(() => {
      Object.assign(window.appUser, originalUserState);
      window.appDialogs = originalDialogs;
      window.serverApi.endorsePost = originalEndorsePost;
    });

    const endorsement = (postId: number, value = 1) => ({
      post_id: postId,
      value,
      Post: { group_id: element.post.Group.id },
    } as YpEndorsement);

    it('updates and releases the button limit when votes on other posts change', async () => {
      window.appUser.updateEndorsementForPost(2, endorsement(2), element.post.Group);
      await aTimeout(20);
      await element.updateComplete;
      expect(element.numberOfGroupVotes).to.equal(1);
      expect(element.votingStateDisabled).to.equal(true);

      window.appUser.updateEndorsementForPost(2, endorsement(2, 0), element.post.Group);
      await aTimeout(20);
      await element.updateComplete;
      expect(element.numberOfGroupVotes).to.equal(0);
      expect(element.votingStateDisabled).to.equal(false);
    });

    it('rejects a new upvote at the limit even before count events arrive', async () => {
      window.appUser.user!.Endorsements = [endorsement(2)];
      element.allDisabled = true;
      await element.generateEndorsement(1);
      expect(requests).to.deep.equal([]);
      expect(element.allDisabled).to.equal(false);
    });

    it('allows withdrawing an existing upvote at the limit', async () => {
      window.appUser.user!.Endorsements = [endorsement(element.post.id)];
      element.endorseValue = 1;
      await element.generateEndorsement(1);
      expect(requests).to.deep.equal([{ value: 1, method: 'DELETE' }]);
    });

    it('allows downvotes at the limit but blocks converting one to an upvote', async () => {
      window.appUser.user!.Endorsements = [endorsement(2)];
      element.numberOfGroupVotes = 1;
      await element.updateComplete;
      const downButton = element.shadowRoot!.querySelector('#actionDown md-filled-icon-button') as HTMLElement & { disabled: boolean };
      expect(downButton.disabled).to.equal(false);
      await element.generateEndorsement(-1);
      element.endorseValue = -1;
      await element.generateEndorsement(1);
      expect(requests).to.deep.equal([{ value: -1, method: 'POST' }]);
    });

    it('counts only upvotes in the current group', async () => {
      window.appUser.user!.Endorsements = [
        endorsement(2, -1),
        endorsement(3, 0),
        { ...endorsement(4), Post: { group_id: element.post.Group.id + 1 } } as YpEndorsement,
      ];
      await element.generateEndorsement(1);
      expect(requests).to.deep.equal([{ value: 1, method: 'POST' }]);
    });

    it('checks the limit after login has loaded existing votes', async () => {
      window.appUser.ensureLoginChecked = async () => {
        window.appUser.user!.Endorsements = [endorsement(2)];
        return true;
      };
      await element.generateEndorsement(1);
      expect(requests).to.deep.equal([]);
    });

    it('rechecks the limit after fingerprint preparation', async () => {
      window.appUser.getBrowserFingerprintData = async () => {
        window.appUser.user!.Endorsements = [endorsement(2)];
        return {};
      };
      await element.generateEndorsement(1);
      expect(requests).to.deep.equal([]);
    });

    it('does not impose a quota when the limit is unset', async () => {
      element.post.Group.configuration.maxNumberOfGroupVotes = undefined;
      window.appUser.user!.Endorsements = [endorsement(2)];
      await element.generateEndorsement(1);
      expect(requests).to.deep.equal([{ value: 1, method: 'POST' }]);
    });
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
