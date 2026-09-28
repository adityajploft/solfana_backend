import { t } from "../services/i18n/i18n.service.js";

// layouts/emailLayout.js
export const emailLayout = (content, lang = "fr") => {
  const logoUrl = `${process.env.APP_URL}/uploads/logo.png`;
  const bgImage = `${process.env.APP_URL}/uploads/auth-bg.webp`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

    <!-- iPhone Dark Mode Fix -->
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">

    <style>
      :root {
        color-scheme: light;
        supported-color-schemes: light;
      }

      body,
      table,
      td,
      div,
      p,
      a,
      span {
        -webkit-text-size-adjust: 100%;
        color:#ffffff !important;  
        }

      body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #000000 !important;
      }
    </style>
  </head>

  <body
    class="body"
    bgcolor="#000000"
    style="
      margin:0;
      padding:0;
      background:#000000 linear-gradient(#000000,#000000) !important;
    "
  >

    <div
      class="email-wrapper"
      style="
        background-image: url('${bgImage}');
        background-size: contain;
        background-position: right top;
        background-repeat: no-repeat;
        padding:40px 20px;
        font-family:Arial,sans-serif;
        color:#ffffff !important;   
        font-size:15px;
      "
    >

      <div
        class="email-card"
        style="
          max-width:600px;
          margin:0 auto;
          background: #000000cc;
          border-radius:12px;
          overflow:hidden;
          backdrop-filter: blur(10px) !important;
          border: 1px solid #e6d2f91a;
        "
      >

        <!-- Logo -->
        <div style="padding: 30px 30px 10px;text-align:center;">
          <img
            src="${logoUrl}"
            alt="logo"
            width="160"
            style="
              display:block;
              margin:auto;
              max-width:160px;
              height:auto;
              border:0;
            "
          />
        </div>

        <!-- Content -->
        <div
          class="force-text"
          style="
            padding:0 30px 40px;
            color: rgba(255,255,255,0.9) !important;
          "
        >
          ${content}

          <div style="margin-top:20px;">
            <p
              class="force-text"
              style="
                font-weight:bold;
                margin-bottom:4px;
                color:#ffffff !important;
              "
            >
              ${t(lang, 'global', 'BEST_REGARDS')},
            </p>

            <p
              class="force-text"
              style="
                margin-top:0;
                font-weight:bold;
                margin-bottom:0;
                color:#ffffff !important;       
              "
            >
              Solfana
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:0 30px;text-align:center;">
          <div style="width: 100%;height: 1px;background:#e6d2f91a linear-gradient(#e6d2f91a,#e6d2f91a);"></div>
          <div
            style="
              padding:30px 0;
            "
          >

            <!-- Links -->
            <div style="margin-bottom:20px;">

              <a
                href="#"
                class="force-text"
                style="
                  color:#ffffff !important;               
                  text-decoration:none;
                  font-size:14px;
                  margin:0 10px;
                "
              >
                ${t(lang, 'global', 'PRIVACY_POLICY')}
              </a>

              <a
                href="#"
                class="force-text"
                style="
                  color:#ffffff !important;             
                  text-decoration:none;
                  font-size:14px;
                  margin:0 10px;
                "
              >
                ${t(lang, 'global', 'TERMS_CONDITION')}
              </a>

            </div>

            <!-- Social -->
            <div style="margin-bottom:20px;">

              <a
                href="#"
                style="
                  display:inline-block;
                  margin:0 8px;
                "
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/32/733/733547.png"
                  width="24"
                  alt="Facebook"
                  style="border:0;"
                />
              </a>

              <a
                href="#"
                style="
                  display:inline-block;
                  margin:0 8px;
                "
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png"
                  width="24"
                  alt="Instagram"
                  style="border:0;"
                />
              </a>

            </div>

            <!-- Copyright -->
            <p
              class="force-text"
              style="
                font-size:12px;
                color:#ffffff !important;
                margin:0;
                background:#e6d2f91a linear-gradient(#e6d2f91a,#e6d2f91a) !important;
                padding:10px;
              "
            >
              &copy; 2026 Solfana Inc.
              ${t(lang, 'global', 'COPYRIGHTS')}.
            </p>

          </div>

        </div>

      </div>

    </div>

  </body>
  </html>
  `;
};