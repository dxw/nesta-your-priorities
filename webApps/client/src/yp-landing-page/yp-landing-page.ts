import { html, css } from "lit";
import { customElement, state } from "lit/decorators.js";

import { YpBaseElement } from "../common/yp-base-element.js";
import { YpNavHelpers } from "../common/YpNavHelpers.js";
import { YpHardShadowStyles } from "../common/YpHardShadowStyles.js";
import {
  YpLandingSectionId,
  LOGO_PLACEHOLDER_LABEL,
  IMAGE_PLACEHOLDER_LABEL,
  LOGO_IMAGE_PLACEHOLDER_LABEL,
  SHARE_IDEA_BUTTON_LABEL,
  CAROUSEL_REGION_LABEL,
  NAV_LINKS,
  INTRO_CONTENT,
  GET_INVOLVED_CONTENT,
  HOW_IT_WORKS_CONTENT,
  KIND_OF_THING_CONTENT,
  SMALL_IDEA_CONTENT,
  MARTIN_CONTENT,
  ABOUT_US_CONTENT,
  FAQS_CONTENT,
  PRESS_RELEASES_CONTENT,
  FAQ_ANSWER_PENDING_LABEL,
  FOOTER_CONTENT,
  CONSENT_BUTTON_LABEL,
  CONSENT_TEXT,
  OPTIONAL_COOKIE_CONSENT_EVENT,
  OPTIONAL_COOKIE_CONSENT_KEY,
} from "./yp-landing-page-content.js";

import "@material/web/button/text-button.js";

@customElement("yp-landing-page")
export class YpLandingPage extends YpBaseElement {
  @state()
  private consented = false;

  @state()
  private carouselThumbWidthPercent = 100;

  @state()
  private carouselThumbLeftPercent = 0;

  @state()
  private carouselCanScrollLeft = false;

  @state()
  private carouselCanScrollRight = false;

  private carouselDragging = false;
  private carouselDragStartX = 0;
  private carouselDragStartScrollLeft = 0;
  private pendingArrowFocusRedirect: "left" | "right" | null = null;
  private _boundOptionalCookieConsent =
    this._optionalCookieConsent.bind(this);

  @state()
  private openFaqIndexes = new Set<number>();

  static override get styles() {
    return [
      super.styles,
      YpHardShadowStyles,
      css`
        :host {
          display: block;
          width: 100%;
          background-color: var(--yp-landing-surface-color, #ffffff);
          color: var(--yp-landing-heading-text-color, #191923);
          font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
        }

        /* Double outline meets contrast requirement on both light & dark backgrounds */
        button:focus-visible,
        a:focus-visible,
        [tabindex]:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #191923;
        }

        /* Sits inside a white .yp-hard-shadow-box card that already has black border, 
         * so accent colour is needed to differentiate
         */
        .button:focus-visible {
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #c124bc;
        }

        /*
         * Already surrounded by black, but on bright background, so accent colour indicator
         * has better contrast when used on inner element on white background
         */
        .faqQuestion:focus-visible {
          outline: 3px solid #c124bc;
          outline-offset: -6px;
          box-shadow: none;
        }

        /*
         * md-text-button's focus indicator comes from internal <md-focus-ring part="focus-ring"> 
         * box-shadow on the host has no visible effect. ::part() is supported hook to style from outside
         */
        .navLinks md-text-button::part(focus-ring) {
          color: var(--yp-landing-surface-color, #ffffff);
        }

        .logoPlaceholder,
        .intro h1,
        h2,
        .button,
        .howItWorksCard h3,
        .criteriaBox h3,
        .carouselCardBody h3 {
          font-family: var(--yp-landing-heading-font, "Bebas Neue", sans-serif);
        }

        .navLinks md-text-button,
        .eyebrow,
		h1.eyebrow {
          font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
        }

        .skipLink {
          position: fixed;
          top: -48px;
          left: 8px;
          z-index: 10;
          background: var(--yp-landing-heading-text-color, #191923);
          color: #ffffff;
          padding: 12px 20px;
          border: none;
          border-radius: 4px;
          text-decoration: none;
          font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
          font-size: 1rem;
          cursor: pointer;
          transition: top 0.1s ease;
        }

        .skipLink:focus {
          top: 8px;
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
          height: 100px;
          width: 249px;
          padding: 0 16px;
          color: #edeff2;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.85;
          overflow: hidden;
        }

        .logoPlaceholder img {
          display: block;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
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
          font-size: clamp(1rem, 0.75rem + 1vw, 1.125rem);
          font-weight: 700;
          line-height: 1;
          letter-spacing: normal;
          text-transform: uppercase;
        }

        .navLabelMobile {
          display: none;
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
        }

        .intro {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 75vh;
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

        .eyebrow,
		.intro h1.eyebrow {
          margin: 0 0 16px;
          color: var(--yp-landing-accent-text-color, #c124bc);
          font-size: clamp(1rem, 0.75rem + 1vw, 1.125rem);
          font-weight: 700;
          line-height: 1;
          letter-spacing: normal;
          text-transform: uppercase;
        }

        .intro h2 {
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
          line-height: 1.6;
          color: var(--yp-landing-body-text-color, #2e4057);
        }

        .attribution {
          margin: 0 0 32px;
          font-size: 1rem;
          color: var(--yp-landing-body-text-color, #2e4057);
        }

        .attribution strong {
          color: var(--yp-landing-heading-text-color, #191923);
        }

        .button {
          background: var(--yp-landing-surface-color, #ffffff);
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

        .button:hover {
          transform: translate(2px, 2px);
          box-shadow: 4px 4px 0 0 var(--yp-hard-shadow-color, #e144dc);
        }

        .button:active {
          transform: translate(4px, 4px);
          box-shadow: 2px 2px 0 0 var(--yp-hard-shadow-color, #e144dc);
        }

        .videoPlaceholder {
          position: relative;
          width: 100%;
          max-width: 1100px;
          margin: 0 auto 64px;
          aspect-ratio: 16 / 9;
          max-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          background: var(--yp-landing-video-background-color, #191923);
        }

        .videoPlaceholder iframe,
        .videoPlaceholder img {
          width: 100%;
          height: 100%;
        }

        .videoPlaceholder iframe {
          border: 0;
        }

        .videoPlaceholder img {
          object-fit: cover;
        }

        .playButton {
          position: absolute;
          width: 64px;
          height: 64px;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--yp-landing-accent-color, #c124bc);
          color: #edeff2;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(25, 25, 35, 0.35);
        }

        .playButton svg {
          width: 1.75rem;
          height: 1.75rem;
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

        #get-involved,
        #about-us,
        #faqs,
        #press-releases {
          max-width: none;
          margin: 0;
          padding: 0;
          text-align: left;
        }

        .sectionInner {
          max-width: 1100px;
          margin: 0 auto;
        }
          
        .footerTopRow {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            @media (min-width: 900px) {
                flex-direction: row;
                align-items: center;
            }
        }
        
        .logosContainer {
            max-width: 550px;
            margin-top: 20px;
            @media (min-width: 900px) {
                margin-top: 0;
            }
        }
        
        .logos {
            align-items: flex-start;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            margin-top: 20px;
			gap: 20px;
            
            .logo {
                margin-bottom: 20px;
                margin-right: 0;
                max-height: 70px;
            }
            
            @media (min-width: 900px) {
                flex-direction: row;
                align-items: center;

                .logo {
                    margin-bottom: 0;
                    margin-right: 20px;
                }
            }
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
          color: var(--yp-landing-surface-color, #ffffff);
        }

        .getInvolvedDark .eyebrow {
          color: var(--yp-landing-surface-color, #ffffff);
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
          background: var(--yp-landing-surface-color, #ffffff);
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
          font-size: 1rem;
          line-height: 1.5;
          margin: 0;
          color: var(--yp-landing-body-text-color, #2e4057);
        }

        .smallIdeaSection {
          padding: 0 24px 64px;
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
          max-width: 100%;
          margin: 0;
          color: var(--yp-landing-accent-text-color, #c124bc);
          font-weight: 700;
          font-size: 1rem;
        }

        .criteriaGrid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .criteriaBox {
          background: var(--yp-landing-info-box-color, #8df6f9);
          border-radius: 4px;
          padding: 24px;
        }

        .criteriaBox ul {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }

        .criteriaBox li {
          position: relative;
          padding-left: 20px;
          margin-bottom: 12px;
          line-height: 1.5;
          color: var(--yp-landing-heading-text-color, #191923);
        }

        .criteriaBox li::before {
          content: "";
          position: absolute;
          left: 4px;
          top: 0.65em;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .criteriaBox li:last-child {
          margin-bottom: 0;
        }

        .kindOfThingSection {
          padding: 64px 24px;
        }

        .kindOfThingEmphasis {
          font-weight: 700;
        }

        .carouselViewport {
          margin: 0;
          padding: 0 0 8px;
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
          font-size: 1rem;
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
          background: var(--yp-landing-surface-color, #ffffff);
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
          font-size: 1rem;
          line-height: 1.5;
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
          background: var(--yp-landing-accent-color, #c124bc);
          pointer-events: none;
        }

        .carouselWrapper {
          position: relative;
        }

        .carouselArrow {
          position: absolute;
          top: 90px;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--yp-landing-accent-color, #c124bc);
          color: #edeff2;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(25, 25, 35, 0.35);
          z-index: 2;
        }

        .carouselArrow svg {
          width: 1.5rem;
          height: 1.5rem;
        }

        .carouselArrowLeft {
          left: 8px;
        }

        .carouselArrowRight {
          right: 8px;
        }

        .carouselArrow:disabled {
          opacity: 0.35;
          cursor: default;
          box-shadow: none;
        }

        .martinSection {
          background-color: var(--yp-landing-nav-background-color, #2e4057);
          padding: 64px 24px;
        }

        .martinSection h2,
        .martinSection p {
          color: var(--yp-landing-surface-color, #ffffff);
        }

        .martinGrid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          column-gap: 48px;
          row-gap: 0;
          align-items: center;
        }

        .martinHeading {
          grid-column: 1;
          grid-row: 1;
        }

        .martinCopy {
          grid-column: 1;
          grid-row: 2;
        }

        .martinCopy p {
          line-height: 1.6;
        }

        .martinImage {
          grid-column: 2;
          grid-row: 1 / span 2;
          width: 100%;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--yp-landing-video-background-color, #191923);
          color: rgba(237, 239, 242, 0.6);
          font-size: 1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .martinImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .aboutUsSection {
          padding: 64px 24px;
        }

        .aboutUsGrid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 32px 48px;
          align-items: start;
        }

        .aboutUsLogo {
          width: 100%;
          aspect-ratio: 16 / 9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(237, 239, 242, 0.6);
          font-size: 1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .aboutUsLogo svg {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .aboutUsCopy p {
          text-align: justify;
        }

        .aboutUsPeopleGrid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 0 32px;
          margin-bottom: 24px;
		  grid-column: 1 / span 2;
        }

        .aboutUsLeadershipList {
          margin: 0 0 16px;
          padding-left: 0;
          list-style: none;
        }

        .aboutUsLeadershipList li {
          position: relative;
          padding-left: 20px;
          line-height: 1.6;
          color: var(--yp-landing-body-text-color, #2e4057);
        }

        .aboutUsLeadershipList li::before {
          content: "";
          position: absolute;
          left: 4px;
          top: 0.65em;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .aboutUsActions {
          text-align: right;
		  grid-column: 1 / span 2;
        }

        .faqsSection {
          background: var(--yp-landing-info-box-color, #8df6f9);
          padding: 64px 24px;
        }

        .faqsSection .bigHeading {
          text-align: center;
        }

        .faqList {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .faqItem {
          background: var(--yp-landing-surface-color, #ffffff);
        }

        .faqQuestion {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-size: 1.125rem;
          font-weight: 400;
          letter-spacing: -0.01em;
          color: var(--yp-landing-heading-text-color, #191923);
		  font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
        }

        .faqToggleIcon {
          flex-shrink: 0;
          font-size: 1.5rem;
          line-height: 1;
          color: var(--yp-landing-accent-color, #c124bc);
        }

        .faqAnswer {
          margin: 0;
          padding: 0 24px 20px;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--yp-landing-body-text-color, #2e4057);
        }

        .pressReleasesSection {
          background: var(--yp-landing-surface-color, #ffffff);
          padding: 64px 24px;
          color: var(--yp-landing-heading-text-color, #191923);
        }

        .pressReleasesSection .bigHeading {
          text-align: center;
        }

        .pressReleasesDescription {
          color: var(--yp-landing-body-text-color, #2e4057);
          text-align: center;
        }

        .pressReleaseList {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 32px;
        }

        .pressReleaseItem {
          padding: 24px;
          background: var(--yp-landing-surface-color, #ffffff);
          color: var(--yp-landing-heading-text-color, #191923);
        }

        .pressReleaseItem h3 {
          margin: 0 0 8px;
          font-family: var(--yp-landing-heading-font, "Bebas Neue", sans-serif);
          font-size: 1.5rem;
          font-weight: 400;
        }

		.pressReleaseItem h3 a {
          color: var(--yp-landing-body-text-color, #2e4057);
		  text-decoration: none;
        }

        .pressReleaseItem h3 a:hover,
        .pressReleaseItem h3 a:focus {
          text-decoration: underline;
        }

        .pressReleaseItem p {
          color: var(--yp-landing-body-text-color, #2e4057);
		  margin-bottom: 0.5rem;
        }

        .pressReleaseItem .pressReleaseDate {
          margin-bottom: 12px;
          font-weight: 700;
        }

        .pressReleaseStatus {
          display: inline-block;
          margin: 0;
          padding: 8px 12px;
          border: 1px solid #691365;
          color: #691365;
          font-weight: 700;
        }

        .siteFooter {
          background: var(--yp-landing-video-background-color, #191923);
          padding: 64px 24px;
          color: var(--yp-landing-surface-color, #ffffff);
            
        }

        .footerHeading {
          font-family: var(--yp-landing-heading-font, "Bebas Neue", sans-serif);
          font-size: 1.25rem;
          font-weight: 400;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          margin: 0 0 12px;
          color: var(--yp-landing-surface-color, #ffffff);
        }

        .footerEmail {
          font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
          font-size: 1rem;
          text-transform: uppercase;
          color: var(--yp-landing-surface-color, #ffffff);
          text-decoration: none;
        }

        .footerEmail:hover,
        .footerEmail:focus {
          text-decoration: underline;
        }

		.footerTopRow {
		  align-items: start;
	    }

        .footerBottomRow {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 64px;
        }

        .footerCopyright {
          margin: 0;
          font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
          font-size: 12px;
          text-transform: uppercase;
          color: var(--yp-landing-surface-color, #ffffff);
        }

        .footerPrivacyLink {
          font-family: var(--yp-landing-body-font, "Atkinson Hyperlegible", sans-serif);
          font-size: 12px;
          text-transform: uppercase;
          color: var(--yp-landing-surface-color, #ffffff);
          text-decoration: none;
        }

        .footerPrivacyLink:hover,
        .footerPrivacyLink:focus {
          text-decoration: underline;
        }

        .footerCookieSettings {
          border: 0;
          padding: 0;
          background: none;
          cursor: pointer;
        }

        .footerPolicyLinks {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .nav {
            padding: 12px 16px;
          }

          .logoPlaceholder {
            width: 160px;
            height: 64px;
            padding: 0 8px;
          }

          .navLabelDesktop {
            display: none;
          }

          .navLabelMobile {
            display: inline;
          }

          section {
            padding: 32px 16px;
          }

          .videoPlaceholder {
            max-width: none;
            margin-bottom: 0;
          }

          .introCopy {
            padding: 40px 16px 32px;
          }

          .getInvolvedDark,
          .smallIdeaSection,
          .martinSection,
          .aboutUsSection,
          .faqsSection,
          .pressReleasesSection,
          .siteFooter {
            padding: 40px 16px;
          }

          .kindOfThingSection {
            padding: 40px 16px 40px;
          }

          .footerBottomRow {
            margin-top: 40px;
          }

          .martinGrid,
          .aboutUsGrid {
            grid-template-columns: 1fr;
            gap: 24px 0;
          }

          .aboutUsPeopleGrid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .martinHeading,
          .martinCopy,
          .martinImage {
            grid-column: auto;
            grid-row: auto;
          }

          .criteriaGrid {
            grid-template-columns: 1fr;
          }

          .smallIdeaHeader {
            justify-content: flex-start;
          }

          .aboutUsActions {
            text-align: left;
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
          
          .consent {
              color: var(--yp-landing-surface-color, #ffffff);
              padding: 50px;
          }
          
          .consentLink {
              color: var(--yp-landing-surface-color, #ffffff);
          }
      `,
    ];
  }

  _skipToContent() {
    const intro = this.$$("#intro") as HTMLElement | null;
    if (intro) {
      intro.scrollIntoView({ behavior: "smooth", block: "start" });
      intro.focus();
    }
  }

  _scrollToSection(sectionId: YpLandingSectionId) {
    const section = this.$$("#" + sectionId);
    if (section) {
      const nav = this.$$(".nav") as HTMLElement | null;
      section.style.scrollMarginTop = `${nav?.getBoundingClientRect().height || 64}px`;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.appGlobals.activity("click", "landingPageNav", sectionId);
  }

  _onAnchorClick(
    event: Event,
    sectionId: YpLandingSectionId,
  ) {
    event.preventDefault();
    this._scrollToSection(sectionId);
  }

  _shareYourIdea() {
    window.appGlobals.activity("click", "landingPageShareYourIdea");
    window.plausible?.("Share Your Idea Click");
    YpNavHelpers.redirectTo("/group/1/new_post");
  }

  _toggleFaq(index: number) {
    const openFaqIndexes = new Set(this.openFaqIndexes);
    if (openFaqIndexes.has(index)) {
      openFaqIndexes.delete(index);
    } else {
      openFaqIndexes.add(index);
    }
    this.openFaqIndexes = openFaqIndexes;
    window.appGlobals.activity("click", "landingPageFaqToggle", `${index}`);
  }

  override connectedCallback() {
    super.connectedCallback();
    this.consented =
      localStorage.getItem(OPTIONAL_COOKIE_CONSENT_KEY) === "accepted";
    this.addGlobalListener(
      OPTIONAL_COOKIE_CONSENT_EVENT,
      this._boundOptionalCookieConsent
    );
    window.addEventListener("resize", this._updateCarouselThumb);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeGlobalListener(
      OPTIONAL_COOKIE_CONSENT_EVENT,
      this._boundOptionalCookieConsent
    );
    window.removeEventListener("resize", this._updateCarouselThumb);
  }

  override firstUpdated(changedProperties: Map<string, unknown>) {
    super.firstUpdated(changedProperties);
    this._updateCarouselThumb();
  }

  override willUpdate(changedProperties: Map<string, unknown>) {
    super.willUpdate(changedProperties);
    if (
      changedProperties.has("carouselCanScrollLeft") &&
      changedProperties.get("carouselCanScrollLeft") === true &&
      !this.carouselCanScrollLeft
    ) {
      this._flagArrowFocusRedirectIfActive("left");
    }
    if (
      changedProperties.has("carouselCanScrollRight") &&
      changedProperties.get("carouselCanScrollRight") === true &&
      !this.carouselCanScrollRight
    ) {
      this._flagArrowFocusRedirectIfActive("right");
    }
  }

  private _flagArrowFocusRedirectIfActive(direction: "left" | "right") {
    const button = this.$$(
      direction === "left" ? ".carouselArrowLeft" : ".carouselArrowRight"
    );
    if (button && this.shadowRoot?.activeElement === button) {
      this.pendingArrowFocusRedirect = direction;
    }
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (this.pendingArrowFocusRedirect) {
      const direction = this.pendingArrowFocusRedirect;
      this.pendingArrowFocusRedirect = null;
      const fallbackArrow = this.$$(
        direction === "left" ? ".carouselArrowRight" : ".carouselArrowLeft"
      ) as HTMLButtonElement | null;
      const target =
        fallbackArrow && !fallbackArrow.disabled
          ? fallbackArrow
          : (this.$$(".carouselViewport") as HTMLElement | null);
      target?.focus();
    }
  }

  private _updateCarouselThumb = () => {
    const viewport = this.$$(".carouselViewport") as HTMLElement | null;
    if (!viewport) return;
    const { scrollWidth, clientWidth, scrollLeft } = viewport;
    if (scrollWidth <= clientWidth) {
      this.carouselThumbWidthPercent = 100;
      this.carouselThumbLeftPercent = 0;
      this.carouselCanScrollLeft = false;
      this.carouselCanScrollRight = false;
      return;
    }
    this.carouselThumbWidthPercent = (clientWidth / scrollWidth) * 100;
    const maxScrollLeft = scrollWidth - clientWidth;
    this.carouselThumbLeftPercent =
      (scrollLeft / maxScrollLeft) * (100 - this.carouselThumbWidthPercent);
    this.carouselCanScrollLeft = scrollLeft > 1;
    this.carouselCanScrollRight = scrollLeft < maxScrollLeft - 1;
  };

  _scrollCarousel(direction: -1 | 1) {
    const viewport = this.$$(".carouselViewport") as HTMLElement | null;
    if (!viewport) return;
    const card = viewport.querySelector(".carouselCard") as HTMLElement | null;
    const step = card ? card.offsetWidth + 24 : viewport.clientWidth;
    viewport.scrollBy({ left: direction * step, behavior: "smooth" });
    window.appGlobals.activity(
      "click",
      "landingPageCarouselArrow",
      direction === 1 ? "next" : "previous"
    );
  }

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
        <div class="logoPlaceholder">
          <img src="/images/home/logo_crop.png" alt="The Small Ideas Initiative logo">
        </div>
        <button class="skipLink" @click="${this._skipToContent}">
          Skip to content
        </button>
        <div class="navLinks">
          ${NAV_LINKS.map(
            (link) => html`
              <md-text-button
                aria-label="${link.label}"
                @click="${() => this._scrollToSection(link.id)}"
              >
                <span class="navLabelDesktop">${link.label}</span>
                <span class="navLabelMobile" aria-hidden="true">
                  ${link.mobileLabel ?? link.label}
                </span>
              </md-text-button>
            `
          )}
        </div>
      </nav>
    `;
  }

  giveConsent() {
    this.consented = true;
    localStorage.setItem(OPTIONAL_COOKIE_CONSENT_KEY, "accepted");
    this.fireGlobal(OPTIONAL_COOKIE_CONSENT_EVENT, true);
  }

  private _optionalCookieConsent(event: CustomEvent) {
    this.consented = event.detail === true;
  }

  renderIntroVideo() {
    const youtubeVideoId = "enfgLUpgJiQ";

    return html`
      <div class="videoPlaceholder">
        ${this.consented 
                ? html`
              <iframe
                src="https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=0"
                title="The Small Ideas Initiative video"
                allow=" encrypted-media; picture-in-picture"
                allowfullscreen
              ></iframe>
        ` : html`
                 <div class="consent">
                     ${CONSENT_TEXT}
                     See <a class="consentLink" href="https://policies.google.com/privacy?hl=en-GB&">Youtube's privacy policy</a> for
                     more information.
                 </div>
                <button class="button"
                        @click="${this.giveConsent}">
                    ${CONSENT_BUTTON_LABEL}
                </button>`
          }
      </div>
    `;
  }

  override render() {
    return html`
      ${this.renderNav()}

      <main>
        <div class="hero">
          <section class="intro" id="intro" tabindex="-1">
            <div class="introCopy">
              <h1 class="eyebrow">${INTRO_CONTENT.eyebrow}</h1>
              <h2 aria-label="${INTRO_CONTENT.heading}">${INTRO_CONTENT.heading}</h2>
              <p class="quote">${INTRO_CONTENT.subHeading}</p>
              <p class="quote">${INTRO_CONTENT.quote}</p>
              <p class="attribution">
                <strong>${INTRO_CONTENT.attributionName}</strong>
                &nbsp;|&nbsp; ${INTRO_CONTENT.attributionRole}
              </p>
              <button
                class="button yp-hard-shadow-box"
                aria-label="${SHARE_IDEA_BUTTON_LABEL}"
                @click="${this._shareYourIdea}"
              >
                ${SHARE_IDEA_BUTTON_LABEL}
              </button>
            </div>
          </section>
        </div>
        ${this.renderIntroVideo()}

          <div class="smallIdeaSection">
              <div class="sectionInner">
                  <div class="smallIdeaHeader">
                      <div>
                          <h2 class="bigHeading" aria-label="${SMALL_IDEA_CONTENT.heading}">${SMALL_IDEA_CONTENT.heading}</h2>
                          <p class="leadIn">${SMALL_IDEA_CONTENT.leadIn}</p>
                      </div>
                      <button
                              class="button shareIdeaButton yp-hard-shadow-box"
                              aria-label="${SHARE_IDEA_BUTTON_LABEL}"
                              @click="${this._shareYourIdea}"
                      >
                          ${SHARE_IDEA_BUTTON_LABEL}
                      </button>
                  </div>
                  <div class="criteriaGrid">
                      ${SMALL_IDEA_CONTENT.criteria.map(
                              (group) => html`
                    <div class="criteriaBox">
                      <h3 aria-label="${group.heading}">${group.heading}</h3>
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
        <section id="get-involved">
          <div class="getInvolvedDark">
            <div class="sectionInner">
              <h2 class="bigHeading" aria-label="${GET_INVOLVED_CONTENT.heading}">${GET_INVOLVED_CONTENT.heading}</h2>
              <p class="eyebrow">${GET_INVOLVED_CONTENT.eyebrow}</p>
              ${GET_INVOLVED_CONTENT.paragraphs.map(
                (paragraph) => html`<p>${paragraph}</p>`
              )}
              <button
                class="button yp-hard-shadow-box"
                aria-label="${SHARE_IDEA_BUTTON_LABEL}"
                @click="${this._shareYourIdea}"
              >
                ${SHARE_IDEA_BUTTON_LABEL}
              </button>

              <h2
                class="bigHeading howItWorksHeading"
                aria-label="${HOW_IT_WORKS_CONTENT.heading}"
              >
                ${HOW_IT_WORKS_CONTENT.heading}
              </h2>
              <div class="howItWorksGrid">
                ${HOW_IT_WORKS_CONTENT.steps.map(
                  (step) => html`
                    <div class="howItWorksCard yp-hard-shadow-box">
                      <h3 aria-label="${step.title}">${step.title}</h3>
                      <p>${step.description}</p>
                    </div>
                  `
                )}
              </div>
            </div>
          </div>

          <div class="kindOfThingSection">
            <div class="sectionInner">
              <h2 class="bigHeading" aria-label="${KIND_OF_THING_CONTENT.heading}">${KIND_OF_THING_CONTENT.heading}</h2>
              ${KIND_OF_THING_CONTENT.paragraphs.map(
                (paragraph) => html`
                  <p class="${paragraph.bold ? "kindOfThingEmphasis" : ""}">
                    ${paragraph.text}
                  </p>
                `
              )}
              <div class="carouselWrapper">
                <button
                  class="carouselArrow carouselArrowLeft"
                  aria-label="Show previous examples"
                  ?disabled="${!this.carouselCanScrollLeft}"
                  @click="${() => this._scrollCarousel(-1)}"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M15 6l-6 6 6 6"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button
                  class="carouselArrow carouselArrowRight"
                  aria-label="Show more examples"
                  ?disabled="${!this.carouselCanScrollRight}"
                  @click="${() => this._scrollCarousel(1)}"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M9 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
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
                            ${idea.image
                              ? html`<img
                                  src="${idea.image}"
                                  alt="${idea.alt}"
                                />`
                              : IMAGE_PLACEHOLDER_LABEL}
                          </div>
                          <div class="carouselCardBody yp-hard-shadow-box">
                            <h3 aria-label="${idea.title}">${idea.title}</h3>
                            <p>${idea.description}</p>
                          </div>
                        </div>
                      `
                    )}
                  </div>
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

          <div class="martinSection">
            <div class="sectionInner martinGrid">
              <h2 class="bigHeading martinHeading" aria-label="${MARTIN_CONTENT.heading}">${MARTIN_CONTENT.heading}</h2>
              <div class="martinImage" aria-hidden="true">
              <img src="/images/home/martin_crop.jpg" alt="Photo of Martin Lewis" />
              </div>
              <div class="martinCopy">
                ${MARTIN_CONTENT.paragraphs.map(
                  (paragraph) => html`<p>${paragraph}</p>`
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="about-us">
          <div class="aboutUsSection">
            <div class="sectionInner aboutUsGrid">
              <div class="aboutUsLogo" aria-hidden="true">
                <svg width="1429" height="574" viewBox="0 0 1429 574" fill="none" xmlns="http://www.w3.org/2000/svg">
					<title>Small Ideas logo</title>
					<path d="M1036.02 278.898L1344.02 322.4L1358.02 429.898H1036.02V278.898Z" fill="#191923"/>
					<path d="M169.523 446.398L56.0234 321.898L192.023 296.898L264.523 391.398L169.523 446.398Z" fill="#191923" stroke="black"/>
					<path d="M334.023 459.398L220.523 334.898L289.523 230.898L378.523 405.898L334.023 459.398Z" fill="#191923" stroke="black"/>
					<path d="M439.523 459.398L326.023 334.898L395.023 230.898L484.023 405.898L439.523 459.398Z" fill="#191923" stroke="black"/>
					<path d="M540.523 459.398L427.023 334.898L487.523 173.898L585.023 405.898L540.523 459.398Z" fill="#191923" stroke="black"/>
					<path d="M625.523 459.398L512.023 334.898L581.023 230.898L670.023 405.898L625.523 459.398Z" fill="#191923" stroke="black"/>
					<path d="M740.523 459.398L627.023 334.898L696.023 230.898L785.023 405.898L740.523 459.398Z" fill="#191923" stroke="black"/>
					<path d="M826.523 459.398L713.023 334.898L782.023 230.898L871.023 405.898L826.523 459.398Z" fill="#191923" stroke="black"/>
					<path d="M984.523 459.398L869.023 401.398L940.023 230.898L1029.02 405.898L984.523 459.398Z" fill="#191923" stroke="black"/>
					<path d="M230.695 463.835C199.315 463.835 176.659 456.023 162.727 440.398C148.924 424.773 142.023 399.903 142.023 365.789V354.656H209.992V375.164C209.992 383.106 211.164 389.356 213.508 393.914C215.982 398.341 220.214 400.554 226.203 400.554C232.453 400.554 236.75 398.927 239.094 395.671C241.568 392.286 242.805 387.403 242.805 381.023C242.805 372.559 239.94 365.398 234.211 359.539C228.612 353.679 219.302 345.736 206.281 335.71L176.594 312.664C163.964 302.898 155.044 292.091 149.836 280.242C144.628 268.393 142.023 254.005 142.023 237.078C142.023 210.645 148.794 190.007 162.336 175.164C176.008 160.32 195.734 152.898 221.516 152.898C253.026 152.898 275.357 161.101 288.508 177.507C301.789 193.914 308.43 218.002 308.43 249.773H238.703V232.976C238.703 221.778 233.495 216.179 223.078 216.179C217.87 216.179 214.029 217.742 211.555 220.867C209.081 223.861 207.844 227.768 207.844 232.585C207.844 237.403 208.951 241.96 211.164 246.257C213.508 250.424 218.846 255.893 227.18 262.664L266.828 294.89C281.281 306.609 292.219 318.914 299.641 331.804C307.062 344.695 310.773 361.427 310.773 382C310.773 396.322 308.169 409.734 302.961 422.234C297.883 434.734 289.484 444.825 277.766 452.507C266.047 460.059 250.357 463.835 230.695 463.835Z" fill="#191923"/>
					<path d="M333.82 460.71V156.023H438.508L467.414 337.664L496.125 156.023H601.789V460.71H538.898V250.75L499.445 460.71H437.727L395.93 250.359V460.71H333.82Z" fill="#191923"/>
					<path d="M622.883 460.71L656.086 156.023H772.688L805.305 460.71H740.266L735.773 405.242H693.586L689.68 460.71H622.883ZM711.945 210.71L699.25 350.359H729.328L715.07 210.71H711.945Z" fill="#191923"/>
					<path d="M826.398 460.71V156.023H895.148V375.71H965.852V460.71H826.398Z" fill="#191923"/>
					<path d="M985.383 460.71V156.023H1054.13V375.71H1428.82V460.71H985.383Z" fill="#191923"/>
					<path d="M1315.02 249.398L1428.52 373.898V459.79H1315.02V249.398Z" fill="#191923"/>
					<path d="M1314.02 33H995.023V231H1314.02V33Z" fill="#E144DC"/>
					<path d="M1050.6 173.898V97.7263H1067.2V173.898H1050.6ZM1074.03 173.898V97.7263H1097.71C1103.9 97.7263 1108.54 99.4513 1111.63 102.902C1114.76 106.32 1116.32 111.333 1116.32 117.941V148.41C1116.32 156.548 1114.9 162.83 1112.07 167.257C1109.24 171.684 1104.26 173.898 1097.13 173.898H1074.03ZM1091.32 158.712H1094.3C1097.45 158.712 1099.03 157.182 1099.03 154.123V119.552C1099.03 116.688 1098.64 114.848 1097.86 114.035C1097.11 113.188 1095.57 112.765 1093.22 112.765H1091.32V158.712ZM1123.35 173.898V97.7263H1157.72V114.328H1140.83V126.925H1157.04V143.087H1140.83V157.15H1158.85V173.898H1123.35ZM1162.22 173.898L1170.52 97.7263H1199.67L1207.82 173.898H1191.56L1190.44 160.031H1179.89L1178.92 173.898H1162.22ZM1184.48 111.398L1181.31 146.31H1188.83L1185.26 111.398H1184.48ZM1233.51 174.679C1225.66 174.679 1220 172.726 1216.51 168.82C1213.06 164.914 1211.34 158.696 1211.34 150.167V147.384H1228.33V152.511C1228.33 154.497 1228.62 156.059 1229.21 157.199C1229.83 158.306 1230.89 158.859 1232.38 158.859C1233.95 158.859 1235.02 158.452 1235.61 157.638C1236.22 156.792 1236.53 155.571 1236.53 153.976C1236.53 151.86 1235.82 150.07 1234.38 148.605C1232.99 147.14 1230.66 145.154 1227.4 142.648L1219.98 136.886C1216.82 134.445 1214.59 131.743 1213.29 128.781C1211.99 125.819 1211.34 122.222 1211.34 117.99C1211.34 111.382 1213.03 106.222 1216.42 102.511C1219.83 98.8003 1224.77 96.9453 1231.21 96.9453C1239.09 96.9453 1244.67 98.9963 1247.96 103.097C1251.28 107.199 1252.94 113.221 1252.94 121.164H1235.51V116.964C1235.51 114.165 1234.21 112.765 1231.6 112.765C1230.3 112.765 1229.34 113.156 1228.72 113.937C1228.1 114.686 1227.79 115.662 1227.79 116.867C1227.79 118.071 1228.07 119.21 1228.62 120.285C1229.21 121.326 1230.54 122.694 1232.63 124.386L1242.54 132.443C1246.15 135.373 1248.89 138.449 1250.74 141.671C1252.6 144.894 1253.53 149.077 1253.53 154.22C1253.53 157.801 1252.87 161.154 1251.57 164.279C1250.3 167.404 1248.2 169.927 1245.27 171.847C1242.34 173.735 1238.42 174.679 1233.51 174.679Z" fill="#EDEFF2"/>
					<path d="M484.023 31.8984L526.523 78.5174V161.898L489.523 211.898L484.023 31.8984Z" fill="#191923" stroke="black"/>
					<path d="M321.023 31.8984L363.523 78.5174V161.898L326.523 211.898L321.023 31.8984Z" fill="#191923" stroke="black"/>
					<path d="M91.0234 230.898L133.523 277.517L91.0234 289.898V230.898Z" fill="#191923" stroke="black"/>
					<path d="M179.523 70.3984L209.523 105.898V157.398L147.523 211.898L58.0234 105.898L179.523 70.3984Z" fill="#191923" stroke="black"/>
					<path d="M570.023 93.8984L612.523 140.517V223.898L586.023 249.398L570.023 93.8984Z" fill="#191923" stroke="black"/>
					<path d="M101.516 29.6484C133.501 29.6484 157.006 37.9734 171.033 55.4624C184.968 72.6764 191.68 97.6184 191.68 129.773V133.023H115.453V112.976C115.453 107.822 114.249 104.562 112.417 102.592C110.626 100.667 107.723 99.4294 103.078 99.4294C98.5333 99.4294 95.781 100.764 94.1025 102.884L94.082 102.911L94.0605 102.937C92.1748 105.22 91.0938 108.336 91.0938 112.585C91.0938 116.863 92.0677 120.892 94.0264 124.714C96.0601 128.296 100.955 133.418 109.229 140.141L148.878 172.368H148.877C163.564 184.276 174.794 196.872 182.457 210.182C190.251 223.719 194.023 241.065 194.023 262C194.023 276.726 191.344 290.565 185.961 303.484C180.623 316.607 171.787 327.201 159.548 335.225L159.526 335.239C147.109 343.241 130.736 347.085 110.695 347.085C78.8539 347.085 55.1033 339.162 40.3008 322.561L40.291 322.549C25.7189 306.053 18.7734 280.223 18.7734 245.789V231.406H93.2422V255.164C93.2422 262.816 94.3767 268.468 96.374 272.379C98.1628 275.542 101.164 277.304 106.203 277.304C112.007 277.304 115.005 275.788 116.456 273.772L116.463 273.763L116.47 273.753C118.374 271.147 119.555 267.052 119.555 261.023C119.555 253.378 117.001 247.041 111.887 241.811L111.861 241.784C106.441 236.111 97.293 228.291 84.2988 218.286L84.2881 218.278L54.6055 195.235L53.4014 194.292C41.0669 184.511 32.1615 173.609 26.8604 161.549C21.4243 149.182 18.7734 134.323 18.7734 117.078C18.7734 90.0974 25.6928 68.5844 39.9346 52.9734L39.9404 52.9674L39.9453 52.9614C54.3932 37.2754 75.094 29.6484 101.516 29.6484ZM321.281 32.7734L321.718 35.5124L347.403 196.915L372.915 35.5154L373.349 32.7734H485.039V343.96H415.648V165.645L382.64 341.311L382.142 343.96H315.059L314.539 341.344L279.18 163.39V343.96H210.57V32.7734H321.281ZM655.608 32.7734L655.919 35.6774L688.536 340.365L688.921 343.96H617.269L617.026 340.973L612.776 288.492H576.615L572.922 340.939L572.709 343.96H499.26L499.652 340.358L532.855 35.6704L533.171 32.7734H655.608ZM778.398 32.7734V252.46H849.102V343.96H703.148V32.7734H778.398ZM937.383 32.7734V252.46H1312.07V343.96H862.133V32.7734H937.383ZM582.809 227.109H605.729L593.604 108.353L582.809 227.109Z" fill="#EDEFF2" stroke="#191923" stroke-width="6.5"/>
					<path d="M940.023 31.8984L1053.52 156.398V249.898H940.023V31.8984Z" fill="#191923" stroke="black"/>
					<path d="M780.023 31.8984L861.523 121.297V249.898H780.023V31.8984Z" fill="#191923" stroke="black"/>
					<path d="M658.023 31.8984L700.523 78.5174V161.898L674.023 187.398L658.023 31.8984Z" fill="#191923" stroke="black"/>
					<path d="M1314.02 33H995.023V231H1314.02V33Z" fill="#E144DC"/>
					<path d="M1028.36 185V89.7846H1049.12V185H1028.36ZM1057.66 185V89.7846H1087.26C1094.99 89.7846 1100.79 91.9416 1104.66 96.2546C1108.56 100.527 1110.52 106.794 1110.52 115.054V153.14C1110.52 163.312 1108.75 171.165 1105.21 176.699C1101.67 182.233 1095.44 185 1086.53 185H1057.66ZM1079.27 166.018H1082.99C1086.94 166.018 1088.91 164.106 1088.91 160.281V117.068C1088.91 113.487 1088.42 111.188 1087.45 110.171C1086.51 109.113 1084.58 108.584 1081.65 108.584H1079.27V166.018ZM1119.31 185V89.7846H1162.27V110.537H1141.16V126.284H1161.42V146.487H1141.16V164.065H1163.68V185H1119.31ZM1167.89 185L1178.27 89.7846H1214.7L1224.9 185H1204.57L1203.17 167.666H1189.98L1188.76 185H1167.89ZM1195.72 106.875L1191.75 150.515H1201.15L1196.7 106.875H1195.72ZM1257 185.977C1247.2 185.977 1240.12 183.535 1235.76 178.652C1231.45 173.77 1229.29 165.998 1229.29 155.337V151.858H1250.53V158.267C1250.53 160.749 1250.9 162.702 1251.63 164.126C1252.4 165.509 1253.73 166.201 1255.6 166.201C1257.55 166.201 1258.89 165.693 1259.63 164.675C1260.4 163.617 1260.79 162.091 1260.79 160.098C1260.79 157.453 1259.89 155.215 1258.1 153.384C1256.35 151.553 1253.44 149.071 1249.37 145.938L1240.09 138.735C1236.15 135.684 1233.36 132.306 1231.73 128.604C1230.11 124.901 1229.29 120.404 1229.29 115.115C1229.29 106.855 1231.41 100.405 1235.64 95.7666C1239.91 91.1276 1246.08 88.8086 1254.13 88.8086C1263.98 88.8086 1270.96 91.3716 1275.07 96.4986C1279.22 101.626 1281.29 109.154 1281.29 119.082H1259.5V113.833C1259.5 110.334 1257.88 108.584 1254.62 108.584C1252.99 108.584 1251.79 109.072 1251.02 110.049C1250.25 110.985 1249.86 112.205 1249.86 113.711C1249.86 115.216 1250.21 116.641 1250.9 117.983C1251.63 119.285 1253.3 120.994 1255.9 123.11L1268.29 133.181C1272.81 136.843 1276.23 140.688 1278.55 144.717C1280.87 148.745 1282.03 153.974 1282.03 160.403C1282.03 164.879 1281.21 169.07 1279.58 172.976C1278 176.882 1275.37 180.036 1271.71 182.437C1268.05 184.797 1263.15 185.977 1257 185.977Z" fill="#EDEFF2"/>
				</svg>
              </div>
              <div class="aboutUsCopy">
                <h2 class="bigHeading" aria-label="${ABOUT_US_CONTENT.heading}">${ABOUT_US_CONTENT.heading}</h2>
                ${ABOUT_US_CONTENT.paragraphs.map(
                  (paragraph) => html`<p>${paragraph}</p>`
                )}
				<p>
          <a href="${ABOUT_US_CONTENT.pressLink}" @click="${(event: Event) => this._onAnchorClick(event, "press-releases")}">${ABOUT_US_CONTENT.pressLabel}</a>
				</p>
			  </div>
			  <div class="aboutUsPeopleGrid">
				<div>
				<p>${ABOUT_US_CONTENT.ledByLabel}</p>
				<ul class="aboutUsLeadershipList">
					${ABOUT_US_CONTENT.leaders.map(
					(leader) => html`<li>${leader}</li>`
					)}
				</ul>
				</div>
				<div>
				<p>${ABOUT_US_CONTENT.panelLabel}</p>
				<ul class="aboutUsLeadershipList">
					${ABOUT_US_CONTENT.panel.map(
					(member) => html`<li>${member}</li>`
					)}
				</ul>
			    </div>
			  </div>
			  <div class="aboutUsActions">
				<button
				class="button yp-hard-shadow-box"
				aria-label="${SHARE_IDEA_BUTTON_LABEL}"
				@click="${this._shareYourIdea}"
				>
				${SHARE_IDEA_BUTTON_LABEL}
				</button>
			  </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faqs">
          <div class="faqsSection">
            <div class="sectionInner">
              <h2 class="bigHeading" aria-label="${FAQS_CONTENT.heading}">${FAQS_CONTENT.heading}</h2>
              <div class="faqList">
                ${FAQS_CONTENT.items.map((item, index) => {
                  const isOpen = this.openFaqIndexes.has(index);
                  return html`
                    <div class="faqItem yp-hard-shadow-box">
                      <button
                        class="faqQuestion"
                        aria-label="${item.question}"
                        aria-expanded="${isOpen}"
                        aria-controls="faq-answer-${index}"
                        @click="${() => this._toggleFaq(index)}"
                      >
                        <span>${item.question}</span>
                        <span class="faqToggleIcon" aria-hidden="true">
                          ${isOpen ? "−" : "+"}
                        </span>
                      </button>
                      <p
                        class="faqAnswer"
                        id="faq-answer-${index}"
                        ?hidden="${!isOpen}"
                      >
                        ${item.answer || FAQ_ANSWER_PENDING_LABEL}
                      </p>
                    </div>
                  `;
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="press-releases">
          <div class="pressReleasesSection">
            <div class="sectionInner">
              <h2 class="bigHeading">${PRESS_RELEASES_CONTENT.heading}</h2>
              <p class="pressReleasesDescription">${PRESS_RELEASES_CONTENT.description}</p>
              <div class="pressReleaseList">
                ${PRESS_RELEASES_CONTENT.items.map(
                  (item) => html`
                    <article class="pressReleaseItem yp-hard-shadow-box">
                      <h3>
                        ${item.pdfUrl
                          ? html`<a href="${item.pdfUrl}">${item.title} [pdf]</a>`
                          : item.title}
                      </h3>
                      <p>${item.description}</p>
                      <p class="pressReleaseDate">${item.releaseDate}</p>
                    </article>
                  `
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="siteFooter">
        <div class="sectionInner">
            <div class="footerTopRow">
              <div>
                <h2 class="footerHeading" aria-label="${FOOTER_CONTENT.heading}">${FOOTER_CONTENT.heading}</h2>
                <a
                  class="footerEmail"
                  aria-label="${FOOTER_CONTENT.emailAddress}"
                  href="mailto:${FOOTER_CONTENT.emailAddress}"
                >
                  ${FOOTER_CONTENT.emailAddress}
                </a>
              </div>
              <div class="logosContainer">
                <div>${FOOTER_CONTENT.details}</div>
                <div class="logos">
                    ${FOOTER_CONTENT.charities.map(charity => {
                      return html `<div>
                          <a href="${charity.url}"><img class="logo" src="${charity.logo.url}" alt="${charity.logo.alt}"></a>
                          <div>Charity number: ${charity.number}</div>
                      </div>`;
                    })}
                </div>
              </div>
            </div>
          <div class="footerBottomRow">
            <p class="footerCopyright">
              &copy; ${new Date().getFullYear()}
              ${FOOTER_CONTENT.copyrightHolder}. All rights reserved.
            </p>
            <div class="footerPolicyLinks">
              <a
                class="footerPrivacyLink"
                aria-label="${FOOTER_CONTENT.privacyPolicyLabel}"
                href="${FOOTER_CONTENT.privacyPolicyUrl}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${FOOTER_CONTENT.privacyPolicyLabel}
              </a>
              <button
                class="footerPrivacyLink footerCookieSettings"
                type="button"
                @click="${() => window.app.openCookiePreferences()}"
              >
                Cookie settings
              </button>
            </div>
          </div>
        </div>
      </footer>
    `;
  }
}
