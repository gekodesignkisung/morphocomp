# Morphocomp · 형태가 계산한다

디자인 스터디를 위한 인터랙티브 설명 페이지.
형태·재질·구조가 소프트웨어를 대신하는 사례를 직접 만져보며 이해한다.

- 일상의 사례: 깔때기, 바이메탈 온도조절기, USB-A→USB-C, 셔틀콕, 동전 분류기, 가장자리 천공 카드, 지퍼·모래시계
- 연구 사례: bioLogic, Morphing Pasta·Thermorph, Project Jacquard·Foldio
- 이론: Morphological Computation, Physical Reservoir Computing, Physical Intelligence, Computational Composites·Material Programming
- 판정 도구: 어떤 계층의 계산을 재료로 내려보낼지 + 재료/소프트웨어 비교표

## 실행

빌드 없음. 정적 HTML/CSS/JS.

**바로 보기 → https://gekodesignkisung.github.io/morphocomp/**

## 구조

- `index.html` 본문·데모 마크업
- `style.css` 모노톤 스타일
- `script.js` 데모 인터랙션 + Web Audio 합성 사운드
- `img/` 이미지와 `credits.json`(저작자·라이선스)

`index.html`이 `script.js?v=NN`으로 스크립트를 부른다. JS를 고치면 이 숫자를 올려야
GitHub Pages·브라우저 캐시가 새 파일을 받는다.

## 데모에 대해

대부분은 설명용 시뮬레이션이다. 다만 Physical Reservoir Computing 데모의 학습은
실제 선형 회귀(정규방정식 + 릿지)로 계산하며, 화면에 표시되는 가중치와 일치도는
그 계산 결과다.

## 이미지 라이선스

대부분 Wikimedia Commons의 자유 라이선스(CC0 / Public domain / CC BY / CC BY-SA).
연구 프로젝트 사진 2건은 비상업 조건이다 — bioLogic(CC BY-NC-ND 3.0),
Morphing Pasta 논문 그림(CC BY-NC 4.0). 각 캡션과 출처 섹션에 저작자·라이선스를 표기했다.
