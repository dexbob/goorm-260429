const quotes = [
  {
    ko: "성공은 준비된 자에게 온다.",
    author: "루이 파스퇴르",
    authorEn: "Louis Pasteur",
    original: "Chance favors the prepared mind.",
  },
  {
    ko: "포기하지 마라. 시작이 반이다.",
    author: "아리스토텔레스",
    authorEn: "Aristotle",
    original: "Well begun is half done.",
  },
  {
    ko: "행동이 모든 것을 바꾼다.",
    author: "파블로 피카소",
    authorEn: "Pablo Picasso",
    original: "Action is the foundational key to all success.",
  },
  {
    ko: "지금 하지 않으면 언제 하겠는가?",
    author: "속담",
    authorEn: "Chinese proverb",
    original: "The best time to plant a tree was 20 years ago. The second best time is now.",
  },
  {
    ko: "작은 습관이 큰 변화를 만든다.",
    author: "아리스토텔레스",
    authorEn: "Aristotle",
    original: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
  },
  {
    ko: "실패는 성공의 어머니이다.",
    author: "속담",
    authorEn: "English proverb",
    original: "Failure is the mother of success.",
  },
  {
    ko: "계속 가라. 멈추지만 않으면 된다.",
    author: "공자",
    authorEn: "Confucius",
    original: "It does not matter how slowly you go as long as you do not stop.",
  },
  {
    ko: "노력은 배신하지 않는다.",
    author: "토마스 에디슨",
    authorEn: "Thomas Edison",
    original: "Genius is one percent inspiration and ninety-nine percent perspiration.",
  },
  {
    ko: "오늘의 나가 내일의 나를 만든다.",
    author: "마하트마 간디",
    authorEn: "Mahatma Gandhi",
    original: "The future depends on what you do today.",
  },
  {
    ko: "도전 없이는 성장도 없다.",
    author: "닐 도널드 월시",
    authorEn: "Neale Donald Walsch",
    original: "Life begins at the end of your comfort zone.",
  },
];

const colors = ["#FF6B6B", "#6BCB77", "#4D96FF", "#FFD93D", "#845EC2"];

/** @type {const} */
const TRANSITIONS = ["flipX", "flipY", "slideL", "slideR", "zoom"];

const quoteElement = document.getElementById("quote");
const authorElement = document.getElementById("author");
const originalElement = document.getElementById("original");
const cardElement = document.getElementById("card");
const cardFill = document.getElementById("cardFill");
const cardBody = document.getElementById("cardBody");

const MIN_FONT_PX = 9;
const MAX_FONT_PX = 22;

function parseHex(hex) {
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

function relativeLuminance({ r, g, b }) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function mixRgb(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function rgbToCss({ r, g, b }, alpha = 1) {
  if (alpha >= 1) return `rgb(${r},${g},${b})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** WCAG 2 relative contrast between two sRGB colors (same formula as contrast ratio). */
function contrastBetween(bgRgb, fgRgb) {
  const Lbg = relativeLuminance(bgRgb);
  const Lfg = relativeLuminance(fgRgb);
  const lighter = Math.max(Lbg, Lfg) + 0.05;
  const darker = Math.min(Lbg, Lfg) + 0.05;
  return lighter / darker;
}

function setCardTextColors(bgHex) {
  const rgb = parseHex(bgHex);
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  const crBlack = contrastBetween(rgb, black);
  const crWhite = contrastBetween(rgb, white);
  const useDark = crBlack >= crWhite;
  const fg = useDark ? black : white;
  const ratio = Math.max(crBlack, crWhite);

  const soft = useDark
    ? mixRgb(fg, { r: 72, g: 68, b: 64 }, 0.32)
    : mixRgb(fg, { r: 32, g: 30, b: 28 }, 0.2);
  const softAlpha = ratio >= 4.5 ? (useDark ? 0.9 : 0.85) : useDark ? 0.95 : 0.92;

  cardElement.style.setProperty("--card-fg", rgbToCss(fg));
  cardElement.style.setProperty("--card-fg-soft", rgbToCss(soft, softAlpha));
  cardElement.style.setProperty(
    "--card-divider",
    useDark ? "rgba(0, 0, 0, 0.22)" : "rgba(255, 255, 255, 0.32)",
  );
  cardElement.style.setProperty("--card-author-opacity", ratio < 4.5 ? "1" : "0.94");

  if (ratio < 4.5) {
    const shadow = useDark
      ? "0 0 1px rgba(255, 255, 255, 0.55), 0 1px 2px rgba(0, 0, 0, 0.42)"
      : "0 0 1px rgba(0, 0, 0, 0.72), 0 1px 3px rgba(0, 0, 0, 0.55)";
    cardElement.style.setProperty("--card-fg-shadow", shadow);
  } else {
    cardElement.style.setProperty("--card-fg-shadow", "none");
  }
}

function fitCardText() {
  cardBody.style.fontSize = `${MAX_FONT_PX}px`;
  let low = MIN_FONT_PX;
  let high = MAX_FONT_PX;
  let best = MIN_FONT_PX;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    cardBody.style.fontSize = `${mid}px`;
    if (cardBody.scrollHeight <= cardBody.clientHeight + 1) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  cardBody.style.fontSize = `${best}px`;
}

function applyQuote(index) {
  const q = quotes[index];
  quoteElement.textContent = q.ko;
  authorElement.textContent = `- ${q.author} -`;
  originalElement.textContent = `${q.authorEn} — ${q.original}`;
  authorElement.hidden = false;
  originalElement.hidden = false;

  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  cardElement.style.backgroundColor = "transparent";
  cardFill.style.backgroundColor = randomColor;
  setCardTextColors(randomColor);

  requestAnimationFrame(() => {
    fitCardText();
  });
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function waitAnimationEnd(el) {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener("animationend", onEnd);
      resolve();
    };
    const onEnd = (e) => {
      if (e.target === el) done();
    };
    el.addEventListener("animationend", onEnd);
    window.setTimeout(done, 1100);
  });
}

function pickTransition() {
  return TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)];
}

let isBusy = false;

async function showNextQuote() {
  if (isBusy) return;
  const randomIndex = Math.floor(Math.random() * quotes.length);

  if (prefersReducedMotion()) {
    applyQuote(randomIndex);
    return;
  }

  const t = pickTransition();
  const leaveCls = `card--leave-${t}`;
  const enterCls = `card--enter-${t}`;

  isBusy = true;
  cardElement.classList.add("card--busy", "card--anim", leaveCls);
  cardElement.setAttribute("aria-busy", "true");

  await waitAnimationEnd(cardElement);

  cardElement.classList.remove(leaveCls);
  applyQuote(randomIndex);

  cardElement.classList.add(enterCls);
  await waitAnimationEnd(cardElement);

  cardElement.classList.remove(enterCls, "card--anim", "card--busy");
  cardElement.removeAttribute("aria-busy");
  isBusy = false;
}

cardElement.addEventListener("click", () => {
  showNextQuote();
});

cardElement.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    showNextQuote();
  }
});

window.addEventListener("resize", () => {
  if (!authorElement.hidden) {
    fitCardText();
  }
});

setCardTextColors("#5a3d7a");
requestAnimationFrame(() => {
  fitCardText();
});
