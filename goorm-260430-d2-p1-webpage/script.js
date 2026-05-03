const state = {
  file: null,
  isAnalyzing: false,
  dragDepth: 0,
  objectUrl: null,
  layout: null,
  preview: { scale: 1, tx: 0, ty: 0 },
  pan: { active: false, pointerId: null, startX: 0, startY: 0, originTx: 0, originTy: 0 },
  tool: "pan",
  strokeColor: "#3b82f6",
  lineWidthCss: 3,
  strokes: [],
  redoStack: [],
  draft: null,
  penLast: null,
  drawPointerId: null,
  textModalResolve: null,
};

const PREVIEW_SCALE_MIN = 0.35;
const PREVIEW_SCALE_MAX = 6;
const API_BASE = `${window.location.protocol}//${window.location.hostname}:3000`;

const dom = {
  dropZone: document.getElementById("drop-zone"),
  dropZoneHint: document.getElementById("drop-zone-hint"),
  imageInput: document.getElementById("image-input"),
  previewPanel: document.getElementById("preview-panel"),
  previewViewport: document.getElementById("preview-viewport"),
  previewStage: document.getElementById("preview-stage"),
  previewMedia: document.getElementById("preview-media"),
  previewImage: document.getElementById("preview-image"),
  drawCanvas: document.getElementById("draw-canvas"),
  zoomIn: document.getElementById("zoom-in"),
  zoomOut: document.getElementById("zoom-out"),
  zoomReset: document.getElementById("zoom-reset"),
  toolPan: document.getElementById("tool-pan"),
  toolText: document.getElementById("tool-text"),
  toolErase: document.getElementById("tool-erase"),
  toolPen: document.getElementById("tool-pen"),
  toolLine: document.getElementById("tool-line"),
  toolRect: document.getElementById("tool-rect"),
  toolEllipse: document.getElementById("tool-ellipse"),
  colorInput: document.getElementById("color-input"),
  colorBtn: document.getElementById("color-btn"),
  toolUndo: document.getElementById("tool-undo"),
  toolRedo: document.getElementById("tool-redo"),
  toolResetDrawing: document.getElementById("tool-reset-drawing"),
  toolDownload: document.getElementById("tool-download"),
  analyzeButton: document.getElementById("analyze-button"),
  resultCard: document.getElementById("result-card"),
  marketBadge: document.getElementById("market-badge"),
  summaryText: document.getElementById("summary-text"),
  trendText: document.getElementById("trend-text"),
  insightText: document.getElementById("insight-text"),
  detectedList: document.getElementById("detected-list"),
  cautionList: document.getElementById("caution-list"),
  errorModal: document.getElementById("error-modal"),
  errorModalText: document.getElementById("error-modal-text"),
  errorModalClose: document.getElementById("error-modal-close"),
  errorModalBackdrop: document.getElementById("error-modal-backdrop"),
  textEntryModal: document.getElementById("text-entry-modal"),
  textEntryModalBackdrop: document.getElementById("text-entry-modal-backdrop"),
  textEntryInput: document.getElementById("text-entry-input"),
};

function isSupportedImage(file) {
  if (!file) return false;
  return ["image/png", "image/jpeg", "image/webp"].includes(file.type);
}

function showErrorModal(message) {
  dom.errorModalText.textContent = message || "오류가 발생했습니다.";
  dom.errorModal.classList.remove("is-hidden");
}

function hideErrorModal() {
  dom.errorModal.classList.add("is-hidden");
}

function applyPreviewTransform() {
  const { scale, tx, ty } = state.preview;
  dom.previewStage.style.setProperty("--ptx", `${tx}px`);
  dom.previewStage.style.setProperty("--pty", `${ty}px`);
  dom.previewStage.style.setProperty("--ps", String(scale));
}

function clampScale(s) {
  return Math.min(PREVIEW_SCALE_MAX, Math.max(PREVIEW_SCALE_MIN, s));
}

function resetPreviewTransform() {
  state.preview = { scale: 1, tx: 0, ty: 0 };
  applyPreviewTransform();
}

function zoomPreview(factor) {
  state.preview.scale = clampScale(state.preview.scale * factor);
  applyPreviewTransform();
  if (state.layout) renderDrawCanvas();
}

function fitPreviewCover() {
  resetPreviewTransform();
  syncImageLayout();
}

function syncImageLayout() {
  const img = dom.previewImage;
  const media = dom.previewMedia;
  const vw = media.clientWidth;
  const vh = media.clientHeight;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!vw || !vh || !iw || !ih) {
    state.layout = null;
    return;
  }
  const scale = Math.min(vw / iw, vh / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (vw - dw) / 2;
  const oy = (vh - dh) / 2;
  state.layout = { dw, dh, ox, oy, iw, ih, vw, vh };
  img.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${dw}px;height:${dh}px;object-fit:fill;pointer-events:none;z-index:1;`;
  dom.drawCanvas.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${dw}px;height:${dh}px;z-index:2;touch-action:none;`;
  renderDrawCanvas();
}

function getCanvasContext() {
  return dom.drawCanvas.getContext("2d");
}

function normFromEvent(ev) {
  const r = dom.drawCanvas.getBoundingClientRect();
  const x = ev.clientX - r.left;
  const y = ev.clientY - r.top;
  return {
    nx: r.width > 0 ? x / r.width : 0,
    ny: r.height > 0 ? y / r.height : 0,
  };
}

function abandonInlineDraw() {
  const id = state.drawPointerId;
  if (id != null) {
    try {
      dom.drawCanvas.releasePointerCapture(id);
    } catch {
      /* ignore */
    }
    state.drawPointerId = null;
  }
  state.draft = null;
  state.penLast = null;
}

function syncHistoryButtons() {
  const u = dom.toolUndo;
  const r = dom.toolRedo;
  const x = dom.toolResetDrawing;
  if (!u || !r || !x) return;
  u.disabled = state.strokes.length === 0;
  r.disabled = state.redoStack.length === 0;
  x.disabled = state.strokes.length === 0 && state.redoStack.length === 0;
}

function dismissTextEntryModal(value) {
  if (!state.textModalResolve) return;
  const res = state.textModalResolve;
  state.textModalResolve = null;
  dom.textEntryModal.classList.add("is-hidden");
  dom.textEntryInput.value = "";
  dom.textEntryInput.blur();
  res(value);
}

function openTextEntryModal() {
  return new Promise((resolve) => {
    if (state.textModalResolve) {
      const prev = state.textModalResolve;
      state.textModalResolve = null;
      prev(null);
    }
    state.textModalResolve = resolve;
    dom.textEntryInput.value = "";
    dom.textEntryModal.classList.remove("is-hidden");
    queueMicrotask(() => {
      dom.textEntryInput.focus();
      dom.textEntryInput.select();
    });
  });
}

function clearDrawingState() {
  dismissTextEntryModal(null);
  abandonInlineDraw();
  state.strokes = [];
  state.redoStack = [];
  renderDrawCanvas();
  syncHistoryButtons();
}

const TEXT_FONT_FAMILY = '"Pretendard","Noto Sans KR",system-ui,sans-serif';

function distPointToSegNorm(nx, ny, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = nx - ax;
  const wy = ny - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(nx - ax, ny - ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(nx - bx, ny - by);
  const t = c1 / c2;
  const qx = ax + t * vx;
  const qy = ay + t * vy;
  return Math.hypot(nx - qx, ny - qy);
}

function distToRectBorderNorm(nx, ny, x1, y1, x2, y2) {
  const l = Math.min(x1, x2);
  const r = Math.max(x1, x2);
  const t = Math.min(y1, y2);
  const b = Math.max(y1, y2);
  const inside = nx >= l && nx <= r && ny >= t && ny <= b;
  if (!inside) {
    const dx = nx < l ? l - nx : nx > r ? nx - r : 0;
    const dy = ny < t ? t - ny : ny > b ? ny - b : 0;
    return Math.hypot(dx, dy);
  }
  return Math.min(nx - l, r - nx, ny - t, b - ny);
}

function measureTextBlockHeightPx(ctx, text, fontSize) {
  ctx.font = `600 ${fontSize}px ${TEXT_FONT_FAMILY}`;
  const m = ctx.measureText(text);
  if (m.actualBoundingBoxAscent != null && m.actualBoundingBoxDescent != null) {
    return m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  }
  return fontSize * 1.25;
}

/** 점선 세로 길이(targetHeightPx)에 글자 실제 높이(ascent+descent)가 맞도록 크기 선택 */
function fontSizeToMatchBoxHeightPx(text, targetHeightPx) {
  if (!text || targetHeightPx < 4) return 8;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) return Math.min(200, Math.max(8, Math.floor(targetHeightPx * 0.92)));
  const target = targetHeightPx * 0.998;
  let lo = 6;
  let hi = Math.min(480, Math.ceil(targetHeightPx * 4));
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const th = measureTextBlockHeightPx(ctx, text, mid);
    if (th <= target) lo = mid;
    else hi = mid;
  }
  return Math.max(8, lo);
}

function measureTextWidthPx(text, fontSize) {
  const c = document.createElement("canvas");
  const x = c.getContext("2d");
  if (!x) return text.length * fontSize * 0.6;
  x.font = `600 ${fontSize}px ${TEXT_FONT_FAMILY}`;
  return x.measureText(text).width;
}

function drawStrokePath(ctx, stroke, w, h, lineScale = 1) {
  const lw = (stroke.lineWidth || state.lineWidthCss) * lineScale;
  ctx.strokeStyle = stroke.color || state.strokeColor;
  ctx.fillStyle = stroke.color || state.strokeColor;
  ctx.lineWidth = Math.max(1, lw);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.type === "text") {
    const left = Math.min(stroke.x1, stroke.x2) * w;
    const top = Math.min(stroke.y1, stroke.y2) * h;
    const bh = Math.abs(stroke.y2 - stroke.y1) * h;
    if (bh < 1) return;
    const text = (stroke.text || "").trim();
    if (!text) {
      ctx.save();
      const x = Math.min(stroke.x1, stroke.x2) * w + 0.5;
      const y0 = Math.min(stroke.y1, stroke.y2) * h;
      const y1 = Math.max(stroke.y1, stroke.y2) * h;
      ctx.strokeStyle = stroke.color || state.strokeColor;
      ctx.lineWidth = Math.max(1, 1.4 * lineScale);
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = 0;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }
    if (bh < 4) return;
    const fontSize = fontSizeToMatchBoxHeightPx(text, bh);
    ctx.save();
    ctx.font = `600 ${fontSize}px ${TEXT_FONT_FAMILY}`;
    ctx.fillStyle = stroke.color || state.strokeColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const pad = Math.max(2, 2 * lineScale);
    const tx = left + pad;
    const cy = top + bh / 2;
    const y0 = Math.max(0, top);
    const y1 = Math.min(h, top + bh);
    ctx.beginPath();
    ctx.rect(0, y0, w, Math.max(1, y1 - y0));
    ctx.clip();
    ctx.fillText(text, tx, cy);
    ctx.restore();
    return;
  }

  if (stroke.type === "pen") {
    const pts = stroke.points || [];
    if (pts.length === 0) return;
    if (pts.length === 1) {
      const px = pts[0].nx * w;
      const py = pts[0].ny * h;
      const r = Math.max(1.2, lw * 0.6);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].nx * w, pts[0].ny * h);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].nx * w, pts[i].ny * h);
    }
    ctx.stroke();
  } else if (stroke.type === "line") {
    ctx.beginPath();
    ctx.moveTo(stroke.x1 * w, stroke.y1 * h);
    ctx.lineTo(stroke.x2 * w, stroke.y2 * h);
    ctx.stroke();
  } else if (stroke.type === "rect") {
    const x1 = stroke.x1 * w;
    const y1 = stroke.y1 * h;
    const x2 = stroke.x2 * w;
    const y2 = stroke.y2 * h;
    ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  } else if (stroke.type === "ellipse") {
    const x1 = stroke.x1 * w;
    const y1 = stroke.y1 * h;
    const x2 = stroke.x2 * w;
    const y2 = stroke.y2 * h;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    if (rx < 0.5 && ry < 0.5) return;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** 미리보기 CSS 줌(scale)만큼 비트맵 해상도를 올려, 확대한 상태에서 그릴 때 선명하게 보이게 함 */
function drawCanvasSharpnessScale() {
  return Math.max(1, state.preview.scale);
}

function renderDrawCanvas() {
  const ctx = getCanvasContext();
  if (!ctx || !state.layout) return;

  const w = state.layout.dw;
  const h = state.layout.dh;
  if (w < 2 || h < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const z = drawCanvasSharpnessScale();
  dom.drawCanvas.width = Math.round(w * dpr * z);
  dom.drawCanvas.height = Math.round(h * dpr * z);
  dom.drawCanvas.style.width = `${w}px`;
  dom.drawCanvas.style.height = `${h}px`;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, 0);
  ctx.clearRect(0, 0, w, h);

  for (const s of state.strokes) {
    drawStrokePath(ctx, s, w, h, 1);
  }
  if (state.draft) {
    drawStrokePath(ctx, state.draft, w, h, 1);
  }
}

function syncColorSwatch() {
  dom.colorBtn.style.setProperty("--swatch", state.strokeColor);
  dom.colorInput.value = state.strokeColor;
}

function setTool(tool) {
  if (state.textModalResolve && tool !== "text") {
    dismissTextEntryModal(null);
  }
  state.tool = tool;
  const drawTools = ["pen", "line", "rect", "ellipse", "text", "erase"];
  const isDraw = drawTools.includes(tool);

  [
    [dom.toolPan, "pan"],
    [dom.toolText, "text"],
    [dom.toolErase, "erase"],
    [dom.toolPen, "pen"],
    [dom.toolLine, "line"],
    [dom.toolRect, "rect"],
    [dom.toolEllipse, "ellipse"],
  ].forEach(([el, name]) => {
    const on = name === tool;
    el.classList.toggle("is-active", on);
    el.setAttribute("aria-pressed", on ? "true" : "false");
  });

  dom.previewStage.classList.toggle("mode-pan", !isDraw);
  dom.previewStage.classList.toggle("mode-draw", isDraw);
}

function setAnalyzeButtonState() {
  const enabled = !!state.file && !state.isAnalyzing;
  dom.analyzeButton.disabled = !enabled;
}

function resetResultView() {
  dom.resultCard.classList.add("is-hidden");
  dom.marketBadge.className = "market-badge";
  dom.marketBadge.textContent = "상태 대기";
  dom.summaryText.textContent = "";
  dom.trendText.textContent = "";
  dom.insightText.textContent = "";
  dom.detectedList.innerHTML = "";
  dom.cautionList.innerHTML = "";
}

function revokePreviewUrl() {
  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = null;
  }
}

function setSelectedFile(file) {
  if (!file) {
    state.file = null;
    dom.imageInput.value = "";
    revokePreviewUrl();
    dom.previewImage.removeAttribute("src");
    dom.previewImage.removeAttribute("style");
    dom.drawCanvas.removeAttribute("style");
    state.layout = null;
    dom.previewPanel.classList.add("is-hidden");
    dom.dropZoneHint.textContent = "이미지를 놓거나 클릭하여 선택 · PNG / JPG / WEBP";
    resetPreviewTransform();
    clearDrawingState();
    resetResultView();
    setAnalyzeButtonState();
    return;
  }

  if (!isSupportedImage(file)) {
    state.file = null;
    dom.imageInput.value = "";
    showErrorModal("PNG / JPG / WEBP 이미지 파일만 사용할 수 있습니다.");
    resetResultView();
    setAnalyzeButtonState();
    return;
  }

  state.file = file;
  revokePreviewUrl();
  state.objectUrl = URL.createObjectURL(file);
  dom.previewImage.src = state.objectUrl;
  dom.previewPanel.classList.remove("is-hidden");
  dom.dropZoneHint.textContent = "다른 이미지로 바꾸려면 여기에 드롭하거나 클릭";
  resetPreviewTransform();
  clearDrawingState();
  resetResultView();
  setTool("pan");
  setAnalyzeButtonState();
}

function renderDetected(data) {
  const tags = [
    `종목: ${data.symbol || "미확인"}`,
    `시간 프레임: ${data.timeframe || "미확인"}`,
  ];

  (data.indicators || []).forEach((indicator) => {
    tags.push(`지표: ${indicator}`);
  });

  dom.detectedList.innerHTML = tags.map((item) => `<li>${item}</li>`).join("");
}

function renderCautions(items) {
  dom.cautionList.innerHTML = (items || []).map((item) => `<li>${item}</li>`).join("");
}

function marketClass(stateText) {
  if (stateText === "상승") return "up";
  if (stateText === "하락") return "down";
  if (stateText === "횡보") return "sideways";
  return "";
}

function renderResult(result) {
  const badgeClass = marketClass(result.marketState);
  dom.marketBadge.className = `market-badge ${badgeClass}`.trim();
  dom.marketBadge.textContent = `시장 상태: ${result.marketState}`;

  dom.summaryText.textContent = result.summary;
  dom.trendText.textContent = result.trendReason;
  dom.insightText.textContent = result.insight;
  renderDetected(result.detected || {});
  renderCautions(result.cautions || []);

  dom.resultCard.classList.remove("is-hidden");
}

async function analyzeChart() {
  if (!state.file || state.isAnalyzing) return;

  state.isAnalyzing = true;
  setAnalyzeButtonState();

  const formData = new FormData();
  formData.append("image", state.file);

  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const serverError = payload?.error || `서버 응답 오류 (${response.status})`;
      throw new Error(serverError);
    }

    renderResult(payload);
  } catch (error) {
    showErrorModal(error.message || "분석 요청에 실패했습니다.");
  } finally {
    state.isAnalyzing = false;
    setAnalyzeButtonState();
  }
}

function draftTooSmall() {
  const d = state.draft;
  if (!d) return true;
  if (d.type === "pen") {
    return (d.points || []).length < 1;
  }
  const dist = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
  return dist < 0.012;
}

function normHitTolerance(stroke) {
  const dw = state.layout?.dw || 1;
  const lw = (stroke.lineWidth || state.lineWidthCss) / dw;
  return Math.max(0.016, lw * 2.2);
}

function hitStroke(s, nx, ny) {
  const tol = normHitTolerance(s);
  if (s.type === "pen") {
    const pts = s.points || [];
    if (pts.length === 0) return false;
    if (pts.length === 1) {
      return Math.hypot(nx - pts[0].nx, ny - pts[0].ny) < tol * 1.8;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      if (distPointToSegNorm(nx, ny, pts[i].nx, pts[i].ny, pts[i + 1].nx, pts[i + 1].ny) < tol) return true;
    }
    return false;
  }
  if (s.type === "line") {
    return distPointToSegNorm(nx, ny, s.x1, s.y1, s.x2, s.y2) < tol;
  }
  if (s.type === "rect") {
    return distToRectBorderNorm(nx, ny, s.x1, s.y1, s.x2, s.y2) < tol * 1.4;
  }
  if (s.type === "ellipse") {
    const x1 = s.x1;
    const y1 = s.y1;
    const x2 = s.x2;
    const y2 = s.y2;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    if (rx < 1e-5 || ry < 1e-5) return false;
    const ex = (nx - cx) / rx;
    const ey = (ny - cy) / ry;
    const rd = Math.hypot(ex, ey);
    return Math.abs(rd - 1) * Math.min(rx, ry) < tol * 1.2;
  }
  if (s.type === "text") {
    const lay = state.layout;
    if (!lay) return false;
    const bhPx = Math.abs(s.y2 - s.y1) * lay.dh;
    const str = (s.text || "").trim();
    if (!str) return false;
    const fs = fontSizeToMatchBoxHeightPx(str, bhPx);
    const twPx = measureTextWidthPx(str, fs);
    const twNorm = twPx / lay.dw;
    const padNorm = 3 / lay.dw;
    const l = Math.min(s.x1, s.x2);
    const t = Math.min(s.y1, s.y2);
    const b = Math.max(s.y1, s.y2);
    const r = Math.min(l + padNorm + twNorm, 1);
    return nx >= l - tol && nx <= r + tol && ny >= t - tol && ny <= b + tol;
  }
  return false;
}

function strokeHitIndex(nx, ny) {
  for (let i = state.strokes.length - 1; i >= 0; i--) {
    if (hitStroke(state.strokes[i], nx, ny)) return i;
  }
  return -1;
}

async function runTextEntryFlow(d) {
  const raw = await openTextEntryModal();
  state.draft = null;
  if (raw !== null && String(raw).trim()) {
    const refDw = state.layout?.dw || 1;
    state.strokes.push({
      type: "text",
      x1: d.x1,
      y1: d.y1,
      x2: d.x2,
      y2: d.y2,
      text: String(raw).trim(),
      color: d.color,
      refDw,
    });
    state.redoStack = [];
  }
  renderDrawCanvas();
  syncHistoryButtons();
}

function commitDraft() {
  if (!state.draft) return;
  if (state.draft.type === "pen" && (state.draft.points || []).length < 1) {
    state.draft = null;
    renderDrawCanvas();
    return;
  }
  if (state.draft.type !== "pen" && draftTooSmall()) {
    state.draft = null;
    renderDrawCanvas();
    return;
  }
  if (state.draft.type === "text") {
    const d = {
      type: "text",
      x1: state.draft.x1,
      y1: state.draft.y1,
      x2: state.draft.x2,
      y2: state.draft.y2,
      text: state.draft.text || "",
      color: state.draft.color,
      lineWidth: state.draft.lineWidth,
    };
    void runTextEntryFlow(d);
    return;
  }
  const refDw = state.layout?.dw || 1;
  state.strokes.push({ ...state.draft, refDw });
  state.draft = null;
  state.redoStack = [];
  renderDrawCanvas();
  syncHistoryButtons();
}

function undoStroke() {
  abandonInlineDraw();
  const s = state.strokes.pop();
  if (s) state.redoStack.push(s);
  renderDrawCanvas();
  syncHistoryButtons();
}

function redoStroke() {
  abandonInlineDraw();
  const s = state.redoStack.pop();
  if (s) state.strokes.push(s);
  renderDrawCanvas();
  syncHistoryButtons();
}

function resetDrawingToUpload() {
  clearDrawingState();
}

function handleCanvasPointerDown(ev) {
  if (state.tool === "pan" || ev.button !== 0) return;
  if (state.tool === "erase") {
    ev.preventDefault();
    ev.stopPropagation();
    const p = normFromEvent(ev);
    const idx = strokeHitIndex(p.nx, p.ny);
    if (idx >= 0) {
      state.strokes.splice(idx, 1);
      state.redoStack = [];
      renderDrawCanvas();
      syncHistoryButtons();
    }
    return;
  }
  ev.preventDefault();
  ev.stopPropagation();

  const p = normFromEvent(ev);
  state.drawPointerId = ev.pointerId;
  dom.drawCanvas.setPointerCapture(ev.pointerId);

  if (state.tool === "pen") {
    state.draft = {
      type: "pen",
      points: [{ nx: p.nx, ny: p.ny }],
      color: state.strokeColor,
      lineWidth: state.lineWidthCss,
    };
    state.penLast = p;
  } else if (state.tool === "line") {
    state.draft = {
      type: "line",
      x1: p.nx,
      y1: p.ny,
      x2: p.nx,
      y2: p.ny,
      color: state.strokeColor,
      lineWidth: state.lineWidthCss,
    };
  } else if (state.tool === "rect") {
    state.draft = {
      type: "rect",
      x1: p.nx,
      y1: p.ny,
      x2: p.nx,
      y2: p.ny,
      color: state.strokeColor,
      lineWidth: state.lineWidthCss,
    };
  } else if (state.tool === "ellipse") {
    state.draft = {
      type: "ellipse",
      x1: p.nx,
      y1: p.ny,
      x2: p.nx,
      y2: p.ny,
      color: state.strokeColor,
      lineWidth: state.lineWidthCss,
    };
  } else if (state.tool === "text") {
    state.draft = {
      type: "text",
      x1: p.nx,
      y1: p.ny,
      x2: p.nx,
      y2: p.ny,
      text: "",
      color: state.strokeColor,
      lineWidth: state.lineWidthCss,
    };
  }
  renderDrawCanvas();
}

function handleCanvasPointerMove(ev) {
  if (state.drawPointerId !== ev.pointerId || !state.draft) return;
  ev.preventDefault();
  const p = normFromEvent(ev);

  if (state.draft.type === "pen") {
    const last = state.penLast;
    if (last) {
      const dx = p.nx - last.nx;
      const dy = p.ny - last.ny;
      if (dx * dx + dy * dy < 1e-10) return;
    }
    state.draft.points.push({ nx: p.nx, ny: p.ny });
    state.penLast = p;
    renderDrawCanvas();
  } else {
    state.draft.x2 = p.nx;
    state.draft.y2 = p.ny;
    renderDrawCanvas();
  }
}

function handleCanvasPointerUp(ev) {
  if (state.drawPointerId !== ev.pointerId) return;
  ev.stopPropagation();
  state.drawPointerId = null;
  state.penLast = null;
  try {
    dom.drawCanvas.releasePointerCapture(ev.pointerId);
  } catch {
    /* ignore */
  }
  commitDraft();
}

function downloadComposite() {
  const lay = state.layout;
  const img = dom.previewImage;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!lay || !nw || !nh) {
    showErrorModal("이미지를 준비할 수 없습니다.");
    return;
  }

  const c = document.createElement("canvas");
  c.width = nw;
  c.height = nh;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, nw, nh);

  for (const s of state.strokes) {
    const lineScale = nw / (s.refDw || lay.dw);
    drawStrokePath(ctx, s, nw, nh, lineScale);
  }
  if (state.draft) {
    const lineScale = nw / lay.dw;
    drawStrokePath(ctx, state.draft, nw, nh, lineScale);
  }

  const mime = state.file?.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const ext = mime === "image/jpeg" ? "jpg" : "png";
  const url = c.toDataURL(mime, 0.92);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chart-edit-${Date.now()}.${ext}`;
  a.click();
}

function bindStagePan() {
  dom.previewStage.addEventListener("pointerdown", (e) => {
    if (state.tool !== "pan" || e.button !== 0) return;
    if (e.target === dom.drawCanvas) return;
    e.preventDefault();
    state.pan.active = true;
    state.pan.pointerId = e.pointerId;
    state.pan.startX = e.clientX;
    state.pan.startY = e.clientY;
    state.pan.originTx = state.preview.tx;
    state.pan.originTy = state.preview.ty;
    dom.previewStage.classList.add("is-panning");
    dom.previewStage.setPointerCapture(e.pointerId);
  });

  dom.previewStage.addEventListener("pointermove", (e) => {
    if (!state.pan.active || e.pointerId !== state.pan.pointerId) return;
    const dx = e.clientX - state.pan.startX;
    const dy = e.clientY - state.pan.startY;
    state.preview.tx = state.pan.originTx + dx;
    state.preview.ty = state.pan.originTy + dy;
    applyPreviewTransform();
  });

  function endPan(e) {
    if (e.pointerId !== state.pan.pointerId) return;
    state.pan.active = false;
    state.pan.pointerId = null;
    dom.previewStage.classList.remove("is-panning");
    try {
      dom.previewStage.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  dom.previewStage.addEventListener("pointerup", endPan);
  dom.previewStage.addEventListener("pointercancel", endPan);
}

function bindCanvasDraw() {
  dom.drawCanvas.addEventListener("pointerdown", handleCanvasPointerDown);
  dom.drawCanvas.addEventListener("pointermove", handleCanvasPointerMove);
  dom.drawCanvas.addEventListener("pointerup", handleCanvasPointerUp);
  dom.drawCanvas.addEventListener("pointercancel", handleCanvasPointerUp);
}

function bindPreviewPanZoom() {
  dom.zoomIn.addEventListener("click", () => zoomPreview(1.12));
  dom.zoomOut.addEventListener("click", () => zoomPreview(1 / 1.12));
  dom.zoomReset.addEventListener("click", () => fitPreviewCover());

  dom.previewViewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.93 : 1.07;
      state.preview.scale = clampScale(state.preview.scale * factor);
      applyPreviewTransform();
      if (state.layout) renderDrawCanvas();
    },
    { passive: false }
  );

  bindStagePan();
  bindCanvasDraw();

  dom.previewImage.addEventListener("load", () => {
    if (state.file) {
      resetPreviewTransform();
      syncImageLayout();
    }
  });

  const ro = new ResizeObserver(() => {
    if (state.file && dom.previewImage.naturalWidth) {
      syncImageLayout();
    }
  });
  ro.observe(dom.previewViewport);

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dom.previewViewport.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });
  dom.previewViewport.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer?.files || [];
    if (file) {
      setSelectedFile(file);
    }
  });
}

function bindTools() {
  dom.toolPan.addEventListener("click", () => setTool("pan"));
  dom.toolText.addEventListener("click", () => setTool("text"));
  dom.toolErase.addEventListener("click", () => setTool("erase"));
  dom.toolPen.addEventListener("click", () => setTool("pen"));
  dom.toolLine.addEventListener("click", () => setTool("line"));
  dom.toolRect.addEventListener("click", () => setTool("rect"));
  dom.toolEllipse.addEventListener("click", () => setTool("ellipse"));
  dom.colorBtn.addEventListener("click", () => dom.colorInput.click());
  dom.colorInput.addEventListener("input", () => {
    state.strokeColor = dom.colorInput.value;
    syncColorSwatch();
  });
  dom.toolUndo.addEventListener("click", () => undoStroke());
  dom.toolRedo.addEventListener("click", () => redoStroke());
  dom.toolResetDrawing.addEventListener("click", () => resetDrawingToUpload());
  dom.toolDownload.addEventListener("click", () => downloadComposite());
}

function bindDragAndDrop() {
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dom.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });

  dom.dropZone.addEventListener("dragenter", () => {
    state.dragDepth += 1;
    dom.dropZone.classList.add("is-active");
  });

  dom.dropZone.addEventListener("dragleave", () => {
    state.dragDepth = Math.max(0, state.dragDepth - 1);
    if (state.dragDepth === 0) {
      dom.dropZone.classList.remove("is-active");
    }
  });

  dom.dropZone.addEventListener("drop", (event) => {
    state.dragDepth = 0;
    dom.dropZone.classList.remove("is-active");
    const [file] = event.dataTransfer?.files || [];
    setSelectedFile(file);
  });

  dom.dropZone.addEventListener("click", () => {
    dom.imageInput.value = "";
    dom.imageInput.click();
  });

  dom.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dom.imageInput.value = "";
      dom.imageInput.click();
    }
  });
}

function bindModal() {
  dom.errorModalClose.addEventListener("click", hideErrorModal);
  dom.errorModalBackdrop.addEventListener("click", hideErrorModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !dom.textEntryModal.classList.contains("is-hidden")) {
      e.preventDefault();
      dismissTextEntryModal(null);
      return;
    }
    if (e.key === "Escape" && !dom.errorModal.classList.contains("is-hidden")) {
      hideErrorModal();
    }
  });
}

function bindTextEntryModal() {
  dom.textEntryModalBackdrop.addEventListener("click", () => dismissTextEntryModal(null));
  dom.textEntryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dismissTextEntryModal(dom.textEntryInput.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      dismissTextEntryModal(null);
    }
  });
}

function init() {
  syncColorSwatch();
  setTool("pan");
  syncHistoryButtons();
  bindDragAndDrop();
  bindPreviewPanZoom();
  bindTools();
  bindTextEntryModal();
  bindModal();
  dom.imageInput.addEventListener("change", () => {
    const [file] = dom.imageInput.files || [];
    setSelectedFile(file);
  });
  dom.analyzeButton.addEventListener("click", analyzeChart);
  setAnalyzeButtonState();
}

init();
