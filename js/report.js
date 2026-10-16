/* 9가지 분석 리포트와 AI 심층분석 프롬프트 생성기 */
(function (root) {
  'use strict';
  var S = root.Saju, KB = root.KB;
  var EL = S.EL;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function elName(e) { return KB.ELEMENT[e].name; }
  function cra(cause, result, action) {
    return '<div class="cra"><p><b class="tag t-cause">원인</b>' + cause + '</p><p><b class="tag t-result">결과</b>' + result + '</p><p><b class="tag t-action">행동</b>' + action + '</p></div>';
  }
  function sec(title, body) { return '<section class="rsec"><h3>' + title + '</h3>' + body + '</section>'; }
  function sub(title, body) { return '<h4>' + title + '</h4>' + body; }
  function list(arr) { return '<ul>' + arr.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function josa(word, a, b) { var c = word.charCodeAt(word.length - 1); if (c < 0xac00 || c > 0xd7a3) return word + a; return word + ((c - 0xac00) % 28 ? a : b); }

  /* ---------- 공통 해석 도우미 ---------- */
  function ctx(A) {
    var dm = KB.DAY_MASTER[A.dm], y = A.yongsin, g = A.groupPct;
    var order = [0, 1, 2, 3, 4].sort(function (a, b) { return A.pct[b] - A.pct[a]; });
    var gorder = [0, 1, 2, 3, 4].sort(function (a, b) { return g[b] - g[a]; });
    var male = A.gender === '남';
    var spouseG = male ? 2 : 3;
    var has = function (k) { return A.sinsal.some(function (s) { return s.key === k; }); };
    var dayRel = A.natalRel.filter(function (r) { return /일지/.test(r.where); });
    return {
      dm: dm, y: y, g: g, order: order, gorder: gorder, strongEl: order[0], weakEl: order[4],
      strongG: S.GROUPS[gorder[0]], weakG: S.GROUPS[gorder[4]], male: male, spouseG: spouseG,
      spouseName: male ? '재성(아내·여성 인연)' : '관성(남편·남성 인연)', has: has, dayRel: dayRel,
      lacking: [0, 1, 2, 3, 4].filter(function (e) { return A.count[e] === 0 || A.pct[e] <= 7; }),
      excess: [0, 1, 2, 3, 4].filter(function (e) { return A.pct[e] >= 33; }),
      yongEl: KB.ELEMENT[y.yong], heeEl: KB.ELEMENT[y.hee], giEl: KB.ELEMENT[y.gi]
    };
  }
  function gp(A, name) { return A.groupPct[S.GROUPS.indexOf(name)]; }
  function level(p) { return p >= 30 ? '매우 강함' : p >= 20 ? '강함' : p >= 11 ? '보통' : p >= 5 ? '약함' : '거의 없음'; }
  function strengthText(A) {
    var s = A.strength;
    return '일간 ' + A.dm + '(' + A.dmKo + KB.ELEMENT[A.dmEl].short + ')의 자기편 기운(비겁·인성)이 ' + s.score + '% 정도로 <b>' + s.label + '</b>에 해당한다(웹앱 추정). 월지에서 ' + (s.deukryeong ? '힘을 얻었고(득령)' : '힘을 얻지 못했고(실령)') + ', 일지에서 ' + (s.deukji ? '뿌리를 얻었다(득지)' : '뿌리가 약하다(실지)') + '.';
  }
  function daeunLabel(d) { return d.startYear + '~' + d.endYear + ' (만 ' + d.age + '~' + (d.age + 9) + '세) ' + d.gz + '(' + d.ko + ') 대운'; }
  function trendBadge(d) {
    var t = d.trend === '상승' ? '<span class="pill up">상승</span>' : d.trend === '하강' ? '<span class="pill down">조심</span>' : '<span class="pill flat">정체·유지</span>';
    return t + (d.change ? ' <span class="pill turn">전환</span>' : '');
  }
  function turningPoints(A) {
    var pts = [];
    for (var i = 1; i < A.daeun.length; i++) {
      var prev = A.daeun[i - 1], cur = A.daeun[i];
      if (cur.age > 85) break;
      var diff = Math.abs(cur.score - prev.score) + (cur.change ? 1.2 : 0) + (S.groupOfTen(cur.branchTen) !== S.groupOfTen(prev.branchTen) ? 0.3 : 0);
      pts.push({ d: cur, prev: prev, diff: diff });
    }
    pts.sort(function (a, b) { return b.diff - a.diff; });
    return pts.slice(0, 3).sort(function (a, b) { return a.d.startYear - b.d.startYear; });
  }
  function relText(rels) {
    if (!rels.length) return '뚜렷한 합·충·형은 없다';
    return rels.map(function (r) { return r.where + ' ' + r.pair + ' <b>' + r.type + '</b>(' + (KB.REL_MEAN[r.type] || r.note) + ')'; }).join(', ');
  }
  function groupDesc(gName) { return KB.GROUP[gName]; }
  function thisYear() { return new Date().getFullYear(); }

  /* ---------- 1. 평생운 ---------- */
  function r1(A) {
    var c = ctx(A), out = '';
    var line = c.dm.img + '가 ' + elName(c.y.yong) + ' 기운(' + c.y.yongGroup + ')을 만나야 크게 쓰이는 인생';
    out += sec('① 평생 총평 & 인생 흐름 한 줄 정의',
      '<p class="lead">“' + line + '”</p>' +
      cra(c.dm.name + ' 일간은 ' + c.dm.img + '의 상징이다. ' + strengthText(A) + ' 억부 기준 용신은 <b>' + elName(c.y.yong) + '</b>(' + c.y.yongGroup + '), 희신은 ' + elName(c.y.hee) + '이다. 이유: ' + c.y.reason + '.',
        '타고난 성향은 “' + c.dm.core + '”이다. 강점은 ' + c.dm.good + '이고, 반복되는 약점은 ' + c.dm.weak + '이다. 원국에서 가장 큰 힘은 ' + c.strongG + '(' + gp(A, c.strongG) + '%), 가장 비어 있는 곳은 ' + c.weakG + '(' + gp(A, c.weakG) + '%)라서 인생이 ' + c.strongG + '의 방식으로 풀리고, ' + c.weakG + '의 영역에서 막히는 패턴이 반복되기 쉽다.',
        '인생 전체의 방향키는 ' + c.y.yongGroup + '이다. ' + c.y.yongGroup + '에 해당하는 사람·환경·습관(' + groupDesc(c.y.yongGroup).mean + ')을 의식적으로 늘리고, ' + c.dm.env + '을 고르는 것이 평생 운을 키우는 가장 확실한 방법이다.'));

    var love = gp(A, S.GROUPS[c.spouseG]), money = gp(A, '재성'), job = gp(A, '관성'), sik = gp(A, '식상'), bi = gp(A, '비겁');
    var guiin = A.sinsal.filter(function (s) { return KB.SINSAL[s.key] && KB.SINSAL[s.key].kind === '길성'; }).map(function (s) { return s.key; });
    var day = A.P[2];
    var b = '';
    b += sub('애정운', cra('배우자 자리(일지)는 ' + day.zhi + '(' + day.zhiKo + '), 십성으로 ' + day.zhiTen + '이고 12운성은 ' + day.unseong + '(' + KB.UNSEONG[day.unseong] + ')이다. 배우자 별인 ' + c.spouseName + '은 ' + level(love) + '(' + love + '%). 일지 관련 작용: ' + relText(c.dayRel) + '.',
      love >= 20 ? '인연은 많은 편이다. 대신 선택지가 많아 결정을 미루거나 관계가 겹칠 수 있다.' : love >= 8 ? '인연의 양은 보통이다. 억지로 찾기보다 생활 반경 안에서 자연스럽게 생기는 인연이 오래 간다.' : '배우자 별이 약해 연애에 대한 관심이 적거나 늦게 인연이 온다. 대운에서 배우자 별이 들어올 때가 핵심 시기다.',
      '배우자 자리 ' + day.zhiTen + '의 성격(' + KB.TEN[day.zhiTen] + ')을 존중해 주는 상대를 고르고, 연애운이 강한 대운·세운(7번 리포트 참고)에 만남의 빈도를 의식적으로 늘린다.'));
    b += sub('재물운', cra('재성 ' + level(money) + '(' + money + '%), 재성을 만들어 내는 식상 ' + level(sik) + '(' + sik + '%), 재성을 뺏는 비겁 ' + level(bi) + '(' + bi + '%).',
      (sik >= 15 && money >= 10) ? '재능이 돈으로 이어지는 “식상생재” 흐름이 있다. 일한 만큼 버는 구조라 기술·콘텐츠·서비스로 수입원을 늘리기 좋다.' : money >= 25 && A.strength.weak ? '돈은 보이는데 내 힘이 약해 감당이 어려운 “재다신약” 경향이 있다. 큰돈을 쥘수록 몸과 마음이 지친다.' : bi >= 30 ? '비겁이 강해 돈이 사람(동료·형제·지인)을 통해 새기 쉽다.' : money < 8 ? '재성이 약해 돈 자체보다 명예·지식·관계로 먼저 가치를 쌓고, 그 결과로 돈이 따라오는 구조다.' : '재물 구조는 무난하다. 관리 습관에 따라 결과 차이가 크게 난다.',
      '6번(돈의 그릇) 리포트의 수입 구조 2~3가지를 기준으로 삼고, 수입의 일정 비율을 자동 저축으로 묶는다.'));
    b += sub('직업·사업운', cra('관성(조직·명예) ' + job + '%, 식상(재능·표현) ' + sik + '%, 재성(사업·거래) ' + money + '%. 일간 성향: ' + c.dm.work + '.',
      job >= sik && job >= 15 ? '조직·자격·직함을 통해 인정받는 흐름이 강하다.' : sik >= 20 ? '내 재능과 결과물로 승부하는 흐름이 강하다. 조직에 있어도 “내 이름이 걸린 일”을 해야 오래 간다.' : '한 가지 길보다 경험을 넓히며 맞는 자리를 찾는 흐름이다.',
      '어울리는 분야: ' + KB.ELEMENT[c.y.yong].jobs + '(용신 기준), ' + groupDesc(c.strongG).job + '(가장 강한 기운 기준). 자세한 판단은 8번 리포트 참고.'));
    b += sub('인간관계·귀인운', cra('비겁(동료·형제) ' + bi + '%, 인성(윗사람·후원) ' + gp(A, '인성') + '%. 길성: ' + (guiin.length ? guiin.join(', ') : '뚜렷한 귀인성 없음') + '.',
      guiin.length ? '어려울 때 손을 내미는 사람이 나타나는 구조다. 다만 받은 도움을 당연히 여기면 그 복이 줄어든다.' : '귀인을 기다리기보다 스스로 관계를 만들어야 하는 구조다. 꾸준히 신뢰를 쌓을 때 사람이 남는다.',
      c.y.yongGroup === '인성' ? '용신이 인성이니 스승·멘토·윗사람과의 관계가 곧 운이다. 정기적으로 연락하고 배움을 청하라.' : c.y.yongGroup === '비겁' ? '용신이 비겁이니 동료·팀·커뮤니티가 곧 운이다. 혼자 하지 말고 함께할 사람을 만들어라.' : '용신(' + c.y.yongGroup + ')에 해당하는 역할의 사람(' + groupDesc(c.y.yongGroup).mean + ')을 곁에 두면 일이 풀린다.'));
    b += sub('건강운', cra('전통 명리에서는 오행을 장부와 연결해 본다. 가장 약한 기운은 ' + elName(c.weakEl) + '(' + A.pct[c.weakEl] + '%), 가장 강한 기운은 ' + elName(c.strongEl) + '(' + A.pct[c.strongEl] + '%)이다.',
      '명리적 관점에서는 ' + KB.ELEMENT[c.weakEl].body + ' 쪽과, 과한 ' + KB.ELEMENT[c.strongEl].short + ' 기운에 해당하는 ' + KB.ELEMENT[c.strongEl].body + ' 쪽을 관리 포인트로 본다. 이는 의학적 진단이 아니다.',
      '정기 건강검진을 기본으로 하고, 생활에서는 ' + KB.ELEMENT[c.y.yong].sports + ' 같은 활동으로 리듬을 유지한다. 증상이 있으면 반드시 의료기관에서 확인한다.'));
    out += sec('② 5대 평생운', b);

    var rows = A.daeun.filter(function (d) { return d.age <= 90; }).map(function (d) {
      return '<tr><td>' + d.startYear + '~' + d.endYear + '<br><small>만 ' + d.age + '세~</small></td><td><b>' + d.gz + '</b><br><small>' + d.ko + '</small></td><td>' + d.stemTen + ' / ' + d.branchTen + '</td><td>' + trendBadge(d) + '</td></tr>';
    }).join('');
    var dyText = A.daeun.filter(function (d) { return d.age <= 80; }).map(function (d) {
      var gname = S.groupOfTen(d.branchTen);
      return '<p><b>' + daeunLabel(d) + '</b> ' + trendBadge(d) + '<br>' +
        '<span class="muted">원인</span> 천간 ' + d.stemTen + '(' + elName(d.stemEl) + '), 지지 ' + d.branchTen + '(' + elName(d.branchEl) + '). 용신 기준 점수 ' + d.score + '. ' + (d.change ? '원국 일지·월지와 충이 있어 환경 변화가 크다. ' : '') +
        '<br><span class="muted">결과</span> ' + groupDesc(gname).mean.split(':')[1] + '의 주제가 10년의 중심이 된다. ' + (d.trend === '상승' ? '노력 대비 결과가 잘 나오는 시기.' : d.trend === '하강' ? '힘을 아끼고 지키는 운영이 필요한 시기.' : '큰 변화보다 기반을 다지는 시기.') +
        '<br><span class="muted">행동</span> ' + (d.trend === '상승' ? '이 시기에 도전·확장·투자를 집중한다.' : d.trend === '하강' ? '무리한 확장·보증·큰 투자를 피하고 실력과 건강을 쌓는다.' : '루틴·자격·인맥처럼 다음 상승기에 쓸 자산을 모은다.') + '</p>';
    }).join('');
    out += sec('③ 대운 흐름 분석 (10년 단위)', '<p>대운은 ' + (A.forward ? '순행' : '역행') + '하며, 첫 대운은 출생 후 약 ' + A.daeunStart.y + '년 ' + A.daeunStart.m + '개월 뒤 시작한다.</p><div class="tablewrap"><table class="dytable"><thead><tr><th>기간</th><th>대운</th><th>십성(천간/지지)</th><th>흐름</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + dyText);

    out += sec('④ 인생의 가장 중요한 전환점', turningPoints(A).map(function (t, i) {
      var d = t.d;
      return sub('전환점 ' + (i + 1) + ': ' + d.startYear + '년 무렵 (만 ' + d.age + '세)',
        cra('대운이 ' + t.prev.gz + '에서 ' + d.gz + '로 바뀌며, 지지 십성이 ' + t.prev.branchTen + ' → ' + d.branchTen + '로 이동한다. 용신 점수 ' + t.prev.score + ' → ' + d.score + '. ' + (d.change ? '원국 핵심 자리와 충이 생긴다.' : ''),
          S.groupOfTen(d.branchTen) + '의 주제(' + groupDesc(S.groupOfTen(d.branchTen)).mean.split(':')[1].trim() + ')가 인생 중심으로 들어온다. ' + (d.score > t.prev.score ? '환경이 나에게 유리하게 바뀌는 상승 전환이다.' : '익숙한 방식이 통하지 않게 되는 재정비 전환이다.'),
          (d.score > t.prev.score ? '전환 1~2년 전부터 준비한 것을 이 시기에 꺼낸다. 망설이면 기회가 지나간다.' : '전환 직전에 빚·보증·무리한 계약을 정리하고, 몸과 현금 여유를 확보해 둔다.')));
    }).join(''));

    out += sec('⑤ 평생 리스크 패턴 & 운을 키우는 핵심 전략',
      cra('기신은 ' + elName(c.y.gi) + '이다. 가장 강한 기운 ' + c.strongG + '이 지나치면 “' + groupDesc(c.strongG).strong.split('. ')[1] + '”',
        '평생 반복될 수 있는 패턴: ' + c.dm.weak + '. 기신 운(' + elName(c.y.gi) + ')이 강한 해에는 이 패턴이 커진다.',
        list(['용신 ' + elName(c.y.yong) + ' 생활화: 색(' + c.yongEl.color + '), 방향(' + c.yongEl.dir + '), 활동(' + c.yongEl.sports + ')',
          '부족한 ' + c.weakG + ' 보완: ' + groupDesc(c.weakG).weak,
          '상승 대운에 도전, 하강 대운에 수비라는 원칙을 지킨다',
          '큰 결정은 감정이 가라앉은 뒤 하루 이상 미뤄서 한다'])));
    return out;
  }

  /* ---------- 2. 연간 운세 ---------- */
  function r2(A, Y) {
    var c = ctx(A), F = S.yearFortune(A, Y), out = '';
    var g1 = S.groupOfTen(F.stemTen), g2 = S.groupOfTen(F.branchTen);
    var dy = F.daeun;
    var verdict = F.score >= 0.8 ? '밀고 나가는 해' : F.score <= -0.8 ? '지키고 다지는 해' : '정리하고 준비하는 해';
    out += sec('① 총평 & 핵심 선언',
      '<p class="lead">' + Y + '년 ' + F.gz + '(' + F.ko + ')년: “' + verdict + '”</p>' +
      cra(Y + '년 세운의 천간 ' + F.gz[0] + '는 나에게 ' + F.stemTen + ', 지지 ' + F.gz[1] + '는 ' + F.branchTen + '이다. 현재 대운은 ' + (dy ? dy.gz + '(' + dy.stemTen + '/' + dy.branchTen + ')' : '확인 불가') + '. 원국과의 작용: ' + relText(F.rel) + '. 대운과의 작용: ' + relText(F.relDy) + '. 용신 기준 점수 ' + F.score + '.',
        '올해의 주제는 ' + g1 + '(' + KB.TEN[F.stemTen] + ')과 ' + g2 + '(' + KB.TEN[F.branchTen] + ')이다. ' + (F.rel.some(function (r) { return r.type === '충'; }) ? '충이 있어 이사·이직·관계 변화 같은 움직임이 생기기 쉽다. ' : '') + (F.rel.some(function (r) { return /합/.test(r.type); }) ? '합이 있어 새로운 인연·계약·협력이 들어오기 쉽다. ' : ''),
        '핵심 선언: “올해는 ' + KB.MONTH[F.branchTen].kw + '의 해다.” ' + KB.MONTH[F.branchTen].act[0] + '.'));

    var b = '';
    var spouseHit = S.groupOfTen(F.stemTen) === S.GROUPS[c.spouseG] || S.groupOfTen(F.branchTen) === S.GROUPS[c.spouseG];
    var dayHit = F.rel.filter(function (r) { return /일지/.test(r.where); });
    b += sub('애정운', cra('배우자 별(' + c.spouseName + ')이 올해 ' + (spouseHit ? '들어온다' : '직접 들어오지는 않는다') + '. 배우자 자리(일지)와의 작용: ' + relText(dayHit) + '.',
      spouseHit ? '새 인연이 생기거나 기존 관계가 진전(결혼·동거 이야기)되기 쉬운 해.' : dayHit.some(function (r) { return r.type === '충'; }) ? '관계에 변화가 생기거나 다툼이 늘 수 있는 해.' : '큰 변화보다 현재 관계를 다지는 해.',
      spouseHit ? '소개·모임 자리를 거절하지 말고, 진지한 대화를 피하지 말 것.' : '서운함은 그때그때 말로 풀고, 함께하는 루틴(주 1회 데이트·산책)을 만든다.'));
    b += sub('재물운', cra('올해 재성 관련 십성: ' + [F.stemTen, F.branchTen].filter(function (t) { return /재/.test(t); }).join(', ') + (/(재)/.test(F.stemTen + F.branchTen) ? '' : '없음') + '. 겁재 여부: ' + (/(겁재)/.test(F.stemTen + F.branchTen) ? '있음' : '없음') + '.',
      /(재)/.test(F.stemTen + F.branchTen) ? '돈이 움직이는 해다. 수입 기회가 늘지만 지출도 함께 커진다.' : /(겁재|비견)/.test(F.stemTen + F.branchTen) ? '돈이 사람을 따라 나가기 쉬운 해다. 빌려주기·동업·보증에 주의.' : '돈보다 실력·자격·평판을 쌓는 해다. 그 결과가 다음 해 수입으로 이어진다.',
      '월 고정비 점검, 수입의 일정 비율 자동 저축, 큰 지출은 2주 숙고 원칙.'));
    b += sub('직업·사업운', cra('관성(직장·명예) 관련: ' + (/(관)/.test(F.stemTen + F.branchTen) ? '있음' : '없음') + ', 식상(성과·표현) 관련: ' + (/(식신|상관)/.test(F.stemTen + F.branchTen) ? '있음' : '없음') + '.',
      /(관)/.test(F.stemTen + F.branchTen) ? '책임과 자리가 커지는 해. 승진·이직 제안이 올 수 있지만 압박도 함께 온다.' : /(식신|상관)/.test(F.stemTen + F.branchTen) ? '내 결과물로 인정받는 해. 새 프로젝트·부업·콘텐츠에 좋다.' : '내부를 정비하고 배움에 투자하는 해.',
      KB.MONTH[F.stemTen].act[0] + ' / ' + KB.MONTH[F.branchTen].act[1]));
    b += sub('인간관계·귀인운', cra('올해 인성·비겁 기운: ' + [F.stemTen, F.branchTen].filter(function (t) { return /(인|비견|겁재)/.test(t); }).join(', ') + '. 원국 귀인성: ' + (A.sinsal.filter(function (s) { return /귀인/.test(s.key); }).map(function (s) { return s.key; }).join(', ') || '없음') + '.',
      /(인)/.test(F.stemTen + F.branchTen) ? '윗사람·멘토·문서의 도움이 들어오는 해.' : /(비견|겁재)/.test(F.stemTen + F.branchTen) ? '동료·경쟁자가 함께 늘어나는 해. 협력과 경쟁을 구분해야 한다.' : '관계는 넓히기보다 핵심 인맥을 지키는 해.',
      '올해 도움 받은 사람 목록을 만들고, 분기마다 감사 연락을 한다.'));
    b += sub('건강운', cra('올해 들어오는 오행: ' + elName(S.stemEl(F.gz[0])) + '·' + elName(S.branchEl(F.gz[1])) + '. 원국에서 가장 강한 기운: ' + elName(c.strongEl) + '.',
      (S.stemEl(F.gz[0]) === c.strongEl || S.branchEl(F.gz[1]) === c.strongEl) ? '이미 많은 ' + KB.ELEMENT[c.strongEl].short + ' 기운이 더해져 과로·과열을 조심하라는 상징.' : '기운의 균형은 무난한 편. 생활 리듬이 핵심이다.',
      '수면 시간 고정, 주 3회 ' + c.yongEl.sports + ', 정기검진. 몸에 이상 신호가 있으면 병원 진료가 먼저다(명리는 의학적 판단이 아님).'));
    out += sec('② 5대 종합 운세', b);

    var mrows = F.months.map(function (m) {
      var k = KB.MONTH[m.branchTen];
      var badge = m.score >= 0.8 ? '<span class="pill up">기회</span>' : m.score <= -0.8 ? '<span class="pill down">조심</span>' : '<span class="pill flat">보통</span>';
      var rel = m.rel.filter(function (r) { return r.type === '충' || r.type === '육합' || r.type === '형'; }).map(function (r) { return r.type + '(' + r.where.split('·')[1] + ')'; }).join(' ');
      return '<tr><td><b>' + m.m + '월</b><br><small>' + m.jieName + ' ' + m.jieDate + '~</small></td><td>' + m.gz + '<br><small>' + m.stemTen + '/' + m.branchTen + '</small></td><td>' + badge + ' <b>' + KB.MONTH[m.stemTen].kw + ' · ' + k.kw + '</b>' + (rel ? '<br><small>' + rel + '</small>' : '') + '</td><td>' + list([KB.MONTH[m.stemTen].act[0], k.act[1]]) + '</td></tr>';
    }).join('');
    out += sec('③ 월별 운세 (양력 기준, 절기로 달이 바뀜)', '<div class="tablewrap"><table class="mtable"><thead><tr><th>월</th><th>월운</th><th>키워드</th><th>행동 2가지</th></tr></thead><tbody>' + mrows + '</tbody></table></div>');

    var best = F.months.slice().sort(function (a, b) { return b.score - a.score; })[0];
    var worst = F.months.slice().sort(function (a, b) { return a.score - b.score; })[0];
    out += sec('④ 마지막 시크릿',
      '<p><b>전체 요약</b>: ' + Y + '년은 ' + g1 + '·' + g2 + '의 해, “' + verdict + '”다.</p>' +
      cra('가장 유리한 달은 ' + best.m + '월(' + best.gz + ', ' + best.branchTen + '), 가장 조심할 달은 ' + worst.m + '월(' + worst.gz + ', ' + worst.branchTen + ').',
        '<b>최대 기회</b>: ' + best.m + '월 전후 ' + KB.MONTH[best.branchTen].kw + '의 흐름. <b>최대 리스크</b>: ' + worst.m + '월 전후 ' + KB.MONTH[worst.branchTen].kw + '의 흐름.',
        '<b>개운법</b>: 중요한 계약·발표·고백은 ' + best.m + '월에, 큰 지출·결정은 ' + worst.m + '월을 피해서. 올해 내내 ' + c.yongEl.color + ' 계열을 가까이하고 ' + c.yongEl.dir + ' 방향 공간을 정돈한다.'));
    return out;
  }

  /* ---------- 3. 개운법 ---------- */
  function r3(A) {
    var c = ctx(A), Y = c.yongEl, H = c.heeEl, out = '';
    out += sec('① 부족·과다 오행 분석',
      '<div class="tablewrap"><table><thead><tr><th>오행</th><th>글자 수</th><th>세력</th><th>판단</th></tr></thead><tbody>' + [0, 1, 2, 3, 4].map(function (e) {
        return '<tr><td>' + elName(e) + '</td><td>' + A.count[e] + '</td><td>' + A.pct[e] + '%</td><td>' + (c.excess.indexOf(e) >= 0 ? '과다' : c.lacking.indexOf(e) >= 0 ? '부족' : '보통') + (e === c.y.yong ? ' · <b>용신</b>' : e === c.y.hee ? ' · 희신' : e === c.y.gi ? ' · 기신' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      cra('부족: ' + (c.lacking.map(elName).join(', ') || '뚜렷이 부족한 오행 없음') + ' / 과다: ' + (c.excess.map(elName).join(', ') || '뚜렷이 과한 오행 없음') + '. 단, 개운은 단순히 없는 오행을 채우는 것이 아니라 용신(' + elName(c.y.yong) + ')을 기준으로 한다. ' + c.y.reason + '.' + (c.y.johu != null ? ' 계절 온도(조후)로 보면 ' + elName(c.y.johu) + ' 기운도 함께 필요하다.' : ''),
        (c.lacking.length ? c.lacking.map(function (e) { return KB.ELEMENT[e].short + ' 부족 → ' + KB.ELEMENT[e].lack; }).join('<br>') + '<br>' : '') + (c.excess.length ? c.excess.map(function (e) { return KB.ELEMENT[e].short + ' 과다 → ' + KB.ELEMENT[e].over; }).join('<br>') : ''),
        '보완 우선순위: 1순위 ' + elName(c.y.yong) + '(용신), 2순위 ' + elName(c.y.hee) + '(희신). 피할 기운: ' + elName(c.y.gi) + '(기신).'));
    out += sec('② 행운의 컬러와 아이템',
      cra('용신 ' + Y.name + '·희신 ' + H.name + '의 색과 소재가 기운을 보탠다.',
        '자주 보고 만지는 물건이 이 기운이면 심리적으로 방향을 상기시키는 효과(앵커)가 생긴다.',
        list(['옷: ' + Y.color + ' 계열을 메인, ' + H.color + '을 포인트로', '액세서리·소지품: ' + Y.items, '보조 아이템: ' + H.items, '피할 색: 기신 ' + c.giEl.color + '을 중요한 날의 메인 색으로 쓰지 않기', '행운의 숫자: ' + Y.num + ' (비밀번호가 아니라 일정·목표 숫자로 활용)'])));
    out += sec('③ 맞는 운동·취미·생활 습관',
      cra(c.dm.name + ' 일간, ' + A.strength.label + ' 구조. 용신 ' + Y.short + '의 정신적 키워드는 ' + Y.mind + '.',
        A.strength.weak ? '에너지가 쉽게 소모되는 구조라 회복형 활동이 맞다.' : '에너지가 남는 구조라 발산형 활동이 맞다.',
        list(['운동: ' + Y.sports + (A.strength.weak ? ' (강도보다 꾸준함)' : ' (땀 날 정도로 강하게)'), '취미: ' + Y.hobby + ', ' + H.hobby, '습관: ' + (A.strength.weak ? '수면 7시간 이상 확보, 약속은 하루 1개까지' : '하루 1개 결과물 내기, 남는 에너지를 운동·봉사로 쓰기')])));
    out += sec('④ 집안 인테리어 팁',
      cra('용신 방향은 ' + Y.dir + ', 희신 방향은 ' + H.dir + '이다.',
        '오래 머무는 자리(침대·책상)를 용신 방향으로 두면 하루 리듬에 그 기운을 반복해서 들이는 셈이 된다.',
        list(['인테리어: ' + Y.interior, '책상: 앉았을 때 ' + Y.dir + '을 바라보거나 그쪽에 두기. 등 뒤는 벽으로', '침대: 머리 방향을 ' + Y.dir + ' 또는 ' + H.dir + '으로(구조상 어려우면 그 방향 벽에 용신 색 소품)', '기신 ' + c.giEl.short + ' 소품(' + c.giEl.items + ')은 침실에서 줄이기', '공통: 현관과 집 중앙은 비우고 깨끗하게'])));
    out += sec('⑤ 오늘부터 바로 실천할 개운 행동 5가지',
      cra('운은 습관으로 굳어질 때 바뀐다. 용신 ' + c.y.yongGroup + '의 역할(' + groupDesc(c.y.yongGroup).mean + ')을 행동으로 옮긴다.',
        '작은 행동을 매일 반복하면 원국의 치우침을 생활에서 보정하게 된다.',
        '<ol><li>오늘 입을 옷이나 소지품 하나를 ' + Y.color + ' 계열로 바꾸기</li><li>' + Y.dir + '쪽 공간 10분 정리하기</li><li>' + Y.sports + ' 20분</li><li>' + (c.y.yongGroup === '인성' ? '책 10쪽 읽고 한 줄 메모' : c.y.yongGroup === '식상' ? '오늘 만든 결과물 하나를 공개하기' : c.y.yongGroup === '재성' ? '가계부에 오늘 지출 기록하기' : c.y.yongGroup === '관성' ? '내일 할 일 3개와 마감 시간 정하기' : '동료·친구 1명에게 먼저 연락하기') + '</li><li>잠들기 전 감사한 일 3가지 쓰기(감정 기복 완화)</li></ol>'));
    return out;
  }

  /* ---------- 4. 신살 ---------- */
  function r4(A) {
    var c = ctx(A), out = '', list5 = A.sinsal.filter(function (s) { return KB.SINSAL[s.key]; });
    var dyU = A.P[2].unseong;
    out += sec('① 핵심 신살·길성 요약',
      (list5.length ? '<div class="chips">' + list5.map(function (s) { return '<span class="chip k-' + KB.SINSAL[s.key].kind.replace(/[·\s]/g, '') + '">' + s.key + ' <small>' + s.where.join(', ') + '</small></span>'; }).join('') + '</div>' : '<p>뚜렷한 신살이 적은 담백한 구조다.</p>') +
      '<p>일간의 12운성은 ' + A.P.filter(Boolean).map(function (p) { return p.pos + ' ' + p.unseong; }).join(', ') + '. 일주 ' + dyU + '은 “' + KB.UNSEONG[dyU] + '”의 기질이다. 공망은 ' + A.xunkong + '.</p>' +
      cra('신살은 일간 ' + A.dmKo + '(' + KB.ELEMENT[A.dmEl].short + ')과 년지·월지·일지의 관계로 정해진다. 신살은 보조 지표라서 원국의 강약·용신보다 우선하지 않는다.',
        '이 사주의 신살 조합 성격: ' + (list5.map(function (s) { return KB.SINSAL[s.key].kind; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' + ') || '담백형') + '.',
        '아래 각 신살의 장점은 키우고, 리스크는 생활 규칙으로 막는다.'));
    out += sec('② 각 요소의 장점과 리스크', list5.map(function (s) {
      var k = KB.SINSAL[s.key];
      return sub(s.key + ' <small class="muted">(' + k.kind + ' · ' + s.where.join(', ') + ')</small>', cra(k.mean + '. 위치: ' + s.where.map(function (w) { return w + '(' + (KB.POS_MEAN[w.split('·')[0]] || '') + ')'; }).join(', ') + '.', '<b>장점</b> ' + k.good + '<br><b>리스크</b> ' + k.risk, k.act));
    }).join('') || '<p>해당 없음</p>');
    var jobs = list5.map(function (s) { return KB.SINSAL[s.key].job; });
    out += sec('③ 이 조합에 맞는 직업·적성 방향',
      cra('신살 조합 + 일간 성향(' + c.dm.work + ') + 용신 ' + elName(c.y.yong) + '.',
        '신살이 가리키는 분야: ' + (jobs.join(' / ') || '특정 분야 쏠림 없음') + '.',
        '세 가지가 겹치는 분야를 1순위로: ' + KB.ELEMENT[c.y.yong].jobs + ' 중에서 ' + (c.has('도화살') || c.has('홍염살') ? '사람 앞에 서는 일' : c.has('화개살') || c.has('귀문관살') ? '혼자 몰입해 깊이를 만드는 일' : c.has('역마살') ? '이동과 확장이 있는 일' : '꾸준히 전문성을 쌓는 일') + '을 고른다.'));
    out += sec('④ 인간관계·연애 패턴',
      cra(list5.map(function (s) { return s.key; }).join(', ') + ' / 배우자 자리 ' + A.P[2].zhi + '(' + A.P[2].zhiTen + ').',
        list5.map(function (s) { return '• ' + s.key + ': ' + KB.SINSAL[s.key].relation; }).join('<br>') || '관계는 무난하고 담백하다.',
        c.has('도화살') || c.has('홍염살') ? '매력이 강한 만큼 경계를 분명히 하는 것이 관계를 지킨다.' : c.has('원진살') || c.has('귀문관살') ? '감정을 쌓지 말고 그때그때 말로 꺼내는 것이 핵심이다.' : '먼저 표현하고 먼저 연락하는 습관이 관계의 질을 높인다.'));
    out += sec('⑤ 현실적인 개운법과 조심할 포인트',
      cra('길성은 쓰면 커지고, 흉살은 관리하면 작아진다.', '흉살로 분류되는 것도 직업으로 쓰면 강점이 된다(예: 양인·백호 → 의료·안전·스포츠).',
        list(list5.map(function (s) { return s.key + ': ' + KB.SINSAL[s.key].act; }).concat(['반드시 조심: ' + (list5.filter(function (s) { return /강성|정신|관계/.test(KB.SINSAL[s.key].kind); }).map(function (s) { return KB.SINSAL[s.key].risk; })[0] || '편안함에 안주하는 것')]))));
    return out;
  }

  /* ---------- 5. 레벨업 구조 ---------- */
  function r5(A) {
    var c = ctx(A), out = '';
    out += sec('① 타고난 기본 세팅', cra(strengthText(A), '캐릭터로 보면 “' + c.dm.img + '”. 주 스탯은 ' + c.strongG + ', 약점 스탯은 ' + c.weakG + '. 용신(성장 아이템)은 ' + elName(c.y.yong) + '(' + c.y.yongGroup + ').', '성장 방향: ' + c.y.reason + '.'));
    var pats = [
      { t: c.strongG + '이 앞서는 패턴', cause: c.strongG + ' ' + gp(A, c.strongG) + '%로 가장 강하다.', res: groupDesc(c.strongG).strong, act: '강점은 살리되 과하면 생기는 문제를 규칙으로 막는다.' },
      { t: c.weakG + '이 비어 생기는 패턴', cause: c.weakG + ' ' + gp(A, c.weakG) + '%로 가장 약하다.', res: groupDesc(c.weakG).weak, act: '부족한 기능은 사람·도구·습관으로 외주화한다.' },
      { t: '일간 기질의 반복', cause: c.dm.name + '의 기질.', res: c.dm.weak + '이(가) 중요한 순간마다 반복된다.', act: c.dm.weak.split(',')[0] + '이 올라올 때를 알아차리는 신호(예: 결정 전 24시간 대기)를 만든다.' }
    ];
    out += sec('② 인생에서 반복되는 패턴 3가지', pats.map(function (p, i) { return sub('패턴 ' + (i + 1) + '. ' + p.t, cra(p.cause, p.res, p.act)); }).join(''));
    var ups = A.daeun.filter(function (d) { return d.trend === '상승' && d.age <= 80; }), downs = A.daeun.filter(function (d) { return d.trend === '하강' && d.age <= 80; });
    out += sec('③ 10년 단위 상승·하강 구간', '<div class="dyline">' + A.daeun.filter(function (d) { return d.age <= 80; }).map(function (d) { return '<div class="dycell ' + (d.trend === '상승' ? 'up' : d.trend === '하강' ? 'down' : 'flat') + '"><b>' + d.age + '세</b><span>' + d.gz + '</span><small>' + d.trend + '</small></div>'; }).join('') + '</div>' +
      cra('대운의 오행이 용신·희신이면 상승, 기신·구신이면 하강으로 본다.', '상승 구간: ' + (ups.map(function (d) { return d.startYear + '~' + d.endYear; }).join(', ') || '뚜렷한 상승 대운 없음(꾸준함이 무기)') + '<br>하강 구간: ' + (downs.map(function (d) { return d.startYear + '~' + d.endYear; }).join(', ') || '뚜렷한 하강 대운 없음'), '상승 구간에는 레벨업(도전·확장), 하강 구간에는 장비 정비(실력·건강·현금)를 한다.'));
    out += sec('④ 가장 큰 전환점', turningPoints(A).map(function (t) { return '<p><b>' + t.d.startYear + '년 무렵(만 ' + t.d.age + '세)</b>: ' + t.prev.gz + ' → ' + t.d.gz + ', ' + t.prev.branchTen + '에서 ' + t.d.branchTen + '의 시대로. ' + (t.d.score > t.prev.score ? '스테이지 상승.' : '재정비 스테이지.') + (t.d.change ? ' 환경 변동이 큰 전환.' : '') + '</p>'; }).join(''));
    out += sec('⑤ 평생 운을 키우는 핵심 행동 전략', cra('용신 ' + elName(c.y.yong) + ', 부족 ' + c.weakG + ', 기질 ' + c.dm.core + '.', '이 세 가지를 생활에 넣으면 원국의 치우침이 줄고, 상승 대운에서 얻는 결과가 커진다.',
      list(['매일: ' + c.yongEl.sports + ' + ' + c.yongEl.hobby, '매년: 상승/하강 여부에 맞춰 공격·수비 비율 정하기', '평생: ' + groupDesc(c.y.yongGroup).job + ' 방향의 전문성 하나를 깊게 쌓기'])));
    return out;
  }

  /* ---------- 6. 돈의 그릇 ---------- */
  function r6(A) {
    var c = ctx(A), out = '';
    var tens = {}; A.P.forEach(function (p) { if (!p) return; [p.ganTen, p.zhiTen].forEach(function (t) { tens[t] = (tens[t] || 0) + 1; }); });
    var jj = tens['정재'] || 0, pj = tens['편재'] || 0;
    var jae = gp(A, '재성'), sik = gp(A, '식상'), gwan = gp(A, '관성'), bi = gp(A, '비겁'), ins = gp(A, '인성');
    out += sec('① 재물 구조', '<p>정재 ' + jj + '개, 편재 ' + pj + '개(겉으로 드러난 글자 기준) · 재성 세력 ' + jae + '%, 식상 ' + sik + '%, 관성 ' + gwan + '%, 비겁 ' + bi + '%, 인성 ' + ins + '%</p>' +
      cra(pj > jj ? '편재가 우세하다. 편재는 크게 움직이는 돈, 사업·유통·투자형 돈이다.' : jj > pj ? '정재가 우세하다. 정재는 고정 수입, 성실하게 쌓는 돈이다.' : jae > 5 ? '정재·편재가 비슷하거나 지장간에 숨어 있다.' : '재성이 거의 드러나지 않는다.',
        (sik >= 15 && jae >= 10 ? '식상생재: 재능 → 돈 흐름이 살아 있다. ' : '') + (jae >= 10 && gwan >= 10 ? '재생관: 돈이 지위·신용으로 이어진다. ' : '') + (jae >= 25 && A.strength.weak ? '재다신약: 돈 기회는 많은데 감당할 체력이 부족하다. ' : '') + (bi >= 30 && jae < 15 ? '군겁쟁재: 경쟁자·지인이 내 몫을 나눠 가져가는 구조. ' : '') + (jae < 8 ? '무재/약재: 돈을 직접 좇기보다 실력·명예를 먼저 쌓아 간접적으로 버는 구조.' : ''),
        A.strength.weak ? '“그릇을 먼저 키우고 돈을 담는다.” 체력·자격·협력자를 먼저 갖춘 뒤 규모를 키운다.' : '“에너지를 돈으로 바꾸는 통로를 만든다.” 남는 힘을 수익 구조(판매·서비스·사업)로 흘려보낸다.'));
    var ways = [];
    if (sik >= 12) ways.push(['재능·결과물 판매형', '식상 ' + sik + '%', '기술·콘텐츠·서비스로 일한 만큼 번다. 한 번 만든 것을 여러 번 파는 구조(강의·콘텐츠·제품화)로 키운다.']);
    if (gwan >= 12) ways.push(['조직·직함형', '관성 ' + gwan + '%', '월급·직위·자격 수당처럼 안정적인 돈. 승진·이직 협상력이 곧 재물운이다.']);
    if (ins >= 15) ways.push(['자격·문서형', '인성 ' + ins + '%', '자격증·계약·부동산·지식으로 쌓는 돈. 문서로 남는 자산을 늘린다.']);
    if (bi >= 20) ways.push(['협업·네트워크형', '비겁 ' + bi + '%', '팀·동업·커뮤니티를 통해 버는 돈. 단, 지분·정산을 문서로 확실히 한다.']);
    if (jae >= 15) ways.push(['거래·사업형', '재성 ' + jae + '%', '사고팔고 관리하는 감각으로 버는 돈. 숫자 관리가 결과를 좌우한다.']);
    if (!ways.length) ways.push(['꾸준한 근로형', '균형형 구조', '한 분야 경력을 쌓아 단가를 올리는 방식이 가장 안전하다.']);
    out += sec('② 평생 돈이 들어오는 방식', ways.slice(0, 3).map(function (w, i) { return sub((i + 1) + '. ' + w[0], cra(w[1] + '.', w[2], '이 방식을 주 수입원으로, 나머지는 보조 수입원으로 설계한다.')); }).join(''));
    var leaks = [];
    if (bi >= 25) leaks.push(['사람으로 새는 돈', '비겁이 강함', '빌려주기·보증·한턱·동업 정산에서 돈이 빠진다.', '“빌려줄 돈은 줘도 되는 돈만” 원칙, 동업은 계약서 필수.']);
    if (sik >= 30) leaks.push(['표현·소비로 새는 돈', '식상이 과함', '꾸미기·경험·충동 구매로 나간다.', '월 소비 한도를 정하고 장바구니 24시간 대기.']);
    if (ins >= 30) leaks.push(['생각만 하다 놓치는 돈', '인성이 과함', '공부·준비만 하다가 타이밍을 놓친다.', '준비 기간에 마감일을 정해 실행으로 옮긴다.']);
    if (jae >= 25 && A.strength.weak) leaks.push(['감당 못 할 규모', '재다신약', '큰 기회를 무리하게 잡다가 몸·관계가 상한다.', '규모는 체력과 현금 여유에 맞춰 단계적으로.']);
    if (gwan >= 30) leaks.push(['압박 해소 소비', '관성이 과함', '스트레스를 소비로 푼다.', '스트레스 해소를 운동·취미로 대체.']);
    if (!leaks.length) leaks.push(['관리 공백', '뚜렷한 누수 구조 없음', '큰 누수는 없지만 기록하지 않는 돈이 조금씩 샌다.', '월 1회 지출 점검.']);
    out += sec('③ 돈이 새는 반복 패턴', leaks.map(function (l) { return sub(l[0], cra(l[1] + '.', l[2], l[3])); }).join(''));
    var money = A.daeun.filter(function (d) { return d.age <= 80 && (/재|식신|상관/.test(d.stemTen + d.branchTen)) && d.score >= 0; });
    out += sec('④ 큰돈을 만지는 시기 (대운 중심)', cra('재성·식상이 들어오고, 용신 기준 점수가 나쁘지 않은 대운을 골랐다.',
      money.length ? money.map(function (d) { return '<b>' + d.startYear + '~' + d.endYear + '(만 ' + d.age + '세~)</b> ' + d.gz + ' ' + d.stemTen + '/' + d.branchTen + ' ' + trendBadge(d); }).join('<br>') : '재성·식상 대운이 길한 형태로 오지 않는다. 큰돈보다 꾸준한 축적형이 맞다.',
      '이 시기 2~3년 전부터 종잣돈과 실력을 준비하고, 시기에 들어서면 규모를 키운다. 그 외 시기에는 지키는 운영.'));
    out += sec('⑤ 부를 키우는 평생 전략', cra('그릇(' + A.strength.label + ') × 수입 통로(' + ways[0][0] + ') × 누수(' + leaks[0][0] + ').', '세 가지를 맞추면 같은 수입으로도 남는 돈이 달라진다.',
      list(['수입: ' + ways[0][0] + '을 주력으로, 단가를 올리는 방향', '방어: ' + leaks[0][3], '자산: 수입의 20~30%를 자동이체로 먼저 떼기', '시기: ④의 시기에 집중, 하강 대운에는 확장 금지', '용신 ' + elName(c.y.yong) + ' 분야(' + c.yongEl.jobs + ')에서 돈의 기회를 찾기'])));
    return out;
  }

  /* ---------- 7. 연애·결혼 ---------- */
  function r7(A) {
    var c = ctx(A), out = '', day = A.P[2];
    var sp = gp(A, S.GROUPS[c.spouseG]);
    var spEl = (A.dmEl + c.spouseG) % 5;
    out += sec('① 타고난 연애 팔자 총평', cra('배우자궁(일지) ' + day.zhi + '(' + day.zhiKo + ') = ' + day.zhiTen + ', 12운성 ' + day.unseong + '. 배우자 별 ' + c.spouseName + ' ' + level(sp) + '(' + sp + '%). 일지 작용: ' + relText(c.dayRel) + '. 관련 신살: ' + (A.sinsal.filter(function (s) { return /도화|홍염|원진|고신|과숙|금여/.test(s.key); }).map(function (s) { return s.key; }).join(', ') || '없음') + '.',
      '연애 체질: ' + c.dm.love + '. 배우자 자리 ' + day.zhiTen + '은 “' + KB.TEN[day.zhiTen] + '”의 성향을 가진 배우자, 또는 그런 결혼 생활을 상징한다. 사랑의 그릇: ' + (sp >= 20 ? '크고 인연이 많다' : sp >= 8 ? '보통, 깊게 한 사람과' : '작게 시작해 늦게 여무는 구조') + '.',
      '평생 애정운은 배우자 별이 들어오는 대운에 강해진다: ' + (A.daeun.filter(function (d) { return d.age <= 70 && (S.groupOfTen(d.stemTen) === S.GROUPS[c.spouseG] || S.groupOfTen(d.branchTen) === S.GROUPS[c.spouseG]); }).map(function (d) { return d.startYear + '~' + d.endYear; }).join(', ') || '직접 들어오는 대운이 적어, 세운(해마다)의 흐름을 더 봐야 한다') + '.'));
    var Y0 = thisYear(), hits = [];
    for (var y = Y0; y <= Y0 + 3; y++) {
      var F = S.yearFortune(A, y);
      F.months.forEach(function (m) {
        var spHit = S.groupOfTen(m.stemTen) === S.GROUPS[c.spouseG] || S.groupOfTen(m.branchTen) === S.GROUPS[c.spouseG];
        var hap = m.rel.some(function (r) { return r.type === '육합' && /일지/.test(r.where); });
        var chung = m.rel.some(function (r) { return r.type === '충' && /일지/.test(r.where); });
        var cur = new Date(); if (y === Y0 && m.m < cur.getMonth() + 1) return;
        if (spHit && hap) hits.push({ y: y, m: m.m, k: '강', gz: m.gz });
        else if (spHit || hap) hits.push({ y: y, m: m.m, k: '중', gz: m.gz });
        if (chung) hits.push({ y: y, m: m.m, k: '주의', gz: m.gz });
      });
    }
    var strong = hits.filter(function (h) { return h.k === '강'; }), mid = hits.filter(function (h) { return h.k === '중'; }), warn = hits.filter(function (h) { return h.k === '주의'; });
    var wedAge = A.daeun.filter(function (d) { return d.age >= 22 && d.age <= 45 && (S.groupOfTen(d.branchTen) === S.GROUPS[c.spouseG] || S.groupOfTen(d.stemTen) === S.GROUPS[c.spouseG] || d.score >= 0.8); });
    out += sec('② 결정적 시기 분석', cra('앞으로 3년 동안 배우자 별이 들어오는 달, 일지와 합하는 달(인연), 일지와 충하는 달(변동)을 계산했다.',
      '<b>인연운 강한 달</b>: ' + (strong.map(function (h) { return h.y + '.' + h.m; }).join(', ') || '없음') + '<br><b>인연 기회 달</b>: ' + (mid.slice(0, 10).map(function (h) { return h.y + '.' + h.m; }).join(', ') || '없음') + '<br><b>피해야 할 시기(관계 변동·다툼)</b>: ' + (warn.map(function (h) { return h.y + '.' + h.m; }).join(', ') || '없음') + '<br><b>결혼 적기 나이대</b>: ' + (wedAge.map(function (d) { return '만 ' + d.age + '~' + (d.age + 9) + '세'; }).join(', ') || '배우자 별 대운이 약해 만나는 사람의 성숙도가 기준') + '.',
      '스쳐가는 인연과 정착 인연 구분: 일지와 합하는 달에 만난 사람은 정착형일 가능성이 크고, 일지와 충하는 달에 시작한 관계는 빠르게 달아오르고 빨리 변하기 쉽다. 결혼·동거 결정은 “강한 달”에, 이별·큰 결정은 “피해야 할 시기”를 피해서.'));
    var attract = c.strongG, good = KB.ELEMENT[c.y.yong];
    out += sec('③ 끌리는 사람 vs 실제로 잘 사는 사람',
      sub('반복적으로 엮이는 유형', cra('가장 강한 기운 ' + attract + '이 비슷한 에너지를 끌어당긴다.', attract === '비겁' ? '친구 같고 고집 센 사람, 경쟁하듯 지내는 관계' : attract === '식상' ? '재미있고 자유로운 사람, 내가 챙겨 줘야 하는 사람' : attract === '재성' ? '현실적이고 능력 있는 사람, 조건을 따지게 되는 관계' : attract === '관성' ? '강하고 주도적인 사람, 나를 통제하려는 사람' : '나를 보살펴 주는 사람, 의지하게 되는 관계', '끌림이 강할수록 “이 사람이 내 약점(' + c.weakG + ')을 채워 주는지”를 따로 점검한다.')) +
      sub('나를 힘들게 하는 구조', cra('기신 ' + elName(c.y.gi) + ' 성향의 사람.', KB.ELEMENT[c.y.gi].over + '의 성향이 강한 상대와는 처음엔 끌려도 길게 소모된다.', '처음 3개월 안에 갈등을 푸는 방식을 확인한다(말로 푸는지, 회피하는지).')) +
      sub('장기적으로 안정되는 배우자상', cra('용신 ' + elName(c.y.yong) + ' 기운을 가진 사람이 나를 보완한다.', '정신적 키워드 “' + good.mind + '”를 가진 사람. 예: ' + good.jobs.split('·').slice(0, 3).join('·') + ' 분야 사람이거나, 그런 성향의 사람.', '생년 오행보다 성향을 본다: 대화할 때 마음이 편해지고 생활 리듬이 맞는 사람.')) +
      sub('반드시 피해야 할 상대 특징', list(['내 약점(' + c.dm.weak.split(',')[0] + ')을 공격하거나 이용하는 사람', '돈 문제(빌려 달라·보증)를 초반부터 꺼내는 사람', '감정 기복을 나에게 쏟아붓고 사과하지 않는 사람', KB.ELEMENT[c.y.gi].over + ' 성향이 극단적인 사람'])));
    var jaeAfter = gp(A, '재성');
    out += sec('④ 부부 상생·상극 구조', cra('배우자 별 오행은 ' + elName(spEl) + '이며, 이 오행은 나에게 ' + (spEl === c.y.yong ? '용신(가장 도움)' : spEl === c.y.hee ? '희신(도움)' : spEl === c.y.gi ? '기신(부담)' : '중립') + '이다. 일지 ' + day.zhiTen + '.',
      (spEl === c.y.yong || spEl === c.y.hee ? '배우자가 운을 보태는 구조다. 결혼 후 재물·안정이 좋아질 가능성이 크다.' : spEl === c.y.gi ? '배우자와의 관계에서 내가 맞춰 주는 부분이 커지기 쉬운 구조다. 역할 분담을 분명히 해야 내가 희생하는 구조가 되지 않는다.' : '서로 영향이 중간 정도라 관계 운영 방식이 결과를 좌우한다.') + ' 결혼 후 재물: 재성 ' + jaeAfter + '%. ' + (c.male ? '남성에게 재성은 배우자이기도 해서 결혼 후 돈 관리 방식이 운을 가른다.' : '여성에게 관성은 배우자라서 배우자의 직업·사회적 위치가 생활 안정에 영향을 준다.'),
      '돈 관리 주도권, 집안일 분담, 각자 시간을 결혼 전에 합의한다. 함께 ' + good.sports + ' 같은 활동을 하면 두 사람 모두 리듬이 좋아진다.'));
    var charm = []; for (var mm = 1; mm <= 12; mm++) { var f = S.yearFortune(A, Y0 + (new Date().getMonth() >= 9 ? 1 : 0)).months[mm - 1]; if (/식신|상관|정재|편재|정관|편관/.test(f.branchTen) && S.groupOfTen(f.branchTen) === S.GROUPS[c.spouseG]) charm.push(mm); }
    out += sec('⑤ 연애·결혼 개운 전략', list(['애정운 컬러: ' + good.color + ' (데이트·소개 자리에)', '아이템: ' + good.items, '매력이 살아나는 달: ' + (charm.length ? charm.join(', ') + '월' : '인연운 강한 달(②) 참고') + '. 이 달에 모임·소개 자리를 몰아서 잡는다', '말투 교정: ' + (A.strength.weak ? '“괜찮아” 대신 원하는 것을 구체적으로 말하기' : '결론부터 말하지 말고 상대 말 끝까지 듣고 한 번 되묻기'), '행동 교정: ' + c.dm.weak.split(',')[0] + '이 나올 때 바로 반응하지 않기', '<b>철칙 1가지</b>: 감정이 가장 클 때(좋을 때도 나쁠 때도) 큰 결정을 하지 않는다']));
    return out;
  }

  /* ---------- 8. 커리어 DNA ---------- */
  function r8(A) {
    var c = ctx(A), out = '';
    var org = gp(A, '관성') + gp(A, '인성'), biz = gp(A, '재성') + gp(A, '식상') + gp(A, '비겁') * 0.5;
    out += sec('① 타고난 일의 성향과 포지션', cra(c.dm.name + ', 주력 기운 ' + c.strongG + '(' + gp(A, c.strongG) + '%), 용신 ' + c.y.yongGroup + '.', '일하는 방식: ' + c.dm.work + '. 팀 안 포지션: ' + (c.strongG === '관성' ? '관리자·책임자' : c.strongG === '식상' ? '크리에이터·실무 에이스' : c.strongG === '재성' ? '영업·운영·수익 담당' : c.strongG === '인성' ? '기획·연구·참모' : '독립형 해결사·현장 리더') + '.', '이 포지션에서 성과를 내고, 용신 ' + c.y.yongGroup + ' 역할(' + groupDesc(c.y.yongGroup).job + ')로 확장한다.'));
    out += sec('② 조직형 vs 사업형 판단', '<div class="meter"><span style="width:' + Math.round(org / (org + biz) * 100) + '%">조직형 ' + Math.round(org / (org + biz) * 100) + '%</span><span class="b2">사업형 ' + Math.round(biz / (org + biz) * 100) + '%</span></div>' +
      cra('관성+인성(조직·자격) ' + org + ' vs 재성+식상+비겁(사업·재능·독립) ' + Math.round(biz) + '. 신강·신약: ' + A.strength.label + '.',
        org > biz * 1.2 ? '조직형이다. 시스템과 직함 안에서 커지는 구조.' : biz > org * 1.2 ? (A.strength.weak ? '사업형 기질이지만 일간 힘이 약해, 처음부터 단독 창업보다 조직에서 경험을 쌓고 작은 부업으로 시작하는 단계형이 맞다.' : '사업형이다. 내 이름을 건 일에서 크게 성장한다.') : '혼합형이다. 조직에 있으면서 개인 브랜드·부업을 키우는 방식이 맞다.',
        org > biz * 1.2 ? '자격·직급·평판을 체계적으로 쌓는다. 이직은 직함 상승이 있을 때만.' : '작게 검증하고 크게 키운다. 고정비가 적은 구조(온라인·1인 사업)로 시작한다.'));
    var combos = [];
    if (gp(A, '식상') >= 12 && gp(A, '재성') >= 10) combos.push(['식상생재', '재능을 상품으로 만들어 판다']);
    if (gp(A, '관성') >= 12 && gp(A, '인성') >= 12) combos.push(['관인상생', '자격·평판을 쌓아 조직에서 올라간다']);
    if (gp(A, '재성') >= 12 && gp(A, '관성') >= 12) combos.push(['재생관', '성과를 지위로 바꾼다']);
    if (gp(A, '식상') >= 15 && gp(A, '관성') >= 12) combos.push(['식상제살/상관견관', '규칙을 바꾸는 혁신가이지만 윗사람과 마찰 주의']);
    if (gp(A, '인성') >= 15 && gp(A, '식상') >= 12) combos.push(['인성+식상', '배운 것을 가르치고 콘텐츠로 만든다']);
    if (!combos.length) combos.push([c.strongG + ' 중심형', groupDesc(c.strongG).money]);
    out += sec('③ 성공을 만드는 방식', combos.map(function (k) { return sub(k[0], cra('원국의 ' + k[0] + ' 흐름.', k[1] + '.', '이 흐름에 맞는 역할을 맡을 때 노력 대비 결과가 크다.')); }).join(''));
    out += sec('④ 인생 커리어 전환점', A.daeun.filter(function (d) { return d.age >= 18 && d.age <= 70; }).map(function (d) {
      var g = S.groupOfTen(d.branchTen);
      return '<p><b>만 ' + d.age + '세~ (' + d.startYear + ')</b> ' + d.gz + ' ' + trendBadge(d) + ' → ' + (g === '관성' ? '직책·조직 이동' : g === '재성' ? '사업·수익 확장' : g === '식상' ? '재능 발휘·독립·창작' : g === '인성' ? '공부·자격·재충전' : '독립·경쟁·동업') + '의 10년</p>';
    }).join(''));
    out += sec('⑤ 실패를 막는 리스크 관리 전략', cra('약한 ' + c.weakG + ', 기신 ' + elName(c.y.gi) + ', 일간 약점 ' + c.dm.weak.split(',')[0] + '.', '커리어 실패는 대부분 약점 영역(' + c.weakG + ')에서 시작된다: ' + groupDesc(c.weakG).weak,
      list(['약점 영역은 파트너·도구로 보완(예: ' + (c.weakG === '재성' ? '세무·회계는 전문가에게' : c.weakG === '관성' ? '스스로 마감·KPI 정하기' : c.weakG === '식상' ? '결과물 공개 일정 고정' : c.weakG === '인성' ? '멘토 1명 두기' : '팀·동료 만들기') + ')', '하강 대운에는 확장 대신 내실', '중요 결정 전 체크리스트: 현금 6개월치, 건강, 가족 동의'])));
    return out;
  }

  /* ---------- 9. 리스크 ---------- */
  function r9(A) {
    var c = ctx(A), out = '', W = KB.ELEMENT[c.weakEl];
    out += sec('① 사주에서 가장 약한 오행', cra(elName(c.weakEl) + ' ' + A.pct[c.weakEl] + '% (글자 ' + A.count[c.weakEl] + '개).', W.lack + '.', '보완 방법: ' + W.items + ', ' + W.sports + '. 단, 이 오행이 기신(' + elName(c.y.gi) + ')이면 억지로 채우지 않는다' + (c.weakEl === c.y.gi ? ' → 이 사주는 해당.' : '.')));
    var bi = gp(A, '비겁'), jae = gp(A, '재성'), gwan = gp(A, '관성');
    out += sec('② 건강·금전·관계에서 반복될 위험 구조',
      sub('건강', cra('과한 ' + KB.ELEMENT[c.strongEl].short + '(' + A.pct[c.strongEl] + '%)와 약한 ' + W.short + '.', '명리상 관리 포인트: ' + KB.ELEMENT[c.strongEl].body + ', ' + W.body + '. 의학적 진단이 아니다.', '정기 검진, 수면·식사 리듬, 과로 신호가 오면 바로 쉬기.')) +
      sub('금전', cra('비겁 ' + bi + '%, 재성 ' + jae + '%.', bi >= 25 ? '사람(빌려주기·동업)으로 돈이 빠지는 구조.' : jae >= 25 && A.strength.weak ? '감당 못 할 규모에 손대는 구조.' : '큰 구조적 누수는 없지만 기록 없는 지출이 쌓인다.', '보증 금지, 동업 계약서, 큰 지출 2주 숙고.')) +
      sub('관계', cra('관련 신살: ' + (A.sinsal.filter(function (s) { return /원진|귀문|고신|과숙|양인|괴강/.test(s.key); }).map(function (s) { return s.key; }).join(', ') || '없음') + ', 원국 충·형: ' + (A.natalRel.filter(function (r) { return /충|형/.test(r.type); }).map(function (r) { return r.where + ' ' + r.type; }).join(', ') || '없음') + '.', A.natalRel.some(function (r) { return /충|형/.test(r.type); }) ? '해당 자리(가족·배우자·동료)와 마찰이 반복되기 쉽다.' : '관계 구조는 비교적 안정적이다. 일간 기질로 생기는 오해만 관리하면 된다.', '불편한 감정은 24시간 안에 차분한 말로 꺼낸다.')));
    var bad = A.daeun.filter(function (d) { return d.age <= 80 && (d.trend === '하강' || d.change); });
    out += sec('③ 대운에서 조심해야 할 시기 유형', cra('기신(' + elName(c.y.gi) + ')·구신 대운, 그리고 원국 일지·월지와 충하는 대운.', bad.length ? bad.map(function (d) { return '<b>' + d.startYear + '~' + d.endYear + '(만 ' + d.age + '세~)</b> ' + d.gz + ' ' + trendBadge(d); }).join('<br>') : '뚜렷한 위험 대운은 없다.',
      '이 시기에는 ① 새 대출·보증 금지 ② 건강검진 주기 단축 ③ 큰 이동·이직은 6개월 이상 준비 후.'));
    var psych = [];
    if (A.pct[1] >= 30) psych.push('화 과다: 조급함·감정 폭발 → 결정 전 하루 대기');
    if (A.pct[4] >= 30) psych.push('수 과다: 걱정·생각 과다 → 걱정을 종이에 쓰고 할 수 있는 것만 고르기');
    if (A.pct[3] >= 30) psych.push('금 과다: 냉정·날 선 말 → 말하기 전 한 번 부드럽게 바꾸기');
    if (A.pct[0] >= 30) psych.push('목 과다: 고집·화를 참다 폭발 → 작은 불만을 바로 말하기');
    if (A.pct[2] >= 30) psych.push('토 과다: 정체·걱정·변화 거부 → 작은 변화 하나를 매주 시도');
    if (gp(A, '관성') >= 30) psych.push('관성 과다: 책임감 압박·자기 비난 → 완벽보다 완료');
    if (gp(A, '식상') >= 30) psych.push('식상 과다: 말실수·반항심 → 할 말은 글로 먼저 써 보기');
    if (A.strength.weak) psych.push('신약: 눈치·피로 누적 → 거절하는 연습');
    else psych.push('신강: 독단·과신 → 반대 의견 한 사람 곁에 두기');
    out += sec('④ 감정 폭발·조급함 등 심리 패턴', cra(c.dm.name + ' 기질: ' + c.dm.weak + '.', list(psych), '감정이 올라오는 신호(가슴 답답함·말이 빨라짐)를 알아차리면 자리를 옮기고 10분 걷기.'));
    out += sec('⑤ 장기적으로 운을 안정시키는 전략', list(['용신 ' + elName(c.y.yong) + ' 생활화(색·방향·활동)', '현금 비상금 6개월치', '하강 대운엔 수비, 상승 대운엔 공격', '건강검진·운동은 운과 상관없이 고정', '매년 초 이 앱으로 세운을 확인하고 연간 계획에 반영']));
    return out;
  }

  /* ---------- AI 프롬프트 ---------- */
  function dataBlock(A, Y) {
    var lines = [];
    var inp = A.input;
    lines.push('[만세력 데이터 - 웹앱 자동 계산, 재계산하지 말고 그대로 사용]');
    lines.push('성별: ' + A.gender + ' / 입력: ' + (inp.calendar === 'lunar' ? '음력' + (inp.leap ? '(윤달)' : '') + ' ' + inp.year + '-' + inp.month + '-' + inp.day + ' → 양력 ' : '양력 ') + A.solarBirth + (A.trueSolar ? ' / 경도 보정 시각 ' + A.trueSolar : '') + ' / 출생지 ' + (inp.cityName || ''));
    lines.push('사주팔자: ' + A.P.map(function (p, i) { return ['년주', '월주', '일주', '시주'][i] + ' ' + (p ? p.gan + p.zhi + '(' + p.ganKo + p.zhiKo + ')' : '미상'); }).join(' / '));
    lines.push('천간 십성: ' + A.P.map(function (p) { return p ? p.pos + ' ' + p.ganTen : ''; }).filter(Boolean).join(', '));
    lines.push('지지 십성: ' + A.P.map(function (p) { return p ? p.pos + ' ' + p.zhiTen : ''; }).filter(Boolean).join(', '));
    lines.push('지장간: ' + A.P.map(function (p) { return p ? p.pos + ' ' + p.hidden.map(function (h) { return h.ch + '(' + h.ten + ')'; }).join('') : ''; }).filter(Boolean).join(' / '));
    lines.push('12운성(일간 기준): ' + A.P.map(function (p) { return p ? p.pos + ' ' + p.unseong : ''; }).filter(Boolean).join(', '));
    lines.push('오행 글자 수: ' + EL.map(function (e, i) { return e + A.count[i]; }).join(' ') + ' / 세력(지장간 가중): ' + EL.map(function (e, i) { return e + A.pct[i] + '%'; }).join(' '));
    lines.push('십성 그룹 세력: ' + S.GROUPS.map(function (g, i) { return g + A.groupPct[i] + '%'; }).join(' '));
    lines.push('신강·신약(추정): ' + A.strength.label + ' (자기편 ' + A.strength.score + '%, ' + (A.strength.deukryeong ? '득령' : '실령') + ', ' + (A.strength.deukji ? '득지' : '실지') + ')');
    lines.push('용신(억부 추정): ' + EL[A.yongsin.yong] + '(' + A.yongsin.yongGroup + ') / 희신 ' + EL[A.yongsin.hee] + ' / 기신 ' + EL[A.yongsin.gi] + (A.yongsin.johu != null ? ' / 조후 보조 ' + EL[A.yongsin.johu] : '') + '. 근거: ' + A.yongsin.reason);
    lines.push('신살: ' + (A.sinsal.map(function (s) { return s.key + '(' + s.where.join(',') + ')'; }).join(', ') || '없음') + ' / 공망 ' + A.xunkong);
    lines.push('원국 합충형파해: ' + (A.natalRel.map(function (r) { return r.where + ' ' + r.pair + ' ' + r.type; }).join(', ') || '없음'));
    lines.push('대운(' + (A.forward ? '순행' : '역행') + ', 첫 대운 약 ' + A.daeunStart.y + '년 ' + A.daeunStart.m + '개월 후): ' + A.daeun.map(function (d) { return d.startYear + '(만' + d.age + ')' + d.gz + '[' + d.stemTen + '/' + d.branchTen + ']'; }).join(' '));
    var cur = S.currentDaeun(A, thisYear());
    if (cur) lines.push('현재 대운: ' + cur.gz + ' (' + cur.startYear + '~' + cur.endYear + ')');
    if (Y) {
      var F = S.yearFortune(A, Y);
      lines.push(Y + '년 세운: ' + F.gz + '(' + F.ko + ') 천간 ' + F.stemTen + ' / 지지 ' + F.branchTen + ' / 원국 작용: ' + (F.rel.map(function (r) { return r.where + ' ' + r.type; }).join(', ') || '없음') + ' / 대운 작용: ' + (F.relDy.map(function (r) { return r.where + ' ' + r.type; }).join(', ') || '없음'));
      lines.push(Y + '년 월운: ' + F.months.map(function (m) { return m.m + '월 ' + m.gz + '(' + m.stemTen + '/' + m.branchTen + ')'; }).join(', '));
    }
    lines.push('오늘 날짜: ' + new Date().toISOString().slice(0, 10));
    return lines.join('\n');
  }

  var RULES = '\n\n[작성 규칙]\n- 위 만세력 데이터를 그대로 근거로 쓰고, 사주를 다시 세우거나 다른 글자로 바꾸지 마세요.\n- 단정적 예언 대신 “경향·가능성”으로 쓰고, 건강은 의학적 진단이 아니라 생활 관리 관점으로만 쓰세요.\n- 학파마다 해석이 갈리는 부분(용신 등)은 그 사실을 한 줄로 밝혀 주세요.\n- 쉬운 말로, 중학생도 이해할 수 있게 써 주세요.';

  var PROMPTS = [
    { id: 1, title: '평생운', full: '만세력 기반 평생운 분석', fn: r1, body: '당신은 대한민국 상위 1% 경력의 명리학자입니다.\n아래 만세력을 바탕으로 원국(신강·신약·용신)과 대운 흐름을 중심으로 평생 운의 구조를 분석해 주세요.\n아래 구조를 반드시 그대로 유지해 주세요.\n① 평생 총평 & 인생 흐름 한 줄 정의\n② 5대 평생운 (애정운 / 재물운 / 직업·사업운 / 인간관계·귀인운 / 건강운)\n③ 대운 흐름 분석 (10년 단위로 상승·정체·전환 구간 설명)\n④ 인생에서 가장 중요한 전환점 2~3회와 그 의미\n⑤ 평생 리스크 패턴 & 운을 키우는 핵심 전략\n모든 항목은 원인(명리 구조) → 결과(인생 패턴) → 행동 전략 순서로 구체적으로 5,000자 이상 서술해 주세요.' },
    { id: 2, title: '연간 운세', full: '{Y}년 종합 사주 분석', fn: r2, year: true, body: '당신은 대한민국 상위 1% 경력의 명리학자입니다.\n아래 만세력을 바탕으로 원국(신강·신약·용신) + 현재 대운 + {Y}년 {YGZ}년의 형·충·합·파 상호작용을 근거로 분석해 주세요.\n아래 구조를 반드시 그대로 유지해 주세요.\n① 총평 & 핵심 선언\n② 5대 종합 운세 (애정운 / 재물운 / 직업·사업운 / 인간관계·귀인운 / 건강운)\n③ 월별 운세 (1~12월: 키워드 + 행동 2가지, 절기 기준 월운 사용)\n④ 마지막 시크릿 (전체 요약 + 최대 기회 1 + 최대 리스크 1 + 개운법)\n모든 항목은 원인(명리 근거) → 결과(현상) → 행동 전략 순서로 작성하고, 5,000자 이상 구체적으로 서술해 주세요.' },
    { id: 3, title: '개운법', full: '개운법 전략', fn: r3, body: '아래 만세력을 바탕으로 제 사주에서 부족하거나 과한 오행을 분석하고, 이를 보완할 수 있는 현실적인 개운법을 제시해 주세요.\n단순한 미신적 조언이 아니라, 원국 구조를 근거로 설명해 주세요.\n① 부족·과다 오행 분석\n② 행운의 컬러와 아이템 (옷, 액세서리, 소지품)\n③ 저에게 맞는 운동·취미·생활 습관\n④ 집안 인테리어 팁 (침대 방향, 책상 위치 등)\n⑤ 오늘부터 바로 실천할 수 있는 개운 행동 5가지\n모든 항목은 원인(명리 근거) → 결과(현상) → 행동 전략 순서로 5,000자 이상 구체적으로 서술해 주세요.' },
    { id: 4, title: '신살·길성', full: '신살·길성 정밀 분석', fn: r4, body: '당신은 대한민국 상위 1% 경력의 명리학자입니다.\n아래 만세력에서 제 사주에 작용하는 주요 신살과 길성(최소 5개 이상)을 선별해 해석해 주세요. 데이터에 없는 신살을 추가할 때는 판단 기준을 함께 밝혀 주세요.\n단순 의미 나열이 아니라 원국 구조(일간·오행 분포)와의 상호작용을 근거로 설명해 주세요.\n① 핵심 신살·길성 요약\n② 각 요소의 장점과 리스크\n③ 이 조합에 적합한 직업·적성 방향\n④ 인간관계·연애에서 나타나는 패턴\n⑤ 현실적인 개운법과 반드시 조심해야 할 포인트\n모든 항목은 원인(명리 근거) → 결과(현상) → 행동 전략 순서로 5,000자 이상 구체적으로 정리해 주세요.' },
    { id: 5, title: '레벨업 구조', full: '인생 레벨업 구조 분석', fn: r5, body: '당신은 상위 1% 명리 전략가입니다.\n아래 만세력을 바탕으로 제 인생을 하나의 ‘성장 스토리’로 분석해 주세요.\n① 타고난 기본 세팅(신강·신약·용신)\n② 인생에서 반복되는 패턴 3가지\n③ 10년 단위 대운 흐름의 상승·하강 구간\n④ 가장 큰 전환점 2~3회\n⑤ 평생 운을 키우는 핵심 행동 전략\n원인(명리 구조) → 결과(인생 현상) → 실천 전략 순서로 5,000자 이상 구체적으로 정리해 주세요.' },
    { id: 6, title: '돈의 그릇', full: '돈의 그릇 & 부의 체질 분석', fn: r6, body: '당신은 대한민국 상위 1% 경력의 명리학자입니다.\n아래 만세력을 기반으로 제 ‘돈의 체질’을 분석해 주세요.\n① 제 사주의 재물 구조(정재/편재, 식상, 관성 등 핵심 요소)\n② 평생 돈이 들어오는 방식 2~3가지\n③ 돈이 새는 반복 패턴\n④ 큰돈을 만지는 시기 구조(대운 중심)\n⑤ 부를 키우는 평생 전략\n추상적 표현 없이 5,000자 이상 구체적으로 분석해 주세요. 특정 투자 상품 추천은 하지 마세요.' },
    { id: 7, title: '연애·결혼', full: '연애·결혼 인생 시나리오 분석', fn: r7, body: '당신은 대한민국 상위 1% 자산가들의 혼사를 담당하는 프라이빗 명리 전략가입니다.\n아래 만세력을 바탕으로 이 사람의 평생 연애운과 결혼운을 현실적으로 분석해서 5,000자 이상 구체적으로 서술해 주세요. 성별({G})에 맞는 배우자 별(남성은 재성, 여성은 관성)을 기준으로 보세요.\n① 타고난 연애 팔자 총평\n(배우자궁 구조, 연애 체질, 사랑의 그릇 크기, 평생 애정운 강약 흐름)\n② 결정적 시기 분석\n(앞으로 3년 내 연애·결혼운 강한 연월, 결혼 적기 나이대, 반드시 피해야 할 시기, 스쳐가는 인연 vs 정착 인연 구분)\n③ 끌리는 사람 vs 실제로 잘 사는 사람\n(반복적으로 엮이는 유형, 나를 힘들게 하는 구조, 장기적으로 안정되는 배우자상, 반드시 피해야 할 상대의 특징)\n④ 부부 상생·상극 구조\n(결혼 후 재물운 변화, 배우자가 돈복을 가져오는지, 내가 희생하는 구조인지, 함께 살 때 건강·운에 미치는 영향)\n⑤ 연애·결혼 개운 전략\n(애정운 상승 컬러·아이템, 매력 터지는 달 활용법, 말투·행동 교정 포인트, 반드시 지켜야 할 철칙 1가지)' },
    { id: 8, title: '커리어 DNA', full: '성공 포지션 & 커리어 DNA 분석', fn: r8, body: '당신은 대한민국 상위 1% 경력의 명리학자입니다.\n아래 만세력을 기반으로 제 커리어 DNA를 분석해 주세요.\n① 타고난 일의 성향과 포지션\n② 조직형 vs 사업형 판단\n③ 성공을 만드는 방식(식상/관성/재성 구조)\n④ 인생 커리어 전환점\n⑤ 실패를 막는 리스크 관리 전략\n구체적이고 현실적으로 5,000자 이상 서술해 주세요.' },
    { id: 9, title: '리스크 방어', full: '인생 리스크 예측 & 방어 전략', fn: r9, body: '당신은 대한민국 상위 1% 경력의 명리학자입니다.\n아래 만세력을 바탕으로 평생 리스크 패턴을 분석해 주세요.\n① 사주에서 가장 약한 오행\n② 건강·금전·관계에서 반복될 위험 구조\n③ 대운에서 조심해야 할 시기 유형\n④ 감정 폭발·조급함 등 심리 패턴\n⑤ 장기적으로 운을 안정시키는 전략\n원인 → 결과 → 방어 전략 순서로 5,000자 이상 구체적으로 정리해 주세요.' }
  ];

  function buildPrompt(A, id, Y) {
    var p = PROMPTS[id - 1];
    var ygz = Y ? S.yearFortune(A, Y).gz : '';
    var body = p.body.replace(/\{Y\}/g, Y).replace(/\{YGZ\}/g, ygz + '(' + (ygz ? S.gzKo(ygz) : '') + ')').replace(/\{G\}/g, A.gender + '성');
    return body + '\n\n' + dataBlock(A, p.year ? Y : null) + RULES;
  }

  root.Report = {
    PROMPTS: PROMPTS, buildPrompt: buildPrompt, dataBlock: dataBlock, esc: esc,
    render: function (A, id, Y) { return PROMPTS[id - 1].fn(A, Y); }
  };
})(typeof window !== 'undefined' ? window : this);
