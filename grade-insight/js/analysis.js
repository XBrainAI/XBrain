/* ============================================================
   grade-insight · 分析引擎（纯函数，不碰 DOM）
   ------------------------------------------------------------
   核心思想：不同考试满分/范围不同，不能直接比原始分。
   统一用三重归一：
     ① 得分率   rate = score / full
     ② 排名百分位  percentile = (1 - rank / rankSize) × 100（排名越小越靠前）
     ③ 相对年级位置 vsAvg = 个人得分率 − 年级(或班级)均分得分率
   在此之上做趋势/波动/偏科/贡献度/目标推演，并生成中文智能简报。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 格式化 ---------- */
  function pct(x) { return (x * 100).toFixed(1) + '%'; }
  function pp(x) { return (x >= 0 ? '+' : '') + (x * 100).toFixed(1); }
  function fmtDate(d) { return (d || '').slice(5).replace('-', '/'); }

  /* ---------- 基础序列 ---------- */
  function sortExams(exams) {
    return exams.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  function subjRate(sr) {
    if (!sr || sr.score === null || sr.score === undefined || !sr.full) return null;
    return sr.score / sr.full;
  }

  /* 单场考试总分聚合（只统计有数字得分的科目） */
  function examAgg(exam) {
    var score = 0, full = 0, count = 0, missing = [];
    (exam.subjects || []).forEach(function (sr) {
      if (sr.score !== null && sr.score !== undefined && sr.full) {
        score += sr.score; full += sr.full; count++;
      } else {
        missing.push(sr.key);
      }
    });
    return { score: score, full: full, count: count, missing: missing, rate: full ? score / full : null };
  }

  function percentileOf(rank, rankSize) {
    if (rank === null || rank === undefined || !rankSize || rankSize <= 0) return null;
    var r = Math.min(Math.max(rank, 1), rankSize);
    return (1 - r / rankSize) * 100;
  }

  /* 相对年级位置：优先年级均分，缺则用班级均分（返回小数差值，如 +0.083） */
  function vsAvgOf(sr) {
    var rate = subjRate(sr);
    if (rate === null) return null;
    var basis = null, avgRate = null;
    if (sr.avgGrade !== null && sr.avgGrade !== undefined && sr.full) {
      avgRate = sr.avgGrade / sr.full; basis = '年级';
    } else if (sr.avgClass !== null && sr.avgClass !== undefined && sr.full) {
      avgRate = sr.avgClass / sr.full; basis = '班级';
    }
    if (avgRate === null) return null;
    return { diff: rate - avgRate, basis: basis };
  }

  /* 总分序列（升序）：[{exam, agg, rate, vsAvg, vsBasis, percentile}] */
  function overallSeries(exams) {
    return sortExams(exams).map(function (e) {
      var agg = examAgg(e);
      /* 总分相对位置：Σ(个人−均分)/Σ满分，只算两边都有值的科目 */
      var dScore = 0, dFull = 0, basisSet = {};
      (e.subjects || []).forEach(function (sr) {
        var v = vsAvgOf(sr);
        if (v && sr.score !== null) { dScore += sr.score - (v.basis === '年级' ? sr.avgGrade : sr.avgClass); dFull += sr.full; basisSet[v.basis] = true; }
      });
      var percentile = null;
      if (e.totalRank !== null && e.totalRank !== undefined) percentile = percentileOf(e.totalRank, e.totalRankSize);
      return {
        exam: e,
        agg: agg,
        rate: agg.rate,
        vsAvg: dFull ? dScore / dFull : null,
        vsBasis: Object.keys(basisSet).join('+') || null,
        percentile: percentile
      };
    }).filter(function (x) { return x.rate !== null; });
  }

  /* 单科序列（升序） */
  function subjectSeries(exams, key) {
    return sortExams(exams).map(function (e) {
      var sr = (e.subjects || []).find(function (s) { return s.key === key; });
      if (!sr) return null;
      var rate = subjRate(sr);
      if (rate === null) return null;
      var v = vsAvgOf(sr);
      return { exam: e, sr: sr, rate: rate, vsAvg: v ? v.diff : null, vsBasis: v ? v.basis : null, percentile: percentileOf(sr.rank, sr.rankSize) };
    }).filter(Boolean);
  }

  /* ---------- 趋势（最小二乘斜率，单位：得分率/次） ---------- */
  function slope(values) {
    var n = values.length;
    if (n < 2) return null;
    var sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (var i = 0; i < n; i++) {
      sx += i; sy += values[i]; sxy += i * values[i]; sxx += i * i;
    }
    var den = n * sxx - sx * sx;
    if (!den) return 0;
    return (n * sxy - sx * sy) / den;
  }

  function trendLabel(s) {
    if (s === null || s === undefined) return { label: '数据不足', cls: 'muted' };
    if (s >= 0.03) return { label: '强上升', cls: 'up' };
    if (s >= 0.012) return { label: '上升', cls: 'up' };
    if (s <= -0.03) return { label: '强下滑', cls: 'down' };
    if (s <= -0.012) return { label: '下滑', cls: 'down' };
    return { label: '平稳', cls: 'flat' };
  }

  /* 近期斜率（最后 k 个点），用于拐点判断 */
  function recentSlope(values, k) {
    if (values.length < 3) return null;
    return slope(values.slice(-k));
  }

  /* ---------- 波动 ---------- */
  function stdev(values) {
    var n = values.length;
    if (n < 2) return null;
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / n;
    var v = values.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / (n - 1);
    return Math.sqrt(v);
  }

  function volatilityLabel(std) {
    if (std === null) return { label: '样本不足', cls: 'muted' };
    if (std < 0.02) return { label: '很稳定', cls: 'up' };
    if (std < 0.045) return { label: '基本稳定', cls: 'flat' };
    return { label: '波动大', cls: 'down' };
  }

  /* ---------- 偏科（单科均值得分率 − 个人总分均值得分率） ---------- */
  function imbalance(exams, subjects) {
    var os = overallSeries(exams);
    if (!os.length) return { overallMean: null, items: [] };
    var overallMean = os.reduce(function (a, b) { return a + b.rate; }, 0) / os.length;
    var items = subjects.map(function (sub) {
      var ss = subjectSeries(exams, sub.key);
      if (ss.length < 1) return null;
      var mean = ss.reduce(function (a, b) { return a + b.rate; }, 0) / ss.length;
      var delta = mean - overallMean;
      var tag = delta >= 0.08 ? 'strong' : (delta <= -0.08 ? 'weak' : 'mid');
      return { key: sub.key, name: sub.name, mean: mean, count: ss.length, delta: delta, tag: tag, slope: slope(ss.map(function (x) { return x.rate; })) };
    }).filter(Boolean);
    return { overallMean: overallMean, items: items };
  }

  /* ---------- 环比贡献度（上一场 → 本场） ----------
     各科贡献 = 该科满分占比 × (本次得分率 − 上次得分率)，单位：总得分率百分点 */
  function contribution(prevExam, currExam, subjects) {
    var items = [], dFull = 0;
    (currExam.subjects || []).forEach(function (cs) {
      if (cs.score === null) return;
      var ps = (prevExam.subjects || []).find(function (s) { return s.key === cs.key && s.score !== null; });
      if (!ps) return;
      var name = window.GIStore.subjectName(subjects, cs.key);
      var r2 = cs.score / cs.full, r1 = ps.score / ps.full;
      items.push({ key: cs.key, name: name, delta: r2 - r1, full: cs.full });
      dFull += cs.full;
    });
    if (!dFull) return { items: [], total: 0 };
    items.forEach(function (it) { it.contrib = (it.full / dFull) * it.delta; });
    items.sort(function (a, b) { return b.contrib - a.contrib; });
    return { items: items, total: items.reduce(function (a, b) { return a + b.contrib; }, 0) };
  }

  /* ---------- 里程碑：首考 vs 最近一次 ---------- */
  function milestone(exams, subjects) {
    var os = overallSeries(exams);
    if (os.length < 2) return null;
    var first = os[0], last = os[os.length - 1];
    var per = [];
    subjects.forEach(function (sub) {
      var f = (first.exam.subjects || []).find(function (s) { return s.key === sub.key && s.score !== null; });
      var l = (last.exam.subjects || []).find(function (s) { return s.key === sub.key && s.score !== null; });
      if (f && l) {
        per.push({ name: sub.name, delta: (l.score / l.full) - (f.score / f.full) });
      }
    });
    per.sort(function (a, b) { return b.delta - a.delta; });
    return {
      first: first, last: last,
      overallDelta: last.rate - first.rate,
      per: per,
      sameScope: first.exam.subjects.length === last.exam.subjects.length
    };
  }

  /* ---------- 目标推演 ---------- */
  function target(state, os) {
    var t = state.student.targetRate;
    if (!os.length) return null;
    var last = os[os.length - 1];
    var s = slope(os.map(function (x) { return x.rate; }));
    var gap = t - last.rate;
    var res = {
      target: t, current: last.rate, gap: gap, slope: s,
      examsNeeded: null, projection: null
    };
    if (gap <= 0) {
      res.projection = '已达标（高出目标 ' + pp(-gap) + ' 个百分点），可将目标上调一档或转入巩固节奏';
    } else if (s !== null && s > 0.004) {
      res.examsNeeded = Math.ceil(gap / s);
      res.projection = '按当前趋势（每次约 ' + pp(s) + ' 个百分点）推算，约再考 ' + res.examsNeeded + ' 次同规模进步可触及目标';
    } else if (s !== null && s < -0.004) {
      res.projection = '当前趋势向下，靠自然外推无法达线，需要先扭转趋势';
    } else {
      res.projection = '近期基本走平，需要新的提分动作才能缩小差距';
    }
    return res;
  }

  /* ---------- 提分优先级 ---------- */
  function priorities(exams, state) {
    var t = state.student.targetRate;
    var im = imbalance(exams, state.subjects);
    var list = im.items.filter(function (it) { return it.count >= 2; }).map(function (it) {
      var space = Math.max(0, t - it.mean);
      var weight = it.slope !== null && it.slope < -0.008 ? 1.3 : 1;
      return { name: it.name, key: it.key, mean: it.mean, space: space, slope: it.slope, score: space * weight };
    }).filter(function (it) { return it.space > 0.02; });
    list.sort(function (a, b) { return b.score - a.score; });
    return list.slice(0, 3);
  }

  /* ---------- 异常检测：总分或单科单次骤变 > 5 个百分点 ---------- */
  function anomalies(exams, subjects) {
    var os = overallSeries(exams);
    var out = [];
    for (var i = 1; i < os.length; i++) {
      var d = os[i].rate - os[i - 1].rate;
      if (Math.abs(d) > 0.05) {
        out.push({
          exam: os[i].exam,
          dir: d > 0 ? 'up' : 'down',
          text: '「' + os[i].exam.name + '」总分得分率较上次' + (d > 0 ? '跃升' : '骤降') + ' ' + Math.abs(d * 100).toFixed(1) + ' 个百分点'
        });
      }
    }
    /* 单科级骤变（数学这类单科失常总分未必过阈值，必须单独抓） */
    subjects.forEach(function (sub) {
      var ss = subjectSeries(exams, sub.key);
      for (var j = 1; j < ss.length; j++) {
        var ds = ss[j].rate - ss[j - 1].rate;
        if (Math.abs(ds) > 0.05) {
          out.push({
            exam: ss[j].exam,
            dir: ds > 0 ? 'up' : 'down',
            text: '「' + ss[j].exam.name + '」' + sub.name + '得分率较上次' + (ds > 0 ? '跃升' : '骤降') + ' ' + Math.abs(ds * 100).toFixed(1) + ' 个百分点'
          });
        }
      }
    });
    /* 按考试时间排序，保证简报引用顺序稳定 */
    out.sort(function (a, b) { return a.exam.date < b.exam.date ? -1 : 1; });
    return out;
  }

  /* ---------- 智能简报 ---------- */
  function briefing(state) {
    var exams = sortExams(state.exams);
    var os = overallSeries(state.exams);
    var L = [];
    var insufficient = exams.length < 3;

    if (!exams.length) {
      return { text: '还没有考试记录。先到「录入」添加第一场考试，系统会自动生成趋势、偏科、目标差距等分析。', insufficient: true };
    }

    var first = exams[0], last = exams[exams.length - 1];
    var lastAgg = os[os.length - 1].agg;

    L.push('【基本盘】');
    L.push('· 已记录 ' + exams.length + ' 场考试（' + first.date + ' ~ ' + last.date + '）。');
    if (lastAgg) {
      L.push('· 最近一次「' + last.name + '」（' + last.date + '，' + last.type + '）：计分 ' + lastAgg.count + ' 科，总得分率 ' + pct(lastAgg.rate) + '。');
      if (last.totalRank !== null && last.totalRank !== undefined) {
        L.push('· 总分年级排名 ' + last.totalRank + (last.totalRankSize ? ' / ' + last.totalRankSize : '') + '（前 ' + (100 - (percentileOf(last.totalRank, last.totalRankSize) || 0)).toFixed(1) + '%）。');
      }
      if (lastAgg.missing.length) {
        L.push('· 注：本次有 ' + lastAgg.missing.length + ' 科未计入（未考/缺考），得分率口径为已考科目。');
      }
    }

    if (insufficient) {
      L.push('');
      L.push('【说明】记录还不足 3 场，趋势与偏科结论暂不给出。建议按「月考/期中期末」节奏持续录入，数据越全，分析越准。');
      return { text: L.join('\n'), insufficient: true };
    }

    /* 总体趋势 */
    var rates = os.map(function (x) { return x.rate; });
    var s = slope(rates);
    var tl = trendLabel(s);
    var rs = recentSlope(rates, 3);
    L.push('');
    L.push('【总体趋势】' + tl.label + '（平均每次 ' + (s >= 0 ? '+' : '') + (s * 100).toFixed(1) + ' 个百分点）');
    if (rs !== null && s !== null && rs * s < 0) {
      var rtl = trendLabel(rs);
      L.push('· ⚠ 近 3 次出现拐点：近期呈「' + rtl.label + '」，与长期趋势相反，值得注意。');
    }

    /* 排名口径变化提醒 */
    var lastTwo = exams.slice(-2);
    if (lastTwo.length === 2 && lastTwo[0].totalRankSize && lastTwo[1].totalRankSize && lastTwo[0].totalRankSize !== lastTwo[1].totalRankSize) {
      L.push('· 注：最近两次排名分母不同（' + lastTwo[0].totalRankSize + ' 人 → ' + lastTwo[1].totalRankSize + ' 人），排名请结合百分位看。');
    }

    /* 相对年级位置（跑赢大盘） */
    var vsVals = os.filter(function (x) { return x.vsAvg !== null; });
    if (vsVals.length >= 3) {
      var vsSlope = slope(vsVals.map(function (x) { return x.vsAvg; }));
      var lastVs = vsVals[vsVals.length - 1];
      var vtl = trendLabel(vsSlope);
      L.push('');
      L.push('【相对年级位置】（对比' + (lastVs.vsBasis || '年级') + '均分）');
      L.push('· 最近一次总得分率高出' + (lastVs.vsBasis || '年级') + '均分 ' + pp(lastVs.vsAvg) + ' 个百分点，长期走势：' + vtl.label + '。');
      if (vsSlope >= 0.012) L.push('· 正在跑赢大盘：与均分的差距持续扩大，状态向好。');
      else if (vsSlope <= -0.012) L.push('· 正在跑输大盘：与均分的差距在收窄甚至反超不了，要警惕是整体难度还是自身问题。');
    }

    /* 学科结构：强科 / 弱科 / 波动 / 进退步 */
    var im = imbalance(state.exams, state.subjects);
    var strong = im.items.filter(function (x) { return x.tag === 'strong' && x.count >= 2; }).sort(function (a, b) { return b.delta - a.delta; });
    var weak = im.items.filter(function (x) { return x.tag === 'weak' && x.count >= 2; }).sort(function (a, b) { return a.delta - b.delta; });
    L.push('');
    L.push('【学科结构】（个人总分均值得分率 ' + pct(im.overallMean) + ' 为基准）');
    if (strong.length) {
      L.push('· 优势学科：' + strong.slice(0, 2).map(function (x) { return x.name + '（' + pct(x.mean) + '，高均值 ' + pp(x.delta) + '）'; }).join('、') + '。');
    }
    if (weak.length) {
      L.push('· 短板学科：' + weak.slice(0, 2).map(function (x) { return x.name + '（' + pct(x.mean) + '，低均值 ' + pp(x.delta) + '）'; }).join('、') + '，是总分的主要失分面。');
    }
    if (!strong.length && !weak.length) L.push('· 各科得分率较均衡，无明显偏科。');

    /* 波动 & 进退步 */
    var volList = im.items.filter(function (x) { return x.count >= 3; }).map(function (x) {
      var ss = subjectSeries(state.exams, x.key);
      return { name: x.name, std: stdev(ss.map(function (y) { return y.rate; })) };
    }).filter(function (x) { return x.std !== null; }).sort(function (a, b) { return b.std - a.std; });
    if (volList.length && volList[0].std > 0.045) {
      L.push('· 成绩最不稳定的是「' + volList[0].name + '」（近几次得分率起伏 ±' + (volList[0].std * 100).toFixed(1) + ' 个百分点），建议排查是知识漏洞还是考试状态。');
    }
    var slopeList = im.items.filter(function (x) { return x.count >= 3 && x.slope !== null; });
    if (slopeList.length >= 2) {
      var best = slopeList.slice().sort(function (a, b) { return b.slope - a.slope; })[0];
      var worst = slopeList.slice().sort(function (a, b) { return a.slope - b.slope; })[0];
      if (best.slope > 0.008) L.push('· 进步最快：' + best.name + '（每次约 ' + pp(best.slope) + '），势头可以复制到其他学科。');
      if (worst.slope < -0.008) L.push('· 连续走低：' + worst.name + '（每次约 ' + pp(worst.slope) + '），建议尽快定位丢分章节。');
    }

    /* 最近一次环比贡献 */
    if (exams.length >= 2) {
      var ctb = contribution(exams[exams.length - 2], exams[exams.length - 1], state.subjects);
      if (ctb.items.length) {
        L.push('');
        L.push('【最近一次拆解】（较「' + exams[exams.length - 2].name + '」）');
        var top = ctb.items[0], bot = ctb.items[ctb.items.length - 1];
        if (top.contrib > 0.003) L.push('· 拉分最多：' + top.name + '（贡献 ' + pp(top.contrib) + ' 个百分点）。');
        if (bot.contrib < -0.003) L.push('· 拖累最大：' + bot.name + '（贡献 ' + pp(bot.contrib) + ' 个百分点）。');
        if (top.contrib <= 0.003 && bot.contrib >= -0.003) L.push('· 各科变化不大，整体平稳。');
      }
    }

    /* 里程碑 */
    var ms = milestone(state.exams, state.subjects);
    if (ms) {
      L.push('');
      L.push('【对比首考「' + ms.first.exam.name + '」】总得分率 ' + (ms.overallDelta >= 0 ? '提升 ' : '变化 ') + pp(ms.overallDelta) + ' 个百分点。');
      if (ms.per.length) {
        var up1 = ms.per[0], down1 = ms.per[ms.per.length - 1];
        if (up1.delta > 0.01) L.push('· 进步最大：' + up1.name + '（' + pp(up1.delta) + '）。');
        if (down1.delta < -0.01) L.push('· 落后最多：' + down1.name + '（' + pp(down1.delta) + '）。');
      }
      if (!ms.sameScope) L.push('· 注：首考与最近一次的科目范围不同（如选科分班），对比仅供参考。');
    }

    /* 目标推演 */
    var tg = target(state, os);
    if (tg) {
      L.push('');
      L.push('【目标推演】高考目标总得分率 ' + pct(tg.target) + '，当前 ' + pct(tg.current) + '，差距 ' + (tg.gap > 0 ? pp(tg.gap) : 0) + ' 个百分点。' + (tg.projection || ''));
    }

    /* 提分优先级 */
    var pri = priorities(state.exams, state);
    if (pri.length) {
      L.push('');
      L.push('【提分优先级】');
      pri.forEach(function (p, i) {
        var why = p.slope !== null && p.slope < -0.008 ? '且趋势向下，优先止损' : '提升空间最大';
        L.push('· 第' + (i + 1) + '优先：' + p.name + '（均值 ' + pct(p.mean) + '，距目标 ' + pp(p.space) + '，' + why + '）。');
      });
    }

    /* 异常 */
    var an = anomalies(state.exams, state.subjects);
    if (an.length) {
      L.push('');
      L.push('【异常提示】');
      an.slice(-3).forEach(function (a) { L.push('· ' + a.text + '，建议核对试卷与状态。'); });
    }

    L.push('');
    L.push('—— 本简报由规则引擎基于得分率/排名百分位/相对均分三重归一生成，趋势外推仅供参考。可一键复制后发给 AI 做更深入的个性化分析。');

    return { text: L.join('\n'), insufficient: false };
  }

  /* ---------- 暴露 ---------- */
  window.GIAnalysis = {
    pct: pct,
    pp: pp,
    fmtDate: fmtDate,
    sortExams: sortExams,
    examAgg: examAgg,
    subjRate: subjRate,
    percentileOf: percentileOf,
    vsAvgOf: vsAvgOf,
    overallSeries: overallSeries,
    subjectSeries: subjectSeries,
    slope: slope,
    recentSlope: recentSlope,
    trendLabel: trendLabel,
    stdev: stdev,
    volatilityLabel: volatilityLabel,
    imbalance: imbalance,
    contribution: contribution,
    milestone: milestone,
    target: target,
    priorities: priorities,
    anomalies: anomalies,
    briefing: briefing
  };
})();
