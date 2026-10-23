/* grade-insight 系统分析引擎（GIAnalyze v1）——浏览器与 Node 双端复用的唯一研判实现
   规则口径 = pipeline/ANALYZE-RULES.md v1（RULES 常量逐项对应，静态测试断言一致性）。
   纯函数：输入 exam.json 模型 + targetRate，输出结构化研判模型；渲染（站点 HTML / CLI md）各自消费。
   缺源不研判、预估带口径标签、无运行时钟（同输入同输出）。
*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.GIAnalyze = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var RULES = {
    v: 'ANALYZE-RULES v1', engine: 'GIAnalyze v1',
    R1rate: 0.6, R1levels: ['D', 'E'], R2easyLossRatio: 0.15, R2easyWrong: 3,
    R3midShare: 0.40, R4rateFloor: 0.6, R4hardShare: 0.5, R5weakRatio: 0.25, R6keyWeakMin: 3,
    recEasy: 0.8, recMid: 0.5, recKpCap: 8, DIFFS: ['易', '中', '难'],
  };

  function r2(x) { return Math.round(x * 100) / 100; }

  function subjStat(sr) {
    var byDiff = {};
    RULES.DIFFS.forEach(function (d) { byDiff[d] = { point: 0, loss: 0, wrong: [], total: 0 }; });
    var byType = {};
    (sr.questions || []).forEach(function (q) {
      var b = byDiff[q.diff]; if (!b) return;
      b.total++; b.point += q.point || 0;
      var loss = Math.max(0, (q.point || 0) - (q.score || 0));
      b.loss += loss;
      if ((q.score || 0) < (q.point || 0)) {
        b.wrong.push(q);
        var t = (byType[q.type] = byType[q.type] || { loss: 0, n: 0, midLoss: 0, firstRef: null });
        t.loss += loss; t.n++;
        if (q.diff === '中') { t.midLoss += loss; if (!t.firstRef && q.analysisRef) t.firstRef = q.analysisRef; }
      }
    });
    var lossTotal = RULES.DIFFS.reduce(function (a, d) { return a + byDiff[d].loss; }, 0);
    return { byDiff: byDiff, byType: byType, lossTotal: r2(lossTotal), hasQ: (sr.questions || []).length > 0 };
  }

  function build(examData, targetRate) {
    var subs = (examData.subjects || []).filter(function (s) { return typeof s.score === 'number' && s.full; });
    var t = examData.total || {};
    var rates = subs.map(function (s) { return { s: s, r: s.score / s.full, st: subjStat(s) }; });
    var asc = rates.slice().sort(function (a, b) { return a.r - b.r; });

    /* 全科 */
    var levelCnt = {};
    subs.forEach(function (s) { var k = s.level || '–'; levelCnt[k] = (levelCnt[k] || 0) + 1; });
    var totalRate = t.full ? t.score / t.full : null;
    var mean = rates.reduce(function (a, x) { return a + x.r; }, 0) / (rates.length || 1);
    var sigma = Math.sqrt(rates.reduce(function (a, x) { return a + (x.r - mean) * (x.r - mean); }, 0) / (rates.length || 1));
    var potEasy = rates.reduce(function (a, x) { return a + x.st.byDiff['易'].loss * RULES.recEasy; }, 0);
    var potMid = rates.reduce(function (a, x) { return a + x.st.byDiff['中'].loss * RULES.recMid; }, 0);
    var potential = potEasy + potMid;
    var overall = {
      score: t.score, full: t.full, rate: r2(totalRate), level: t.level || '–',
      targetRate: targetRate, gapPP: r2((targetRate - totalRate) * 100),
      levels: Object.keys(levelCnt).sort().map(function (k) { return [k, levelCnt[k]]; }),
      spread: { minName: asc[0].s.name, minRate: r2(asc[0].r), maxName: asc[asc.length - 1].s.name, maxRate: r2(asc[asc.length - 1].r), pp: r2((asc[asc.length - 1].r - asc[0].r) * 100) },
      sigma: r2(sigma), skewed: sigma > 0.08,
      bottom: asc.slice(0, 3).map(function (x) { return { name: x.s.name, rate: r2(x.r), level: x.s.level || '–' }; }),
      r1: asc.filter(function (x) { return x.r < RULES.R1rate || RULES.R1levels.indexOf(x.s.level) >= 0; }).map(function (x) { return x.s.name; }),
      potential: r2(potential), potentialRate: r2(Math.min(1, (t.score + potential) / t.full)),
      lossTotal: r2(rates.reduce(function (a, x) { return a + x.st.lossTotal; }, 0)),
    };

    /* 逐科 */
    var perSubject = asc.map(function (x) {
      var s = x.s, st = x.st, concls = [];
      var o = {
        key: s.key, name: s.name || s.key, score: s.score, full: s.full, rate: r2(x.r), level: s.level || null,
        hasQ: st.hasQ, diffs: {}, types: [], easyWrongNos: [], kp: null, concls: concls,
      };
      if (x.r < RULES.R1rate || RULES.R1levels.indexOf(s.level) >= 0) concls.push({ tag: 'R1', text: '短板科目（得分率 ' + pct1(x.r) + (s.level ? '，' + s.level : '') + '）' });
      RULES.DIFFS.forEach(function (d) { o.diffs[d] = { total: st.byDiff[d].total, point: r2(st.byDiff[d].point), loss: r2(st.byDiff[d].loss), wrongN: st.byDiff[d].wrong.length }; });
      if (!st.hasQ) { o.note = '题级数据源未提供，仅成绩层研判'; return o; }
      o.easyWrongNos = st.byDiff['易'].wrong.map(function (q) { return q.no; });
      o.types = Object.keys(st.byType).map(function (k) { return [k, r2(st.byType[k].loss), st.byType[k].n]; }).sort(function (a, b) { return b[1] - a[1]; });
      var easy = st.byDiff['易'];
      if (easy.point && (easy.loss / easy.point >= RULES.R2easyLossRatio || easy.wrong.length >= RULES.R2easyWrong)) concls.push({ tag: 'R2', text: '基础失血：易题丢 ' + r2(easy.loss) + '（占该档 ' + pct1(easy.loss / easy.point) + '，错 ' + easy.wrong.length + ' 题）→ 优先回补' });
      if (st.lossTotal && st.byDiff['中'].loss / st.lossTotal >= RULES.R3midShare) concls.push({ tag: 'R3', text: '主战场在中档题（丢分占比 ' + pct1(st.byDiff['中'].loss / st.lossTotal) + '）' });
      else if (x.r >= RULES.R4rateFloor && st.lossTotal && st.byDiff['难'].loss / st.lossTotal >= RULES.R4hardShare) concls.push({ tag: 'R4', text: '丢分集中难题，暂不列优先级（正常梯度）' });
      if (s.kps && s.kps.length) {
        var weak = s.kps.filter(function (k) { return (k.rate || 0) < 60; }).sort(function (a, b) { return a.rate - b.rate; });
        var keyWeak = weak.filter(function (k) { return k.key; });
        o.kp = { count: s.kps.length, weakN: weak.length, keyWeakN: keyWeak.length, weakRatio: r2(weak.length / s.kps.length), top: weak.slice(0, 5).map(function (k) { return { name: k.name, rate: k.rate, key: !!k.key, wrong: k.wrong }; }) };
        if (weak.length / s.kps.length >= RULES.R5weakRatio) concls.push({ tag: 'R5', text: '薄弱面广（' + weak.length + '/' + s.kps.length + '）' });
        if (keyWeak.length >= RULES.R6keyWeakMin) concls.push({ tag: 'R6', text: keyWeak.length + ' 条【重点】未掌握，直击得分基本盘' });
      }
      return o;
    });

    /* 补救清单 */
    var items = [];
    perSubject.forEach(function (o) {
      var st = subjStat(subs.filter(function (s) { return s.key === o.key; })[0]);
      if (o.hasQ && st.byDiff['易'].loss > 0) items.push({ subj: o.name, tag: 'R2', what: '易题全回收：' + o.easyWrongNos.map(function (n) { return '第' + n + '题'; }).join('、'), basis: '易题丢 ' + o.diffs['易'].loss + ' 分', rec: r2(st.byDiff['易'].loss * RULES.recEasy), link: st.byDiff['易'].wrong[0] && st.byDiff['易'].wrong[0].analysisRef });
      if (o.hasQ && o.types.length) {
        var t0 = st.byType[o.types[0][0]];
        if (t0 && t0.midLoss > 0) items.push({ subj: o.name, tag: 'R3', what: o.types[0][0] + '中档专项', basis: '该题型中档丢 ' + r2(t0.midLoss) + ' 分', rec: r2(t0.midLoss * RULES.recMid), link: t0.firstRef });
      }
      if (o.kp && o.kp.keyWeakN) {
        var mid = st.hasQ ? st.byDiff['中'].loss : 0;
        var per = Math.min(RULES.recKpCap, r2(mid * RULES.recMid / o.kp.keyWeakN)) || r2(mid * RULES.recMid / o.kp.keyWeakN);
        o.kp.top.filter(function (k) { return k.key; }).slice(0, 3).forEach(function (k) {
          items.push({ subj: o.name, tag: 'R6', what: '补重点薄弱：' + short(k.name), basis: '掌握率 ' + k.rate + '%，错 ' + k.wrong + ' 题', rec: r2(Math.min(RULES.recKpCap, mid * RULES.recMid / o.kp.keyWeakN)), link: null });
        });
      }
    });
    items.sort(function (a, b) { return b.rec - a.rec; });

    /* 边界 */
    var bounds = [];
    (examData.integrity && examData.integrity.checks || []).filter(function (c) { return c.status !== 'pass'; }).forEach(function (c) {
      bounds.push(c.name + '：' + c.status + '（期望 ' + JSON.stringify(c.expect) + '，实际 ' + JSON.stringify(c.actual) + '）');
    });
    (examData.integrity && examData.integrity.sourceNotes || []).forEach(function (n) { bounds.push('[' + n.subject + '] ' + n.note); });
    var kpCov = subs.filter(function (s) { return s.kps && s.kps.length; }).map(function (s) { return s.name || s.key; });
    bounds.push('年级均分/排名：源未提供，不参与研判；知识点覆盖仅 ' + (kpCov.join('、') || '无') + '，其余科 R5/R6 未评估≠无问题。');

    return { rules: RULES.v, engine: RULES.engine, overall: overall, subjects: perSubject, plan: items.slice(0, 10), planTotal: items.length, bounds: bounds };

    function pct1(x) { return (x * 100).toFixed(1) + '%'; }
    function short(n) { return String(n).split('>').pop(); }
  }

  return { RULES: RULES, build: build };
});
