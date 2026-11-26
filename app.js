(function () {
  'use strict';
  var SUBJECTS = window.SUBJECTS || [];
  var EXAM = new Date(2027, 1, 7); // 7 ก.พ. 2570
  var KEY = 'msu-study-v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = $('#app');

  /* ---------- state ---------- */
  var st = { done: {}, notes: {}, hl: {}, last: {}, ps: {}, fs: 18, theme: 'auto', bm: {}, fc: {}, lh: 0, ink: {} };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  Object.keys(st.hl || {}).forEach(function (k) { st.hl[k] = st.hl[k].map(function (w) { return typeof w === 'string' ? { t: w, n: '' } : w; }); });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  /* ---------- helpers ---------- */
  var TH = '๐๑๒๓๔๕๖๗๘๙';
  function th(s) { return String(s).replace(/\d/g, function (d) { return TH[+d]; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function qz(code) { return (window.QZS || {})[code] || {}; }
  function curSubj() { return subj(st.cur) || SUBJECTS[0]; }
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
    var html = subjSwitch() + quickActions() + '<div class="hero">' +
      '<div class="card"><div class="muted small">สอบวันที่ ๗–๘ กุมภาพันธ์ ๒๕๗๐</div>' +
      '<div class="count"><b>' + th(left) + '</b><span>วัน ก่อนวันสอบ</span></div>' +
      '<p class="muted" style="margin:.6em 0 0">' + (remain > 0
        ? 'ยังอ่านไม่ครบ <b>' + th(remain) + '</b> เรื่อง จากทั้งหมด ' + th(tot.n) + ' เรื่อง — ถ้าเว้น ๗ วันสุดท้ายไว้ทบทวน ควรอ่านวันละ <b>' + th(perDay) + '</b> เรื่อง'
        : 'อ่านครบทุกเรื่องแล้ว เหลือแค่ทบทวนและฝึกทำกิจกรรม') + '</p></div>' +
      '<div class="card"><div class="muted small">ความคืบหน้ารวม</div>' +
      '<div class="count"><b>' + th(tot.n ? Math.round(tot.d / tot.n * 100) : 0) + '%</b></div>' +
      '<div class="bar" role="progressbar" aria-valuenow="' + (tot.n ? Math.round(tot.d / tot.n * 100) : 0) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + (tot.n ? tot.d / tot.n * 100 : 0) + '%"></i></div>' +
      '<p class="muted small" style="margin:.6em 0 0">อ่านแล้ว ' + th(tot.d) + ' / ' + th(tot.n) + ' เรื่อง</p></div></div>';
    html += todayCard(perDay);
    html += '<h2>วิชาของฉัน</h2><div class="grid">';
    SUBJECTS.forEach(function (s) {
      var p = progress(s);
      var last = st.last[s.code];
      html += '<a class="unit-card" href="#/s/' + s.code + '"><div class="no">' + th(s.code) + '</div><h3>' + esc(s.name) + '</h3>' +
        '<div class="bar"><i style="width:' + p.pct + '%"></i></div>' +
        '<p class="muted small" style="margin:.5em 0 0">' + th(s.units.length) + ' หน่วย · อ่านแล้ว ' + th(p.d) + '/' + th(p.n) + ' เรื่อง' + (last ? ' · ต่อจากเดิมได้' : '') + '</p></a>';
    });
    html += '</div><p class="muted small" style="margin-top:20px">ข้อมูลความคืบหน้า โน้ต และไฮไลต์เก็บไว้ในเครื่องนี้ (เบราว์เซอร์) เท่านั้น</p>';
    html += backupBox();
    app.innerHTML = html;
    document.title = 'ติวสอบ มสธ.';
    bindBackup();
    document.querySelectorAll('[data-sw]').forEach(function (b) { b.onclick = function () { st.cur = b.dataset.sw; save(); home(); updateTabs('#/'); }; });
  }

  function subjectView(code) {
    var s = subj(code); if (!s) return notFound();
    var p = progress(s);
    var html = '<div class="crumb"><a href="#/">หน้าแรก</a></div><h1>' + th(s.code) + ' ' + esc(s.name) + '</h1>' +
      '<div class="row"><div class="bar" style="flex:1;min-width:160px"><i style="width:' + p.pct + '%"></i></div><span class="pill">' + th(p.d) + '/' + th(p.n) + ' เรื่อง</span>' +
      (st.last[code] ? '<a class="btn" href="#/s/' + code + '/t/' + st.last[code] + '">▶ อ่านต่อจากเดิม</a>' : '<a class="btn" href="#/s/' + code + '/t/' + flat(s)[0].t.id + '">▶ เริ่มอ่าน</a>') +
      '<a class="btn ghost" href="#/s/' + code + '/cards">🃏 แฟลชการ์ด</a><a class="btn ghost" href="#/s/' + code + '/emph">🎯 เนื้อหาที่เน้นสอบ</a><a class="btn ghost" href="#/s/' + code + '/quiz">📝 แบบทดสอบ</a>' +
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
    (list || []).forEach(function (w, wi) {
      var e = esc(w.t); if (!e) return;
      var i = h.indexOf(e);
      if (i >= 0) h = h.slice(0, i) + '<mark class="hl' + (w.n ? ' hn' : '') + '" data-i="' + wi + '">' + e + '</mark>' + h.slice(i + e.length);
    });
    return h;
  }

  function topicView(code, id, keep) {
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
      '<h1>' + th(t.id) + ' ' + esc(t.title) + '</h1>' +
      '<div class="rtools"><span class="pill">⏱ ประมาณ ' + th(Math.max(1, Math.round(t.blocks.reduce(function (a, b) { return a + (typeof b.x === 'string' ? b.x.length : 0); }, 0) / 800))) + ' นาที</span>' +
      '<button class="chip" id="bmBtn" aria-pressed="' + !!st.bm[key(code, id)] + '">' + (st.bm[key(code, id)] ? '★ บุ๊กมาร์กแล้ว' : '☆ บุ๊กมาร์ก') + '</button>' +
      '<button class="chip" id="ttsBtn">🔊 ฟังเสียงอ่าน</button>' +
      '<select id="ttsRate" aria-label="ความเร็วเสียง"><option value="0.8">ช้า</option><option value="1" selected>ปกติ</option><option value="1.25">เร็ว</option></select>' +
      '<button class="chip" id="inkBtn">✏️ เขียนด้วยปากกา</button>' +
      '<details class="moretools"><summary class="chip">⚙ ปรับการอ่าน</summary><div class="morebox">' +
      '<button class="chip" id="focusBtn">🧘 โหมดโฟกัส</button>' +
      '<select id="lhSel" aria-label="ระยะบรรทัด"><option value="0">บรรทัดมาตรฐาน</option><option value="1">บรรทัดห่าง</option><option value="2">ห่างมาก</option></select></div></details></div>';
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
    var uz = qz(code)[u.no];
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
      '<p class="muted small">เลือกข้อความแล้วกด “ไฮไลต์” หรือ “โน้ต” · แตะข้อความที่ไฮไลต์เพื่อเขียน/แก้โน้ตหรือลบ · ไฮไลต์ในเรื่องนี้: ' + th(hls.length) + ' รายการ</p></div></article>';

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
    if (!keep) window.scrollTo(0, 0);
    $('#doneBtn').onclick = function () { if (st.done[k]) delete st.done[k]; else st.done[k] = true; save(); rerender(code, id); };
    bindTools(code, id, k);
    $('#rd').addEventListener('click', function (e) {
      var m = e.target.closest && e.target.closest('mark.hl');
      if (m && m.dataset.i !== undefined) openNote(code, id, +m.dataset.i);
    });
    $('#note').oninput = function () { st.notes[k] = this.value; save(); };
    var cl = $('.side a.cur'); if (cl && !keep) { var sd = $('.side'); sd.scrollTop = cl.offsetTop - sd.clientHeight / 2; }
    document.querySelectorAll('.side a').forEach(function (a) { a.addEventListener('click', function () { $('.side').classList.remove('open'); }); });
  }

  /* highlight selection */
  var hb = document.createElement('div');
  hb.className = 'hlbtn';
  hb.innerHTML = '<button data-act="hl">⭐ ไฮไลต์</button><button data-act="note">✏️ โน้ต</button>';
  document.body.appendChild(hb);
  var selText = '';
  document.addEventListener('selectionchange', function () {
    var sel = getSelection();
    var rd = $('#rd');
    if (!rd || !sel || sel.isCollapsed || !rd.contains(sel.anchorNode)) { hb.style.display = 'none'; return; }
    selText = sel.toString().replace(/\s+/g, ' ').trim();
    if (selText.length < 3) { hb.style.display = 'none'; return; }
    var r = sel.getRangeAt(0).getBoundingClientRect();
    hb.style.display = 'flex';
    hb.style.top = Math.max(70, r.top - 52) + 'px';
    hb.style.left = Math.min(innerWidth - 220, Math.max(8, r.left)) + 'px';
  });
  hb.addEventListener('mousedown', function (e) { e.preventDefault(); });
  hb.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
  function rerender(code, id) { var y = window.scrollY; topicView(code, id, true); window.scrollTo(0, y); }
  function hbAct(e) {
    var btn = e.target.closest('button'); if (!btn) return;
    e.preventDefault();
    var m = location.hash.match(/^#\/s\/([^/]+)\/t\/(.+)$/);
    if (!m || !selText) return;
    var k = key(m[1], m[2]);
    var list = (st.hl[k] = st.hl[k] || []);
    list.push({ t: selText, n: '' }); save();
    var idx = list.length - 1, act = btn.dataset.act;
    hb.style.display = 'none'; getSelection().removeAllRanges();
    rerender(m[1], m[2]);
    if (act === 'note') openNote(m[1], m[2], idx);
  }
  hb.addEventListener('click', hbAct);
  hb.addEventListener('touchend', hbAct);

  var pop = null;
  function closeNote() { if (pop) { pop.remove(); pop = null; } }
  function openNote(code, id, idx) {
    closeNote();
    var k = key(code, id), w = (st.hl[k] || [])[idx]; if (!w) return;
    pop = document.createElement('div'); pop.className = 'notepop';
    pop.innerHTML = '<div class="muted small">ข้อความที่ไฮไลต์</div><blockquote>' + esc(w.t) + '</blockquote>' +
      '<textarea id="hn" placeholder="เขียนโน้ตของคุณตรงนี้…" rows="4">' + esc(w.n || '') + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn" id="hnSave">บันทึกโน้ต</button><button class="btn ghost" id="hnDel">ลบไฮไลต์</button><button class="btn ghost" id="hnX">ปิด</button></div>';
    document.body.appendChild(pop);
    var ta = $('#hn'); ta.focus();
    $('#hnSave').onclick = function () { w.n = ta.value.trim(); save(); closeNote(); rerender(code, id); };
    $('#hnDel').onclick = function () { st.hl[k].splice(idx, 1); save(); closeNote(); rerender(code, id); };
    $('#hnX').onclick = function () { if (ta.value.trim() !== (w.n || '')) { w.n = ta.value.trim(); save(); rerender(code, id); } closeNote(); };
  }

  function reviewView() {
    var html = '<div class="crumb"><a href="#/">หน้าแรก</a></div><h1>บุ๊กมาร์ก ไฮไลต์ และโน้ตของฉัน</h1>';
    var n = 0;
    var bms = [];
    SUBJECTS.forEach(function (s) { flat(s).forEach(function (x) { if (st.bm[key(s.code, x.t.id)]) bms.push('<a class="unit-card" style="margin:6px 0" href="#/s/' + s.code + '/t/' + x.t.id + '"><div class="no">★ ' + th(x.t.id) + '</div><h3 style="margin:.2em 0">' + esc(x.t.title) + '</h3></a>'); }); });
    if (bms.length) { html += '<h2>บุ๊กมาร์ก</h2>' + bms.join(''); n++; }
    SUBJECTS.forEach(function (s) {
      flat(s).forEach(function (x) {
        var k = key(s.code, x.t.id), h = st.hl[k] || [], note = st.notes[k];
        if (!h.length && !note) return;
        n++;
        html += '<div class="card" style="margin:12px 0"><a href="#/s/' + s.code + '/t/' + x.t.id + '"><b>' + th(x.t.id) + ' ' + esc(x.t.title) + '</b></a>';
        h.forEach(function (w, i) { html += '<div class="hl-item"><div><mark class="hl">' + esc(w.t) + '</mark>' + (w.n ? '<div class="muted small" style="margin-top:4px">✏️ ' + esc(w.n) + '</div>' : '') + '</div><button data-k="' + k + '" data-i="' + i + '" aria-label="ลบไฮไลต์">✕</button></div>'; });
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
      html += '<div class="res"><div class="where">' + (SUBJECTS.length > 1 ? esc(o.r.s.name) + ' · ' : '') + 'หน่วย ' + th(o.r.x.u.no) + ' · ' + th(o.r.x.t.id) + ' ' + esc(o.r.x.t.title) + '</div><p>' + sn + '</p><a class="small" href="#/s/' + o.r.s.code + '/t/' + o.r.x.t.id + '">เปิดอ่าน →</a></div>';
    });
    if (!total) html += '<p>ไม่พบคำนี้ ลองใช้คำสั้นลงหรือสะกดอีกแบบ (ตัวเลขในหนังสือเป็นเลขไทย เช่น ๒๔๗๕)</p>';
    app.innerHTML = html;
    document.title = 'ค้นหา ' + needle + ' · ติวสอบ มสธ.';
  }

  /* ---------- emphasis + quiz ---------- */
  function qsOf(code) {
    var out = [];
    var Z = qz(code);
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
    var Z = qz(code);
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
    if (!all.length) { app.innerHTML = '<div class="crumb"><a href="#/s/' + code + '">' + esc(s.name) + '</a> › แบบทดสอบ</div><h1>แบบทดสอบ</h1><div class="card"><p>วิชานี้ยังไม่มีแบบทดสอบ — กำลังจัดทำ ระหว่างนี้ใช้ “กิจกรรมท้ายเรื่อง” ฝึกได้</p><a class="btn" href="#/s/' + code + '/practice">✍ ไปกิจกรรมท้ายเรื่อง</a></div>'; return; }
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
      var z = qz(code)[u.no]; if (!z) return;
      var d = z.qs.filter(function (q, i) { return st.qs && st.qs[code + ':' + u.no + '-' + i]; }).length;
      html += '<a class="unit-card" href="#/s/' + code + '/quiz/u/' + u.no + '"><div class="no">หน่วย ' + th(u.no) + '</div><h3>' + esc(u.title) + '</h3><div class="bar"><i style="width:' + (z.qs.length ? d / z.qs.length * 100 : 0) + '%"></i></div><p class="muted small" style="margin:.5em 0 0">' + th(z.qs.length) + ' ข้อ · ทำแล้ว ' + th(d) + accTxt(code, u.no) + '</p></a>';
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
    var nq = $('#nextQ'); nq.focus({ preventScroll: true }); setTimeout(function () { nq.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
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



  /* ---------- tab bar / quick actions / search (iPad-friendly) ---------- */
  function updateTabs(h) {
    var tb = $('#tabbar'); if (!tb) return;
    var s = curSubj(); if (!s) { tb.style.display = 'none'; return; }
    var last = st.last[s.code] || flat(s)[0].t.id;
    var tabs = [
      ['#/', '🏠', 'หน้าแรก'],
      ['#/s/' + s.code + '/t/' + last, '📖', 'อ่าน'],
      ['#/s/' + s.code + '/quiz', '📝', 'ทดสอบ'],
      ['#/s/' + s.code + '/cards', '🃏', 'การ์ด'],
      ['#/review', '⭐', 'โน้ต']
    ];
    var act = /\/quiz/.test(h) ? 2 : /\/cards/.test(h) ? 3 : /review/.test(h) ? 4 : /^#\/s\//.test(h) ? 1 : (/^#\/search/.test(h) ? -1 : 0);
    tb.innerHTML = tabs.map(function (t, i) { return '<a href="' + t[0] + '" class="' + (i === act ? 'on' : '') + '"><span class="ti">' + t[1] + '</span><span>' + t[2] + '</span></a>'; }).join('');
  }
  $('#searchBtn').onclick = function () {
    document.body.classList.toggle('searching');
    if (document.body.classList.contains('searching')) { var q = $('#q'); q.focus(); q.select(); }
  };

  function subjSwitch() {
    if (SUBJECTS.length < 2) return '';
    var c = curSubj();
    return '<div class="chips" style="margin-bottom:12px">' + SUBJECTS.map(function (x) { return '<button class="chip' + (x.code === c.code ? ' on' : '') + '" data-sw="' + x.code + '">' + th(x.code) + ' ' + esc(x.name) + '</button>'; }).join('') + '</div>';
  }
  function quickActions() {
    var s = curSubj(); if (!s) return '';
    var list = flat(s);
    var lastId = st.last[s.code];
    var cur = list.filter(function (x) { return x.t.id === lastId; })[0] || list[0];
    var firstTime = !st.last[s.code];
    return '<a class="bigcta" href="#/s/' + s.code + '/t/' + cur.t.id + '"><span class="bi">▶</span><span><b>' + (firstTime ? 'เริ่มอ่าน' : 'อ่านต่อจากเดิม') + '</b><br><small>' + th(cur.t.id) + ' ' + esc(cur.t.title) + '</small></span></a>' +
      '<div class="quick">' +
      '<a href="#/s/' + s.code + '/quiz"><span class="qi">📝</span>ทำแบบทดสอบ</a>' +
      '<a href="#/s/' + s.code + '/cards"><span class="qi">🃏</span>แฟลชการ์ด</a>' +
      '<a href="#/s/' + s.code + '/emph"><span class="qi">🎯</span>เนื้อหาที่เน้น</a>' +
      '<a href="#/s/' + s.code + '"><span class="qi">📚</span>สารบัญทุกหน่วย</a></div>';
  }

  /* คีย์ลัดในแบบทดสอบ (คอมพิวเตอร์/คีย์บอร์ด iPad): 1-4 เลือกตอบ, Enter/Space ข้อต่อไป */
  document.addEventListener('keydown', function (e) {
    if (!document.querySelector('.qcard') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key >= '1' && e.key <= '4') { var c = document.querySelectorAll('.choice')[+e.key - 1]; if (c && !c.disabled) { e.preventDefault(); c.click(); } }
    else if ((e.key === 'Enter' || e.key === ' ') && $('#nextQ')) { e.preventDefault(); $('#nextQ').click(); }
  });


  /* ---------- ปากกา / Apple Pencil (วาดทับหน้าอ่าน เก็บแยกรายเรื่อง) ---------- */
  var ink = null;
  var SVGNS = 'http://www.w3.org/2000/svg';
  function inkClose() {
    var b = document.querySelector('.inkbar'); if (b) b.remove();
    var sv = document.querySelector('svg.ink'); if (sv) { sv.classList.remove('on'); }
    ink = null;
  }
  function pathD(p) { return p.map(function (q, i) { return (i ? 'L' : 'M') + q[0] + ' ' + q[1]; }).join(' ') + (p.length === 1 ? ' l0.1 0' : ''); }
  function inkInit(code, id, k) {
    var art = $('.article'); if (!art) return;
    var old = art.querySelector('svg.ink'); if (old) old.remove();
    var svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'ink'); art.appendChild(svg);
    var data = st.ink[k] || (st.ink[k] = { fs: st.fs, s: [] });
    if (!data.s.length) delete st.ink[k];
    var cur = { svg: svg, art: art, k: k, code: code, id: id, tool: 'pen', color: '#c0392b', fingers: false, hlc: '#f1c40f', sz: 1 };
    function size() {
      var W = art.clientWidth, H = art.scrollHeight;
      if (!W || !H) return;
      svg.style.height = H + 'px'; svg.setAttribute('viewBox', '0 0 1000 ' + (H * 1000 / W)); svg.setAttribute('preserveAspectRatio', 'none');
    }
    function draw() {
      svg.innerHTML = '';
      ((st.ink[k] || {}).s || []).forEach(function (stroke, i) {
        var p = document.createElementNS(SVGNS, 'path');
        p.setAttribute('d', pathD(stroke.p)); p.setAttribute('stroke', stroke.c); p.setAttribute('stroke-width', stroke.w);
        p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
        if (stroke.h) p.setAttribute('class', 'hlstroke');
        p.dataset.i = i; svg.appendChild(p);
      });
    }
    cur.size = size; cur.draw = draw; size(); draw();
    ink = cur;
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { size(); }).observe(art);
    var badge = (st.ink[k] && st.ink[k].fs !== st.fs);
    if (badge) { var warn = document.createElement('div'); warn.className = 'inkwarn'; warn.textContent = 'ขนาดตัวอักษรตอนนี้ไม่เท่าตอนเขียน ลายเส้นอาจเลื่อนจากตำแหน่งเดิม (ปรับ A+/A− กลับให้เท่าเดิมได้)'; art.insertBefore(warn, art.firstChild); }

    function pt(e) { var r = svg.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 10000) / 10, Math.round((e.clientY - r.top) / r.width * 10000) / 10]; }
    var cs = null, lastY = null, erasing = false;
    function erase(e) {
      var q = pt(e), arr = (st.ink[k] || { s: [] }).s, hit = false;
      for (var i = arr.length - 1; i >= 0; i--) {
        if (arr[i].p.some(function (a) { return Math.abs(a[0] - q[0]) < 14 && Math.abs(a[1] - q[1]) < 14; })) { arr.splice(i, 1); hit = true; }
      }
      if (hit) { draw(); save(); }
    }
    svg.addEventListener('pointerdown', function (e) {
      if (!svg.classList.contains('on')) return;
      if (e.pointerType === 'touch' && !cur.fingers) { lastY = e.clientY; try { svg.setPointerCapture(e.pointerId); } catch (_) {}; return; }
      e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch (_) {};
      if (cur.tool === 'erase') { erasing = true; erase(e); return; }
      var hl = cur.tool === 'hl';
      cs = { c: hl ? cur.hlc : cur.color, w: Math.round((hl ? 26 : (e.pointerType === 'pen' ? 3.2 : 4)) * cur.sz * 10) / 10, h: hl, p: [pt(e)] };
      cs.el = document.createElementNS(SVGNS, 'path');
      cs.el.setAttribute('stroke', cs.c); cs.el.setAttribute('stroke-width', cs.w); cs.el.setAttribute('fill', 'none');
      cs.el.setAttribute('stroke-linecap', 'round'); cs.el.setAttribute('stroke-linejoin', 'round'); if (hl) cs.el.setAttribute('class', 'hlstroke');
      cs.el.setAttribute('d', pathD(cs.p)); svg.appendChild(cs.el);
    });
    svg.addEventListener('pointermove', function (e) {
      if (lastY !== null && e.pointerType === 'touch' && !cur.fingers) { window.scrollBy(0, lastY - e.clientY); lastY = e.clientY; return; }
      if (erasing) { erase(e); return; }
      if (!cs) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      if (!evs.length) evs = [e];
      evs.forEach(function (ev) {
        var q = pt(ev), l = cs.p[cs.p.length - 1];
        if (Math.abs(q[0] - l[0]) + Math.abs(q[1] - l[1]) > 1.2) cs.p.push(q);
      });
      cs.el.setAttribute('d', pathD(cs.p));
    });
    function end() {
      lastY = null; erasing = false;
      if (!cs) return;
      var d = st.ink[k] || (st.ink[k] = { fs: st.fs, s: [] });
      d.fs = st.fs; d.s.push({ c: cs.c, w: cs.w, h: cs.h, p: cs.p });
      cs = null; save(); draw();
    }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function inkToggle() {
    if (!ink) return;
    var svg = ink.svg, bar = document.querySelector('.inkbar');
    if (bar) { inkClose2(); return; }
    ink.size(); svg.classList.add('on');
    bar = document.createElement('div'); bar.className = 'inkbar';
    bar.innerHTML =
      '<button data-t="pen" data-c="#c0392b" style="color:#c0392b">●</button><button data-t="pen" data-c="#1f5fbf" style="color:#1f5fbf">●</button><button data-t="pen" data-c="#1f2328" style="color:#1f2328">●</button><button data-t="pen" data-c="#1e8449" style="color:#1e8449">●</button>' +
      '<button data-t="hl" data-c="#f1c40f" style="background:#f9e79f" title="ปากกาไฮไลต์สีเหลือง">🖍</button><button data-t="hl" data-c="#ff6fa8" style="background:#ffc4dc" title="ปากกาไฮไลต์สีชมพู">🖍</button><button data-t="hl" data-c="#43c75d" style="background:#b8f0c2" title="ปากกาไฮไลต์สีเขียว">🖍</button><button data-t="hl" data-c="#3aa0ff" style="background:#b9defe" title="ปากกาไฮไลต์สีฟ้า">🖍</button><button id="inkSize" title="ขนาดเส้น">เส้น: กลาง</button><button data-t="erase" title="ยางลบ (ลบทีละเส้น)">🧽</button>' +
      '<button id="inkUndo" title="ย้อนกลับ">↩︎</button><button id="inkClear" title="ล้างทั้งหน้า">🗑</button>' +
      '<button id="inkFinger" title="ให้นิ้วเขียนได้ด้วย (ปกติใช้นิ้วเลื่อนหน้า ปากกาเขียน)">☝︎ นิ้วเขียน: ปิด</button><button id="inkDone" class="btn small-btn">เสร็จ</button>';
    document.body.appendChild(bar);
    function mark() { bar.querySelectorAll('[data-t]').forEach(function (b) { b.classList.toggle('sel', b.dataset.t === ink.tool && (!b.dataset.c || b.dataset.c === (ink.tool === 'hl' ? ink.hlc : ink.color))); }); }
    mark();
    bar.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { ink.tool = b.dataset.t; if (b.dataset.c) { if (b.dataset.t === 'hl') ink.hlc = b.dataset.c; else ink.color = b.dataset.c; } mark(); }; });
    $('#inkUndo').onclick = function () { var d = st.ink[ink.k]; if (d && d.s.length) { d.s.pop(); if (!d.s.length) delete st.ink[ink.k]; save(); ink.draw(); } };
    $('#inkClear').onclick = function () { if (st.ink[ink.k] && confirm('ล้างลายเส้นทั้งหมดของเรื่องนี้?')) { delete st.ink[ink.k]; save(); ink.draw(); } };
    $('#inkFinger').onclick = function () { ink.fingers = !ink.fingers; this.textContent = '☝︎ นิ้วเขียน: ' + (ink.fingers ? 'เปิด' : 'ปิด'); this.classList.toggle('sel', ink.fingers); };
    $('#inkSize').onclick = function () { var L = [[0.6, 'บาง'], [1, 'กลาง'], [1.7, 'หนา']]; var i = L.findIndex(function (x) { return x[0] === ink.sz; }); var n = L[(i + 1) % 3]; ink.sz = n[0]; this.textContent = 'เส้น: ' + n[1]; };
    $('#inkDone').onclick = inkClose2;
    $('#inkBtn').textContent = '✏️ ปิดโหมดปากกา';
  }
  function inkClose2() {
    var bar = document.querySelector('.inkbar'); if (bar) bar.remove();
    if (ink) ink.svg.classList.remove('on');
    var b = $('#inkBtn'); if (b) b.textContent = '✏️ เขียนด้วยปากกา';
  }

  /* ---------- study tools ---------- */
  function unitAcc(code, u) {
    var z = qz(code)[u]; if (!z) return null;
    var r = 0, w = 0;
    z.qs.forEach(function (q, i) { var x = st.qs && st.qs[code + ':' + u + '-' + i]; if (x) { r += x.r; w += x.w; } });
    return (r + w) >= 3 ? Math.round(r / (r + w) * 100) : null;
  }
  function accTxt(code, u) { var a = unitAcc(code, u); return a === null ? '' : ' · แม่น ' + th(a) + '%'; }

  function todayCard(perDay) {
    var s = curSubj(); if (!s) return '';
    var next = flat(s).filter(function (x) { return !st.done[key(s.code, x.t.id)]; }).slice(0, Math.min(5, Math.max(1, perDay || 3)));
    var weak = null;
    s.units.forEach(function (u) { var a = unitAcc(s.code, u.no); if (a !== null && a < 75 && (weak === null || a < weak.a)) weak = { u: u, a: a }; });
    var due = dueCards(s.code).length;
    var h = '<h2>📅 วันนี้ควรทำ</h2><div class="grid">';
    h += '<div class="card"><b>อ่านต่อ</b>' + (next.length ? '<div class="toc" style="margin-top:6px">' + next.map(function (x) { return '<a href="#/s/' + s.code + '/t/' + x.t.id + '"><span class="id">' + th(x.t.id) + '</span><span>' + esc(x.t.title) + '</span></a>'; }).join('') + '</div>' : '<p class="muted">อ่านครบทุกเรื่องแล้ว 🎉</p>') + '</div>';
    h += '<div class="card"><b>🃏 แฟลชการ์ดที่ถึงเวลาทบทวน</b><p style="margin:.4em 0"><span style="font-size:1.8rem;font-weight:700;color:var(--accent)">' + th(due) + '</span> ใบ</p><a class="btn small-btn" href="#/s/' + s.code + '/cards">เริ่มทบทวน</a></div>';
    h += '<div class="card"><b>🎯 จุดที่ควรเสริม</b>' + (weak ? '<p style="margin:.4em 0">หน่วย ' + th(weak.u.no) + ' ' + esc(weak.u.title) + ' (แม่น ' + th(weak.a) + '%)</p><a class="btn small-btn" href="#/s/' + s.code + '/quiz/u/' + weak.u.no + '">ทำข้อสอบหน่วยนี้อีกรอบ</a>' : '<p class="muted" style="margin:.4em 0">ยังไม่มีข้อมูลพอ — ลองทำแบบทดสอบสักหน่วย แล้วระบบจะชี้หน่วยที่อ่อนให้</p><a class="btn small-btn" href="#/s/' + s.code + '/quiz">ไปทำแบบทดสอบ</a>') + '</div></div>';
    return h;
  }

  function backupBox() {
    return '<details class="unit" style="margin-top:24px"><summary><span class="t">💾 สำรอง / ย้ายข้อมูลระหว่างเครื่อง (คอมพิวเตอร์ ↔ iPad)</span></summary><div class="body">' +
      '<p class="muted small">ความคืบหน้า โน้ต ไฮไลต์ บุ๊กมาร์ก ผลข้อสอบ และแฟลชการ์ด เก็บในแต่ละเครื่องแยกกัน — คัดลอกรหัสจากเครื่องหนึ่ง แล้ววางในอีกเครื่องเพื่อย้ายข้อมูล</p>' +
      '<div class="row"><button class="btn" id="bkCopy">📋 คัดลอกรหัสสำรอง</button></div>' +
      '<textarea id="bkText" rows="3" placeholder="วางรหัสที่นี่เพื่อนำเข้า…" style="width:100%;margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit"></textarea>' +
      '<div class="row" style="margin-top:8px"><button class="btn ghost" id="bkImp">⬇ นำเข้า (ทับข้อมูลในเครื่องนี้)</button><span id="bkMsg" class="muted small"></span></div></div></details>';
  }
  function bindBackup() {
    var c = $('#bkCopy'); if (!c) return;
    c.onclick = function () {
      var code = btoa(unescape(encodeURIComponent(JSON.stringify(st))));
      var ta = $('#bkText'); ta.value = code;
      var done = function () { $('#bkMsg').textContent = 'คัดลอกแล้ว (' + code.length + ' ตัวอักษร)'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, function () { ta.select(); $('#bkMsg').textContent = 'กดคัดลอกจากช่องข้อความด้านล่างได้เลย'; });
      else { ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} }
    };
    $('#bkImp').onclick = function () {
      try {
        var o = JSON.parse(decodeURIComponent(escape(atob($('#bkText').value.trim()))));
        if (!o || typeof o !== 'object' || !o.done) throw 0;
        if (!confirm('นำเข้าจะทับข้อมูลในเครื่องนี้ทั้งหมด ยืนยัน?')) return;
        localStorage.setItem(KEY, JSON.stringify(o)); location.reload();
      } catch (e) { $('#bkMsg').textContent = 'รหัสไม่ถูกต้อง'; }
    };
  }

  /* reading progress, tts, focus */
  var progEl = null;
  function setProg(on) {
    if (on) {
      if (!progEl) { progEl = document.createElement('div'); progEl.className = 'readprog'; progEl.innerHTML = '<i></i>'; document.body.appendChild(progEl); }
      progEl.style.display = 'block'; updProg();
    } else if (progEl) progEl.style.display = 'none';
  }
  function updProg() {
    if (!progEl || progEl.style.display === 'none') return;
    var h = document.documentElement.scrollHeight - innerHeight;
    progEl.firstChild.style.width = (h > 0 ? Math.min(100, scrollY / h * 100) : 0) + '%';
  }
  window.addEventListener('scroll', updProg, { passive: true });

  var tts = { on: false, i: 0 };
  function stopTTS() {
    tts.on = false;
    try { speechSynthesis.cancel(); } catch (e) {}
    document.querySelectorAll('.speaking').forEach(function (e) { e.classList.remove('speaking'); });
    var b = $('#ttsBtn'); if (b) b.textContent = '🔊 ฟังเสียงอ่าน';
  }
  function speakFrom(i) {
    var els = [].slice.call(document.querySelectorAll('#rd p, #rd h4'));
    if (!tts.on || i >= els.length) { stopTTS(); return; }
    document.querySelectorAll('.speaking').forEach(function (e) { e.classList.remove('speaking'); });
    var el = els[i]; el.classList.add('speaking');
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    var u = new SpeechSynthesisUtterance(el.textContent);
    u.lang = 'th-TH'; u.rate = +($('#ttsRate') || { value: 1 }).value;
    u.onend = function () { if (tts.on) { tts.i = i + 1; speakFrom(i + 1); } };
    u.onerror = function () { stopTTS(); };
    speechSynthesis.speak(u);
  }

  function applyLH() {
    var v = st.lh || 0;
    document.documentElement.style.setProperty('--lh', ['1.95', '2.25', '2.6'][v]);
  }
  function bindTools(code, id, k) {
    setProg(true); applyLH(); inkInit(code, id, k);
    $('#inkBtn').onclick = inkToggle;
    $('#bmBtn').onclick = function () { if (st.bm[k]) delete st.bm[k]; else st.bm[k] = true; save(); this.textContent = st.bm[k] ? '★ บุ๊กมาร์กแล้ว' : '☆ บุ๊กมาร์ก'; };
    var tb = $('#ttsBtn');
    if (!('speechSynthesis' in window)) { tb.style.display = 'none'; $('#ttsRate').style.display = 'none'; }
    tb.onclick = function () {
      if (tts.on) { stopTTS(); return; }
      tts.on = true; tb.textContent = '⏹ หยุดอ่าน';
      speakFrom(0);
    };
    $('#focusBtn').onclick = function () { document.body.classList.toggle('focus'); this.textContent = document.body.classList.contains('focus') ? '🧘 ออกจากโหมดโฟกัส' : '🧘 โหมดโฟกัส'; };
    var lh = $('#lhSel'); lh.value = String(st.lh || 0);
    lh.onchange = function () { st.lh = +lh.value; save(); applyLH(); };
  }

  /* flashcards (Leitner) */
  function cardKey(code, q) { return code + ':' + q.id; }
  function dueCards(code) {
    var now = Date.now();
    return qsOf(code).filter(function (q) { var c = st.fc[cardKey(code, q)]; return !c || c.due <= now; });
  }
  var DAY = 864e5;
  function cardsView(code) {
    var s = subj(code); if (!s) return notFound();
    var unit = st.cu || 'all';
    var html = '<div class="crumb"><a href="#/s/' + code + '">' + esc(s.name) + '</a> › แฟลชการ์ด</div><h1>🃏 แฟลชการ์ด</h1>' +
      '<p class="muted">ทบทวนแบบเว้นช่วง: ใบที่จำได้จะกลับมาห่างขึ้น ใบที่จำไม่ได้จะกลับมาเร็ว — ใช้คำถามจากแบบทดสอบ (หน้าคำถาม / หลังคำตอบพร้อมคำอธิบาย)</p>' +
      '<div class="q-ctl"><select id="cu"><option value="all">ทุกหน่วย</option>' + s.units.map(function (u) { return '<option value="' + u.no + '"' + (String(u.no) === String(unit) ? ' selected' : '') + '>หน่วย ' + th(u.no) + ' ' + esc(u.title) + '</option>'; }).join('') + '</select></div><div id="cwrap"></div>';
    app.innerHTML = html;
    $('#cu').onchange = function () { st.cu = this.value; save(); cardsView(code); };
    var deck = dueCards(code).filter(function (q) { return unit === 'all' || String(q.u) === String(unit); });
    var total = qsOf(code).filter(function (q) { return unit === 'all' || String(q.u) === String(unit); }).length;
    shuffle(deck); deck = deck.slice(0, 20);
    var i = 0, ok = 0;
    var W = $('#cwrap');
    function show() {
      if (i >= deck.length) {
        W.innerHTML = '<div class="card" style="text-align:center"><h2 style="margin-top:0">' + (deck.length ? 'จบรอบนี้แล้ว 🎉' : 'ไม่มีการ์ดที่ถึงเวลาทบทวน') + '</h2><p class="muted">' + (deck.length ? 'จำได้ ' + th(ok) + ' จาก ' + th(deck.length) + ' ใบ · ' : '') + 'การ์ดทั้งหมดในชุดนี้ ' + th(total) + ' ใบ</p><a class="btn" href="#/s/' + code + '/cards" onclick="setTimeout(function(){location.reload()},0)">เริ่มรอบใหม่</a></div>';
        return;
      }
      var q = deck[i];
      W.innerHTML = '<div class="row" style="margin-bottom:8px"><div class="bar" style="flex:1"><i style="width:' + (i / deck.length * 100) + '%"></i></div><span class="pill">' + th(i + 1) + ' / ' + th(deck.length) + '</span></div>' +
        '<div class="card fcard"><div class="muted small">หน่วย ' + th(q.u) + ' · ' + th(q.t) + ' ' + esc(topicTitle(s, q.t)) + '</div><h2 style="font-size:1.25rem;line-height:1.7">' + esc(q.q) + '</h2><div id="ans"></div><button class="btn" id="showA">แสดงคำตอบ</button></div>';
      $('#showA').onclick = function () {
        $('#ans').innerHTML = '<div class="fb ok"><b>✓ ' + esc(q.c[q.a]) + '</b><div class="expl">' + esc(q.e) + '</div><a class="small" href="#/s/' + code + '/t/' + q.t + '" target="_blank" rel="noopener">เปิดอ่านเรื่อง ' + th(q.t) + ' ↗</a></div>' +
          '<div class="row" style="margin:12px 0"><button class="btn ghost" data-r="1">😣 จำไม่ได้</button><button class="btn ghost" data-r="2">🤔 พอจำได้</button><button class="btn" data-r="3">😄 จำได้</button></div>';
        this.style.display = 'none';
        document.querySelectorAll('[data-r]').forEach(function (b) {
          b.onclick = function () {
            var r = +b.dataset.r;
            st.fc[cardKey(code, q)] = { box: r, due: Date.now() + (r === 1 ? 0 : r === 2 ? DAY : 4 * DAY) };
            if (r === 3) ok++; if (r === 1) deck.push(q);
            save(); i++; show();
          };
        });
      };
    }
    show();
    document.title = 'แฟลชการ์ด · ติวสอบ มสธ.';
  }

  function notFound() { app.innerHTML = '<div class="card"><h1>ไม่พบหน้านี้</h1><a class="btn" href="#/">กลับหน้าแรก</a></div>'; }

  /* ---------- router ---------- */
  function route() {
    var h = location.hash || '#/';
    $('#menuBtn').hidden = true;
    var m;
    var mc = h.match(/^#\/s\/([^/]+)/); if (mc && subj(mc[1]) && st.cur !== mc[1]) { st.cur = mc[1]; save(); }
    inkClose(); stopTTS(); document.body.classList.remove('focus'); document.body.classList.remove('searching'); setProg(false); updateTabs(h);
    if ((m = h.match(/^#\/s\/([^/]+)\/cards$/))) cardsView(m[1]);
    else if ((m = h.match(/^#\/s\/([^/]+)\/t\/(.+)$/))) topicView(m[1], m[2]);
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
