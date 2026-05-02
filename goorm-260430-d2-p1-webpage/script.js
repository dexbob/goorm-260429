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
  draft: null,
  penLast: null,
  drawPointerId: null,
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
  toolPen: document.getElementById("tool-pen"),
  toolLine: document.getElementById("tool-line"),
  toolRect: document.getElementById("tool-rect"),
  toolEllipse: document.getElementById("tool-ellipse"),
  colorInput: document.getElementById("color-input"),
  colorBtn: document.getElementById("color-btn"),
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

function clearDrawingState() {
  state.strokes = [];
  state.draft = null;
  state.penLast = null;
  renderDrawCanvas();
}

function drawStrokePath(ctx, stroke, w, h, lineScale = 1) {
  const lw = (stroke.lineWidth || state.lineWidthCss) * lineScale;
  ctx.strokeStyle = stroke.color || state.strokeColor;
  ctx.fillStyle = stroke.color || state.strokeColor;
  ctx.lineWidth = Math.max(1, lw);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

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

function renderDrawCanvas() {
  const ctx = getCanvasContext();
  if (!ctx || !state.layout) return;

  const w = state.layout.dw;
  const h = state.layout.dh;
  if (w < 2 || h < 2) return;

  const dpr = window.devicePixelRatio || 1;
  dom.drawCanvas.width = Math.round(w * dpr);
  dom.drawCanvas.height = Math.round(h * dpr);
  dom.drawCanvas.style.width = `${w}px`;
  dom.drawCanvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  state.tool = tool;
  const drawTools = ["pen", "line", "rect", "ellipse"];
  const isDraw = drawTools.includes(tool);

  [
    [dom.toolPan, "pan"],
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
  state.strokes = [];
  state.draft = null;
  state.penLast = null;
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
  return dist < 0.0015;
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
  const refDw = state.layout?.dw || 1;
  state.strokes.push({ ...state.draft, refDw });
  state.draft = null;
  renderDrawCanvas();
}

function handleCanvasPointerDown(ev) {
  if (state.tool === "pan" || ev.button !== 0) return;
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
  dom.toolPen.addEventListener("click", () => setTool("pen"));
  dom.toolLine.addEventListener("click", () => setTool("line"));
  dom.toolRect.addEventListener("click", () => setTool("rect"));
  dom.toolEllipse.addEventListener("click", () => setTool("ellipse"));
  dom.colorBtn.addEventListener("click", () => dom.colorInput.click());
  dom.colorInput.addEventListener("input", () => {
    state.strokeColor = dom.colorInput.value;
    syncColorSwatch();
  });
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
    dom.imageInput.click();
  });

  dom.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dom.imageInput.click();
    }
  });
}

function bindModal() {
  dom.errorModalClose.addEventListener("click", hideErrorModal);
  dom.errorModalBackdrop.addEventListener("click", hideErrorModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !dom.errorModal.classList.contains("is-hidden")) {
      hideErrorModal();
    }
  });
}

function init() {
  syncColorSwatch();
  setTool("pan");
  bindDragAndDrop();
  bindPreviewPanZoom();
  bindTools();
  bindModal();
  dom.imageInput.addEventListener("change", () => {
    const [file] = dom.imageInput.files || [];
    setSelectedFile(file);
  });
  dom.analyzeButton.addEventListener("click", analyzeChart);
  setAnalyzeButtonState();
}

init();
