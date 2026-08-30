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
      everyday: [['sec-bimetal', '바이메탈'], ['sec-usb', 'USB-C'], ['sec-shuttlecock', '셔틀콕·보행기'], ['sec-notched', '천공 카드'], ['sec-more', '지퍼·모래시계·깔때기']],
      research: [['sec-biologic', 'bioLogic'], ['sec-pasta', 'Morphing Pasta'], ['sec-jacquard', 'Jacquard·Foldio'], ['sec-radical', 'Radical Atoms·4D']],
      theory: [['sec-morph', 'Morphological'], ['sec-reservoir', 'Reservoir'], ['sec-logic', 'Mechanical Logic'], ['sec-pi', 'Physical Intelligence'], ['sec-composites', 'Material Programming']],
      tradeoff: [['sec-picker', '판정 도구'], ['sec-table', '비교표']],
      sources: []
    };
    const subbar = $('#subbar'), subInner = $('#subbar-inner');
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    let curSection, lockUntil = 0;
    const setActive = a => { links.forEach(l => l.classList.remove('is-active')); if (a) a.classList.add('is-active'); };
    const setSub = id => $$('a', subInner).forEach(a => a.classList.toggle('is-active', a.dataset.sub === id));
    const subIO = new IntersectionObserver(entries => {
      if (performance.now() < lockUntil) return;
      entries.forEach(en => { if (en.isIntersecting) setSub(en.target.id); });
    }, { rootMargin: '-100px 0px -60% 0px' });
    function renderSub(section) {
      if (section === curSection) return; curSection = section;
      const items = SUB[section] || [];
      subInner.innerHTML = items.map(([id, label]) => `<a href="#${id}" data-sub="${id}">${label}</a>`).join('');
      subbar.hidden = items.length === 0;
      $$('a', subInner).forEach(a => a.addEventListener('click', () => { setSub(a.dataset.sub); lockUntil = performance.now() + 900; }));
      subIO.disconnect(); items.forEach(([id]) => { const el = document.getElementById(id); if (el) subIO.observe(el); });
    }
    links.forEach(a => a.addEventListener('click', () => { setActive(a); renderSub(a.getAttribute('href').slice(1)); lockUntil = performance.now() + 900; }));
    const io = new IntersectionObserver(entries => {
      if (performance.now() < lockUntil) return;
      entries.forEach(en => { if (en.isIntersecting) { setActive(map.get(en.target.id)); renderSub(en.target.id); } });
    }, { rootMargin: '-60px 0px -70% 0px' });
    map.forEach((a, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    // 도입부(깔때기)에서는 서브메뉴 숨김
    const intro = document.getElementById('intro');
    if (intro) new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting && performance.now() >= lockUntil) { setActive(null); renderSub(null); } }), { rootMargin: '-60px 0px -70% 0px' }).observe(intro);
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

    function spawn(x, y) {
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
      drops.push({ x, y, vx: 0, vy: 0, r });
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
        if (!d.onWall) { d.onWall = true; Sound.tick(); }
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
      ctx.fillStyle = INK3; ctx.font = '12px monospace';
      ctx.fillText('input: 어디든 (클릭·드래그)', 24, 40);
      ctx.fillText('output: 한 곳 (' + collected + ')', neckX + 50, H - 18);
      // 방울
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.vy += GRAV; d.x += d.vx; d.y += d.vy;
        reflect(d, leftWall); reflect(d, rightWall);
        if (d.y > neckY && d.y < H - 40) { d.x += (neckX - d.x) * 0.5; d.vx = 0; }
        if (d.y > H - 40) { drops.splice(i, 1); collected++; level += 3; Sound.drip(Math.min(28, level)); continue; }
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(step);
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
    let n = 0; const auto = setInterval(() => { spawn(100 + Math.random() * (W - 200), 20); if (++n >= 8) clearInterval(auto); }, 450);
    step();
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
      ctx.fillStyle = INK3; ctx.font = '12px monospace';
      ctx.fillText(uni.checked ? '균일 형태: 복원 토크 없음' : '비대칭 형태: 코르크가 앞으로 정렬', 12, 20);
      requestAnimationFrame(draw);
    }
    draw();
  })();

  /* ---------- 1-4 가장자리 천공 카드 ---------- */
  (function cards() {
    const box = $('#cards'); if (!box) return;
    const TAGS = ['design', 'paper', 'sensor', 'textile', 'robot', 'food'];
    const DATA = [
      { t: 'bioLogic', tags: ['textile', 'sensor'] },
      { t: 'Foldio', tags: ['paper', 'sensor', 'design'] },
      { t: 'Morphing Pasta', tags: ['food', 'design'] },
      { t: 'Jacquard', tags: ['textile', 'sensor', 'design'] },
      { t: 'Passive Walker', tags: ['robot'] },
      { t: 'Keysort Card', tags: ['paper', 'design'] },
      { t: 'Octopus Reservoir', tags: ['robot', 'sensor'] },
    ];
    const active = new Set();
    const chips = $('#card-tags');
    TAGS.forEach(tag => {
      const b = document.createElement('button'); b.className = 'chip'; b.textContent = tag;
      b.addEventListener('click', () => { b.classList.toggle('is-active'); active.has(tag) ? active.delete(tag) : active.add(tag); renderRods(); });
      chips.appendChild(b);
    });
    const els = DATA.map((d, i) => {
      const c = document.createElement('div'); c.className = 'card';
      c.style.setProperty('--r', (i - 3) * 2 + 'deg'); c.style.zIndex = i;
      c.innerHTML = `<div class="card__holes">${TAGS.map(t => `<span class="card__hole ${d.tags.includes(t) ? 'is-notched' : ''}" data-tag="${t}"></span>`).join('')}</div>
        <div class="card__title">${d.t}</div><div class="card__tags">${d.tags.join(' · ')}</div>`;
      box.appendChild(c); return c;
    });
    function renderRods() { $$('.card__hole', box).forEach(h => h.classList.toggle('is-rod', active.has(h.dataset.tag))); }
    $('#card-lift').addEventListener('click', () => {
      Sound.click();
      // 막대가 꽂힌 자리에 홈(notch)이 있으면 막대에 걸리지 않고 떨어진다.
      // 막대가 하나도 없으면 아무것도 걸리지 않아 전부 떨어진다.
      DATA.forEach((d, i) => {
        const held = active.size > 0 && [...active].every(t => !d.tags.includes(t)); // 모든 막대 자리에 구멍이 온전해야 걸림
        els[i].classList.toggle('is-dropped', !held);
      });
    });
    $('#card-reset').addEventListener('click', () => els.forEach(e => e.classList.remove('is-dropped')));
  })();

  /* ---------- 2-1 bioLogic ---------- */
  (function biologic() {
    const svg = $('#biologic'); if (!svg) return;
    const slider = $('#bio-hum'), out = $('#bio-out');
    const NS = 'http://www.w3.org/2000/svg';
    const flaps = [];
    // 4 x 3 플랩, 각각 문턱 습도가 다름(코팅 두께)
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      const x = 40 + c * 68, y = 16 + r * 68;
      const thresh = 25 + ((r * 5 + c) * 37) % 55; // 25~80 사이 분산
      const base = document.createElementNS(NS, 'rect');
      base.setAttribute('x', x); base.setAttribute('y', y); base.setAttribute('width', 52); base.setAttribute('height', 40); base.setAttribute('fill', '#fff'); base.setAttribute('stroke', LINE);
      const flap = document.createElementNS(NS, 'path');
      flap.setAttribute('fill', INK); flap.setAttribute('stroke', 'none');
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', x + 26); label.setAttribute('y', y + 54); label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'svg-label'); label.setAttribute('font-size', '9'); label.textContent = thresh + '%';
      svg.append(base, flap, label);
      flaps.push({ x, y, thresh, flap });
    }
    function render() {
      const h = +slider.value; out.value = h;
      flaps.forEach(f => {
        // 문턱 이후 습도에 비례해 휘어 올라감 (재료의 연속 응답)
        const k = Math.max(0, Math.min(1, (h - f.thresh) / 25));
        // 위쪽 변이 경첩: 아래쪽 자유단이 들려 올라가며 통기구(흰 부분)가 드러난다
        const lift = k * 30;
        f.flap.setAttribute('d', `M${f.x} ${f.y} L${f.x + 52} ${f.y} L${f.x + 52} ${f.y + 40 - lift * 0.4} Q${f.x + 26} ${f.y + 40 - lift} ${f.x} ${f.y + 40 - lift * 0.4} Z`);
        f.flap.setAttribute('fill', k > 0 ? INK2 : INK);
      });
    }
    slider.addEventListener('input', render); render();
  })();

  /* ---------- 2-2 파스타 ---------- */
  (function pasta() {
    const svg = $('#pasta'); if (!svg) return;
    const gap = $('#pasta-gap'), time = $('#pasta-time');
    const gapOut = $('#pasta-gap-out'), timeOut = $('#pasta-time-out');
    const NS = 'http://www.w3.org/2000/svg';
    const body = document.createElementNS(NS, 'path'); body.setAttribute('fill', '#fff'); body.setAttribute('stroke', INK); body.setAttribute('stroke-width', 2);
    const grooves = document.createElementNS(NS, 'g');
    const label = document.createElementNS(NS, 'text'); label.setAttribute('x', 12); label.setAttribute('y', 20); label.setAttribute('class', 'svg-label');
    svg.append(body, grooves, label);
    function render() {
      const g = +gap.value, t = +time.value;
      gapOut.value = ['', '좁게', '중간', '넓게'][g]; timeOut.value = t.toFixed(1);
      const stiffness = [0, 1.4, 1, 0.6][g];       // 홈이 촘촘할수록 더 휨
      const curl = Math.min(1, t / 8) * stiffness; // 0..1.4
      // 스트립을 N개 세그먼트로 나눠 곡률을 누적
      const N = 40, L = 300, thick = 14;
      let x = 50, y = 110, ang = 0; const pts = [];
      for (let i = 0; i <= N; i++) {
        pts.push({ x, y, ang });
        ang -= curl * 0.06; x += Math.cos(ang) * (L / N); y += Math.sin(ang) * (L / N);
      }
      const top = pts.map(p => `${p.x + Math.sin(p.ang) * thick / 2},${p.y - Math.cos(p.ang) * thick / 2}`);
      const bot = pts.map(p => `${p.x - Math.sin(p.ang) * thick / 2},${p.y + Math.cos(p.ang) * thick / 2}`).reverse();
      body.setAttribute('d', 'M' + top.join(' L') + ' L' + bot.join(' L') + ' Z');
      grooves.innerHTML = '';
      const step = [0, 2, 4, 7][g];
      for (let i = 1; i < N; i += step) {
        const p = pts[i];
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', p.x + Math.sin(p.ang) * thick / 2); l.setAttribute('y1', p.y - Math.cos(p.ang) * thick / 2);
        l.setAttribute('x2', p.x + Math.sin(p.ang) * thick / 6); l.setAttribute('y2', p.y - Math.cos(p.ang) * thick / 6);
        l.setAttribute('stroke', INK); l.setAttribute('stroke-width', 2);
        grooves.appendChild(l);
      }
      label.textContent = t === 0 ? '건조 상태: 평평 · 형태는 이미 홈에 저장됨' : `홈 있는 면이 덜 팽창 → 그쪽으로 휨 (곡률 ${curl.toFixed(2)})`;
    }
    gap.addEventListener('input', render); time.addEventListener('input', render); render();
  })();

  /* ---------- 2-3 직조 격자 ---------- */
  (function weave() {
    const box = $('#weave'); if (!box) return;
    const N = 16; const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const d = document.createElement('div'); d.className = 'weave__cell';
      if (r % 3 === 1 && c % 3 === 1) d.classList.add('is-cond'); // 전도성 실 교차점만 센서
      box.appendChild(d); cells.push(d);
    }
    function touch(e) {
      const p = e.touches ? e.touches[0] : e;
      const el = document.elementFromPoint(p.clientX, p.clientY);
      if (!el || !el.classList.contains('weave__cell')) return;
      const i = cells.indexOf(el); const r = Math.floor(i / N), c = i % N;
      // 가장 가까운 전도성 교차점이 반응한다 (해상도 = 전도성 실 간격)
      cells.forEach((cell, j) => {
        if (!cell.classList.contains('is-cond')) return;
        const rr = Math.floor(j / N), cc = j % N;
        const dist = Math.hypot(rr - r, cc - c);
        cell.classList.remove('is-hot', 'is-warm');
        if (dist < 1.6) cell.classList.add('is-hot'); else if (dist < 3.2) cell.classList.add('is-warm');
      });
    }
    let down = false;
    box.addEventListener('pointerdown', e => { down = true; touch(e); });
    box.addEventListener('pointermove', e => { if (down) touch(e); });
    window.addEventListener('pointerup', () => { down = false; cells.forEach(c => c.classList.remove('is-hot', 'is-warm')); });
  })();

  /* ---------- 3. 저장소 계산 ---------- */
  (function reservoir() {
    const cv = $('#reservoir'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height;
    // 스프링-질량 체인 (비선형 스프링)
    const N = 9, nodes = [], springs = [];
    for (let i = 0; i < N; i++) nodes.push({ x0: 40 + i * 34, y0: 110, x: 40 + i * 34, y: 110, vx: 0, vy: 0, k: 0.02 + (i % 3) * 0.02 });
    for (let i = 0; i < N - 1; i++) springs.push([i, i + 1]);
    for (let i = 0; i < N - 2; i += 2) springs.push([i, i + 2]);
    const readouts = [2, 5, 8], hist = readouts.map(() => []), inHist = [];
    let drag = null, t = 0;
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
    cv.addEventListener('pointerdown', e => { drag = pos(e); });
    cv.addEventListener('pointermove', e => { if (drag) drag = pos(e); });
    window.addEventListener('pointerup', () => drag = null);
    function step() {
      t++;
      // 입력: 드래그 위치(없으면 사인파)
      const input = drag ? Math.max(-60, Math.min(60, drag.y - 110)) : Math.sin(t * 0.05) * 30 * (t % 400 < 200 ? 1 : 0);
      nodes[0].y = 110 + input; nodes[0].x = 40;
      for (let i = 1; i < N; i++) {
        const n = nodes[i]; let fx = 0, fy = 0;
        springs.forEach(([a, b]) => {
          if (a !== i && b !== i) return;
          const o = nodes[a === i ? b : a];
          const dx = o.x - n.x, dy = o.y - n.y, d = Math.hypot(dx, dy) || 1;
          const rest = Math.abs(o.x0 - n.x0);
          const s = (d - rest); const f = n.k * s + 0.0004 * s * s * s; // 비선형
          fx += f * dx / d; fy += f * dy / d;
        });
        fy += (n.y0 - n.y) * 0.004; fx += (n.x0 - n.x) * 0.02;
        n.vx = (n.vx + fx) * 0.96; n.vy = (n.vy + fy) * 0.96; n.x += n.vx; n.y += n.vy;
      }
      inHist.push(input); if (inHist.length > 200) inHist.shift();
      readouts.forEach((r, i) => { hist[i].push(nodes[r].y - 110); if (hist[i].length > 200) hist[i].shift(); });
      // 그리기
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = INK3; ctx.lineWidth = 1;
      springs.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke(); });
      nodes.forEach((n, i) => { ctx.fillStyle = i === 0 ? INK : (readouts.includes(i) ? INK2 : '#bbb'); ctx.beginPath(); ctx.arc(n.x, n.y, i === 0 ? 8 : 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = INK3; ctx.font = '11px monospace'; ctx.fillText('input (drag)', 14, 24); ctx.fillText('readouts', 200, 24);
      // 그래프
      const gx = 340, gw = 240;
      const plot = (arr, y0, col) => { ctx.strokeStyle = col; ctx.beginPath(); arr.forEach((v, i) => { const x = gx + i / 200 * gw, y = y0 - v * 0.4; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
      ctx.strokeStyle = LINE; [40, 90, 140, 190].forEach(y => { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); });
      plot(inHist, 40, INK); ctx.fillText('in', gx + gw + 4, 44);
      hist.forEach((h, i) => { plot(h, 90 + i * 50, INK2); ctx.fillText('n' + readouts[i], gx + gw + 4, 94 + i * 50); });
      requestAnimationFrame(step);
    }
    step();
  })();

  /* ---------- 3. 기계식 AND 게이트 ---------- */
  (function logic() {
    const svg = $('#logic'); if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const st = { a: false, b: false, out: false };
    function el(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }
    // 입력 A, B: 위에서 누르는 블록. 출력: 가운데 좌굴 빔
    const pa = el('rect', { x: 60, y: 20, width: 60, height: 30, fill: INK });
    const pb = el('rect', { x: 280, y: 20, width: 60, height: 30, fill: INK });
    el('text', { x: 90, y: 40, 'text-anchor': 'middle', fill: '#fff', 'font-size': 12, 'font-family': 'monospace' }).textContent = 'A';
    el('text', { x: 310, y: 40, 'text-anchor': 'middle', fill: '#fff', 'font-size': 12, 'font-family': 'monospace' }).textContent = 'B';
    const lever = el('path', { d: '', stroke: INK, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' });
    const beam = el('path', { d: '', stroke: INK, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' });
    el('rect', { x: 150, y: 150, width: 100, height: 6, fill: INK });
    const lbl = el('text', { x: 200, y: 172, 'text-anchor': 'middle', class: 'svg-label' });
    function render() {
      const da = st.a ? 30 : 0, db = st.b ? 30 : 0;
      pa.setAttribute('y', 20 + da); pb.setAttribute('y', 20 + db);
      // 레버: 두 입력이 밀어내린 평균만큼 가운데가 내려온다 (기계적 합산)
      const mid = 70 + (da + db) / 2;
      lever.setAttribute('d', `M90 ${52 + da} L200 ${mid} L310 ${52 + db}`);
      // 빔: 합산 변위가 문턱(둘 다 눌림)을 넘으면 좌굴 → 쌍안정으로 고정
      if (da + db >= 60 && !st.out) { st.out = true; Sound.snap(); }
      const buck = st.out ? 40 : Math.min(8, (da + db) / 6);
      beam.setAttribute('d', `M200 ${mid + 4} Q${200 + buck} ${(mid + 150) / 2} 200 150`);
      beam.setAttribute('stroke', st.out ? INK : INK3);
      lbl.textContent = `A=${+st.a} B=${+st.b} → 출력=${+st.out}${st.out ? ' (좌굴 유지: 메모리)' : ''}`;
    }
    $$('[data-logic]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.logic;
      if (k === 'reset') { st.a = st.b = st.out = false; }
      else { st[k] = !st[k]; Sound.click(); }
      render();
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
    const CRIT = [
      { k: 'always', n: '항상 켜져 있어야 한다', mat: +1 },
      { k: 'nopower', n: '전원을 쓸 수 없다', mat: +2 },
      { k: 'tactile', n: '안 보고도 상태를 알아야 한다', mat: +1 },
      { k: 'analog', n: '입력→출력이 연속 변환이다', mat: +1 },
      { k: 'rulechange', n: '규칙이 자주 바뀐다', mat: -2 },
      { k: 'remote', n: '다른 장소·사람과 상태를 공유한다', mat: -2 },
      { k: 'combinatorial', n: '조건이 여러 개 조합된다', mat: -1 },
      { k: 'history', n: '과거 기록을 남겨야 한다', mat: -1 },
    ];
    let func = FUNCS[0]; const on = new Set();
    FUNCS.forEach((f, i) => {
      const b = document.createElement('button'); b.className = 'chip' + (i === 0 ? ' is-active' : ''); b.textContent = f.n;
      b.addEventListener('click', () => { $$('.chip', funcs).forEach(c => c.classList.remove('is-active')); b.classList.add('is-active'); func = f; render(); });
      funcs.appendChild(b);
    });
    const critBox = $('#tradeoff-criteria');
    CRIT.forEach(c => {
      const l = document.createElement('label'); l.className = 'crit';
      l.innerHTML = `<input type="checkbox"> ${c.n}`;
      l.querySelector('input').addEventListener('change', e => { e.target.checked ? on.add(c.k) : on.delete(c.k); l.classList.toggle('is-on', e.target.checked); render(); });
      critBox.appendChild(l);
    });
    const verdict = $('#tradeoff-verdict');
    function render() {
      let score = 0; CRIT.forEach(c => { if (on.has(c.k)) score += c.mat; });
      const pct = Math.round(50 + score * 10);
      const clamped = Math.max(5, Math.min(95, pct));
      let msg;
      if (on.size === 0) msg = '조건을 켜보세요.';
      else if (score >= 2) msg = '이 계층은 재료로 내려보낼 만합니다. 센서·MCU를 빼고 형태·재질이 그 일을 맡게 하세요.';
      else if (score <= -2) msg = '이 계층은 소프트웨어에 남겨두는 게 맞습니다. 대신 그 아래 계층(입력 검증, 상태 표시)만 재료로 내려보낼 수 있는지 보세요.';
      else msg = '경계 지점입니다. 하이브리드 · 재료가 1차 반응을 하고 소프트웨어가 예외만 다루는 구조가 어울립니다.';
      verdict.innerHTML = `<strong>${func.n}</strong><p class="muted">물성 사례: ${func.hint}</p>
        <div class="bar"><i style="width:${clamped}%"></i></div>
        <div class="bar-label"><span>소프트웨어</span><span>재료</span></div><p>${msg}</p>`;
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
