import { html, css } from "lit";
import { customElement, state } from "lit/decorators.js";

import { YpBaseElement } from "../common/yp-base-element.js";
import { YpNavHelpers } from "../common/YpNavHelpers.js";
import { YpHardShadowStyles } from "../common/YpHardShadowStyles.js";
import {
  YpLandingSectionId,
  LOGO_PLACEHOLDER_LABEL,
  VIDEO_PLACEHOLDER_LABEL,
  IMAGE_PLACEHOLDER_LABEL,
  SHARE_IDEA_BUTTON_LABEL,
  CAROUSEL_REGION_LABEL,
  NAV_LINKS,
  INTRO_CONTENT,
  GET_INVOLVED_CONTENT,
  HOW_IT_WORKS_CONTENT,
  KIND_OF_THING_CONTENT,
  SMALL_IDEA_CONTENT,
  ABOUT_US_CONTENT,
  FAQS_CONTENT,
} from "./yp-landing-page-content.js";

import "@material/web/button/text-button.js";

@customElement("yp-landing-page")
export class YpLandingPage extends YpBaseElement {
  @state()
  private videoPlaying = false;

  @state()
  private carouselThumbWidthPercent = 100;

  @state()
  private carouselThumbLeftPercent = 0;

  private carouselDragging = false;
  private carouselDragStartX = 0;
  private carouselDragStartScrollLeft = 0;

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
        .criteriaBox h3,
        .carouselCardBody h3 {
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

        .kindOfThingSection {
          padding: 64px 24px;
        }

        .kindOfThingSection .bigHeading {
          margin-bottom: 24px;
        }

        .carouselViewport {
          margin: 0 -24px;
          padding: 0 24px 8px;
          overflow-x: auto;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .carouselViewport::-webkit-scrollbar {
          display: none;
        }

        .carouselTrack {
          display: flex;
          align-items: stretch;
          gap: 24px;
          width: max-content;
        }

        .carouselCard {
          flex: 0 0 auto;
          width: clamp(220px, 26vw, 280px);
          scroll-snap-align: start;
          display: flex;
          flex-direction: column;
        }

        .carouselCardImage {
          width: 100%;
          height: 180px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--yp-landing-video-background-color, #191923);
          color: rgba(237, 239, 242, 0.6);
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .carouselCardImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .carouselCardBody {
          flex: 1;
          background: var(--yp-landing-surface-color, #edeff2);
          padding: 20px;
        }

        .carouselCardBody h3 {
          font-size: 1.25rem;
          font-weight: 400;
          line-height: 1.15;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          margin: 0 0 12px;
          color: var(--yp-landing-heading-text-color, #191923);
        }

        .carouselCardBody p {
          font-size: 0.9375rem;
          margin: 0;
          color: var(--yp-landing-body-text-color, #2e4057);
        }

        .carouselScrollTrack {
          position: relative;
          margin-top: 16px;
          height: 6px;
          border-radius: 3px;
          background: rgba(25, 25, 35, 0.15);
          cursor: grab;
          touch-action: none;
        }

        .carouselScrollTrack:active {
          cursor: grabbing;
        }

        .carouselScrollThumb {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: 3px;
          background: var(--yp-landing-accent-color, #e144dc);
          pointer-events: none;
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
          .smallIdeaSection,
          .kindOfThingSection {
            padding: 40px 16px;
          }

          .carouselViewport {
            margin: 0 -16px;
            padding: 0 16px 8px;
            scroll-snap-type: x mandatory;
          }

          .carouselCard {
            width: calc(100vw - 32px);
            scroll-snap-align: center;
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

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener("resize", this._updateCarouselThumb);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._updateCarouselThumb);
  }

  override firstUpdated(changedProperties: Map<string, unknown>) {
    super.firstUpdated(changedProperties);
    this._updateCarouselThumb();
  }

  private _updateCarouselThumb = () => {
    const viewport = this.$$(".carouselViewport") as HTMLElement | null;
    if (!viewport) return;
    const { scrollWidth, clientWidth, scrollLeft } = viewport;
    if (scrollWidth <= clientWidth) {
      this.carouselThumbWidthPercent = 100;
      this.carouselThumbLeftPercent = 0;
      return;
    }
    this.carouselThumbWidthPercent = (clientWidth / scrollWidth) * 100;
    const maxScrollLeft = scrollWidth - clientWidth;
    this.carouselThumbLeftPercent =
      (scrollLeft / maxScrollLeft) * (100 - this.carouselThumbWidthPercent);
  };

  _onCarouselTrackPointerDown(event: PointerEvent) {
    const viewport = this.$$(".carouselViewport") as HTMLElement | null;
    if (!viewport) return;
    this.carouselDragging = true;
    this.carouselDragStartX = event.clientX;
    this.carouselDragStartScrollLeft = viewport.scrollLeft;
    (event.currentTarget as HTMLElement).setPointerCapture?.(
      event.pointerId
    );
    event.preventDefault();
  }

  _onCarouselTrackPointerMove(event: PointerEvent) {
    if (!this.carouselDragging) return;
    const viewport = this.$$(".carouselViewport") as HTMLElement | null;
    const track = this.$$(".carouselScrollTrack") as HTMLElement | null;
    if (!viewport || !track) return;
    const scrollableWidth = viewport.scrollWidth - viewport.clientWidth;
    if (scrollableWidth <= 0) return;
    const thumbWidthPx =
      (track.clientWidth * viewport.clientWidth) / viewport.scrollWidth;
    const thumbTravelPx = track.clientWidth - thumbWidthPx;
    if (thumbTravelPx <= 0) return;
    const deltaX = event.clientX - this.carouselDragStartX;
    const scrollDelta = (deltaX / thumbTravelPx) * scrollableWidth;
    viewport.scrollLeft = Math.max(
      0,
      Math.min(
        scrollableWidth,
        this.carouselDragStartScrollLeft + scrollDelta
      )
    );
  }

  _onCarouselTrackPointerUp(event: PointerEvent) {
    this.carouselDragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(
      event.pointerId
    );
  }

  renderNav() {
    return html`
      <nav class="nav" aria-label="Landing page sections">
        <div class="logoPlaceholder" aria-label="Site logo placeholder">
          ${LOGO_PLACEHOLDER_LABEL}
        </div>
        <div class="navLinks">
          ${NAV_LINKS.map(
            (link) => html`
              <md-text-button
                @click="${() => this._scrollToSection(link.id)}"
              >
                ${link.label}
              </md-text-button>
            `
          )}
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
              <div class="videoPlaceholderLabel">
                ${VIDEO_PLACEHOLDER_LABEL}
              </div>
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
            <p class="eyebrow">${INTRO_CONTENT.eyebrow}</p>
            <h1>${INTRO_CONTENT.heading}</h1>
            <p class="quote">${INTRO_CONTENT.quote}</p>
            <p class="attribution">
              <strong>${INTRO_CONTENT.attributionName}</strong>
              &nbsp;|&nbsp; ${INTRO_CONTENT.attributionRole}
            </p>
            <button
              class="shareIdeaButton yp-hard-shadow-box"
              @click="${this._shareYourIdea}"
            >
              ${SHARE_IDEA_BUTTON_LABEL}
            </button>
          </div>
        </section>
      </div>

      ${this.renderIntroVideo()}

      <section id="get-involved">
        <div class="getInvolvedDark">
          <div class="sectionInner">
            <h2 class="bigHeading">${GET_INVOLVED_CONTENT.heading}</h2>
            <p class="eyebrow">${GET_INVOLVED_CONTENT.eyebrow}</p>
            ${GET_INVOLVED_CONTENT.paragraphs.map(
              (paragraph) => html`<p>${paragraph}</p>`
            )}
            <button
              class="shareIdeaButton yp-hard-shadow-box"
              @click="${this._goToMainSite}"
            >
              ${SHARE_IDEA_BUTTON_LABEL}
            </button>

            <h2 class="bigHeading howItWorksHeading">
              ${HOW_IT_WORKS_CONTENT.heading}
            </h2>
            <div class="howItWorksGrid">
              ${HOW_IT_WORKS_CONTENT.steps.map(
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

        <div class="kindOfThingSection">
          <div class="sectionInner">
            <h2 class="bigHeading">${KIND_OF_THING_CONTENT.heading}</h2>
            ${KIND_OF_THING_CONTENT.paragraphs.map(
              (paragraph) => html`<p>${paragraph}</p>`
            )}
            <div
              class="carouselViewport"
              role="region"
              aria-label="${CAROUSEL_REGION_LABEL}"
              tabindex="0"
              @scroll="${this._updateCarouselThumb}"
            >
              <div class="carouselTrack">
                ${KIND_OF_THING_CONTENT.examples.map(
                  (idea) => html`
                    <div class="carouselCard">
                      <div class="carouselCardImage" aria-hidden="true">
                        ${IMAGE_PLACEHOLDER_LABEL}
                      </div>
                      <div class="carouselCardBody yp-hard-shadow-box">
                        <h3>${idea.title}</h3>
                        <p>${idea.description}</p>
                      </div>
                    </div>
                  `
                )}
              </div>
            </div>
            <div
              class="carouselScrollTrack"
              aria-hidden="true"
              @pointerdown="${this._onCarouselTrackPointerDown}"
              @pointermove="${this._onCarouselTrackPointerMove}"
              @pointerup="${this._onCarouselTrackPointerUp}"
              @pointercancel="${this._onCarouselTrackPointerUp}"
            >
              <div
                class="carouselScrollThumb"
                style="width: ${this.carouselThumbWidthPercent}%; left: ${this
                  .carouselThumbLeftPercent}%;"
              ></div>
            </div>
          </div>
        </div>

        <div class="smallIdeaSection">
          <div class="sectionInner">
            <div class="smallIdeaHeader">
              <div>
                <h2 class="bigHeading">${SMALL_IDEA_CONTENT.heading}</h2>
                <p class="leadIn">${SMALL_IDEA_CONTENT.leadIn}</p>
              </div>
              <button
                class="shareIdeaButton yp-hard-shadow-box"
                @click="${this._goToMainSite}"
              >
                ${SHARE_IDEA_BUTTON_LABEL}
              </button>
            </div>
            <div class="criteriaGrid">
              ${SMALL_IDEA_CONTENT.criteria.map(
                (group) => html`
                  <div class="criteriaBox">
                    <h3>${group.heading}</h3>
                    <ul>
                      ${group.items.map(
                        (item) => html`
                          <li>
                            <strong>${item.lead}</strong> &ndash; ${item.text}
                          </li>
                        `
                      )}
                    </ul>
                  </div>
                `
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="about-us">
        <h2>${ABOUT_US_CONTENT.heading}</h2>
        ${ABOUT_US_CONTENT.paragraphs.map(
          (paragraph) => html`<p>${paragraph}</p>`
        )}
      </section>

      <section id="faqs">
        <h2>${FAQS_CONTENT.heading}</h2>
        ${FAQS_CONTENT.items.map(
          (item) => html`
            <p><strong>${item.question}</strong> ${item.answer}</p>
          `
        )}
      </section>
    `;
  }
}
