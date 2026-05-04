export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length !== 6) return { r: 90, g: 61, b: 122 };
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function rgbToCss({ r, g, b }: Rgb, alpha = 1): string {
  if (alpha >= 1) return `rgb(${r},${g},${b})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function contrastBetween(bgRgb: Rgb, fgRgb: Rgb): number {
  const Lbg = relativeLuminance(bgRgb);
  const Lfg = relativeLuminance(fgRgb);
  const lighter = Math.max(Lbg, Lfg) + 0.05;
  const darker = Math.min(Lbg, Lfg) + 0.05;
  return lighter / darker;
}

/** React `style`에 넣을 CSS 변수 묶음 */
export function cardTextColorVars(bgHex: string): Record<string, string> {
  const rgb = parseHex(bgHex);
  const black: Rgb = { r: 0, g: 0, b: 0 };
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const crBlack = contrastBetween(rgb, black);
  const crWhite = contrastBetween(rgb, white);
  const useDark = crBlack >= crWhite;
  const fg = useDark ? black : white;
  const ratio = Math.max(crBlack, crWhite);

  const soft = useDark
    ? mixRgb(fg, { r: 72, g: 68, b: 64 }, 0.32)
    : mixRgb(fg, { r: 32, g: 30, b: 28 }, 0.2);
  const softAlpha = ratio >= 4.5 ? (useDark ? 0.9 : 0.85) : useDark ? 0.95 : 0.92;

  const vars: Record<string, string> = {
    "--card-fg": rgbToCss(fg),
    "--card-fg-soft": rgbToCss(soft, softAlpha),
    "--card-divider": useDark ? "rgba(0, 0, 0, 0.22)" : "rgba(255, 255, 255, 0.32)",
    "--card-author-opacity": ratio < 4.5 ? "1" : "0.94",
  };

  if (ratio < 4.5) {
    vars["--card-fg-shadow"] = useDark
      ? "0 0 1px rgba(255, 255, 255, 0.55), 0 1px 2px rgba(0, 0, 0, 0.42)"
      : "0 0 1px rgba(0, 0, 0, 0.72), 0 1px 3px rgba(0, 0, 0, 0.55)";
  } else {
    vars["--card-fg-shadow"] = "none";
  }

  return vars;
}
