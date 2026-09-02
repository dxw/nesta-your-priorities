import { html, fixture, expect, aTimeout } from '@open-wc/testing';

import { YpPostEdit } from '../yp-post-edit.js';
import '../yp-post-edit.js';
import { YpTestHelpers } from '../../common/test/setup-app.js';

describe('YpPostEdit', () => {
  let element: YpPostEdit;
  let fetchMock: any;

  before(async () => {
    fetchMock = YpTestHelpers.getFetchMock();
    await YpTestHelpers.setupApp();
  });

  beforeEach(async () => {
    element = await fixture(html`
      <yp-post-edit
        .group="${YpTestHelpers.getGroup()}"
        .post="${YpTestHelpers.getPost()}"
      ></yp-post-edit>
      ${YpTestHelpers.renderCommonHeader()}
    `);
    await aTimeout(100);
    element.open(true, {})
  });

  it('passes the a11y audit', async () => {
    debugger;
    await expect(element).shadowDom.to.be.accessible();
  });
});

describe('YpPostEdit thank you screen', () => {
  let element: YpPostEdit;

  before(async () => {
    await YpTestHelpers.setupApp();
  });

  beforeEach(async () => {
    // Fixture intentionally omits YpTestHelpers.renderCommonHeader() so the
    // fixture root is the <yp-post-edit> element itself, not one of the
    // header's <link> tags.
    element = await fixture(html`
      <yp-post-edit
        .group="${YpTestHelpers.getGroup()}"
        .post="${YpTestHelpers.getPost()}"
        newPost
      ></yp-post-edit>
    `);
    await aTimeout(100);
  });

  it('shows a thank you message with actions after a new post submission', async () => {
    element.submissionCompleted = true;
    element.thankYouMessage = 'Thank you for adding content';
    await element.updateComplete;

    const thankYouMessage = element.shadowRoot!.querySelector('.thankYouMessage');
    expect(thankYouMessage).to.exist;
    expect(thankYouMessage!.textContent).to.contain('Thank you for adding content');

    const buttons = element.shadowRoot!.querySelectorAll(
      '.thankYouActions md-filled-button, .thankYouActions md-outlined-button'
    );
    expect(buttons.length).to.equal(2);

    await expect(element).shadowDom.to.be.accessible();
  });

  it('returns to the form when submitting another idea, without leftover content', async () => {
    element.submissionCompleted = true;
    element.thankYouMessage = 'Thank you for adding content';
    element.post = { ...YpTestHelpers.getPost(), name: 'Submitted idea name' };
    await element.updateComplete;

    (element as any)._submitAnotherIdea();
    await element.updateComplete;

    expect(element.submissionCompleted).to.be.false;
    expect(element.shadowRoot!.querySelector('.thankYouMessage')).to.not.exist;
    expect(element.post?.name).to.equal('');
  });

  it('does not clear the thank you state as a side effect of clear() (e.g. right after a successful submission)', async () => {
    element.submissionCompleted = true;
    element.thankYouMessage = 'Thank you for adding content';
    await element.updateComplete;

    element.clear();
    await element.updateComplete;

    expect(element.submissionCompleted).to.be.true;
    expect(element.thankYouMessage).to.equal('Thank you for adding content');
  });

  it('resets the thank you state when the component reconnects, e.g. navigating away and back', async () => {
    element.submissionCompleted = true;
    element.thankYouMessage = 'Thank you for adding content';
    element.disableDialog = true;
    await element.updateComplete;

    element.connectedCallback();

    expect(element.submissionCompleted).to.be.false;
    expect(element.thankYouMessage).to.be.undefined;
  });

  it('shows the thank you screen after the full successful-submission response chain (customRedirect then clear)', async () => {
    const post = { ...YpTestHelpers.getPost(), id: 999, name: 'New idea' };

    (element as any).customRedirect(post);
    element.clear();
    await element.updateComplete;

    expect(element.submissionCompleted).to.be.true;
    expect(element.shadowRoot!.querySelector('.thankYouMessage')).to.exist;
  });

  it('resets submitDisabled, validationErrorMessage and structured answers via clear(), e.g. on reconnect', async () => {
    element.submitDisabled = true;
    element.validationErrorMessage = 'Some previous error';
    element.structuredAnswersJson = '[{"foo":"bar"}]';
    element.structuredAnswersString = 'foo';
    await element.updateComplete;

    element.clear();
    await element.updateComplete;

    expect(element.submitDisabled).to.be.false;
    expect(element.validationErrorMessage).to.be.undefined;
    expect(element.structuredAnswersJson).to.equal('');
    expect(element.structuredAnswersString).to.equal('');
  });

  it('does not accumulate the submit action url across repeated submissions', async () => {
    element.params = { groupId: 1 };
    const form = element.shadowRoot!.querySelector('#form') as any;
    form.validate = () => true;
    form.submit = () => {};

    await element.submit();
    expect(element.action).to.equal('/posts/1');

    await element.submit();
    expect(element.action).to.equal('/posts/1');
  });
});
