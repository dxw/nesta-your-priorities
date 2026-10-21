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

  it('shows a submitted toast and does not list a point queued for moderation', async () => {
    const toast: any = {};
    const originalAppDialogs = window.appDialogs;
    window.appDialogs = {
      getDialogAsync: (name: string, callback: Function) => {
        if (name === 'masterToast') callback(toast);
      },
    } as any;
    const counterBefore = element.post.counter_points;
    let insertedPoint = false;
    element._insertNewPoint = async () => { insertedPoint = true; };

    try {
      element._completeNewPointResponse({
        id: 99,
        value: 1,
        content: 'Awaiting review',
        status: 'in_moderation_queue',
      } as YpPointData);
    } finally {
      window.appDialogs = originalAppDialogs;
    }

    expect(insertedPoint).to.be.false;
    expect(element.post.counter_points).to.equal(counterBefore);
    expect(toast.open).to.be.true;
    expect(toast.labelText).to.equal(element.t('point.submittedForModeration'));
    expect(element.addPointDisabled).to.be.false;
  });
});
