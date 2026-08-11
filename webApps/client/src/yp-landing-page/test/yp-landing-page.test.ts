import { html, fixture, expect, aTimeout } from '@open-wc/testing';

import { YpLandingPage } from '../yp-landing-page.js';
import '../yp-landing-page.js';
import { YpTestHelpers } from '../../common/test/setup-app.js';
import { YpNavHelpers } from '../../common/YpNavHelpers.js';

const SECTIONS = [
  { id: 'get-involved', navLabel: 'Get Involved', heading: 'Get Involved' },
  { id: 'about-us', navLabel: 'About Us', heading: 'About Us' },
  { id: 'faqs', navLabel: 'FAQs', heading: 'FAQs' },
];

describe('YpLandingPage', () => {
  let element: YpLandingPage;
  let fetchMock: any;
  let redirectedTo: string[];
  let originalRedirectTo: typeof YpNavHelpers.redirectTo;

  before(async () => {
    fetchMock = YpTestHelpers.getFetchMock();
    await YpTestHelpers.setupApp();
  });

  beforeEach(async () => {
    originalRedirectTo = YpNavHelpers.redirectTo;
    redirectedTo = [];
    YpNavHelpers.redirectTo = (path: string) => {
      redirectedTo.push(path);
    };

    // Avoid a real analytics/activity network call firing on every click.
    window.appGlobals.activity = () => {};
    window.appGlobals.domain = YpTestHelpers.getDomain();

    element = await fixture(html`<yp-landing-page></yp-landing-page>`);
    await aTimeout(50);
  });

  afterEach(() => {
    YpNavHelpers.redirectTo = originalRedirectTo;
  });

  function getNavButton(navLabel: string): HTMLElement {
    const button = Array.from(
      element.shadowRoot!.querySelectorAll('.navLinks md-text-button')
    ).find((el) => el.textContent?.trim() === navLabel) as HTMLElement | undefined;
    expect(button, `nav button "${navLabel}" should exist`).to.exist;
    return button!;
  }

  it('passes the a11y audit', async () => {
    await expect(element).shadowDom.to.be.accessible();
  });

  describe('navigation bar', () => {
    it('is always rendered and visible', () => {
      const nav = element.shadowRoot!.querySelector('nav.nav');
      expect(nav, 'nav bar should exist').to.exist;

      const navStyle = getComputedStyle(nav as Element);
      expect(navStyle.display).to.not.equal('none');
      expect(navStyle.visibility).to.not.equal('hidden');
    });

    it('stays pinned to the top of the viewport while scrolling', () => {
      const nav = element.shadowRoot!.querySelector('nav.nav') as Element;
      const navStyle = getComputedStyle(nav);
      expect(navStyle.position).to.equal('sticky');
      expect(navStyle.top).to.equal('0px');
    });

    SECTIONS.forEach(({ id, navLabel }) => {
      it(`scrolls to the "${navLabel}" section when its nav button is clicked`, () => {
        const section = element.shadowRoot!.querySelector(
          `#${id}`
        ) as HTMLElement;
        expect(section, `#${id} should exist`).to.exist;

        let scrolledIntoView = false;
        section.scrollIntoView = () => {
          scrolledIntoView = true;
        };

        getNavButton(navLabel).click();

        expect(scrolledIntoView).to.be.true;
      });
    });
  });

  describe('"Share your idea" button', () => {
    [YpTestHelpers.getDomain(), undefined].forEach((domain) => {
      it(`redirects to /group/1/new_post regardless of domain (domain ${
        domain ? 'loaded' : 'not loaded'
      })`, () => {
        window.appGlobals.domain = domain;

        const button = element.shadowRoot!.querySelector(
          '.shareIdeaButton'
        ) as HTMLButtonElement;
        expect(button, 'share idea button should exist').to.exist;

        button.click();

        expect(redirectedTo).to.deep.equal(['/group/1/new_post']);
      });
    });
  });

  describe('"Submit your ideas" button', () => {
    [1, 42].forEach((domainId) => {
      it(`redirects to /domain/${domainId} for the current domain`, async () => {
        window.appGlobals.domain = {
          ...YpTestHelpers.getDomain(),
          id: domainId,
        };
        element = await fixture(html`<yp-landing-page></yp-landing-page>`);
        await aTimeout(50);

        const button = element.shadowRoot!.querySelector(
          '#get-involved md-filled-button'
        ) as HTMLElement;
        expect(button, 'submit your ideas button should exist').to.exist;

        button.click();

        expect(redirectedTo).to.deep.equal([`/domain/${domainId}`]);
      });
    });

    it('falls back to /domain when no domain has loaded yet', () => {
      window.appGlobals.domain = undefined;

      const button = element.shadowRoot!.querySelector(
        '#get-involved md-filled-button'
      ) as HTMLElement;
      button.click();

      expect(redirectedTo).to.deep.equal(['/domain']);
    });
  });

  describe('sections', () => {
    it('renders the intro section first, as the first thing a user sees', () => {
      const sections = element.shadowRoot!.querySelectorAll('section');
      expect(sections.length).to.be.greaterThan(0);
      expect(sections[0].id).to.equal('intro');

      const intro = sections[0];
      expect(intro.querySelector('h1')?.textContent).to.contain(
        'Getting government to fix the small stuff'
      );
      expect(intro.querySelectorAll('p').length).to.be.greaterThan(0);
    });

    SECTIONS.forEach(({ id, heading }) => {
      it(`renders the "${heading}" section with a heading and body text`, () => {
        const section = element.shadowRoot!.querySelector(`#${id}`);
        expect(section, `#${id} should exist`).to.exist;
        expect(section!.querySelector('h2')?.textContent?.trim()).to.equal(
          heading
        );
        expect(section!.querySelectorAll('p').length).to.be.greaterThan(0);
      });
    });
  });
});
