import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import cardTextureUrl from "./assets/card-texture.png";
import { cardTextColorVars } from "./colorUtils";
import {
  CARD_COLORS,
  getQuoteEngine,
  getTtsApiUrl,
  TRANSITIONS,
  type CardTransition,
} from "./quoteEngine";
import { buildAuthorPrimaryLine } from "./quoteFormat";
import type { DisplayQuote } from "./quoteTypes";
import TtsPlaybackCursor from "./TtsPlaybackCursor";

const INTRO_KO = "카드를 누르면 한국 명언을 불러옵니다.";

const MIN_FONT_PX = 9;
const MAX_FONT_PX = 22;

type TtsSegment = "ko" | "en" | "author";

function webSpeechAvailable(): boolean {
  return typeof window !== "undefined" && typeof speechSynthesis !== "undefined";
}

function pickSpeechVoice(lang: "ko" | "en"): SpeechSynthesisVoice | null {
  if (!webSpeechAvailable()) return null;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const prefix = lang === "ko" ? "ko" : "en";
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith(prefix)) ??
    voices.find((v) => v.lang?.toLowerCase().includes(prefix)) ??
    null
  );
}

async function waitForSpeechVoices(maxMs = 600): Promise<void> {
  if (!webSpeechAvailable()) return;
  if (speechSynthesis.getVoices().length > 0) return;
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      speechSynthesis.removeEventListener("voiceschanged", onVc);
      resolve();
    };
    const onVc = () => finish();
    speechSynthesis.addEventListener("voiceschanged", onVc);
    window.setTimeout(finish, maxMs);
  });
}

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
  /** 실제 스피커 출력 중인 블록(오디오 재생 시작 후) → 방출형 커서 */
  const [audibleSeg, setAudibleSeg] = useState<TtsSegment | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const cardBodyRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  /** 요청~재생 포함, 이 블록에서 포인터가 빠져나가면 즉시 중단 */
  const ttsActiveSegRef = useRef<TtsSegment | null>(null);

  const pointerScreenRef = useRef({ x: 0, y: 0 });
  const audibleSegRef = useRef<TtsSegment | null>(audibleSeg);
  const [ttsPlaybackCursorPt, setTtsPlaybackCursorPt] = useState({ x: 0, y: 0 });
  const playbackCursorRafRef = useRef(0);

  audibleSegRef.current = audibleSeg;

  const stopTts = useCallback(() => {
    ttsActiveSegRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    if (webSpeechAvailable()) {
      speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setAudibleSeg(null);
  }, []);

  useEffect(() => () => stopTts(), [stopTts]);

  useEffect(() => {
    stopTts();
  }, [quote, stopTts]);

  useEffect(() => {
    const onWinMove = (e: PointerEvent) => {
      pointerScreenRef.current.x = e.clientX;
      pointerScreenRef.current.y = e.clientY;
      if (!audibleSegRef.current) return;
      if (playbackCursorRafRef.current) return;
      playbackCursorRafRef.current = window.requestAnimationFrame(() => {
        playbackCursorRafRef.current = 0;
        setTtsPlaybackCursorPt({
          x: pointerScreenRef.current.x,
          y: pointerScreenRef.current.y,
        });
      });
    };
    window.addEventListener("pointermove", onWinMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onWinMove);
      if (playbackCursorRafRef.current) {
        cancelAnimationFrame(playbackCursorRafRef.current);
        playbackCursorRafRef.current = 0;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      document.body.classList.remove("tts-playing-cursor-active");
    };
  }, []);

  useLayoutEffect(() => {
    const body = document.body;
    if (!audibleSeg) {
      body.classList.remove("tts-playing-cursor-active");
      return;
    }
    body.classList.add("tts-playing-cursor-active");
    setTtsPlaybackCursorPt({
      x: pointerScreenRef.current.x,
      y: pointerScreenRef.current.y,
    });
    return () => {
      body.classList.remove("tts-playing-cursor-active");
    };
  }, [audibleSeg]);

  const playTts = useCallback(
    async (segment: TtsSegment, text: string, lang: "ko" | "en") => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stopTts();

      const ac = new AbortController();
      abortRef.current = ac;
      ttsActiveSegRef.current = segment;

      try {
        const ttsUrl = await getTtsApiUrl();
        const res = await fetch(ttsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed, lang }),
          signal: ac.signal,
        });

        const ct = res.headers.get("content-type") || "";
        if (!res.ok) {
          let msg = await res.text();
          if (ct.includes("json")) {
            try {
              const j = JSON.parse(msg) as { message?: string };
              if (typeof j.message === "string") msg = j.message;
            } catch {
              /* keep text */
            }
          }
          throw new Error(msg.slice(0, 240));
        }

        const blob = await res.blob();
        if (ac.signal.aborted || ttsActiveSegRef.current !== segment) return;

        const objectUrl = URL.createObjectURL(blob);
        if (ac.signal.aborted || ttsActiveSegRef.current !== segment) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        blobUrlRef.current = objectUrl;
        const audio = new Audio(objectUrl);
        audioRef.current = audio;

        const clearBlob = () => {
          if (blobUrlRef.current === objectUrl) {
            URL.revokeObjectURL(objectUrl);
            blobUrlRef.current = null;
          }
        };

        audio.addEventListener(
          "ended",
          () => {
            clearBlob();
            if (audioRef.current === audio) audioRef.current = null;
            setAudibleSeg((cur) => (cur === segment ? null : cur));
            if (ttsActiveSegRef.current === segment) ttsActiveSegRef.current = null;
          },
          { once: true },
        );

        audio.addEventListener(
          "error",
          () => {
            clearBlob();
            if (audioRef.current === audio) audioRef.current = null;
            setAudibleSeg(null);
            if (ttsActiveSegRef.current === segment) ttsActiveSegRef.current = null;
          },
          { once: true },
        );

        await audio.play();
        if (ac.signal.aborted || ttsActiveSegRef.current !== segment || audioRef.current !== audio)
          return;
        setAudibleSeg(segment);
      } catch (e) {
        const aborted =
          e !== null &&
          typeof e === "object" &&
          "name" in e &&
          (e as { name: string }).name === "AbortError";
        if (aborted) {
          ttsActiveSegRef.current = null;
          return;
        }

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
          audioRef.current.load();
          audioRef.current = null;
        }
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }

        console.warn("[TTS] API 실패 → Web Speech 시도:", e);

        if (!webSpeechAvailable() || ttsActiveSegRef.current !== segment) {
          ttsActiveSegRef.current = null;
          setAudibleSeg(null);
          return;
        }

        await waitForSpeechVoices();
        if (ttsActiveSegRef.current !== segment) return;

        speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(trimmed);
        utter.lang = lang === "ko" ? "ko-KR" : "en-US";
        const voice = pickSpeechVoice(lang);
        if (voice) utter.voice = voice;

        const finishWeb = () => {
          if (ttsActiveSegRef.current !== segment) return;
          ttsActiveSegRef.current = null;
          setAudibleSeg((cur) => (cur === segment ? null : cur));
        };

        utter.onend = finishWeb;
        utter.onerror = finishWeb;

        speechSynthesis.speak(utter);
        if (ttsActiveSegRef.current === segment) setAudibleSeg(segment);
      }
    },
    [stopTts],
  );

  const consumeCardFlip = useCallback(
    (e: ReactMouseEvent<Element> | ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
    },
    [],
  );

  const leaveIfPlaying = useCallback(
    (seg: TtsSegment) => {
      if (ttsActiveSegRef.current === seg) stopTts();
    },
    [stopTts],
  );

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

  const authorSpeechText = useMemo(() => {
    if (isIntro) return "";
    const parts = [primary.trim(), achievements.trim()].filter(Boolean);
    return parts.join("\n\n");
  }, [isIntro, primary, achievements]);

  return (
    <div
      className="container"
      onPointerMove={(e) => {
        pointerScreenRef.current.x = e.clientX;
        pointerScreenRef.current.y = e.clientY;
      }}
    >
        <TtsPlaybackCursor
          visible={audibleSeg !== null}
          x={ttsPlaybackCursorPt.x}
          y={ttsPlaybackCursorPt.y}
        />
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
            <div
              className="card-fill"
              aria-hidden="true"
              style={
                {
                  backgroundColor: fillColor,
                  ["--card-fill-texture" as string]: `url(${JSON.stringify(cardTextureUrl)})`,
                } as CSSProperties
              }
            />
            <div ref={cardBodyRef} className={`card-body ${isIntro ? "card-body--intro" : ""}`}>
              <div className="card-block card-block--quote">
                <div
                  className={`tts-zone ${audibleSeg === "ko" ? "tts-zone--audible" : ""}`}
                  onPointerDown={consumeCardFlip}
                  onClick={(e) => {
                    consumeCardFlip(e);
                    void playTts("ko", quoteKo, "ko");
                  }}
                  onPointerLeave={() => leaveIfPlaying("ko")}
                  aria-label={isIntro ? "안내 문구 음성 듣기" : "한국어 명언 음성 듣기"}
                  role="group"
                >
                  <p className="quote-ko">{quoteKo}</p>
                </div>
                {quoteEn ? (
                  <div
                    className={`tts-zone tts-zone--en ${audibleSeg === "en" ? "tts-zone--audible" : ""}`}
                    onPointerDown={consumeCardFlip}
                    onClick={(e) => {
                      consumeCardFlip(e);
                      void playTts("en", quoteEn, "en");
                    }}
                    onPointerLeave={() => leaveIfPlaying("en")}
                    aria-label="영문 번역 음성 듣기"
                    role="group"
                  >
                    <p className="quote-sub-en">{quoteEn}</p>
                  </div>
                ) : null}
              </div>
              {!isIntro ? (
                <div className="card-block card-block--author">
                  {authorSpeechText ? (
                    <div
                      className={`tts-zone ${audibleSeg === "author" ? "tts-zone--audible" : ""}`}
                      onPointerDown={consumeCardFlip}
                      onClick={(e) => {
                        consumeCardFlip(e);
                        void playTts("author", authorSpeechText, "ko");
                      }}
                      onPointerLeave={() => leaveIfPlaying("author")}
                      aria-label="저자 이름 및 업적 음성 듣기"
                      role="group"
                    >
                      {primary ? <p className="author-line-primary">{primary}</p> : null}
                      {achievements ? <p className="author-achievements">{achievements}</p> : null}
                    </div>
                  ) : (
                    <>
                      {primary ? <p className="author-line-primary">{primary}</p> : null}
                      {achievements ? <p className="author-achievements">{achievements}</p> : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
    </div>
  );
}
