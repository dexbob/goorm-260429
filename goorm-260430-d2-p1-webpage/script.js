const state = {
  file: null,
  isAnalyzing: false,
  dragDepth: 0,
};
const API_BASE = `${window.location.protocol}//${window.location.hostname}:3000`;

const dom = {
  dropZone: document.getElementById("drop-zone"),
  imageInput: document.getElementById("image-input"),
  fileMeta: document.getElementById("file-meta"),
  analyzeButton: document.getElementById("analyze-button"),
  statusText: document.getElementById("status-text"),
  resultCard: document.getElementById("result-card"),
  marketBadge: document.getElementById("market-badge"),
  summaryText: document.getElementById("summary-text"),
  trendText: document.getElementById("trend-text"),
  insightText: document.getElementById("insight-text"),
  detectedList: document.getElementById("detected-list"),
  cautionList: document.getElementById("caution-list"),
};

function isSupportedImage(file) {
  if (!file) return false;
  return ["image/png", "image/jpeg", "image/webp"].includes(file.type);
}

function formatBytes(size) {
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function setStatus(message) {
  dom.statusText.textContent = message;
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

function setSelectedFile(file) {
  if (!file) {
    state.file = null;
    dom.fileMeta.textContent = "선택된 이미지가 없습니다.";
    dom.imageInput.value = "";
    setAnalyzeButtonState();
    return;
  }

  if (!isSupportedImage(file)) {
    state.file = null;
    dom.imageInput.value = "";
    dom.fileMeta.textContent = "선택된 이미지가 없습니다.";
    setStatus("PNG/JPG/WEBP 이미지 파일만 업로드할 수 있습니다.");
    resetResultView();
    setAnalyzeButtonState();
    return;
  }

  state.file = file;
  dom.fileMeta.textContent = `선택 파일: ${file.name} (${formatBytes(file.size)})`;
  setStatus("분석 준비 완료. 분석하기 버튼을 눌러주세요.");
  resetResultView();
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
  setStatus("차트 이미지를 분석 중입니다...");

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

    const data = payload;
    renderResult(data);
    setStatus("분석이 완료되었습니다.");
  } catch (error) {
    setStatus(error.message || "분석 실패가 발생했습니다.");
  } finally {
    state.isAnalyzing = false;
    setAnalyzeButtonState();
  }
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

  dom.dropZone.addEventListener("click", (event) => {
    if (event.target.closest(".file-button")) return;
    dom.imageInput.click();
  });

  dom.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dom.imageInput.click();
    }
  });
}

function init() {
  bindDragAndDrop();
  dom.imageInput.addEventListener("change", () => {
    const [file] = dom.imageInput.files || [];
    setSelectedFile(file);
  });
  dom.analyzeButton.addEventListener("click", analyzeChart);
  setAnalyzeButtonState();
}

init();
