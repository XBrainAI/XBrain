/* grade-insight 系统分析引擎（GIAnalyze v2）——浏览器与 Node 双端复用的唯一研判实现
   规则口径 = pipeline/ANALYZE-RULES.md v2（RULES 常量逐项对应，静态测试断言一致性）。
   纯函数：输入 exam.json 模型 + targetRate（+ 可选 GI_JOINT），输出结构化研判模型；渲染（站点 HTML / CLI md）各自消费。
   v2 只增不改：R1–R7 与既有输出字段冻结（S12 零回退 diff 守护）；新增 L2 题级诊断（D1/D2/D3）、
   L3 跨考演化（E1/E2/E3，单考输出"下考激活"占位）与 L4 行动层 v2（A1 加权/A2 四周计划）。
   缺源不研判、预估带口径标签、无运行时钟（同输入同输出）。
*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.GIAnalyze = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var RULES = {
    v: 'ANALYZE-RULES v2', engine: 'GIAnalyze v2',
    R1rate: 0.6, R1levels: ['D', 'E'], R2easyLossRatio: 0.15, R2easyWrong: 3,
    R3midShare: 0.40, R4rateFloor: 0.6, R4hardShare: 0.5, R5weakRatio: 0.25, R6keyWeakMin: 3,
    recEasy: 0.8, recMid: 0.5, recKpCap: 8, DIFFS: ['易', '中', '难'],
    D3rateLine: 60, E1dropPP: 15, E2streak: 2, stubbornBoost: 1.3, hardFactor: 0.3, weekCap: 10,
    causeW: { C1: 0.6, C2: 0.6, C3: 0.9, C4: 0.9, C5: 0.6, C6: 0.5 },
    causeName: { C1: '概念没吃透', C2: '方法不会用', C3: '算错了', C4: '看错了题', C5: '步骤丢分', C6: '待标注' },
  };

  function r2(x) { return Math.round(x * 100) / 100; }
  function lossOf(q) { return Math.max(0, (q.point || 0) - (q.score || 0)); }
  function isWrong(q) { return q.score !== null && q.score !== undefined && q.point !== null && q.point !== undefined && q.score < q.point; }
  function typeCat(t) {
    var s = String(t || '');
    if (s.indexOf('多选') >= 0) return '多选';
    if (s.indexOf('作文') >= 0) return '作文';
    if (s.indexOf('单选') >= 0) return '单选';
    return '主观';
  }
  var TYPE_CATS = ['单选', '多选', '主观', '作文'];

  function subjStat(sr) {
    var byDiff = {};
    RULES.DIFFS.forEach(function (d) { byDiff[d] = { point: 0, loss: 0, wrong: [], total: 0 }; });
    var byType = {};
    (sr.questions || []).forEach(function (q) {
      var b = byDiff[q.diff]; if (!b) return;
      b.total++; b.point += q.point || 0;
      var loss = lossOf(q);
      b.loss += loss;
      if (isWrong(q)) {
        b.wrong.push(q);
        var t = (byType[q.type] = byType[q.type] || { loss: 0, n: 0, midLoss: 0, firstRef: null });
        t.loss += loss; t.n++;
        if (q.diff === '中') { t.midLoss += loss; if (!t.firstRef && q.analysisRef) t.firstRef = q.analysisRef; }
      }
    });
    var lossTotal = RULES.DIFFS.reduce(function (a, d) { return a + byDiff[d].loss; }, 0);
    return { byDiff: byDiff, byType: byType, lossTotal: r2(lossTotal), hasQ: (sr.questions || []).length > 0 };
  }

  /* ---------- L2：题级诊断 ---------- */
  function gridOf(sr) {
    var g = {};
    RULES.DIFFS.forEach(function (d) { g[d] = {}; });
    (sr.questions || []).forEach(function (q) {
      if (!g[q.diff] || !isWrong(q)) return;
      var c = typeCat(q.type);
      g[q.diff][c] = r2((g[q.diff][c] || 0) + lossOf(q));
    });
    return g;
  }

  function causeOf(sr) {
    var map = {};
    Object.keys(RULES.causeW).forEach(function (c) { map[c] = 0; });
    var counts = {}; Object.keys(RULES.causeW).forEach(function (c) { counts[c] = 0; });
    var confirmed = 0, total = 0, pendingLoss = 0;
    (sr.questions || []).filter(isWrong).forEach(function (q) {
      total++;
      var l = lossOf(q);
      if (q.cause && map[q.cause] !== undefined) { map[q.cause] = r2(map[q.cause] + l); counts[q.cause]++; confirmed++; }
      else pendingLoss = r2(pendingLoss + l);
    });
    return {
      causes: confirmed ? map : null,
      causeCounts: confirmed ? counts : null,
      pendingLoss: pendingLoss,
      coverage: { confirmed: confirmed, total: total },
    };
  }

  function quadrantOf(sr) {
    var kps = sr.kps || [];
    var questions = sr.questions || [];
    var subjLossQ = questions.filter(function (q) { return typeCat(q.type) === '主观' && q.point; });
    var avgSubj = subjLossQ.length
      ? subjLossQ.reduce(function (a, q) { return a + lossOf(q); }, 0) / subjLossQ.length
      : (questions.length ? questions.reduce(function (a, q) { return a + lossOf(q); }, 0) / questions.length : 0);
    var pts = kps.map(function (k) {
      var loss = 0, degraded = false;
      if (k.qNos && k.qNos.length) {
        k.qNos.forEach(function (no) {
          var q = null;
          for (var i = 0; i < questions.length; i++) if (questions[i].no === no) { q = questions[i]; break; }
          if (q) loss += lossOf(q);
        });
      } else {
        degraded = true;
        loss = (k.wrong || 0) * avgSubj;
      }
      return {
        kpKey: k.kpKey || (sr.key + '::' + k.name), kpId: k.kpId || null, name: k.name,
        rate: k.rate, wrong: k.wrong, key: !!k.key, cat: k.category || null,
        loss: r2(loss), degraded: degraded, qNos: (k.qNos || []).slice(),
      };
    });
    var withLoss = pts.filter(function (p) { return p.loss > 0; });
    var xLine = withLoss.length ? r2(withLoss.reduce(function (a, p) { return a + p.loss; }, 0) / withLoss.length) : 0;
    pts.forEach(function (p) {
      var high = p.loss >= xLine && p.loss > 0;
      var weak = p.rate !== null && p.rate !== undefined && p.rate < RULES.D3rateLine;
      p.quadrant = high ? (weak ? 'highValue' : 'stable') : (weak ? 'lowEffort' : 'safe');
    });
    pts.sort(function (a, b) { return b.loss - a.loss || (a.rate || 0) - (b.rate || 0) || String(a.kpKey).localeCompare(String(b.kpKey)); });
    return { rateLine: RULES.D3rateLine, xLine: xLine, degradedN: pts.filter(function (p) { return p.degraded; }).length, points: pts };
  }

  /* ---------- L3：跨考演化（单考诚实降级） ---------- */
  function crossOf(jointData) {
    if (!jointData || jointData.schema !== 'gi-joint/1' || !Array.isArray(jointData.exams) || jointData.exams.length < 2) {
      return {
        active: false,
        reason: jointData ? '跨考数据仅 1 考，KP 演化/顽固薄弱/跨考错题本下考激活' : '未加载联合数据（GI_JOINT 缺失），跨考维度下考激活',
        exams: jointData && jointData.exams ? jointData.exams.map(function (e) { return { examId: e.examId, name: e.name, date: e.date }; }) : [],
        e1: null, e2: null, e3: null,
      };
    }
    var timeline = jointData.kpTimeline || {};
    var e1 = [];
    Object.keys(timeline).sort().forEach(function (key) {
      var series = timeline[key];
      for (var i = 1; i < series.length; i++) {
        var delta = r2(series[i].rate - series[i - 1].rate);
        if (delta <= -RULES.E1dropPP) {
          e1.push({ kpKey: key, from: series[i - 1], to: series[i], delta: delta });
        }
      }
    });
    var e2 = [];
    Object.keys(timeline).sort().forEach(function (key) {
      var series = timeline[key], run = 0;
      for (var i = 0; i < series.length; i++) {
        var c = series[i].cat;
        if (c === '薄弱' || c === '待提升') { run++; if (run >= RULES.E2streak) { e2.push({ kpKey: key, streak: run, through: series[i] }); break; } }
        else run = 0;
      }
    });
    var e3 = [];
    jointData.exams.forEach(function (e) {
      Object.keys(e.subjects || {}).sort().forEach(function (sk) {
        var s = e.subjects[sk];
        (s.wrongQuestions || []).forEach(function (q) {
          e3.push({
            examId: e.examId, examName: e.name, date: e.date, subject: sk, subjectName: s.name,
            no: q.no, type: q.type, point: q.point, score: q.score, diff: q.diff, cause: q.cause,
            kpKeys: q.kpKeys || [], analysisRef: q.analysisRef || null, source: e.source,
          });
        });
      });
    });
    return { active: true, reason: null, exams: jointData.exams.map(function (e) { return { examId: e.examId, name: e.name, date: e.date }; }), e1: e1, e2: e2, e3: e3 };
  }

  /* ---------- L4：行动层 v2 ---------- */
  function causeWOf(qs) {
    var tot = 0, wsum = 0;
    qs.forEach(function (q) {
      var l = lossOf(q); if (!l) return;
      tot += l;
      if (q.cause && RULES.causeW[q.cause] !== undefined) wsum += l * RULES.causeW[q.cause];
    });
    return tot > 0 && wsum > 0 ? r2(wsum / tot) : null;
  }
  function tierRatioOf(q) { return q.diff === '难' ? r2(RULES.recMid * RULES.hardFactor) : (q.diff === '易' ? RULES.recEasy : RULES.recMid); }
  function stubbornKeys(cross) {
    var set = {};
    if (cross && cross.e2) cross.e2.forEach(function (x) { set[x.kpKey] = true; });
    return set;
  }
  function kpKeysOfQuestion(sr, no) {
    return (sr.kps || []).filter(function (k) { return (k.qNos || []).indexOf(no) >= 0; })
      .map(function (k) { return k.kpKey || (sr.key + '::' + k.name); });
  }

  function actionOf(planItems, cross) {
    var stubborn = stubbornKeys(cross);
    var items = [];
    planItems.forEach(function (p) {
      var src = p.__src || [], w = causeWOf(src), isKp = p.tag === 'R6';
      var st = isKp && p.__kpKey ? !!stubborn[p.__kpKey] : false;
      items.push({
        subj: p.subj, tag: p.tag, what: p.what, link: p.link || null,
        base: p.rec, tier: p.__tier || '中',
        w: w, wLabel: w === null ? '无错因数据（按 1 计，未标注≠无问题）' : '错因加权',
        stubborn: st, rec: r2(p.rec * (w === null ? 1 : w) * (st ? RULES.stubbornBoost : 1)),
        qNos: p.__qNos || [], kpKey: p.__kpKey || null,
      });
    });
    items.sort(function (a, b) { return b.rec - a.rec || String(a.subj).localeCompare(String(b.subj)) || String(a.what).localeCompare(String(b.what)); });
    return items;
  }

  function weeksOf(subs, perSubject, cross) {
    var stubborn = stubbornKeys(cross);
    /* 第 1 周：止血——易题全清单 + C3/C4 错题 */
    var w1 = [];
    subs.forEach(function (sr) {
      (sr.questions || []).filter(isWrong).forEach(function (q) {
        var cat = q.cause;
        var isEasy = q.diff === '易';
        var isFixable = cat === 'C3' || cat === 'C4';
        if (!isEasy && !isFixable) return;
        var w = cat && RULES.causeW[cat] !== undefined ? RULES.causeW[cat] : 1;
        var st = kpKeysOfQuestion(sr, q.no).some(function (k) { return stubborn[k]; });
        w1.push({
          subj: sr.name || sr.key, no: q.no, type: q.type || '', diff: q.diff || '', cause: cat || null,
          causeLabel: cat ? RULES.causeName[cat] : null, loss: r2(lossOf(q)),
          rec: r2(lossOf(q) * tierRatioOf(q) * w * (st ? RULES.stubbornBoost : 1)),
          link: q.analysisRef || null, kpKeys: kpKeysOfQuestion(sr, q.no),
          why: isEasy ? '简单题失分优先回补' : '可补性最高的错因（算错/看错题）',
        });
      });
    });
    w1.sort(function (a, b) { return b.rec - a.rec || String(a.subj).localeCompare(String(b.subj)) || a.no - b.no; });
    /* 第 2–3 周：主攻——四象限右上区 KP 群组（含顽固加权） */
    var w2 = [];
    perSubject.forEach(function (o) {
      var sr = null; subs.forEach(function (x) { if (x.key === o.key) sr = x; });
      if (!sr || !o.l2 || !o.l2.quadrant) return;
      o.l2.quadrant.points.filter(function (p) { return p.quadrant === 'highValue' || stubborn[p.kpKey]; }).forEach(function (p) {
        /* 无题号映射 = 无具体重练题，不生成周计划项（重点薄弱摊派仍见补救清单 v1/R6 项） */
        if (!p.qNos.length) return;
        var qs = (sr.questions || []).filter(function (q) { return isWrong(q) && p.qNos.indexOf(q.no) >= 0; });
        if (!qs.length) return;
        var base = qs.reduce(function (a, q) { return a + lossOf(q) * tierRatioOf(q); }, 0);
        var w = causeWOf(qs);
        var st = !!stubborn[p.kpKey];
        w2.push({
          subj: o.name, kpKey: p.kpKey, name: p.name, rate: p.rate, key: !!p.key,
          loss: p.loss, wrongQ: qs.length, w: w, stubborn: st,
          rec: r2(base * (w === null ? 1 : w) * (st ? RULES.stubbornBoost : 1)),
          questions: qs.map(function (q) { return { no: q.no, type: q.type, cause: q.cause || null, link: q.analysisRef || null }; }),
          formula: 'Σ(该 KP 错题丢分 × 档位比例' + (w === null ? '' : ' × 错因系数 ' + w) + (st ? ' × 顽固 1.3' : '') + ')',
        });
      });
    });
    w2.sort(function (a, b) { return b.rec - a.rec || String(a.kpKey).localeCompare(String(b.kpKey)); });
    /* 第 4 周：验收——本期重练 topN 回测 + 仍未掌握 KP 转入下期 */
    var pool = w1.map(function (x) { return { kind: 'q', subj: x.subj, no: x.no, rec: x.rec, link: x.link, cause: x.cause }; })
      .concat(w2.map(function (x) { return { kind: 'kp', subj: x.subj, kpKey: x.kpKey, name: x.name, rate: x.rate, rec: x.rec, qNos: (x.questions || []).map(function (q) { return q.no; }) }; }));
    pool.sort(function (a, b) { return b.rec - a.rec || String(a.subj).localeCompare(String(b.subj)); });
    var w4 = pool.slice(0, RULES.weekCap);
    var still = [];
    perSubject.forEach(function (o) {
      if (!o.l2 || !o.l2.quadrant) return;
      o.l2.quadrant.points.filter(function (p) { return p.rate !== null && p.rate !== undefined && p.rate < RULES.D3rateLine; }).slice(0, 8).forEach(function (p) {
        still.push({ subj: o.name, kpKey: p.kpKey, name: p.name, rate: p.rate, quadrant: p.quadrant });
      });
    });
    return [
      { week: 1, title: '止血', desc: '简单题全部重练 + 算错/看错题优先纠正', items: w1.slice(0, RULES.weekCap), overflow: Math.max(0, w1.length - RULES.weekCap) },
      { week: 2, title: '主攻', desc: '高价值补强区（丢分多·未掌握）按知识点群推进，顽固点加权', items: w2.slice(0, RULES.weekCap), overflow: Math.max(0, w2.length - RULES.weekCap) },
      { week: 3, title: '主攻（续）', desc: '补强剩余知识点群，巩固重练清单', items: w2.slice(RULES.weekCap, RULES.weekCap * 2), overflow: Math.max(0, w2.length - RULES.weekCap * 2) },
      { week: 4, title: '验收', desc: '本期重练 top' + RULES.weekCap + ' 回测；仍未掌握的知识点转入下期', items: w4, still: still },
    ];
  }

  function build(examData, targetRate, jointData) {
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

    /* 逐科（v1 字段冻结；l2 为 v2 增量） */
    var rawByKey = {}; subs.forEach(function (s) { rawByKey[s.key] = s; });
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
      /* v2 L2 */
      o.l2 = { grid: gridOf(s), cause: causeOf(s), quadrant: (s.kps && s.kps.length) ? quadrantOf(s) : null };
      return o;
    });

    /* 补救清单（v1 冻结，逐项挂来源题供 A1 使用） */
    var items = [];
    perSubject.forEach(function (o) {
      var st = subjStat(subs.filter(function (s) { return s.key === o.key; })[0]);
      var sr = rawByKey[o.key];
      if (o.hasQ && st.byDiff['易'].loss > 0) {
        items.push({ subj: o.name, tag: 'R2', what: '易题全回收：' + o.easyWrongNos.map(function (n) { return '第' + n + '题'; }).join('、'), basis: '易题丢 ' + o.diffs['易'].loss + ' 分', rec: r2(st.byDiff['易'].loss * RULES.recEasy), link: st.byDiff['易'].wrong[0] && st.byDiff['易'].wrong[0].analysisRef, __src: st.byDiff['易'].wrong.slice(), __tier: '易', __qNos: o.easyWrongNos.slice() });
      }
      if (o.hasQ && o.types.length) {
        var t0 = st.byType[o.types[0][0]];
        if (t0 && t0.midLoss > 0) {
          var midQs = (sr.questions || []).filter(function (q) { return isWrong(q) && q.type === o.types[0][0] && q.diff === '中'; });
          items.push({ subj: o.name, tag: 'R3', what: o.types[0][0] + '中档专项', basis: '该题型中档丢 ' + r2(t0.midLoss) + ' 分', rec: r2(t0.midLoss * RULES.recMid), link: t0.firstRef, __src: midQs, __tier: '中', __qNos: midQs.map(function (q) { return q.no; }) });
        }
      }
      if (o.kp && o.kp.keyWeakN) {
        var mid = st.hasQ ? st.byDiff['中'].loss : 0;
        o.kp.top.filter(function (k) { return k.key; }).slice(0, 3).forEach(function (k) {
          var full = (sr.kps || []).filter(function (x) { return x.key && normName(x.name) === normName(k.name); })[0];
          var kpQs = full && full.qNos ? (sr.questions || []).filter(function (q) { return isWrong(q) && full.qNos.indexOf(q.no) >= 0; }) : [];
          items.push({
            subj: o.name, tag: 'R6', what: '补重点薄弱：' + short(k.name), basis: '掌握率 ' + k.rate + '%，错 ' + k.wrong + ' 题',
            rec: r2(Math.min(RULES.recKpCap, mid * RULES.recMid / o.kp.keyWeakN)), link: null,
            __src: kpQs, __tier: '中', __qNos: kpQs.map(function (q) { return q.no; }),
            __kpKey: full ? (full.kpKey || (o.key + '::' + normName(full.name))) : null,
          });
        });
      }
    });
    items.sort(function (a, b) { return b.rec - a.rec; });

    /* 边界（v1 原样） */
    var bounds = [];
    (examData.integrity && examData.integrity.checks || []).filter(function (c) { return c.status !== 'pass'; }).forEach(function (c) {
      bounds.push(c.name + '：' + c.status + '（期望 ' + JSON.stringify(c.expect) + '，实际 ' + JSON.stringify(c.actual) + '）');
    });
    (examData.integrity && examData.integrity.sourceNotes || []).forEach(function (n) { bounds.push('[' + n.subject + '] ' + n.note); });
    var kpCov = subs.filter(function (s) { return s.kps && s.kps.length; }).map(function (s) { return s.name || s.key; });
    bounds.push('年级均分/排名：源未提供，不参与研判；知识点覆盖仅 ' + (kpCov.join('、') || '无') + '，其余科 R5/R6 未评估≠无问题。');

    /* v2：跨考 + 行动层 */
    var cross = crossOf(jointData);
    var actionItems = actionOf(items, cross);
    var weeks = weeksOf(subs, perSubject, cross);
    var causeCov = subs.filter(function (s) { return s.questions && s.questions.length; }).map(function (s) {
      var c = causeOf(s);
      return { name: s.name || s.key, confirmed: c.coverage.confirmed, total: c.coverage.total };
    });
    var boundsV2 = [];
    causeCov.forEach(function (c) {
      if (c.confirmed < c.total) boundsV2.push(c.name + '错因标注 ' + c.confirmed + '/' + c.total + '：未标注≠无问题，相关项按未加权计算。');
    });
    perSubject.forEach(function (o) {
      if (o.l2 && o.l2.quadrant && o.l2.quadrant.degradedN) boundsV2.push(o.name + ' KP 四象限有 ' + o.l2.quadrant.degradedN + ' 条无题号映射，按"错题数 × 主观题均丢"退化估算（标注退化口径）。');
    });
    if (!cross.active) boundsV2.push(cross.reason + '（不编造跨考结论）。');
    boundsV2.push('错因是推断不是事实：全部错因输出为"AI 预判+人工复核"口径；预估回收为"规则估计"非承诺。');

    var actPotential = r2(actionItems.reduce(function (a, x) { return a + x.rec; }, 0));
    var publicPlan = items.slice(0, 10).map(function (it) {
      return { subj: it.subj, tag: it.tag, what: it.what, basis: it.basis, rec: it.rec, link: it.link };
    });

    return {
      rules: RULES.v, engine: RULES.engine, overall: overall, subjects: perSubject, plan: publicPlan, planTotal: items.length, bounds: bounds,
      /* v2 增量 */
      cross: cross,
      actionV2: { items: actionItems, weeks: weeks, potential: actPotential, params: { stubbornBoost: RULES.stubbornBoost, hardFactor: RULES.hardFactor, weekCap: RULES.weekCap } },
      boundsV2: boundsV2,
      causeCoverage: causeCov,
    };

    function pct1(x) { return (x * 100).toFixed(1) + '%'; }
    function short(n) { return String(n).split('>').pop(); }
    function normName(s) { return String(s).replace(/【重点】/g, '').replace(/^重点\s*/, '').replace(/\s+/g, '').replace(/（/g, '(').replace(/）/g, ')'); }
  }

  return { RULES: RULES, build: build };
});
