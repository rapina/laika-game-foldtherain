# Game Art & Audio Provenance

- 날짜: 2026-07-26
- 게임: `foldtherain`

## 게임 아트

- 시각 매체: Canvas 2D 절차 드로잉.
- 원본: 외부 이미지, 모델, 셰이더, 참고 작품을 사용하지 않음.
- 제작 방식: 제작자가 코드로 건물, 지붕, 구름, 비, 화분, 꽃, 종이 결을 직접 구성.
- 후가공: Canvas의 반투명 레이어, 그라디언트, 블렌딩으로 은빛 물과 접힘 광영을 표현.
- 사용 위치: 게임 전체와 타이틀/결과 장면.

## 게임 사운드

- 원본: 외부 오디오를 사용하지 않음. 템플릿의 `public/audio/*.mp3`는 게임 재생에 사용하지 않음.
- 합성 방식: 첫 포인터 입력 이후 WebAudio oscillator, filtered noise, gain envelope로 비·종이 마찰·도자기 물소리·글로켄슈필을 실시간 합성.
- 사용 위치: 강우 배경, 선 생성/제거, 화분 급수와 개화.

## 글꼴

- Galmuri 폰트는 저장소에 포함된 `OFL-GALMURI.md` 조건 아래 UI에 사용.

## 공개 제작자 일러스트

- 게임 잠금 뒤 `laika-base-v1`을 직접 참조해 라이카가 검은 종이에 빗물 둑을 접는 장면을 OpenAI 내장 `image_gen`으로 생성했다.
- 원본은 `art/source/laika-foldtherain.png`, 재현용 지시는 `art/prompts/laika-foldtherain.md`, 해시와 검수 결과는 `art/provenance/laika-foldtherain.json`에 기록했다.
- 웹 릴리스에는 640px와 1280px JPEG 파생본만 사용한다. 얼굴 무늬, 귀, 하네스, 주황 연결구, 네 발 골격, 생성 문자 부재와 모바일 크롭을 확인했다.
