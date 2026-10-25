import { html, fixture, expect, aTimeout } from '@open-wc/testing';

import { YpPostPoints } from '../yp-post-points.js';
import '../yp-post-points.js';
import { YpTestHelpers } from '../../common/test/setup-app.js';

describe('YpPostPoints', () => {
  let element: YpPostPoints;
  let fetchMock: any;

  before(async () => {
    fetchMock = YpTestHelpers.getFetchMock();
    await YpTestHelpers.setupApp();

    const pointsResponse = {
      count: 0,
      points: [
        {
          id: 1,
          content: "okokok",
          created_at: new Date(),
          counter_quality_up: 1,
          counter_quality_down: 2,
          public_data: {},
          value: -1,

          PointRevisions: [
            {
              id: 1,
              content: "jokoko",
            }
          ]
        },
        {
          id: 2,
          counter_quality_up: 1,
          counter_quality_down: 2,
          created_at: new Date().toISOString(),
          public_data: {},
          content: "oko1kok",
          value: 1,
          PointRevisions: [
            {
              id: 2,
              content: "jok1oko"
            }
          ]
        },
        {
          id: 3,
          counter_quality_up: 1,
          counter_quality_down: 4,
          created_at: new Date().toISOString(),
          public_data: {},
          content: "oko1kok",
          value: -1,
          PointRevisions: [
            {
              id: 3,
              content: "jok1oko"
            }
          ]
        }
      ]
    } as YpGetPointsResponse

    fetchMock.get('/api/posts/1/points',pointsResponse, YpTestHelpers.fetchMockConfig);
  });


  beforeEach(async () => {
    element = await fixture(html`
      <yp-post-points
        .post="${YpTestHelpers.getPost()}"
      ></yp-post-points>
    `);
    await aTimeout(100);
  });

  it('passes the a11y audit', async () => {
    debugger;
    await expect(element).shadowDom.to.be.accessible();
  });

  describe('addPoint when not logged in', () => {
    let originalAppUser: any;
    let originalAddPoint: any;
    let addPointCalls: Array<unknown>;
    let loginForNewPointCalls: Array<unknown>;

    const stubAppUser = (silentLoginSucceeds: boolean) => {
      window.appUser = {
        ensureLoginChecked: async () => false,
        loggedIn: () => false,
        silentAnonymousLoginIfAllowed: async () => silentLoginSucceeds,
        getBrowserFingerprintData: async () => ({}),
        loginForNewPoint: (...args: Array<unknown>) => {
          loginForNewPointCalls.push(args);
        },
      } as any;
    };

    beforeEach(async () => {
      // Omits renderCommonHeader() so the fixture root is <yp-post-points> itself.
      element = await fixture(html`
        <yp-post-points .post="${YpTestHelpers.getPost()}"></yp-post-points>
      `);
      originalAppUser = window.appUser;
      originalAddPoint = window.serverApi.addPoint;
      addPointCalls = [];
      loginForNewPointCalls = [];
      window.serverApi.addPoint = (async (...args: Array<unknown>) => {
        addPointCalls.push(args);
        return { id: 99 } as YpPointData;
      }) as any;
      (element as any)._preProcessPoints = (points: Array<YpPointData>) => points;
      (element as any)._completeNewPointResponse = () => {};
    });

    afterEach(() => {
      window.appUser = originalAppUser;
      window.serverApi.addPoint = originalAddPoint;
    });

    it('submits the point without the login popup when silent anonymous login succeeds', async () => {
      stubAppUser(true);

      await element.addPoint('A typed point', 1, undefined, undefined);

      expect(addPointCalls.length).to.equal(1);
      expect(loginForNewPointCalls.length).to.equal(0);
    });

    it('shows the login popup with the typed point when silent anonymous login is not allowed', async () => {
      stubAppUser(false);

      await element.addPoint('A typed point', -1, undefined, undefined);

      expect(addPointCalls.length).to.equal(0);
      expect(loginForNewPointCalls.length).to.equal(1);
      expect((loginForNewPointCalls[0] as Array<unknown>)[1]).to.deep.equal({
        content: 'A typed point',
        value: -1,
      });
    });
  });
});
