import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cardTextColorVars } from "./colorUtils";
import { CARD_COLORS, getQuoteEngine, TRANSITIONS, type CardTransition } from "./quoteEngine";
import { buildAuthorPrimaryLine } from "./quoteFormat";
import type { DisplayQuote } from "./quoteTypes";

const INTRO_KO = "카드를 누르면 한국 명언을 불러옵니다.";

const MIN_FONT_PX = 9;
const MAX_FONT_PX = 22;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function waitAnimationEnd(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener("animationend", onEnd);
      resolve();
    };
    const onEnd = (e: AnimationEvent) => {
      if (e.target === el) done();
    };
    el.addEventListener("animationend", onEnd);
    window.setTimeout(done, 1100);
  });
}

function pickTransition(): CardTransition {
  return TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)]!;
}

function fitCardText(cardBodyEl: HTMLElement): void {
  cardBodyEl.style.fontSize = `${MAX_FONT_PX}px`;
  let low = MIN_FONT_PX;
  let high = MAX_FONT_PX;
  let best = MIN_FONT_PX;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    cardBodyEl.style.fontSize = `${mid}px`;
    if (cardBodyEl.scrollHeight <= cardBodyEl.clientHeight + 1) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  cardBodyEl.style.fontSize = `${best}px`;
}

export default function QuoteCard() {
  const engine = useMemo(() => getQuoteEngine(), []);
  const [quote, setQuote] = useState<DisplayQuote | null>(null);
  const [fillColor, setFillColor] = useState("#5a3d7a");
  const [cardVars, setCardVars] = useState<Record<string, string>>(() => cardTextColorVars("#5a3d7a"));
  const cardRef = useRef<HTMLDivElement>(null);
  const cardBodyRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const applyQuoteVisual = useCallback(
    (q: DisplayQuote) => {
      const randomColor = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]!;
      setFillColor(randomColor);
      setCardVars(cardTextColorVars(randomColor));
      engine.recordView(q);
    },
    [engine],
  );

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      if (cardBodyRef.current) {
        fitCardText(cardBodyRef.current);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [quote]);

  useLayoutEffect(() => {
    const onResize = () => {
      if (cardBodyRef.current) {
        fitCardText(cardBodyRef.current);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [quote]);

  const showNextQuote = useCallback(async () => {
    const el = cardRef.current;
    if (!el || busyRef.current) return;

    if (prefersReducedMotion()) {
      const nextData = engine.consumeNextQuoteSync();
      flushSync(() => {
        setQuote(nextData);
        applyQuoteVisual(nextData);
      });
      return;
    }

    const t = pickTransition();
    const leaveCls = `card--leave-${t}`;
    const enterCls = `card--enter-${t}`;
    const nextData = engine.consumeNextQuoteSync();

    busyRef.current = true;
    el.classList.add("card--busy", "card--anim", leaveCls);
    el.setAttribute("aria-busy", "true");

    await waitAnimationEnd(el);

    el.classList.remove(leaveCls);
    flushSync(() => {
      setQuote(nextData);
      applyQuoteVisual(nextData);
    });

    void el.offsetHeight;
    el.classList.add(enterCls);
    await waitAnimationEnd(el);

    el.classList.remove(enterCls, "card--anim", "card--busy");
    el.removeAttribute("aria-busy");
    busyRef.current = false;
  }, [engine, applyQuoteVisual]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        void showNextQuote();
      }
    },
    [showNextQuote],
  );

  const isIntro = quote === null;
  const quoteKo = isIntro ? INTRO_KO : quote.quoteKo.trim();
  const quoteEn = !isIntro ? String(quote.quoteEn || "").trim() : "";
  const primary = !isIntro ? buildAuthorPrimaryLine(quote) : "";
  const achievements = !isIntro ? String(quote.achievements || "").trim() : "";

  return (
    <div className="container">
        <div className="card-perspective">
          <div
            ref={cardRef}
            className="card"
            role="button"
            tabIndex={0}
            aria-label="다음 한국 명언 보기"
            style={cardVars as CSSProperties}
            onClick={() => void showNextQuote()}
            onKeyDown={onKeyDown}
          >
            <div className="card-fill" aria-hidden="true" style={{ backgroundColor: fillColor }} />
            <div ref={cardBodyRef} className={`card-body ${isIntro ? "card-body--intro" : ""}`}>
              <div className="card-block card-block--quote">
                <p className="quote-ko">{quoteKo}</p>
                {quoteEn ? <p className="quote-sub-en">{quoteEn}</p> : null}
              </div>
              {!isIntro && (
                <div className="card-block card-block--author">
                  {primary ? <p className="author-line-primary">{primary}</p> : null}
                  {achievements ? <p className="author-achievements">{achievements}</p> : null}
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
