import { html, css } from "lit";
import { customElement, state } from "lit/decorators.js";

import { YpBaseElement } from "../common/yp-base-element.js";
import { YpNavHelpers } from "../common/YpNavHelpers.js";
import { YpHardShadowStyles } from "../common/YpHardShadowStyles.js";

import "@material/web/button/filled-button.js";
import "@material/web/button/text-button.js";

type YpLandingSectionId = "get-involved" | "about-us" | "faqs";

@customElement("yp-landing-page")
export class YpLandingPage extends YpBaseElement {
  @state()
  private videoPlaying = false;

  static override get styles() {
    return [
      super.styles,
      YpHardShadowStyles,
      css`
        :host {
          display: block;
          width: 100%;
          font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
        }

        .logoPlaceholder,
        .navLinks md-text-button,
        .eyebrow,
        .intro h1,
        h2,
        .shareIdeaButton,
        .videoPlaceholderLabel {
          font-family: var(--yp-landing-heading-font, "Bebas Neue", sans-serif);
        }

        .nav {
          position: sticky;
          top: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          padding: 16px 32px;
          background-color: var(--yp-landing-nav-background-color, #16233c);
        }

        .logoPlaceholder {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          padding: 0 16px;
          border: 1px dashed rgba(255, 255, 255, 0.5);
          border-radius: 4px;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.85;
        }

        .navLinks {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .navLinks md-text-button {
          --md-text-button-label-text-color: #fff;
          --md-text-button-hover-label-text-color: #fff;
          --md-text-button-focus-label-text-color: #fff;
          --md-text-button-pressed-label-text-color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        section {
          box-sizing: border-box;
          max-width: 760px;
          margin: 0 auto;
          padding: 48px 24px;
          scroll-margin-top: 64px;
        }

        .intro {
          max-width: none;
          margin: 0;
          padding: 0;
          scroll-margin-top: 0;
        }

        .introCopy {
          box-sizing: border-box;
          max-width: 720px;
          margin: 0 auto;
          padding: 64px 24px 48px;
          text-align: center;
        }

        .eyebrow {
          margin: 0 0 16px;
          color: var(--yp-landing-accent-color, #e0218a);
          font-size: 0.8125rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .intro h1 {
          margin: 0 0 24px;
          font-size: clamp(2.25rem, 5vw, 3.25rem);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: var(--md-sys-color-on-surface);
        }

        .quote {
          max-width: 620px;
          margin: 0 auto 20px;
          font-size: 1.0625rem;
          font-style: italic;
          line-height: 1.6;
          color: var(--md-sys-color-on-surface-variant);
        }

        .attribution {
          margin: 0 0 32px;
          font-size: 0.875rem;
          color: var(--md-sys-color-on-surface-variant);
        }

        .attribution strong {
          color: var(--md-sys-color-on-surface);
        }

        .shareIdeaButton {
          font: inherit;
          background: var(--md-sys-color-surface, #fff);
          color: var(--md-sys-color-on-surface);
          padding: 12px 28px;
          font-size: 0.8125rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }

        .shareIdeaButton:hover {
          transform: translate(2px, 2px);
          box-shadow: 4px 4px 0 0 var(--yp-hard-shadow-color, #e0218a);
        }

        .shareIdeaButton:active {
          transform: translate(4px, 4px);
          box-shadow: 2px 2px 0 0 var(--yp-hard-shadow-color, #e0218a);
        }

        .videoPlaceholder {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #12161f, #05070c);
        }

        .videoPlaceholder video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .videoPlaceholderLabel {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .playButton {
          width: 64px;
          height: 64px;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--yp-landing-accent-color, #e0218a);
          color: #fff;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
        }

        .playButton svg {
          width: 22px;
          height: 22px;
          margin-left: 2px;
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
          .nav {
            padding: 12px 16px;
          }

          section {
            padding: 32px 16px;
          }

          .introCopy {
            padding: 40px 16px 32px;
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

  _playVideo() {
    window.appGlobals.activity("click", "landingPageVideoPlay");
    this.videoPlaying = true;
    this.updateComplete.then(() => {
      const video = this.$$("#introVideo") as HTMLVideoElement | null;
      if (video && video.currentSrc) {
        video.play().catch(() => {});
      }
    });
  }

  renderNav() {
    return html`
      <nav class="nav" aria-label="Landing page sections">
        <div class="logoPlaceholder" aria-label="Site logo placeholder">
          Logo
        </div>
        <div class="navLinks">
          <md-text-button
            @click="${() => this._scrollToSection("get-involved")}"
          >
            Get Involved
          </md-text-button>
          <md-text-button @click="${() => this._scrollToSection("about-us")}">
            About Us
          </md-text-button>
          <md-text-button @click="${() => this._scrollToSection("faqs")}">
            FAQs
          </md-text-button>
        </div>
      </nav>
    `;
  }

  renderIntroVideo() {
    return html`
      <div class="videoPlaceholder">
        <video
          id="introVideo"
          preload="none"
          playsinline
          ?hidden="${!this.videoPlaying}"
        ></video>
        ${!this.videoPlaying
          ? html`
              <div class="videoPlaceholderLabel">Video placeholder</div>
              <button
                class="playButton"
                aria-label="Play video"
                @click="${this._playVideo}"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M8 5v14l11-7z" />
                </svg>
              </button>
            `
          : ""}
      </div>
    `;
  }

  override render() {
    return html`
      ${this.renderNav()}

      <section class="intro" id="intro">
        <div class="introCopy">
          <p class="eyebrow">The Institute for Small Ideas</p>
          <h1>Getting government to fix the small stuff</h1>
          <p class="quote">
            &ldquo;I think small ideas to fix life's frustrations deserve the
            same serious policy concentration as the big ones because if we
            get it right, they add up &ndash; and bit by bit, we can make
            day-to-day life better for everyone.&rdquo;
          </p>
          <p class="attribution">
            <strong>Martin Lewis</strong>
            &nbsp;|&nbsp; Money Saving Expert, Chair of the Institute for
            Small Ideas
          </p>
          <button
            class="shareIdeaButton yp-hard-shadow-box"
            @click="${this._goToMainSite}"
          >
            Share your idea
          </button>
        </div>
        ${this.renderIntroVideo()}
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
