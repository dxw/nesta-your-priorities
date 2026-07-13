import { html, fixture, expect, aTimeout } from '@open-wc/testing';

import { PlausibleRealtime } from '../pl-realtime.js';
import '../pl-realtime.js';
import { YpTestHelpers } from '../../../common/test/setup-app.js';

describe('PlausibleRealtime', () => {
  let element: PlausibleRealtime;
  let fetchMock: any;

  before(async () => {
    fetchMock = YpTestHelpers.getFetchMock();
    await YpTestHelpers.setupApp();
  });

  beforeEach(async () => {
    element = await fixture(html`
      ${YpTestHelpers.renderCommonHeader()}
      <pl-realtime></pl-realtime>
    `);

    await aTimeout(100);
  });

  it('renders the component', async () => {
    expect(element).to.exist;
    expect(element.shadowRoot).to.exist;
  });

  it('passes the a11y audit', async () => {
    await expect(element).shadowDom.to.be.accessible();
  });

  // TODO: Add targeted behavior tests for:
  // - renderConversions()
});
