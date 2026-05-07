/** API 주소/501/네트워크 등 “연결형” 오류인지 판별해 전용 안내 UI에 씁니다. */
export function isConnectionErrorMessage(message: string): boolean {
  return /501|API 서버가 아닌|네트워크 오류/i.test(message);
}
