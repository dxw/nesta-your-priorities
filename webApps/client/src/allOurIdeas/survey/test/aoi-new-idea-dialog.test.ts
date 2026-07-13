import { html, fixture, expect, aTimeout } from '@open-wc/testing';

import { AoiNewIdeaDialog } from '../aoi-new-idea-dialog.js';
import '../aoi-new-idea-dialog.js';
import { YpTestHelpers } from '../../../common/test/setup-app.js';

describe('AoiNewIdeaDialog', () => {
  let element: AoiNewIdeaDialog;
  let fetchMock: any;

  before(async () => {
    fetchMock = YpTestHelpers.getFetchMock();
    await YpTestHelpers.setupApp();
  });

  beforeEach(async () => {
    element = await fixture(html`
      ${YpTestHelpers.renderCommonHeader()}
      <aoi-new-idea-dialog></aoi-new-idea-dialog>
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
  // - submitIdea()
  // - reset()
  // - close()
  // - textAreaKeyDownIdea()
  // - generateAiIcon()
});
