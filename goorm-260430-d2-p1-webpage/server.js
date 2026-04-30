const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
const PORT = process.env.PORT || 3000;

const ANALYSIS_PROMPT_TEMPLATE = `너는 주식 초보자를 위한 차트 해설 전문가다.
다음 이미지를 보고 아래 항목을 JSON으로 정리해라.
1) 차트 기본 정보(종목, 시간 프레임, 지표)
2) 현재 추세(상승/하락/횡보)
3) 추세 판단 근거
4) 초보자도 이해할 쉬운 설명
5) 투자 관점의 주의사항(교육 목적 고지 포함)`;

app.use(cors());
app.use(express.static(path.join(__dirname)));

function createDemoAnalysis(file) {
  const name = file.originalname.toLowerCase();

  let marketState = "횡보";
  if (name.includes("up") || name.includes("bull")) marketState = "상승";
  if (name.includes("down") || name.includes("bear")) marketState = "하락";

  const trendReasonByState = {
    상승: "고점과 저점이 점진적으로 높아지는 구조가 보이며, 거래량이 상승 구간에서 상대적으로 늘어났습니다.",
    하락: "고점과 저점이 낮아지는 흐름이 나타나며, 반등 구간의 탄력이 이전 대비 약합니다.",
    횡보: "가격이 지지/저항 범위 안에서 반복되며 뚜렷한 방향성보다 박스권 움직임이 우세합니다.",
  };

  const insightByState = {
    상승:
      "초보자라면 무리한 추격 매수보다, 지지 구간 재확인 후 분할 접근이라는 관점을 먼저 학습하는 것이 좋습니다.",
    하락:
      "하락 추세에서는 '싸 보인다'는 이유만으로 진입하지 말고, 추세 전환 신호가 확인될 때까지 관망 전략을 우선하세요.",
    횡보:
      "횡보 구간은 수익보다 손절 빈도가 높아질 수 있으니, 진입보다 기준선(지지/저항) 설정 연습에 집중하는 것이 유리합니다.",
  };

  return {
    summary:
      "업로드된 차트는 최근 구간의 가격 흐름과 주요 보조지표를 함께 보여주며, 단기 방향성과 변동성 구간을 파악하기에 적합한 형태입니다.",
    marketState,
    trendReason: trendReasonByState[marketState],
    insight: insightByState[marketState],
    cautions: [
      "이 결과는 교육용 예시이며 실제 투자 자문이 아닙니다.",
      "이미지 품질과 표시된 지표 종류에 따라 해석 정확도가 달라질 수 있습니다.",
      "단일 차트만으로 판단하지 말고 거래량, 뉴스, 재무 정보 등 추가 근거를 함께 확인하세요.",
    ],
    detected: {
      symbol: "이미지 기반 추정 필요",
      timeframe: "1시간봉(추정)",
      indicators: ["이동평균선", "RSI", "거래량"],
    },
    promptTemplate: ANALYSIS_PROMPT_TEMPLATE,
  };
}

app.post("/analyze", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "이미지 파일(image)이 필요합니다.",
    });
  }

  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({
      error: "이미지 파일만 업로드할 수 있습니다.",
    });
  }

  const analysis = createDemoAnalysis(req.file);
  return res.json(analysis);
});

app.listen(PORT, () => {
  console.log(`Chart explainer demo server running: http://localhost:${PORT}`);
});
