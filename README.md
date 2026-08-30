# Morphocomp · 형태가 계산한다

디자인 스터디 "인터페이스는 화면과 센서에서 끝나는가"를 위한 인터랙티브 설명 페이지.
형태·재질·구조가 소프트웨어를 대신하는 사례를 직접 만져보며 이해한다.

- 일상의 사례: 깔때기, 바이메탈, USB-C, 셔틀콕·수동 보행기, 가장자리 천공 카드
- 연구 사례: bioLogic, Morphing Pasta·Thermorph, Jacquard·Foldio, Radical Atoms·4D Printing
- 이론: Morphological Computation, Physical Reservoir Computing, Mechanical Logic, Physical Intelligence, Material Programming
- 판정 도구: 어떤 계층의 계산을 재료로 내려보낼지

## 실행

빌드 없음. 정적 HTML/CSS/JS.

```
python -m http.server 4080
```

http://localhost:4080 (이미지 크레딧 목록이 fetch라 서버가 필요)

## 구조

- `index.html` 본문·데모 마크업
- `style.css` 모노톤 스타일
- `script.js` 데모 인터랙션 + Web Audio 합성 사운드
- `img/` Wikimedia Commons 자유 라이선스 이미지, `credits.json`에 저작자·라이선스

## 이미지 라이선스

모든 사진은 CC0 / Public domain / CC BY / CC BY-SA. 각 캡션과 출처 섹션에 표기.
