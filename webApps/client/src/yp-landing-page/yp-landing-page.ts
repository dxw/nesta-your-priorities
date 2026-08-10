import { html, css } from "lit";
import { customElement } from "lit/decorators.js";

import { YpBaseElement } from "../common/yp-base-element.js";
import { YpNavHelpers } from "../common/YpNavHelpers.js";

import "@material/web/button/filled-button.js";
import "@material/web/button/text-button.js";

type YpLandingSectionId = "get-involved" | "about-us" | "faqs";

@customElement("yp-landing-page")
export class YpLandingPage extends YpBaseElement {
  static override get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          width: 100%;
        }

        .nav {
          position: sticky;
          top: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          padding: 12px 16px;
          background-color: var(--md-sys-color-surface);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        section {
          box-sizing: border-box;
          max-width: 760px;
          margin: 0 auto;
          padding: 48px 24px;
          scroll-margin-top: 64px;
        }

        .intro {
          text-align: center;
          padding-top: 64px;
        }

        h1 {
          font-size: 2.25rem;
          margin: 0 0 24px 0;
          color: var(--md-sys-color-on-surface);
        }

        h2 {
          font-size: 1.75rem;
          margin: 0 0 16px 0;
          color: var(--md-sys-color-on-surface);
        }

        p {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--md-sys-color-on-surface-variant);
          margin: 0 0 16px 0;
        }

        .getInvolvedActions {
          margin-top: 24px;
        }

        @media (max-width: 600px) {
          section {
            padding: 32px 16px;
          }

          .intro {
            padding-top: 32px;
          }
        }
      `,
    ];
  }

  _scrollToSection(sectionId: YpLandingSectionId) {
    const section = this.$$("#" + sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.appGlobals.activity("click", "landingPageNav", sectionId);
  }

  _goToMainSite() {
    window.appGlobals.activity("click", "landingPageSubmitIdeas");
    const domainId = window.appGlobals.domain?.id;
    YpNavHelpers.redirectTo(domainId ? `/domain/${domainId}` : "/domain");
  }

  renderNav() {
    return html`
      <nav class="nav" aria-label="Landing page sections">
        <md-text-button @click="${() => this._scrollToSection("get-involved")}">
          Get Involved
        </md-text-button>
        <md-text-button @click="${() => this._scrollToSection("about-us")}">
          About Us
        </md-text-button>
        <md-text-button @click="${() => this._scrollToSection("faqs")}">
          FAQs
        </md-text-button>
      </nav>
    `;
  }

  override render() {
    return html`
      ${this.renderNav()}

      <section class="intro" id="intro">
        <p>
          Welcome to Your Priorities, the place where communities come
          together to share ideas, discuss the challenges that matter to
          them, and help shape decisions that affect their everyday lives.
        </p>
        <p>
          Whether you're here to make your voice heard, learn what others in
          your community are thinking, or just see what's going on, we're
          glad you've stopped by. Use the navigation above to jump straight
          to what interests you.
        </p>
      </section>

      <section id="get-involved">
        <h2>Get Involved</h2>
        <p>
          There are lots of ways to take part. You can submit your own
          ideas, comment on and rate ideas from other members of the
          community, and follow discussions on the topics you care about
          most.
        </p>
        <p>
          Every contribution helps build a clearer picture of what matters
          to the community, so decision makers can act on real, shared
          priorities rather than guesswork.
        </p>
        <div class="getInvolvedActions">
          <md-filled-button @click="${this._goToMainSite}">
            Submit your ideas
          </md-filled-button>
        </div>
      </section>

      <section id="about-us">
        <h2>About Us</h2>
        <p>
          Your Priorities is a citizen participation platform that helps
          communities and organisations gather ideas, prioritise them
          together, and turn discussion into action.
        </p>
        <p>
          Our goal is to make it as easy as possible for anyone to take
          part in shaping the decisions that affect them, and for
          organisations to listen at scale.
        </p>
      </section>

      <section id="faqs">
        <h2>FAQs</h2>
        <p>
          <strong>Do I need an account to take part?</strong>
          You can browse most content without one, but you'll need to
          register to submit ideas, comment, or rate other people's
          contributions.
        </p>
        <p>
          <strong>Is my information kept private?</strong>
          We only use your information to run the platform and never sell
          it to third parties. See our privacy policy for full details.
        </p>
        <p>
          <strong>Who can I contact if I have questions?</strong>
          You'll find contact details for the team running this community
          in the footer of the site.
        </p>
      </section>
    `;
  }
}
