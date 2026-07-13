import { html, fixture, expect, aTimeout } from '@open-wc/testing';

import { YpAppNavDrawer } from '../yp-app-nav-drawer.js';
import '../yp-app-nav-drawer.js';
import { YpTestHelpers } from '../../common/test/setup-app.js';

describe('YpAppNavDrawer', () => {
  let element: YpAppNavDrawer;
  let fetchMock: any;

  before(async () => {
    fetchMock = YpTestHelpers.getFetchMock();
    await YpTestHelpers.setupApp();
  });

  beforeEach(async () => {
    element = await fixture(html`
      ${YpTestHelpers.renderCommonHeader()}
      <yp-app-nav-drawer></yp-app-nav-drawer>
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
  // - _closeAllDrawers()
  // - getGroupTypeName()
  // - _openChanged()
  // - _selectedLocale()
});
