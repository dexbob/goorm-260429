const EMAIL_TO = "mimacro.kr@gmail.com";
const THEME_STORAGE_KEY = "theme";
const LANG_STORAGE_KEY = "lang";

const STRINGS = {
  ko: {
    "meta.title": "DexterAI Studio | AI 에이전트 기반 앱 빌드",
    "meta.description":
      "DexterAI Studio는 AI 에이전트를 활용해 바이브코딩 입문자도 빠르게 현대적인 애플리케이션 MVP를 만들 수 있도록 돕는 에이전시입니다.",

    "nav.overview": "개요",
    "nav.services": "서비스",
    "nav.workflow": "진행 방식",
    "nav.results": "결과 지표",
    "nav.faq": "자주 묻는 질문",
    "nav.contact": "문의하기",
    "header.cta": "무료 상담 신청",

    "hero.eyebrow": "AI AGENT BUILD STUDIO",
    "hero.title": "AI 에이전트로 아이디어를 실제 제품으로 만듭니다",
    "hero.subtitle":
      "어디서부터 시작할지 막막한 입문자도 괜찮습니다. DexterAI Studio는 전문가와 AI 에이전트 협업으로 MVP 제작을 빠르게 실행합니다.",
    "hero.cta.primary": "프로젝트 시작하기",
    "hero.cta.secondary": "작업 방식 보기",

    "hero.terminal.user": "User",
    "hero.terminal.userText": "아이디어를 MVP로 만들고 싶어요.",
    "hero.terminal.agent": "Agent",
    "hero.terminal.agentText": "요구사항을 분석하고 화면 구조를 설계합니다.",
    "hero.terminal.studio": "Studio",
    "hero.terminal.studioText": "코드 품질 검증 후 배포까지 연결합니다.",

    "pillars.title": "왜 DexterAI Studio인가요?",
    "pillars.c1.title": "더 빠른 실행",
    "pillars.c1.desc":
      "기획부터 첫 배포까지의 시간을 주 단위에서 일 단위로 단축합니다.",
    "pillars.c2.title": "검증된 품질",
    "pillars.c2.desc":
      "반복 가능한 템플릿과 리뷰 프로세스로 안정적인 결과를 만듭니다.",
    "pillars.c3.title": "사람 + 에이전트",
    "pillars.c3.desc":
      "전문가의 방향성과 AI 에이전트의 속도를 결합해 완성도를 높입니다.",
    "pillars.c4.title": "확장 가능한 구조",
    "pillars.c4.desc":
      "MVP 이후 운영 자동화와 고도화까지 이어질 수 있게 설계합니다.",

    "services.title": "서비스",
    "services.s1.title": "MVP 제작",
    "services.s1.desc": "핵심 기능 중심 웹앱/랜딩 제작",
    "services.s1.meta": "결과물: 프로토타입 + 배포본 / 기간: 2~4주",
    "services.s2.title": "업무 자동화 구축",
    "services.s2.desc": "반복 업무를 AI 에이전트 흐름으로 연결",
    "services.s2.meta": "결과물: 자동화 플로우 / 기간: 1~3주",
    "services.s3.title": "운영 개선",
    "services.s3.desc": "운영 중인 서비스의 전환율과 개발 효율 개선",
    "services.s3.meta": "결과물: 개선 리포트 + 실행안 / 기간: 2주",
    "services.s4.title": "고도화 리팩터링",
    "services.s4.desc": "기존 코드 구조를 확장 가능한 형태로 재정비",
    "services.s4.meta": "결과물: 리팩터링 코드 + 문서 / 기간: 2~5주",

    "steps.title": "진행 방식",
    "steps.s1.title": "Discover",
    "steps.s1.desc": "아이디어, 목표, 우선순위를 정리합니다.",
    "steps.s2.title": "Design",
    "steps.s2.desc": "입문자도 이해할 수 있는 화면/기능 구조를 설계합니다.",
    "steps.s3.title": "Build",
    "steps.s3.desc": "AI 에이전트와 함께 빠르게 구현하고 검증합니다.",
    "steps.s4.title": "Launch",
    "steps.s4.desc": "실사용 가능한 형태로 배포하고 운영 시작을 지원합니다.",

    "results.title": "결과 지표",
    "results.r1.value": "3배",
    "results.r1.desc": "초기 MVP 제작 속도 향상",
    "results.r2.value": "40%",
    "results.r2.desc": "반복 업무 시간 절감",
    "results.r3.value": "2주",
    "results.r3.desc": "첫 사용자 테스트 시작 평균 기간",

    "faq.title": "자주 묻는 질문",
    "faq.q1": "개발 지식이 거의 없어도 가능한가요?",
    "faq.a1":
      "가능합니다. 목표와 아이디어만 정리해 주시면 진행에 필요한 구조를 함께 잡아드립니다.",
    "faq.q2": "비용은 어떻게 책정되나요?",
    "faq.a2":
      "프로젝트 범위와 기간에 따라 산정하며, 상담 후 명확한 견적 범위를 제시합니다.",
    "faq.q3": "준비해야 할 자료가 있나요?",
    "faq.a3":
      "문제 정의, 목표 사용자, 핵심 기능 3가지만 준비하면 시작할 수 있습니다.",
    "faq.q4": "유지보수도 지원하나요?",
    "faq.a4":
      "런칭 이후 개선 로드맵과 운영 자동화를 포함한 유지보수 옵션을 제공합니다.",
    "faq.q5": "얼마나 빨리 첫 결과를 볼 수 있나요?",
    "faq.a5":
      "일반적으로 1주 내 설계 초안, 2주 내 동작 가능한 초기 결과물을 확인할 수 있습니다.",

    "contact.title": "지금 시작하면, 아이디어는 더 빨리 제품이 됩니다",
    "contact.subtitle": "DexterAI Studio와 함께 AI 에이전트 기반 빌드를 시작해 보세요.",
    "contact.form.label": "문의사항",
    "contact.form.placeholder":
      "여기에 문의 내용을 입력해 주세요. (예: MVP 범위, 일정, 참고 자료)",
    "contact.form.hint":
      "제출하면 이메일 클라이언트가 열리며, 입력하신 내용이 본문에 포함됩니다.",
    "contact.form.submit": "문의 보내기",
    "contact.form.errorRequired": "문의사항을 입력해 주세요.",
    "contact.form.mailSubject": "DexterAI Studio 문의",
    "contact.form.mailBodyPrefix":
      "아래 문의 내용을 확인해 주세요.\n\n[문의 내용]",
    "contact.form.mailBodySuffix":
      "— DexterAI Studio",

    "footer.brand": "DexterAI Studio",
    "footer.rights": "© 2026 DexterAI Studio. All rights reserved.",
  },
  en: {
    "meta.title": "DexterAI Studio | Build Modern Apps with AI Agents",
    "meta.description":
      "DexterAI Studio helps beginner builders create modern application MVPs quickly using AI agents and expert collaboration.",

    "nav.overview": "Overview",
    "nav.services": "Services",
    "nav.workflow": "Workflow",
    "nav.results": "Results",
    "nav.faq": "FAQ",
    "nav.contact": "Contact",
    "header.cta": "Free Consultation",

    "hero.eyebrow": "AI AGENT BUILD STUDIO",
    "hero.title": "Turn ideas into products with AI agents.",
    "hero.subtitle":
      "Even if you're new, DexterAI Studio helps you build a modern MVP fast through human + agent collaboration.",
    "hero.cta.primary": "Start a Project",
    "hero.cta.secondary": "See How We Work",

    "hero.terminal.user": "User",
    "hero.terminal.userText": "I want to turn my idea into an MVP.",
    "hero.terminal.agent": "Agent",
    "hero.terminal.agentText": "Analyze requirements and design the screens.",
    "hero.terminal.studio": "Studio",
    "hero.terminal.studioText": "Validate code quality and connect to deployment.",

    "pillars.title": "Why DexterAI Studio?",
    "pillars.c1.title": "Faster Execution",
    "pillars.c1.desc": "From concept to first launch in days—not weeks.",
    "pillars.c2.title": "Quality You Can Trust",
    "pillars.c2.desc": "Repeatable patterns and review steps for reliable outcomes.",
    "pillars.c3.title": "Humans + Agents",
    "pillars.c3.desc": "Combine expert direction with agent speed to raise the final quality.",
    "pillars.c4.title": "Built to Scale",
    "pillars.c4.desc": "Design from MVP to operations automation and future enhancements.",

    "services.title": "Services",
    "services.s1.title": "MVP Build",
    "services.s1.desc": "Web apps and landing pages focused on core features.",
    "services.s1.meta": "Deliverables: prototype + deployable version / Timeline: 2–4 weeks",
    "services.s2.title": "Automation",
    "services.s2.desc": "Connect repetitive work into an agent-driven flow.",
    "services.s2.meta": "Deliverables: automation flow / Timeline: 1–3 weeks",
    "services.s3.title": "Operational Improvements",
    "services.s3.desc": "Improve conversion and development efficiency.",
    "services.s3.meta": "Deliverables: improvement report + action plan / Timeline: 2 weeks",
    "services.s4.title": "Advanced Refactoring",
    "services.s4.desc": "Restructure code for long-term extensibility.",
    "services.s4.meta": "Deliverables: refactored code + docs / Timeline: 2–5 weeks",

    "steps.title": "How It Works",
    "steps.s1.title": "Discover",
    "steps.s1.desc": "Align your idea, goals, and priorities.",
    "steps.s2.title": "Design",
    "steps.s2.desc": "Create a clear screen/function structure you can understand.",
    "steps.s3.title": "Build",
    "steps.s3.desc": "Implement and validate quickly with AI agents.",
    "steps.s4.title": "Launch",
    "steps.s4.desc": "Deploy a usable version and support your go-live.",

    "results.title": "Results",
    "results.r1.value": "3x",
    "results.r1.desc": "Faster time to initial MVP",
    "results.r2.value": "40%",
    "results.r2.desc": "Less time spent on repetitive tasks",
    "results.r3.value": "2 weeks",
    "results.r3.desc": "Average time to start user testing",

    "faq.title": "Frequently Asked Questions",
    "faq.q1": "Can I start even with little or no development experience?",
    "faq.a1":
      "Yes. If you share your goals and idea, we’ll help shape the structure and next steps together.",
    "faq.q2": "How do you price projects?",
    "faq.a2": "It depends on scope and timeline. After a consultation, we provide a clear estimate range.",
    "faq.q3": "What should I prepare?",
    "faq.a3": "Just define the problem, your target users, and the 3 most important features.",
    "faq.q4": "Do you support maintenance after launch?",
    "faq.a4": "Yes. We offer maintenance options including an improvement roadmap and operation automation.",
    "faq.q5": "When will I see first results?",
    "faq.a5": "Typically you’ll have a design draft within 1 week and a runnable early result within 2 weeks.",

    "contact.title": "Start now—your idea becomes a product sooner.",
    "contact.subtitle": "Begin an AI-agent-based build with DexterAI Studio.",
    "contact.form.label": "Your Message",
    "contact.form.placeholder": "Write your request here. (e.g., MVP scope, timeline, references)",
    "contact.form.hint": "After submitting, your email client will open and your message will be included in the email body.",
    "contact.form.submit": "Send Inquiry",
    "contact.form.errorRequired": "Please enter your message.",
    "contact.form.mailSubject": "DexterAI Studio Inquiry",
    "contact.form.mailBodyPrefix": "Please review the following inquiry.\n\n[Message]",
    "contact.form.mailBodySuffix": "— DexterAI Studio",

    "footer.brand": "DexterAI Studio",
    "footer.rights": "© 2026 DexterAI Studio. All rights reserved.",
  },
  ja: {
    "meta.title": "DexterAI Studio | AIエージェントでモダンなアプリを作る",
    "meta.description":
      "DexterAI StudioはAIエージェントと専門家の協働で、初心者でもモダンなアプリMVPを素早く作れるよう支援します。",

    "nav.overview": "概要",
    "nav.services": "サービス",
    "nav.workflow": "進め方",
    "nav.results": "成果",
    "nav.faq": "よくある質問",
    "nav.contact": "お問い合わせ",
    "header.cta": "無料相談",

    "hero.eyebrow": "AI AGENT BUILD STUDIO",
    "hero.title": "AIエージェントでアイデアをプロダクトに。",
    "hero.subtitle":
      "初心者でも大丈夫。DexterAI Studioは人とエージェントの協働で、モダンなMVPを素早く形にします。",
    "hero.cta.primary": "プロジェクトを始める",
    "hero.cta.secondary": "作業の流れを見る",

    "hero.terminal.user": "ユーザー",
    "hero.terminal.userText": "アイデアをMVPにしたいです。",
    "hero.terminal.agent": "エージェント",
    "hero.terminal.agentText": "要件を分析し、画面構成を設計します。",
    "hero.terminal.studio": "Studio",
    "hero.terminal.studioText": "コード品質を検証し、デプロイにつなげます。",

    "pillars.title": "なぜDexterAI Studio？",
    "pillars.c1.title": "スピード重視",
    "pillars.c1.desc": "構想から初回リリースまで、週単位ではなく日単位へ。",
    "pillars.c2.title": "信頼できる品質",
    "pillars.c2.desc": "再利用できるパターンとレビュー工程で安定した結果を。",
    "pillars.c3.title": "人 + エージェント",
    "pillars.c3.desc": "専門家の方向性と、エージェントのスピードで完成度を高めます。",
    "pillars.c4.title": "拡張を前提に設計",
    "pillars.c4.desc": "MVPから運用自動化、将来の改善まで見据えて組み立てます。",

    "services.title": "サービス",
    "services.s1.title": "MVP制作",
    "services.s1.desc": "コア機能に集中したWebアプリ/ランディング制作",
    "services.s1.meta": "成果物: プロトタイプ + デプロイ可能版 / 期間: 2〜4週間",
    "services.s2.title": "業務自動化",
    "services.s2.desc": "反復作業をエージェント主導のフローでつなぎます",
    "services.s2.meta": "成果物: 自動化フロー / 期間: 1〜3週間",
    "services.s3.title": "運用改善",
    "services.s3.desc": "転換率と開発効率を改善",
    "services.s3.meta": "成果物: 改善レポート + 実行プラン / 期間: 2週間",
    "services.s4.title": "高度なリファクタリング",
    "services.s4.desc": "拡張しやすい形にコードを再整備",
    "services.s4.meta": "成果物: リファクタリングコード + ドキュメント / 期間: 2〜5週間",

    "steps.title": "進め方",
    "steps.s1.title": "Discover",
    "steps.s1.desc": "アイデア、目標、優先順位を揃えます。",
    "steps.s2.title": "Design",
    "steps.s2.desc": "初心者でも理解できる画面/機能構成を設計します。",
    "steps.s3.title": "Build",
    "steps.s3.desc": "AIエージェントと一緒に素早く実装し、検証します。",
    "steps.s4.title": "Launch",
    "steps.s4.desc": "実運用できる形でデプロイし、ローンチを支援します。",

    "results.title": "成果",
    "results.r1.value": "3倍",
    "results.r1.desc": "初期MVPの制作スピード向上",
    "results.r2.value": "40%",
    "results.r2.desc": "反復作業にかかる時間の削減",
    "results.r3.value": "2週間",
    "results.r3.desc": "ユーザーテスト開始までの平均期間",

    "faq.title": "よくある質問",
    "faq.q1": "開発の経験がほとんどなくても大丈夫ですか？",
    "faq.a1":
      "はい。目標とアイデアを共有していただければ、進めるための構造を一緒に整理します。",
    "faq.q2": "費用はどのように決まりますか？",
    "faq.a2":
      "プロジェクトの範囲と期間に基づき算定します。相談後に明確な見積り範囲を提示します。",
    "faq.q3": "準備する資料はありますか？",
    "faq.a3": "問題の定義、ターゲットユーザー、重要な機能3つだけで始められます。",
    "faq.q4": "ローンチ後の保守も対応していますか？",
    "faq.a4":
      "はい。改善ロードマップや運用自動化を含む保守オプションをご用意しています。",
    "faq.q5": "最初の成果はいつ頃見られますか？",
    "faq.a5":
      "一般的に1週間で設計案、2週間で動作可能な初期成果をご確認いただけます。",

    "contact.title": "今始めれば、アイデアはより早くプロダクトになります。",
    "contact.subtitle": "DexterAI Studioと一緒に、AIエージェントによる構築を始めましょう。",
    "contact.form.label": "お問い合わせ内容",
    "contact.form.placeholder": "ここにお問い合わせ内容を入力してください。（例: MVP範囲、時期、参考資料）",
    "contact.form.hint": "送信するとメールクライアントが開き、入力内容が本文に含まれます。",
    "contact.form.submit": "送信する",
    "contact.form.errorRequired": "お問い合わせ内容を入力してください。",
    "contact.form.mailSubject": "DexterAI Studio お問い合わせ",
    "contact.form.mailBodyPrefix": "以下のお問い合わせ内容をご確認ください。\n\n[お問い合わせ内容]",
    "contact.form.mailBodySuffix": "— DexterAI Studio",

    "footer.brand": "DexterAI Studio",
    "footer.rights": "© 2026 DexterAI Studio. All rights reserved.",
  },
  zh: {
    "meta.title": "DexterAI Studio | 用 AI 代理构建现代应用",
    "meta.description": "DexterAI Studio 帮助入门者借助 AI 代理与专家协作，快速打造现代化应用 MVP。",

    "nav.overview": "概览",
    "nav.services": "服务",
    "nav.workflow": "工作流程",
    "nav.results": "结果",
    "nav.faq": "常见问题",
    "nav.contact": "联系",
    "header.cta": "免费咨询",

    "hero.eyebrow": "AI AGENT BUILD STUDIO",
    "hero.title": "用 AI 代理把想法变成产品。",
    "hero.subtitle": "就算你是新手，DexterAI Studio 也能通过“人 + AI 代理”的协作，帮助你快速打造现代化 MVP。",
    "hero.cta.primary": "开始项目",
    "hero.cta.secondary": "查看工作方式",

    "hero.terminal.user": "用户",
    "hero.terminal.userText": "我想把想法做成 MVP。",
    "hero.terminal.agent": "代理",
    "hero.terminal.agentText": "分析需求并设计页面结构。",
    "hero.terminal.studio": "Studio",
    "hero.terminal.studioText": "验证代码质量并连接到部署。",

    "pillars.title": "为什么是 DexterAI Studio？",
    "pillars.c1.title": "更快交付",
    "pillars.c1.desc": "从概念到首个上线，用天而不是用周。",
    "pillars.c2.title": "可靠的质量",
    "pillars.c2.desc": "可重复的模式与评审流程，确保稳定产出。",
    "pillars.c3.title": "人 + 代理",
    "pillars.c3.desc": "专家给方向，代理提升速度，让最终质量更高。",
    "pillars.c4.title": "为扩展而设计",
    "pillars.c4.desc": "从 MVP 到运维自动化与后续增强，贯通式规划。",

    "services.title": "服务",
    "services.s1.title": "MVP 制作",
    "services.s1.desc": "聚焦核心功能的 Web 应用/落地页制作",
    "services.s1.meta": "交付物: 原型 + 可部署版本 / 周期: 2–4 周",
    "services.s2.title": "自动化构建",
    "services.s2.desc": "把重复工作串成代理驱动的流程",
    "services.s2.meta": "交付物: 自动化流程 / 周期: 1–3 周",
    "services.s3.title": "运营优化",
    "services.s3.desc": "提升转化率与开发效率",
    "services.s3.meta": "交付物: 优化报告 + 执行方案 / 周期: 2 周",
    "services.s4.title": "高级重构",
    "services.s4.desc": "重整代码结构，便于长期扩展",
    "services.s4.meta": "交付物: 重构代码 + 文档 / 周期: 2–5 周",

    "steps.title": "我们如何协作",
    "steps.s1.title": "Discover",
    "steps.s1.desc": "对齐你的想法、目标与优先级。",
    "steps.s2.title": "Design",
    "steps.s2.desc": "设计清晰的页面/功能结构，让你更容易理解。",
    "steps.s3.title": "Build",
    "steps.s3.desc": "利用 AI 代理快速实现并验证。",
    "steps.s4.title": "Launch",
    "steps.s4.desc": "部署可用版本，并支持你上线运营。",

    "results.title": "结果",
    "results.r1.value": "3倍",
    "results.r1.desc": "更快完成初期 MVP",
    "results.r2.value": "40%",
    "results.r2.desc": "减少重复任务耗时",
    "results.r3.value": "2周",
    "results.r3.desc": "开始用户测试的平均周期",

    "faq.title": "常见问题",
    "faq.q1": "我几乎没有开发经验，可以开始吗？",
    "faq.a1": "可以。你只需要整理目标和想法，我们会一起梳理推进所需的结构与下一步。",
    "faq.q2": "费用如何计算？",
    "faq.a2": "根据项目范围与周期来确定。咨询后会给出清晰的报价区间。",
    "faq.q3": "需要准备哪些资料？",
    "faq.a3": "只要准备：问题定义、目标用户、以及最重要的 3 个功能即可开始。",
    "faq.q4": "上线后也提供维护吗？",
    "faq.a4": "是的。我们提供维护选项，包括改进路线图与运维自动化。",
    "faq.q5": "多久能看到最初的结果？",
    "faq.a5": "通常 1 周内给出设计草案，2 周内提供可运行的初期结果。",

    "contact.title": "现在开始，让你的想法更快变成产品。",
    "contact.subtitle": "与 DexterAI Studio 一起开启基于 AI 代理的构建。",
    "contact.form.label": "您的问题",
    "contact.form.placeholder": "在这里填写你的需求。（例如：MVP 范围、时间计划、参考资料）",
    "contact.form.hint": "提交后你的邮件客户端会打开，并把输入内容放入邮件正文中。",
    "contact.form.submit": "发送咨询",
    "contact.form.errorRequired": "请输入咨询内容。",
    "contact.form.mailSubject": "DexterAI Studio 咨询",
    "contact.form.mailBodyPrefix": "请查收以下咨询内容。\n\n[咨询内容]",
    "contact.form.mailBodySuffix": "— DexterAI Studio",

    "footer.brand": "DexterAI Studio",
    "footer.rights": "© 2026 DexterAI Studio. All rights reserved.",
  },
};

let currentStrings = STRINGS.ko;

function getInitialLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored && STRINGS[stored]) return stored;

  const navLang = (navigator.language || "").toLowerCase();
  if (navLang.startsWith("en")) return "en";
  if (navLang.startsWith("ja")) return "ja";
  if (navLang.startsWith("zh")) return "zh";
  return "ko";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) themeToggle.textContent = theme === "dark" ? "Dark" : "Light";
}

function applyMeta(strings) {
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", strings["meta.description"]);

  const title = document.querySelector("title");
  if (title) title.textContent = strings["meta.title"];

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", strings["meta.title"]);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", strings["meta.description"]);
}

function applyLanguage(lang) {
  const strings = STRINGS[lang] || STRINGS.ko;
  currentStrings = strings;

  const htmlLangMap = { ko: "ko", en: "en", ja: "ja", zh: "zh-CN" };
  document.documentElement.lang = htmlLangMap[lang] || "ko";

  applyMeta(strings);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = strings[key];
    if (value !== undefined) el.textContent = value;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const value = strings[key];
    if (value !== undefined) el.setAttribute("placeholder", value);
  });
}

// --- Theme init ---
const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialTheme = storedTheme || (prefersDark ? "dark" : "light");
setTheme(initialTheme);

const themeToggleBtn = document.getElementById("theme-toggle");
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setTheme(next);
  });
}

// --- Language init ---
const langSelect = document.getElementById("lang-select");
const initialLang = getInitialLang();
if (langSelect) {
  langSelect.value = initialLang;
  langSelect.addEventListener("change", (e) => {
    const next = e.target.value;
    localStorage.setItem(LANG_STORAGE_KEY, next);
    applyLanguage(next);
  });
}
applyLanguage(initialLang);

// --- Contact form init ---
const contactForm = document.getElementById("contact-form");
const contactMessage = document.getElementById("contact-message");
const contactError = document.getElementById("contact-form-error");

if (contactForm && contactMessage) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentStrings) currentStrings = STRINGS.ko;

    const message = contactMessage.value.trim();
    if (!message) {
      if (contactError) contactError.textContent = currentStrings["contact.form.errorRequired"] || "";
      contactMessage.focus();
      return;
    }

    if (contactError) contactError.textContent = "";

    const subject = encodeURIComponent(currentStrings["contact.form.mailSubject"] || "DexterAI Studio Inquiry");
    const bodyPrefix = currentStrings["contact.form.mailBodyPrefix"] || "";
    const bodySuffix = currentStrings["contact.form.mailBodySuffix"] || "";

    const body = `${bodyPrefix}\n\n${message}\n\n${bodySuffix}`;
    const href = `mailto:${EMAIL_TO}?subject=${subject}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  });
}

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const sections = [...document.querySelectorAll("main section[id]")];
const faqButtons = [...document.querySelectorAll(".faq-q")];
const revealItems = [...document.querySelectorAll(".reveal")];

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

faqButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    if (!item) return;
    const isOpen = item.classList.contains("open");
    item.classList.toggle("open");
    button.setAttribute("aria-expanded", String(!isOpen));
  });
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
      }
    });
  },
  { threshold: 0.2 }
);

revealItems.forEach((item) => sectionObserver.observe(item));

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute("id");
      if (!id) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("active", active);
      });
    });
  },
  { threshold: 0.5 }
);

sections.forEach((section) => navObserver.observe(section));
