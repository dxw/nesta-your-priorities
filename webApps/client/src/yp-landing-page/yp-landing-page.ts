import { html, css } from "lit";
import { customElement, state } from "lit/decorators.js";

import { YpBaseElement } from "../common/yp-base-element.js";
import { YpNavHelpers } from "../common/YpNavHelpers.js";
import { YpHardShadowStyles } from "../common/YpHardShadowStyles.js";

import "@material/web/button/text-button.js";

type YpLandingSectionId = "get-involved" | "about-us" | "faqs";

const HOW_IT_WORKS_STEPS = [
  {
    title: "01: Send us your idea",
    description:
      "Small, do-able, non-political - the stuff that'd actually make life better.",
  },
  {
    title: "02: Our policy advisers narrow the list of ideas",
    description:
      "They'll sift through your ideas to select the ones that meet the criteria.",
  },
  {
    title: "03: You get to weigh in",
    description: "We publish the long-list for your feedback.",
  },
  {
    title: "04: Our panel, chaired by Martin, picks the final ones",
    description: "The cross-party panel choose which ideas go forward.",
  },
  {
    title: "05: We campaign to make them happen",
    description:
      "Government, opposition, regulators, whoever needs to hear it.",
  },
];

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
          background-color: var(--yp-landing-surface-color, #edeff2);
          color: var(--yp-landing-heading-text-color, #191923);
          font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
        }

        .logoPlaceholder,
        .intro h1,
        h2,
        .shareIdeaButton,
        .videoPlaceholderLabel,
        .howItWorksCard h3,
        .criteriaBox h3 {
          font-family: var(--yp-landing-heading-font, "Bebas Neue", sans-serif);
        }

        .navLinks md-text-button,
        .eyebrow {
          font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
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
          background-color: var(--yp-landing-nav-background-color, #2e4057);
        }

        .logoPlaceholder {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          padding: 0 16px;
          border: 1px dashed rgba(237, 239, 242, 0.5);
          border-radius: 4px;
          color: #edeff2;
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
          --md-text-button-label-text-color: #edeff2;
          --md-text-button-hover-label-text-color: #edeff2;
          --md-text-button-focus-label-text-color: #edeff2;
          --md-text-button-pressed-label-text-color: #edeff2;
          font-size: clamp(0.75rem, 1vw, 0.875rem);
          font-weight: 700;
          line-height: 1;
          letter-spacing: normal;
          text-transform: uppercase;
        }

        section {
          box-sizing: border-box;
          max-width: 760px;
          margin: 0 auto;
          padding: 48px 24px;
          scroll-margin-top: 64px;
        }

        .hero {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .intro {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: none;
          margin: 0;
          padding: 0;
          scroll-margin-top: 0;
        }

        .introCopy {
          box-sizing: border-box;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          padding: 64px 24px 48px;
          text-align: center;
        }

        .eyebrow {
          margin: 0 0 16px;
          color: var(--yp-landing-accent-text-color, #c82cc3);
          font-size: clamp(0.75rem, 1vw, 0.875rem);
          font-weight: 700;
          line-height: 1;
          letter-spacing: normal;
          text-transform: uppercase;
        }

        .intro h1 {
          margin: 0 0 24px;
          font-size: clamp(2rem, 6vw, 5.5rem);
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: var(--yp-landing-heading-text-color, #191923);
        }

        .quote {
          max-width: 620px;
          margin: 0 auto 20px;
          font-size: 1.0625rem;
          font-style: italic;
          line-height: 1.6;
          color: var(--yp-landing-body-text-color, #2e4057);
        }

        .attribution {
          margin: 0 0 32px;
          font-size: 0.875rem;
          color: var(--yp-landing-body-text-color, #2e4057);
        }

        .attribution strong {
          color: var(--yp-landing-heading-text-color, #191923);
        }

        .shareIdeaButton {
          background: var(--yp-landing-surface-color, #edeff2);
          color: var(--yp-landing-heading-text-color, #191923);
          padding: 12px 28px;
          font-size: clamp(1rem, 1.4vw, 1.25rem);
          font-weight: 400;
          line-height: 1;
          letter-spacing: normal;
          text-align: center;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }

        .shareIdeaButton:hover {
          transform: translate(2px, 2px);
          box-shadow: 4px 4px 0 0 var(--yp-hard-shadow-color, #e144dc);
        }

        .shareIdeaButton:active {
          transform: translate(4px, 4px);
          box-shadow: 2px 2px 0 0 var(--yp-hard-shadow-color, #e144dc);
        }

        .videoPlaceholder {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--yp-landing-video-background-color, #191923);
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
          color: rgba(237, 239, 242, 0.6);
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
          background: var(--yp-landing-accent-color, #e144dc);
          color: #edeff2;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(25, 25, 35, 0.35);
        }

        .playButton svg {
          width: 22px;
          height: 22px;
          margin-left: 2px;
        }

        h2 {
          font-size: 1.75rem;
          margin: 0 0 16px 0;
          color: var(--yp-landing-heading-text-color, #191923);
        }

        p {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--yp-landing-body-text-color, #2e4057);
          margin: 0 0 16px 0;
        }

        #get-involved {
          max-width: none;
          margin: 0;
          padding: 0;
          text-align: left;
        }

        .sectionInner {
          max-width: 1100px;
          margin: 0 auto;
        }

        .bigHeading {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          margin: 0 0 16px;
        }

        .getInvolvedDark {
          background-color: var(--yp-landing-nav-background-color, #2e4057);
          padding: 64px 24px;
        }

        .getInvolvedDark h2,
        .getInvolvedDark p {
          color: var(--yp-landing-surface-color, #edeff2);
        }

        .getInvolvedDark .eyebrow {
          color: var(--yp-landing-accent-color, #e144dc);
        }

        .howItWorksHeading {
          margin-top: 48px;
        }

        .howItWorksGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .howItWorksCard {
          background: var(--yp-landing-surface-color, #edeff2);
          padding: 20px;
        }

        .howItWorksCard h3,
        .criteriaBox h3 {
          font-size: 1.25rem;
          font-weight: 400;
          line-height: 1.15;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          margin: 0 0 12px;
          color: var(--yp-landing-heading-text-color, #191923);
        }

        .howItWorksCard p {
          font-size: 0.9375rem;
          margin: 0;
          color: var(--yp-landing-body-text-color, #2e4057);
        }

        .smallIdeaSection {
          padding: 64px 24px;
        }

        .smallIdeaHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }

        .smallIdeaHeader .bigHeading {
          margin-bottom: 8px;
        }

        .leadIn {
          max-width: 480px;
          margin: 0;
          color: var(--yp-landing-accent-text-color, #c82cc3);
          font-weight: 700;
          font-size: 1rem;
        }

        .criteriaGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
        }

        .criteriaBox {
          background: var(--yp-landing-info-box-color, #8df6f9);
          border-radius: 4px;
          padding: 24px;
        }

        .criteriaBox ul {
          margin: 0;
          padding-left: 20px;
        }

        .criteriaBox li {
          margin-bottom: 12px;
          line-height: 1.5;
          color: var(--yp-landing-heading-text-color, #191923);
        }

        .criteriaBox li:last-child {
          margin-bottom: 0;
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

          .getInvolvedDark,
          .smallIdeaSection {
            padding: 40px 16px;
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

  _shareYourIdea() {
    window.appGlobals.activity("click", "landingPageShareYourIdea");
    YpNavHelpers.redirectTo("/group/1/new_post");
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
      <div class="hero">
        ${this.renderNav()}

        <section class="intro" id="intro">
          <div class="introCopy">
            <p class="eyebrow">The Institute for Small Ideas</p>
            <h1>Getting government to fix the small stuff</h1>
            <p class="quote">
              &ldquo;I think small ideas to fix life's frustrations deserve
              the same serious policy concentration as the big ones because
              if we get it right, they add up &ndash; and bit by bit, we can
              make day-to-day life better for everyone.&rdquo;
            </p>
            <p class="attribution">
              <strong>Martin Lewis</strong>
              &nbsp;|&nbsp; Money Saving Expert, Chair of the Institute for
              Small Ideas
            </p>
            <button
              class="shareIdeaButton yp-hard-shadow-box"
              @click="${this._shareYourIdea}"
            >
              Share your idea
            </button>
          </div>
        </section>
      </div>

      ${this.renderIntroVideo()}

      <section id="get-involved">
        <div class="getInvolvedDark">
          <div class="sectionInner">
            <p class="eyebrow">Change starts with your small idea.</p>
            <h2 class="bigHeading">Get Involved</h2>
            <p>
              Ever thought, &ldquo;why don&rsquo;t they just fix it?&rdquo;
              This is the place for you. We want your ideas for practical,
              non-controversial ways to improve the UK.
            </p>
            <p>
              What are the small things that matter to you? Health, schools,
              transport, business, housing, policing, justice, tech,
              shopping, money &ndash; or something else entirely?
            </p>
            <p>
              We&rsquo;ll take the best ideas, turn them into professional
              policy, and push them under the noses of the people who can
              make them happen.
            </p>
            <button
              class="shareIdeaButton yp-hard-shadow-box"
              @click="${this._goToMainSite}"
            >
              Share your idea
            </button>

            <h2 class="bigHeading howItWorksHeading">How it works</h2>
            <div class="howItWorksGrid">
              ${HOW_IT_WORKS_STEPS.map(
                (step) => html`
                  <div class="howItWorksCard yp-hard-shadow-box">
                    <h3>${step.title}</h3>
                    <p>${step.description}</p>
                  </div>
                `
              )}
            </div>
          </div>
        </div>

        <div class="smallIdeaSection">
          <div class="sectionInner">
            <div class="smallIdeaHeader">
              <div>
                <h2 class="bigHeading">What is a small idea?</h2>
                <p class="leadIn">
                  A small idea is a practical fix for something that affects
                  everyday life.
                </p>
              </div>
              <button
                class="shareIdeaButton yp-hard-shadow-box"
                @click="${this._goToMainSite}"
              >
                Share your idea
              </button>
            </div>
            <div class="criteriaGrid">
              <div class="criteriaBox">
                <h3>What ideas will make the cut?</h3>
                <ul>
                  <li>
                    <strong>Practical</strong> &ndash; a solution, not just a
                    complaint
                  </li>
                  <li>
                    <strong>Do-able</strong> &ndash; it must be something
                    that could realistically change
                  </li>
                  <li>
                    <strong>Relatively inexpensive</strong> &ndash; if it
                    costs too much, government, regulators, or councils
                    won&rsquo;t do it
                  </li>
                  <li>
                    <strong>A widespread issue</strong> &ndash; whether it
                    could help millions of people a little, or thousands of
                    people a lot
                  </li>
                  <li>
                    <strong
                      >And crucially&hellip; hard to disagree with</strong
                    >
                    &ndash; the kind of thing that 80% of people, whatever
                    their politics, would say &ldquo;yeah, that makes
                    sense&rdquo;.
                  </li>
                </ul>
              </div>
              <div class="criteriaBox">
                <h3>What we&rsquo;ll say no to:</h3>
                <ul>
                  <li>
                    <strong>Too local</strong> &ndash; a drinking water
                    fountain in your local park won&rsquo;t cut it
                  </li>
                  <li>
                    <strong>Overly political</strong> &ndash; no party
                    lines, and no dog whistles
                  </li>
                  <li>
                    <strong>Illegal</strong> &ndash; breaks the law,
                    criminal or otherwise.
                  </li>
                  <li>
                    <strong>Harmful</strong> &ndash; nothing that harms
                    people or animals.
                  </li>
                </ul>
              </div>
            </div>
          </div>
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
