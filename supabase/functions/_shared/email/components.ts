// HTML components used by buildEmail(). Every component is light-first; dark
// variants are toggled via class names that the head <style> block in builder
// flips inside @media (prefers-color-scheme: dark) and [data-ogsc].

import { escapeHtml, ltrSpan } from "./escape.ts";
import {
  DIFF_COLORS,
  FONT_STACK,
  PALETTE,
  RADII,
  SIZES,
  STATUS_COLORS,
  type StatusKey,
} from "./theme.ts";

// ─── Section types (discriminated union) ─────────────────────────────────────

export type EmailSection =
  | { kind: "paragraph"; text: string; muted?: boolean }
  | { kind: "heading"; text: string }
  | { kind: "infoBox"; rows: Array<{ label: string; value: string; ltr?: boolean; strike?: boolean }> }
  | { kind: "alertBox"; title?: string; text: string; status?: StatusKey }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "diffTable"; rows: Array<{ label: string; oldValue: string; newValue: string; ltr?: boolean }> }
  | { kind: "otpRow"; code: string }
  | { kind: "divider" }
  | { kind: "rawHtml"; html: string };

// ─── Paragraph ────────────────────────────────────────────────────────────────

export function renderParagraph(text: string, muted = false): string {
  const cls = muted ? "e-mute" : "e-body";
  const colorLight = muted ? PALETTE.light.muted : PALETTE.light.body;
  const sz = muted ? SIZES.small : SIZES.body;
  return `
    <tr><td class="e-pad" style="padding:0 ${RADII.card === "16px" ? "32px" : "32px"} 16px;">
      <p class="${cls}" style="margin:0;color:${colorLight};font-size:${sz};line-height:1.85;font-family:${FONT_STACK};">
        ${escapeHtml(text)}
      </p>
    </td></tr>`;
}

// ─── Heading ─────────────────────────────────────────────────────────────────

export function renderHeading(text: string): string {
  return `
    <tr><td class="e-pad" style="padding:8px 32px 12px;">
      <h2 class="e-h1" style="margin:0;color:${PALETTE.light.text};font-size:${SIZES.h2};line-height:1.5;font-weight:700;font-family:${FONT_STACK};">
        ${escapeHtml(text)}
      </h2>
    </td></tr>`;
}

// ─── InfoBox ─────────────────────────────────────────────────────────────────

export function renderInfoBox(
  rows: Array<{ label: string; value: string; ltr?: boolean; strike?: boolean }>,
): string {
  const rowsHtml = rows.map((row, i) => {
    const isLast = i === rows.length - 1;
    const valueStyle = [
      `color:${PALETTE.light.text}`,
      `font-size:${SIZES.body}`,
      `font-weight:600`,
      row.strike ? "text-decoration:line-through;text-decoration-thickness:2px;color:#b91c1c" : "",
    ].filter(Boolean).join(";");
    const valueHtml = row.ltr ? ltrSpan(row.value) : escapeHtml(row.value);
    return `
      <tr>
        <td class="e-mute ib-label" style="padding:12px 16px;color:${PALETTE.light.muted};font-size:${SIZES.small};font-family:${FONT_STACK};white-space:nowrap;${isLast ? "" : `border-bottom:1px solid ${PALETTE.light.divider};`}">
          ${escapeHtml(row.label)}
        </td>
        <td class="e-h1 ib-value" align="left" style="padding:12px 16px;${valueStyle};font-family:${FONT_STACK};${isLast ? "" : `border-bottom:1px solid ${PALETTE.light.divider};`}">
          ${valueHtml}
        </td>
      </tr>`;
  }).join("");
  return `
    <tr><td class="e-pad" style="padding:6px 32px 16px;">
      <table role="presentation" class="e-infobox" width="100%" cellspacing="0" cellpadding="0" border="0"
             style="border:1px solid ${PALETTE.light.border};border-radius:${RADII.control};background:${PALETTE.light.soft};border-collapse:separate;">
        ${rowsHtml}
      </table>
    </td></tr>`;
}

// ─── AlertBox ────────────────────────────────────────────────────────────────

export function renderAlertBox(
  text: string,
  status: StatusKey = "info",
  title?: string,
): string {
  const c = STATUS_COLORS[status];
  const titleHtml = title
    ? `<p style="margin:0 0 6px;color:${c.textLight};font-weight:700;font-size:${SIZES.body};font-family:${FONT_STACK};">${escapeHtml(title)}</p>`
    : "";
  return `
    <tr><td class="e-pad" style="padding:0 32px 16px;">
      <table role="presentation" class="e-alert e-alert-${status}" width="100%" cellspacing="0" cellpadding="0" border="0"
             style="background:${c.pillBgLight};border:1px solid ${c.border};border-radius:${RADII.control};">
        <tr><td style="padding:14px 16px;">
          ${titleHtml}
          <p class="e-body" style="margin:0;color:${PALETTE.light.body};font-size:${SIZES.body};line-height:1.85;font-family:${FONT_STACK};white-space:pre-wrap;overflow-wrap:anywhere;">
            ${escapeHtml(text)}
          </p>
        </td></tr>
      </table>
    </td></tr>`;
}

// ─── List ────────────────────────────────────────────────────────────────────

export function renderList(items: string[], ordered = false): string {
  const tag = ordered ? "ol" : "ul";
  const lis = items.map((item) =>
    `<li style="margin:0 0 8px;color:${PALETTE.light.body};font-size:${SIZES.body};line-height:1.85;font-family:${FONT_STACK};">${escapeHtml(item)}</li>`
  ).join("");
  return `
    <tr><td class="e-pad" style="padding:0 32px 16px;">
      <${tag} class="e-list" style="margin:0;padding:0 18px 0 0;color:${PALETTE.light.body};font-size:${SIZES.body};line-height:1.85;font-family:${FONT_STACK};">
        ${lis}
      </${tag}>
    </td></tr>`;
}

// ─── Diff Table (user-update) ────────────────────────────────────────────────

export function renderDiffTable(
  rows: Array<{ label: string; oldValue: string; newValue: string; ltr?: boolean }>,
): string {
  const rowsHtml = rows.map((r, i) => {
    const isLast = i === rows.length - 1;
    const oldHtml = r.ltr ? ltrSpan(r.oldValue) : escapeHtml(r.oldValue);
    const newHtml = r.ltr ? ltrSpan(r.newValue) : escapeHtml(r.newValue);
    const cellBorder = isLast ? "" : `border-bottom:1px solid ${PALETTE.light.divider};`;
    return `
      <tr>
        <td class="e-mute df-label" valign="top" style="padding:12px 16px;color:${PALETTE.light.muted};font-size:${SIZES.small};font-family:${FONT_STACK};white-space:nowrap;${cellBorder}">
          ${escapeHtml(r.label)}
        </td>
        <td class="df-old" valign="top" style="padding:12px 8px;color:${DIFF_COLORS.oldLight};font-size:${SIZES.body};text-decoration:line-through;text-decoration-thickness:2px;font-family:${FONT_STACK};${cellBorder}">
          ${oldHtml}
        </td>
        <td class="df-new" valign="top" style="padding:12px 16px;color:${DIFF_COLORS.newLight};font-size:${SIZES.body};font-weight:700;font-family:${FONT_STACK};${cellBorder}">
          ${newHtml}
        </td>
      </tr>`;
  }).join("");
  return `
    <tr><td class="e-pad" style="padding:6px 32px 16px;">
      <table role="presentation" class="e-difftable" width="100%" cellspacing="0" cellpadding="0" border="0"
             style="border:1px solid ${PALETTE.light.border};border-radius:${RADII.control};background:${PALETTE.light.soft};border-collapse:separate;">
        ${rowsHtml}
      </table>
    </td></tr>`;
}

// ─── OTP Row ─────────────────────────────────────────────────────────────────

export function renderOtpRow(code: string): string {
  // Each digit is its own <td>, so Gmail/Outlook stripping can't collapse them.
  const digits = String(code).split("");
  const cells = digits.map((d) => `
    <td class="otp-cell" align="center" valign="middle"
        style="width:48px;height:56px;background:#eff6ff;border:2px solid #2563eb;border-radius:12px;color:#1d4ed8;font-size:26px;font-weight:800;font-family:'JetBrains Mono',Consolas,'Courier New',monospace;line-height:56px;">
      ${escapeHtml(d)}
    </td>
    <td style="width:8px;font-size:1px;line-height:1px;">&nbsp;</td>
  `).join("");
  // Trim the trailing 8px spacer
  const cleaned = cells.replace(/<td style="width:8px;[^"]*">&nbsp;<\/td>\s*$/, "");
  return `
    <tr><td class="e-pad" style="padding:6px 32px 22px;" align="center">
      <table role="presentation" class="e-otp" align="center" cellspacing="0" cellpadding="0" border="0" dir="ltr">
        <tr>${cleaned}</tr>
      </table>
    </td></tr>`;
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function renderDivider(): string {
  return `
    <tr><td class="e-pad" style="padding:0 32px;">
      <div class="e-divider" style="height:1px;line-height:1px;font-size:1px;background:${PALETTE.light.divider};">&nbsp;</div>
    </td></tr>`;
}

// ─── CTA Button (with VML fallback for Outlook desktop) ───────────────────────

export function renderCtaButton(text: string, url: string, status: StatusKey = "info"): string {
  const c = STATUS_COLORS[status];
  return `
    <tr><td class="e-pad e-cta" align="center" style="padding:18px 32px 26px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                   href="${escapeHtml(url)}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="25%"
                   stroke="f" fillcolor="${c.border}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Tahoma,Arial,sans-serif;font-size:14px;font-weight:bold;">${escapeHtml(text)}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${escapeHtml(url)}"
         style="display:inline-block;padding:14px 36px;background:${c.border};color:#ffffff;font-size:15px;font-weight:700;border-radius:${RADII.control};text-decoration:none;font-family:${FONT_STACK};border:1px solid ${c.border};line-height:1;">
        ${escapeHtml(text)}
      </a>
      <!--<![endif]-->
    </td></tr>`;
}

// ─── Hero ────────────────────────────────────────────────────────────────────

export function renderHero(opts: {
  badge: string;
  status: StatusKey;
  heroIcon?: string;
  greeting?: string;
  intro?: string;
  introEn?: string;
  logoLight: string;
  logoLight2x: string;
  logoDark: string;
  logoDark2x: string;
}): string {
  const c = STATUS_COLORS[opts.status];

  const iconCircle = opts.heroIcon
    ? `
      <tr><td class="e-pad" align="center" style="padding:6px 32px 18px;">
        <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td class="e-icon-circle" align="center" valign="middle" width="64" height="64"
                style="width:64px;height:64px;background:${c.iconCircleBgLight};border:1px solid ${c.border};border-radius:999px;font-size:30px;line-height:64px;color:${c.textLight};">
              ${opts.heroIcon}
            </td>
          </tr>
        </table>
      </td></tr>`
    : "";

  const greeting = opts.greeting
    ? `
      <tr><td class="e-pad" align="center" style="padding:0 32px 8px;">
        <h1 class="e-h1" style="margin:0;color:${PALETTE.light.text};font-size:${SIZES.h1};line-height:1.4;font-weight:800;font-family:${FONT_STACK};text-align:center;">
          ${escapeHtml(opts.greeting)}
        </h1>
      </td></tr>`
    : "";

  const intro = opts.intro
    ? `
      <tr><td class="e-pad" align="center" style="padding:0 32px 8px;">
        <p class="e-body" style="margin:0;color:${PALETTE.light.body};font-size:${SIZES.body};line-height:1.85;font-family:${FONT_STACK};text-align:center;">
          ${escapeHtml(opts.intro)}
        </p>
      </td></tr>`
    : "";

  const introEn = opts.introEn
    ? `
      <tr><td class="e-pad" align="center" style="padding:0 32px 12px;">
        <p class="e-mute" dir="ltr" style="margin:0;color:${PALETTE.light.muted};font-size:${SIZES.small};line-height:1.6;font-family:${FONT_STACK};text-align:center;">
          ${escapeHtml(opts.introEn)}
        </p>
      </td></tr>`
    : "";

  return `
    <!-- HERO: logo + status pill -->
    <tr><td class="e-pad" align="center" style="padding:36px 32px 18px;">
      <img class="logo-light" src="${escapeHtml(opts.logoLight)}" srcset="${escapeHtml(opts.logoLight2x)} 2x" alt="Half Lens" width="240" height="80"
           style="display:block;border:0;width:240px;max-width:240px;height:auto;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
      <!--[if !mso]><!-->
      <img class="logo-dark" src="${escapeHtml(opts.logoDark)}" srcset="${escapeHtml(opts.logoDark2x)} 2x" alt="Half Lens" width="240" height="80"
           style="display:none;border:0;width:240px;max-width:240px;height:auto;outline:none;text-decoration:none;mso-hide:all;-ms-interpolation-mode:bicubic;" />
      <!--<![endif]-->

      <div style="margin-top:18px;">
        <span class="e-pill" style="display:inline-block;padding:7px 18px;border-radius:999px;background:${c.pillBgLight};border:1px solid ${c.border};color:${c.textLight};font-size:13px;font-weight:700;letter-spacing:.01em;font-family:${FONT_STACK};">
          ${opts.badge}
        </span>
      </div>
    </td></tr>
    ${iconCircle}
    ${greeting}
    ${intro}
    ${introEn}
  `;
}

// ─── Footer ──────────────────────────────────────────────────────────────────

export function renderFooter(siteUrl: string): string {
  const year = new Date().getFullYear();
  const safeSite = escapeHtml(siteUrl);
  return `
    <tr><td class="e-pad" align="center" style="padding:24px 32px 32px;border-top:1px solid ${PALETTE.light.divider};">
      <p class="e-mute" style="font-size:${SIZES.tiny};color:${PALETTE.light.muted};line-height:1.9;margin:0 0 6px;font-family:${FONT_STACK};">
        <a class="e-link" href="${safeSite}" style="color:${PALETTE.light.link};text-decoration:none;margin:0 6px;">الموقع</a>
        <span style="color:${PALETTE.light.subtle};">·</span>
        <a class="e-link" href="${safeSite}/privacy-policy" style="color:${PALETTE.light.link};text-decoration:none;margin:0 6px;">سياسة السرّية</a>
        <span style="color:${PALETTE.light.subtle};">·</span>
        <a class="e-link" href="${safeSite}/terms-and-conditions" style="color:${PALETTE.light.link};text-decoration:none;margin:0 6px;">الشروط</a>
      </p>
      <p class="e-mute" style="font-size:${SIZES.tiny};color:${PALETTE.light.muted};margin:0;font-family:${FONT_STACK};">
        &copy; ${year} Half Lens Production — جميع الحقوق محفوظة
      </p>
    </td></tr>`;
}

// ─── Section dispatcher ───────────────────────────────────────────────────────

export function renderSection(s: EmailSection): string {
  switch (s.kind) {
    case "paragraph": return renderParagraph(s.text, s.muted);
    case "heading":   return renderHeading(s.text);
    case "infoBox":   return renderInfoBox(s.rows);
    case "alertBox":  return renderAlertBox(s.text, s.status, s.title);
    case "list":      return renderList(s.items, s.ordered);
    case "diffTable": return renderDiffTable(s.rows);
    case "otpRow":    return renderOtpRow(s.code);
    case "divider":   return renderDivider();
    case "rawHtml":   return s.html; // caller is responsible for escaping
    default: {
      const _exhaustive: never = s;
      return "";
    }
  }
}
