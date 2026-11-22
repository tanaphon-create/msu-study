(function () {
  'use strict';
  var SUBJECTS = window.SUBJECTS || [];
  var EXAM = new Date(2027, 1, 7); // 7 ก.พ. 2570
  var KEY = 'msu-study-v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = $('#app');

  /* ---------- state ---------- */
  var st = { done: {}, notes: {}, hl: {}, last: {}, ps: {}, fs: 18, theme: 'auto' };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  /* ---------- helpers ---------- */
  var TH = '๐๑๒๓๔๕๖๗๘๙';
  function th(s) { return String(s).replace(/\d/g, function (d) { return TH[+d]; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function subj(code) { return SUBJECTS.filter(function (s) { return s.code === code; })[0]; }
  function flat(s) {
    if (s._flat) return s._flat;
    var out = [];
    s.units.forEach(function (u) {
      u.sections.forEach(function (sec) {
        sec.topics.forEach(function (t, i) { out.push({ u: u, sec: sec, t: t, first: i === 0 }); });
      });
    });
    return (s._flat = out);
  }
  function key(code, id) { return code + ':' + id; }
  function progress(s, unit) {
    var all = flat(s).filter(function (x) { return !unit || x.u === unit; });
    var d = all.filter(function (x) { return st.done[key(s.code, x.t.id)]; }).length;
    return { d: d, n: all.length, pct: all.length ? Math.round(d / all.length * 100) : 0 };
  }
  function daysLeft() {
    var now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((EXAM - now) / 864e5));
  }

  /* ---------- theme / font ---------- */
  function applyPrefs() {
    var r = document.documentElement;
    r.style.setProperty('--fs', st.fs + 'px');
    if (st.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', st.theme);
  }
  $('#fsUp').onclick = function () { st.fs = Math.min(28, st.fs + 2); applyPrefs(); save(); };
  $('#fsDown').onclick = function () { st.fs = Math.max(14, st.fs - 2); applyPrefs(); save(); };
  $('#themeBtn').onclick = function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (st.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    st.theme = dark ? 'light' : 'dark'; applyPrefs(); save();
  };
  $('#searchForm').onsubmit = function (e) {
    e.preventDefault();
    var q = $('#q').value.trim();
    if (q) location.hash = '#/search/' + encodeURIComponent(q);
  };
  $('#menuBtn').onclick = function () { var s = $('.side'); if (s) { s.classList.toggle('open'); var b = $('#backdrop'); if (b) b.classList.toggle('on', s.classList.contains('open')); } };
  if (!localStorage.getItem(KEY) && Math.min(screen.width, innerWidth) >= 700) st.fs = 21; // iPad/แท็บเล็ต: ตัวอักษรใหญ่ขึ้นเป็นค่าเริ่มต้น

  /* ---------- views ---------- */
  function home() {
    var left = daysLeft();
    var tot = { d: 0, n: 0 };
    SUBJECTS.forEach(function (s) { var p = progress(s); tot.d += p.d; tot.n += p.n; });
    var remain = tot.n - tot.d;
    var perDay = left > 0 ? Math.ceil(remain / Math.max(1, left - 7)) : remain; // เผื่อ 7 วันสุดท้ายไว้ทบทวน
    var html = '<div class="hero">' +
      '<div class="card"><div class="muted small">สอบวันที่ ๗–๘ กุมภาพันธ์ ๒๕๗๐</div>' +
      '<div class="count"><b>' + th(left) + '</b><span>วัน ก่อนวันสอบ</span></div>' +
      '<p class="muted" style="margin:.6em 0 0">' + (remain > 0
        ? 'ยังอ่านไม่ครบ <b>' + th(remain) + '</b> เรื่อง จากทั้งหมด ' + th(tot.n) + ' เรื่อง — ถ้าเว้น ๗ วันสุดท้ายไว้ทบทวน ควรอ่านวันละ <b>' + th(perDay) + '</b> เรื่อง'
        : 'อ่านครบทุกเรื่องแล้ว เหลือแค่ทบทวนและฝึกทำกิจกรรม') + '</p></div>' +
      '<div class="card"><div class="muted small">ความคืบหน้ารวม</div>' +
      '<div class="count"><b>' + th(tot.n ? Math.round(tot.d / tot.n * 100) : 0) + '%</b></div>' +
      '<div class="bar" role="progressbar" aria-valuenow="' + (tot.n ? Math.round(tot.d / tot.n * 100) : 0) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + (tot.n ? tot.d / tot.n * 100 : 0) + '%"></i></div>' +
      '<p class="muted small" style="margin:.6em 0 0">อ่านแล้ว ' + th(tot.d) + ' / ' + th(tot.n) + ' เรื่อง</p></div></div>';
    html += '<h2>วิชาของฉัน</h2><div class="grid">';
    SUBJECTS.forEach(function (s) {
      var p = progress(s);
      var last = st.last[s.code];
      html += '<a class="unit-card" href="#/s/' + s.code + '"><div class="no">' + th(s.code) + '</div><h3>' + esc(s.name) + '</h3>' +
        '<div class="bar"><i style="width:' + p.pct + '%"></i></div>' +
        '<p class="muted small" style="margin:.5em 0 0">' + th(s.units.length) + ' หน่วย · อ่านแล้ว ' + th(p.d) + '/' + th(p.n) + ' เรื่อง' + (last ? ' · ต่อจากเดิมได้' : '') + '</p></a>';
    });
    html += '</div><p class="muted small" style="margin-top:20px">เพิ่มอีก ๒ วิชาได้เมื่อส่งไฟล์มา · ข้อมูลความคืบหน้า โน้ต และไฮไลต์เก็บไว้ในเครื่องนี้ (เบราว์เซอร์) เท่านั้น</p>';
    app.innerHTML = html;
    document.title = 'ติวสอบ มสธ.';
  }

  function subjectView(code) {
    var s = subj(code); if (!s) return notFound();
    var p = progress(s);
    var html = '<div class="crumb"><a href="#/">หน้าแรก</a></div><h1>' + th(s.code) + ' ' + esc(s.name) + '</h1>' +
      '<div class="row"><div class="bar" style="flex:1;min-width:160px"><i style="width:' + p.pct + '%"></i></div><span class="pill">' + th(p.d) + '/' + th(p.n) + ' เรื่อง</span>' +
      (st.last[code] ? '<a class="btn" href="#/s/' + code + '/t/' + st.last[code] + '">▶ อ่านต่อจากเดิม</a>' : '<a class="btn" href="#/s/' + code + '/t/' + flat(s)[0].t.id + '">▶ เริ่มอ่าน</a>') +
      '<a class="btn ghost" href="#/s/' + code + '/emph">🎯 เนื้อหาที่เน้นสอบ</a><a class="btn ghost" href="#/s/' + code + '/quiz">📝 แบบทดสอบ</a>' +
      '<a class="btn ghost" href="#/s/' + code + '/practice">✍ กิจกรรมท้ายเรื่อง</a><a class="btn ghost" href="#/review">⭐ ไฮไลต์และโน้ต</a></div>';
    s.units.forEach(function (u) {
      var up = progress(s, u);
      html += '<details class="unit"' + (up.d && up.d < up.n ? ' open' : '') + '><summary><span class="pill' + (up.d === up.n ? ' ok' : '') + '">หน่วย ' + th(u.no) + '</span><span class="t">' + esc(u.title) + '</span><span class="muted small">' + th(up.d) + '/' + th(up.n) + '</span></summary><div class="body">';
      if (u.overview && u.overview.length) {
        html += '<details class="intro"><summary>แนวคิดและวัตถุประสงค์ของหน่วย</summary>' + blocks(u.overview) + '</details>';
      }
      u.sections.forEach(function (sec) {
        html += '<div class="sec-t">ตอนที่ ' + th(sec.id) + ' ' + esc(sec.title) + '</div><div class="toc">';
        sec.topics.forEach(function (t) {
          var dn = st.done[key(code, t.id)];
          html += '<a href="#/s/' + code + '/t/' + t.id + '"><span class="chk">' + (dn ? '✓' : '') + '</span><span class="id">' + th(t.id) + '</span><span>' + esc(t.title) + '</span></a>';
        });
        html += '</div>';
      });
      html += '</div></details>';
    });
    app.innerHTML = html;
    document.title = s.name + ' · ติวสอบ มสธ.';
  }

  function blocks(arr, hlList) {
    return arr.map(function (b) {
      if (b.t === 'h') return '<h4>' + hlText(b.x, hlList) + '</h4>';
      return '<p>' + hlText(b.x, hlList) + '</p>';
    }).join('');
  }
  function hlText(txt, list) {
    var h = esc(txt);
    (list || []).forEach(function (w) {
      var e = esc(w); if (!e) return;
      var i = h.indexOf(e);
      if (i >= 0) h = h.slice(0, i) + '<mark class="hl">' + e + '</mark>' + h.slice(i + e.length);
    });
    return h;
  }

  function topicView(code, id) {
    var s = subj(code); if (!s) return notFound();
    var list = flat(s);
    var idx = -1;
    list.forEach(function (x, i) { if (x.t.id === id) idx = i; });
    if (idx < 0) return notFound();
    var cur = list[idx], t = cur.t, u = cur.u, sec = cur.sec;
    st.last[code] = id; save();
    var k = key(code, id);
    var hls = st.hl[k] || [];
    var dn = !!st.done[k];

    var toc = '<aside class="card side" aria-label="สารบัญ"><div class="muted small">หน่วย ' + th(u.no) + '</div><div style="font-weight:700;margin-bottom:6px">' + esc(u.title) + '</div>';
    u.sections.forEach(function (sc) {
      toc += '<div class="sec-t small">ตอนที่ ' + th(sc.id) + ' ' + esc(sc.title) + '</div><div class="toc">';
      sc.topics.forEach(function (tp) {
        toc += '<a class="' + (tp.id === id ? 'cur' : '') + '" href="#/s/' + code + '/t/' + tp.id + '"><span class="chk">' + (st.done[key(code, tp.id)] ? '✓' : '') + '</span><span class="id">' + th(tp.id) + '</span><span>' + esc(tp.title) + '</span></a>';
      });
      toc += '</div>';
    });
    toc += '<p style="margin-top:14px"><a href="#/s/' + code + '">← ทุกหน่วย</a></p></aside>';

    var body = '<article class="card article"><div class="crumb"><a href="#/s/' + code + '">' + esc(s.name) + '</a> › หน่วย ' + th(u.no) + ' › ตอนที่ ' + th(sec.id) + '</div>' +
      '<h1>' + th(t.id) + ' ' + esc(t.title) + '</h1>';
    if (cur.first && sec.intro && sec.intro.length) {
      body += '<details class="intro"><summary>แนวคิดและวัตถุประสงค์ของตอนที่ ' + th(sec.id) + ' — ' + esc(sec.title) + '</summary>' + blocks(sec.intro) + '</details>';
    }
    var ks = (window.KEYS && window.KEYS[code] && window.KEYS[code][id]) || [];
    var uq = qsOf(code).filter(function (q) { return q.t === id; }).length;
    var sumHtml = '';
    if (ks.length) {
      sumHtml += '<section class="keybox"><h2>🎯 สรุปท้ายเรื่อง <span class="muted small">(ประโยคสำคัญดึงอัตโนมัติจากเนื้อหา)</span></h2><ul>' +
        ks.map(function (k) { return '<li>' + hlText(k, []) + '</li>'; }).join('') + '</ul>' +
        (uq ? '<a class="btn small-btn" href="#/s/' + code + '/quiz/t/' + id + '">📝 ทำข้อสอบเรื่องนี้ (' + th(uq) + ' ข้อ)</a>' : '') + '</section>';
    }
    var lastOfUnit = !list[idx + 1] || list[idx + 1].u !== u;
    var uz = (window.QZ || {})[u.no];
    if (lastOfUnit && uz) {
      sumHtml += '<section class="keybox unitsum"><h2>📌 สรุปท้ายหน่วยที่ ' + th(u.no) + ' — ' + esc(u.title) + '</h2><ol class="emph">' +
        uz.emph.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ol>' +
        '<a class="btn small-btn" href="#/s/' + code + '/quiz/u/' + u.no + '">📝 ทำข้อสอบหน่วยนี้ (' + th(uz.qs.length) + ' ข้อ)</a></section>';
    }
    body += '<div class="rd" id="rd">';
    var acts = '';
    t.blocks.forEach(function (b) {
      if (b.t === 'act') {
        var title = b.x[0] ? b.x[0].x : 'กิจกรรม';
        acts += '<section class="act"><h3>' + esc(th(title)) + '</h3>' + blocks(b.x.slice(1)) + '<div data-ans></div></section>';
      } else if (b.t === 'ans') {
        var a = '<details class="ans"><summary>ดูแนวตอบ</summary>' + blocks(b.x.slice(1)) + '</details>';
        if (acts.indexOf('<div data-ans></div>') >= 0) acts = acts.replace('<div data-ans></div>', a);
        else acts += '<section class="act">' + a + '</section>';
      } else {
        body += (b.t === 'h' ? '<h4>' + hlText(b.x, hls) + '</h4>' : '<p>' + hlText(b.x, hls) + '</p>');
      }
    });
    body += '</div>' + acts.replace('<div data-ans></div>', '') + sumHtml;

    var prev = list[idx - 1], next = list[idx + 1];
    body += '<div class="nav"><div>' + (prev ? '<a class="btn ghost" href="#/s/' + code + '/t/' + prev.t.id + '">← ' + th(prev.t.id) + '</a>' : '') + '</div>' +
      '<button class="btn ' + (dn ? 'ok' : '') + '" id="doneBtn">' + (dn ? '✓ อ่านแล้ว (กดเพื่อยกเลิก)' : 'ทำเครื่องหมายว่าอ่านแล้ว') + '</button>' +
      '<div>' + (next ? '<a class="btn" href="#/s/' + code + '/t/' + next.t.id + '">' + th(next.t.id) + ' →</a>' : '') + '</div></div>' +
      '<div class="notes" style="margin-top:22px"><h2 style="margin-top:0">โน้ตของฉัน</h2><textarea id="note" placeholder="จดประเด็นที่ต้องจำ ข้อที่ยังสงสัย…">' + esc(st.notes[k] || '') + '</textarea>' +
      '<p class="muted small">เลือกข้อความในเนื้อหาแล้วกด “ไฮไลต์” เพื่อเก็บไว้ทบทวน · ไฮไลต์ที่เก็บไว้: ' + th(hls.length) + ' รายการ</p></div></article>';

    var snav = '<nav class="stickynav" aria-label="ไปเรื่องก่อนหน้า/ถัดไป">' +
      (prev ? '<a class="btn ghost" href="#/s/' + code + '/t/' + prev.t.id + '">← ก่อนหน้า</a>' : '<span></span>') +
      '<button class="btn ' + (dn ? 'ok' : '') + '" id="doneBtn2">' + (dn ? '✓ อ่านแล้ว' : 'อ่านแล้ว') + '</button>' +
      (next ? '<a class="btn" href="#/s/' + code + '/t/' + next.t.id + '">ถัดไป →</a>' : '<span></span>') + '</nav>';
    app.innerHTML = '<div class="reader">' + toc + body + '</div><div class="backdrop" id="backdrop"></div>' + snav;
    $('#menuBtn').hidden = false;
    $('#backdrop').onclick = function () { $('.side').classList.remove('open'); $('#backdrop').classList.remove('on'); };
    $('#doneBtn2').onclick = function () { $('#doneBtn').click(); };
    (function () {
      var x0, y0;
      var rdEl = $('#rd');
      rdEl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      rdEl.addEventListener('touchend', function (e) {
        if (x0 == null) return;
        var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (getSelection().toString()) return;
        if (Math.abs(dx) > 110 && Math.abs(dy) < 50) {
          var tgt = dx < 0 ? next : prev;
          if (tgt) location.hash = '#/s/' + code + '/t/' + tgt.t.id;
        }
      }, { passive: true });
    })();
    document.title = th(t.id) + ' ' + t.title + ' · ติวสอบ มสธ.';
    window.scrollTo(0, 0);
    $('#doneBtn').onclick = function () { if (st.done[k]) delete st.done[k]; else st.done[k] = true; save(); topicView(code, id); };
    $('#note').oninput = function () { st.notes[k] = this.value; save(); };
    var cl = $('.side a.cur'); if (cl && cl.scrollIntoView) cl.scrollIntoView({ block: 'center' });
    document.querySelectorAll('.side a').forEach(function (a) { a.addEventListener('click', function () { $('.side').classList.remove('open'); }); });
  }

  /* highlight selection */
  var hb = document.createElement('button');
  hb.className = 'hlbtn'; hb.textContent = '⭐ ไฮไลต์'; document.body.appendChild(hb);
  var selText = '';
  document.addEventListener('selectionchange', function () {
    var sel = getSelection();
    var rd = $('#rd');
    if (!rd || !sel || sel.isCollapsed || !rd.contains(sel.anchorNode)) { hb.style.display = 'none'; return; }
    selText = sel.toString().replace(/\s+/g, ' ').trim();
    if (selText.length < 3) { hb.style.display = 'none'; return; }
    var r = sel.getRangeAt(0).getBoundingClientRect();
    hb.style.display = 'block';
    hb.style.top = Math.max(70, r.top - 44) + 'px';
    hb.style.left = Math.min(innerWidth - 110, Math.max(8, r.left)) + 'px';
  });
  hb.addEventListener('mousedown', function (e) { e.preventDefault(); });
  hb.onclick = function () {
    var m = location.hash.match(/^#\/s\/([^/]+)\/t\/(.+)$/);
    if (!m || !selText) return;
    var k = key(m[1], m[2]);
    (st.hl[k] = st.hl[k] || []).push(selText); save();
    hb.style.display = 'none'; getSelection().removeAllRanges();
    topicView(m[1], m[2]);
  };

  function reviewView() {
    var html = '<div class="crumb"><a href="#/">หน้าแรก</a></div><h1>ไฮไลต์และโน้ตของฉัน</h1>';
    var n = 0;
    SUBJECTS.forEach(function (s) {
      flat(s).forEach(function (x) {
        var k = key(s.code, x.t.id), h = st.hl[k] || [], note = st.notes[k];
        if (!h.length && !note) return;
        n++;
        html += '<div class="card" style="margin:12px 0"><a href="#/s/' + s.code + '/t/' + x.t.id + '"><b>' + th(x.t.id) + ' ' + esc(x.t.title) + '</b></a>';
        h.forEach(function (w, i) { html += '<div class="hl-item"><mark class="hl">' + esc(w) + '</mark><button data-k="' + k + '" data-i="' + i + '" aria-label="ลบไฮไลต์">✕</button></div>'; });
        if (note) html += '<p class="muted" style="white-space:pre-wrap;margin-bottom:0">📝 ' + esc(note) + '</p>';
        html += '</div>';
      });
    });
    if (!n) html += '<p class="muted">ยังไม่มีไฮไลต์หรือโน้ต — เลือกข้อความในหน้าอ่านแล้วกด “ไฮไลต์” ได้เลย</p>';
    app.innerHTML = html;
    app.querySelectorAll('.hl-item button').forEach(function (b) {
      b.onclick = function () { st.hl[b.dataset.k].splice(+b.dataset.i, 1); save(); reviewView(); };
    });
  }

  /* practice: all activities with answers */
  function practiceView(code) {
    var s = subj(code); if (!s) return notFound();
    var unit = st.ps[code] || 'all';
    var html = '<div class="crumb"><a href="#/s/' + code + '">' + esc(s.name) + '</a> › ฝึกทำกิจกรรม</div><h1>ฝึกทำกิจกรรม</h1>' +
      '<p class="muted">โจทย์กิจกรรมท้ายเรื่องจากเอกสารการสอน — คิดคำตอบเองก่อน แล้วค่อยกด “ดูแนวตอบ”</p>' +
      '<div class="q-ctl"><select id="unitSel" aria-label="เลือกหน่วย"><option value="all">ทุกหน่วย</option>' +
      s.units.map(function (u) { return '<option value="' + u.no + '"' + (String(u.no) === String(unit) ? ' selected' : '') + '>หน่วย ' + th(u.no) + ' ' + esc(u.title) + '</option>'; }).join('') +
      '</select><button class="btn ghost" id="shuf">🔀 สุ่มลำดับ</button></div><div id="plist"></div>';
    app.innerHTML = html;
    var items = [];
    flat(s).forEach(function (x) {
      if (unit !== 'all' && String(x.u.no) !== String(unit)) return;
      var a = x.t.blocks.filter(function (b) { return b.t === 'act'; })[0];
      var n = x.t.blocks.filter(function (b) { return b.t === 'ans'; })[0];
      if (a) items.push({ x: x, a: a, n: n });
    });
    function draw() {
      $('#plist').innerHTML = items.map(function (it) {
        return '<section class="act"><h3>' + th(it.x.t.id) + ' ' + esc(it.x.t.title) + '</h3>' + blocks(it.a.x.slice(1)) +
          (it.n ? '<details class="ans"><summary>ดูแนวตอบ</summary>' + blocks(it.n.x.slice(1)) + '</details>' : '') +
          '<p class="small" style="margin:8px 0 0"><a href="#/s/' + code + '/t/' + it.x.t.id + '">เปิดเนื้อหาเรื่องนี้ →</a></p></section>';
      }).join('') || '<p class="muted">ไม่มีกิจกรรม</p>';
    }
    draw();
    $('#unitSel').onchange = function () { st.ps[code] = this.value; save(); practiceView(code); };
    $('#shuf').onclick = function () { items.sort(function () { return Math.random() - .5; }); draw(); };
    document.title = 'ฝึกทำกิจกรรม · ติวสอบ มสธ.';
  }

  /* search */
  var index = null;
  function buildIndex() {
    index = [];
    SUBJECTS.forEach(function (s) {
      flat(s).forEach(function (x) {
        var push = function (txt) { if (txt) index.push({ s: s, x: x, txt: txt }); };
        x.t.blocks.forEach(function (b) {
          if (typeof b.x === 'string') push(b.x);
          else b.x.forEach(function (c) { push(c.x); });
        });
      });
    });
  }
  function searchView(q) {
    if (!index) buildIndex();
    $('#q').value = q;
    var needle = q.replace(/\s+/g, ' ').trim();
    var res = [], total = 0;
    index.forEach(function (r) {
      var i = r.txt.indexOf(needle);
      if (i >= 0) { total++; if (res.length < 80) res.push({ r: r, i: i }); }
    });
    var html = '<div class="crumb"><a href="#/">หน้าแรก</a></div><h1>ผลค้นหา “' + esc(needle) + '”</h1><p class="muted">พบ ' + th(total) + ' ย่อหน้า' + (total > 80 ? ' (แสดง ๘๐ รายการแรก)' : '') + '</p>';
    res.forEach(function (o) {
      var t = o.r.txt, a = Math.max(0, o.i - 70), b = Math.min(t.length, o.i + needle.length + 130);
      var sn = (a ? '…' : '') + esc(t.slice(a, o.i)) + '<mark>' + esc(t.slice(o.i, o.i + needle.length)) + '</mark>' + esc(t.slice(o.i + needle.length, b)) + (b < t.length ? '…' : '');
      html += '<div class="res"><div class="where">หน่วย ' + th(o.r.x.u.no) + ' · ' + th(o.r.x.t.id) + ' ' + esc(o.r.x.t.title) + '</div><p>' + sn + '</p><a class="small" href="#/s/' + o.r.s.code + '/t/' + o.r.x.t.id + '">เปิดอ่าน →</a></div>';
    });
    if (!total) html += '<p>ไม่พบคำนี้ ลองใช้คำสั้นลงหรือสะกดอีกแบบ (ตัวเลขในหนังสือเป็นเลขไทย เช่น ๒๔๗๕)</p>';
    app.innerHTML = html;
    document.title = 'ค้นหา ' + needle + ' · ติวสอบ มสธ.';
  }

  /* ---------- emphasis + quiz ---------- */
  function qsOf(code) {
    var out = [];
    var Z = window.QZ || {};
    Object.keys(Z).forEach(function (u) {
      Z[u].qs.forEach(function (q, i) {
        out.push({ id: u + '-' + i, u: +u, t: q.t, q: q.q, c: q.c, a: q.a, e: q.e });
      });
    });
    return out;
  }
  function topicTitle(s, id) {
    var r = flat(s).filter(function (x) { return x.t.id === id; })[0];
    return r ? r.t.title : '';
  }

  function emphView(code) {
    var s = subj(code); if (!s) return notFound();
    var Z = window.QZ || {};
    var html = '<div class="crumb"><a href="#/s/' + code + '">' + esc(s.name) + '</a> › เนื้อหาที่เน้นสอบ</div><h1>เนื้อหาที่เน้นสอบ</h1>' +
      '<p class="muted">สรุปประเด็นที่ต้องจำให้ได้ของแต่ละหน่วย — ย่อจากเอกสารการสอนโดยตรง (ตัวเลข ปี พ.ศ. และรายการต่างๆ ตรงกับหนังสือ) ใช้อ่านทวนก่อนทำแบบทดสอบ</p>' +
      '<div class="row" style="margin:8px 0 18px"><a class="btn" href="#/s/' + code + '/quiz">📝 ไปทำแบบทดสอบ</a></div>';
    s.units.forEach(function (u) {
      var z = Z[u.no]; if (!z) return;
      html += '<details class="unit"' + (u.no === 1 ? ' open' : '') + '><summary><span class="pill">หน่วย ' + th(u.no) + '</span><span class="t">' + esc(u.title) + '</span><span class="muted small">' + th(z.emph.length) + ' ประเด็น</span></summary><div class="body"><ol class="emph">' +
        z.emph.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ol>' +
        '<a class="btn small-btn" href="#/s/' + code + '/quiz/u/' + u.no + '">📝 ทำข้อสอบหน่วย ' + th(u.no) + ' (' + th(z.qs.length) + ' ข้อ)</a></div></details>';
    });
    app.innerHTML = html;
    document.title = 'เนื้อหาที่เน้น · ติวสอบ มสธ.';
  }

  var run = null;
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function quizMenu(code) {
    var s = subj(code); if (!s) return notFound();
    var all = qsOf(code);
    var wrong = all.filter(function (q) { var r = st.qs && st.qs[code + ':' + q.id]; return r && r.last === false; });
    var done = all.filter(function (q) { return st.qs && st.qs[code + ':' + q.id]; }).length;
    var html = '<div class="crumb"><a href="#/s/' + code + '">' + esc(s.name) + '</a> › แบบทดสอบ</div><h1>แบบทดสอบ</h1>' +
      '<p class="muted">ข้อสอบปรนัย ๔ ตัวเลือก มีคำอธิบายเพิ่มเติมทุกข้อ ลำดับตัวเลือกสุ่มใหม่ทุกครั้ง · ทำไปแล้ว ' + th(done) + ' / ' + th(all.length) + ' ข้อ · ที่ยังตอบผิดล่าสุด ' + th(wrong.length) + ' ข้อ</p>' +
      '<div class="grid" style="margin:14px 0">' +
      '<div class="card"><h3 style="margin-top:0">🎲 สอบจำลองทุกหน่วย</h3><p class="muted small">สุ่มจากทั้งชุดวิชา</p><div class="chips" id="mockN">' +
      [20, 40, 60].map(function (n) { return '<button class="chip" data-n="' + n + '">' + th(n) + ' ข้อ</button>'; }).join('') + '</div></div>' +
      '<div class="card"><h3 style="margin-top:0">🔁 ทบทวนข้อที่ผิด</h3><p class="muted small">' + (wrong.length ? 'มี ' + th(wrong.length) + ' ข้อที่ยังตอบผิดล่าสุด' : 'ยังไม่มีข้อที่ผิด') + '</p><button class="btn" id="wrongBtn"' + (wrong.length ? '' : ' disabled style="opacity:.5"') + '>เริ่มทบทวน</button></div>' +
      '</div><h2>เลือกทำทีละหน่วย</h2><div class="grid">';
    s.units.forEach(function (u) {
      var z = (window.QZ || {})[u.no]; if (!z) return;
      var d = z.qs.filter(function (q, i) { return st.qs && st.qs[code + ':' + u.no + '-' + i]; }).length;
      html += '<a class="unit-card" href="#/s/' + code + '/quiz/u/' + u.no + '"><div class="no">หน่วย ' + th(u.no) + '</div><h3>' + esc(u.title) + '</h3><div class="bar"><i style="width:' + (z.qs.length ? d / z.qs.length * 100 : 0) + '%"></i></div><p class="muted small" style="margin:.5em 0 0">' + th(z.qs.length) + ' ข้อ · ทำแล้ว ' + th(d) + '</p></a>';
    });
    html += '</div>';
    app.innerHTML = html;
    document.querySelectorAll('#mockN .chip').forEach(function (b) {
      b.onclick = function () { startQuiz(code, shuffle(all.slice()).slice(0, +b.dataset.n), 'สอบจำลอง ' + th(b.dataset.n) + ' ข้อ'); };
    });
    var wb = $('#wrongBtn'); if (wb && wrong.length) wb.onclick = function () { startQuiz(code, shuffle(wrong.slice()), 'ทบทวนข้อที่ผิด'); };
    document.title = 'แบบทดสอบ · ติวสอบ มสธ.';
  }

  function startQuiz(code, items, title) {
    if (!items.length) { quizMenu(code); return; }
    run = {
      code: code, title: title, i: 0, score: 0, wrong: [],
      items: items.map(function (q) {
        var order = shuffle([0, 1, 2, 3]);
        return { q: q, order: order, picked: null };
      })
    };
    drawQ();
  }

  function drawQ() {
    var s = subj(run.code), it = run.items[run.i], q = it.q;
    var total = run.items.length;
    var html = '<div class="crumb"><a href="#/s/' + run.code + '/quiz">แบบทดสอบ</a> › ' + esc(run.title) + '</div>' +
      '<div class="row" style="margin-bottom:10px"><div class="bar" style="flex:1"><i style="width:' + (run.i / total * 100) + '%"></i></div><span class="pill">ข้อ ' + th(run.i + 1) + ' / ' + th(total) + '</span><span class="pill ok">ถูก ' + th(run.score) + '</span></div>' +
      '<div class="card qcard"><div class="muted small">หน่วย ' + th(q.u) + ' · เรื่อง ' + th(q.t) + ' ' + esc(topicTitle(s, q.t)) + '</div>' +
      '<h2 style="margin:.4em 0 .8em;font-size:1.2rem;line-height:1.6">' + esc(q.q) + '</h2><div class="choices">';
    it.order.forEach(function (orig, pos) {
      html += '<button class="choice" data-pos="' + pos + '"><span class="lt">' + 'กขคง'[pos] + '</span><span>' + esc(q.c[orig]) + '</span></button>';
    });
    html += '</div><div id="fb"></div></div>';
    app.innerHTML = html;
    window.scrollTo(0, 0);
    document.querySelectorAll('.choice').forEach(function (b) { b.onclick = function () { answerQ(+b.dataset.pos); }; });
  }

  function answerQ(pos) {
    var it = run.items[run.i]; if (it.picked !== null) return;
    var q = it.q; it.picked = pos;
    var ok = it.order[pos] === q.a;
    if (ok) run.score++; else run.wrong.push(it);
    st.qs = st.qs || {};
    var k = run.code + ':' + q.id, r = st.qs[k] || { r: 0, w: 0 };
    if (ok) r.r++; else r.w++; r.last = ok; st.qs[k] = r; save();
    document.querySelectorAll('.choice').forEach(function (b) {
      var p = +b.dataset.pos; b.disabled = true;
      if (it.order[p] === q.a) b.classList.add('right');
      else if (p === pos) b.classList.add('bad');
    });
    var last = run.i === run.items.length - 1;
    $('#fb').innerHTML = '<div class="fb ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? '✓ ถูกต้อง' : '✗ ยังไม่ถูก — คำตอบคือข้อ ' + 'กขคง'[it.order.indexOf(q.a)]) + '</b>' +
      '<div class="expl"><b>อธิบายเพิ่มเติม:</b> ' + esc(q.e) + '</div>' +
      '<div class="row" style="margin-top:10px"><a class="small" href="#/s/' + run.code + '/t/' + q.t + '" target="_blank" rel="noopener">เปิดอ่านเนื้อหาเรื่อง ' + th(q.t) + ' ↗</a></div>' +
      '<button class="btn" id="nextQ" style="margin-top:12px">' + (last ? 'ดูผลคะแนน' : 'ข้อต่อไป →') + '</button></div>';
    $('#nextQ').onclick = function () { run.i++; if (run.i >= run.items.length) resultQ(); else drawQ(); };
    $('#nextQ').focus();
  }

  function resultQ() {
    var n = run.items.length, pct = Math.round(run.score / n * 100);
    var html = '<div class="crumb"><a href="#/s/' + run.code + '/quiz">แบบทดสอบ</a> › ผลคะแนน</div><div class="card" style="text-align:center"><div class="muted">' + esc(run.title) + '</div>' +
      '<div class="count" style="justify-content:center"><b>' + th(run.score) + ' / ' + th(n) + '</b></div><p style="font-size:1.1rem">' + th(pct) + '% — ' +
      (pct >= 80 ? 'ยอดเยี่ยม! ' : pct >= 60 ? 'ผ่านเกณฑ์ ทบทวนข้อที่ผิดอีกนิด' : 'ควรกลับไปอ่าน “เนื้อหาที่เน้น” ของหน่วยนี้อีกรอบ') + '</p>' +
      '<div class="row" style="justify-content:center">' +
      (run.wrong.length ? '<button class="btn" id="retryW">🔁 ทำซ้ำเฉพาะข้อที่ผิด (' + th(run.wrong.length) + ')</button>' : '') +
      '<a class="btn ghost" href="#/s/' + run.code + '/quiz">เลือกชุดอื่น</a></div></div>';
    if (run.wrong.length) {
      html += '<h2>ข้อที่ตอบผิด</h2>';
      run.wrong.forEach(function (it) {
        var q = it.q;
        html += '<div class="card" style="margin:10px 0"><div class="muted small">หน่วย ' + th(q.u) + ' · ' + th(q.t) + '</div><p style="margin:.3em 0"><b>' + esc(q.q) + '</b></p>' +
          '<p style="margin:.3em 0;color:var(--ok)">✓ ' + esc(q.c[q.a]) + '</p><p class="muted small" style="margin:.3em 0">' + esc(q.e) + '</p><a class="small" href="#/s/' + run.code + '/t/' + q.t + '">เปิดอ่านเรื่องนี้ →</a></div>';
      });
    }
    app.innerHTML = html;
    window.scrollTo(0, 0);
    var rb = $('#retryW'); if (rb) rb.onclick = function () { startQuiz(run.code, shuffle(run.wrong.map(function (x) { return x.q; })), 'ทำซ้ำข้อที่ผิด'); };
  }

  function notFound() { app.innerHTML = '<div class="card"><h1>ไม่พบหน้านี้</h1><a class="btn" href="#/">กลับหน้าแรก</a></div>'; }

  /* ---------- router ---------- */
  function route() {
    var h = location.hash || '#/';
    $('#menuBtn').hidden = true;
    var m;
    if ((m = h.match(/^#\/s\/([^/]+)\/t\/(.+)$/))) topicView(m[1], m[2]);
    else if ((m = h.match(/^#\/s\/([^/]+)\/practice$/))) practiceView(m[1]);
    else if ((m = h.match(/^#\/s\/([^/]+)\/emph$/))) emphView(m[1]);
    else if ((m = h.match(/^#\/s\/([^/]+)\/quiz\/u\/(\d+)$/))) {
      var qa = qsOf(m[1]).filter(function (q) { return q.u === +m[2]; });
      startQuiz(m[1], shuffle(qa), 'หน่วย ' + th(m[2]));
    }
    else if ((m = h.match(/^#\/s\/([^/]+)\/quiz\/t\/(.+)$/))) {
      var tid = m[2];
      startQuiz(m[1], shuffle(qsOf(m[1]).filter(function (q) { return q.t === tid; })), 'เรื่อง ' + th(tid));
    }
    else if ((m = h.match(/^#\/s\/([^/]+)\/quiz$/))) quizMenu(m[1]);
    else if ((m = h.match(/^#\/s\/([^/]+)$/))) subjectView(m[1]);
    else if ((m = h.match(/^#\/search\/(.+)$/))) searchView(decodeURIComponent(m[1]));
    else if (h === '#/review') reviewView();
    else home();
    if (!/^#\/s\/[^/]+\/t\//.test(h)) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  applyPrefs();
  route();
})();
