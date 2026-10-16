(function () {
  'use strict';
  var S = window.Saju, KB = window.KB, R = window.Report;
  var $ = function (id) { return document.getElementById(id); };
  var CITIES = [
    ['서울', 126.98], ['부산', 129.08], ['대구', 128.60], ['인천', 126.70], ['광주', 126.85], ['대전', 127.38], ['울산', 129.31],
    ['세종', 127.29], ['수원·경기 남부', 127.03], ['의정부·경기 북부', 127.05], ['춘천', 127.73], ['강릉', 128.90], ['원주', 127.95],
    ['청주', 127.49], ['천안', 127.15], ['전주', 127.15], ['목포', 126.39], ['여수·순천', 127.60], ['포항', 129.36], ['안동', 128.73],
    ['창원·마산', 128.68], ['진주', 128.08], ['제주', 126.53], ['평양', 125.75], ['보정 안 함(입력 시각 그대로)', null]
  ];
  var state = { A: null, tab: 1, year: null, isExample: true };

  function opt(sel, from, to, fmt) { for (var i = from; i <= to; i++) { var o = document.createElement('option'); o.value = i; o.textContent = fmt(i); sel.appendChild(o); } }
  opt($('month'), 1, 12, function (i) { return i + '월'; });
  opt($('day'), 1, 31, function (i) { return i + '일'; });
  opt($('hour'), 0, 23, function (i) { return i + '시'; });
  opt($('minute'), 0, 59, function (i) { return i + '분'; });
  CITIES.forEach(function (c, i) { var o = document.createElement('option'); o.value = i; o.textContent = c[0]; $('city').appendChild(o); });

  // 예시 값
  $('year').value = 1990; $('month').value = 5; $('day').value = 15; $('hour').value = 14; $('minute').value = 30; $('city').value = 0;

  $('unknown').addEventListener('change', function () { $('hour').disabled = $('minute').disabled = this.checked; });

  /* 테마 */
  var themes = ['auto', 'light', 'dark'], tnames = { auto: '자동', light: '밝게', dark: '어둡게' }, theme = 'auto';
  try { theme = localStorage.getItem('mn-theme') || 'auto'; } catch (e) {}
  function applyTheme() {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', theme);
    $('themeBtn').textContent = '화면: ' + tnames[theme];
  }
  $('themeBtn').addEventListener('click', function () { theme = themes[(themes.indexOf(theme) + 1) % 3]; try { localStorage.setItem('mn-theme', theme); } catch (e) {} applyTheme(); });
  applyTheme();

  function readInput() {
    var c = CITIES[+$('city').value];
    return {
      name: $('name').value.trim(), gender: $('gM').checked ? 'M' : 'F', calendar: $('calL').checked ? 'lunar' : 'solar',
      leap: $('leap').checked, year: +$('year').value, month: +$('month').value, day: +$('day').value,
      hour: +$('hour').value, minute: +$('minute').value, timeUnknown: $('unknown').checked,
      longitude: c[1] || 127, noCorrection: c[1] == null, cityName: c[0], yajasi: $('yajasi').checked
    };
  }

  function validate(inp) {
    if (!(inp.year >= 1900 && inp.year <= 2100)) return '태어난 해를 1900~2100 사이로 입력해 주세요.';
    if (inp.calendar === 'solar') {
      var dim = new Date(Date.UTC(inp.year, inp.month, 0)).getUTCDate();
      if (inp.day > dim) return inp.month + '월은 ' + dim + '일까지 있습니다. 날짜를 확인해 주세요.';
    } else if (inp.day > 30) return '음력 날짜는 30일까지입니다.';
    return null;
  }

  function defaultYear() { var n = new Date(); return n.getMonth() >= 9 ? n.getFullYear() + 1 : n.getFullYear(); }

  function render() {
    var A = state.A, P = A.P, inp = A.input, html = '';
    var animal = S.ANIMALS[S.bi(P[0].zhi)];
    var dmInfo = KB.DAY_MASTER[A.dm];
    html += '<section class="card"><div class="who"><h2>' + (state.isExample ? '<span class="example">예시</span> ' : '') + R.esc(inp.name || (A.gender === '남' ? '남성' : '여성')) + '님의 명반</h2>' +
      '<span class="muted">' + (inp.calendar === 'lunar' ? '음력 ' + inp.year + '.' + inp.month + '.' + inp.day + (inp.leap ? '(윤)' : '') + ' → ' : '') + '양력 ' + A.solarBirth + ' · ' + A.gender + ' · ' + animal + '띠' +
      (A.trueSolar ? ' · 보정 시각 ' + A.trueSolar + (inp.noCorrection ? '' : ' (' + R.esc(inp.cityName) + ')') : '') + (A.utcOffset !== 540 ? ' · 당시 표준시 UTC+' + (A.utcOffset / 60) : '') + '</span></div>';
    var order = [3, 2, 1, 0], heads = ['시주', '일주', '월주', '년주'];
    var cell = function (cls, fn) { return order.map(function (i, k) { var p = P[i]; return '<div class="' + cls + (k === 3 ? '' : '') + '">' + (p ? fn(p, i) : '<span class="muted">-</span>') + '</div>'; }).join(''); };
    html += '<div class="board">' +
      '<div class="rh"></div>' + heads.map(function (h, k) { return '<div class="colh' + (k === 1 ? ' me' : '') + '">' + h + (k === 1 ? ' (나)' : '') + '</div>'; }).join('') +
      '<div class="rh">십성</div>' + cell('ten', function (p) { return p.ganTen; }) +
      '<div class="rh">천간</div>' + cell('big', function (p) { return '<span class="e' + p.ganEl + '">' + p.gan + '</span><small>' + p.ganKo + ' · ' + S.EL[p.ganEl] + '</small>'; }) +
      '<div class="rh">지지</div>' + cell('big', function (p) { return '<span class="e' + p.zhiEl + '">' + p.zhi + '</span><small>' + p.zhiKo + ' · ' + S.EL[p.zhiEl] + '</small>'; }) +
      '<div class="rh">십성</div>' + cell('ten', function (p) { return p.zhiTen; }) +
      '<div class="rh">지장간</div>' + cell('hid', function (p) { return p.hidden.map(function (h) { return h.ch; }).join(' '); }) +
      '<div class="rh last">12운성</div>' + cell('ten last', function (p) { return p.unseong; }) +
      '</div>';
    if (inp.timeUnknown) html += '<p class="note">시간을 몰라 시주는 비워 두고, 나머지 6글자로 분석했습니다.</p>';

    var bars = [0, 1, 2, 3, 4].map(function (e) {
      return '<div class="bar"><span class="e' + e + '"><b>' + S.EL_HANJA[e] + '</b> ' + S.EL[e] + '</span><div class="track"><div class="fill b' + e + '" style="width:' + Math.max(2, A.pct[e]) + '%"></div></div><span class="v">' + A.count[e] + '개 · ' + A.pct[e] + '%</span></div>';
    }).join('');
    var y = A.yongsin;
    html += '<div class="panels"><div><div class="ptitle">오행 분포 (글자 수 · 지장간 반영 세력)</div><div class="bars">' + bars + '</div></div>' +
      '<div><div class="ptitle">신강·신약 (자기편 기운 ' + A.strength.score + '%)</div><div class="gauge"><i style="left:' + Math.min(98, Math.max(2, A.strength.score)) + '%"></i></div><div class="gscale"><span>극신약</span><span>중화</span><span>극신강</span></div>' +
      '<p style="margin:8px 0 0"><b>' + A.strength.label + '</b> · 일간 <b class="e' + A.dmEl + '">' + A.dm + '</b> ' + dmInfo.name + ', ' + dmInfo.img + '</p>' +
      '<div class="ys"><span class="yschip">용신 <b class="e' + y.yong + '">' + S.EL_HANJA[y.yong] + '</b> ' + S.EL[y.yong] + '(' + y.yongGroup + ')</span><span class="yschip">희신 <b class="e' + y.hee + '">' + S.EL_HANJA[y.hee] + '</b> ' + S.EL[y.hee] + '</span><span class="yschip">기신 <b class="e' + y.gi + '">' + S.EL_HANJA[y.gi] + '</b> ' + S.EL[y.gi] + '</span>' + (y.johu != null ? '<span class="yschip">조후 <b class="e' + y.johu + '">' + S.EL_HANJA[y.johu] + '</b></span>' : '') + '</div></div></div>';

    var now = new Date().getFullYear(), cur = S.currentDaeun(A, now);
    html += '<div style="margin-top:16px"><div class="ptitle">대운 (' + (A.forward ? '순행' : '역행') + ' · 첫 대운 출생 후 약 ' + A.daeunStart.y + '년 ' + A.daeunStart.m + '개월)</div><div class="dystrip">' +
      A.daeun.map(function (d) { return '<div class="dy' + (d === cur ? ' cur' : '') + '"><small>만 ' + d.age + '세</small><b><span class="e' + d.stemEl + '">' + d.gz[0] + '</span><span class="e' + d.branchEl + '">' + d.gz[1] + '</span></b><small>' + d.stemTen + '<br>' + d.branchTen + '</small><small>' + d.startYear + '</small><div class="tr ' + (d.trend === '상승' ? 'up' : d.trend === '하강' ? 'down' : 'flat') + '"></div></div>'; }).join('') +
      '</div></div>';

    html += '<div style="margin-top:12px"><div class="ptitle">신살 · 원국의 합충</div><div class="chips">' +
      (A.sinsal.map(function (s) { var k = KB.SINSAL[s.key]; return '<span class="chip k-' + (k ? k.kind.replace(/[·\s]/g, '') : '') + '">' + s.key + ' <small>' + s.where.join(', ') + '</small></span>'; }).join('') || '<span class="muted">뚜렷한 신살 없음</span>') +
      '</div><div class="rels">' + (A.natalRel.map(function (r) { return r.where + ' ' + r.pair + ' ' + r.type; }).join(' · ') || '원국 내 합·충·형 없음') + ' · 공망 ' + A.xunkong + '</div></div>';
    html += '</section>';

    html += '<nav class="tabs" role="tablist">' + R.PROMPTS.map(function (p) { return '<button class="tab" role="tab" type="button" data-id="' + p.id + '" aria-selected="' + (p.id === state.tab) + '"><b>' + p.id + '</b>' + p.title + '</button>'; }).join('') + '</nav>';
    html += '<div id="reportArea"></div>';
    $('result').innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.addEventListener('click', function () { selectTab(+b.dataset.id, true); }); });
    renderReport();
  }

  function selectTab(id, scroll) {
    state.tab = id;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.setAttribute('aria-selected', String(+b.dataset.id === id)); });
    try { history.replaceState(null, '', '#r' + id); } catch (e) {}
    renderReport();
    if (scroll) document.querySelector('.tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderReport() {
    var A = state.A, p = R.PROMPTS[state.tab - 1], Y = state.year || defaultYear();
    var title = p.full.replace('{Y}', Y);
    var yearSel = '';
    if (p.year) {
      var base = new Date().getFullYear();
      yearSel = '<label class="field" style="flex-direction:row;align-items:center;gap:8px"><span>연도</span><select id="yearSel">' + [base, base + 1, base + 2].map(function (v) { return '<option value="' + v + '"' + (v === Y ? ' selected' : '') + '>' + v + '년</option>'; }).join('') + '</select></label>';
    }
    var prompt = R.buildPrompt(A, p.id, Y);
    var html = '<div class="rhead"><h2>' + p.id + '. ' + title + '</h2>' + yearSel + '</div>' +
      '<article class="report">' + R.render(A, p.id, Y) + '</article>' +
      '<aside class="ai"><h3>AI 심층 분석 (5,000자 버전)</h3><p>아래 프롬프트에는 이 명반의 계산 결과가 모두 들어 있습니다. 복사해서 ChatGPT·Claude·Gemini 중 쓰는 곳에 붙여넣으면, AI가 사주를 잘못 세우는 일 없이 긴 풀이를 받을 수 있습니다.</p>' +
      '<textarea id="promptBox" readonly aria-label="AI 프롬프트">' + R.esc(prompt) + '</textarea>' +
      '<div class="actions"><button class="btn" type="button" id="copyBtn">프롬프트 복사</button>' +
      '<a class="btn ghost" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT 열기</a><a class="btn ghost" href="https://claude.ai/new" target="_blank" rel="noopener">Claude 열기</a><a class="btn ghost" href="https://gemini.google.com/" target="_blank" rel="noopener">Gemini 열기</a>' +
      '<span class="toast" id="toast" hidden>복사했어요</span></div></aside>';
    $('reportArea').innerHTML = html;
    if (p.year) $('yearSel').addEventListener('change', function () { state.year = +this.value; renderReport(); });
    $('copyBtn').addEventListener('click', function () {
      var box = $('promptBox'), done = function () { $('toast').hidden = false; setTimeout(function () { $('toast').hidden = true; }, 2000); };
      var fallback = function () { box.focus(); box.select(); try { document.execCommand('copy'); done(); } catch (e) {} };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(box.value).then(done, fallback); else fallback();
    });
  }

  function run(isExample) {
    var inp = readInput(), err = validate(inp);
    if (err) { $('result').innerHTML = '<div class="card"><b>입력을 확인해 주세요.</b> ' + err + '</div>'; return; }
    try {
      state.A = S.analyze(inp); state.isExample = isExample;
      $('exampleNote').hidden = !isExample;
      render();
    } catch (e) {
      $('result').innerHTML = '<div class="card"><b>계산하지 못했습니다.</b> 날짜가 실제로 있는 날인지(음력 윤달 여부 포함) 확인해 주세요.</div>';
      if (window.console) console.error(e);
    }
  }

  $('form').addEventListener('submit', function (e) { e.preventDefault(); run(false); $('result').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  var m = /^#r([1-9])$/.exec(location.hash); if (m) state.tab = +m[1];
  run(true);
})();
