/* ============================================================
   grade-insight · 应用层
   hash 路由（#overview/#trends/#subjects/#exams/#entry/#settings，
   可深链分享）+ 视图渲染 + 录入表单 + 弹层 + 导入导出。
   依赖顺序：data.js → store.js → analysis.js → charts.js → 本文件。
   ============================================================ */
(function () {
  'use strict';

  var A = window.GIAnalysis, S = window.GIStore, C = window.GICharts;
  var D = window.GI_DEFAULTS || {};

  /* ================= 通用 UI ================= */
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(okMsg || '已复制'); }
      catch (e) { toast('复制失败，请手动选择文本复制'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || '已复制'); }, fallback);
    } else { fallback(); }
  }

  /* ================= 路由 ================= */
  var ROUTES = ['overview', 'trends', 'subjects', 'exams', 'entry', 'settings'];
  var TAB_ICONS = { overview: '📊', trends: '📈', subjects: '🧭', exams: '📋', entry: '✏️', settings: '⚙️' };
  var TAB_NAMES = { overview: '总览', trends: '趋势', subjects: '科目', exams: '考试', entry: '录入', settings: '设置' };

  function parseRoute() {
    var h = (location.hash || '').replace(/^#/, '');
    return ROUTES.indexOf(h) >= 0 ? h : 'overview';
  }

  function navigate(route) {
    if (('#' + route) === location.hash) { onRoute(); }
    else { location.hash = '#' + route; }
  }

  function onRoute() {
    var r = parseRoute();
    document.querySelectorAll('.tabbar a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === r);
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.id === 'view-' + r);
    });
    window.scrollTo(0, 0);
    try {
      var renderers = {
        overview: renderOverview, trends: renderTrends, subjects: renderSubjects,
        exams: renderExams, entry: renderEntry, settings: renderSettings
      };
      renderers[r]();
    } catch (err) {
      toast('渲染出错：' + err.message);
      if (window.console) console.error(err);
    }
  }

  /* ================= 公共片段 ================= */
  function bannersHtml(state) {
    var html = '';
    if (state.isSample && state.exams.length) {
      html += '<div class="banner info"><span>🧪 当前展示的是<b>内置示例数据</b>（演示学生），功能体验完好。</span>' +
        '<span><button class="btn small" id="bnClearSample">清空示例，开始录入</button></span></div>';
    }
    if (S.backupNeeded(state)) {
      html += '<div class="banner"><span>💾 距上次导出已超过 14 天且数据有改动，建议到「设置」导出一份 data.js 快照备份。</span>' +
        '<span><button class="btn small" id="bnGoSettings">去导出</button></span></div>';
    }
    return html;
  }

  function bindBanners() {
    var b1 = document.getElementById('bnClearSample');
    if (b1) b1.addEventListener('click', function () {
      if (confirm('清空示例数据并开始空白档案？')) { S.clearAll(); toast('已清空，开始记录真实成绩吧'); onRoute(); }
    });
    var b2 = document.getElementById('bnGoSettings');
    if (b2) b2.addEventListener('click', function () { navigate('settings'); });
  }

  function emptyHtml(icon, text, actRoute, actText) {
    return '<div class="empty-state"><div class="es-ico">' + icon + '</div><div>' + text + '</div>' +
      (actRoute ? '<div class="es-act"><button class="btn primary" data-go="' + actRoute + '">' + actText + '</button></div>' : '') +
      '</div>';
  }

  function bindGoButtons(container) {
    container.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { navigate(b.getAttribute('data-go')); });
    });
  }

  /* ================= 视图 1：总览 ================= */
  function renderOverview() {
    var el = document.getElementById('view-overview');
    var state = S.load();
    var os = A.overallSeries(state.exams);
    var html = bannersHtml(state);

    if (!state.exams.length) {
      el.innerHTML = html + emptyHtml('📊', '还没有考试记录。<br>从「录入」开始，每次考完花一分钟，趋势/偏科/目标差距全自动生成。', 'entry', '＋ 录入第一场考试');
      bindGoButtons(el); bindBanners();
      return;
    }

    var last = os[os.length - 1];
    var rates = os.map(function (x) { return x.rate; });
    var s = A.slope(rates);
    var tl = A.trendLabel(s);

    /* KPI：最近得分率 / 排名百分位 / 趋势 / 距目标 */
    var lastRanked = null;
    for (var i = os.length - 1; i >= 0; i--) {
      if (os[i].percentile !== null) { lastRanked = os[i]; break; }
    }
    var gap = state.student.targetRate - last.rate;
    html +=
      '<div class="kpi-grid">' +
      '<div class="kpi"><div class="kpi-value">' + A.pct(last.rate) + '</div><div class="kpi-label">最近总得分率</div><div class="kpi-extra">' + esc(last.exam.name) + '</div></div>' +
      '<div class="kpi"><div class="kpi-value">' + (lastRanked ? A.percentileOf(lastRanked.exam.totalRank, lastRanked.exam.totalRankSize).toFixed(1) + '%' : '—') + '</div><div class="kpi-label">总分排名百分位</div><div class="kpi-extra">' + (lastRanked ? esc(lastRanked.exam.name) + '：' + lastRanked.exam.totalRank + '/' + lastRanked.exam.totalRankSize : '录入总分排名后显示') + '</div></div>' +
      '<div class="kpi"><div class="kpi-value ' + (tl.cls === 'up' ? 'up' : tl.cls === 'down' ? 'down' : '') + '">' + tl.label + '</div><div class="kpi-label">总体趋势</div><div class="kpi-extra">' + (s === null ? '样本不足' : '平均每次 ' + A.pp(s) + ' pp') + '</div></div>' +
      '<div class="kpi"><div class="kpi-value ' + (gap <= 0 ? 'up' : '') + '">' + (gap <= 0 ? '已达标' : A.pp(-gap) + ' pp') + '</div><div class="kpi-label">距高考目标 ' + A.pct(state.student.targetRate) + '</div><div class="kpi-extra">目标在「设置」中可调</div></div>' +
      '</div>';

    /* 智能简报 */
    var br = A.briefing(state);
    html += '<div class="card"><h3><span class="h-ico">🤖</span>智能简报</h3>' +
      '<div class="briefing-text" id="briefText">' + esc(br.text) + '</div>' +
      '<div class="btn-row"><button class="btn small primary" id="btnCopyBrief">📋 一键复制简报</button>' +
      '<button class="btn small" data-go="trends">查看趋势图</button></div>' +
      '<div class="briefing-foot">简报随每次录入自动更新；复制后可粘贴给任意 AI 助手做更深入的个性化分析。</div></div>';

    /* 迷你趋势 + 强弱科 */
    var im = A.imbalance(state.exams, state.subjects);
    var strongTags = im.items.filter(function (x) { return x.tag === 'strong' && x.count >= 2; }).sort(function (a, b) { return b.delta - a.delta; }).slice(0, 3);
    var weakTags = im.items.filter(function (x) { return x.tag === 'weak' && x.count >= 2; }).sort(function (a, b) { return a.delta - b.delta; }).slice(0, 3);
    html += '<div class="card"><h3><span class="h-ico">📈</span>总得分率走势</h3><div class="chart-box" id="ovSpark"></div>' +
      '<div class="mt12"><span class="tag muted">最近 ' + os.length + ' 次走势</span> ' +
      (strongTags.length ? '<span class="tag strong">强科 ' + strongTags.map(function (x) { return esc(x.name); }).join('/') + '</span> ' : '') +
      (weakTags.length ? '<span class="tag weak">弱科 ' + weakTags.map(function (x) { return esc(x.name); }).join('/') + '</span>' : '') +
      '</div></div>';

    html += '<div class="card"><h3><span class="h-ico">🚀</span>快捷入口</h3><div class="btn-row" style="margin-top:4px">' +
      '<button class="btn" data-go="entry">✏️ 录入新成绩</button>' +
      '<button class="btn" data-go="subjects">🧭 学科诊断</button>' +
      '<button class="btn" data-go="exams">📋 考试列表</button></div></div>';

    el.innerHTML = html;
    bindGoButtons(el); bindBanners();
    var cb = document.getElementById('btnCopyBrief');
    if (cb) cb.addEventListener('click', function () { copyText(br.text, '简报已复制，可粘贴给 AI 深聊'); });

    C.spark('ovSpark', {
      xLabels: os.map(function (x) { return A.fmtDate(x.exam.date); }),
      data: rates
    });
  }

  /* ================= 视图 2：趋势 ================= */
  var trendFilterKey = 'all';
  var trendSubSel = {};   /* key -> true */

  function renderTrends() {
    var el = document.getElementById('view-trends');
    var state = S.load();
    var groups = (D.typeGroups || [{ key: 'all', name: '全部', types: null }]);
    var types = null;
    var g = groups.find(function (x) { return x.key === trendFilterKey; });
    if (g && g.types) types = g.types;
    var exams = A.sortExams(state.exams).filter(function (e) { return !types || types.indexOf(e.type) >= 0; });
    var os = A.overallSeries(exams);

    var html = bannersHtml(state);
    html += '<div class="card"><h3><span class="h-ico">📈</span>得分率趋势</h3>' +
      '<div class="card-desc">不同考试满分不同，全部按「得分率 = 得分 ÷ 满分」归一后比较。</div>' +
      '<div class="chips">' + groups.map(function (x) {
        return '<button class="chip' + (x.key === trendFilterKey ? ' active' : '') + '" data-gkey="' + x.key + '">' + esc(x.name) + '</button>';
      }).join('') + '</div>';

    if (os.length < 2) {
      html += emptyHtml('📈', '该筛选下考试不足 2 场，先积累数据或切换筛选。');
      el.innerHTML = html; bindBanners();
      el.querySelectorAll('.chip').forEach(function (c) {
        c.addEventListener('click', function () { trendFilterKey = c.getAttribute('data-gkey'); renderTrends(); });
      });
      return;
    }

    /* 分科开关 */
    var subjectsWithData = state.subjects.filter(function (sub) {
      var n = 0;
      exams.forEach(function (e) {
        var sr = e.subjects.find(function (s) { return s.key === sub.key; });
        if (sr && sr.score !== null) n++;
      });
      return n >= 2;
    });
    html += '<div class="chips">' + subjectsWithData.map(function (sub) {
      return '<button class="chip' + (trendSubSel[sub.key] ? ' active' : '') + '" data-subkey="' + sub.key + '">' + esc(sub.name) + '</button>';
    }).join('') + '</div>';

    html += '<div class="chart-box tall" id="trLine"></div>' +
      '<div class="small-note mt8">提示：横轴为考试日期，点击图例可显示/隐藏科目；柱状对比图见下方。</div></div>';

    /* 相对均分差 */
    html += '<div class="card"><h3><span class="h-ico">🎯</span>相对年级位置</h3>' +
      '<div class="card-desc">个人总得分率 − 年级均分得分率（单位：百分点）。柱子越高 = 越领先年级；趋势向上 = 在跑赢大盘。</div>' +
      '<div class="chart-box" id="trBar"></div></div>';

    el.innerHTML = html;
    bindBanners();
    el.querySelectorAll('.chip[data-gkey]').forEach(function (c) {
      c.addEventListener('click', function () { trendFilterKey = c.getAttribute('data-gkey'); renderTrends(); });
    });
    el.querySelectorAll('.chip[data-subkey]').forEach(function (c) {
      c.addEventListener('click', function () {
        var k = c.getAttribute('data-subkey');
        trendSubSel[k] = !trendSubSel[k];
        renderTrends();
      });
    });

    var xLabels = os.map(function (x) { return A.fmtDate(x.exam.date); });
    var series = [{ name: '总分', data: os.map(function (x) { return x.rate; }) }];
    subjectsWithData.forEach(function (sub) {
      if (!trendSubSel[sub.key]) return;
      var ss = A.subjectSeries(exams, sub.key);
      series.push({ name: sub.name, data: xLabels.map(function (d, i) {
        var pt = ss.find(function (p) { return A.fmtDate(p.exam.date) === d; });
        return pt ? pt.rate : null;
      }) });
    });
    C.line('trLine', { xLabels: xLabels, series: series, zoom: true });
    C.barDiff('trBar', {
      xLabels: xLabels,
      data: os.map(function (x) { return x.vsAvg; }),
      name: '总得分率差'
    });
  }

  /* ================= 视图 3：科目 ================= */
  function renderSubjects() {
    var el = document.getElementById('view-subjects');
    var state = S.load();
    var html = bannersHtml(state);

    var os = A.overallSeries(state.exams);
    if (os.length < 2) {
      el.innerHTML = html + emptyHtml('🧭', '考试不足 2 场，暂无法做学科诊断。', 'entry', '去录入');
      bindGoButtons(el); bindBanners();
      return;
    }

    var im = A.imbalance(state.exams, state.subjects);

    /* 雷达：最近一次 vs 个人均值 */
    var last = os[os.length - 1];
    var inds = [], latestVals = [], meanVals = [];
    state.subjects.forEach(function (sub) {
      var sr = last.exam.subjects.find(function (s) { return s.key === sub.key && s.score !== null; });
      var it = im.items.find(function (x) { return x.key === sub.key && x.count >= 1; });
      if (sr && it) {
        inds.push({ name: sub.name, max: 1 });
        latestVals.push(A.subjRate(sr));
        meanVals.push(it.mean);
      }
    });
    html += '<div class="card"><h3><span class="h-ico">🕸️</span>学科雷达</h3>' +
      '<div class="card-desc">蓝色 = 最近一次「' + esc(last.exam.name) + '」，黄色 = 个人历史均值。凹进去的边就是短板方向。</div>' +
      '<div class="chart-box tall" id="sbRadar"></div></div>';

    /* 单科走势小图 */
    var sparkCards = '';
    var colors = C.PALETTE;
    var idx = 0;
    state.subjects.forEach(function (sub) {
      var ss = A.subjectSeries(state.exams, sub.key);
      if (ss.length < 2) return;
      var s = A.slope(ss.map(function (x) { return x.rate; }));
      var tl = A.trendLabel(s);
      var std = A.stdev(ss.map(function (x) { return x.rate; }));
      var vl = A.volatilityLabel(std);
      sparkCards += '<div class="card" style="margin-bottom:10px;padding:12px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">' +
        '<b>' + esc(sub.name) + '</b>' +
        '<span><span class="tag ' + tl.cls + '">' + tl.label + '</span> <span class="tag ' + vl.cls + '">' + vl.label + '</span> <span class="tag muted">均值 ' + A.pct(im.items.find(function (x) { return x.key === sub.key; }).mean) + '</span></span>' +
        '</div>' +
        '<div class="chart-box spark" id="sp_' + esc(sub.key) + '"></div></div>';
    });
    if (sparkCards) {
      html += '<h3 style="margin:6px 0 10px;font-size:16px">📚 单科走势</h3>' + sparkCards;
    } else {
      html += '<p class="muted mt8">暂无足够数据的科目（每科至少 2 次记录）</p>';
    }

    /* 三个榜 */
    var volList = im.items.filter(function (x) { return x.count >= 3; }).map(function (x) {
      var ss = A.subjectSeries(state.exams, x.key);
      return { name: x.name, std: A.stdev(ss.map(function (y) { return y.rate; })), label: A.volatilityLabel(A.stdev(ss.map(function (y) { return y.rate; }))) };
    }).filter(function (x) { return x.std !== null; }).sort(function (a, b) { return b.std - a.std; }).slice(0, 5);

    var slopeList = im.items.filter(function (x) { return x.count >= 3 && x.slope !== null; }).sort(function (a, b) { return b.slope - a.slope; });
    var progTop = slopeList.slice(0, 3), progBottom = slopeList.slice(-3).reverse();

    html += '<div class="card"><h3><span class="h-ico">⚖️</span>偏科诊断（基准：个人总均值 ' + A.pct(im.overallMean) + '）</h3><div class="rank-list">';
    var sorted = im.items.filter(function (x) { return x.count >= 2; }).sort(function (a, b) { return b.delta - a.delta; });
    if (!sorted.length) html += '<div class="muted">暂无数据</div>';
    sorted.forEach(function (x, i) {
      html += '<div class="rank-item"><span class="ri-idx">' + (i + 1) + '</span><span class="ri-name">' + esc(x.name) +
        ' <span class="muted small-note">均值 ' + A.pct(x.mean) + '</span></span>' +
        '<span class="ri-val ' + (x.delta >= 0 ? 'text-up' : 'text-down') + '">' + A.pp(x.delta) + ' pp</span>' +
        '<span class="tag ' + (x.tag === 'strong' ? 'strong' : x.tag === 'weak' ? 'weak' : 'muted') + '">' + (x.tag === 'strong' ? '强科' : x.tag === 'weak' ? '弱科' : '均衡') + '</span></div>';
    });
    html += '</div></div>';

    html += '<div class="card"><h3><span class="h-ico">🌊</span>稳定性榜（起伏最大 Top5）</h3><div class="rank-list">';
    if (!volList.length) html += '<div class="muted">样本不足</div>';
    volList.forEach(function (x, i) {
      html += '<div class="rank-item"><span class="ri-idx">' + (i + 1) + '</span><span class="ri-name">' + esc(x.name) + '</span>' +
        '<span class="ri-val">±' + (x.std * 100).toFixed(1) + ' pp</span><span class="tag ' + x.label.cls + '">' + x.label.label + '</span></div>';
    });
    html += '</div></div>';

    html += '<div class="card"><h3><span class="h-ico">🏁</span>进退步榜（斜率）</h3><div class="rank-list">';
    if (!slopeList.length) html += '<div class="muted">样本不足</div>';
    progTop.forEach(function (x) {
      if (x.slope > 0.004) html += '<div class="rank-item"><span class="ri-idx">↑</span><span class="ri-name">' + esc(x.name) + '</span><span class="ri-val text-up">每次 ' + A.pp(x.slope) + ' pp</span></div>';
    });
    progBottom.forEach(function (x) {
      if (x.slope < -0.004) html += '<div class="rank-item"><span class="ri-idx">↓</span><span class="ri-name">' + esc(x.name) + '</span><span class="ri-val text-down">每次 ' + A.pp(x.slope) + ' pp</span></div>';
    });
    if (!progTop.some(function (x) { return x.slope > 0.004; }) && !progBottom.some(function (x) { return x.slope < -0.004; })) {
      html += '<div class="muted">各科趋势平稳</div>';
    }
    html += '</div></div>';

    el.innerHTML = html;
    bindBanners();

    if (inds.length >= 3) {
      C.radar('sbRadar', {
        indicators: inds,
        series: [
          { name: '最近一次', values: latestVals },
          { name: '个人均值', values: meanVals }
        ]
      });
    } else {
      var rEl = document.getElementById('sbRadar');
      if (rEl) rEl.innerHTML = '<div class="empty-state" style="padding:30px 10px">最近一次可考科目不足 3 科，暂不绘制雷达</div>';
    }
    state.subjects.forEach(function (sub, i) {
      var ss = A.subjectSeries(state.exams, sub.key);
      if (ss.length < 2) return;
      C.sparkSub('sp_' + sub.key, {
        xLabels: ss.map(function (x) { return A.fmtDate(x.exam.date); }),
        data: ss.map(function (x) { return x.rate; }),
        color: colors[i % colors.length]
      });
    });
  }

  /* ================= 视图 4：考试列表 + 弹层 ================= */
  function renderExams() {
    var el = document.getElementById('view-exams');
    var state = S.load();
    var html = bannersHtml(state);
    var os = A.overallSeries(state.exams);
    var desc = os.slice().reverse();

    if (!desc.length) {
      el.innerHTML = html + emptyHtml('📋', '还没有考试记录。', 'entry', '＋ 录入第一场考试');
      bindGoButtons(el); bindBanners();
      return;
    }

    html += '<div class="card-desc dim" style="margin-bottom:10px">共 ' + desc.length + ' 场 · 点击卡片看明细与环比拆解</div>';
    desc.forEach(function (o, i) {
      var e = o.exam;
      var prev = desc[i + 1];   /* desc 中后一个即时间上一场 */
      var d = prev ? o.rate - prev.rate : null;
      html += '<div class="exam-item" data-eid="' + esc(e.id) + '">' +
        '<div class="ei-top"><span class="ei-name">' + esc(e.name) + '</span><span class="ei-date">' + e.date + '</span></div>' +
        '<div class="ei-tags"><span class="tag type">' + esc(e.type) + '</span>' + (e.term ? '<span class="tag">' + esc(e.term) + '</span>' : '') +
        '<span class="tag muted">' + o.agg.count + ' 科计分</span></div>' +
        '<div class="ei-stats"><span>总得分率 <b>' + A.pct(o.rate) + '</b></span>' +
        (e.totalRank !== null && e.totalRank !== undefined ? '<span>年级排名 <b>' + e.totalRank + (e.totalRankSize ? '/' + e.totalRankSize : '') + '</b></span>' : '') +
        (d !== null ? '<span>较上次 <b class="' + (d >= 0 ? 'text-up' : 'text-down') + '">' + A.pp(d) + ' pp</b></span>' : '') +
        '</div></div>';
    });

    el.innerHTML = html;
    bindBanners();
    el.querySelectorAll('.exam-item').forEach(function (item) {
      item.addEventListener('click', function () { openExamModal(item.getAttribute('data-eid')); });
    });
  }

  function subjName(subjects, key) {
    return S.subjectName(subjects, key);
  }

  function openExamModal(id) {
    var state = S.load();
    var e = S.getExam(id);
    if (!e) { toast('记录不存在'); return; }
    var os = A.overallSeries(state.exams);
    var oi = null, oiIdx = -1;
    os.forEach(function (o, i) { if (o.exam.id === id) { oi = o; oiIdx = i; } });
    var prev = oiIdx > 0 ? os[oiIdx - 1] : null;

    var html = '<div class="modal-head"><div><h3>' + esc(e.name) + '</h3>' +
      '<div class="modal-sub">' + e.date + ' · ' + esc(e.type) + (e.term ? ' · ' + esc(e.term) : '') + '</div></div>' +
      '<button class="modal-close" id="mdClose">✕</button></div>';

    if (e.note) html += '<div class="card" style="padding:10px 12px;margin-bottom:10px"><span class="dim">📝 ' + esc(e.note) + '</span></div>';

    html += '<div class="table-wrap"><table class="gi-table"><thead><tr>' +
      '<th>科目</th><th>得分/满分</th><th>得分率</th><th>年级均分</th><th>相对均分</th><th>年级排名</th></tr></thead><tbody>';
    e.subjects.forEach(function (sr) {
      var rate = A.subjRate(sr);
      var v = A.vsAvgOf(sr);
      var pctl = A.percentileOf(sr.rank, sr.rankSize);
      html += '<tr><td>' + esc(subjName(state.subjects, sr.key)) + (sr.level ? ' <span class="tag muted">' + esc(sr.level) + '</span>' : '') + '</td>' +
        '<td class="num">' + (sr.score === null ? '<span class="muted">缺考/未考</span>' : sr.score + ' / ' + sr.full) + '</td>' +
        '<td class="num">' + (rate === null ? '—' : A.pct(rate)) + '</td>' +
        '<td class="num">' + (sr.avgGrade !== null && sr.avgGrade !== undefined ? sr.avgGrade : (sr.avgClass !== null && sr.avgClass !== undefined ? '<span class="muted">班 ' + sr.avgClass + '</span>' : '—')) + '</td>' +
        '<td class="num">' + (v ? '<span class="' + (v.diff >= 0 ? 'text-up' : 'text-down') + '">' + A.pp(v.diff) + '</span><span class="muted small-note">(' + v.basis + ')</span>' : '—') + '</td>' +
        '<td class="num">' + (sr.rank !== null && sr.rank !== undefined ? sr.rank + (sr.rankSize ? '/' + sr.rankSize : '') + (pctl !== null ? ' <span class="muted small-note">前' + (100 - pctl).toFixed(0) + '%</span>' : '') : '—') + '</td></tr>';
    });
    html += '</tbody></table></div>';

    if (oi) {
      html += '<div class="mt12 dim">总分口径：计分 ' + oi.agg.count + ' 科，合计 ' + oi.agg.score + ' / ' + oi.agg.full + '，总得分率 <b class="num">' + A.pct(oi.rate) + '</b>' +
        (e.totalRank !== null && e.totalRank !== undefined ? '，总分排名 ' + e.totalRank + (e.totalRankSize ? '/' + e.totalRankSize : '') : '') + '</div>';
    }

    /* 环比拆解 */
    if (prev) {
      var ctb = A.contribution(prev.exam, e, state.subjects);
      html += '<hr class="divider"><h3 style="font-size:15px;margin-bottom:8px">🔍 环比拆解（较「' + esc(prev.exam.name) + '」）</h3>';
      if (ctb.items.length) {
        html += '<div class="rank-list">';
        ctb.items.forEach(function (it) {
          if (Math.abs(it.contrib) < 0.001 && Math.abs(it.delta) < 0.01) return;
          html += '<div class="rank-item"><span class="ri-name">' + esc(it.name) +
            '<span class="muted small-note"> 得分率 ' + (it.delta >= 0 ? '+' : '') + (it.delta * 100).toFixed(1) + ' pp</span></span>' +
            '<span class="ri-val ' + (it.contrib >= 0 ? 'text-up' : 'text-down') + '">对总分贡献 ' + A.pp(it.contrib) + ' pp</span></div>';
        });
        html += '</div><div class="small-note mt8">贡献 = 该科满分占比 × 得分率变化，单位为总得分率百分点。</div>';
      } else {
        html += '<div class="muted">两次考试没有共同计分科目，无法拆解。</div>';
      }
    }

    html += '<div class="btn-row"><button class="btn primary" id="mdEdit">✏️ 编辑</button>' +
      '<button class="btn danger" id="mdDel">🗑 删除</button></div>';

    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('active');

    document.getElementById('mdClose').addEventListener('click', closeModal);
    document.getElementById('mdEdit').addEventListener('click', function () { closeModal(); startEntry(id); });
    document.getElementById('mdDel').addEventListener('click', function () {
      if (confirm('确定删除「' + e.name + '」？该操作不可恢复（除非已导出备份）。')) {
        S.deleteExam(id);
        closeModal();
        toast('已删除');
        onRoute();
      }
    });
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
  }

  /* ================= 视图 5：录入 ================= */
  var editingId = null;
  var termTouched = false;

  function autoTerm(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return '';
    var y = parseInt(dateStr.slice(0, 4), 10);
    var m = parseInt(dateStr.slice(5, 7), 10);
    var ey = S.load().student.enrollYear || y;
    var sy = m >= 8 ? y : y - 1;
    var idx = sy - ey;
    if (idx < 0 || idx > 2) return '';
    return ['高一', '高二', '高三'][idx] + (m >= 8 ? '上' : '下');
  }

  function startEntry(id) {
    editingId = id || null;
    termTouched = !!id;
    navigate('entry');
  }

  function renderEntry() {
    var el = document.getElementById('view-entry');
    var state = S.load();
    var exam = editingId ? S.getExam(editingId) : null;
    if (editingId && !exam) { editingId = null; exam = null; }

    var today = new Date().toISOString().slice(0, 10);
    var types = (D.examTypes || ['月考', '期中', '期末']).concat(['其他']);
    var terms = (D.terms || []).slice();

    function srVal(key, field) {
      if (!exam) return '';
      var sr = exam.subjects.find(function (s) { return s.key === key; });
      if (!sr) return '';
      var v = sr[field];
      return (v === null || v === undefined) ? '' : v;
    }
    function srAbsent(key) {
      if (!exam) return false;
      var sr = exam.subjects.find(function (s) { return s.key === key; });
      return !sr || sr.score === null;
    }

    var rows = '';
    state.subjects.forEach(function (sub) {
      var absent = exam ? srAbsent(sub.key) : false;
      rows += '<div class="subject-row' + (absent ? ' absent' : '') + '" data-key="' + esc(sub.key) + '">' +
        '<div class="sr-head">' +
        '<span class="sr-name">' + esc(sub.name) + '</span>' +
        '<span class="sr-score"><input class="gi-input sr-score-in" type="number" step="any" inputmode="decimal" placeholder="得分" value="' + (absent ? '' : esc(srVal(sub.key, 'score'))) + '">' +
        '<span class="sr-slash">/</span>' +
        '<input class="gi-input sr-full-in" type="number" step="any" inputmode="decimal" placeholder="满分" value="' + esc(srVal(sub.key, 'full') || sub.full) + '"></span>' +
        '<label class="sr-absent"><input type="checkbox" class="sr-absent-in"' + (absent ? ' checked' : '') + '>缺考</label>' +
        '</div>' +
        '<details><summary>排名 / 均分（选填）</summary><div class="form-4col">' +
        '<div class="form-row"><label>年级排名</label><input class="gi-input sr-rank-in" type="number" step="1" inputmode="numeric" value="' + esc(srVal(sub.key, 'rank')) + '"></div>' +
        '<div class="form-row"><label>年级人数</label><input class="gi-input sr-size-in" type="number" step="1" inputmode="numeric" value="' + esc(srVal(sub.key, 'rankSize')) + '"></div>' +
        '<div class="form-row"><label>年级均分</label><input class="gi-input sr-gavg-in" type="number" step="any" inputmode="decimal" value="' + esc(srVal(sub.key, 'avgGrade')) + '"></div>' +
        '<div class="form-row"><label>班级均分</label><input class="gi-input sr-cavg-in" type="number" step="any" inputmode="decimal" value="' + esc(srVal(sub.key, 'avgClass')) + '"></div>' +
        '</div></details></div>';
    });

    var html = '<div class="card"><h3><span class="h-ico">✏️</span>' + (exam ? '编辑考试' : '录入新考试') + '</h3>' +
      '<div class="card-desc">没考的科目保持「缺考」即可；满分默认取科目设置，每次考试可临时改（不同考试满分不同很正常，分析会自动归一）。</div>' +
      '<div class="form-grid">' +
      '<div class="form-2col">' +
      '<div class="form-row"><label class="req">考试性质</label><select class="gi-input" id="fType">' +
      types.map(function (t) { return '<option' + (exam && exam.type === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-row"><label class="req">日期</label><input class="gi-input" id="fDate" type="date" value="' + (exam ? exam.date : today) + '"></div>' +
      '</div>' +
      '<div class="form-row"><label class="req">考试名称</label><input class="gi-input" id="fName" maxlength="40" placeholder="如：高二上第一次月考" value="' + (exam ? esc(exam.name) : '') + '"></div>' +
      '<div class="form-row"><label>所属学段（按日期自动推算，可改）</label><select class="gi-input" id="fTerm">' +
      '<option value="">— 自动 —</option>' +
      terms.map(function (t) { return '<option' + (exam && exam.term === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-row"><label>备注（考试范围 / 难度 / 赋分说明）</label><textarea class="gi-input" id="fNote" maxlength="200">' + (exam ? esc(exam.note) : '') + '</textarea></div>' +
      '</div></div>';

    html += '<div class="card"><h3><span class="h-ico">📝</span>各科成绩</h3><div class="subject-rows">' + rows + '</div></div>';

    html += '<div class="card"><details><summary style="font-size:15px;cursor:pointer;min-height:44px;display:flex;align-items:center">🏆 总分排名（选填）</summary>' +
      '<div class="form-3col mt12">' +
      '<div class="form-row"><label>总分年级排名</label><input class="gi-input" id="fTRank" type="number" step="1" inputmode="numeric" value="' + (exam && exam.totalRank !== null ? exam.totalRank : '') + '"></div>' +
      '<div class="form-row"><label>年级人数</label><input class="gi-input" id="fTRankSize" type="number" step="1" inputmode="numeric" value="' + (exam && exam.totalRankSize !== null ? exam.totalRankSize : '') + '"></div>' +
      '</div></details></div>';

    html += '<div class="btn-row"><button class="btn primary" id="fSave">💾 保存</button>' +
      '<button class="btn" id="fCancel">取消</button>' +
      (exam ? '<button class="btn danger" id="fDelete">🗑 删除本场</button>' : '') + '</div>';

    el.innerHTML = html;

    /* 交互绑定 */
    var dateIn = document.getElementById('fDate');
    var termIn = document.getElementById('fTerm');
    if (!exam) {
      dateIn.addEventListener('change', function () {
        if (!termTouched) termIn.value = autoTerm(dateIn.value);
      });
    }
    termIn.addEventListener('change', function () { termTouched = true; });

    el.querySelectorAll('.subject-row').forEach(function (row) {
      var absent = row.querySelector('.sr-absent-in');
      var scoreIn = row.querySelector('.sr-score-in');
      function sync() {
        row.classList.toggle('absent', absent.checked);
        scoreIn.disabled = absent.checked;
        if (absent.checked) scoreIn.value = '';
      }
      absent.addEventListener('change', sync);
      sync();
    });

    document.getElementById('fCancel').addEventListener('click', function () { navigate('exams'); });
    if (exam) {
      document.getElementById('fDelete').addEventListener('click', function () {
        if (confirm('确定删除「' + exam.name + '」？')) {
          S.deleteExam(exam.id);
          editingId = null;
          toast('已删除');
          navigate('exams');
        }
      });
    }
    document.getElementById('fSave').addEventListener('click', function () { saveEntryForm(state); });
  }

  function saveEntryForm(state) {
    var name = document.getElementById('fName').value.trim();
    var date = document.getElementById('fDate').value;
    var type = document.getElementById('fType').value;
    var term = document.getElementById('fTerm').value || autoTerm(date);
    var note = document.getElementById('fNote').value.trim();

    var subjects = [];
    var rowErr = null;
    document.querySelectorAll('#view-entry .subject-row').forEach(function (row) {
      var key = row.getAttribute('data-key');
      var absent = row.querySelector('.sr-absent-in').checked;
      var score = row.querySelector('.sr-score-in').value;
      var full = row.querySelector('.sr-full-in').value;
      var rank = row.querySelector('.sr-rank-in').value;
      var size = row.querySelector('.sr-size-in').value;
      var gavg = row.querySelector('.sr-gavg-in').value;
      var cavg = row.querySelector('.sr-cavg-in').value;
      subjects.push({
        key: key,
        full: full === '' ? null : parseFloat(full),
        score: (absent || score === '') ? null : parseFloat(score),
        avgGrade: gavg === '' ? null : parseFloat(gavg),
        avgClass: cavg === '' ? null : parseFloat(cavg),
        rank: rank === '' ? null : parseInt(rank, 10),
        rankSize: size === '' ? null : parseInt(size, 10)
      });
      if (!rowErr && !absent && score !== '' && (full === '' || parseFloat(full) <= 0)) {
        rowErr = '请为「' + S.subjectName(state.subjects, key) + '」填写有效满分';
      }
    });

    var exam = {
      id: editingId || S.makeExamId({ date: date, name: name }),
      name: name, date: date, type: type, term: term, note: note,
      subjects: subjects,
      totalRank: document.getElementById('fTRank').value === '' ? null : parseInt(document.getElementById('fTRank').value, 10),
      totalRankSize: document.getElementById('fTRankSize').value === '' ? null : parseInt(document.getElementById('fTRankSize').value, 10)
    };

    if (rowErr) { toast(rowErr); return; }
    var v = S.validateExam(exam, state);
    if (v.errors.length) { toast(v.errors[0]); return; }
    if (v.warnings.length && !confirm(v.warnings.join('\n') + '\n\n仍要保存吗？')) return;

    S.upsertExam(exam);
    var wasEditing = !!editingId;
    editingId = null;
    toast(wasEditing ? '已更新' : '已保存，分析已更新');
    navigate('exams');
  }

  /* ================= 视图 6：设置 ================= */
  function renderSettings() {
    var el = document.getElementById('view-settings');
    var state = S.load();
    var st = state.student;

    var html = bannersHtml(state);

    html += '<div class="card"><h3><span class="h-ico">🎓</span>学生与目标</h3><div class="form-grid">' +
      '<div class="form-row"><label>姓名</label><input class="gi-input" id="stName" value="' + esc(st.name) + '" maxlength="20"></div>' +
      '<div class="form-2col">' +
      '<div class="form-row"><label>高一入学年份（用于自动推算学段）</label><input class="gi-input" id="stEnroll" type="number" step="1" inputmode="numeric" min="2000" max="2100" value="' + esc(st.enrollYear) + '"></div>' +
      '<div class="form-row"><label>高考目标总得分率（%）</label><input class="gi-input" id="stTarget" type="number" step="1" inputmode="decimal" min="10" max="100" value="' + Math.round(st.targetRate * 100) + '"></div>' +
      '</div>' +
      '<div class="btn-row"><button class="btn primary" id="stSave">💾 保存设置</button></div>' +
      '<div class="small-note">参考：特控线水平约 75%~80%，985 中游约 85%，清北复交需 90%+（因省而异，仅作设定锚点）。</div>' +
      '</div></div>';

    html += '<div class="card"><h3><span class="h-ico">📚</span>科目与默认满分</h3>' +
      '<div class="card-desc">按学校实际情况改默认满分；高一下选科后，可删掉不选的科目、加上体育/信息等自定义科目。</div>' +
      '<div id="subList">';
    state.subjects.forEach(function (sub) {
      html += '<div class="setting-subject-row" data-key="' + esc(sub.key) + '">' +
        '<input class="gi-input sub-name" value="' + esc(sub.name) + '" maxlength="8">' +
        '<input class="gi-input sub-full num" type="number" step="any" inputmode="decimal" value="' + esc(sub.full) + '">' +
        '<button class="btn small danger sub-del">删</button></div>';
    });
    html += '</div><div class="form-3col mt8">' +
      '<input class="gi-input" id="newSubName" placeholder="新科目名" maxlength="8">' +
      '<input class="gi-input" id="newSubFull" type="number" step="any" inputmode="decimal" placeholder="满分">' +
      '<button class="btn" id="newSubAdd">＋ 添加</button></div>' +
      '<div class="btn-row"><button class="btn small" id="subSave">保存科目修改</button></div></div>';

    html += '<div class="card"><h3><span class="h-ico">💾</span>数据管理（本地 + 快照同步）</h3>' +
      '<div class="card-desc">数据保存在本机浏览器。定期导出 data.js 快照并提交到仓库，即可实现备份与多设备同步（其他设备打开页面会自动载入最新快照）。</div>' +
      '<div class="btn-row">' +
      '<button class="btn primary" id="dmExportJs">导出 data.js 快照</button>' +
      '<button class="btn" id="dmExportJson">导出 JSON 备份</button>' +
      '<button class="btn" id="dmImport">导入数据</button>' +
      '</div>' +
      '<div class="small-note mt8">上次导出：' + (state.lastExportAt ? state.lastExportAt.slice(0, 10) : '从未导出') + ' · 上次修改：' + state.lastModified.slice(0, 10) + '</div>' +
      '<hr class="divider">' +
      '<div class="btn-row">' +
      '<button class="btn" id="dmLoadSample">载入示例数据</button>' +
      '<button class="btn danger" id="dmClear">清空全部数据</button>' +
      '</div></div>';

    html += '<div class="card"><h3><span class="h-ico">ℹ️</span>关于</h3>' +
      '<div class="dim" style="font-size:14px">XBrain · grade-insight 高中成绩跟踪分析。纯静态零构建，数据三重归一（得分率/排名百分位/相对均分）跨考试可比。' +
      '分析结论由规则引擎生成，趋势外推仅供参考，不构成任何升学承诺。</div>' +
      '<div class="btn-row"><a class="btn" href="../index.html">← 返回 XBrain 门户</a></div></div>';

    el.innerHTML = html;
    bindBanners();

    document.getElementById('stSave').addEventListener('click', function () {
      var name = document.getElementById('stName').value.trim() || '学生';
      var ey = parseInt(document.getElementById('stEnroll').value, 10);
      var tg = parseFloat(document.getElementById('stTarget').value);
      state.student.name = name;
      if (ey >= 2000 && ey <= 2100) state.student.enrollYear = ey;
      if (tg >= 10 && tg <= 100) state.student.targetRate = tg / 100;
      S.save();
      toast('设置已保存');
      renderSettings();
    });

    /* 科目编辑 */
    el.querySelectorAll('.sub-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.setting-subject-row');
        var key = row.getAttribute('data-key');
        var name = row.querySelector('.sub-name').value;
        if (state.subjects.length <= 1) { toast('至少保留一个科目'); return; }
        if (confirm('删除科目「' + name + '」？已有考试中该科数据仍保留在历史记录里。')) {
          S.removeSubject(key);
          renderSettings();
        }
      });
    });
    document.getElementById('subSave').addEventListener('click', function () {
      el.querySelectorAll('.setting-subject-row').forEach(function (row) {
        S.updateSubject(row.getAttribute('data-key'), {
          name: row.querySelector('.sub-name').value.trim(),
          full: parseFloat(row.querySelector('.sub-full').value)
        });
      });
      toast('科目已保存');
      renderSettings();
    });
    document.getElementById('newSubAdd').addEventListener('click', function () {
      var n = document.getElementById('newSubName').value.trim();
      var f = parseFloat(document.getElementById('newSubFull').value);
      if (!n) { toast('请填写科目名'); return; }
      if (!f || f <= 0) { toast('请填写有效满分'); return; }
      S.addSubject(n, f);
      renderSettings();
    });

    /* 数据管理 */
    document.getElementById('dmExportJs').addEventListener('click', function () {
      var text = S.buildSnapshotText(state);
      S.markExported(state);
      openIoModal('导出 data.js 快照',
        '复制下面的全部内容，覆盖仓库 grade-insight/js/data.js 中的 window.GRADE_SNAPSHOT 部分（或直接下载后替换整个文件），提交推送即完成备份与多设备同步。',
        text, 'gi_snapshot_data.js');
    });
    document.getElementById('dmExportJson').addEventListener('click', function () {
      var payload = JSON.stringify(S.buildSnapshotPayload(state), null, 2);
      S.markExported(state);
      S.download('grade-backup-' + new Date().toISOString().slice(0, 10) + '.json', payload, 'application/json');
      toast('JSON 已下载，请妥善保管');
      renderSettings();
    });
    document.getElementById('dmImport').addEventListener('click', function () {
      openIoModal('导入数据', '选择 JSON 备份文件，或把 data.js 快照 / JSON 内容粘贴到下面：', '', null);
      var fileIn = document.getElementById('ioFile');
      var ta = document.getElementById('ioText');
      fileIn.addEventListener('change', function () {
        var f = fileIn.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () { ta.value = String(reader.result || ''); };
        reader.readAsText(f, 'utf-8');
      });
      document.getElementById('ioConfirm').addEventListener('click', function () {
        try {
          var payload = S.parseImportText(ta.value);
          S.importSnapshot(payload);
          closeModal();
          toast('导入成功，共 ' + S.load().exams.length + ' 场考试');
          navigate('overview');
        } catch (err) {
          toast('导入失败：' + err.message);
        }
      });
    });
    document.getElementById('dmLoadSample').addEventListener('click', function () {
      if (confirm('载入示例数据将覆盖当前全部数据，确定？')) {
        S.loadSample();
        toast('示例数据已载入');
        navigate('overview');
      }
    });
    document.getElementById('dmClear').addEventListener('click', function () {
      if (confirm('确定清空全部数据？此操作不可恢复，建议先导出备份。')) {
        if (confirm('再次确认：真的要清空吗？')) {
          S.clearAll();
          toast('已清空');
          renderSettings();
        }
      }
    });
  }

  /* 导出/导入共用弹层 */
  function openIoModal(title, desc, text, downloadName) {
    var body = document.getElementById('modalBody');
    var html = '<div class="modal-head"><div><h3>' + esc(title) + '</h3>' +
      '<div class="modal-sub">' + esc(desc) + '</div></div>' +
      '<button class="modal-close" id="mdClose">✕</button></div>';
    if (downloadName) {
      html += '<div class="btn-row" style="margin-bottom:10px">' +
        '<button class="btn primary" id="ioCopy">📋 复制全部内容</button>' +
        '<button class="btn" id="ioDownload">⬇️ 下载 ' + esc(downloadName) + '</button></div>';
    } else {
      html += '<div class="form-row" style="margin-bottom:10px"><label>选择文件</label><input class="gi-input" type="file" id="ioFile" accept=".json,.js,.txt"></div>';
      html += '<div class="btn-row" style="margin-bottom:10px"><button class="btn primary" id="ioConfirm">✅ 确认导入</button></div>';
    }
    html += '<textarea class="gi-input" id="ioText" style="min-height:220px;font-family:monospace;font-size:12px"' + (downloadName ? ' readonly' : '') + '>' + esc(text) + '</textarea>';
    body.innerHTML = html;
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('mdClose').addEventListener('click', closeModal);

    if (downloadName) {
      document.getElementById('ioCopy').addEventListener('click', function () {
        copyText(document.getElementById('ioText').value, '已复制，去 data.js 粘贴替换 GRADE_SNAPSHOT');
      });
      document.getElementById('ioDownload').addEventListener('click', function () {
        S.download(downloadName, document.getElementById('ioText').value, 'text/javascript');
      });
    }
  }

  /* ================= 启动 ================= */
  function init() {
    document.getElementById('modalOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
    S.load();
    if (!location.hash) {
      try { history.replaceState(null, '', '#overview'); } catch (e) { location.hash = '#overview'; }
    }
    onRoute();
    window.addEventListener('hashchange', onRoute);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 暴露给内联调用 */
  window.GIApp = { toast: toast, startEntry: startEntry, openExamModal: openExamModal, navigate: navigate };
})();
