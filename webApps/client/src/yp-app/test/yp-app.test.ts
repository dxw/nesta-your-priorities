import { html, fixture, expect, aTimeout } from '@open-wc/testing';

import { YpApp } from '../yp-app.js';
import '../yp-app.js';
import { YpTestHelpers } from '../../common/test/setup-app.js';
import {
  OPTIONAL_COOKIE_CONSENT_EVENT,
  OPTIONAL_COOKIE_CONSENT_KEY,
} from '../../yp-landing-page/yp-landing-page-content.js';

describe('YpApp', () => {
  let element: YpApp;
  let fetchMock: any;
  const cookieNoticeKey = 'yp-cookie-notice-dismissed';

  before(async () => {
    fetchMock = YpTestHelpers.getFetchMock();
    await YpTestHelpers.setupApp();
  });

  beforeEach(async () => {
    localStorage.setItem(cookieNoticeKey, '1');

    element = await fixture(html`
      ${YpTestHelpers.renderCommonHeader()}
      <yp-app

      ></yp-app>
    `);
    await aTimeout(100);
  });

  afterEach(() => {
    localStorage.removeItem(cookieNoticeKey);
    localStorage.removeItem(OPTIONAL_COOKIE_CONSENT_KEY);
  });

  it('passes the a11y audit', async () => {
    debugger;
    await expect(element).shadowDom.to.be.accessible();
  });

  it('shows the cookie notice until it is dismissed', async () => {
    localStorage.removeItem(cookieNoticeKey);
    await element._showCookieNotice();

    const dialog = element.shadowRoot?.querySelector('#cookieNotice') as any;
    expect(dialog.open).to.equal(true);
    (dialog.querySelector('#cookieNoticeDismiss') as HTMLElement).click();
    await aTimeout(0);

    expect(dialog.open).to.equal(false);
    expect(localStorage.getItem(cookieNoticeKey)).to.equal('1');
  });

  it('does not prevent Escape while the cookie notice is open', async () => {
    localStorage.removeItem(cookieNoticeKey);
    await element._showCookieNotice();

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    });
    element._handleKeyDown(event);

    expect(event.defaultPrevented).to.equal(false);
  });

  it('persists and broadcasts optional-cookie acceptance', () => {
    let receivedConsent = false;
    const onConsent = (event: Event) => {
      receivedConsent = (event as CustomEvent).detail === true;
    };
    document.addEventListener(OPTIONAL_COOKIE_CONSENT_EVENT, onConsent);

    (element.shadowRoot?.querySelector('#cookieNoticeAccept') as HTMLElement).click();

    expect(localStorage.getItem(OPTIONAL_COOKIE_CONSENT_KEY)).to.equal('accepted');
    expect(receivedConsent).to.equal(true);
    document.removeEventListener(OPTIONAL_COOKIE_CONSENT_EVENT, onConsent);
  });

  it('reopens cookie preferences after the initial notice was dismissed', async () => {
    expect(localStorage.getItem(cookieNoticeKey)).to.equal('1');

    await element.openCookiePreferences();

    const dialog = element.shadowRoot?.querySelector('#cookieNotice') as any;
    expect(dialog.open).to.equal(true);
  });

  describe('restricted routes', () => {
    let originalUrl: string;
    let originalEnsureLoginChecked: typeof window.appUser.ensureLoginChecked;
    let originalGetAdminRights: typeof window.appUser.getAdminRights;
    let originalRoutePageChanged: typeof element._routePageChanged;

    beforeEach(() => {
      originalUrl = window.location.href;
      originalEnsureLoginChecked = window.appUser.ensureLoginChecked;
      originalGetAdminRights = window.appUser.getAdminRights;
      originalRoutePageChanged = element._routePageChanged;
      element._routePageChanged = () => {};
      window.appUser.ensureLoginChecked = async () => true;
      window.appUser.getAdminRights = async () => {
        window.appUser.adminRights = undefined;
      };
    });

    afterEach(() => {
      window.history.replaceState({}, '', originalUrl);
      window.appUser.ensureLoginChecked = originalEnsureLoginChecked;
      window.appUser.getAdminRights = originalGetAdminRights;
      element._routePageChanged = originalRoutePageChanged;
    });

    for (const path of ['/admin', '/admin/group/1', '/user/1']) {
      it(`shows Not Found to a non-admin at ${path}`, async () => {
        window.history.replaceState({}, '', path);

        await element.updateLocation();

        expect((element as any).routeNotFound).to.be.true;
      });
    }

    it('does not require admin rights for public login', async () => {
      window.history.replaceState({}, '', '/user/login');
      let adminRightsCheckCount = 0;
      window.appUser.getAdminRights = async () => {
        adminRightsCheckCount += 1;
      };

      await element.updateLocation();

      expect((element as any).routeNotFound).to.be.false;
      expect(adminRightsCheckCount).to.equal(0);
    });

    it('passes query-string tokens to the password reset dialog', () => {
      const originalUrl = window.location.href;
      const originalRoute = element.route;
      const originalRouteData = element.routeData;
      const originalOpenResetPasswordDialog = element.openResetPasswordDialog;
      let receivedToken: string | undefined;

      try {
        window.history.replaceState(
          {},
          '',
          '/user/reset_password?reset_password_token=test-token'
        );
        element.route = '/user/reset_password';
        element.routeData = { page: 'user' };
        element.openResetPasswordDialog = (token: string) => {
          receivedToken = token;
        };

        element._routePageChanged({});

        expect(receivedToken).to.equal('test-token');
      } finally {
        window.history.replaceState({}, '', originalUrl);
        element.route = originalRoute;
        element.routeData = originalRouteData;
        element.openResetPasswordDialog = originalOpenResetPasswordDialog;
      }
    });
  });

  for (const page of ['domain', 'community', 'community_folder', 'group', 'post', 'user']) {
    it(`scrolls to the top when returning home from ${page}`, async () => {
      const originalScrollTo = window.scrollTo;
      const originalScrollRestoration = window.history.scrollRestoration;
      const scrollCalls: unknown[][] = [];
      window.scrollTo = ((...args: unknown[]) => {
        scrollCalls.push(args);
      }) as typeof window.scrollTo;

      try {
        element._scrollPositionMap = { '': 800 };
        element.route = '/';
        element.subRoute = '';
        element.routeData = { page: '' };
        element._routePageChanged({ page });
        await element.updateComplete;
        await aTimeout(50);

        expect(scrollCalls).to.deep.equal([
          [{ top: 0, left: 0, behavior: 'instant' }],
        ]);
        expect(window.history.scrollRestoration).to.equal('manual');
      } finally {
        window.scrollTo = originalScrollTo;
        window.history.scrollRestoration = originalScrollRestoration;
      }
    });
  }
});
