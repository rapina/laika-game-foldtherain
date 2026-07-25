# PRODUCTION LOG / 2026-07-26 / 비를 접는 밤

## 콘셉트 잠금

- 질문: 제한된 빗물을 어디로 접어 보낼 것인가?
- 핵심 입력: 빈 공간 드래그로 둑 생성, 둑 탭으로 펼치기.
- 시스템 반응: 실시간 빗물이 지붕과 접힌 선을 따라 나뉘고 화분을 차례로 깨운다.
- 재료: 남색 종이, 먹선, 은빛 물, 도자기 화분.
- 시각 매체: Canvas 2D 절차 드로잉.
- 대표 색: 짙은 남색, 은색, 산호, 민트.
- 세계: 비 오는 밤의 종이 도시.
- 마지막 장면: 여덟 밤의 정원이 한꺼번에 빛난다.
- 한 판 길이: 밤당 약 18초, 8개 밤.
- 제외: 생명, 재화, 광고 보상, 외부 이미지 자산.

## 제작

- 문서와 매니페스트를 코드보다 먼저 잠갔다.
- Canvas 2D 절차 드로잉, 실시간 빗방울, 접는 둑, 화분/굴뚝 상태 전이와 8개 밤을 구현했다.
- 한국어와 영어가 같은 조작·진행·결과 정보를 표시한다.
- 외부 이미지와 오디오 없이 저장소 글꼴과 WebAudio 합성만 사용했다.

## 검증

- `npm ci`: 잠금 파일 그대로 1901개 패키지 설치. npm audit 요약은 48 vulnerabilities(critical 4, high 24, moderate 5, low 15). 자동 수정이나 버전 변경은 하지 않았다. Sonatype 조회는 인증 토큰 부재로 결과를 받지 못했다.
- `npm test`: 3개 파일, 25개 테스트 통과. 이 중 게임별 테스트는 밤당 72방울, 건물 교차 선 거절, 네 번째 선의 최장수 선 펼침, 필요 수량에서 개화하고 이후 통과하는 화분 전이를 확인한다.
- `npm run build`: TypeScript 및 Vite 프로덕션 빌드 성공. Capacitor core의 동적/정적 import 중복 경고만 있었고 빌드 오류는 없었다.
- `npm run viewport`: 360×800, 390×844, 430×932, 900×760에서 standalone/portal 형상의 균일 비율, DPR backing store, 프레임 경계, 페이지 넘침과 콘솔 오류를 확인해 모두 통과했다. 360×800의 한국어·영어 결과 화면도 standalone/portal에서 모두 통과했다. 증거는 `verification/viewport-result.json`과 캡처에 저장했다.
- Chromium 실제 포인터 시나리오: `/autoplay.html?lang=ko`의 빈 공간을 (80,320)→(300,390)으로 드래그해 debug state의 `folds`가 0→1로 바뀌고 page/console error가 없음을 확인했다.
- `test -s dist/index.html` 및 매니페스트의 필수 Galmuri 글꼴 3종 확인: 모두 존재하며 비어 있지 않다.
- `SMOKE_MODE=deployment-only npm run smoke`: mounted=true, consoleErrors=[], pageErrors=[]로 통과. `smoke-result.json` sourceHash는 `63b5560836ab4740727550f33c6cb34fe571bbd8b825320e7274b56e340fb60f`.
- 검증 종료 뒤 포트 4183/4187/4191의 dev/viewport 프로세스가 남지 않았음을 확인했다.

## 결과

- 상태: creator-complete
- 게임 잠금: 2026-07-26, sourceHash `8027f0ca810e2db6f41d97e78cac53239c5106eeb9c38bd2bc600ea4d9aa202b`
- 알려진 문제: 기존 잠금 의존성 트리의 npm audit 취약점 48건은 미조치. 실제 8개 밤 전체의 사람 손 플레이 난이도와 WebAudio 음색은 자동 검증하지 않았다.

## 설계 일치 보정 / 2026-07-26

- 여덟째 밤의 공식 필요 물을 GDD 표와 같은 9로 결정했다. 런타임은 명시적 배열 `[5, 5, 6, 6, 7, 8, 8, 9]`를 사용한다.
- 점수는 화분 개화당 100점과 성공한 밤의 미사용 접는 선 슬롯당 20점을 누적하며, 플레이 HUD 오른쪽 위에 항상 표시한다.
- 최종 정원은 셸의 자동 ranking 전환과 동적 React key로 언마운트하지 않는다. 메인 셸 Chromium 검증에서 완료 후 1.2초 동안 `over=true`와 Canvas가 유지되고, 최종 장면 탭 뒤 `over=false`, `night=1`로 재시작되는 것을 확인했다. 같은 실행에서 실제 드래그가 `folds` 0→1로 바뀌고 오류가 없었다.
- `npm test`: 3개 파일, 27개 테스트 통과. 밤별 필요량과 접는 선 여유 점수 테스트를 추가했다.
- `npm run build`: 프로덕션 빌드 성공. 기존 Capacitor core chunk 경고 외 오류 없음.
- `npm run viewport`: 모든 standalone/portal 기하 조합과 한·영 결과 화면 통과. `verification/viewport-result.json`을 새 sourceHash로 갱신했다.
- `SMOKE_MODE=deployment-only npm run smoke`: mounted=true, consoleErrors=[], pageErrors=[]; `smoke-result.json` 갱신.
- `npm run csp`: stylesheet, layout, CSP violation, 오류, 필수 자산 검사를 모두 통과했다.
