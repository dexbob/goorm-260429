const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const app = express();
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, "..");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash"];
const MODEL_NAME = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODELS[0];
const GEMINI_MIN_INTERVAL_MS = Number(process.env.GEMINI_MIN_INTERVAL_MS || 6000);
const GEMINI_429_COOLDOWN_MS = Number(process.env.GEMINI_429_COOLDOWN_MS || 20000);
let nextGeminiRequestAt = 0;

const ANALYSIS_PROMPT_TEMPLATE = `너는 주식 초보자를 위한 차트 해설 전문가다.
업로드된 차트 이미지를 보고 아래 스키마와 동일한 JSON만 출력해라.

{
  "summary": "문자열",
  "marketState": "상승|하락|횡보",
  "trendReason": "문자열",
  "insight": "문자열",
  "cautions": ["문자열", "문자열"],
  "detected": {
    "symbol": "문자열",
    "timeframe": "문자열",
    "indicators": ["문자열"]
  }
}

규칙:
- JSON 외 텍스트 금지
- marketState는 반드시 상승/하락/횡보 중 하나
- 초보자 기준으로 쉬운 표현 사용
- 투자 자문이 아닌 교육용 고지 포함`;

app.use(cors());
app.use(express.static(ROOT_DIR));

function extractJsonObject(text) {
  if (!text) {
    throw new Error("모델 응답이 비어 있습니다.");
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("모델 JSON 응답을 찾지 못했습니다.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeAnalysis(data) {
  const normalizedState = ["상승", "하락", "횡보"].includes(data.marketState)
    ? data.marketState
    : "횡보";
  return {
    summary: data.summary || "차트의 주요 흐름을 파악하지 못했습니다.",
    marketState: normalizedState,
    trendReason: data.trendReason || "추세 판단 근거를 충분히 얻지 못했습니다.",
    insight: data.insight || "리스크 관리 중심으로 소액 분할 학습을 권장합니다.",
    cautions: Array.isArray(data.cautions) ? data.cautions : [],
    detected: {
      symbol: data.detected?.symbol || "미확인",
      timeframe: data.detected?.timeframe || "미확인",
      indicators: Array.isArray(data.detected?.indicators) ? data.detected.indicators : [],
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForGeminiSlot() {
  const now = Date.now();
  const waitMs = Math.max(0, nextGeminiRequestAt - now);
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  nextGeminiRequestAt = Date.now() + GEMINI_MIN_INTERVAL_MS;
}

async function requestGeminiGenerate(modelName, file) {
  await waitForGeminiSlot();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const geminiResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: ANALYSIS_PROMPT_TEMPLATE },
            {
              inline_data: {
                mime_type: file.mimetype,
                data: file.buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    }),
  });

  const body = await geminiResponse.json().catch(() => ({}));
  if (!geminiResponse.ok) {
    const apiError = new Error(body?.error?.message || `Gemini API 오류 (${geminiResponse.status})`);
    apiError.status = geminiResponse.status;
    apiError.code = body?.error?.status || "GEMINI_API_ERROR";
    apiError.type = "gemini_api_error";
    throw apiError;
  }
  return body;
}

async function analyzeWithGemini(file) {
  if (!GEMINI_API_KEY) {
    const configError = new Error("API키가 유효하지 않습니다.");
    configError.status = 401;
    configError.code = "INVALID_API_KEY";
    configError.type = "config_error";
    throw configError;
  }

  const normalizeModelName = (value) => value.replace(/^models\//, "");
  const candidateModels = [normalizeModelName(MODEL_NAME), ...DEFAULT_GEMINI_MODELS]
    .map((model) => model.trim())
    .filter(Boolean)
    .filter((model, index, arr) => arr.indexOf(model) === index);

  let lastError = null;
  for (const modelName of candidateModels) {
    console.info(`[Gemini] generateContent 시도: model=${modelName}`);
    try {
      const body = await requestGeminiGenerate(modelName, file);
      const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n");
      const parsed = extractJsonObject(text);
      return normalizeAnalysis(parsed);
    } catch (apiError) {
      const lowerMsg = String(apiError.message || "").toLowerCase();
      const modelNotFound = apiError.status === 404 || lowerMsg.includes("is not found for api version");
      const rateLimited = apiError.status === 429;

      if (rateLimited) {
        console.warn(
          `[Gemini] model=${modelName} 요청 한도(429). 이후 요청은 쿨다운 후에 허용됩니다.`,
          apiError.message || ""
        );
        // Back off globally to avoid repeated 429 responses in free-tier limits.
        nextGeminiRequestAt = Date.now() + Math.max(GEMINI_429_COOLDOWN_MS, GEMINI_MIN_INTERVAL_MS);
        throw apiError;
      }
      if (modelNotFound) {
        console.warn(
          `[Gemini] model=${modelName} 사용 불가(404 또는 미지원). 다음 후보로 넘어갑니다.`,
          apiError.message || ""
        );
        lastError = apiError;
        continue;
      }
      console.warn(`[Gemini] model=${modelName} 처리 중 오류`, apiError.message || apiError);
      throw apiError;
    }
  }

  throw lastError || new Error("지원 가능한 Gemini 모델을 찾지 못했습니다.");
}

function toClientError(error) {
  const rawMessage = error?.error?.message || error?.message || "알 수 없는 오류";
  const status = typeof error?.status === "number" ? error.status : 500;
  const code = error?.code || error?.name || "ANALYZE_ERROR";
  const type = error?.type || "server_error";
  let message = "분석 요청 처리 중 오류가 발생했습니다.";

  if (status === 401 || /invalid api key|incorrect api key/i.test(rawMessage)) {
    message = "API키가 유효하지 않습니다.";
  } else if (status === 429) {
    message = "요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 사용량/결제 상태를 확인해 주세요.";
  } else if (status >= 500) {
    message = "Gemini 서버 또는 네트워크 오류가 발생했습니다.";
  } else if (status === 400) {
    message = rawMessage;
  }

  return { status, code, type, message };
}

app.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "이미지 파일(image)이 필요합니다.",
      code: "MISSING_IMAGE_FILE",
      type: "validation_error",
    });
  }

  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({
      error: "이미지 파일만 업로드할 수 있습니다.",
      code: "INVALID_IMAGE_MIMETYPE",
      type: "validation_error",
    });
  }

  try {
    const analysis = await analyzeWithGemini(req.file);
    return res.json(analysis);
  } catch (error) {
    const clientError = toClientError(error);
    console.error("analyze error:", clientError, error);
    return res.status(clientError.status).json({
      error: clientError.message,
      code: clientError.code,
      type: clientError.type,
    });
  }
});

const httpServer = app.listen(PORT, () => {
  console.log(`Chart explainer demo server running: http://localhost:${PORT}`);
  console.log("요청 대기 중입니다. (이 터미널은 서버가 돌아가는 동안 로그가 거의 없을 수 있습니다. 종료: Ctrl+C)");
});

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[서버] 포트 ${PORT}이(가) 이미 사용 중입니다. 다른 터미널의 \`node server.js\` / \`npm start\`를 종료하거나, .env에서 PORT를 바꾼 뒤 다시 실행하세요. (예: PORT=3001)`
    );
  } else {
    console.error("[서버] listen 오류:", err);
  }
  process.exit(1);
});
