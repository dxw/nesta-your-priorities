import { expect } from '@open-wc/testing';

import { YpAccessHelpers } from '../YpAccessHelpers.js';
import { YpTestHelpers } from './setup-app.js';

describe('YpAccessHelpers', () => {
  const group = { id: 5 } as YpGroupData;
  const community = { id: 7 } as YpCommunityData;
  const domain = { id: 9 } as YpDomainData;

  const emptyAdminRights = () =>
    ({
      GroupAdmins: [],
      CommunityAdmins: [],
      DomainAdmins: [],
      OrganizationAdmins: [],
    } as YpAdminRights);

  before(() => {
    YpTestHelpers.getFetchMock();
  });

  beforeEach(async () => {
    await YpTestHelpers.setupApp();
    // Pin a known baseline — YpAppUser's background admin-rights fetch can race this.
    window.appUser.user = undefined;
    window.appUser.adminRights = undefined;
  });

  describe('checkGroupAccess', () => {
    it('denies access when no user is logged in', () => {
      expect(YpAccessHelpers.checkGroupAccess(group)).to.be.false;
    });

    it('denies a logged-in user with no adminRights loaded at all', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = undefined; // reasserted to close the race noted above
      expect(YpAccessHelpers.checkGroupAccess(group)).to.be.false;
    });

    it('denies a logged-in user whose admin rights are for a different group', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = {
        ...emptyAdminRights(),
        GroupAdmins: [{ id: 999 } as YpGroupData],
      };
      expect(YpAccessHelpers.checkGroupAccess(group)).to.be.false;
    });

    it('allows a user granted admin rights on this specific group', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = {
        ...emptyAdminRights(),
        GroupAdmins: [group],
      };
      expect(YpAccessHelpers.checkGroupAccess(group)).to.be.true;
    });

    it('allows the group owner even without an explicit admin grant', () => {
      const user = YpTestHelpers.getUser();
      window.appUser.user = user;
      window.appUser.adminRights = emptyAdminRights();
      const ownedGroup = { id: 5, user_id: user.id } as YpGroupData;
      expect(YpAccessHelpers.checkGroupAccess(ownedGroup)).to.be.true;
    });
  });

  describe('checkCommunityAccess', () => {
    it('denies access when no user is logged in', () => {
      expect(YpAccessHelpers.checkCommunityAccess(community)).to.be.false;
    });

    it('denies a logged-in user with no adminRights loaded at all', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = undefined; // reasserted to close the race noted above
      expect(YpAccessHelpers.checkCommunityAccess(community)).to.be.false;
    });

    it('denies a logged-in user whose admin rights are for a different community', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = {
        ...emptyAdminRights(),
        CommunityAdmins: [{ id: 999 } as YpCommunityData],
      };
      expect(YpAccessHelpers.checkCommunityAccess(community)).to.be.false;
    });

    it('allows a user granted admin rights on this specific community', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = {
        ...emptyAdminRights(),
        CommunityAdmins: [community],
      };
      expect(YpAccessHelpers.checkCommunityAccess(community)).to.be.true;
    });

    it('allows the community owner even without an explicit admin grant', () => {
      const user = YpTestHelpers.getUser();
      window.appUser.user = user;
      window.appUser.adminRights = emptyAdminRights();
      const ownedCommunity = { id: 7, user_id: user.id } as YpCommunityData;
      expect(YpAccessHelpers.checkCommunityAccess(ownedCommunity)).to.be.true;
    });
  });

  describe('checkDomainAccess', () => {
    it('denies access when no user is logged in', () => {
      expect(YpAccessHelpers.checkDomainAccess(domain)).to.be.false;
    });

    it('denies a logged-in user with no adminRights loaded at all', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = undefined; // reasserted to close the race noted above
      expect(YpAccessHelpers.checkDomainAccess(domain)).to.be.false;
    });

    it('denies a logged-in user whose admin rights are for a different domain', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = {
        ...emptyAdminRights(),
        DomainAdmins: [{ id: 999 } as YpDomainData],
      };
      expect(YpAccessHelpers.checkDomainAccess(domain)).to.be.false;
    });

    it('allows a user granted admin rights on this specific domain', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = {
        ...emptyAdminRights(),
        DomainAdmins: [domain],
      };
      expect(YpAccessHelpers.checkDomainAccess(domain)).to.be.true;
    });

    it('allows the domain owner even without an explicit admin grant', () => {
      const user = YpTestHelpers.getUser();
      window.appUser.user = user;
      window.appUser.adminRights = emptyAdminRights();
      const ownedDomain = { id: 9, user_id: user.id } as YpDomainData;
      expect(YpAccessHelpers.checkDomainAccess(ownedDomain)).to.be.true;
    });
  });

  describe('undefined collection (e.g. blocked/not-yet-loaded fetch)', () => {
    it('treats a missing group as inaccessible rather than throwing', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = emptyAdminRights();
      expect(() =>
        YpAccessHelpers.checkGroupAccess(undefined as unknown as YpGroupData)
      ).to.not.throw();
      expect(
        YpAccessHelpers.checkGroupAccess(undefined as unknown as YpGroupData)
      ).to.be.false;
    });

    it('treats a missing community as inaccessible rather than throwing', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = emptyAdminRights();
      expect(
        YpAccessHelpers.checkCommunityAccess(
          undefined as unknown as YpCommunityData
        )
      ).to.be.false;
    });

    it('treats a missing domain as inaccessible rather than throwing', () => {
      window.appUser.user = YpTestHelpers.getUser();
      window.appUser.adminRights = emptyAdminRights();
      expect(
        YpAccessHelpers.checkDomainAccess(undefined as unknown as YpDomainData)
      ).to.be.false;
    });
  });
});
