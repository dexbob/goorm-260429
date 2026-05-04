/** OpenRouter 실패 시 사용하는 고정 샘플(약 10건) */
const FALLBACK_QUOTES = [
  {
    quoteKo: "상상력은 지식보다 중요하다.",
    quoteEn: "Imagination is more important than knowledge.",
    author: "알베르트 아인슈타인",
    authorEn: "Albert Einstein",
    lifespan: "1879–1955",
    achievements: "특수상대성이론·일반상대성이론과 광전효과 연구로 현대 물리학의 토대를 세움.",
  },
  {
    quoteKo: "우리가 두려워해야 할 유일한 것은 두려움 그 자체다.",
    quoteEn: "The only thing we have to fear is fear itself.",
    author: "프랭클린 D. 루즈벨트",
    authorEn: "Franklin D. Roosevelt",
    lifespan: "1882–1945",
    achievements: "뉴딜 정책으로 대공황 극복을 주도하고 제2차 세계대전 연합국 승리에 기여함.",
  },
  {
    quoteKo: "악한 사람들이 성공하려면 좋은 사람들이 아무것도 하지 않기만 하면 된다.",
    quoteEn: "The only thing necessary for the triumph of evil is for good men to do nothing.",
    author: "에드먼드 버크",
    authorEn: "Edmund Burke",
    lifespan: "1729–1797",
    achievements: "계몽기 영국의 정치철학자로 혁명과 전통의 균형에 대한 논의로 영향을 줌.",
  },
  {
    quoteKo: "가장 어두운 밤이 지나면 해가 뜬다.",
    quoteEn: "It is always darkest just before the day dawneth.",
    author: "넬슨 만델라",
    authorEn: "Nelson Mandela",
    lifespan: "1918–2013",
    achievements: "인종차별 철폐와 민주 남아프리카 공화국의 초대 대통령으로 화해를 이끔.",
  },
  {
    quoteKo: "두려움보다 이해하기 쉬운 것은 없다.",
    quoteEn: "Nothing in life is to be feared, it is only to be understood.",
    author: "마리 퀴리",
    authorEn: "Marie Curie",
    lifespan: "1867–1934",
    achievements: "라듐·폴로늄 발견과 방사능 연구로 노벨 물리학상·화학상을 각각 수상함.",
  },
  {
    quoteKo: "내가 할 수 있다고 믿는 것과 할 수 없다고 믿는 것, 둘 다 옳다.",
    quoteEn: "Whether you think you can, or you think you can't—you're right.",
    author: "헨리 포드",
    authorEn: "Henry Ford",
    lifespan: "1863–1947",
    achievements: "컨베이어 벨트 대량생산으로 자동차 대중화를 이룬 기업가.",
  },
  {
    quoteKo: "오늘 받은 은혜를 잊는 것은 악이다.",
    quoteEn: "Reflect upon your present blessings, of which every man has plenty.",
    author: "찰스 디킨스",
    authorEn: "Charles Dickens",
    lifespan: "1812–1870",
    achievements: "《크리스마스 캐럴》 등 사회적 불의를 고발한 빅토리아 시대 소설가.",
  },
  {
    quoteKo: "삶이 있는 한 희망은 있다.",
    quoteEn: "While there's life, there's hope.",
    author: "키케로",
    authorEn: "Cicero",
    lifespan: "기원전 106–기원전 43",
    achievements: "로마 공화정 말기의 연설가·철학자로 라틴 문학과 법·윤리 사상에 공헌함.",
  },
  {
    quoteKo: "천 리 길도 한 걸음부터.",
    quoteEn: "A journey of a thousand miles begins with a single step.",
    author: "노자",
    authorEn: "Laozi",
    lifespan: "기원전 6세기경(?)–?",
    achievements: "도가 사상의 중심인물로 《도덕경》을 통해 무위·자연의 철학을 전함.",
  },
  {
    quoteKo: "가장 큰 영광은 넘어지지 않는 데 있는 것이 아니라 넘어질 때마다 일어서는 데 있다.",
    quoteEn: "Our greatest glory is not in never falling, but in rising every time we fall.",
    author: "공자",
    authorEn: "Confucius",
    lifespan: "기원전 551–기원전 479",
    achievements: "유교의 시조로 인문교육·덕치주의를 강조해 동아시아 문명에 지대한 영향을 끼침.",
  },
];

/** 페이지 로드 시 큐를 채우는 고정 시드 30건(시대·분야 다양화). API 실패 시에도 체감 반복을 줄임. */
const SEED_QUOTES = [
  {
    quoteKo: "반성되지 않는 삶은 살 가치가 없다.",
    quoteEn: "The unexamined life is not worth living.",
    author: "소크라테스",
    authorEn: "Socrates",
    lifespan: "기원전 470?–399",
    achievements: "탐문법과 윤리적 자기 점검을 강조한 고대 그리스 철학의 상징적 인물.",
  },
  {
    quoteKo: "내가 멀리 나아간 것은 거인의 어깨 위에 올라섰기 때문이다.",
    quoteEn: "If I have seen further, it is by standing on the shoulders of giants.",
    author: "아이작 뉴턴",
    authorEn: "Isaac Newton",
    lifespan: "1643–1727",
    achievements: "만유인력과 미적분을 정립해 근대 자연과학의 틀을 완성함.",
  },
  {
    quoteKo: "운명은 나를 데려다주고, 나는 그저 이끌릴 뿐이다.",
    quoteEn: "I want to seize fate by the throat.",
    author: "루트비히 판 베토벤",
    authorEn: "Ludwig van Beethoven",
    lifespan: "1770–1827",
    achievements: "고전에서 낭만으로 이어지는 교향곡·소나타로 서양 음악사에 지대한 영향을 남김.",
  },
  {
    quoteKo: "여성 자신이 돈을 벌어야 자유를 가질 수 있다.",
    quoteEn: "A woman must have money and a room of her own if she is to write fiction.",
    author: "버지니아 울프",
    authorEn: "Virginia Woolf",
    lifespan: "1882–1941",
    achievements: "의식의 흐름 기법과 페미니스트 문학론으로 20세기 영문학을 이끔.",
  },
  {
    quoteKo: "네 힘으로 살아라. 남의 힘에 기대지 마라.",
    quoteEn: "Waste no more time arguing about what a good man should be. Be one.",
    author: "마르쿠스 아우렐리우스",
    authorEn: "Marcus Aurelius",
    lifespan: "121–180",
    achievements: "스토아 철학을 《명상록》에 담은 로마 황제이자 사상가.",
  },
  {
    quoteKo: "내가 동의하지 않는 말이라도 목숨을 걸고 그 말을 할 권리를 옹호하겠다.",
    quoteEn: "I disapprove of what you say, but I will defend to the death your right to say it.",
    author: "볼테르",
    authorEn: "Voltaire",
    lifespan: "1694–1778",
    achievements: "계몽주의 시대의 비판 정신과 종교·정치 관용론을 널리 퍼뜨림.",
  },
  {
    quoteKo: "전쟁에서 이기려면 먼저 이긴 뒤에 싸워야 한다.",
    quoteEn: "Victorious warriors win first and then go to war, while defeated warriors go to war first and then seek to win.",
    author: "손자",
    authorEn: "Sun Tzu",
    lifespan: "기원전 6–5세기경(?)",
    achievements: "《손자병법》으로 전략·심리전을 체계화한 고대 병법가.",
  },
  {
    quoteKo: "나는 나 자신을 꽃으로 그렸다. 그래서 나는 살아남았다.",
    quoteEn: "I paint self-portraits because I am so often alone.",
    author: "프리다 칼로",
    authorEn: "Frida Kahlo",
    lifespan: "1907–1954",
    achievements: "멕시코 민속과 초현실을 결합한 자화상으로 20세기 미술에 한 획을 그음.",
  },
  {
    quoteKo: "가장 큰 적은 무지함이 아니라 무지함을 인정하지 않는 태도다.",
    quoteEn: "The greatest enemy of knowledge is not ignorance; it is the illusion of knowledge.",
    author: "스티븐 호킹",
    authorEn: "Stephen Hawking",
    lifespan: "1942–2018",
    achievements: "블랙홀 복사와 우주론으로 이론물리학 대중화에 크게 기여함.",
  },
  {
    quoteKo: "앞으로 나아가는 유일한 방법은 일을 시작하는 것이다.",
    quoteEn: "The way to get started is to quit talking and begin doing.",
    author: "월트 디즈니",
    authorEn: "Walt Disney",
    lifespan: "1901–1966",
    achievements: "애니메이션과 테마파크로 대중 문화 산업의 새 장을 염.",
  },
  {
    quoteKo: "경이로움은 지혜의 시작이다.",
    quoteEn: "Wonder is the beginning of wisdom.",
    author: "플라톤",
    authorEn: "Plato",
    lifespan: "기원전 428/427–348/347",
    achievements: "이데아·국가·정의론으로 서양 철학의 지형을 열어 놓음.",
  },
  {
    quoteKo: "우리가 반복해서 하는 일, 그것이 우리다. 탁월함은 행동이 아니라 습관이다.",
    quoteEn: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "아리스토텔레스",
    authorEn: "Aristotle",
    lifespan: "기원전 384–322",
    achievements: "형이상학·윤리·논리학을 체계화한 그리스 철학의 정점.",
  },
  {
    quoteKo: "미래에 대한 불안에 기대며 현재를 낭비하지 마라.",
    quoteEn: "True happiness is to enjoy the present, without anxious dependence on the future.",
    author: "세네카",
    authorEn: "Seneca",
    lifespan: "기원전 4경–65",
    achievements: "스토아 학파의 로마 시대 대표 작가이자 정치인.",
  },
  {
    quoteKo: "우리를 괴롭히는 것은 사건이 아니라, 사건에 대한 우리의 판단이다.",
    quoteEn: "Men are disturbed not by things, but by the view they take of them.",
    author: "에픽테토스",
    authorEn: "Epictetus",
    lifespan: "50경–135경",
    achievements: "노예 출신 스토아 철학자로 자유와 내면의 태도를 강조함.",
  },
  {
    quoteKo: "이름에 무엇이 있랴? 장미라 불리지 않아도 그 향기는 그대로일 것이다.",
    quoteEn: "What's in a name? That which we call a rose by any other name would smell as sweet.",
    author: "윌리엄 셰익스피어",
    authorEn: "William Shakespeare",
    lifespan: "1564–1616",
    achievements: "《로미오와 줄리엣》 등으로 근대 영어 문학의 정점을 이룸.",
  },
  {
    quoteKo: "모든 행복한 가정은 서로 닮았지만, 불행한 가정은 각기 다르게 불행하다.",
    quoteEn: "All happy families are alike; each unhappy family is unhappy in its own way.",
    author: "레프 톨스토이",
    authorEn: "Leo Tolstoy",
    lifespan: "1828–1910",
    achievements: "《전쟁과 평화》《안나 카레니나》로 러시아 리얼리즘 소설의 거장.",
  },
  {
    quoteKo: "하늘 위의 별과 도덕 법칙만이 내 마음을 더없이 경외하게 한다.",
    quoteEn: "Two things fill the mind with ever new and increasing admiration and awe: the starry heavens above me and the moral law within me.",
    author: "이마누엘 칸트",
    authorEn: "Immanuel Kant",
    lifespan: "1724–1804",
    achievements: "비판철학과 실천이성비판으로 근대 독일 관념론을 세움.",
  },
  {
    quoteKo: "시간을 아끼지 않는 자는 가난해질 여지가 없다.",
    quoteEn: "Lost time is never found again.",
    author: "벤저민 프랭클린",
    authorEn: "Benjamin Franklin",
    lifespan: "1706–1790",
    achievements: "계몽기 과학·출판·외교로 미국 건국의 한 축을 담당함.",
  },
  {
    quoteKo: "대부분의 사람들이 기쁨으로 살 만큼 기쁨을 결정한다.",
    quoteEn: "Most folks are about as happy as they make up their minds to be.",
    author: "에이브러햄 링컨",
    authorEn: "Abraham Lincoln",
    lifespan: "1809–1865",
    achievements: "노예해방과 연방 유지로 미국 역사를 바꾼 대통령.",
  },
  {
    quoteKo: "세상을 바꾸고 싶다면 먼저 당신 자신이 그 변화가 되어라.",
    quoteEn: "Be the change that you wish to see in the world.",
    author: "마하트마 간디",
    authorEn: "Mahatma Gandhi",
    lifespan: "1869–1948",
    achievements: "비폭력 저항으로 인도 독립 운동을 이끈 정치·종교 지도자.",
  },
  {
    quoteKo: "어둠 속을 걸을 수 없다면, 스스로 빛이 되어라.",
    quoteEn: "Darkness cannot drive out darkness; only light can do that.",
    author: "마틴 루터 킹 주니어",
    authorEn: "Martin Luther King Jr.",
    lifespan: "1929–1968",
    achievements: "미국 민권운동을 이끌며 비폭력과 평등을 역설함.",
  },
  {
    quoteKo: "사랑한 것이 아니라, 사랑할 때까지 사랑하라.",
    quoteEn: "Spread love everywhere you go. Let no one ever come to you without leaving happier.",
    author: "마더 테레사",
    authorEn: "Mother Teresa",
    lifespan: "1910–1997",
    achievements: "가난한 이들을 돌보는 선교 활동으로 노벨 평화상을 수상함.",
  },
  {
    quoteKo: "두려워하지 말고, 이해하려 하라.",
    quoteEn: "Nothing in life is to be feared, it is only to be understood.",
    author: "마리 퀴리",
    authorEn: "Marie Curie",
    lifespan: "1867–1934",
    achievements: "라듐·폴로늄 발견과 방사능 연구로 노벨 물리학상·화학상을 수상함.",
  },
  {
    quoteKo: "내가 앉아 있기로 거부한 자리에, 다른 누군가는 서 있을 권리가 없다.",
    quoteEn: "You must never be fearful about what you are doing when it is right.",
    author: "로자 파크스",
    authorEn: "Rosa Parks",
    lifespan: "1913–2005",
    achievements: "버스 인종분리 거부로 미국 민권운동의 상징이 됨.",
  },
  {
    quoteKo: "용서는 속박에서 자신을 해방시키는 것이다.",
    quoteEn: "Resentment is like drinking poison and then hoping it will kill your enemies.",
    author: "넬슨 만델라",
    authorEn: "Nelson Mandela",
    lifespan: "1918–2013",
    achievements: "인종차별 철폐와 민주 남아프리카 공화국의 초대 대통령으로 화해를 이끔.",
  },
  {
    quoteKo: "단순함이 궁극의 정교함이다.",
    quoteEn: "Simplicity is the ultimate sophistication.",
    author: "레오나르도 다 빈치",
    authorEn: "Leonardo da Vinci",
    lifespan: "1452–1519",
    achievements: "르네상스의 전방위 천재로 회화·해부·공학에 두루 업적을 남김.",
  },
  {
    quoteKo: "그래도 지구는 돈다.",
    quoteEn: "And yet it moves.",
    author: "갈릴레오 갈릴레이",
    authorEn: "Galileo Galilei",
    lifespan: "1564–1642",
    achievements: "망원경 관측과 관성 개념으로 근대 천문학·물리학의 선구자.",
  },
  {
    quoteKo: "우리는 앞을 멀리 볼 수 없지만, 눈앞에서 해야 할 일은 충분히 보인다.",
    quoteEn: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "앨런 튜링",
    authorEn: "Alan Turing",
    lifespan: "1912–1954",
    achievements: "계산 가능성과 암호 해독으로 컴퓨터 과학의 기초를 놓음.",
  },
  {
    quoteKo: "자연 속에서 아무것도 홀로 존재하지 않는다.",
    quoteEn: "In nature nothing exists alone.",
    author: "레이첼 카슨",
    authorEn: "Rachel Carson",
    lifespan: "1907–1964",
    achievements: "《침묵의 봄》으로 환경운동과 규제 논의에 지대한 영향을 줌.",
  },
  {
    quoteKo: "사람은 마음이 향하는 곳으로 간다.",
    quoteEn: "Wherever you go, go with all your heart.",
    author: "공자",
    authorEn: "Confucius",
    lifespan: "기원전 551–기원전 479",
    achievements: "《논어》 등을 통해 군자의 덕과 학문의 길을 제시함.",
  },
];

const colors = ["#FF6B6B", "#6BCB77", "#4D96FF", "#FFD93D", "#845EC2"];

/** @type {const} */
const TRANSITIONS = ["flipX", "flipY", "slideL", "slideR", "zoom"];

const quoteElement = document.getElementById("quote");
const quoteOriginalElement = document.getElementById("quoteOriginal");
const authorPrimaryElement = document.getElementById("authorPrimary");
const authorAchievementsElement = document.getElementById("authorAchievements");
const authorBlock = document.getElementById("authorBlock");
const cardElement = document.getElementById("card");
const cardFill = document.getElementById("cardFill");
const cardBody = document.getElementById("cardBody");

/** 명언 표시 횟수(dedupeKey) — 큐에서 '가장 많이 보인' 항목 교체 시 사용 */
const viewCounts = new Map();

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

/**
 * @param {unknown} o
 * @returns {o is { quoteKo: string; quoteEn?: string; author: string; authorEn?: string; lifespan?: string; achievements?: string }}
 */
function isValidQuoteData(o) {
  if (!o || typeof o !== "object") return false;
  const q = /** @type {{ quoteKo?: unknown; author?: unknown }} */ (o);
  return (
    typeof q.quoteKo === "string" &&
    q.quoteKo.trim().length > 0 &&
    typeof q.author === "string" &&
    q.author.trim().length > 0
  );
}

function setOptionalLine(el, text) {
  const t = String(text ?? "").trim();
  if (!t) {
    el.hidden = true;
    el.textContent = "";
  } else {
    el.hidden = false;
    el.textContent = t;
  }
}

/**
 * 한 줄: 이름 (영문)  생년–사년
 * @param {{ author: string; authorEn?: string; lifespan?: string }} p
 */
function buildAuthorPrimaryLine(p) {
  const ko = String(p.author || "").trim();
  const en = String(p.authorEn || "").trim();
  const life = String(p.lifespan || "").trim();
  if (!ko) return "";
  const withEn = en ? `${ko} (${en})` : ko;
  if (life) return `${withEn}  ${life}`;
  return withEn;
}

/**
 * @param {{ quoteKo: string; quoteEn?: string; author: string; authorEn?: string; lifespan?: string; achievements?: string }} q
 */
function applyQuoteData(q) {
  quoteElement.textContent = q.quoteKo.trim();
  setOptionalLine(quoteOriginalElement, q.quoteEn);

  const primary = buildAuthorPrimaryLine(q);
  authorPrimaryElement.textContent = primary;
  authorPrimaryElement.hidden = primary.length === 0;
  setOptionalLine(authorAchievementsElement, q.achievements);

  authorBlock.hidden = false;
  cardBody.classList.remove("card-body--intro");

  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  cardElement.style.backgroundColor = "transparent";
  cardFill.style.backgroundColor = randomColor;
  setCardTextColors(randomColor);

  requestAnimationFrame(() => {
    fitCardText();
  });

  const vk = dedupeKey(q);
  viewCounts.set(vk, (viewCounts.get(vk) || 0) + 1);
}

function pickRandomFallback() {
  if (FALLBACK_QUOTES.length === 0) {
    return {
      quoteKo: "명언을 불러올 수 없습니다.",
      quoteEn: "",
      author: "—",
      authorEn: "",
      lifespan: "",
      achievements: "잠시 후 다시 시도해 주세요.",
    };
  }

  if (fallbackDeck.length === 0 || fallbackDeckCursor >= fallbackDeck.length) {
    refillFallbackDeck();
  }

  if (fallbackDeckCursor >= fallbackDeck.length) refillFallbackDeck();
  const row = fallbackDeck[fallbackDeckCursor++];
  const { quoteKo, quoteEn, author, authorEn, lifespan, achievements } = row;
  return { quoteKo, quoteEn, author, authorEn, lifespan, achievements };
}

function fetchWithTimeout(url, ms) {
  const ac = new AbortController();
  const id = window.setTimeout(() => ac.abort(), ms);
  return fetch(url, { signal: ac.signal }).finally(() => window.clearTimeout(id));
}

/** `start-servers.sh` 가 루트에 쓰는 hub-dev-ports.json 으로 정적 허브(예: :5000)에서 Node 포트 연결 */
function isGithubPagesHost() {
  const host = String(location.hostname || "").toLowerCase();
  return host === "github.io" || host.endsWith(".github.io");
}

/** @type {Promise<string> | null} */
let hubApiBasePromise = null;

function getHubApiBase() {
  if (!hubApiBasePromise) {
    hubApiBasePromise = (async () => {
      if (typeof location === "undefined" || !/^https?:/i.test(location.protocol)) {
        return "";
      }
      if (isGithubPagesHost()) return "";
      const parts = location.pathname.split("/").filter(Boolean);
      const projectDir = parts[0];
      if (!projectDir) return "";
      try {
        const res = await fetch(`${location.origin}/hub-dev-ports.json`, { cache: "no-store" });
        if (!res.ok) return "";
        const map = await res.json();
        const rawPort = map[projectDir];
        const port =
          typeof rawPort === "string"
            ? Number.parseInt(rawPort, 10)
            : typeof rawPort === "number"
              ? rawPort
              : NaN;
        if (!Number.isFinite(port) || port <= 0 || port > 65535) return "";
        return `${location.protocol}//${location.hostname}:${port}`;
      } catch {
        return "";
      }
    })();
  }
  return hubApiBasePromise;
}

async function getQuoteApiUrl() {
  const base = await getHubApiBase();
  const trimmed = String(base || "").replace(/\/$/, "");
  return trimmed ? `${trimmed}/api/quote` : "/api/quote";
}

const API_FETCH_MS = 22000;
/** 로드 시·클릭 시 각각 동시에 열어둘 OpenRouter 요청 수 */
const PARALLEL_BATCH = 5;

const quoteQueue = [];

/** 한글 명언 + 저자 기준 식별 키 */
function dedupeKey(q) {
  const ko = String(q.quoteKo || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const au = String(q.author || "").trim().toLowerCase();
  return `${ko}::${au}`;
}

function initQuoteQueueFromSeeds() {
  quoteQueue.length = 0;
  const seeds = SEED_QUOTES.map((row) => ({ ...row }));
  shuffleInPlace(seeds);
  for (const q of seeds) quoteQueue.push(q);
}

function quoteKeyInQueue(k) {
  return quoteQueue.some((row) => dedupeKey(row) === k);
}

/**
 * API 성공 시(완료 순서대로): 큐에 동일 명언이 없으면, 표시 횟수가 가장 많은 항목 1개를 제거한 뒤 끝에 추가.
 */
function ingestSuccessfulQuote(q) {
  const k = dedupeKey(q);
  if (quoteKeyInQueue(k)) return;

  if (quoteQueue.length > 0) {
    let bestIdx = 0;
    let bestScore = viewCounts.get(dedupeKey(quoteQueue[0])) || 0;
    for (let i = 1; i < quoteQueue.length; i++) {
      const sc = viewCounts.get(dedupeKey(quoteQueue[i])) || 0;
      if (sc > bestScore) {
        bestScore = sc;
        bestIdx = i;
      }
    }
    quoteQueue.splice(bestIdx, 1);
  }
  quoteQueue.push(q);
}

/** 폴백: 한 바퀴 셔플 후 순서대로 소비, 다시 셔플 */
/** @type {Array<(typeof FALLBACK_QUOTES)[number]>} */
let fallbackDeck = [];
let fallbackDeckCursor = 0;

function shuffleInPlace(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function refillFallbackDeck() {
  fallbackDeck = FALLBACK_QUOTES.map((row) => ({ ...row }));
  shuffleInPlace(fallbackDeck);
  fallbackDeckCursor = 0;
}

/**
 * @param {object} j
 * @returns {{ quoteKo: string; quoteEn: string; author: string; authorEn: string; lifespan: string; achievements: string }}
 */
function normalizeQuoteFromApi(j) {
  return {
    quoteKo: j.quoteKo.trim(),
    quoteEn: typeof j.quoteEn === "string" ? j.quoteEn.trim() : "",
    author: j.author.trim(),
    authorEn: typeof j.authorEn === "string" ? j.authorEn.trim() : "",
    lifespan: typeof j.lifespan === "string" ? j.lifespan.trim() : "",
    achievements: typeof j.achievements === "string" ? j.achievements.trim() : "",
  };
}

/** 이전 병렬 배치가 끝나기 전에는 새 배치를 쏘지 않음(429·중첩 완화). */
let parallelFetchLocked = false;

/**
 * `PARALLEL_BATCH`개 요청을 동시에 보내고, 각각이 **끝나는 순서대로** 성공 시 `ingestSuccessfulQuote`만 호출.
 */
async function runParallelQuoteFetchBatch() {
  if (parallelFetchLocked) return;
  parallelFetchLocked = true;
  try {
    const url = await getQuoteApiUrl();
    const tasks = [];
    for (let i = 0; i < PARALLEL_BATCH; i++) {
      tasks.push(
        fetchWithTimeout(url, API_FETCH_MS)
          .then(async (res) => {
            if (!res.ok) throw new Error("bad status");
            const j = await res.json();
            if (j && typeof j === "object" && "error" in j && j.error) throw new Error("api error");
            if (!isValidQuoteData(j)) throw new Error("invalid");
            return normalizeQuoteFromApi(j);
          })
          .then((norm) => {
            ingestSuccessfulQuote(norm);
          })
          .catch(() => {}),
      );
    }
    await Promise.allSettled(tasks);
  } catch {
    /* getQuoteApiUrl 등 초기 단계 실패 */
  } finally {
    parallelFetchLocked = false;
  }
}

/**
 * 클릭 시 **동기**로 다음 카드만 결정하고, 가능하면 백그라운드로 병렬 5건 요청을 한 번 시작.
 * 큐가 비면 로컬 폴백 샘플을 사용.
 * @returns {{ quoteKo: string; quoteEn: string; author: string; authorEn: string; lifespan: string; achievements: string }}
 */
function consumeNextQuoteSync() {
  void runParallelQuoteFetchBatch();
  if (quoteQueue.length > 0) {
    return quoteQueue.shift();
  }
  return pickRandomFallback();
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

  if (prefersReducedMotion()) {
    applyQuoteData(consumeNextQuoteSync());
    return;
  }

  const t = pickTransition();
  const leaveCls = `card--leave-${t}`;
  const enterCls = `card--enter-${t}`;

  isBusy = true;
  cardElement.classList.add("card--busy", "card--anim", leaveCls);
  cardElement.setAttribute("aria-busy", "true");

  /* 다음 카드 내용은 여기서 동기로만 결정 — AI 응답을 이 구간에서 기다리지 않음 */
  const nextData = consumeNextQuoteSync();

  await waitAnimationEnd(cardElement);

  cardElement.classList.remove(leaveCls);

  applyQuoteData(nextData);

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
  if (!authorBlock.hidden) {
    fitCardText();
  }
});

setCardTextColors("#5a3d7a");
requestAnimationFrame(() => {
  fitCardText();
});

initQuoteQueueFromSeeds();
void runParallelQuoteFetchBatch();
