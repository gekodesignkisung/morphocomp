/* ============================================================
   형태가 계산한다 · 인터랙션
   모든 데모는 물성을 "설명하기 위한" 시뮬레이션이다.
   ============================================================ */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const INK = '#111', INK2 = '#444', INK3 = '#888', LINE = '#d4d4d4';

  /* ---------- 사운드 (Web Audio 합성, 외부 파일 없음) ---------- */
  const Sound = (() => {
    let ctx = null, enabled = true;
    const get = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { enabled = false; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
    // 첫 사용자 입력에서 컨텍스트 생성 (자동재생 정책)
    window.addEventListener('pointerdown', get, { once: true });
    function tone({ freq = 440, to = null, dur = 0.08, type = 'sine', gain = 0.15, attack = 0.002 }) {
      if (!enabled) return; const c = get(); if (!c) return;
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    function noise({ dur = 0.05, gain = 0.08, hp = 2000 }) {
      if (!enabled) return; const c = get(); if (!c) return;
      const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
      const g = c.createGain(); g.gain.value = gain;
      src.connect(f).connect(g).connect(c.destination); src.start();
    }
    return {
      // 물방울이 컵에 떨어짐: 수위가 높을수록 음이 높아진다 (물 채우는 소리)
      drip(level) { tone({ freq: 700 + level * 25, to: 250 + level * 15, dur: 0.11, gain: 0.12 }); },
      tick() { noise({ dur: 0.02, gain: 0.03, hp: 4000 }); },
      click() { noise({ dur: 0.03, gain: 0.08, hp: 1500 }); tone({ freq: 180, dur: 0.05, type: 'square', gain: 0.05 }); },
      fail() { tone({ freq: 220, to: 110, dur: 0.18, type: 'sawtooth', gain: 0.06 }); },
      snap() { tone({ freq: 90, to: 50, dur: 0.14, type: 'square', gain: 0.12 }); noise({ dur: 0.04, gain: 0.1, hp: 800 }); },
      tone,
      toggle(on) { enabled = on; },
      get enabled() { return enabled; }
    };
  })();
  // 사운드 토글 버튼
  (function soundToggle() {
    const b = document.createElement('button'); b.className = 'sound-toggle'; b.type = 'button';
    const render = () => { b.textContent = Sound.enabled ? '사운드 켜짐' : '사운드 꺼짐'; b.classList.toggle('is-off', !Sound.enabled); };
    b.addEventListener('click', () => { Sound.toggle(!Sound.enabled); render(); });
    render(); document.body.appendChild(b);
  })();

  /* ---------- 메뉴 바가 상단에 붙었는지 감지 ---------- */
  (function stuck() {
    const bar = $('#topbar'); if (!bar) return;
    const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;height:1px;width:1px;';
    bar.parentNode.insertBefore(probe, bar); // 바 바로 위 1px 감시
    new IntersectionObserver(([en]) => bar.classList.toggle('is-stuck', !en.isIntersecting), { threshold: 0 }).observe(probe);
  })();

  /* ---------- 상단 고정 바 + 서브메뉴 ---------- */
  (function topnav() {
    const links = $$('.topbar__nav a'); if (!links.length) return;
    const SUB = {
      everyday: [['sec-funnel', '깔때기'], ['sec-bimetal', '바이메탈'], ['sec-usb', 'USB-C'], ['sec-shuttlecock', '셔틀콕'], ['sec-sorter', '동전 분류기'], ['sec-notched', '천공 카드'], ['sec-more', '지퍼·모래시계']],
      research: [['sec-biologic', 'bioLogic'], ['sec-pasta', 'Morphing Pasta'], ['sec-jacquard', 'Jacquard·Foldio']],
      theory: [['sec-morph', 'Morphological'], ['sec-reservoir', 'Reservoir'], ['sec-pi', 'Physical Intelligence'], ['sec-composites', 'Material Programming']],
      tradeoff: [['sec-picker', '판정 도구'], ['sec-table', '비교표']],
      sources: []
    };
    const subbar = $('#subbar'), subInner = $('#subbar-inner');
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    let curSection, lockUntil = 0;
    const nav = $('.topbar__nav');
    const setActive = a => {
      links.forEach(l => l.classList.remove('is-active'));
      if (a) a.classList.add('is-active');
      // 최상단(활성 섹션 없음)에서는 대메뉴를 가운데로
      if (nav) nav.classList.toggle('is-centered', !a);
    };
    const setSub = id => $$('a', subInner).forEach(a => a.classList.toggle('is-active', a.dataset.sub === id));
    const subIO = new IntersectionObserver(entries => {
      if (performance.now() < lockUntil) return;
      entries.forEach(en => { if (en.isIntersecting) setSub(en.target.id); });
    }, { rootMargin: '-100px 0px -60% 0px' });
    // 서브메뉴를 활성 대메뉴 항목 아래 중앙에 맞춘다.
    // 좁은 화면(가로 스크롤)에서는 브라우저 정렬에 맡긴다.
    function alignSub(section) {
      if (!section || subbar.hidden) return;
      if (window.innerWidth <= 700) { subInner.style.paddingLeft = ''; return; }
      const tab = map.get(section);
      const kids = $$('a', subInner); if (!kids.length) return;
      // 대메뉴 강조가 없는 최상단에서는 보정 없이 기본 위치
      if (!tab) { subInner.style.paddingLeft = ''; return; }

      // 기준값을 재기 전에 이전 보정을 지운다 (누적 방지)
      subInner.style.paddingLeft = '0px';

      const innerC = subInner.getBoundingClientRect();      // 실제 트랙(max-width 적용된 박스)
      const first = kids[0].getBoundingClientRect();
      const last = kids[kids.length - 1].getBoundingClientRect();
      const contentW = last.right - first.left;             // 링크 묶음의 실제 폭
      const tabC = tab.getBoundingClientRect();

      // 대메뉴 항목의 중심을 subInner 좌표계로
      const center = tabC.left + tabC.width / 2 - innerC.left;
      let pad = center - contentW / 2;

      // 트랙 안에 가둔다 (좌우 24px 여백 유지)
      const maxPad = innerC.width - contentW - 24;
      pad = Math.min(Math.max(pad, 24), Math.max(24, maxPad));
      subInner.style.paddingLeft = pad + 'px';
    }

    function renderSub(section) {
      if (section === curSection) return; curSection = section;
      const items = SUB[section] || [];
      subInner.innerHTML = items.map(([id, label]) => `<a href="#${id}" data-sub="${id}">${label}</a>`).join('');
      subbar.hidden = items.length === 0;
      $$('a', subInner).forEach(a => a.addEventListener('click', () => { setSub(a.dataset.sub); lockUntil = performance.now() + 900; }));
      subIO.disconnect(); items.forEach(([id]) => { const el = document.getElementById(id); if (el) subIO.observe(el); });
      alignSub(section);
    }
    window.addEventListener('resize', () => alignSub(curSection));
    links.forEach(a => a.addEventListener('click', () => { setActive(a); renderSub(a.getAttribute('href').slice(1)); lockUntil = performance.now() + 900; }));
    const io = new IntersectionObserver(entries => {
      if (performance.now() < lockUntil) return;
      entries.forEach(en => { if (en.isIntersecting) { setActive(map.get(en.target.id)); renderSub(en.target.id); } });
    }, { rootMargin: '-60px 0px -70% 0px' });
    map.forEach((a, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    // 최상단(마스트헤드)에서는 서브메뉴를 숨긴다 · 아직 어떤 섹션도 보고 있지 않으므로
    const mast = $('.masthead');
    if (mast) new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting && performance.now() >= lockUntil) { setActive(null); renderSub(null); }
    }), { rootMargin: '-60px 0px -70% 0px' }).observe(mast);
  })();

  /* ---------- 코드 / 재료 탭 ---------- */
  $$('.compare').forEach(box => {
    $$('.compare__tab', box).forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.compare__tab', box).forEach(t => t.classList.remove('is-active'));
        $$('.compare__panel', box).forEach(p => p.classList.remove('is-active'));
        tab.classList.add('is-active');
        $('#' + tab.dataset.target).classList.add('is-active');
      });
    });
  });

  /* ---------- 0. 깔때기 ---------- */
  (function funnel() {
    const cv = $('#funnel'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    // 깔때기 형태: 두 선분 (좌/우 벽) + 목
    const top = 120, neckY = 250, neckX = W / 2, neckW = 14;
    const leftWall = { x1: 80, y1: top, x2: neckX - neckW / 2, y2: neckY };
    const rightWall = { x1: W - 80, y1: top, x2: neckX + neckW / 2, y2: neckY };
    const GRAV = 0.12;   // 느리게 떨어져야 눈에 보인다
    const drops = [];
    let collected = 0, level = 0;
    // 캔버스가 화면 밖이면 소리도 애니메이션도 멈춘다
    let onScreen = true, running = false;

    function spawn(x, y, silent) {
      const r = 5;
      // x: 깔때기 입구 안으로만 (바깥을 누르면 가장 가까운 가장자리로)
      x = Math.max(leftWall.x1 + r + 2, Math.min(rightWall.x1 - r - 2, x));
      // y: 클릭한 높이 그대로. 단, 벽보다 아래를 눌렀으면 그 x 위치의 벽 바로 위에서 떨어뜨린다
      const wallYAt = (xx) => {
        const w = xx < neckX ? leftWall : rightWall;
        const t = (xx - w.x1) / (w.x2 - w.x1);
        return w.y1 + (w.y2 - w.y1) * Math.max(0, Math.min(1, t));
      };
      y = Math.min(y, wallYAt(x) - r - 2);
      drops.push({ x, y, vx: 0, vy: 0, r, silent });
      if (drops.length > 120) drops.shift();
    }
    function reflect(d, wall) {
      const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1;
      const len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len; // 법선
      const t = ((d.x - wall.x1) * dx + (d.y - wall.y1) * dy) / (len * len);
      if (t < 0 || t > 1) return;
      const px = wall.x1 + dx * t, py = wall.y1 + dy * t;
      const dist = (d.x - px) * nx + (d.y - py) * ny;
      const side = wall === leftWall ? -1 : 1; // 법선(nx,ny) 기준 깔때기 안쪽 방향
      if (dist * side < d.r) {
        if (!d.onWall) { d.onWall = true; if (!d.silent && onScreen) Sound.tick(); }
        // 벽 위로 올려놓고 법선 속도만 제거 → 접선 방향으로 미끄러진다
        d.x = px + nx * side * d.r; d.y = py + ny * side * d.r;
        const vn = d.vx * nx + d.vy * ny;
        if (vn * side < 0) { d.vx -= vn * nx; d.vy -= vn * ny; }
        d.vx *= 0.99; d.vy *= 0.99;
      }
    }
    function step() {
      ctx.clearRect(0, 0, W, H);
      // 깔때기
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(leftWall.x1, leftWall.y1); ctx.lineTo(leftWall.x2, leftWall.y2); ctx.lineTo(leftWall.x2, H - 40);
      ctx.moveTo(rightWall.x1, rightWall.y1); ctx.lineTo(rightWall.x2, rightWall.y2); ctx.lineTo(rightWall.x2, H - 40);
      ctx.stroke();
      // 컵: 천천히 빠져나가므로 계속 채울 수 있다
      level = Math.max(0, level - 0.04);
      ctx.strokeStyle = INK3; ctx.lineWidth = 2;
      ctx.strokeRect(neckX - 40, H - 40, 80, 30);
      const lvl = Math.min(28, level);
      ctx.fillStyle = INK; ctx.fillRect(neckX - 39, H - 11 - lvl, 78, lvl);
      // 라벨
      ctx.fillStyle = INK3; ctx.font = '16px monospace';
      ctx.fillText('input: 어디든 (클릭·드래그)', 24, 42);
      ctx.fillText('output: 한 곳 (' + collected + ')', neckX + 50, H - 18);
      // 방울
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.vy += GRAV; d.x += d.vx; d.y += d.vy;
        reflect(d, leftWall); reflect(d, rightWall);
        if (d.y > neckY && d.y < H - 40) { d.x += (neckX - d.x) * 0.5; d.vx = 0; }
        if (d.y > H - 40) { drops.splice(i, 1); collected++; level += 3; if (!d.silent && onScreen) Sound.drip(Math.min(28, level)); continue; }
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
      if (onScreen) requestAnimationFrame(step); else running = false;
    }
    function pos(e) {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    }
    let dragging = false, lastSpawn = 0;
    cv.addEventListener('pointerdown', e => { e.preventDefault(); dragging = true; const p = pos(e); spawn(p.x, p.y); lastSpawn = performance.now(); });
    cv.addEventListener('pointermove', e => {
      if (!dragging) return;
      const now = performance.now(); if (now - lastSpawn < 70) return; // 드래그 시 초당 ~14개
      lastSpawn = now; const p = pos(e); spawn(p.x, p.y);
    });
    window.addEventListener('pointerup', () => dragging = false);
    window.addEventListener('pointercancel', () => dragging = false);
    // 초기 시연: 천천히 8개
    let n = 0; const auto = setInterval(() => { spawn(100 + Math.random() * (W - 200), 20, true); if (++n >= 8) clearInterval(auto); }, 450);
    new IntersectionObserver(([en]) => {
      onScreen = en.isIntersecting;
      if (onScreen && !running) { running = true; requestAnimationFrame(step); }
    }, { threshold: 0 }).observe(cv);
    running = true; step();
  })();

  /* ---------- 1-1 바이메탈 ---------- */
  (function bimetal() {
    const slider = $('#bimetal-temp'); if (!slider) return;
    const out = $('#bimetal-out'), top = $('#bimetal-top'), bot = $('#bimetal-bot');
    const state = $('#bimetal-state'), pad = $('#bimetal-pad'), current = $('#bimetal-current');
    const heater = $('#bimetal-heater'), heaterLabel = $('#bimetal-heater-label');
    const mercury = $('#bimetal-mercury'), tlabel = $('#bimetal-tlabel');
    const badgeBox = $('#bimetal-badge-box'), badgeText = $('#bimetal-badge-text');
    const THRESH = 70, X0 = 44, X1 = 300, Y = 95; // 스트립 아래 가장자리 Y+7 = 102 → 접점 패드 상단(106-4)
    let wasOpen = null, lastTone = 0;
    const curve = (yBase, bend) => `M${X0} ${yBase} Q${(X0 + X1) / 2} ${yBase + bend * 0.1} ${X1} ${yBase - bend}`;
    function render(fromUser) {
      const t = +slider.value; out.value = t;
      // 70° 이하: 접점에 눌려 곧게 놓임. 70° 초과: 팽창 차이만큼 들려 올라가 접점에서 떨어짐
      const bend = Math.max(0, t - THRESH) * 1.4;
      top.setAttribute('d', curve(Y - 3.5, bend));
      bot.setAttribute('d', curve(Y + 3.5, bend));
      const open = t > THRESH;
      pad.setAttribute('fill', open ? '#9a9a9a' : INK);
      current.style.display = open ? 'none' : '';
      heater.setAttribute('stroke', open ? '#bbb' : INK);
      heaterLabel.textContent = open ? '히터 OFF' : '히터 ON';
      // 우상단 배지: ON = 검정 채움 + 흰 글자, OFF = 흰 바탕 + 검정 테두리
      badgeBox.setAttribute('fill', open ? '#fff' : INK);
      badgeText.setAttribute('fill', open ? INK : '#fff');
      badgeText.textContent = open ? 'OFF' : 'ON';
      state.textContent = open ? '접점 열림 → 전류 끊김 → 히터 OFF' : '접점 닫힘 → 전류 흐름 → 히터 ON';
      // 온도계: 0°→y 60, 100°→y 8
      const h = 8 + (60 - 8) * (1 - t / 100);
      mercury.setAttribute('y', h); mercury.setAttribute('height', 68 - h); tlabel.textContent = t + '°C';
      if (fromUser) {
        const now = performance.now();
        if (now - lastTone > 60) { lastTone = now; Sound.tone({ freq: 220 + t * 6, dur: 0.06, gain: 0.05 }); }
        if (wasOpen !== null && wasOpen !== open) Sound.click();
      }
      wasOpen = open;
    }
    slider.addEventListener('input', () => render(true)); render(false);
  })();

  /* ---------- 1-2 USB (단면 뷰: 회전 → 접근 → 연결/충돌) ---------- */
  (function usb() {
    const stats = { a: { ok: 0, fail: 0 }, c: { ok: 0, fail: 0 } };
    let busy = false;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    $$('[data-usb]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (busy) return; busy = true;
        const k = btn.dataset.usb;
        const plug = $(`#usb-${k}-plug`), body = $(`#usb-${k}-rot`), msg = $(`#usb-${k}-msg`);
        const mark = $(`#usb-${k}-mark`), markText = $(`#usb-${k}-marktext`);
        const box = btn.closest('.usb');
        const bump = ok => { stats[k][ok ? 'ok' : 'fail']++; $(`#usb-${k}-ok`).textContent = stats[k].ok; $(`#usb-${k}-fail`).textContent = stats[k].fail; };
        const move = async (x, ms) => { plug.style.transition = `transform ${ms}ms cubic-bezier(.3,.7,.4,1)`; plug.style.transform = `translateX(${x}px)`; await wait(ms + 30); };
        const rotate = async (deg, ms) => { body.style.transition = `transform ${ms}ms ease-in-out`; body.style.transform = `rotate(${deg}deg)`; await wait(ms + 30); };

        // 초기화
        mark.setAttribute('opacity', 0);
        plug.style.transition = 'none'; plug.style.transform = 'translateX(0)';
        body.style.transition = 'none'; body.style.transform = 'rotate(0deg)';
        await wait(30);

        // 1) 플러그를 랜덤 각도로 돌린다 (0° 또는 180°)
        const flipped = Math.random() < 0.5;
        msg.textContent = flipped ? '플러그를 180° 돌려 접근' : '플러그 그대로 접근';
        await rotate(flipped ? 180 : 0, flipped ? 500 : 200);

        // 2) 포트 위로 접근
        await move(110, 450);
        const ok = k === 'c' || !flipped;
        if (ok) {
          bump(true); markText.textContent = 'OK'; mark.setAttribute('opacity', 1);
          msg.textContent = k === 'c' ? '대칭이라 어느 각도든 맞물림' : '키가 서로 다른 칸 → 맞물림';
          Sound.click(); await wait(900);
        } else {
          // 3) 부딪힘 → 물러나서 180° 돌린 뒤 다시 꽂는다 (실제 USB-A 경험)
          bump(false); markText.textContent = 'X'; mark.setAttribute('opacity', 1);
          msg.textContent = '키가 같은 칸 → 부딪힘'; Sound.fail();
          box.classList.add('is-fail'); setTimeout(() => box.classList.remove('is-fail'), 350);
          await wait(600); mark.setAttribute('opacity', 0);
          await move(0, 300);
          msg.textContent = '뒤집어서 다시…'; await rotate(360, 500);
          await move(110, 450);
          bump(true); markText.textContent = 'OK'; mark.setAttribute('opacity', 1);
          msg.textContent = '돌린 뒤 맞물림 (사용자가 조건문을 실행함)'; Sound.click(); await wait(900);
        }
        mark.setAttribute('opacity', 0); await move(0, 350); busy = false;
      });
    });
  })();

  /* ---------- 1-3 셔틀콕 ---------- */
  (function shuttle() {
    const cv = $('#shuttle'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height;
    const uni = $('#shuttle-uniform');
    let s = { x: 60, y: H - 50, vx: 0, vy: 0, a: -Math.PI / 2, w: 0, flying: false };
    function hit() {
      s = { x: 60, y: H - 50, vx: 5 + Math.random() * 2, vy: -6 - Math.random() * 2,
            a: Math.random() * Math.PI * 2, w: (Math.random() - 0.5) * 0.6, flying: true };
    }
    $('#shuttle-hit').addEventListener('click', () => { hit(); Sound.click(); });
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke();
      if (s.flying) {
        s.vy += 0.18; s.vx *= 0.995; s.x += s.vx; s.y += s.vy;
        const vAng = Math.atan2(s.vy, s.vx);
        if (!uni.checked) {
          // 형태의 계산: 속도 방향과 코르크 방향의 차이가 복원 토크, 공기저항이 감쇠
          let diff = vAng - s.a; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          const speed = Math.hypot(s.vx, s.vy);
          s.w += diff * 0.02 * speed; s.w *= 0.88;
        }
        s.a += s.w;
        if (s.y > H - 40 || s.x > W + 20) s.flying = false;
      }
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(10, 0, 7, 0, Math.PI * 2); ctx.fill(); // 코르크 (앞)
      ctx.strokeStyle = uni.checked ? INK : INK3; ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-26, i * 6); ctx.stroke(); } // 깃털 (뒤)
      if (uni.checked) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-22, 0, 7, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = INK3; ctx.font = '14px monospace';
      ctx.fillText(uni.checked ? '균일 형태: 복원 토크 없음' : '비대칭 형태: 코르크가 앞으로 정렬', 12, 20);
      requestAnimationFrame(draw);
    }
    draw();
  })();

  /* ---------- 1-4 동전 분류기 ---------- */
  (function sorter() {
    const cv = $('#sorter'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height;
    // 레일: 왼쪽에서 오른쪽으로 살짝 내리막. 구멍(슬롯)은 작은 것부터.
    const railY = x => 70 + x * 0.06;
    const slots = [
      { x: 130, w: 22, label: '소' },
      { x: 230, w: 30, label: '중' },
      { x: 330, w: 40, label: '대' },
    ];
    const bins = slots.map(() => 0);
    const coins = [];
    const result = $('#sorter-result');
    const SIZES = [16, 26, 34]; // 동전은 3종류: 소·중·대
    function drop() {
      const d = SIZES[Math.floor(Math.random() * 3)];
      coins.push({ x: 18, d, y: railY(18) - d / 2, vy: 0, falling: false, slot: -1 });
      Sound.tick();
    }
    $('#sorter-drop').addEventListener('click', drop);
    $('#sorter-many').addEventListener('click', () => { let n = 0; const t = setInterval(() => { drop(); if (++n >= 10) clearInterval(t); }, 220); });
    $('#sorter-reset').addEventListener('click', () => { coins.length = 0; bins.fill(0); result.textContent = '동전을 넣어 보세요. 소·중·대 세 종류가 무작위로 나옵니다.'; });
    function step() {
      ctx.clearRect(0, 0, W, H);
      // 레일 (슬롯 구간은 끊김)
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath();
      let px = 8;
      slots.forEach(sl => { ctx.moveTo(px, railY(px)); ctx.lineTo(sl.x - sl.w / 2, railY(sl.x - sl.w / 2)); px = sl.x + sl.w / 2; });
      ctx.moveTo(px, railY(px)); ctx.lineTo(W - 8, railY(W - 8)); ctx.stroke();
      // 슬롯 폭 표시와 통
      ctx.font = '13px monospace'; ctx.textAlign = 'center';
      slots.forEach((sl, i) => {
        ctx.strokeStyle = INK3; ctx.lineWidth = 2;
        ctx.strokeRect(sl.x - 34, H - 74, 68, 60);
        ctx.fillStyle = INK3;
        ctx.fillText(`구멍 ${sl.w}px`, sl.x, railY(sl.x) + 22);
        ctx.fillText(`${sl.label} · ${bins[i]}개`, sl.x, H - 4);
        // 통에 쌓인 동전
        for (let k = 0; k < Math.min(bins[i], 12); k++) {
          ctx.fillStyle = INK2; ctx.beginPath();
          ctx.arc(sl.x - 20 + (k % 4) * 13, H - 22 - Math.floor(k / 4) * 13, 5.5, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.fillStyle = INK3; ctx.textAlign = 'left';
      ctx.fillText('구멍: 작은 순서 →', 10, 24);
      // 동전
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        if (!c.falling) {
          c.x += 1.6; c.y = railY(c.x) - c.d / 2;
          const sl = slots.findIndex(s2 => Math.abs(c.x - s2.x) < s2.w / 2 - 2 && c.d < s2.w);
          if (sl >= 0) { c.falling = true; c.slot = sl; c.x = slots[sl].x; Sound.tick(); }
          if (c.x > W - 12) { coins.splice(i, 1); continue; } // 어느 구멍보다 큰 동전은 끝으로
        } else {
          c.vy += 0.3; c.y += c.vy;
          if (c.y > H - 40) {
            bins[c.slot]++; coins.splice(i, 1);
            Sound.drip(bins[c.slot] * 2);
            result.textContent = `${slots[c.slot].label} 동전(지름 ${c.d}px)이 ${slots[c.slot].label} 통으로. 자기보다 큰 첫 구멍에서 떨어졌을 뿐입니다.`;
            continue;
          }
        }
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(c.x, c.y, c.d / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c.x, c.y, c.d / 6, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(step);
    }
    step();
  })();

  /* ---------- 1-5 가장자리 천공 카드 ---------- */
  (function notched() {
    const cv = $('#notched'); if (!cv) return;
    const ctx = cv.getContext('2d');

    const ATTRS = ['채식', '서울', '주말'];
    // 카드 12장 · 각 속성의 홈 여부(true = 잘려서 홈)
    const CARDS = [
      [1,1,0],[0,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,0],
      [0,1,0],[1,0,0],[1,1,1],[0,0,0],[1,0,1],[0,1,1],
    ].map((n, i) => ({ notch: n, id: i + 1, x: 0, y: 0, drop: 0, falls: false }));

    const on = [true, false, false];
    let lifted = false, t = 0, narrow = false;

    function layout() {
      narrow = window.innerWidth <= 700;
      cv.width = narrow ? 380 : 620;
      cv.height = narrow ? 340 : 300;
    }

    function matches(c) { return on.every((v, i) => !v || c.notch[i]); }

    function lift() {
      lifted = true; t = 0;
      CARDS.forEach(c => { c.falls = matches(c); c.drop = 0; });
      Sound.snap();
    }
    function reset() { lifted = false; t = 0; CARDS.forEach(c => { c.drop = 0; c.falls = false; }); }

    function draw() {
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      ctx.font = '12px monospace'; ctx.textAlign = 'left';

      const cols = 6, cw = narrow ? 54 : 88, ch = narrow ? 74 : 92;
      const gapX = narrow ? 8 : 12, gapY = narrow ? 14 : 20;
      const x0 = (W - (cols * cw + (cols - 1) * gapX)) / 2;
      const y0 = 44;

      // 막대: 켜진 속성 자리에 가로로 꽂힌다
      ctx.fillStyle = INK3;
      ctx.fillText('카드 ' + CARDS.length + '장 · 가장자리 구멍 3개 = 속성 3개', x0, 20);

      CARDS.forEach((c, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        c.x = x0 + col * (cw + gapX);
        const baseY = y0 + row * (ch + gapY);
        // 떨어지는 카드는 아래로, 걸린 카드는 막대에 매달려 살짝 위로
        if (lifted) {
          if (c.falls) c.drop = Math.min(c.drop + 2.2, 46);
          else c.drop = Math.max(c.drop - 0.6, -10);
        }
        c.y = baseY + c.drop;

        const fell = lifted && c.falls;
        ctx.fillStyle = fell ? '#fff' : 'var(--paper-2)';
        ctx.fillStyle = fell ? '#ffffff' : '#f2f2f2';
        ctx.strokeStyle = fell ? INK : LINE;
        ctx.lineWidth = fell ? 2 : 1;
        ctx.beginPath(); ctx.rect(c.x, c.y, cw, ch); ctx.fill(); ctx.stroke();

        // 가장자리 구멍 3개 (위쪽 변)
        c.notch.forEach((cut, k) => {
          const hx = c.x + (k + 1) * cw / 4, hy = c.y + 9;
          ctx.strokeStyle = on[k] ? INK : LINE;
          ctx.lineWidth = 1.2;
          if (cut) {
            // 홈: 가장자리까지 열린 U자
            ctx.beginPath();
            ctx.moveTo(hx - 4, c.y);
            ctx.lineTo(hx - 4, hy); ctx.arc(hx, hy, 4, Math.PI, 0, true); ctx.lineTo(hx + 4, c.y);
            ctx.stroke();
          } else {
            ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.stroke();
          }
        });

        ctx.fillStyle = fell ? INK : '#bbb';
        ctx.font = '11px monospace';
        ctx.fillText('#' + c.id, c.x + 6, c.y + ch - 8);
      });

      // 막대 (켜진 속성마다 한 줄)
      if (!narrow) {
        on.forEach((v, k) => {
          if (!v) return;
          const hx0 = x0 + (k + 1) * cw / 4;
          ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
          for (let row = 0; row < 2; row++) {
            const ry = y0 + row * (ch + gapY) + 9 + (lifted ? -10 : 0);
            ctx.beginPath();
            ctx.moveTo(x0 - 14, ry);
            ctx.lineTo(x0 + cols * cw + (cols - 1) * gapX + 14, ry);
            ctx.stroke();
          }
        });
      }

      // 결과
      const hit = CARDS.filter(matches).length;
      const labels = ATTRS.filter((_, i) => on[i]);
      ctx.font = '13px monospace'; ctx.textAlign = 'left';
      ctx.fillStyle = lifted ? INK : INK2;
      const q = labels.length ? labels.join(' AND ') : '(조건 없음)';
      ctx.fillText(lifted
        ? q + ' → ' + hit + '장이 떨어졌습니다'
        : q + ' · 막대를 꽂았습니다. 들어올려 보세요.', 14, H - 14);

      if (lifted) t++;
      requestAnimationFrame(draw);
    }

    $$('[data-notch]').forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.notch;
      on[k] = !on[k];
      b.classList.toggle('btn--ghost', !on[k]);
      reset(); Sound.click();
    }));
    const liftBtn = $('[data-notch-lift]');
    if (liftBtn) liftBtn.addEventListener('click', () => {
      if (lifted) { reset(); liftBtn.textContent = '막대 들어올리기'; Sound.click(); }
      else { lift(); liftBtn.textContent = '카드 되돌리기'; }
    });

    layout();
    window.addEventListener('resize', () => layout());
    draw();
  })();

  /* ---------- 2-1 bioLogic ---------- */
  (function biologic() {
    const svg = $('#biologic'); if (!svg) return;
    const slider = $('#bio-hum'), out = $('#bio-out'), status = $('#bio-status'), runBtn = $('#bio-run');
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    el('text', { x: 284, y: 18, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'monospace', fill: '#888' }).textContent = '운동복 등판 · bioLogic 프린트';
    // 티셔츠 그룹 (오른쪽으로 이동)
    const shirt = el('g', { transform: 'translate(34,0)' });
    // 티셔츠 등판: 목선·어깨·소매가 있는 실루엣
    el('path', {
      d: 'M212 42 Q250 58 288 42 L332 54 L354 98 L320 112 L314 284 L186 284 L180 112 L146 98 L168 54 Z',
      fill: '#fff', stroke: '#111', 'stroke-width': 2, 'stroke-linejoin': 'round'
    }, shirt);
    // 소매 절개선
    el('path', { d: 'M180 112 L186 96 M320 112 L314 96', stroke: '#ccc', 'stroke-width': 1.5, fill: 'none' }, shirt);
    // 코팅 두께 3단계: 명도 차이를 크게
    const SHADES = ['#9a9a9a', '#555', '#111'];
    const TIER_LABEL = ['얇은 코팅 · 일찍 열림', '중간 코팅', '두꺼운 코팅 · 늦게 열림'];
    const TIER_THRESH = [42, 60, 78];
    // 범례 (왼쪽 여백)
    TIER_LABEL.forEach((label, i) => {
      el('circle', { cx: 28, cy: 128 + i * 30, r: 8, fill: SHADES[i] });
      el('text', { x: 44, y: 132 + i * 30, 'font-size': 11, 'font-family': 'monospace', fill: '#888' }).textContent = label;
    });
    // 원형 플랩(비늘): 등 중앙은 얇은 코팅, 가장자리로 갈수록 두꺼움
    const flaps = [];
    const rows = [[218, 250, 282], [234, 266], [218, 250, 282], [234, 266], [218, 250, 282]];
    rows.forEach((xs, r) => xs.forEach(cx => {
      const cy = 136 + r * 34, R = 13;
      const centerDist = Math.hypot(cx - 250, cy - 200) / 60; // 0(중앙)~1.5(가장자리)
      const tier = centerDist < 0.55 ? 0 : (centerDist < 1.05 ? 1 : 2);
      const jitter = (r * 7 + cx) % 8;
      const thresh = TIER_THRESH[tier] + jitter;
      // 통기구멍 (플랩 아래)
      el('circle', { cx, cy, r: R, fill: '#efefef', stroke: '#ccc' }, shirt);
      const steam = el('g', { opacity: 0 }, shirt);
      el('path', { d: `M${cx - 5} ${cy + 4} q3 -8 0 -15`, stroke: '#999', 'stroke-width': 1.5, fill: 'none' }, steam);
      el('path', { d: `M${cx + 5} ${cy + 6} q3 -8 0 -15`, stroke: '#999', 'stroke-width': 1.5, fill: 'none' }, steam);
      // 플랩: 닫히면 원, 열리면 위로 들리며 납작해짐 (비늘이 들리는 모습)
      const flap = el('ellipse', { cx, cy, rx: R, ry: R, fill: SHADES[tier] }, shirt);
      flaps.push({ cx, cy, R, thresh, flap, steam, open: false });
    }));
    let hum = +slider.value;
    function render() {
      const h = hum; slider.value = Math.round(h); out.value = Math.round(h);
      let openCount = 0;
      flaps.forEach(f => {
        const k = Math.max(0, Math.min(1, (h - f.thresh) / 16));
        const isOpen = k > 0.15;
        if (isOpen !== f.open) { f.open = isOpen; Sound.tone({ freq: isOpen ? 520 + f.thresh * 3 : 260, dur: 0.07, gain: 0.05 }); }
        if (isOpen) openCount++;
        f.flap.setAttribute('cy', f.cy - k * 11);       // 위로 들리고
        f.flap.setAttribute('ry', f.R * (1 - k * 0.62)); // 납작해진다
        f.steam.setAttribute('opacity', k > 0.3 ? Math.min(1, k) : 0);
      });
      status.textContent = `플랩 ${openCount}/${flaps.length} 열림 ${openCount ? '· 땀이 증발하며 식는 중' : '· 보온 중'}`;
    }
    slider.addEventListener('input', () => { hum = +slider.value; render(); }); render();
    let running = false, raf;
    function tick() {
      hum += running ? 0.35 : -0.45;
      hum = Math.max(30, Math.min(95, hum));
      render();
      if (running || hum > 30) raf = requestAnimationFrame(tick); else raf = null;
    }
    runBtn.addEventListener('click', () => {
      running = !running;
      runBtn.textContent = running ? '멈추기' : '달리기 시작';
      Sound.click();
      if (!raf) raf = requestAnimationFrame(tick);
    });
  })();

  /* ---------- 2-2 파스타 ---------- */
  (function pasta() {
    const svg = $('#pasta'); if (!svg) return;
    const time = $('#pasta-time');
    const timeOut = $('#pasta-time-out');
    let gapVal = 2;
    const NS = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', '0 0 400 270');
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
    const label = mk('text', { x: 12, y: 22, class: 'svg-label' });
    // 단면 다이어그램 (우상단): 홈이 파인 면과 매끈한 면
    const inset = mk('g', {});
    const insetLabel = mk('text', { x: 342, y: 22, 'text-anchor': 'middle', 'font-size': 10, 'font-family': 'monospace', fill: '#888' });
    insetLabel.textContent = '단면: 아래쪽에 홈';
    const body = mk('path', { fill: '#fff', stroke: '#111', 'stroke-width': 2 });
    const grooves = mk('g', {});
    let lastTone = 0, wasTube = false;
    function render(fromUser) {
      const g = gapVal, t = +time.value;
      timeOut.value = t.toFixed(1);
      const stiffness = [0, 1.5, 1.05, 0.62][g];    // 홈이 촘촘할수록 더 말림
      const curl = Math.min(1, t / 8) * stiffness;
      // 단면 다이어그램: 홈 간격 반영
      inset.innerHTML = '';
      const ix = 300, iy = 32, iw = 84, ih = 16, step = [0, 7, 12, 20][g];
      const sec = document.createElementNS(NS, 'path');
      let d = `M${ix} ${iy} L${ix} ${iy + ih}`;
      for (let x = 0; x < iw; x += step) d += ` L${ix + x} ${iy + ih} l3 -6 l3 6`;
      d += ` L${ix + iw} ${iy + ih} L${ix + iw} ${iy} Z`;
      sec.setAttribute('d', d); sec.setAttribute('fill', '#e6e6e6'); sec.setAttribute('stroke', '#111'); sec.setAttribute('stroke-width', 1.5);
      inset.appendChild(sec);
      // 스트립: 홈 있는 면(위)이 덜 팽창 → 홈 쪽으로 말려 튜브가 된다 (아래로 말리게 그림)
      const N = 44, L = 250, thick = 13;
      let x = 78, y = 84, ang = 0; const pts = [];
      for (let i = 0; i <= N; i++) {
        pts.push({ x, y, ang });
        ang += curl * 0.062; x += Math.cos(ang) * (L / N); y += Math.sin(ang) * (L / N);
      }
      const top = pts.map(p => `${p.x + Math.sin(p.ang) * thick / 2},${p.y - Math.cos(p.ang) * thick / 2}`);
      const bot = pts.map(p => `${p.x - Math.sin(p.ang) * thick / 2},${p.y + Math.cos(p.ang) * thick / 2}`).reverse();
      body.setAttribute('d', 'M' + top.join(' L') + ' L' + bot.join(' L') + ' Z');
      grooves.innerHTML = '';
      const gs = [0, 2, 4, 7][g];
      for (let i = 1; i < N; i += gs) {
        const p = pts[i];
        const l = document.createElementNS(NS, 'line');
        // 홈은 곡선 안쪽(덜 팽창하는 면)
        l.setAttribute('x1', p.x - Math.sin(p.ang) * thick / 2); l.setAttribute('y1', p.y + Math.cos(p.ang) * thick / 2);
        l.setAttribute('x2', p.x - Math.sin(p.ang) * thick / 6); l.setAttribute('y2', p.y + Math.cos(p.ang) * thick / 6);
        l.setAttribute('stroke', '#111'); l.setAttribute('stroke-width', 2);
        grooves.appendChild(l);
      }
      const isTube = curl > 1.2;
      label.textContent = t === 0
        ? '건조 상태: 평평 · 형태는 이미 홈에 저장됨'
        : (isTube ? '홈 쪽으로 말려 튜브가 됨' : '홈 있는 면이 덜 팽창 → 홈 쪽으로 휨') + ` (곡률 ${curl.toFixed(2)})`;
      if (fromUser) {
        // 말릴수록 높아지는 삐걱임 (연속 조작 시 70ms 간격)
        const now = performance.now();
        if (now - lastTone > 70) { lastTone = now; Sound.tone({ freq: 180 + curl * 260, to: 160 + curl * 240, dur: 0.07, type: 'triangle', gain: 0.05 }); }
        if (isTube !== wasTube) Sound.click(); // 튜브로 완성/풀림 순간
      }
      wasTube = isTube;
    }
    // 홈 간격: 선택 메뉴. 간격이 좁을수록 촘촘한 틱이 빠르게 (홈 밀도가 소리 리듬으로)
    const gapChips = $$('[data-gap]');
    gapChips.forEach(b => b.addEventListener('click', () => {
      gapVal = +b.dataset.gap;
      gapChips.forEach(c => c.classList.toggle('is-active', c === b));
      render(true);
      const n = [0, 6, 4, 2][gapVal], iv = [0, 45, 90, 180][gapVal];
      for (let i = 0; i < n; i++) setTimeout(() => Sound.tone({ freq: 900, dur: 0.025, gain: 0.05 }), i * iv);
    }));
    time.addEventListener('input', () => render(true)); render(false);
  })();

  /* ---------- 2-3 직조 격자 (재킷 소매 스와이프) ---------- */
  (function weave() {
    const box = $('#weave'); if (!box) return;
    const track = $('#jacq-track'), action = $('#jacq-action');
    const N = 16; const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const d = document.createElement('div'); d.className = 'weave__cell';
      if ((r + c) % 2) d.classList.add('alt'); // 직조 교차: 한 칸 걸러 씨실이 위
      if (r % 3 === 1) d.classList.add('is-cond-h'); // 전도성 씨실
      if (c % 3 === 1) d.classList.add('is-cond-v'); // 전도성 날실
      box.appendChild(d); cells.push(d);
    }
    let trackNo = 3, playing = false;
    let down = false, startCol = null, lastCol = null, lastTick = 0;
    // 실제 재생: 트랙마다 다른 멜로디 루프 (Web Audio 합성, 파일 없음)
    const SCALE = [220, 247, 277, 330, 370, 440, 494, 554, 660]; // A 펜타토닉 확장
    const SONGS = [
      { steps: [0, 2, 4, 2, 5, 4, 2, 0], bpm: 96, type: 'sine' },
      { steps: [4, 4, 7, 5, 4, 2, 0, 2], bpm: 120, type: 'triangle' },
      { steps: [0, 3, 5, 8, 5, 3, 5, 0], bpm: 84, type: 'sine' },
      { steps: [7, 5, 4, 5, 7, 8, 7, 4], bpm: 132, type: 'triangle' },
      { steps: [0, 4, 0, 5, 0, 4, 2, 2], bpm: 108, type: 'square' },
    ];
    let seqTimer = null, stepIdx = 0;
    function startSong() {
      stopSong();
      const song = SONGS[(trackNo - 1) % SONGS.length];
      stepIdx = 0;
      seqTimer = setInterval(() => {
        const n = song.steps[stepIdx % song.steps.length];
        Sound.tone({ freq: SCALE[n], dur: 0.16, type: song.type, gain: 0.06 });
        if (stepIdx % 2 === 0) Sound.tone({ freq: SCALE[n] / 2, dur: 0.2, type: 'sine', gain: 0.03 }); // 베이스
        stepIdx++;
      }, 60000 / song.bpm / 2);
    }
    function stopSong() { if (seqTimer) { clearInterval(seqTimer); seqTimer = null; } }
    function syncSong() { playing ? startSong() : stopSong(); }
    function cellAt(e) {
      const el2 = document.elementFromPoint(e.clientX, e.clientY);
      if (!el2 || !el2.classList.contains('weave__cell')) return null;
      const i = cells.indexOf(el2); return { r: Math.floor(i / N), c: i % N };
    }
    function glow(rc) {
      cells.forEach((cell, j) => {
        const rr = Math.floor(j / N), cc = j % N;
        const cond = cell.classList.contains('is-cond-h') || cell.classList.contains('is-cond-v');
        const dist = Math.hypot(rr - rc.r, cc - rc.c);
        cell.classList.toggle('is-press-center', dist < 1.2);        // 손가락이 닿은 자리
        cell.classList.toggle('is-press', dist >= 1.2 && dist < 2.6); // 눌려 들어간 주변
        cell.classList.toggle('is-hot', cond && dist < 2.2);
        cell.classList.toggle('is-warm', cond && dist >= 2.2 && dist < 4);
      });
    }
    function clearGlow() { cells.forEach(c => c.classList.remove('is-hot', 'is-warm', 'is-press', 'is-press-center')); }
    function setAction(text) { action.textContent = text; }
    box.addEventListener('pointerdown', e => {
      e.preventDefault(); down = true;
      const rc = cellAt(e); if (rc) { startCol = lastCol = rc.c; glow(rc); }
    });
    box.addEventListener('pointermove', e => {
      if (!down) return;
      const rc = cellAt(e); if (!rc) return;
      glow(rc);
      if (rc.c !== lastCol) {
        lastCol = rc.c;
        const now = performance.now();
        if (now - lastTick > 50) { lastTick = now; Sound.tick(); } // 교차점을 지날 때마다 틱
      }
    });
    window.addEventListener('pointerup', () => {
      if (!down) return; down = false; clearGlow();
      if (startCol === null || lastCol === null) return;
      const dx = lastCol - startCol;
      if (dx >= 3) { trackNo++; playing = true; setAction('→ 다음 곡'); Sound.click(); }
      else if (dx <= -3) { trackNo = Math.max(1, trackNo - 1); playing = true; setAction('← 이전 곡'); Sound.click(); }
      else { playing = !playing; setAction(playing ? '▶ 재생' : '⏸ 일시정지'); Sound.click(); }
      syncSong();
      track.textContent = `Track ${trackNo}` + (playing ? ' ♪' : ' (정지)');
      startCol = lastCol = null;
    });
  })();

  /* ---------- 3-0 수동 보행기 (컴퍼스 보행) ---------- */
  (function walker() {
    const cv = $('#walker'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height;
    const slider = $('#walker-slope'), out = $('#walker-out');
    const L = 54, A = 0.38; // 다리 길이, 반보폭 각
    // 상태: 디딤발 위치(경사면 위 x), 걸음 진행도 t(0..1)
    let footX = 90, t = 0, fallen = 0;
    function reset() { footX = 90; t = 0; fallen = 0; }
    $('#walker-reset').addEventListener('click', () => { reset(); Sound.click(); });
    slider.addEventListener('input', () => { if (fallen) reset(); });
    function slopeY(px, s) { return 96 + (px - 20) * Math.tan(s); }
    function draw() {
      const deg = +slider.value; out.value = deg;
      const s = deg * Math.PI / 180;
      const v = { x: Math.cos(s), y: Math.sin(s) };   // 경사 내리막 방향
      const n = { x: Math.sin(s), y: -Math.cos(s) };  // 경사면 위쪽 법선
      const u = th => ({ x: n.x * Math.cos(th) + v.x * Math.sin(th), y: n.y * Math.cos(th) + v.y * Math.sin(th) });
      ctx.clearRect(0, 0, W, H);
      // 경사면 + 빗금
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(20, slopeY(20, s)); ctx.lineTo(W - 20, slopeY(W - 20, s)); ctx.stroke();
      ctx.strokeStyle = '#d4d4d4'; ctx.lineWidth = 1;
      for (let hx = 30; hx < W - 20; hx += 26) {
        const hy = slopeY(hx, s);
        ctx.beginPath(); ctx.moveTo(hx, hy + 1); ctx.lineTo(hx - 8, hy + 9); ctx.stroke();
      }
      const canWalk = deg >= 3 && deg <= 11 && !fallen;
      const stopped = deg < 3;
      if (canWalk) {
        // 도립 진자: 중력을 따라 내려가는 구간(몸이 발 앞으로 넘어간 뒤)이 더 빠르다
        const base = 0.012 + (deg - 3) * 0.004;
        t += base * (0.6 + 1.1 * t);
        if (t >= 1) { // 착지: 역할 교대
          const land = { x: footX + L * u(-A + 2 * A).x * 0 } ; // placeholder
          footX = footX + 2 * L * Math.sin(A); // 경사면을 따라 한 보폭 전진
          t = 0; Sound.tick();
          if (footX > W - 110) footX = 90;
        }
      } else if (deg > 11 && !fallen) { fallen = 0.01; Sound.snap(); }
      if (fallen > 0 && fallen < 1) fallen = Math.min(1, fallen + 0.05);

      // 기하: 디딤다리 각 -A→+A, 흔드는 다리 +A→-A (무릎 굽힘으로 지면 스침)
      const thSt = -A + 2 * A * t;
      const thSw = A - 2 * A * t;
      const foot = { x: footX, y: slopeY(footX, s) };
      const hip = { x: foot.x + L * u(thSt).x, y: foot.y + L * u(thSt).y };
      // 흔드는 다리: 허벅지+정강이, 중간에 무릎이 굽어 발끝이 들린다
      const bend = 0.9 * Math.sin(Math.PI * t); // 스윙 중반에 최대 굽힘
      const half = L / 2;
      const thThigh = thSw + bend * 0.55;
      const knee = { x: hip.x - half * u(thThigh).x * -1, y: 0 }; // 계산 아래에서
      const kx = hip.x + (-half) * u(thThigh).x * -1; // not used
      const kneeP = { x: hip.x - half * u(thThigh).x, y: hip.y - half * u(thThigh).y };
      // foot는 hip에서 아래로: leg 방향은 -u(θ)
      const knee2 = { x: hip.x - half * u(thThigh).x * 1, y: hip.y - half * u(thThigh).y * 1 };
      const thShin = thSw - bend * 0.35;
      const swFoot = { x: knee2.x - half * u(thShin).x, y: knee2.y - half * u(thShin).y };

      ctx.save();
      if (fallen) { ctx.translate(foot.x, foot.y); ctx.rotate(fallen * Math.PI / 2.1); ctx.translate(-foot.x, -foot.y); }
      // 흔드는 다리 (회색, 무릎 관절)
      ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = INK3;
      ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(knee2.x, knee2.y); ctx.lineTo(swFoot.x, swFoot.y); ctx.stroke();
      ctx.fillStyle = INK3; ctx.beginPath(); ctx.arc(knee2.x, knee2.y, 3.5, 0, Math.PI * 2); ctx.fill();
      // 흔드는 발
      ctx.strokeStyle = INK3; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(swFoot.x - 4 * v.x, swFoot.y - 4 * v.y); ctx.lineTo(swFoot.x + 8 * v.x, swFoot.y + 8 * v.y); ctx.stroke();
      // 디딤다리 (검정, 곧게 편 채 회전)
      ctx.strokeStyle = INK; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(hip.x, hip.y); ctx.stroke();
      // 디딤발
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(foot.x - 5 * v.x, foot.y - 5 * v.y); ctx.lineTo(foot.x + 9 * v.x, foot.y + 9 * v.y); ctx.stroke();
      // 몸통(질량)
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(hip.x, hip.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.fillStyle = INK3; ctx.font = '14px monospace';
      ctx.fillText(fallen ? '너무 가파름 → 넘어짐 (다시 세우기)' : stopped ? '경사 부족 → 에너지가 모자라 멈춤' : `걷는 중 · 제어기 없음 (경사 ${deg}°)`, 24, 24);
      requestAnimationFrame(draw);
    }
    draw();
  })();

  /* ---------- 3. Physical Reservoir Computing ---------- */
  (function reservoir() {
    const cv = $('#reservoir'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height;

    // 스프링-질량 그물 (비선형 스프링). 학습되지 않는 "재료".
    const N = 9, nodes = [], springs = [];
    for (let i = 0; i < N; i++) nodes.push({ x0: 40 + i * 25, y0: 74, x: 44 + i * 30, y: 74, vx: 0, vy: 0, k: 0.10 + (i % 3) * 0.05 });
    for (let i = 0; i < N - 1; i++) springs.push([i, i + 1]);
    for (let i = 0; i < N - 2; i += 2) springs.push([i, i + 2]);
    // 초기 형상 그대로를 쉬는 길이로 삼는다 (안 그러면 대각 스프링이 발산)
    springs.forEach(sp => { const a = nodes[sp[0]], b = nodes[sp[1]]; sp[2] = Math.hypot(a.x0 - b.x0, a.y0 - b.y0); });

    const readouts = [2, 5, 8];            // 재료에서 읽는 세 지점
    const LEN = 240;                       // 그래프에 보관하는 프레임 수
    const inHist = [], resHist = readouts.map(() => []), outHist = [], tgtHist = [];
    let w = [0, 0, 0], bias = 0, trained = false, task = 'delay', t = 0, fit = 0;

    // 입력: 불규칙한 네모 파형 (기억이 필요하도록 결정적 의사난수)
    let sq = 1, nextFlip = 40;
    function inputAt() {
      if (t >= nextFlip) { sq = -sq; nextFlip = t + 30 + Math.floor(Math.abs(Math.sin(t * 12.9898) * 43758.5453) % 45); }
      return sq * 26;
    }

    // 목표 출력: 입력에 즉각 대응되지 않는(=기억·적분이 필요한) 신호
    const TASKS = {
      delay:  { label: '입력의 과거 (18프레임 전)',  fn: h => h.length > 18 ? h[h.length - 19] : 0 },
      smooth: { label: '부드럽게 누적 (이동평균)',   fn: h => { const n = Math.min(40, h.length); let s = 0; for (let i = 0; i < n; i++) s += h[h.length - 1 - i]; return n ? s / n * 2.2 : 0; } },
      wave:   { label: '느린 파동 (입력과 무관한 리듬)', fn: () => Math.sin(t * 0.035) * 24 },
    };

    function physics() {
      t++;
      const input = inputAt();
      nodes[0].y = 74 + input; nodes[0].x = 44; nodes[0].vy = 0;
      for (let i = 1; i < N; i++) {
        const n = nodes[i]; let fx = 0, fy = 0;
        springs.forEach(sp => {
          const a = sp[0], b = sp[1];
          if (a !== i && b !== i) return;
          const o = nodes[a === i ? b : a];
          const dx = o.x - n.x, dy = o.y - n.y, d = Math.hypot(dx, dy) || 1;
          const rest = sp[2];
          let e = d - rest;
          if (e > 40) e = 40; else if (e < -40) e = -40;      // 발산 방지
          const f = n.k * e + 0.00035 * e * e * e;            // 비선형 (부드러운 포화)
          fx += f * dx / d; fy += f * dy / d;
        });
        fy += (n.y0 - n.y) * 0.0015; fx += (n.x0 - n.x) * 0.02;
        n.vx = (n.vx + fx) * 0.965; n.vy = (n.vy + fy) * 0.965;
        if (n.vx > 6) n.vx = 6; else if (n.vx < -6) n.vx = -6;
        if (n.vy > 6) n.vy = 6; else if (n.vy < -6) n.vy = -6;
        n.x += n.vx; n.y += n.vy;
        if (n.x < n.x0 - 24) n.x = n.x0 - 24; else if (n.x > n.x0 + 24) n.x = n.x0 + 24;
        if (n.y < n.y0 - 52) n.y = n.y0 - 52; else if (n.y > n.y0 + 52) n.y = n.y0 + 52;
      }
      const feat = readouts.map(r => nodes[r].y - 74);
      inHist.push(input); if (inHist.length > LEN) inHist.shift();
      feat.forEach((v, i) => { resHist[i].push(v); if (resHist[i].length > LEN) resHist[i].shift(); });
      tgtHist.push(TASKS[task].fn(inHist)); if (tgtHist.length > LEN) tgtHist.shift();
      outHist.push(trained ? bias + w[0] * feat[0] + w[1] * feat[1] + w[2] * feat[2] : null);
      if (outHist.length > LEN) outHist.shift();
    }

    // 선형 회귀 1회: 세 흔들림을 섞는 비율만 구한다 (재료는 건드리지 않음)
    function train() {
      const n = Math.min(resHist[0].length, tgtHist.length);
      if (n < 60) return;
      const X = [], y = [];
      for (let i = 0; i < n; i++) { X.push([resHist[0][i], resHist[1][i], resHist[2][i], 1]); y.push(tgtHist[i]); }
      const A = [], b = [];
      for (let r = 0; r < 4; r++) {
        A.push([0, 0, 0, 0]); b.push(0);
        for (let c = 0; c < 4; c++) { let s = 0; for (let i = 0; i < n; i++) s += X[i][r] * X[i][c]; A[r][c] = s + (r === c ? 1e-3 * n : 0); }
        let s = 0; for (let i = 0; i < n; i++) s += X[i][r] * y[i]; b[r] = s;
      }
      for (let c = 0; c < 4; c++) {
        let p = c; for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        const tmpA = A[c]; A[c] = A[p]; A[p] = tmpA;
        const tmpB = b[c]; b[c] = b[p]; b[p] = tmpB;
        if (Math.abs(A[c][c]) < 1e-9) continue;
        for (let r = 0; r < 4; r++) {
          if (r === c) continue;
          const f = A[r][c] / A[c][c];
          for (let k = c; k < 4; k++) A[r][k] -= f * A[c][k];
          b[r] -= f * b[c];
        }
      }
      const sol = [0, 1, 2, 3].map(i => Math.abs(A[i][i]) < 1e-9 ? 0 : b[i] / A[i][i]);
      w = [sol[0], sol[1], sol[2]]; bias = sol[3]; trained = true;
      let se = 0, sv = 0; const my = y.reduce((a, c) => a + c, 0) / n;
      for (let i = 0; i < n; i++) { const p = bias + w[0] * X[i][0] + w[1] * X[i][1] + w[2] * X[i][2]; se += (p - y[i]) * (p - y[i]); sv += (y[i] - my) * (y[i] - my); }
      fit = sv ? Math.max(0, 1 - se / sv) : 0;
      Sound.snap();
    }

    // ---- 그리기 ----
    // 좁은 화면에서는 위아래로 쌓는다 (가로 2단이면 글씨가 뭉갬)
    let narrow = false, GX = 300, GW = 296, LX = 14, LW = 244;
    function layout() {
      narrow = window.innerWidth <= 700;
      if (narrow) {
        cv.width = 380; cv.height = 560;
        GX = 16; GW = 348; LX = 16; LW = 348;
      } else {
        cv.width = 620; cv.height = 300;
        GX = 300; GW = 296; LX = 14; LW = 244;
      }
    }
    layout();
    window.addEventListener('resize', layout);
    function plot(arr, y0, scale, col, dash, width) {
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = width || 1.5; ctx.setLineDash(dash || []);
      ctx.beginPath(); let started = false;
      arr.forEach((v, i) => {
        if (v === null || v === undefined) { started = false; return; }
        let vv = v * scale;
        if (vv > 30) vv = 30; else if (vv < -30) vv = -30;
        const x = GX + i / LEN * GW, y = y0 - vv;
        if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
      });
      ctx.stroke(); ctx.restore();
    }

    function draw() {
      const W = cv.width, H = cv.height;
      const RY = narrow ? 300 : 0;              // 좁을 때 오른쪽 열을 아래로 내린다
      ctx.clearRect(0, 0, W, H);
      ctx.font = '12px monospace'; ctx.textAlign = 'left';

      // --- 왼쪽: 재료 ---
      ctx.fillStyle = INK3; ctx.fillText('재료 · 학습되지 않습니다', 14, 20);
      ctx.strokeStyle = INK3; ctx.lineWidth = 1;
      springs.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke(); });
      nodes.forEach((n, i) => {
        const isR = readouts.indexOf(i);
        ctx.fillStyle = i === 0 ? INK : (isR >= 0 ? INK2 : '#c4c4c4');
        ctx.beginPath(); ctx.arc(n.x, n.y, i === 0 ? 8 : (isR >= 0 ? 6 : 4), 0, Math.PI * 2); ctx.fill();
        if (isR >= 0) { ctx.fillStyle = INK3; ctx.fillText('r' + (isR + 1), n.x - 7, n.y + 22); }
      });
      ctx.fillStyle = INK; ctx.fillText('입력', 16, 112);

      // 세 읽기 지점의 서로 다른 응답
      ctx.fillStyle = INK3; ctx.fillText('읽기 지점 3곳 · 같은 입력, 다른 흔들림', LX, narrow ? 156 : 150);
      resHist.forEach((h, i) => {
        const y0 = (narrow ? 196 : 180) + i * 36;
        ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(LX, y0); ctx.lineTo(LX + LW, y0); ctx.stroke();
        ctx.save(); ctx.strokeStyle = INK2; ctx.lineWidth = 1.3; ctx.beginPath();
        h.forEach((v, j) => { const x = LX + j / LEN * LW, y = y0 - v * 0.7; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke(); ctx.restore();
        ctx.fillStyle = INK3; ctx.fillText('r' + (i + 1), LX + LW + 6, y0 + 4);
      });

      // --- 오른쪽: 과제 ---
      ctx.fillStyle = INK3; ctx.fillText('입력', GX, 20 + RY);
      ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(GX, 42 + RY); ctx.lineTo(GX + GW, 42 + RY); ctx.stroke();
      plot(inHist, 42 + RY, 0.5, INK, [], 1.5);

      ctx.fillStyle = INK3; ctx.fillText('목표: ' + TASKS[task].label, GX, 84 + RY);
      ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(GX, 124 + RY); ctx.lineTo(GX + GW, 124 + RY); ctx.stroke();
      plot(tgtHist, 124 + RY, 0.8, INK3, [4, 3], 2);
      if (trained) plot(outHist, 124 + RY, 0.8, INK, [], 2);

      ctx.fillStyle = INK3; ctx.fillText('- - - 목표', GX, 166 + RY);
      if (trained) { ctx.fillStyle = INK; ctx.fillText('—— 재료로 만든 출력', GX + 74, 166 + RY); }

      ctx.fillStyle = INK3; ctx.fillText('학습되는 것은 이 숫자 4개뿐', GX, 196 + RY);
      if (trained) {
        ctx.fillStyle = INK; ctx.font = '13px monospace';
        const f2 = v => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
        const f1 = v => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1);
        ctx.fillText('출력 = ' + f2(w[0]) + '·r1 ' + (w[1] < 0 ? '- ' : '+ ') + f2(Math.abs(w[1])) + '·r2', GX, 214 + RY);
        ctx.fillText('        ' + (w[2] < 0 ? '- ' : '+ ') + f2(Math.abs(w[2])) + '·r3 ' + (bias < 0 ? '- ' : '+ ') + f1(Math.abs(bias)), GX, 232 + RY);
        ctx.font = '12px monospace'; ctx.fillStyle = INK2;
        ctx.fillText('목표와 ' + Math.round(fit * 100) + '% 일치', GX, 258 + RY);
        ctx.fillStyle = INK3;
        ctx.fillText('재료는 그대로입니다.', GX, 278 + RY);
      } else {
        ctx.fillStyle = INK2; ctx.font = '13px monospace';
        ctx.fillText('아직 학습 전 · 목표만 보입니다', GX, 216 + RY);
        ctx.font = '12px monospace'; ctx.fillStyle = INK3;
        ctx.fillText('입력을 늘리거나 줄여서는 이 목표를', GX, 242 + RY);
        ctx.fillText('만들 수 없습니다. [재료로 만들어보기]를 누르세요.', GX, 260 + RY);
      }
    }

    let paused = false;
    function loop() { if (!paused) { physics(); draw(); } requestAnimationFrame(loop); }

    function resetAll() {
      trained = false; fit = 0; t = 0; sq = 1; nextFlip = 40;
      inHist.length = 0; tgtHist.length = 0; outHist.length = 0;
      resHist.forEach(h => h.length = 0);
      nodes.forEach(n => { n.x = n.x0; n.y = n.y0; n.vx = 0; n.vy = 0; });
    }

    $$('[data-res-task]').forEach(b => b.addEventListener('click', () => {
      task = b.dataset.resTask;
      resetAll();
      $$('[data-res-task]').forEach(o => o.classList.toggle('btn--ghost', o !== b));
      Sound.click();
    }));
    const trainBtn = $('[data-res-train]');
    if (trainBtn) trainBtn.addEventListener('click', () => { paused = false; pauseBtn && (pauseBtn.textContent = '일시정지'); train(); });
    const pauseBtn = $('[data-res-pause]');
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      paused = !paused; pauseBtn.textContent = paused ? '다시 재생' : '일시정지'; Sound.click();
    });
    const resetBtn = $('[data-res-reset]');
    if (resetBtn) resetBtn.addEventListener('click', () => { resetAll(); paused = false; if (pauseBtn) pauseBtn.textContent = '일시정지'; Sound.click(); });

    loop();
  })();

  /* ---------- 3-2. Physical Intelligence (크기 → 탑재 가능 부품) ---------- */
  (function physIntel() {
    const cv = $('#pi'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const slider = $('#pi-size'), out = $('#pi-out');

    // 부품: 물리적으로 더 줄일 수 없는 최소 크기(mm)
    const PARTS = [
      { n: '배터리', min: 8, why: '전기화학 셀의 최소 부피' },
      { n: '마이크로컨트롤러', min: 4, why: '다이 + 패키지 + 배선' },
      { n: '무선 통신', min: 6, why: '안테나는 파장에 묶임' },
      { n: '전자 센서', min: 2, why: '증폭 회로가 함께 필요' },
      { n: '모터 / 액추에이터', min: 3, why: '자석·코일의 최소 크기' },
    ];
    // 재료로 구현되는 기능: 크기와 무관하게 살아남는다
    const MAT = [
      { n: '형태로 하는 감지', why: '휘어짐 자체가 신호' },
      { n: '재질로 하는 구동', why: '수축·팽창하는 고분자' },
      { n: '구조로 하는 제어', why: '형상이 반응을 결정' },
    ];

    let narrow = false, size = 50;
    function layout() {
      narrow = window.innerWidth <= 700;
      if (narrow) { cv.width = 380; cv.height = 440; } else { cv.width = 620; cv.height = 260; }
    }

    function draw() {
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      ctx.font = '12px monospace'; ctx.textAlign = 'left';

      // --- 로봇 몸통 ---
      const half = narrow ? 62 : 92;
      const cx = narrow ? W / 2 : 110, cy = narrow ? half + 28 : 128;
      const px = 3 + (half - 6) * (Math.log10(size) - Math.log10(0.3)) / (Math.log10(100) - Math.log10(0.3));
      ctx.fillStyle = INK3; ctx.fillText('로봇 몸통', cx - half, cy - half - 10);
      ctx.strokeStyle = LINE; ctx.lineWidth = 1;
      ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, px), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK2; ctx.textAlign = 'center';
      ctx.fillText((size >= 10 ? size.toFixed(0) : size.toFixed(1)) + ' mm', cx, cy + half + 18);
      ctx.textAlign = 'left';

      // --- 부품 목록 ---
      const X = narrow ? 16 : 240;
      const WCOL = narrow ? 150 : 132;
      let y = narrow ? cy + half + 46 : 22;
      let dropped = 0;

      ctx.fillStyle = INK3; ctx.fillText('전자 부품 · 계산 지능(CI)', X, y); y += 20;
      PARTS.forEach(p => {
        const fits = size >= p.min;
        if (!fits) dropped++;
        ctx.strokeStyle = fits ? INK : LINE; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(X, y - 10, 12, 12); ctx.stroke();
        if (fits) { ctx.fillStyle = INK; ctx.fillRect(X + 3, y - 7, 6, 6); }
        ctx.fillStyle = fits ? INK : '#c2c2c2';
        ctx.fillText(p.n, X + 20, y);
        ctx.fillStyle = fits ? INK3 : '#c8c8c8';
        ctx.fillText(fits ? '≥ ' + p.min + 'mm' : '탑재 불가', X + WCOL, y);
        if (!fits) { ctx.strokeStyle = '#c8c8c8'; ctx.beginPath(); ctx.moveTo(X + 20, y - 4); ctx.lineTo(X + WCOL - 8, y - 4); ctx.stroke(); }
        y += 21;
      });

      y += 12;
      ctx.fillStyle = INK3; ctx.fillText('재료가 맡는 기능 · 물리 지능(PI)', X, y); y += 20;
      MAT.forEach(m => {
        ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(X, y - 10, 12, 12); ctx.stroke();
        ctx.fillStyle = INK; ctx.fillRect(X + 3, y - 7, 6, 6);
        ctx.fillStyle = INK; ctx.fillText(m.n, X + 20, y);
        ctx.fillStyle = INK3; ctx.fillText(m.why, X + WCOL, y);
        y += 21;
      });

      // --- 판정 ---
      const brainGone = size < 4;
      ctx.font = '13px monospace';
      ctx.fillStyle = brainGone ? INK : INK2;
      const msg = dropped === 0 ? '모든 부품이 들어갑니다 · 뇌를 실을 수 있습니다'
        : brainGone ? '뇌가 빠졌습니다 · 남은 지능은 몸의 형태뿐입니다'
        : '부품 ' + dropped + '개가 빠졌습니다';
      ctx.fillText(msg, 16, H - 10);
    }

    function update() {
      size = parseFloat(slider.value);
      out.textContent = size >= 10 ? size.toFixed(0) : size.toFixed(1);
      draw();
    }
    slider.addEventListener('input', update);
    window.addEventListener('resize', () => { layout(); draw(); });
    layout(); update();
  })();

  /* ---------- 3-3. Computational Composites ---------- */
  (function composites() {
    const box = $('#comp'); if (!box) return;
    const res = $('#comp-result'), mp = $('#comp-mp');
    const on = { code: false, mat: false };
    let prop = null;

    const HALF = {
      none: ['아직 아무것도 없습니다', '둘 다 꺼져 있습니다.'],
      code: ['앱이 하나 더 생겼습니다', '온도는 알지만, 확인하려면 화면을 꺼내 봐야 합니다 · 방 안에 있는 물건이 되지 못합니다.'],
      mat:  ['그냥 물건입니다', '만질 수 있지만 온도를 모릅니다 · 어제와 오늘이 똑같습니다.'],
    };
    // 같은 연산 · 다른 물성 = 다른 물건
    const PROPS = {
      color: { n: '색', obj: '온도에 따라 색이 변하는 벽면',
               good: '방에 들어서는 순간 <b>안 보고도 읽힙니다</b>. 시선을 뺏지 않습니다.',
               bad: '어두우면 읽을 수 없고, 정확한 숫자는 알 수 없습니다.' },
      shape: { n: '형태', obj: '더우면 오므라드는 조명 갓',
               good: '멀리서도 알아보고, <b>공간의 분위기 자체가 정보</b>가 됩니다.',
               bad: '천천히 움직여서 급한 변화는 놓칩니다.' },
      stiff: { n: '단단함', obj: '추우면 뻣뻣해지는 손잡이',
               good: '손이 닿는 순간 알게 됩니다 · <b>보지 않고 촉각으로</b> 읽힙니다.',
               bad: '만져야만 알 수 있어서, 지나가면서는 모릅니다.' },
    };

    function render() {
      const both = on.code && on.mat;
      const k = both ? 'both' : on.code ? 'code' : on.mat ? 'mat' : 'none';
      box.classList.toggle('is-both', both);
      mp.hidden = !both;

      if (!both) {
        prop = null;
        $$('[data-prop]', box).forEach(b => b.classList.add('btn--ghost'));
        const [h, b] = HALF[k];
        res.innerHTML = '<b>' + h + '</b><span>' + b + '</span>';
        return;
      }
      if (!prop) {
        res.innerHTML = '<b>Computational Composite가 되었습니다</b>'
          + '<span>연산이 물건의 <b>속성으로</b> 나타납니다. 이제 남은 질문은 하나 · '
          + '어떤 물성으로 표현할지입니다. 아래에서 골라보세요.</span>';
        return;
      }
      const p = PROPS[prop];
      res.innerHTML = '<b>' + p.obj + '</b>'
        + '<span class="comp__good">' + p.good + '</span>'
        + '<span class="comp__bad">다만 · ' + p.bad + '</span>'
        + '<span class="comp__note">연산은 바꾸지 않았습니다. <b>물성만 바꿨는데 다른 물건</b>이 됩니다 · 이 선택이 Material Programming입니다.</span>';
    }

    $$('[data-comp]', box).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.comp;
      on[k] = !on[k];
      b.classList.toggle('is-on', on[k]);
      b.setAttribute('aria-pressed', String(on[k]));
      Sound.click(); render();
    }));
    $$('[data-prop]', box).forEach(b => b.addEventListener('click', () => {
      prop = b.dataset.prop;
      $$('[data-prop]', box).forEach(o => o.classList.toggle('btn--ghost', o !== b));
      Sound.click(); render();
    }));
    render();
  })();

  /* ---------- 4. 트레이드오프 ---------- */
  (function tradeoff() {
    const funcs = $('#tradeoff-funcs'); if (!funcs) return;
    const FUNCS = [
      { n: '타이머 / 알림', hint: '모래시계, 태엽, 향(香)시계' },
      { n: '온도 조절', hint: '바이메탈, 왁스 서모스탯' },
      { n: '입력 유효성 검사', hint: 'USB-C, 열쇠홈, 레고' },
      { n: '필터 / 검색', hint: '가장자리 천공 카드' },
      { n: '상태 표시', hint: '무음 스위치, 열변색 잉크' },
      { n: '충격 감지', hint: '잉크 캡슐(ShockWatch)' },
      { n: '원격 동기화', hint: '·' },
      { n: '개인화 추천', hint: '·' },
    ];
    // mat > 0 : 재료 쪽으로 / mat < 0 : 소프트웨어 쪽으로
    const CRIT = [
      { k: 'always', n: '항상 켜져 있어야 한다', mat: +1, why: '재료는 대기전력이 0입니다' },
      { k: 'nopower', n: '전원을 쓸 수 없다', mat: +2, why: '전자장치는 아예 후보에서 빠집니다' },
      { k: 'tactile', n: '안 보고도 상태를 알아야 한다', mat: +1, why: '형태는 손으로 읽힙니다' },
      { k: 'analog', n: '입력→출력이 연속 변환이다', mat: +1, why: '물리 법칙이 곧 변환 함수입니다' },
      { k: 'rulechange', n: '규칙이 자주 바뀐다', mat: -2, why: '한번 굳은 형태는 업데이트가 안 됩니다' },
      { k: 'remote', n: '다른 장소·사람과 상태를 공유한다', mat: -2, why: '재료는 그 자리를 못 벗어납니다' },
      { k: 'combinatorial', n: '조건이 여러 개 조합된다', mat: -1, why: '경우의 수만큼 구조가 복잡해집니다' },
      { k: 'history', n: '과거 기록을 남겨야 한다', mat: -1, why: '재료의 기억은 용량이 아주 작습니다' },
    ];
    let func = FUNCS[0]; const on = new Set();
    FUNCS.forEach((f, i) => {
      const b = document.createElement('button'); b.className = 'chip' + (i === 0 ? ' is-active' : ''); b.textContent = f.n;
      b.addEventListener('click', () => { $$('.chip', funcs).forEach(c => c.classList.remove('is-active')); b.classList.add('is-active'); func = f; render(); });
      funcs.appendChild(b);
    });
    const critBox = $('#tradeoff-criteria');
    CRIT.forEach(c => {
      const l = document.createElement('label'); l.className = 'crit' + (c.mat > 0 ? ' crit--mat' : ' crit--sw');
      l.title = c.why;
      const tag = (c.mat > 0 ? '재료 +' : '소프트 +') + Math.abs(c.mat);
      l.innerHTML = '<input type="checkbox"><span class="crit__n">' + c.n + '</span><span class="crit__w">' + tag + '</span>';
      l.querySelector('input').addEventListener('change', e => { e.target.checked ? on.add(c.k) : on.delete(c.k); l.classList.toggle('is-on', e.target.checked); render(); });
      critBox.appendChild(l);
    });
    const verdict = $('#tradeoff-verdict');
    function render() {
      const picked = CRIT.filter(c => on.has(c.k));
      const score = picked.reduce((s, c) => s + c.mat, 0);
      const matSum = picked.filter(c => c.mat > 0).reduce((s, c) => s + c.mat, 0);
      const swSum = picked.filter(c => c.mat < 0).reduce((s, c) => s - c.mat, 0);
      const clamped = Math.max(5, Math.min(95, Math.round(50 + score * 10)));

      let head, msg;
      if (!picked.length) { head = '조건을 켜보세요'; msg = '조건마다 붙은 숫자만큼 게이지가 좌우로 움직입니다.'; }
      else if (score >= 2) { head = '재료로 내려보낼 만합니다'; msg = '센서·MCU를 빼고 형태·재질이 그 일을 맡게 하세요.'; }
      else if (score <= -2) { head = '소프트웨어에 남겨두세요'; msg = '대신 그 아래 계층(입력 검증, 상태 표시)만 재료로 내려보낼 수 있는지 보세요.'; }
      else { head = '경계 지점입니다'; msg = '하이브리드 · 재료가 1차 반응을 하고 소프트웨어가 예외만 다루는 구조가 어울립니다.'; }

      // 게이지가 뭘 뜻하는지: 위치가 아니라 "확신의 정도"를 읽는다
      const dist = Math.abs(score);
      let reading;
      if (!picked.length) {
        reading = '지금은 한가운데입니다 · 아직 근거가 없으니 어느 쪽도 아닙니다.';
      } else if (dist === 0) {
        reading = '가운데에 멈췄습니다 · 양쪽 근거가 <b>팽팽하게 맞선다</b>는 뜻입니다. 한쪽을 고르기보다 기능을 더 잘게 쪼개 보세요.';
      } else if (dist === 1) {
        reading = '가운데에서 조금 벗어났습니다 · <b>약하게 기울었을 뿐</b>이라 조건 하나만 바뀌어도 뒤집힙니다.';
      } else if (dist <= 3) {
        reading = '한쪽으로 뚜렷하게 기울었습니다 · <b>이 방향으로 시도해 볼 근거가 충분</b>합니다.';
      } else {
        reading = '끝까지 밀렸습니다 · <b>반대쪽은 사실상 후보가 아닙니다.</b>';
      }

      // 근거: 어떤 조건이 어느 쪽으로 얼마나 밀었는지
      const rows = picked.length
        ? '<ul class="reasons">' + picked
            .slice().sort((a, b) => b.mat - a.mat)
            .map(c => '<li class="' + (c.mat > 0 ? 'is-mat' : 'is-sw') + '"><b>' + (c.mat > 0 ? '→ 재료' : '← 소프트') + ' ' + Math.abs(c.mat) + '</b> ' + c.n + ' <span class="muted">· ' + c.why + '</span></li>')
            .join('') + '</ul>'
        : '';

      const tally = picked.length
        ? '<p class="tally"><span>재료 ' + matSum + '</span> vs <span>소프트웨어 ' + swSum + '</span> → 합계 ' + (score > 0 ? '+' : '') + score + '</p>'
        : '';

      verdict.innerHTML = '<strong>' + func.n + '</strong><p class="muted">물성 사례: ' + func.hint + '</p>'
        + '<p class="bar-legend">게이지는 <b>어느 쪽이 맞는지</b>(좌우)와 <b>얼마나 확실한지</b>(가운데에서 멀어진 정도)를 함께 보여줍니다.</p>'
        + '<div class="bar"><span class="bar__mid"></span><i style="width:' + clamped + '%"></i></div>'
        + '<div class="bar-label"><span>← 코드로 짜는 게 낫다</span><span>가운데 = 팽팽함</span><span>형태·재질로 만드는 게 낫다 →</span></div>'
        + tally
        + '<p class="bar-reading">' + reading + '</p>'
        + '<p class="verdict__head">' + head + '</p><p>' + msg + '</p>'
        + rows;
    }
    render();
  })();

  /* ---------- 이미지 크레딧 ---------- */
  fetch('img/credits.json').then(r => r.json()).then(c => {
    const ul = $('#credits-list'); if (!ul) return;
    Object.values(c).forEach(v => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${v.page}" target="_blank" rel="noopener">${v.title.replace(/^File:/, '')}</a> · ${v.artist || '작자 미상'}, ${v.license}`;
      ul.appendChild(li);
    });
  }).catch(() => {});
})();
