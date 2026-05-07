/**
 * OpenAI 임베딩은 서버(`api/*`, `server/index.ts`)에서만 호출합니다.
 * 브라우저에는 API 키를 두지 않고 `ragService`로 백엔드 엔드포인트만 사용합니다.
 */

export const OPENAI_USAGE_NOTE = "client-never-calls-openai-directly";
