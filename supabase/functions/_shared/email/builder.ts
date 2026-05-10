// buildEmail() — single source of truth for the HTML wrapper, CSS reset,
// dark-mode swap rules, and section composition. Every transactional email
// in the system is generated through this function.
//
// Design choices:
//   • LIGHT-FIRST. White card on light page bg by default. This is what most
//     mainstream apps (Stripe, Linear, Notion) use, because email clients
//     handle "light → dark force-invert" much more gracefully than the
//     reverse — a white background simply gets darkened, but a dark background
//     gets washed out and white logos disappear into the page.
//   • Solid hex everywhere. No rgba() for borders or backgrounds, because
//     iOS Mail's force-invert turns rgba shadows/borders transparent.
//   • Logo swap. <img class="logo-light"> shows by default. Inside
//     `@media (prefers-color-scheme: dark)` and `[data-ogsc]` (Outlook web)
//     we hide it and reveal `<img class="logo-dark">` instead. Both logos
//     have SOLID backgrounds (white box / navy box) so they survive
//     iOS Mail force-invert intact.
//   • Outlook desktop. We add MSO conditional comments to (a) force a
//     readable font, (b) emit a VML <v:roundrect> button fallback in the
//     CTA component.

import {
  type EmailSection,
  renderFooter,
  renderHero,
  renderSection,
} from "./components.ts";
import { preheaderHtml } from "./escape.ts";
import { appBaseUrl, FONT_STACK, logoUrls, PALETTE, RADII, type StatusKey } from "./theme.ts";
import { renderCtaButton } from "./components.ts";

export interface BuildEmailInput {
  /** Used both as <title> and as the returned email subject. */
  subject: string;
  /** Hidden snippet shown in the inbox preview row. */
  preheader: string;
  /** Drives accent colours throughout. */
  status: StatusKey;
  /** Pill text rendered under the logo, e.g. "✓ تمت الموافقة". */
  badge: string;
  /** Optional H1 greeting, e.g. "مرحباً مصطفى 👋". */
  greeting?: string;
  /** Optional Arabic lead paragraph (centered, under greeting). */
  intro?: string;
  /** Optional small English subtitle (centered, LTR). */
  introEn?: string;
  /** Optional emoji rendered in a status-tinted circle. */
  heroIcon?: string;
  /** Body content sections, rendered in order. */
  sections: EmailSection[];
  /** Optional primary CTA button at the bottom of the body. */
  cta?: { text: string; url: string };
  /** Override default app base URL used in footer links. */
  siteUrl?: string;
}

export interface BuildEmailResult {
  subject: string;
  html: string;
}

export function buildEmail(input: BuildEmailInput): BuildEmailResult {
  const logos = logoUrls();
  const site = input.siteUrl || appBaseUrl();

  const head = `<!DOCTYPE html>
<html lang="ar" dir="rtl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeForTitle(input.subject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <style>td,div,p,a,span,h1,h2,h3{font-family:Tahoma,Arial,sans-serif !important;}</style>
  <![endif]-->
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body, .e-page { background-color: ${PALETTE.light.pageBg}; }
    .e-card  { background-color: ${PALETTE.light.cardBg}; border:1px solid ${PALETTE.light.border}; }
    .e-h1, .ib-value { color:${PALETTE.light.text}; }
    .e-body  { color:${PALETTE.light.body}; }
    .e-mute, .ib-label, .df-label { color:${PALETTE.light.muted}; }
    .e-divider { background-color:${PALETTE.light.divider}; }
    .e-link  { color:${PALETTE.light.link}; }
    .e-infobox, .e-difftable { background:${PALETTE.light.soft}; border-color:${PALETTE.light.border}; }
    .logo-light { display:block; }
    .logo-dark  { display:none; mso-hide:all; }

    /* Status pill / alert backgrounds get a defensive dark variant via classes */
    .e-pill, .e-alert { /* base from inline */ }

    /* Dark mode (clients that respect color-scheme + prefers-color-scheme) */
    @media (prefers-color-scheme: dark) {
      body, .e-page { background-color:${PALETTE.dark.pageBg} !important; }
      .e-card { background-color:${PALETTE.dark.cardBg} !important; border-color:${PALETTE.dark.border} !important; }
      .e-h1, .ib-value { color:${PALETTE.dark.text} !important; }
      .e-body { color:${PALETTE.dark.body} !important; }
      .e-mute, .ib-label, .df-label { color:${PALETTE.dark.muted} !important; }
      .e-divider { background-color:${PALETTE.dark.divider} !important; }
      .e-link { color:${PALETTE.dark.link} !important; }
      .e-infobox, .e-difftable { background:${PALETTE.dark.cardBg} !important; border-color:${PALETTE.dark.border} !important; }

      .e-alert-info    { background:#0a1838 !important; border-color:#3b82f6 !important; }
      .e-alert-success { background:#022c22 !important; border-color:#10b981 !important; }
      .e-alert-warning { background:#2a1d05 !important; border-color:#f59e0b !important; }
      .e-alert-danger  { background:#2c0a0a !important; border-color:#ef4444 !important; }

      .otp-cell { background:#0a1838 !important; border-color:#3b82f6 !important; color:#60a5fa !important; }
      .df-old { color:#fca5a5 !important; }
      .df-new { color:#86efac !important; }

      .logo-light { display:none !important; }
      .logo-dark  { display:block !important; mso-hide:none !important; }
    }

    /* Outlook.com web (data-ogsc indicates user enabled dark mode) */
    [data-ogsc] body, [data-ogsc] .e-page { background-color:${PALETTE.dark.pageBg} !important; }
    [data-ogsc] .e-card { background-color:${PALETTE.dark.cardBg} !important; border-color:${PALETTE.dark.border} !important; }
    [data-ogsc] .e-h1, [data-ogsc] .ib-value { color:${PALETTE.dark.text} !important; }
    [data-ogsc] .e-body { color:${PALETTE.dark.body} !important; }
    [data-ogsc] .e-mute, [data-ogsc] .ib-label, [data-ogsc] .df-label { color:${PALETTE.dark.muted} !important; }
    [data-ogsc] .e-divider { background-color:${PALETTE.dark.divider} !important; }
    [data-ogsc] .e-link { color:${PALETTE.dark.link} !important; }
    [data-ogsc] .e-infobox, [data-ogsc] .e-difftable { background:${PALETTE.dark.cardBg} !important; border-color:${PALETTE.dark.border} !important; }
    [data-ogsc] .otp-cell { background:#0a1838 !important; border-color:#3b82f6 !important; color:#60a5fa !important; }
    [data-ogsc] .df-old { color:#fca5a5 !important; }
    [data-ogsc] .df-new { color:#86efac !important; }
    [data-ogsc] .logo-light { display:none !important; }
    [data-ogsc] .logo-dark  { display:block !important; }

    /* Mobile */
    @media only screen and (max-width: 600px) {
      .e-card { border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
      .e-pad  { padding-left:18px !important; padding-right:18px !important; }
      .e-h1   { font-size:20px !important; }
      .e-cta a { display:inline-block !important; padding:14px 28px !important; }
      .otp-cell { width:40px !important; height:48px !important; font-size:22px !important; line-height:48px !important; }
    }

    /* Reset link defaults */
    a { color:${PALETTE.light.link}; text-decoration:none; }
    a:hover { text-decoration:underline; }

    /* Outlook image quality */
    img { -ms-interpolation-mode:bicubic; }
  </style>
</head>`;

  const heroHtml = renderHero({
    badge: input.badge,
    status: input.status,
    heroIcon: input.heroIcon,
    greeting: input.greeting,
    intro: input.intro,
    introEn: input.introEn,
    logoLight: logos.light,
    logoLight2x: logos.light2x,
    logoDark: logos.dark,
    logoDark2x: logos.dark2x,
  });

  const sectionsHtml = input.sections.map(renderSection).join("");

  const ctaHtml = input.cta
    ? renderCtaButton(input.cta.text, input.cta.url, input.status)
    : "";

  const footerHtml = renderFooter(site);

  const body = `<body class="e-page" bgcolor="${PALETTE.light.pageBg}" style="margin:0;padding:0;background-color:${PALETTE.light.pageBg};font-family:${FONT_STACK};direction:rtl;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheaderHtml(input.preheader)}
  <table role="presentation" class="e-page" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PALETTE.light.pageBg}" style="background-color:${PALETTE.light.pageBg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="e-card" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PALETTE.light.cardBg}"
               style="max-width:600px;background-color:${PALETTE.light.cardBg};border:1px solid ${PALETTE.light.border};border-radius:${RADII.card};border-collapse:separate;overflow:hidden;">
          ${heroHtml}
          ${sectionsHtml}
          ${ctaHtml}
          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: input.subject,
    html: head + body,
  };
}

// Lightweight title escaper — <title> doesn't allow tags so we strip & escape.
function escapeForTitle(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
