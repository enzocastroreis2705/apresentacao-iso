(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const total = slides.length;
  const $ = (id) => document.getElementById(id);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = -1;
  let locked = false;

  /* ---------- Texto quebrado em letras ---------- */
  slides.forEach((slide) => {
    let ci = 0;
    const splits = slide.querySelectorAll('[data-split]');
    const count = [...splits].reduce((n, el) => n + el.textContent.replace(/\s/g, '').length, 0);
    slide.style.setProperty('--stagger', Math.min(42, 700 / Math.max(count, 1)) + 'ms');

    splits.forEach((el) => {
      const text = el.textContent.trim();
      el.textContent = '';
      el.setAttribute('aria-label', text);
      text.split(' ').forEach((w, wi, arr) => {
        const word = document.createElement('span');
        word.className = 'word';
        word.setAttribute('aria-hidden', 'true');
        [...w].forEach((ch) => {
          const c = document.createElement('span');
          c.className = 'char';
          c.textContent = ch;
          c.style.setProperty('--ci', ci++);
          word.appendChild(c);
        });
        el.appendChild(word);
        if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });
  });

  // Cada letra do texto em gradiente recebe sua fatia do gradiente contínuo
  function paintGradientChars() {
    document.querySelectorAll('.grad-text[data-split]').forEach((el) => {
      // O gradiente cobre da borda da primeira caixa de letra até a da última,
      // incluindo o respiro lateral que evita cortar letras em itálico
      const chars = [...el.querySelectorAll('.char')];
      const left = Math.min(...chars.map((c) => c.offsetLeft));
      const right = Math.max(...chars.map((c) => c.offsetLeft + c.offsetWidth));
      chars.forEach((c) => {
        c.style.backgroundSize = `${right - left}px 100%`;
        c.style.backgroundPosition = `${left - c.offsetLeft}px 0`;
      });
    });
  }

  /* ---------- Orbes de luz (posição por slide, em vw/vh) ---------- */
  const ORBS = [
    [[15, 20], [85, 80], [60, -5]],
    [[80, 25], [20, 75], [50, 110]],
    [[50, -5], [90, 60], [10, 90]],
    [[10, 40], [70, 10], [80, 95]],
    [[72, 50], [20, 20], [30, 100]],
    [[30, 80], [85, 30], [55, -10]],
    [[50, 50], [0, 0], [100, 100]],
    [[85, 85], [15, 15], [60, 40]],
    [[20, 60], [80, 20], [50, 105]],
    [[60, 20], [30, 70], [95, 90]],
    [[50, 45], [15, 90], [85, 10]],
  ];
  const orbs = [...document.querySelectorAll('.orb')];
  function moveOrbs(n) {
    const layout = ORBS[n % ORBS.length];
    orbs.forEach((o, i) => {
      o.style.transform = `translate(${layout[i][0]}vw, ${layout[i][1]}vh)`;
    });
  }

  /* ---------- HUD ---------- */
  const dotsNav = $('dots');
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Slide ${i + 1}: ${s.dataset.title}`);
    b.addEventListener('click', () => go(i));
    dotsNav.appendChild(b);
  });
  const dots = [...dotsNav.children];
  $('total').textContent = String(total).padStart(2, '0');

  function rollIn(el, text, dir) {
    el.textContent = text;
    if (reduceMotion) return;
    el.animate(
      [
        { transform: `translateY(${dir * 100}%)`, opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' }
    );
  }

  function wipe(dir) {
    if (reduceMotion) return;
    const from = dir > 0 ? '-45vw' : '105vw';
    const to = dir > 0 ? '105vw' : '-45vw';
    $('wipe').animate(
      [
        { transform: `translateX(${from})`, opacity: 0 },
        { opacity: 1, offset: 0.25 },
        { opacity: 1, offset: 0.75 },
        { transform: `translateX(${to})`, opacity: 0 },
      ],
      { duration: 1100, easing: 'cubic-bezier(.65,0,.35,1)' }
    );
  }

  /* ---------- Contadores ---------- */
  let counterToken = 0;
  function runCounters(slide) {
    const token = ++counterToken;
    slide.querySelectorAll('[data-count]').forEach((el) => {
      const to = +el.dataset.count;
      const from = +(el.dataset.from || 0);
      const dec = +(el.dataset.decimals || 0);
      const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      const dur = 2200;
      const start = performance.now() + 700;
      el.textContent = fmt.format(from);
      const step = (now) => {
        if (token !== counterToken) return;
        const p = Math.min(1, Math.max(0, (now - start) / dur));
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = fmt.format(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Navegação ---------- */
  function go(n) {
    n = Math.max(0, Math.min(total - 1, n));
    if (n === current) return;
    const dir = n > current ? 1 : -1;
    const first = current === -1;
    const prevSlide = slides[current];
    current = n;

    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === n);
      s.classList.toggle('is-past', i < n);
      s.setAttribute('aria-hidden', i !== n);
    });
    dots.forEach((d, i) => d.classList.toggle('on', i === n));

    rollIn($('cur'), String(n + 1).padStart(2, '0'), dir);
    rollIn($('hudTitle'), slides[n].dataset.title, dir);
    $('progressBar').style.width = ((n + 1) / total) * 100 + '%';
    $('prev').disabled = n === 0;
    $('next').disabled = n === total - 1;

    moveOrbs(n);
    if (!first) {
      wipe(dir);
      ripple();
    }
    slides[n].scrollTop = 0;
    runCounters(slides[n]);
    if (prevSlide) setTimeout(() => resetInteractive(prevSlide), 850);
    if (slides[n].classList.contains('s-timeline')) startTimeline();
    if (slides[n] === ticketSlide && !ticketSlide.classList.contains('done')) ticketSlide.classList.add('hint-on');
    history.replaceState(null, '', '#' + (n + 1));

    locked = true;
    setTimeout(() => (locked = false), 900);
  }
  const next = () => go(current + 1);
  const prev = () => go(current - 1);

  $('next').addEventListener('click', next);
  $('prev').addEventListener('click', prev);
  $('restart').addEventListener('click', () => go(0));
  $('heroNext').addEventListener('click', next);

  /* ---------- Slide 4: carta que vira ao clicar ---------- */
  document.querySelectorAll('.tile-flip').forEach((card) => {
    card.addEventListener('click', () => {
      const flipped = card.classList.toggle('flipped');
      card.setAttribute('aria-pressed', flipped);
      card.setAttribute('aria-label', flipped ? 'Desvirar a carta' : 'Virar a carta');
    });
  });

  /* ---------- Slide 8: acordeão (só um aberto por vez) ---------- */
  document.querySelectorAll('.row-head').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.row');
      const willOpen = !row.classList.contains('open');
      closeRows(row.parentElement);
      if (willOpen) {
        row.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
  function closeRows(scope) {
    scope.querySelectorAll('.row.open').forEach((r) => {
      r.classList.remove('open');
      r.querySelector('.row-head').setAttribute('aria-expanded', 'false');
    });
  }

  /* ---------- Slide 9: linha do tempo avança ao clicar na esfera ---------- */
  const timelineSlide = document.querySelector('.s-timeline');
  const tlSteps = [...document.querySelectorAll('.tl-step')];
  let tlTimer = 0;
  let sealedAt = 0;

  function showStep(i) {
    tlSteps[i].classList.add('on', 'next');
  }
  function startTimeline() {
    clearTimeout(tlTimer);
    if (tlSteps.some((s) => s.classList.contains('on'))) return;
    timelineSlide.classList.add('hint-on');
    tlTimer = setTimeout(() => showStep(0), 1100);
  }
  tlSteps.forEach((step, i) => {
    step.querySelector('.tl-dot').addEventListener('click', (e) => {
      if (!step.classList.contains('next')) return;
      step.classList.remove('next');
      step.classList.add('done');
      timelineSlide.classList.remove('hint-on');
      if (i < tlSteps.length - 1) {
        tlTimer = setTimeout(() => showStep(i + 1), 800);
      } else {
        const r = e.currentTarget.getBoundingClientRect();
        ripple(r.left + r.width / 2, r.top + r.height / 2);
        timelineSlide.classList.add('sealed');
        sealedAt = performance.now();
      }
    });
  });

  /* ---------- Slide 16: comanda que imprime um passo por clique ---------- */
  const ticketSlide = document.querySelector('.s-ticket');
  const ticketLines = [...document.querySelectorAll('.tk-line')];
  let ticketTimer = 0;
  let ticketDoneAt = 0;
  $('ticket').addEventListener('click', () => {
    const steps = ticketLines.filter((l) => !l.classList.contains('tk-total-line'));
    const nextLine = steps.find((l) => !l.classList.contains('on'));
    if (!nextLine) return;
    nextLine.classList.add('on');
    ticketSlide.classList.remove('hint-on');
    if (nextLine === steps[steps.length - 1]) {
      ticketSlide.classList.add('done');
      ticketDoneAt = performance.now();
      ticketTimer = setTimeout(() => {
        document.querySelector('.tk-total-line').classList.add('on');
        const r = $('ticket').getBoundingClientRect();
        ripple(r.left + r.width / 2, r.bottom);
      }, 900);
    }
  });

  /* ---------- Slide 15: marcador "hoje" na transição 2026 → 2029 ---------- */
  (function placeToday() {
    const start = new Date(2026, 8, 16), end = new Date(2029, 8, 30);
    const p = Math.max(0, Math.min(1, (Date.now() - start) / (end - start)));
    document.querySelector('.transition').style.setProperty('--p', (p * 100).toFixed(2) + '%');
  })();

  function resetInteractive(slide) {
    if (slide === slides[current]) return;
    closeRows(slide);
    slide.querySelectorAll('.tile-flip.flipped').forEach((c) => {
      c.classList.remove('flipped');
      c.setAttribute('aria-pressed', 'false');
      c.setAttribute('aria-label', 'Virar a carta');
    });
    if (slide === timelineSlide) {
      clearTimeout(tlTimer);
      timelineSlide.classList.remove('hint-on', 'sealed');
      tlSteps.forEach((s) => s.classList.remove('on', 'next', 'done'));
    }
    if (slide === ticketSlide) {
      clearTimeout(ticketTimer);
      ticketSlide.classList.remove('hint-on', 'done');
      ticketLines.forEach((l) => l.classList.remove('on'));
    }
  }

  // Slides 12 e 16: o avanço primeiro anda a linha do tempo / imprime a comanda;
  // depois de concluídos, volta a passar de slide. Retorna true se consumiu o avanço.
  function stepInteractive() {
    if (slides[current] === timelineSlide) {
      const sealed = timelineSlide.classList.contains('sealed');
      if (!sealed || performance.now() - sealedAt < 1600) {
        if (!sealed) timelineSlide.querySelector('.tl-step.next .tl-dot')?.click();
        return true;
      }
    }
    if (slides[current] === ticketSlide) {
      const done = ticketSlide.classList.contains('done');
      if (!done || performance.now() - ticketDoneAt < 2200) {
        if (!done) $('ticket').click();
        return true;
      }
    }
    return false;
  }

  const START_KEYS = [' ', 'ArrowRight', 'ArrowDown', 'PageDown', 'Enter'];

  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (!started) {
      if (START_KEYS.includes(e.key)) { e.preventDefault(); startIntro(); }
      return;
    }
    // Ignora a repetição de tecla segurada, para não disparar vários slides
    if (e.repeat && e.key !== 'f' && e.key !== 'F') { e.preventDefault(); return; }
    if (e.key === ' ' && stepInteractive()) { e.preventDefault(); return; }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
        e.preventDefault(); prev(); break;
      case 'Home': go(0); break;
      case 'End': go(total - 1); break;
      case 'f': case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
        break;
    }
  });

  addEventListener('wheel', (e) => {
    if (!started || locked || Math.abs(e.deltaY) < 25) return;
    e.deltaY > 0 ? next() : prev();
  }, { passive: true });

  let tx = 0, ty = 0;
  addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (started && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) dx < 0 ? next() : prev();
  }, { passive: true });

  /* ---------- Celular: toque passa de slide (terço esquerdo volta) ---------- */
  const isTouch = matchMedia('(hover: none) and (pointer: coarse)');
  addEventListener('click', (e) => {
    if (!isTouch.matches) return;
    if (!started) { startIntro(); return; }
    if (locked || e.target.closest('button, a, .tile-flip, .row, .tl-dot, .ticket')) return;
    if (e.clientX < innerWidth / 3) prev();
    else if (!stepInteractive()) next();
  });

  /* ---------- Fundo: malha de pontos reativa ---------- */
  const cv = $('bg');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, pts = [];
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  let rippleStart = -1e9;
  let rippleX = 0, rippleY = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pts = [];
    const gap = W < 700 ? 28 : 34;
    for (let y = gap / 2; y < H; y += gap)
      for (let x = gap / 2; x < W; x += gap) pts.push(x, y);
    paintGradientChars();
  }
  function ripple(x = W / 2, y = H / 2) {
    rippleStart = performance.now();
    rippleX = x; rippleY = y;
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    mouse.x += (mouse.tx - mouse.x) * 0.12;
    mouse.y += (mouse.ty - mouse.y) * 0.12;
    const R = 180;
    const cx = rippleX, cy = rippleY;
    const rr = (t - rippleStart) * 1.6;
    const maxR = Math.hypot(W, H);
    const rippleOn = rr < maxR;
    ctx.fillStyle = '#eef3ff';

    for (let i = 0; i < pts.length; i += 2) {
      let x = pts[i], y = pts[i + 1];
      let a = 0.05 + (Math.sin(x * 0.004 + t * 0.0006) + Math.cos(y * 0.005 - t * 0.0005)) * 0.025;
      let r = 1;

      const dx = x - mouse.x, dy = y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < R && dist > 0) {
        const f = 1 - dist / R;
        x += (dx / dist) * f * f * 28;
        y += (dy / dist) * f * f * 28;
        a += f * 0.45; r += f * 1.3;
      }

      if (rippleOn) {
        const ddx = pts[i] - cx, ddy = pts[i + 1] - cy;
        const d = Math.hypot(ddx, ddy) || 1;
        const band = 1 - Math.min(1, Math.abs(d - rr) / 90);
        if (band > 0) {
          const fade = 1 - rr / maxR;
          x += (ddx / d) * band * 14 * fade;
          y += (ddy / d) * band * 14 * fade;
          a += band * 0.5 * fade; r += band * fade;
        }
      }

      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.fillRect(x - r / 2, y - r / 2, r, r);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  /* ---------- Cursor ---------- */
  const ring = $('ring'), cdot = $('cdot'), cursor = document.querySelector('.cursor');
  let px = innerWidth / 2, py = innerHeight / 2, rx = px, ry = py;

  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    mouse.tx = px; mouse.ty = py;
    cursor.classList.add('show');
  });
  document.addEventListener('pointerleave', () => {
    cursor.classList.remove('show');
    mouse.tx = mouse.ty = -9999;
  });
  document.addEventListener('pointerover', (e) => {
    document.body.classList.toggle('is-hover', !!e.target.closest('button, .tile, .row, [data-tilt]'));
  });

  (function cursorLoop() {
    rx += (px - rx) * 0.16; ry += (py - ry) * 0.16;
    cdot.style.transform = `translate(${px}px, ${py}px)`;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(cursorLoop);
  })();

  /* ---------- Tilt 3D e spotlight ---------- */
  document.querySelectorAll('[data-tilt], [data-spot]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', x * 100 + '%');
      el.style.setProperty('--my', y * 100 + '%');
      if (el.hasAttribute('data-tilt')) {
        el.style.transform = `rotateY(${(x - 0.5) * 14}deg) rotateX(${(0.5 - y) * 14}deg)`;
      }
    });
    el.addEventListener('pointerleave', () => {
      if (el.hasAttribute('data-tilt')) el.style.transform = '';
    });
  });

  /* ---------- Intro (parada em 0% até apertar espaço) ---------- */
  let started = false;
  let ready = false;
  let wantsStart = false;

  function startIntro() {
    if (started) return;
    if (!ready) { wantsStart = true; return; }
    started = true;

    const startAt = parseInt(location.hash.slice(1), 10) - 1;
    const begin = () => go(Number.isFinite(startAt) ? startAt : 0);
    if (reduceMotion) { $('intro').remove(); begin(); return; }

    const t0 = performance.now(), dur = 1500;
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - p, 3);
      $('introCount').textContent = Math.round(e * 100);
      $('introBar').style.width = e * 100 + '%';
      if (p < 1) return requestAnimationFrame(tick);
      setTimeout(() => {
        $('intro').classList.add('done');
        setTimeout(begin, 350);
        setTimeout(() => $('intro').remove(), 1400);
      }, 200);
    };
    requestAnimationFrame(tick);
  }

  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
    paintGradientChars();
    ready = true;
    if (wantsStart) startIntro();
  });
})();
