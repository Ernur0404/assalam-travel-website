/* ==========================================================================
   ASSALAM TRAVEL — интерактив
   Поведение по эталонному макету: тема, звёздное небо, появление секций,
   рисование маршрута, набегающие цифры, аккордеон, подбор вылета.
   Все строки берутся из i18n.js, чтобы работать на двух языках.
   ========================================================================== */

var WA_NUMBER = '77778299099';

/* строка интерфейса на текущем языке */
function T(k) { return window.AL_I18N ? window.AL_I18N.t(k) : k; }

function waLink(msg) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg); }

/* window.open блокируют и блокировщики окон, и iframe предпросмотра —
   поэтому при неудаче уходим обычным переходом */
function openWA(msg) {
  var url = waLink(msg), w = null;
  try { w = window.open(url, '_blank', 'noopener'); } catch (e) { w = null; }
  if (!w) window.location.href = url;
}

/* ---- переключатель темы ---- */
(function () {
  var root = document.documentElement, btn = document.getElementById('themeBtn');
  if (!btn) return;
  var meta = document.querySelector('meta[name="theme-color"]');
  var sync = function () {
    var light = root.getAttribute('data-theme') === 'light';
    btn.setAttribute('aria-label', light ? T('themeDark') : T('themeLight'));
    if (meta) meta.setAttribute('content', light ? '#FAF7F1' : '#0A1526');
  };
  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('assalam-theme', next); } catch (e) {}
    sync();
  });
  window.AL_THEME = { sync: sync };
  sync();
})();

/* ---- мобильное меню ---- */
(function () {
  var burger = document.getElementById('burger'), mm = document.getElementById('mobileMenu');
  if (!burger || !mm) return;
  burger.addEventListener('click', function () {
    var open = mm.classList.toggle('show');
    burger.setAttribute('aria-expanded', String(open));
  });
  Array.prototype.forEach.call(mm.querySelectorAll('a'), function (a) {
    a.addEventListener('click', function () {
      mm.classList.remove('show');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
})();

/* ---- звёздное небо в герое ---- */
(function () {
  var c = document.getElementById('stars'); if (!c) return;
  var ctx = c.getContext('2d');
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var w, h, stars = [];
  function size() {
    var r = c.parentElement.getBoundingClientRect();
    w = c.width = r.width; h = c.height = r.height;
    var n = Math.min(150, Math.round(w * h / 9000));
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.4 + .3, a: Math.random() * .6 + .2,
        s: Math.random() * .012 + .003, p: Math.random() * 6.28
      });
    }
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var tw = reduce ? st.a : st.a + Math.sin(t * st.s + st.p) * .28;
      ctx.globalAlpha = Math.max(.05, Math.min(1, tw));
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.29);
      ctx.fillStyle = '#E8DFC9'; ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  }
  size(); draw(0);
  var to; addEventListener('resize', function () {
    clearTimeout(to); to = setTimeout(function () { size(); if (reduce) draw(0); }, 200);
  });
})();

/* ---- появление секций при скролле ---- */
(function () {
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var showAll = function () { reveals.forEach(function (el) { el.classList.add('in'); }); };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    showAll();
  }
  addEventListener('beforeprint', showAll);
  addEventListener('error', showAll);     // если что-то упало — контент не остаётся скрытым
})();

/* ---- рисование маршрута Медина → Мекка ---- */
(function () {
  var rp = document.getElementById('routePath');
  if (!rp || !('IntersectionObserver' in window)) return;
  var len = rp.getTotalLength();
  rp.style.strokeDasharray = len; rp.style.strokeDashoffset = len;
  var rio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) {
        rp.style.transition = 'stroke-dashoffset 1.6s ease-out';
        rp.style.strokeDashoffset = 0;
        rio.unobserve(e.target);
      }
    });
  }, { threshold: .4 });
  rio.observe(rp);
})();

/* ---- мерцающие звёзды на карте маршрута ---- */
(function () {
  var g = document.getElementById('twinkles');
  if (!g) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var A = { x: 120, y: 270 }, B = { x: 285, y: 130 };

  function clear(x, y) {
    var dx = B.x - A.x, dy = B.y - A.y;
    var t = Math.max(0, Math.min(1, ((x - A.x) * dx + (y - A.y) * dy) / (dx * dx + dy * dy)));
    if (Math.hypot(x - (A.x + t * dx), y - (A.y + t * dy)) < 56) return false;
    if (x > 180 && x < 392 && y > 62 && y < 122) return false;   // подписи Мекки
    if (x > 30 && x < 212 && y > 284 && y < 342) return false;   // подписи Медины
    return true;
  }
  function spot() {
    for (var i = 0; i < 40; i++) {
      var x = 16 + Math.random() * 368, y = 16 + Math.random() * 368;
      if (clear(x, y)) return { x: x, y: y };
    }
    return { x: 28, y: 28 };
  }
  function place(el, sparkle) {
    var s2 = spot(), x = s2.x, y = s2.y;
    if (sparkle) {
      var s = 4 + Math.random() * 4, k = s * .28;
      el.setAttribute('d', 'M' + x + ' ' + (y - s) + 'L' + (x + k) + ' ' + (y - k) + 'L' + (x + s) + ' ' + y +
        'L' + (x + k) + ' ' + (y + k) + 'L' + x + ' ' + (y + s) + 'L' + (x - k) + ' ' + (y + k) +
        'L' + (x - s) + ' ' + y + 'L' + (x - k) + ' ' + (y - k) + 'Z');
    } else {
      el.setAttribute('cx', x.toFixed(1));
      el.setAttribute('cy', y.toFixed(1));
      el.setAttribute('r', (0.9 + Math.random() * 1.5).toFixed(2));
    }
  }

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(g.ownerSVGElement);
  }

  for (var i = 0; i < 15; i++) {
    (function (i) {
      var sparkle = i % 5 === 0;
      var el = document.createElementNS(NS, sparkle ? 'path' : 'circle');
      el.setAttribute('fill', sparkle ? 'var(--gold)' : 'var(--star)');
      el.style.opacity = 0;
      place(el, sparkle);
      g.appendChild(el);
      if (reduce) { el.style.opacity = .45; return; }
      var peak = sparkle ? .9 : .35 + Math.random() * .5;
      var cycle = function () {
        if (!visible) { setTimeout(cycle, 900); return; }
        place(el, sparkle);
        el.animate([{ opacity: 0 }, { opacity: peak }, { opacity: 0 }],
          { duration: 2200 + Math.random() * 2800, easing: 'ease-in-out' })
          .onfinish = function () { setTimeout(cycle, 200 + Math.random() * 2400); };
      };
      setTimeout(cycle, Math.random() * 4000);
    })(i);
  }
})();

/* ---- набегающие цифры ----
   финальное значение уже в разметке: если скрипт не отработает,
   цифры останутся верными, а не залипнут на нуле */
(function () {
  var nums = Array.prototype.slice.call(document.querySelectorAll('[data-to]'));
  if (!nums.length || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var fmt = function (n) { return n.toLocaleString('ru-RU').replace(/\s/g, ' '); };
  var paint = function (el, v) { el.textContent = fmt(v) + (el.dataset.suffix || ''); };

  var run = function (el) {
    var to = +el.dataset.to, dur = 1300, t0 = performance.now(), done = false;
    var finish = function () { if (!done) { done = true; paint(el, to); } };
    var step = function (now) {
      if (done) return;
      var p = Math.min(1, (now - t0) / dur);
      if (p >= 1) { finish(); return; }
      paint(el, Math.round(to * (1 - Math.pow(1 - p, 3))));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(finish, dur + 400);   // во вкладке в фоне rAF засыпает
  };

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
  }, { threshold: .45 });
  nums.forEach(function (el) { io.observe(el); });
})();

/* ---- лента видео и лайтбокс ---- */
(function () {
  var box = document.getElementById('lightbox');
  var clips = Array.prototype.slice.call(document.querySelectorAll('.jopen video'));
  if (!box) return;

  var vid = document.createElement('video');
  vid.controls = true; vid.loop = true; vid.playsInline = true;
  box.appendChild(vid);
  var opener = null;

  function open(btn) {
    opener = btn;
    clips.forEach(function (v) { v.pause(); });   // лента молчит, пока открыт ролик
    vid.src = btn.dataset.full;
    vid.muted = false;
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    vid.play().catch(function () {});             // открыли кликом, значит звук разрешён
    document.getElementById('lbClose').focus();
  }
  function close() {
    box.hidden = true;
    vid.pause(); vid.removeAttribute('src'); vid.load();
    document.body.style.overflow = '';
    if (opener) opener.focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll('.jopen'), function (b) {
    b.addEventListener('click', function () { open(b); });
  });
  document.getElementById('lbClose').addEventListener('click', close);
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });

  /* Ролики в ленте крутятся без звука, только пока видны.
     Одновременно играют максимум три — иначе на слабом телефоне
     декодируется полдюжины потоков разом и страница начинает дёргаться.
     Остальные карточки в это время показывают постер. */
  var MAX_PLAYING = 3;
  if (clips.length && 'IntersectionObserver' in window
      && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
    var seen = [];                                  // видимые ролики, в порядке ленты
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var i = seen.indexOf(e.target);
        if (e.isIntersecting && i < 0) seen.push(e.target);
        if (!e.isIntersecting && i >= 0) seen.splice(i, 1);
      });
      seen.sort(function (a, b) { return clips.indexOf(a) - clips.indexOf(b); });
      clips.forEach(function (v) {
        if (seen.indexOf(v) > -1 && seen.indexOf(v) < MAX_PLAYING) {
          if (v.paused) v.play().catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: .5 });
    clips.forEach(function (v) { vio.observe(v); });

    /* ушли на другую вкладку — не греем процессор впустую */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clips.forEach(function (v) { v.pause(); });
    });
  }
})();

/* ---- вопросы: открыт всегда только один ---- */
(function () {
  var faqs = Array.prototype.slice.call(document.querySelectorAll('.faq'));
  faqs.forEach(function (faq) {
    faq.querySelector('button').addEventListener('click', function () {
      var willOpen = !faq.classList.contains('open');
      faqs.forEach(function (f) {
        var on = f === faq && willOpen;
        f.classList.toggle('open', on);
        f.querySelector('button').setAttribute('aria-expanded', String(on));
      });
    });
  });
})();

/* ======================================================================
   ПОДБОР ВЫЛЕТА
   ====================================================================== */
(function () {
  var panelWrap = document.querySelector('.book-panel');
  if (!panelWrap) return;

  /* c — город вылета этой программы: он уже зашит в её название,
     поэтому на втором шаге подставляем его сам, чтобы в заявку
     не ушло «Комфорт · Атырау → Медина» и рядом «Вылет из: Актау».
     Поменять город руками всё равно можно. */
  var PROGRAMS = [
    { id: 'oct-std',  t: 'p.oct.t',  d: 'p.oct.d',  p: 1690, c: 'aktau'  },
    { id: 'nov-com',  t: 'p.nov.t',  d: 'p.nov.d',  p: 1950, c: 'atyrau' },
    { id: 'nov-prem', t: 'p.prem.t', d: 'p.prem.d', p: 2780, c: 'oral'   },
    { id: 'ind',      t: 'p.ind.t',  d: 'p.ind.d',  p: 0 }
  ];
  var CITIES = [
    { id: 'aktau',  n: 'c.aktau',  s: 'c.aktau.s' },
    { id: 'atyrau', n: 'c.atyrau', s: 'c.atyrau.s' },
    { id: 'oral',   n: 'c.oral',   s: 'c.oral.s' },
    { id: 'aktobe', n: 'c.aktobe', s: 'c.aktobe.s' }
  ];
  var state = { step: 0, prog: null, city: null, adults: 1, kids: 0 };

  var $ = function (s) { return document.querySelector(s); };
  var steps = document.querySelectorAll('.step');
  var snavs = document.querySelectorAll('.snav');
  var btnNext = $('#btnNext'), btnBack = $('#btnBack');
  var progOpts = $('#progOpts'), cityOpts = $('#cityOpts');

  function pickProgram(pr) {
    state.prog = pr;
    if (pr.c) {
      CITIES.forEach(function (ct) { if (ct.id === pr.c) state.city = ct; });
    }
    paint(); update();
  }

  function buildOptions() {
    progOpts.innerHTML = '';
    PROGRAMS.forEach(function (pr) {
      var el = document.createElement('div');
      el.className = 'opt'; el.dataset.id = pr.id;
      el.innerHTML =
        '<div class="opt-main"><span class="opt-t"></span><span class="opt-d"></span></div>' +
        '<div style="display:flex;align-items:center;gap:16px">' +
        (pr.p ? '<span class="opt-p">$' + pr.p.toLocaleString('ru-RU').replace(/\s/g, ' ') + '</span>' : '') +
        '<span class="opt-radio"></span></div>';
      el.querySelector('.opt-t').textContent = T(pr.t);
      el.querySelector('.opt-d').textContent = T(pr.d);
      el.addEventListener('click', function () { pickProgram(pr); });
      progOpts.appendChild(el);
    });
    cityOpts.innerHTML = '';
    CITIES.forEach(function (ct) {
      var el = document.createElement('div');
      el.className = 'opt'; el.dataset.city = ct.id;
      el.innerHTML = '<div class="opt-main"><span class="opt-t"></span><span class="opt-d"></span></div><span class="opt-radio"></span>';
      el.querySelector('.opt-t').textContent = T(ct.n);
      el.querySelector('.opt-d').textContent = T(ct.s);
      el.addEventListener('click', function () { state.city = ct; paint(); update(); });
      cityOpts.appendChild(el);
    });
    paint();
  }

  function paint() {
    Array.prototype.forEach.call(progOpts.querySelectorAll('.opt'), function (o) {
      o.classList.toggle('sel', !!state.prog && o.dataset.id === state.prog.id);
    });
    Array.prototype.forEach.call(cityOpts.querySelectorAll('.opt'), function (o) {
      o.classList.toggle('sel', !!state.city && o.dataset.city === state.city.id);
    });
  }

  function total() {
    if (!state.prog || !state.prog.p) return null;
    return state.prog.p * (state.adults + state.kids);
  }

  function update() {
    $('#sProg').textContent = state.prog ? T(state.prog.t) : '—';
    $('#sCity').textContent = state.city ? T(state.city.n) : '—';
    $('#sPax').textContent = state.adults + state.kids;
    $('#cAdults').textContent = state.adults;
    $('#cKids').textContent = state.kids;
    var tt = total();
    $('#sTotal').textContent = tt ? '$' + tt.toLocaleString('ru-RU').replace(/\s/g, ' ')
      : (state.prog && !state.prog.p ? T('onRequest') : '—');
    btnNext.textContent = state.step === 3 ? T('book.send') : T('book.next');
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-adj]'), function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.adj, d = +b.dataset.d;
      if (k === 'adults') state.adults = Math.max(1, Math.min(20, state.adults + d));
      else state.kids = Math.max(0, Math.min(20, state.kids + d));
      update();
    });
  });

  function go(n) {
    state.step = n;
    Array.prototype.forEach.call(steps, function (s) { s.classList.toggle('on', +s.dataset.step === n); });
    Array.prototype.forEach.call(snavs, function (s, i) {
      s.classList.toggle('active', i === n);
      s.classList.toggle('done', i < n);
    });
    btnBack.hidden = n === 0;
    update();
  }
  Array.prototype.forEach.call(snavs, function (s, i) {
    s.addEventListener('click', function () { if (i < state.step) go(i); });
  });

  btnBack.addEventListener('click', function () { go(Math.max(0, state.step - 1)); });
  btnNext.addEventListener('click', function () {
    if (state.step === 0 && !state.prog) { flash(progOpts); return; }
    if (state.step === 1 && !state.city) { flash(cityOpts); return; }
    if (state.step === 3) { submit(); return; }
    go(state.step + 1);
  });
  function flash(el) { el.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 350 }); }

  /* выбор пакета из карточек вылетов и из карточки в герое */
  Array.prototype.forEach.call(document.querySelectorAll('[data-pick]'), function (b) {
    b.addEventListener('click', function () {
      var pr = null;
      PROGRAMS.forEach(function (p) { if (p.id === b.dataset.pick) pr = p; });
      if (pr) { pickProgram(pr); go(1); }
    });
  });

  function submit() {
    var name = $('#fName'), phone = $('#fPhone'), ok = $('#fConsent'), valid = true;
    if (!name.value.trim()) { name.classList.add('err'); valid = false; } else name.classList.remove('err');
    if (phone.value.replace(/\D/g, '').length < 10) { phone.classList.add('err'); valid = false; } else phone.classList.remove('err');
    if (!ok.checked) { flash(ok.parentElement); valid = false; }
    if (!valid) return;

    var tt = total();
    var msg = T('wa.hello') + '\n\n' +
      T('wa.name') + ': ' + name.value.trim() + '\n' +
      T('wa.phone') + ': ' + phone.value.trim() + '\n' +
      T('wa.prog') + ': ' + T(state.prog.t) + '\n' +
      T('wa.city') + ': ' + T(state.city.n) + '\n' +
      T('wa.adults') + ': ' + state.adults + '\n' +
      T('wa.kids') + ': ' + state.kids +
      (tt ? '\n' + T('wa.total') + ': $' + tt.toLocaleString('ru-RU') : '');
    openWA(msg);

    panelWrap.innerHTML =
      '<div class="booked"><div class="seal"><svg class="ic" viewBox="0 0 24 24" style="width:30px;height:30px">' +
      '<path d="M20 6 9 17l-5-5"/></svg></div><h3></h3><p></p><p class="acc"></p><p class="fine"></p></div>';
    panelWrap.querySelector('h3').textContent = T('book.doneH');
    panelWrap.querySelector('.booked p').textContent = T('book.doneP').replace('{name}', name.value.trim());
    var accent = panelWrap.querySelector('.acc');
    accent.style.color = 'var(--gold)'; accent.style.marginTop = '14px';
    accent.textContent = T(state.prog.t) + (tt ? ' · $' + tt.toLocaleString('ru-RU') : '');
    var fine = panelWrap.querySelector('.fine');
    fine.style.cssText = 'font-size:12.5px;margin-top:18px;color:var(--on-night-soft)';
    fine.textContent = T('book.doneFine');
  }

  /* даём переключателю языка перестроить конструктор */
  window.AL_BOOKER = { refresh: function () { buildOptions(); go(state.step); } };

  buildOptions();
  go(0);
})();

/* ---- форма в блоке контактов ---- */
(function () {
  var btn = document.getElementById('cSubmit');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var n = document.getElementById('cName'),
        p = document.getElementById('cPhone'),
        w = document.getElementById('cWish'),
        ok = document.getElementById('cConsent'), valid = true;
    [n, p].forEach(function (f) {
      if (!f.value.trim()) { f.classList.add('err'); valid = false; } else f.classList.remove('err');
    });
    if (!ok.checked) valid = false;
    if (!valid) return;

    var msg = T('wa.hello') + '\n\n' +
      T('wa.name') + ': ' + n.value.trim() + '\n' +
      T('wa.phone') + ': ' + p.value.trim() +
      (w.value.trim() ? '\n' + T('wa.wish') + ': ' + w.value.trim() : '');
    openWA(msg);
    document.getElementById('cDone').style.display = 'block';
    btn.style.display = 'none';
  });
})();

/* ---- год в подвале ---- */
(function () {
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
