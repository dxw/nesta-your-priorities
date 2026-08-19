import { html, css } from "lit";
import { customElement } from "lit/decorators.js";

import { YpBaseElement } from "../common/yp-base-element.js";
import { YpNavHelpers } from "../common/YpNavHelpers.js";
import "@material/web/button/filled-button.js";

@customElement("yp-page-not-available")
export class YpPageNotAvailable extends YpBaseElement {
  static override get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          width: 100%;
        }

        .pageNotAvailableContainer {
          padding: 64px 16px;
          text-align: center;
        }

        .pageNotAvailableMessage {
          font-size: 18px;
          margin-bottom: 24px;
        }
      `,
    ];
  }

  override render() {
    return html`
      <div class="layout vertical center-center pageNotAvailableContainer">
        <div class="pageNotAvailableMessage">
          ${this.t("pageNotAvailableMessage")}
        </div>
        <md-filled-button @click="${() => YpNavHelpers.redirectTo("/")}">
          ${this.t("backToHomepage")}
        </md-filled-button>
      </div>
    `;
  }
}
