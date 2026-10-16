/* 만세력 계산 엔진: 사주팔자, 십성, 지장간, 12운성, 오행, 신강·신약, 용신, 신살, 합충, 대운·세운
   절기 계산은 lunar-javascript(MIT)를 쓰고, 한국 시간대·경도 보정과 명리 판단은 여기서 한다. */
(function (root) {
  'use strict';
  var L = root.Solar ? root : (typeof require !== 'undefined' ? require('./lunar.js') : null);
  var Solar = L.Solar, Lunar = L.Lunar;

  var STEMS = '甲乙丙丁戊己庚辛壬癸'.split('');
  var STEMS_KO = '갑을병정무기경신임계'.split('');
  var BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var BRANCHES_KO = '자축인묘진사오미신유술해'.split('');
  var ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  var EL = ['목', '화', '토', '금', '수'];
  var EL_HANJA = ['木', '火', '土', '金', '水'];
  var STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
  var TEN = [['비견', '겁재'], ['식신', '상관'], ['편재', '정재'], ['편관', '정관'], ['편인', '정인']];
  // 지장간: 여기 → 중기 → 정기(마지막)
  var HIDDEN = {
    '子': ['壬', '癸'], '丑': ['癸', '辛', '己'], '寅': ['戊', '丙', '甲'], '卯': ['甲', '乙'],
    '辰': ['乙', '癸', '戊'], '巳': ['戊', '庚', '丙'], '午': ['丙', '己', '丁'], '未': ['丁', '乙', '己'],
    '申': ['戊', '壬', '庚'], '酉': ['庚', '辛'], '戌': ['辛', '丁', '戊'], '亥': ['戊', '甲', '壬']
  };
  var HIDDEN_W = { 2: [0.3, 0.7], 3: [0.2, 0.2, 0.6] };
  var UNSEONG = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
  var JANGSAENG = { '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅', '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯' };

  function si(s) { return STEMS.indexOf(s); }
  function bi(b) { return BRANCHES.indexOf(b); }
  function stemEl(s) { return STEM_EL[si(s)]; }
  function branchEl(b) { return BRANCH_EL[bi(b)]; }
  function ko(ch) { var i = si(ch); if (i >= 0) return STEMS_KO[i]; i = bi(ch); return i >= 0 ? BRANCHES_KO[i] : ch; }
  function gzKo(gz) { return ko(gz[0]) + ko(gz[1]); }
  function mainStem(b) { var h = HIDDEN[b]; return h[h.length - 1]; }
  function relIndex(dmEl, e) { return (e - dmEl + 5) % 5; }
  function tenGod(dm, s) {
    var a = si(dm), b = si(s);
    return TEN[relIndex(STEM_EL[a], STEM_EL[b])][(a % 2) === (b % 2) ? 0 : 1];
  }
  function tenGodBranch(dm, b) { return tenGod(dm, mainStem(b)); }
  function groupOfTen(t) { for (var i = 0; i < 5; i++) if (TEN[i].indexOf(t) >= 0) return GROUPS[i]; return ''; }
  function unseong(dm, b) {
    var start = bi(JANGSAENG[dm]), idx = bi(b), yang = si(dm) % 2 === 0;
    var step = yang ? (idx - start + 12) % 12 : (start - idx + 12) % 12;
    return UNSEONG[step];
  }
  function generates(e) { return (e + 1) % 5; }
  function generatedBy(e) { return (e + 4) % 5; }
  function controls(e) { return (e + 2) % 5; }
  function controlledBy(e) { return (e + 3) % 5; }

  /* ---------- 시간 처리 ---------- */
  var seoulFmt = null;
  function seoulOffsetMin(utcMs) {
    try {
      if (!seoulFmt) seoulFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
      var p = {};
      seoulFmt.formatToParts(new Date(utcMs)).forEach(function (x) { p[x.type] = x.value; });
      var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
      return Math.round((asUtc - utcMs) / 60000);
    } catch (e) { return 540; }
  }
  // 한국 벽시계 시각 → UTC (1954~61년 UTC+8:30, 서머타임 시기 자동 반영)
  function koreaWallToUtc(y, m, d, h, mi) {
    var wall = Date.UTC(y, m - 1, d, h, mi), utc = wall - 540 * 60000;
    for (var i = 0; i < 3; i++) utc = wall - seoulOffsetMin(utc) * 60000;
    return utc;
  }
  function fields(ms) {
    var d = new Date(ms);
    return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- 합·충·형·파·해 ---------- */
  var STEM_HAP = { '甲己': '토', '乙庚': '금', '丙辛': '수', '丁壬': '목', '戊癸': '화' };
  var STEM_CHUNG = ['甲庚', '乙辛', '丙壬', '丁癸'];
  var BR_HAP = { '子丑': '토', '寅亥': '목', '卯戌': '화', '辰酉': '금', '巳申': '수', '午未': '화·토' };
  var BR_CHUNG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
  var BR_HYEONG = ['寅巳', '巳申', '寅申', '丑戌', '戌未', '丑未', '子卯'];
  var SELF_HYEONG = '辰午酉亥';
  var BR_PA = ['子酉', '卯午', '辰丑', '未戌', '寅亥', '巳申'];
  var BR_HAE = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
  var WONJIN = ['子未', '丑午', '寅酉', '卯申', '辰亥', '巳戌'];
  var GWIMUN = ['子酉', '丑午', '寅未', '卯申', '辰亥', '巳戌'];
  var SAMHAP = [['申子辰', '수'], ['寅午戌', '화'], ['巳酉丑', '금'], ['亥卯未', '목']];
  function inPairs(list, a, b) { return list.indexOf(a + b) >= 0 || list.indexOf(b + a) >= 0; }
  function inMap(map, a, b) { return map[a + b] || map[b + a] || null; }

  // items: [{label, ch, kind:'stem'|'branch'}]
  function pairRelations(A, B, sameSet) {
    var out = [];
    for (var i = 0; i < A.length; i++) {
      for (var j = sameSet ? i + 1 : 0; j < B.length; j++) {
        var x = A[i], y = B[j];
        if (x.kind !== y.kind) continue;
        var a = x.ch, b = y.ch, where = x.label + '·' + y.label, pair = a + b;
        if (x.kind === 'stem') {
          var h = inMap(STEM_HAP, a, b);
          if (h) out.push({ type: '천간합', where: where, pair: pair, note: h + ' 기운으로 묶임' });
          if (inPairs(STEM_CHUNG, a, b)) out.push({ type: '천간충', where: where, pair: pair, note: '생각·방향이 부딪힘' });
        } else {
          var bh = inMap(BR_HAP, a, b);
          if (bh) out.push({ type: '육합', where: where, pair: pair, note: bh + ' 기운으로 묶임' });
          if (inPairs(BR_CHUNG, a, b)) out.push({ type: '충', where: where, pair: pair, note: '변동·이동·충돌' });
          if (inPairs(BR_HYEONG, a, b) || (a === b && SELF_HYEONG.indexOf(a) >= 0)) out.push({ type: '형', where: where, pair: pair, note: '마찰·조정·수술/법적 문제 주의 상징' });
          if (inPairs(BR_PA, a, b)) out.push({ type: '파', where: where, pair: pair, note: '깨짐·계획 수정' });
          if (inPairs(BR_HAE, a, b)) out.push({ type: '해', where: where, pair: pair, note: '서운함·방해' });
          if (inPairs(WONJIN, a, b)) out.push({ type: '원진', where: where, pair: pair, note: '애증·미묘한 불편' });
        }
      }
    }
    return out;
  }
  function samhapCheck(branchItems) {
    var out = [], chars = branchItems.map(function (x) { return x.ch; });
    SAMHAP.forEach(function (s) {
      var trio = s[0].split(''), have = trio.filter(function (c) { return chars.indexOf(c) >= 0; });
      if (have.length === 3) out.push({ type: '삼합', where: s[0], pair: s[0], note: s[1] + ' 기운이 크게 모임' });
      else if (have.length === 2 && have.indexOf(trio[1]) >= 0) out.push({ type: '반합', where: have.join(''), pair: have.join(''), note: s[1] + ' 기운으로 기울어짐' });
    });
    return out;
  }

  /* ---------- 신살 ---------- */
  var T = {
    tianyi: { '甲': '丑未', '戊': '丑未', '庚': '丑未', '乙': '子申', '己': '子申', '丙': '亥酉', '丁': '亥酉', '辛': '寅午', '壬': '卯巳', '癸': '卯巳' },
    munchang: { '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申', '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯' },
    hakdang: { '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅', '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯' },
    geumyeo: { '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未', '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅' },
    rok: { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' },
    yangin: { '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子' },
    hongyeom: { '甲': '午', '乙': '午', '丙': '寅', '丁': '未', '戊': '辰', '己': '辰', '庚': '戌', '辛': '酉', '壬': '子', '癸': '申' },
    cheondeok: { '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲', '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚' }
  };
  function samhapGroup(z) { for (var i = 0; i < SAMHAP.length; i++) if (SAMHAP[i][0].indexOf(z) >= 0) return i; return -1; }
  var DOHWA = ['酉', '卯', '午', '子'], YEOKMA = ['寅', '申', '亥', '巳'], HWAGAE = ['辰', '戌', '丑', '未'];
  var WOLDEOK = ['壬', '丙', '庚', '甲'];
  function bangGroup(z) { return ['亥子丑', '寅卯辰', '巳午未', '申酉戌'].findIndex(function (g) { return g.indexOf(z) >= 0; }); }
  var GOSIN = ['寅', '巳', '申', '亥'], GWASUK = ['戌', '丑', '辰', '未'];
  var GOEGANG = ['庚辰', '庚戌', '壬辰', '壬戌', '戊戌'];
  var BAEKHO = ['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑'];

  function calcSinsal(P, xunkong) {
    var found = {}, dm = P[2].gan, ps = P.filter(Boolean);
    function add(key, where) { if (!found[key]) found[key] = []; if (found[key].indexOf(where) < 0) found[key].push(where); }
    ps.forEach(function (p) {
      if (T.tianyi[dm].indexOf(p.zhi) >= 0) add('천을귀인', p.pos);
      if (T.munchang[dm] === p.zhi) add('문창귀인', p.pos);
      if (T.hakdang[dm] === p.zhi) add('학당귀인', p.pos);
      if (T.geumyeo[dm] === p.zhi) add('금여', p.pos);
      if (T.rok[dm] === p.zhi) add('건록', p.pos);
      if (T.yangin[dm] === p.zhi) add('양인살', p.pos);
      if (T.hongyeom[dm] === p.zhi) add('홍염살', p.pos);
      var gz = p.gan + p.zhi;
      if (BAEKHO.indexOf(gz) >= 0) add('백호살', p.pos);
      if (GOEGANG.indexOf(gz) >= 0 && (p.pos === '일주' || p.pos === '시주' || p.pos === '월주' || p.pos === '년주')) add('괴강살', p.pos);
    });
    // 년지·일지 기준 삼합 계열
    [P[0], P[2]].forEach(function (base) {
      var g = samhapGroup(base.zhi);
      ps.forEach(function (p) {
        if (p === base) return;
        if (DOHWA[g] === p.zhi) add('도화살', p.pos);
        if (YEOKMA[g] === p.zhi) add('역마살', p.pos);
        if (HWAGAE[g] === p.zhi) add('화개살', p.pos);
      });
    });
    // 월지 기준 천덕·월덕
    var mz = P[1].zhi, cd = T.cheondeok[mz], wd = WOLDEOK[samhapGroup(mz)];
    ps.forEach(function (p) {
      if (p.gan === cd || (p !== P[1] && p.zhi === cd)) add('천덕귀인', p.pos);
      if (p.gan === wd) add('월덕귀인', p.pos);
    });
    // 년지 기준 고신·과숙
    var bg = bangGroup(P[0].zhi);
    ps.forEach(function (p) {
      if (p === P[0]) return;
      if (GOSIN[bg] === p.zhi) add('고신살', p.pos);
      if (GWASUK[bg] === p.zhi) add('과숙살', p.pos);
    });
    // 원진·귀문 (지지 쌍)
    for (var i = 0; i < ps.length; i++) for (var j = i + 1; j < ps.length; j++) {
      if (inPairs(WONJIN, ps[i].zhi, ps[j].zhi)) add('원진살', ps[i].pos + '·' + ps[j].pos);
      if (inPairs(GWIMUN, ps[i].zhi, ps[j].zhi)) add('귀문관살', ps[i].pos + '·' + ps[j].pos);
    }
    // 공망 (일주 기준)
    ps.forEach(function (p) { if (p.pos !== '일주' && xunkong.indexOf(p.zhi) >= 0) add('공망', p.pos); });
    return Object.keys(found).map(function (k) { return { key: k, where: found[k] }; });
  }

  /* ---------- 메인 계산 ---------- */
  function analyze(input) {
    var y = +input.year, m = +input.month, d = +input.day;
    var unknown = !!input.timeUnknown;
    var h = unknown ? 12 : +input.hour, mi = unknown ? 0 : +input.minute;
    var sect = input.yajasi ? 2 : 1;
    if (input.calendar === 'lunar') {
      var ls = Lunar.fromYmdHms(y, input.leap ? -m : m, d, h, mi, 0).getSolar();
      y = ls.getYear(); m = ls.getMonth(); d = ls.getDay();
    }
    var utc = koreaWallToUtc(y, m, d, h, mi);
    var offset = seoulOffsetMin(utc);
    var lon = +input.longitude || 127.0;
    var lmtMs = input.noCorrection ? utc + offset * 60000 : utc + lon / 15 * 3600000;
    var fA = fields(utc + 8 * 3600000), fB = fields(lmtMs);
    var ecA = Solar.fromYmdHms.apply(null, fA).getLunar().getEightChar(); ecA.setSect(sect);
    var ecB = Solar.fromYmdHms.apply(null, fB).getLunar().getEightChar(); ecB.setSect(sect);

    var gz = [ecA.getYear(), ecA.getMonth(), ecB.getDay(), unknown ? null : ecB.getTime()];
    var posNames = ['년주', '월주', '일주', '시주'];
    var dm = gz[2][0], dmEl = stemEl(dm);
    var P = gz.map(function (g, i) {
      if (!g) return null;
      var gan = g[0], zhi = g[1];
      return {
        pos: posNames[i], gan: gan, zhi: zhi, ganKo: ko(gan), zhiKo: ko(zhi),
        ganEl: stemEl(gan), zhiEl: branchEl(zhi),
        ganTen: i === 2 ? '일간(나)' : tenGod(dm, gan), zhiTen: tenGodBranch(dm, zhi),
        hidden: HIDDEN[zhi].map(function (s) { return { ch: s, ko: ko(s), ten: tenGod(dm, s) }; }),
        unseong: unseong(dm, zhi)
      };
    });

    // 오행 개수(8글자)와 가중치
    var count = [0, 0, 0, 0, 0], weight = [0, 0, 0, 0, 0], support = 0, total = 0;
    var stemW = [1, 1, 0, 1], branchW = [1, 3, 1.5, 1];
    P.forEach(function (p, i) {
      if (!p) return;
      count[p.ganEl]++; count[p.zhiEl]++;
      weight[p.ganEl] += 1;
      var hs = HIDDEN[p.zhi], hw = HIDDEN_W[hs.length];
      hs.forEach(function (s, k) {
        var e = stemEl(s), w = branchW[i] * hw[k];
        weight[e] += w; total += w;
        var g = relIndex(dmEl, e); if (g === 0 || g === 4) support += w;
      });
      if (stemW[i]) {
        total += stemW[i];
        var g2 = relIndex(dmEl, p.ganEl); if (g2 === 0 || g2 === 4) support += stemW[i];
      }
    });
    var wsum = weight.reduce(function (a, b) { return a + b; }, 0);
    var pct = weight.map(function (w) { return Math.round(w / wsum * 100); });
    var groupPct = [0, 1, 2, 3, 4].map(function (g) { return pct[(dmEl + g) % 5]; });
    var ratio = support / total;
    var label = ratio < 0.25 ? '극신약' : ratio < 0.42 ? '신약' : ratio <= 0.55 ? '중화' : ratio < 0.7 ? '신강' : '극신강';
    if (label === '중화') label += ratio < 0.485 ? '(신약 쪽)' : '(신강 쪽)';
    var mg = relIndex(dmEl, branchEl(P[1].zhi)), dg = relIndex(dmEl, branchEl(P[2].zhi));
    var strength = {
      ratio: ratio, score: Math.round(ratio * 100), label: label, weak: ratio < 0.485,
      deukryeong: mg === 0 || mg === 4, deukji: dg === 0 || dg === 4
    };

    // 용신(억부 중심 + 조후 보조)
    var gw = groupPct, yongG, heeG, reason;
    if (strength.weak) {
      var drain = [1, 2, 3].sort(function (a, b) { return gw[b] - gw[a]; })[0];
      if (drain === 2) { yongG = 0; heeG = 4; reason = '일간이 약한데 재성(돈·현실 부담)이 가장 무거워, 같은 편(비겁)으로 버틸 힘을 보태는 것이 먼저'; }
      else { yongG = 4; heeG = 0; reason = drain === 3 ? '일간이 약한데 관성(압박·책임)이 무거워, 인성으로 압박을 받아 내 힘으로 바꾸는 것이 먼저' : '일간이 약한데 식상(표현·소모)으로 힘이 빠져, 인성으로 채워 주는 것이 먼저'; }
    } else {
      if (gw[0] >= gw[4]) {
        yongG = gw[3] >= 8 ? 3 : 1; heeG = 2;
        reason = yongG === 3 ? '일간이 강하고 비겁(내 고집·경쟁심)이 많아, 관성(규칙·목표)으로 다듬어야 큰 그릇이 됨' : '일간이 강하고 비겁이 많은데 관성이 약해, 식상(표현·생산)으로 에너지를 흘려보내는 것이 유리';
      } else { yongG = 2; heeG = 1; reason = '일간이 강하고 인성(생각·의존)이 많아, 재성(현실·실행)으로 생각을 결과로 바꿔야 함'; }
    }
    var yong = (dmEl + yongG) % 5, hee = (dmEl + heeG) % 5;
    var gi = controlledBy(yong), gu = generatedBy(gi);
    if (gu === hee || gu === yong) gu = -1;
    var mzI = bi(P[1].zhi), johu = null;
    if ([5, 6, 7].indexOf(mzI) >= 0 && pct[1] >= 25 && pct[4] < 15) johu = 4;
    if ([11, 0, 1].indexOf(mzI) >= 0 && pct[4] >= 25 && pct[1] < 15) johu = 1;
    var yongsin = {
      yong: yong, hee: hee, gi: gi, gu: gu, johu: johu, reason: reason,
      yongGroup: GROUPS[yongG], heeGroup: GROUPS[heeG]
    };
    function elScore(e) { return e === yong ? 2 : e === hee ? 1 : e === gi ? -2 : e === gu ? -1 : 0; }

    // 원국 관계
    var items = [];
    P.forEach(function (p) {
      if (!p) return;
      items.push({ label: p.pos.replace('주', '간'), ch: p.gan, kind: 'stem' });
      items.push({ label: p.pos.replace('주', '지'), ch: p.zhi, kind: 'branch' });
    });
    var natalRel = pairRelations(items, items, true).concat(samhapCheck(items.filter(function (x) { return x.kind === 'branch'; })));
    var xunkong = ecB.getDayXunKong();
    var sinsal = calcSinsal(P, xunkong);

    // 대운
    var gender = input.gender === 'M' ? 1 : 0;
    var yun = ecA.getYun(gender);
    var birthYear = fA[0];
    var daeun = yun.getDaYun(11).slice(1).map(function (dy) {
      var g = dy.getGanZhi(), s = g[0], z = g[1];
      var sc = 0.4 * elScore(stemEl(s)) + 0.6 * elScore(branchEl(z));
      var rel = pairRelations([{ label: '대운간', ch: s, kind: 'stem' }, { label: '대운지', ch: z, kind: 'branch' }], items, false);
      var clashCore = rel.filter(function (r) { return (r.type === '충' || r.type === '천간충') && /(일|월)/.test(r.where); });
      return {
        gz: g, ko: gzKo(g), startYear: dy.getStartYear(), endYear: dy.getEndYear(),
        age: dy.getStartYear() - birthYear, stemTen: tenGod(dm, s), branchTen: tenGodBranch(dm, z),
        stemEl: stemEl(s), branchEl: branchEl(z), score: Math.round(sc * 10) / 10,
        trend: sc >= 0.8 ? '상승' : sc <= -0.8 ? '하강' : '정체', change: clashCore.length > 0, rel: rel
      };
    });
    var forward = (si(gz[0][0]) % 2 === 0) === (gender === 1);

    var res = {
      input: input, gender: gender ? '남' : '여', P: P, dm: dm, dmKo: ko(dm), dmEl: dmEl,
      solarBirth: y + '-' + pad(m) + '-' + pad(d) + (unknown ? ' (시간 모름)' : ' ' + pad(h) + ':' + pad(mi)),
      trueSolar: unknown ? null : pad(fB[3]) + ':' + pad(fB[4]), utcOffset: offset,
      count: count, pct: pct, groupPct: groupPct, strength: strength, yongsin: yongsin,
      natalRel: natalRel, sinsal: sinsal, xunkong: xunkong.split('').map(ko).join(''),
      daeun: daeun, daeunStart: { y: yun.getStartYear(), m: yun.getStartMonth(), d: yun.getStartDay() },
      forward: forward, birthYear: birthYear, items: items, elScore: elScore
    };
    return res;
  }

  function currentDaeun(A, year) {
    for (var i = 0; i < A.daeun.length; i++) if (year >= A.daeun[i].startYear && year <= A.daeun[i].endYear) return A.daeun[i];
    return null;
  }

  // 특정 연도 세운 + 월운
  function yearFortune(A, Y) {
    var ygz = Solar.fromYmd(Y, 7, 1).getLunar().getYearInGanZhiByLiChun();
    var s = ygz[0], z = ygz[1], dm = A.dm;
    var rel = pairRelations([{ label: '세운간', ch: s, kind: 'stem' }, { label: '세운지', ch: z, kind: 'branch' }], A.items, false);
    var dy = currentDaeun(A, Y);
    var relDy = dy ? pairRelations([{ label: '세운간', ch: s, kind: 'stem' }, { label: '세운지', ch: z, kind: 'branch' }],
      [{ label: '대운간', ch: dy.gz[0], kind: 'stem' }, { label: '대운지', ch: dy.gz[1], kind: 'branch' }], false) : [];
    var months = [];
    for (var m = 1; m <= 12; m++) {
      var lu = Solar.fromYmd(Y, m, 15).getLunar();
      var mg = lu.getMonthInGanZhiExact(), jie = lu.getPrevJie(true);
      var mrel = pairRelations([{ label: '월운지', ch: mg[1], kind: 'branch' }], A.items.filter(function (x) { return x.kind === 'branch'; }), false);
      months.push({
        m: m, gz: mg, ko: gzKo(mg), stemTen: tenGod(dm, mg[0]), branchTen: tenGodBranch(dm, mg[1]),
        score: Math.round((0.4 * A.elScore(stemEl(mg[0])) + 0.6 * A.elScore(branchEl(mg[1]))) * 10) / 10,
        jieName: jie.getName(), jieDate: jie.getSolar().getMonth() + '/' + jie.getSolar().getDay(), rel: mrel
      });
    }
    return {
      year: Y, gz: ygz, ko: gzKo(ygz), stemTen: tenGod(dm, s), branchTen: tenGodBranch(dm, z),
      score: Math.round((0.4 * A.elScore(stemEl(s)) + 0.6 * A.elScore(branchEl(z))) * 10) / 10,
      rel: rel, relDy: relDy, daeun: dy, months: months
    };
  }

  var api = {
    analyze: analyze, yearFortune: yearFortune, currentDaeun: currentDaeun,
    EL: EL, EL_HANJA: EL_HANJA, GROUPS: GROUPS, ANIMALS: ANIMALS, BRANCHES: BRANCHES,
    ko: ko, gzKo: gzKo, stemEl: stemEl, branchEl: branchEl, tenGod: tenGod, groupOfTen: groupOfTen,
    generates: generates, generatedBy: generatedBy, controls: controls, controlledBy: controlledBy, bi: bi
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Saju = api;
})(typeof window !== 'undefined' ? window : this);
