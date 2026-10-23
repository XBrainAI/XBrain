/* ============================================================
   grade-insight · 应用层（三页直线版）
   ------------------------------------------------------------
   路由：#report 报告（一条龙长页）/#records 记录（录入+考试时间线），
   设置经右上角齿轮弹层；旧六路由（#overview/#trends/#subjects/
   #exams/#entry/#settings）保留为别名自动重定向。
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

  /* 章节跳转：确定性定位（window.scrollTo 各内核行为一致；
     84px 为固定品牌胶囊预留余量，与 .rep-sec 的 scroll-margin-top 一致） */
  function scrollToSec(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var y = el.getBoundingClientRect().top + (window.pageYOffset || 0) - 84;
    window.scrollTo(0, y > 0 ? y : 0);
  }

  /* ================= 路由 ================= */
  var ROUTES = ['report', 'records'];
  /* 旧六路由别名：映射到新路由 + 动作（sec=章节滚动 / openEntry=展开录入 / openSettings=打开设置弹层） */
  var LEGACY = {
    overview: { route: 'report' },
    trends: { route: 'report', sec: 'sec-trend' },
    subjects: { route: 'report', sec: 'sec-subjects' },
    exams: { route: 'records' },
    entry: { route: 'records', openEntry: true },
    settings: { route: 'report', openSettings: true }
  };

  function parseRoute() {
    var h = (location.hash || '').replace(/^#/, '');
    if (ROUTES.indexOf(h) >= 0) return { route: h };
    if (LEGACY[h]) {
      var l = LEGACY[h];
      return { route: l.route, sec: l.sec || null, openEntry: !!l.openEntry, openSettings: !!l.openSettings, legacy: h };
    }
    return { route: 'report' };
  }

  /* 导航：显式接管（不依赖 <a> 默认锚点行为与 hashchange 事件——
     部分 iframe 预览面板/内嵌内核/缩放环境下默认锚点导航会丢事件，导致 Tab"点击无效"） */
  function navigate(route) {
    if (('#' + route) !== location.hash) {
      try { history.pushState(null, '', '#' + route); }
      catch (e) { location.hash = '#' + route; }
    }
    onRoute();
  }

  /* 上次渲染的路由：某些内核对 replaceState 改 hash 也会补发 hashchange，
     导致 onRoute 二次执行并把刚滚到章节的位置重置回顶部——仅在路由真正变化时回顶 */
  var lastRenderedRoute = null;

  function onRoute() {
    var r = parseRoute();
    /* 旧深链地址栏规范化（replaceState 不触发 hashchange，无循环） */
    if (r.legacy) {
      try { history.replaceState(null, '', '#' + r.route); }
      catch (e) { /* 忽略，仍按别名渲染 */ }
    }
    var routeChanged = r.route !== lastRenderedRoute;
    lastRenderedRoute = r.route;
    document.querySelectorAll('.tabbar a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === r.route);
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.id === 'view-' + r.route);
    });
    if (r.openEntry) entryOpen = true;
    if (routeChanged && !r.sec && !r.openSettings) window.scrollTo(0, 0);
    try {
      if (r.route === 'report') renderReport(); else renderRecords();
    } catch (err) {
      toast('渲染出错：' + err.message);
      if (window.console) console.error(err);
    }
    if (r.sec) scrollToSec(r.sec);
    if (r.openSettings) openSettingsSheet();
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
      if (confirm('清空示例数据并开始空白档案？')) { S.clearAll(); entryOpen = false; editingId = null; toast('已清空，开始记录真实成绩吧'); onRoute(); }
    });
    var b2 = document.getElementById('bnGoSettings');
    if (b2) b2.addEventListener('click', function () { openSettingsSheet(); });
  }

  function emptyHtml(icon, text, actRoute, actText) {
    return '<div class="empty-state"><div class="es-ico">' + icon + '</div><div>' + text + '</div>' +
      (actRoute ? '<div class="es-act"><button class="btn primary" data-go="' + actRoute + '">' + actText + '</button></div>' : '') +
      '</div>';
  }

  function hintCard(text) {
    return '<div class="card"><div class="muted">' + text + '</div></div>';
  }

  function bindGoButtons(container) {
    container.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { navigate(b.getAttribute('data-go')); });
    });
  }

  function secTitle(ico, text) {
    return '<h3 class="sec-title"><span class="h-ico">' + ico + '</span>' + text + '</h3>';
  }

  /* ================= 视图 1：报告（一条龙长页） ================= */
  var trendFilterKey = 'all';   /* 走势图的考试性质筛选 */

  function renderReport() {
    var el = document.getElementById('view-report');
    var state = S.load();
    var os = A.overallSeries(state.exams);
    var html = bannersHtml(state);
    var nExams = state.exams.length;

    if (!nExams) {
      el.innerHTML = html + emptyHtml('📊', '还没有考试记录。<br>到「记录」开始，每次考完花一分钟，报告全自动生成。', 'records', '＋ 录入第一场考试');
      bindGoButtons(el); bindBanners();
      return;
    }
    /* 有记录但无可计分得分（全部缺考/导入脏数据）：给空态而非崩溃 */
    if (!os.length) {
      el.innerHTML = html + emptyHtml('📊', '已记录 ' + nExams + ' 场考试，但没有可计分的科目得分（全部缺考或数据不完整）。<br>请到「记录」检查记录，或补录得分。', 'records', '去检查考试记录');
      bindGoButtons(el); bindBanners();
      return;
    }

    /* ---- ① 本况 ---- */
    html += '<section class="rep-sec" id="sec-now">' + kpiGridHtml(state, os) + '</section>';

    /* ---- ② 本期要点 ---- */
    html += '<section class="rep-sec" id="sec-takeaways">';
    html += secTitle('🧭', '本期要点');
    var tks = A.takeaways(state);
    if (!tks.length) {
      html += hintCard('记录满 2 场后，这里会自动提炼本期要点。');
    } else {
      html += '<div class="tk-grid">';
      tks.forEach(function (t) {
        html += '<button class="tk-card ' + t.cls + '" data-anchor="' + t.anchor + '">' +
          '<span class="tk-ico">' + t.icon + '</span>' +
          '<span class="tk-text">' + esc(t.text) + '</span>' +
          '<span class="tk-go">›</span></button>';
      });
      html += '</div><div class="small-note mt8">点要点卡可跳到对应图表。</div>';
    }
    html += '</section>';

    /* ---- ③ 总分走势与相对位置 ---- */
    html += '<section class="rep-sec" id="sec-trend">';
    html += secTitle('📈', '总分走势与相对位置');
    if (os.length < 2) {
      html += hintCard('图表需要至少 2 场考试，先积累数据或切换筛选。');
    } else {
      var groups = (D.typeGroups || [{ key: 'all', name: '全部', types: null }]);
      html += '<div class="card">' +
        '<div class="chips">' + groups.map(function (x) {
          return '<button class="chip' + (x.key === trendFilterKey ? ' active' : '') + '" data-gkey="' + x.key + '">' + esc(x.name) + '</button>';
        }).join('') + '</div>' +
        '<div class="chart-box tall" id="rpLine"></div>' +
        '<div class="chart-note">怎么看：每个点是一场考试的<b>总分得分率（得分 ÷ 满分）</b>，越高越好；横轴为考试日期。不同考试满分不同，已自动归一，禁止直接比原始分。</div></div>';
      html += '<div class="card"><div class="chart-box" id="rpBar"></div>' +
        '<div class="chart-note">怎么看：柱高 = 个人总得分率 <b>−</b> 年级均分得分率；<b>绿柱 = 跑赢年级，红柱 = 落后</b>；柱子整体向上 = 在跑赢大盘。单位为百分点。</div></div>';
    }
    html += '</section>';

    /* ---- ④ 学科诊断 ---- */
    html += '<section class="rep-sec" id="sec-subjects">';
    html += secTitle('🧭', '学科诊断');
    if (os.length < 2) {
      html += hintCard('学科诊断需要至少 2 场考试。');
    } else {
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
        '<div class="card-desc">蓝色 = 最近一次「' + esc(last.exam.name) + '」，黄色 = 个人历史均值。<b>某条边明显凹进去，就是短板方向</b>（相对你自己的总分均值得分率）。</div>' +
        '<div class="chart-box tall" id="rpRadar"></div></div>';

      /* 偏科榜 */
      var sorted = im.items.filter(function (x) { return x.count >= 2; }).sort(function (a, b) { return b.delta - a.delta; });
      html += '<div class="card"><h3><span class="h-ico">⚖️</span>偏科诊断</h3>' +
        '<div class="card-desc">差值 = 该科均值得分率 <b>−</b> 个人总分均值得分率（基准 ' + A.pct(im.overallMean) + '）；<b>≥ 8 个百分点判强科，≤ −8 判弱科</b>。</div><div class="rank-list">';
      if (!sorted.length) html += '<div class="muted">暂无数据</div>';
      sorted.forEach(function (x, i) {
        html += '<div class="rank-item"><span class="ri-idx">' + (i + 1) + '</span><span class="ri-name">' + esc(x.name) +
          ' <span class="muted small-note">均值 ' + A.pct(x.mean) + '</span></span>' +
          '<span class="ri-val ' + (x.delta >= 0 ? 'text-up' : 'text-down') + '">' + A.pp(x.delta) + ' pp</span>' +
          '<span class="tag ' + (x.tag === 'strong' ? 'strong' : x.tag === 'weak' ? 'weak' : 'muted') + '">' + (x.tag === 'strong' ? '强科' : x.tag === 'weak' ? '弱科' : '均衡') + '</span></div>';
      });
      html += '</div></div>';

      /* 单科走势（折叠懒绘制） */
      var sparkRows = '';
      var colors = C.PALETTE;
      var idx = 0;
      state.subjects.forEach(function (sub) {
        var ss = A.subjectSeries(state.exams, sub.key);
        if (ss.length < 2) return;
        var s = A.slope(ss.map(function (x) { return x.rate; }));
        var tl = A.trendLabel(s);
        var std = A.stdev(ss.map(function (x) { return x.rate; }));
        var vl = A.volatilityLabel(std);
        var it = im.items.find(function (x) { return x.key === sub.key; });
        sparkRows += '<details class="sub-row" data-key="' + esc(sub.key) + '">' +
          '<summary><b>' + esc(sub.name) + '</b>' +
          '<span class="tag ' + tl.cls + '">' + tl.label + '</span>' +
          '<span class="tag ' + vl.cls + '">' + vl.label + '</span>' +
          '<span class="tag muted">均值 ' + (it ? A.pct(it.mean) : '—') + '</span>' +
          '<span class="sr-arrow">▾</span></summary>' +
          '<div class="chart-box spark" id="sp_' + esc(sub.key) + '"></div>' +
          '<div class="chart-note">横轴为考试日期，纵轴为该科得分率（自动缩放）；波动 = 近几次得分率标准差，斜率单位为百分点/次。</div>' +
          '</details>';
        idx++;
      });
      html += '<div class="card"><h3><span class="h-ico">📚</span>单科走势<span class="muted small-note">（点科目展开小图）</span></h3>';
      html += sparkRows ? sparkRows : '<div class="muted">暂无足够数据的科目（每科至少 2 次记录）</div>';
      html += '</div>';
    }
    html += '</section>';

    /* ---- ⑤ 目标与提分 ---- */
    html += '<section class="rep-sec" id="sec-goal">';
    html += secTitle('🎯', '目标与提分');
    var tg = A.target(state, os);
    if (tg) {
      html += '<div class="card"><h3><span class="h-ico">🎓</span>目标推演</h3>' +
        '<div class="goal-line">目标总得分率 ' + A.pct(tg.target) + ' · 当前 ' + A.pct(tg.current) +
        ' · <b class="' + (tg.gap <= 0 ? 'text-up' : 'text-down') + '">' + (tg.gap <= 0 ? '已达标（+' + A.pp(-tg.gap) + ' pp）' : '还差 ' + A.pp(tg.gap) + ' pp') + '</b></div>' +
        '<div class="card-desc">' + esc(tg.projection || '') + '</div>';
      var pri = A.priorities(state.exams, state);
      if (pri.length) {
        html += '<div class="rank-list mt12">';
        pri.forEach(function (p, i) {
          var why = p.slope !== null && p.slope < -0.008 ? '且趋势向下，优先止损' : '提升空间最大';
          html += '<div class="rank-item"><span class="ri-idx">' + (i + 1) + '</span><span class="ri-name">' + esc(p.name) +
            ' <span class="muted small-note">均值 ' + A.pct(p.mean) + '</span></span>' +
            '<span class="ri-val">距目标 ' + A.pp(p.space) + ' pp</span>' +
            '<span class="tag muted">' + why + '</span></div>';
        });
        html += '</div>';
      }
      html += '<div class="small-note mt8">提分优先级 = 距目标空间 × 趋势加权 Top3；趋势外推仅供参考，不构成升学承诺。</div></div>';
    } else {
      html += hintCard('暂无可分析的数据。');
    }
    html += '</section>';

    /* ---- ⑥ 完整简报（折叠，可复制给 AI） ---- */
    var br = A.briefing(state);
    html += '<section class="rep-sec" id="sec-briefing">' +
      '<details class="brief-fold"><summary>📄 完整智能简报<span class="muted small-note">（默认收起 · 可复制给 AI 深聊）</span><span class="sr-arrow">▾</span></summary>' +
      '<div class="card"><div class="briefing-text" id="briefText">' + esc(br.text) + '</div>' +
      '<div class="btn-row"><button class="btn small primary" id="btnCopyBrief">📋 一键复制简报</button></div>' +
      '<div class="small-note">简报随每次录入自动更新；结论由规则引擎基于三重归一生成。</div></div></details></section>';

    el.innerHTML = html;
    bindGoButtons(el); bindBanners();

    /* 要点卡点击 → 跳章节 */
    el.querySelectorAll('.tk-card').forEach(function (t) {
      t.addEventListener('click', function () { scrollToSec(t.getAttribute('data-anchor')); });
    });
    /* 考试性质筛选 */
    el.querySelectorAll('.chip[data-gkey]').forEach(function (c) {
      c.addEventListener('click', function () {
        trendFilterKey = c.getAttribute('data-gkey');
        renderReport();
        scrollToSec('sec-trend');
      });
    });
    /* 单科走势懒绘制：展开时才画（收起时容器无尺寸） */
    el.querySelectorAll('.sub-row').forEach(function (d) {
      var drawn = false;
      d.addEventListener('toggle', function () {
        if (d.open && !drawn) {
          drawn = true;
          drawSubjectSpark(state, d.getAttribute('data-key'));
        }
      });
    });
    var cb = document.getElementById('btnCopyBrief');
    if (cb) cb.addEventListener('click', function () { copyText(br.text, '简报已复制，可粘贴给 AI 深聊'); });

    drawReportCharts(state, os);
  }

  function kpiGridHtml(state, os) {
    var last = os[os.length - 1];
    var rates = os.map(function (x) { return x.rate; });
    var s = A.slope(rates);
    var tl = A.trendLabel(s);
    var lastRanked = null;
    for (var i = os.length - 1; i >= 0; i--) {
      if (os[i].percentile !== null) { lastRanked = os[i]; break; }
    }
    var gap = state.student.targetRate - last.rate;
    return '<div class="kpi-grid">' +
      '<div class="kpi"><div class="kpi-value">' + A.pct(last.rate) + '</div><div class="kpi-label">最近总得分率</div><div class="kpi-extra">' + esc(last.exam.name) + '</div></div>' +
      '<div class="kpi"><div class="kpi-value">' + (lastRanked ? A.percentileOf(lastRanked.exam.totalRank, lastRanked.exam.totalRankSize).toFixed(1) + '%' : '—') + '</div><div class="kpi-label">总分排名百分位</div><div class="kpi-extra">' + (lastRanked ? esc(lastRanked.exam.name) + '：' + lastRanked.exam.totalRank + '/' + lastRanked.exam.totalRankSize : '录入总分排名后显示') + '</div></div>' +
      '<div class="kpi"><div class="kpi-value ' + (tl.cls === 'up' ? 'up' : tl.cls === 'down' ? 'down' : '') + '">' + tl.label + '</div><div class="kpi-label">总体趋势</div><div class="kpi-extra">' + (s === null ? '样本不足' : '平均每次 ' + A.pp(s) + ' pp') + '</div></div>' +
      '<div class="kpi"><div class="kpi-value ' + (gap <= 0 ? 'up' : '') + '">' + (gap <= 0 ? '已达标' : A.pp(-gap) + ' pp') + '</div><div class="kpi-label">距高考目标 ' + A.pct(state.student.targetRate) + '</div><div class="kpi-extra">目标在「设置」中可调</div></div>' +
      '</div>';
  }

  function drawReportCharts(state, os) {
    /* 走势图（按考试性质筛选） */
    var groups = (D.typeGroups || []);
    var g = groups.find(function (x) { return x.key === trendFilterKey; });
    var types = g && g.types ? g.types : null;
    var fos = os.filter(function (x) { return !types || types.indexOf(x.exam.type) >= 0; });
    if (fos.length >= 2) {
      var xLabels = fos.map(function (x) { return A.fmtDate(x.exam.date); });
      C.line('rpLine', {
        xLabels: xLabels,
        series: [{ name: '总分', data: fos.map(function (x) { return x.rate; }) }],
        zoom: true
      });
      C.barDiff('rpBar', { xLabels: xLabels, data: fos.map(function (x) { return x.vsAvg; }), name: '总得分率差' });
    }
    /* 雷达 */
    var last = os[os.length - 1];
    var im = A.imbalance(state.exams, state.subjects);
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
    if (inds.length >= 3) {
      C.radar('rpRadar', {
        indicators: inds,
        series: [
          { name: '最近一次', values: latestVals },
          { name: '个人均值', values: meanVals }
        ]
      });
    } else {
      var rEl = document.getElementById('rpRadar');
      if (rEl) rEl.innerHTML = '<div class="empty-state" style="padding:30px 10px">最近一次可考科目不足 3 科，暂不绘制雷达</div>';
    }
  }

  function drawSubjectSpark(state, key) {
    var sub = state.subjects.find(function (x) { return x.key === key; });
    var ss = A.subjectSeries(state.exams, key);
    if (!sub || ss.length < 2) return;
    var colors = C.PALETTE;
    var idx = state.subjects.indexOf(sub);
    C.sparkSub('sp_' + key, {
      xLabels: ss.map(function (x) { return A.fmtDate(x.exam.date); }),
      data: ss.map(function (x) { return x.rate; }),
      color: colors[idx % colors.length]
    });
  }

  /* ================= 视图 2：记录（录入 + 考试时间线） ================= */
  var entryOpen = false;
  var editingId = null;
  var termTouched = false;

  function startEntry(id) {
    editingId = id || null;
    termTouched = !!id;
    entryOpen = true;
    navigate('records');
    window.scrollTo(0, 0);
  }

  function renderRecords() {
    var el = document.getElementById('view-records');
    var state = S.load();
    var formOpen = entryOpen || editingId;
    var html = bannersHtml(state);

    html += '<div class="btn-row entry-toggle">' +
      (formOpen ? '' : '<button class="btn primary" id="btnOpenEntry">✏️ 录入新考试</button>') + '</div>';
    if (formOpen) html += '<div id="entryWrap">' + entryFormHtml(state) + '</div>';

    html += '<section class="rep-sec" id="sec-list">';
    html += secTitle('🗂️', '考试时间线');
    var os = A.overallSeries(state.exams);
    if (!os.length) {
      html += emptyHtml('📋', state.exams.length ?
        '已记录 ' + state.exams.length + ' 场考试，但没有可计分的科目得分。' :
        '还没有考试记录。');
    } else {
      var desc = os.slice().reverse();
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
    }
    html += '</section>';

    el.innerHTML = html;
    bindGoButtons(el); bindBanners();
    bindExamList(el);
    if (formOpen) bindEntryForm(state);
    else {
      var ob = document.getElementById('btnOpenEntry');
      if (ob) ob.addEventListener('click', function () { entryOpen = true; renderRecords(); window.scrollTo(0, 0); });
    }
  }

  function bindExamList(el) {
    el.querySelectorAll('.exam-item').forEach(function (item) {
      item.addEventListener('click', function () { openExamModal(item.getAttribute('data-eid')); });
    });
  }

  /* ---------- 考试详情弹层 ---------- */
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

    /* —— 考试详情分页：仪表盘（系统分析）/ 题级错题 / 知识点 / 环比与总分 —— */

    var kpSubs = e.subjects.filter(function (sr) { return sr.kps && sr.kps.length; });
    var kpHtml = '';
    if (kpSubs.length) {
      kpSubs.forEach(function (sr) {
        var sorted = sr.kps.slice().sort(function (a, b) { return (a.rate || 0) - (b.rate || 0); });
        var weak = sorted.filter(function (k) { return (k.rate || 0) < 60; }).length;
        kpHtml += '<div class="mt8"><b>' + esc(subjName(state.subjects, sr.key)) + '</b>' +
          '<span class="muted small-note"> 入档 ' + sr.kps.length + ' 条，薄弱(&lt;60%) ' + weak + ' 条</span></div>';
        kpHtml += '<div class="table-wrap"><table class="gi-table"><thead><tr><th>知识点</th><th>掌握率</th><th>错题</th><th>页签</th></tr></thead><tbody>';
        sorted.forEach(function (k) {
          var low = (k.rate || 0) < 60;
          kpHtml += '<tr><td>' + (k.key ? '<span class="tag">★重点</span> ' : '') + esc(k.name) + '</td>' +
            '<td class="num' + (low ? ' text-down' : '') + '">' + (k.rate === null || k.rate === undefined ? '—' : k.rate + '%') + '</td>' +
            '<td class="num">' + (k.wrong === null || k.wrong === undefined ? '—' : k.wrong) + '</td>' +
            '<td><span class="tag muted">' + esc(k.category || '考查') + '</span></td></tr>';
        });
        kpHtml += '</tbody></table></div>';
      });
      kpHtml += '<div class="small-note mt8">仅显示平台提供该视图的科目；未显示≠未学习。掌握率&lt;60% 标红，★=重点。</div>';
    }

    var cmpHtml = '';
    if (oi) {
      cmpHtml += '<div class="dim">总分口径：计分 ' + oi.agg.count + ' 科，合计 ' + oi.agg.score + ' / ' + oi.agg.full + '，总得分率 <b class="num">' + A.pct(oi.rate) + '</b>' +
        (e.totalRank !== null && e.totalRank !== undefined ? '，总分排名 ' + e.totalRank + (e.totalRankSize ? '/' + e.totalRankSize : '') : '') + '</div>';
    }
    if (prev) {
      var ctb = A.contribution(prev.exam, e, state.subjects);
      cmpHtml += '<h3 style="font-size:15px;margin:10px 0 8px">🔍 环比拆解（较「' + esc(prev.exam.name) + '」）</h3>';
      if (ctb.items.length) {
        cmpHtml += '<div class="rank-list">';
        ctb.items.forEach(function (it) {
          if (Math.abs(it.contrib) < 0.001 && Math.abs(it.delta) < 0.01) return;
          cmpHtml += '<div class="rank-item"><span class="ri-name">' + esc(it.name) +
            '<span class="muted small-note"> 得分率 ' + (it.delta >= 0 ? '+' : '') + (it.delta * 100).toFixed(1) + ' pp</span></span>' +
            '<span class="ri-val ' + (it.contrib >= 0 ? 'text-up' : 'text-down') + '">对总分贡献 ' + A.pp(it.contrib) + ' pp</span></div>';
        });
        cmpHtml += '</div><div class="small-note mt8">贡献 = 该科满分占比 × 得分率变化，单位为总得分率百分点。</div>';
      } else {
        cmpHtml += '<div class="muted">两次考试没有共同计分科目，无法拆解。</div>';
      }
    }

    var tabs = [
      ['sys', '📊 仪表盘', '📊 仪表盘', !!e.dataRef],
      ['qz', '📋 题级错题', '📋 错题', !!e.dataRef],
      ['kp', '🧠 知识点', '🧠 知识点', !!kpSubs.length],
      ['cmp', '📈 环比与总分', '📈 环比', true]
    ];
    var paneContent = { sys: '<div id="sysBox" class="muted small-note">📊 仪表盘加载中…</div>', qz: '<div id="qzBox"><span class="muted small-note">题级明细加载中…</span></div>', kp: kpHtml, cmp: cmpHtml };
    var tabBar = '<div class="xtabs">' + tabs.filter(function (t) { return t[3]; }).map(function (t, i) {
      return '<button class="xbtn' + (i === 0 ? ' on' : '') + '" data-x="' + t[0] + '" aria-label="' + t[1] + '">' +
        '<span class="xlong">' + t[1] + '</span><span class="xshort">' + t[2] + '</span></button>';
    }).join('') + '</div>';

    var html = '<div class="modal-head"><div><h3>' + esc(e.name) + '</h3>' +
      '<div class="modal-sub">' + e.date + ' · ' + esc(e.type) + (e.term ? ' · ' + esc(e.term) : '') + '</div></div>' +
      '<div class="modal-actions">' +
      '<button class="modal-icon" id="mdEdit" aria-label="编辑" title="编辑">✏️</button>' +
      '<button class="modal-icon danger" id="mdDel" aria-label="删除" title="删除">🗑</button>' +
      '<button class="modal-close" id="mdClose" aria-label="关闭" title="关闭">✕</button>' +
      '</div></div>';
    html += tabBar;
    html += tabs.filter(function (t) { return t[3]; }).map(function (t, i) {
      return '<div class="xpane' + (i === 0 ? ' on' : '') + '" id="xp-' + t[0] + '">' + paneContent[t[0]] + '</div>';
    }).join('');

    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('active');
    setDetailSheet(true);

    document.querySelectorAll('#modalBody .xbtn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('#modalBody .xbtn').forEach(function (x) { x.classList.remove('on'); });
        document.querySelectorAll('#modalBody .xpane').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        var p = document.getElementById('xp-' + b.getAttribute('data-x'));
        if (p) p.classList.add('on');
        if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center' });
        if (b.getAttribute('data-x') === 'sys' && window.GISysPanel) window.GISysPanel.reveal();
      });
    });

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
    if (e.dataRef) loadQuestionDetail(e);
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    setDetailSheet(false);
  }

  /* 手机端考试详情：固定头/标签/底部操作，只让内容区滚动（detail-sheet） */
  function setDetailSheet(on) {
    var box = document.querySelector('.modal-box');
    if (!box) return;
    if (on) box.classList.add('detail-sheet');
    else box.classList.remove('detail-sheet');
  }

  /* dataRef → exam.json 懒加载渲染：题级丢分与错题解析链接（站内 md/ 相对路径白名单校验） */
  function loadQuestionDetail(e) {
    var box = document.getElementById('qzBox'); if (!box) return;
    fetch(encodeURI(e.dataRef)).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      if (!d || !Array.isArray(d.subjects)) throw new Error('契约结构缺失');
      var base = e.dataRef.replace(/data\/exam\.json$/, '');
      d._base = base;
      var html = '';
      var shown = 0;
      d.subjects.forEach(function (sr) {
        if (!sr.questions || !sr.questions.length) return;
        shown++;
        var wrongs = sr.questions.filter(function (q) { return q.score < q.point; });
        var lost = wrongs.reduce(function (a, q) { return a + (q.point - q.score); }, 0).toFixed(1);
        html += '<div class="mt8"><b>' + esc(sr.name || sr.key) + '</b><span class="muted small-note"> 错题 ' +
          wrongs.length + ' / ' + sr.questions.length + ' 题，丢 ' + lost + ' 分</span></div>';
        if (!wrongs.length) { html += '<div class="muted small-note">全对。</div>'; return; }
        html += '<div class="rank-list">';
        wrongs.forEach(function (q) {
          /* SPEC-005：解析指向预渲染 HTML（render-analysis 同规则推导）；md 源白名单校验不变 */
          var safe = /^md\/.+\.md$/.test(q.analysisRef || '') && q.analysisRef.indexOf('..') < 0;
          var href = safe ? base + 'data/analysis/' + q.analysisRef.replace(/^md\//, '').replace(/ \((\d+)\)\.md$/, '-$1.html') : '';
          html += '<div class="rank-item"><span class="ri-name">第 ' + q.no + ' 题 · ' + esc(q.type || '') +
            (q.diff ? ' · ' + esc(q.diff) : '') +
            '<span class="muted small-note"> ' + q.score + '/' + q.point + ' 分</span></span>' +
            (safe ? '<a class="ri-val" href="' + encodeURI(href) + '" target="_blank" rel="noopener">解析 ↗</a>'
                  : '<span class="muted small-note">无解析源</span>') + '</div>';
        });
        html += '</div>';
      });
      if (!shown) html += '<div class="muted">该考未提供题级数据。</div>';
      box.innerHTML = html;
      fetch(encodeURI(base + 'data/balance.json')).then(function (r) {
        return r.ok ? r.json() : null;
      }).catch(function () { return null; }).then(function (bal) {
        if (bal && Array.isArray(bal.axes) && Array.isArray(bal.series)) d.balance = bal;
        renderSysPanel(d);
      });
    }).catch(function () {
      box.innerHTML = '<span class="muted small-note">📋 题级明细未能加载（数据件缺失或路径变更），不影响上方内容。</span>';
      var sb = document.getElementById('sysBox');
      if (sb) sb.innerHTML = '<span class="muted small-note">📊 仪表盘未能加载（数据件缺失），不影响其他标签。</span>';
    });
  }

  /* 📊 仪表盘（系统分析，学生/家长视角）：GIAnalyze 引擎 → 少文字 + 自带图例的图表
     三条自约束：① 结论先行；② 每张图自带读法/口径（不依赖外部定义）；
     ③ 只做展示层聚合，研判数字一律来自引擎，缺源直说"没数据"。 */
  function renderSysPanel(d) {
    var sb = document.getElementById('sysBox'); if (!sb || !window.GIAnalyze) return;
    var tr = (S.load().student && S.load().student.targetRate) || 0.8;
    var m = GIAnalyze.build(d, tr);
    var o = m.overall;
    if (!o.full || !m.subjects.length) { sb.innerHTML = '<div class="muted small-note">本次考试没有可分析的成绩数据。</div>'; return; }

    var r1 = function (x) { return Math.round(x * 10) / 10; };
    var p100 = function (score, full) { return full ? Math.round(score / full * 100) : 0; };
    var cur = p100(o.score, o.full);
    var goal = Math.round(tr * 100);
    var gap = Math.max(0, goal - cur);
    var band = function (v) { return v >= 85 ? 'A' : v >= 70 ? 'B' : v >= 60 ? 'C' : v >= 40 ? 'D' : 'E'; };
    var bandCls = function (v) { return v >= 85 ? 'top' : v >= 70 ? 'good' : v >= 60 ? 'ok' : 'weak'; };
    var level = (o.level && o.level !== '–') ? String(o.level) : band(cur);
    var levelCls = level === 'A' ? 'top' : level === 'B' ? 'good' : level === 'C' ? 'ok' : 'weak';
    var colorOf = { weak: '#ff8f8f', ok: '#ffd479', good: '#64b4ff', top: '#7ee2a8' };

    var subs = m.subjects.map(function (s) {
      var st = s.diffs || {};
      var p = p100(s.score, s.full);
      return {
        name: s.name || s.key, score: s.score, full: s.full, p: p, band: band(p), cls: bandCls(p),
        lost: r1(s.full - s.score), hasQ: s.hasQ,
        loss: {
          '易': (st['易'] && st['易'].loss) || 0,
          '中': (st['中'] && st['中'].loss) || 0,
          '难': (st['难'] && st['难'].loss) || 0
        },
        easyNos: s.easyWrongNos || [], kp: s.kp || null, concls: s.concls || []
      };
    });
    var lossSum = { '易': 0, '中': 0, '难': 0 };
    subs.forEach(function (s) { ['易', '中', '难'].forEach(function (k) { lossSum[k] += s.loss[k]; }); });
    var totalLost = r1(o.full - o.score);
    var unSplit = r1(Math.max(0, totalLost - (lossSum['易'] + lossSum['中'] + lossSum['难'])));
    var potential = Math.round(o.potential || 0);
    var tierWord = { '易': '简单题', '中': '中档题', '难': '难题' };
    var tierSum = lossSum['易'] + lossSum['中'] + lossSum['难'];
    var hasTiers = tierSum > 0;
    var mainTier = hasTiers ? ['易', '中', '难'].sort(function (a, b) { return lossSum[b] - lossSum[a]; })[0] : null;
    var weakN = subs.filter(function (s) { return s.p < 60; }).length;
    var bestRaw = subs.slice().sort(function (a, b) { return b.score - a.score; })[0];
    var worstRaw = subs.slice().sort(function (a, b) { return a.score - b.score; })[0];
    var maxFull = subs.reduce(function (a, s) { return Math.max(a, s.full || 0); }, 0) || 100;
    var kpNames = subs.filter(function (s) { return s.kp; }).map(function (s) { return s.name; });
    var share = function (x) { return totalLost ? Math.round(x / totalLost * 100) : 0; };

    /* 数据缺口：如实说明（地理无题级、化学记录差），不猜 */
    var noQ = [], mismatch = [];
    (d.subjects || []).forEach(function (sr) {
      var qs = sr.questions || [];
      if (!qs.length) {
        if (typeof sr.score === 'number') noQ.push({ name: sr.name || sr.key, lost: r1(sr.full - sr.score) });
        return;
      }
      var qLost = qs.reduce(function (a, q) { return a + Math.max(0, (q.point || 0) - (q.score || 0)); }, 0);
      var lost = sr.full - sr.score;
      if (Math.abs(qLost - lost) > 0.01) mismatch.push({ name: sr.name || sr.key, diff: r1(lost - qLost) });
    });

    var H = [];

    /* 一、这次考得怎么样：总分 + 等级尺子 + 目标位置 */
    H.push('<div class="sa-hero">' +
      '<div class="sa-hero-top">' +
        '<div><div class="sa-hero-label">这次总分</div>' +
        '<div class="sa-hero-score"><b class="num">' + o.score + '</b><span class="num"> / ' + o.full + '</span></div>' +
        '<div class="sa-hero-pct" title="成绩概览里的班级/年级等级">百分制 <b class="num">' + cur + '</b> 分 · 等级 <span class="sa-lv ' + levelCls + '">' + esc(level) + '</span></div></div>' +
        '<div class="sa-gap">' + (gap > 0
          ? '<span>离目标还差</span><b class="num">' + gap + '</b><span>分</span>'
          : '<span>已达标</span><b class="num" style="color:var(--up)">+' + (cur - goal) + '</b><span>分</span>') +
        '<div class="sa-gap-sub">目标线 ' + goal + ' 分</div></div>' +
      '</div>' +
      '<div class="sa-ruler">' +
        '<div class="sa-zone z-e" style="width:40%">E</div>' +
        '<div class="sa-zone z-d" style="width:20%">D</div>' +
        '<div class="sa-zone z-c" style="width:10%">C</div>' +
        '<div class="sa-zone z-b" style="width:15%">B</div>' +
        '<div class="sa-zone z-a" style="width:15%">A</div>' +
        '<b class="sa-you" style="left:' + cur + '%"><i></i><span>你 ' + cur + '</span></b>' +
        '<b class="sa-goal" style="left:' + goal + '%"><i></i><span>目标 ' + goal + '</span></b>' +
      '</div>' +
      '<div class="sa-ruler-legend">色带就是等级：A 85 分以上 · B 70–85 · C 60–70 · D 40–60 · E 40 以下（按得分比例）</div>' +
      '</div>');

    /* 二、各科强弱（横条按各科自己的满分，灰条=满分、彩条=得分） */
    H.push('<div class="sa-block">' +
      '<div class="sa-title">各科强弱 <span>按占满分比例排序 · 条长=得分，灰条=满分</span></div>' +
      '<div class="sa-insight">' + esc(bestRaw.name) + ' ' + bestRaw.score + '/' + bestRaw.full + ' 最高，' + esc(worstRaw.name) + ' ' + worstRaw.score + '/' + worstRaw.full + ' 最低；' +
        (weakN ? '有 ' + weakN + ' 科不到满分的 60%。' : '全部达到满分的 60% 以上。') + '</div>' +
      '<div class="sa-chart" id="saChartSubj"></div>' +
      '<div class="sa-legend"><span class="sa-legend-lead">颜色=得分占该科满分的比例：</span>' +
        '<span><i class="sa-dot d-weak"></i>不到 60%</span><span><i class="sa-dot d-ok"></i>60–70%</span>' +
        '<span><i class="sa-dot d-good"></i>70–85%</span><span><i class="sa-dot d-top"></i>85% 以上</span>' +
        '<span><i class="sa-dot d-track"></i>灰条=满分</span></div>' +
      '</div>');

    /* 学科均衡度：原图雷达的相对水平（非分数刻度） */
    if (d.balance && Array.isArray(d.balance.axes) && Array.isArray(d.balance.series)) {
      H.push('<div class="sa-block">' +
        '<div class="sa-title">学科均衡度 <span>原图相对水平 · 非分数刻度</span></div>' +
        '<div class="sa-insight">首考：平时水平=本次水平（两线重叠，原图蓝色平时面覆盖绿色本次线）；年级中等仅相对占比。</div>' +
        '<div class="sa-chart" id="saChartBalance"></div>' +
        '<div class="sa-tip">外圈=100、圆心=0；这是相对水平，不是各科得分率。首考平时=本次；年级中等不能反推具体分数。</div>' +
        '<details class="sa-more"><summary>数据来源与估算口径</summary><div class="sa-tip">' +
          '来源：' + esc(d.balance.source || 'raw/总分概览.jpg') + '<br>' +
          (d.balance.note ? '说明：' + esc(d.balance.note) + '<br>' : '') +
          '方法：' + esc(d.balance.method || '') + '<br>' +
          '注意：' + esc(d.balance.caveat || '') +
        '</div></details>' +
        '</div>');
    }

    /* 图后速览：最强/最弱/丢分最多/最多能追回 */
    H.push('<div class="sa-kpis">' +
      '<div class="sa-kpi top"><div class="sa-kpi-l">得分最高</div><div class="sa-kpi-v">' + esc(bestRaw.name) + ' ' + bestRaw.score + '<em> / ' + bestRaw.full + '</em></div></div>' +
      '<div class="sa-kpi weak"><div class="sa-kpi-l">得分最低</div><div class="sa-kpi-v">' + esc(worstRaw.name) + ' ' + worstRaw.score + '<em> / ' + worstRaw.full + '</em></div></div>' +
      '<div class="sa-kpi ok"><div class="sa-kpi-l">' + (mainTier ? '丢分最多' : '总共丢分') + '</div><div class="sa-kpi-v">' +
        (mainTier ? tierWord[mainTier] + '<em>' + r1(lossSum[mainTier]) + ' 分</em>' : totalLost + '<em>分</em>') + '</div></div>' +
      '<div class="sa-kpi good"><div class="sa-kpi-l">最多能追回</div><div class="sa-kpi-v">+' + potential + '<em>分</em></div></div>' +
      '</div>');

    /* 三、分数丢在哪（难易档构成，1 条堆叠条 + 图例） */
    if (totalLost > 0) {
      var why = [];
      if (noQ.length) why.push(noQ.map(function (x) { return x.name + '整科 ' + x.lost + ' 分'; }).join('、'));
      if (mismatch.length) why.push(mismatch.map(function (x) { return x.name + '记录差 ' + x.diff + ' 分'; }).join('、'));
      H.push('<div class="sa-block">' +
        '<div class="sa-title">分数丢在哪 <span>全科共丢 ' + totalLost + ' 分</span></div>' +
        '<div class="sa-insight">' + (hasTiers
          ? tierWord[mainTier] + '丢得最多：<b>' + r1(lossSum[mainTier]) + ' 分</b>，占丢分的 ' + share(lossSum[mainTier]) + '%。'
          : '没有逐题明细，丢分无法细分到简单/中档/难题。') + '</div>' +
        '<div class="sa-chart sa-chart-loss" id="saChartLoss"></div>' +
        '<div class="sa-legend">' + ['易', '中', '难'].filter(function (k) { return lossSum[k] > 0; }).map(function (k) {
          return '<span><i class="sa-dot" style="background:' + (k === '易' ? '#ff8f8f' : k === '中' ? '#ffd479' : '#9aa7c4') + '"></i>' +
            tierWord[k] + ' ' + r1(lossSum[k]) + ' 分（' + share(lossSum[k]) + '%）</span>';
        }).join('') +
          (unSplit > 0 ? '<span><i class="sa-dot" style="background:#5c6784"></i>未细分 ' + unSplit + ' 分</span>' : '') + '</div>' +
        '<div class="sa-tip">难易是试卷给每道题的标注。' +
          (unSplit > 0 ? '“未细分”= 没有逐题明细的部分（' + (why.length ? why.join('；') : '未提供逐题明细') + '）。' : '') + '</div>' +
        '</div>');
    }

    /* 四、先补什么最划算（每条写出：丢分来源 × 经验比例 = 可追回） */
    var plan = m.plan || [];
    var sumRec = function (arr) { return Math.round(arr.reduce(function (a, b) { return a + b.rec; }, 0)); };
    var typeWord = function (t) {
      return { '主观题': '大题', '单选题': '选择题', '多选题': '多选题', '英语作文题': '作文', '作文题': '作文' }[t] || t;
    };
    var actionText = function (it) {
      var q = /^易题全回收：(.+)$/.exec(it.what);
      if (q) return '把 ' + q[1].split('、').length + ' 道简单错题弄懂';
      var mt = /^(.+?)中档专项$/.exec(it.what);
      if (mt) return '专攻' + typeWord(mt[1]) + '里的中档题';
      var kp = /^补重点薄弱：(.+)$/.exec(it.what);
      if (kp) return '弄懂重点知识：' + kp[1];
      return it.what;
    };
    var rawByName = {};
    (d.subjects || []).forEach(function (sr) { rawByName[sr.name || sr.key] = sr; });
    var midLossOfType = function (name, type) {
      var sr = rawByName[name]; if (!sr) return 0;
      var sum = 0;
      (sr.questions || []).forEach(function (q) {
        if (q.type === type && q.diff === '中') sum += Math.max(0, (q.point || 0) - (q.score || 0));
      });
      return sum;
    };
    var subjOf = function (name) {
      for (var i = 0; i < subs.length; i++) if (subs[i].name === name) return subs[i];
      return null;
    };
    var srcOf = function (it) {
      var s = subjOf(it.subj); if (!s) return null;
      if (it.tag === 'R2') {
        var loss = s.loss['易'];
        return { pct: loss ? it.rec / loss : 0,
          note: '简单题丢 ' + r1(loss) + ' 分 × ' + Math.round(GIAnalyze.RULES.recEasy * 100) + '% → 追回 ' + r1(it.rec) + ' 分' };
      }
      if (it.tag === 'R3') {
        var mt = /^(.+?)中档专项$/.exec(it.what);
        var type = mt ? mt[1] : '';
        var loss = midLossOfType(it.subj, type);
        return { pct: loss ? it.rec / loss : 0,
          note: '中档题丢 ' + r1(loss) + ' 分 × ' + Math.round(GIAnalyze.RULES.recMid * 100) + '% → 追回 ' + r1(it.rec) + ' 分' };
      }
      if (it.tag === 'R6' && s.kp) {
        var mid = s.loss['中'];
        var n = s.kp.keyWeakN || 1;
        var cap = GIAnalyze.RULES.recKpCap;
        var per = Math.min(cap, mid * GIAnalyze.RULES.recMid / n);
        return { pct: cap ? per / cap : 0,
          note: '中档丢 ' + r1(mid) + ' 分 × ' + Math.round(GIAnalyze.RULES.recMid * 100) + '% ÷ ' + n + ' 条重点 = ' + r1(per) + ' 分/条（上限 ' + cap + ' 分）' };
      }
      return null;
    };
    var actRow = function (it, i) {
      var href = it.link ? d._base + 'data/analysis/' + it.link.replace(/^md\//, '').replace(/ \((\d+)\)\.md$/, '-$1.html') : '';
      var nos = String(it.what).match(/第\d+题/g) || [];
      var src = srcOf(it);
      return '<div class="sa-act">' +
        '<span class="sa-act-rank">' + (i + 1) + '</span>' +
        '<div class="sa-act-body">' +
          '<div class="sa-act-line"><b>' + esc(it.subj) + '</b><span class="sa-act-what" title="' + esc(actionText(it)) + '">' + esc(actionText(it)) + '</span></div>' +
          (nos.length ? '<div class="sa-act-sub">' + nos.slice(0, 6).map(function (n) { return '<span>' + n + '</span>'; }).join('') +
            (nos.length > 6 ? '<span>等 ' + nos.length + ' 道</span>' : '') + '</div>' : '') +
          (src ? '<div class="sa-src"><div class="sa-src-bar"><i style="width:' + Math.max(2, Math.min(100, Math.round(src.pct * 100))) + '%"></i></div>' +
            '<div class="sa-src-note">' + esc(src.note) + '</div></div>' : '') +
        '</div>' +
        '<div class="sa-act-side"><b>+' + r1(it.rec) + '</b> 分' +
          (href ? '<a href="' + encodeURI(href) + '" target="_blank" rel="noopener">看解析 ↗</a>' : '') + '</div>' +
      '</div>';
    };
    if (plan.length) {
      var top = plan.slice(0, 6), rest = plan.slice(6);
      var listedSum = sumRec(plan);
      var totalN = m.planTotal || plan.length;
      var listWord = totalN > plan.length
        ? '本次共 ' + totalN + ' 项机会，本页列出最划算的 ' + plan.length + ' 件'
        : '本页列出全部 ' + plan.length + ' 件';
      H.push('<div class="sa-block">' +
        '<div class="sa-title">先补什么最划算 <span>每条都写出算式</span></div>' +
        '<div class="sa-insight">全科上限 +' + potential + ' 分 = 简单题丢 ' + r1(lossSum['易']) + ' 分 × ' + Math.round(GIAnalyze.RULES.recEasy * 100) + '% + 中档题丢 ' + r1(lossSum['中']) + ' 分 × ' + Math.round(GIAnalyze.RULES.recMid * 100) + '%（难题、未细分不计）；' + listWord + '，约 +' + listedSum + ' 分，先做前 ' + top.length + ' 件约 +' + sumRec(top) + ' 分。</div>' +
        '<div class="sa-acts">' + top.map(function (it, i) { return actRow(it, i); }).join('') + '</div>' +
        (rest.length ? '<details class="sa-more"><summary>展开另外 ' + rest.length + ' 项（约 +' + sumRec(rest) + ' 分）</summary>' +
          '<div class="sa-acts">' + rest.map(function (it, i) { return actRow(it, 6 + i); }).join('') + '</div></details>' : '') +
        '<div class="sa-tip">比例是经验估计，做到才算，不是承诺；全部做到约可到 ' + r1(o.score + (o.potential || 0)) + ' / ' + o.full + ' 分。</div></div>');
    }

    /* 五、每科细看（卡片：分数段徽标 + 丢分构成条 + 知识点弱项条） */
    var actWords = { R2: '先补简单题', R6: '重点知识没掌握', R5: '知识漏洞多', R3: '主攻中档题', R4: '难题失分属正常' };
    var card = function (s) {
      var seg, cs = [];
      if (s.hasQ) {
        var tot = s.loss['易'] + s.loss['中'] + s.loss['难'];
        if (tot > 0) {
          var gapLoss = r1(Math.max(0, s.lost - tot));
          var denom = s.lost > 0 ? s.lost : tot;
          seg = '<div class="sa-stack">' + [['易', 's0'], ['中', 's1'], ['难', 's2']].map(function (kv) {
            var l = s.loss[kv[0]]; if (!l) return '';
            var w = l / denom * 100;
            return '<i class="' + kv[1] + '" style="width:' + w.toFixed(1) + '%" title="' + kv[0] + '题丢 ' + r1(l) + ' 分">' + r1(l) + '</i>';
          }).join('') +
            (gapLoss > 0.05 ? '<i class="s3" style="width:' + (gapLoss / denom * 100).toFixed(1) + '%" title="逐题记录差 ' + gapLoss + ' 分（以总分为准）">' + gapLoss + '</i>' : '') + '</div>' +
          '<div class="sa-stack-legend"><span><i style="background:#ff8f8f"></i>简单 ' + r1(s.loss['易']) + '</span>' +
            '<span><i style="background:#ffd479"></i>中档 ' + r1(s.loss['中']) + '</span>' +
            '<span><i style="background:#9aa7c4"></i>难题 ' + r1(s.loss['难']) + '</span>' +
            (gapLoss > 0.05 ? '<span><i style="background:#5c6784"></i>记录差 ' + gapLoss + '</span>' : '') + '</div>';
        } else {
          seg = s.lost > 0
            ? '<div class="sa-card-note">逐题明细缺失，共丢 ' + s.lost + ' 分</div>'
            : '<div class="sa-card-note">这次没有丢分</div>';
        }
      } else {
        seg = '<div class="sa-card-note">没有逐题记录，只能看总分</div>';
      }
      ['R2', 'R6', 'R5', 'R3', 'R4'].forEach(function (k) {
        if (cs.length < 2 && s.concls.some(function (c) { return c.tag === k; })) cs.push(actWords[k]);
      });
      var kp = '';
      if (s.kp && s.kp.top.length) {
        kp = '<div class="sa-kp">' + s.kp.top.slice(0, 3).map(function (k) {
          return '<div class="sa-krow"><span class="sa-kname">' + (k.key ? '★ ' : '') + esc(String(k.name).split('>').pop()) + '</span>' +
            '<div class="sa-kbar"><i style="width:' + Math.min(100, k.rate || 0) + '%"></i></div>' +
            '<span class="num">' + (k.rate === null || k.rate === undefined ? '–' : k.rate + '%') + '</span></div>';
        }).join('') + '</div>';
      }
      return '<div class="sa-card">' +
        '<div class="sa-card-h"><b>' + esc(s.name) + '</b><span class="sa-band ' + s.cls + '">' + s.p + '% · ' + s.band + '</span></div>' +
        '<div class="sa-card-s">' + s.score + ' / ' + s.full + ' 分 · 丢 ' + s.lost + ' 分</div>' +
        seg +
        (cs.length ? '<div class="sa-chips">' + cs.map(function (t) { return '<span class="sa-chip">' + t + '</span>'; }).join('') + '</div>' : '') +
        kp + '</div>';
    };
    H.push('<div class="sa-block">' +
      '<div class="sa-title">每科细看 <span>色块越宽＝该项丢得越多 · 知识点只列最弱的 3 条</span></div>' +
      '<div class="sa-grid">' + subs.map(card).join('') + '</div></div>');

    /* 六、看图须知：数据来源与缺口（说人话，不用术语） */
    var notes = [];
    if (noQ.length) notes.push(noQ.map(function (x) { return x.name; }).join('、') + ' 没有逐题记录，只统计了总分，无法细分到难易档。');
    if (mismatch.length) notes.push(mismatch.map(function (x) { return x.name; }).join('、') + ' 的逐题丢分合计与总丢分相差 ' + mismatch.map(function (x) { return x.diff; }).join('、') + ' 分（记录差异），以总分为准。');
    notes.push('知识点掌握率只有 ' + (kpNames.join('、') || '无科目') + ' 提供；其他科没有这项数据，不代表没问题。');
    notes.push('等级按得分比例：A 85% 以上、B 70–85%、C 60–70%、D 40–60%、E 40% 以下。');
    notes.push('“能追回”按经验比例折算：简单题按丢分的 80%、中档题按 50%；重点知识按中档可追回额均摊到重点条数，单条上限 8 分。每行已写出算式。');
    H.push('<details class="sa-bounds"><summary>看图须知：数字从哪来、哪里没有数据</summary><div>' +
      '<p>· 所有数字都来自本场考试的逐题成绩单；没有的数据不猜。</p>' +
      notes.map(function (t) { return '<p>· ' + esc(t) + '</p>'; }).join('') +
      '</div></details>' +
      '<div class="sa-foot">图表由本场成绩实时生成，与原始分数一一对应。</div>');

    sb.innerHTML = H.join('');

    /* 图表延迟到标签页可见时再画（隐藏容器量不到宽高） */
    function paint() {
      if (!window.GICharts || !GICharts.paint) return;
      GICharts.paint('saChartSubj', {
        animationDuration: 400,
        grid: { left: 4, right: 100, top: 10, bottom: 6, containLabel: true },
        tooltip: {
          trigger: 'axis', axisPointer: { type: 'shadow' },
          backgroundColor: 'rgba(20, 15, 50, 0.95)', borderColor: 'rgba(100, 180, 255, 0.45)',
          textStyle: { color: '#e8ecf4', fontSize: 12 },
          formatter: function (ps) {
            var s = subs[ps[0].dataIndex];
            return '<b>' + esc(s.name) + '</b><br>' + s.score + ' / ' + s.full + ' 分（' + s.p + '%）· 等级 ' + s.band +
              '<br>距满分 ' + r1(s.full - s.score) + ' 分';
          }
        },
        xAxis: {
          type: 'value', min: 0, max: maxFull,
          axisLabel: { color: '#9aa7c4', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(100, 180, 255, 0.12)' } },
          axisLine: { show: false }, axisTick: { show: false }
        },
        yAxis: {
          type: 'category', inverse: true, data: subs.map(function (s) { return s.name; }),
          axisLabel: { color: '#e8ecf4', fontSize: 12 },
          axisTick: { show: false }, axisLine: { show: false }
        },
        series: [
          {
            name: '满分', type: 'bar', barWidth: 16, silent: true, z: 1,
            data: subs.map(function (s) { return s.full; }),
            itemStyle: { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.28)', borderWidth: 1, borderRadius: 4 }
          },
          {
            name: '得分', type: 'bar', barWidth: 16, barGap: '-100%', z: 2,
            data: subs.map(function (s) { return { value: s.score, itemStyle: { color: colorOf[s.cls], borderRadius: [0, 4, 4, 0] } }; }),
            label: {
              show: true, position: 'right', color: '#e8ecf4', fontSize: 11, distance: 6,
              formatter: function (p) { var s = subs[p.dataIndex]; return s.score + ' / ' + s.full + ' · ' + s.p + '%'; }
            }
          }
        ]
      });
      if (totalLost > 0) {
        var lc = [
          { n: '简单题', v: r1(lossSum['易']), c: '#ff8f8f', t: '#1a1030' },
          { n: '中档题', v: r1(lossSum['中']), c: '#ffd479', t: '#1a1030' },
          { n: '难题', v: r1(lossSum['难']), c: '#9aa7c4', t: '#1a1030' }
        ];
        if (unSplit > 0) lc.push({ n: '未细分', v: unSplit, c: '#5c6784', t: '#e8ecf4' });
        var segs = lc.filter(function (x) { return x.v > 0; });
        GICharts.paint('saChartLoss', {
          animationDuration: 400,
          grid: { left: 0, right: 0, top: 6, bottom: 6 },
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(20, 15, 50, 0.95)', borderColor: 'rgba(100, 180, 255, 0.45)',
            textStyle: { color: '#e8ecf4', fontSize: 12 },
            formatter: function (p) { return p.name + '：' + p.value + ' 分（占丢分 ' + Math.round(p.value / totalLost * 100) + '%）'; }
          },
          xAxis: { type: 'value', max: totalLost, show: false },
          yAxis: { type: 'category', data: ['丢分'], show: false },
          series: segs.map(function (x, i) {
            var first = i === 0, last = i === segs.length - 1;
            return {
              name: x.n, type: 'bar', stack: 'loss', data: [x.v], barWidth: 30,
              itemStyle: { color: x.c, borderRadius: first ? [6, 0, 0, 6] : (last ? [0, 6, 6, 0] : 0) },
              label: { show: x.v / totalLost >= 0.12, position: 'inside', color: x.t, fontSize: 11, formatter: '{c}' }
            };
          })
        });
      }
      if (d.balance && Array.isArray(d.balance.axes) && Array.isArray(d.balance.series)) {
        var bal = d.balance;
        var radarData = bal.series.map(function (s) {
          return {
            name: s.label || s.key,
            value: s.values,
            lineStyle: { color: s.color, width: s.key === 'usual' ? 3 : 2 },
            itemStyle: { color: s.color },
            symbol: 'circle', symbolSize: s.key === 'usual' ? 5 : 4,
            areaStyle: s.key === 'usual' ? { color: s.color, opacity: 0.16 } : undefined
          };
        });
        GICharts.paint('saChartBalance', {
          animationDuration: 400,
          color: bal.series.map(function (s) { return s.color; }),
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(20, 15, 50, 0.95)', borderColor: 'rgba(100, 180, 255, 0.45)',
            textStyle: { color: '#e8ecf4', fontSize: 12 },
            formatter: function (p) {
              var v = p.value || [];
              var lines = bal.axes.map(function (a, i) { return a + '：' + (v[i] == null ? '–' : v[i]); }).join('<br>');
              return '<b>' + p.name + '</b>（相对水平）<br>' + lines +
                '<br><span style="color:#9aa7c4">相对水平；年级中等不可反推具体分数</span>';
            }
          },
          legend: { bottom: 0, data: bal.series.map(function (s) { return s.label || s.key; }), textStyle: { color: '#9aa7c4', fontSize: 11 }, itemWidth: 14, itemHeight: 8, icon: 'roundRect' },
          radar: {
            indicator: bal.axes.map(function (a) { return { name: a, max: 100 }; }),
            radius: '58%', center: ['50%', '44%'],
            axisName: { color: '#9aa7c4', fontSize: 11 },
            splitArea: { areaStyle: { color: ['rgba(100,180,255,0.03)', 'rgba(100,180,255,0.06)'] } },
            axisLine: { lineStyle: { color: 'rgba(100,180,255,0.18)' } },
            splitLine: { lineStyle: { color: 'rgba(100,180,255,0.18)' } }
          },
          series: [{ type: 'radar', symbolSize: 4, data: radarData }]
        });
      }
    }
    window.GISysPanel = { reveal: paint };
    if (document.getElementById('xp-sys') && document.getElementById('xp-sys').classList.contains('on')) paint();
  }

  /* ---------- 录入表单（记录页内嵌，默认收起） ---------- */
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

  function entryFormHtml(state) {
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

    return html;
  }

  function bindEntryForm(state) {
    var dateIn = document.getElementById('fDate');
    var termIn = document.getElementById('fTerm');
    var exam = editingId ? S.getExam(editingId) : null;
    if (!exam) {
      dateIn.addEventListener('change', function () {
        if (!termTouched) termIn.value = autoTerm(dateIn.value);
      });
    }
    termIn.addEventListener('change', function () { termTouched = true; });

    document.querySelectorAll('#view-records .subject-row').forEach(function (row) {
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

    document.getElementById('fCancel').addEventListener('click', function () {
      entryOpen = false; editingId = null;
      renderRecords();
    });
    if (exam) {
      document.getElementById('fDelete').addEventListener('click', function () {
        if (confirm('确定删除「' + exam.name + '」？')) {
          S.deleteExam(exam.id);
          editingId = null; entryOpen = false;
          toast('已删除');
          renderRecords();
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
    document.querySelectorAll('#view-records .subject-row').forEach(function (row) {
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
    var v = S.validateExam(exam, state, editingId);
    if (v.errors.length) { toast(v.errors[0]); return; }
    if (v.warnings.length && !confirm(v.warnings.join('\n') + '\n\n仍要保存吗？')) return;

    S.upsertExam(exam);
    var wasEditing = !!editingId;
    editingId = null;
    entryOpen = false;
    toast(wasEditing ? '已更新' : '已保存，报告已更新');
    renderRecords();
  }

  /* ================= 设置（齿轮弹层） ================= */
  function openSettingsSheet() {
    var state = S.load();
    var body = document.getElementById('modalBody');
    var html = '<div class="modal-head"><div><h3>⚙️ 设置</h3>' +
      '<div class="modal-sub">学生与目标 · 科目 · 数据管理</div></div>' +
      '<button class="modal-close" id="mdClose">✕</button></div>';
    html += settingsInnerHtml(state);
    body.innerHTML = html;
    document.getElementById('modalOverlay').classList.add('active');
    setDetailSheet(false);
    document.getElementById('mdClose').addEventListener('click', closeModal);
    bindSettingsEvents(state);
  }

  function settingsInnerHtml(state) {
    var st = state.student;
    var html = '<div class="card"><h3><span class="h-ico">🎓</span>学生与目标</h3><div class="form-grid">' +
      '<div class="form-row"><label>姓名</label><input class="gi-input" id="stName" value="' + esc(st.name) + '" maxlength="20"></div>' +
      '<div class="form-2col">' +
      '<div class="form-row"><label>高一入学年份（用于自动推算学段）</label><input class="gi-input" id="stEnroll" type="number" step="1" inputmode="numeric" min="2000" max="2100" value="' + esc(st.enrollYear) + '"></div>' +
      '<div class="form-row"><label>高考目标总得分率（%）</label><input class="gi-input" id="stTarget" type="number" step="1" inputmode="decimal" min="10" max="100" value="' + Math.round(st.targetRate * 100) + '"></div>' +
      '</div>' +
      '<div class="btn-row"><button class="btn primary" id="stSave">💾 保存设置</button></div>' +
      '<div class="small-note">参考：特控线水平约 75%~80%，985 中游约 85%，清北复交需 90%+（因省而异，仅作设定锚点）。</div>' +
      '</div></div>';

    html += '<div class="card"><h3><span class="h-ico">📚</span>科目与默认满分</h3>' +
      '<div class="card-desc">按学校实际情况改默认满分；高一下选科后，可删掉不选的科目、加上体育/信息等自定义科目。科目 key 一旦产生历史数据就不可改。</div>' +
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

    html += '<div class="card"><h3><span class="h-ico">💾</span>数据管理（本地 + 快照备份）</h3>' +
      '<div class="card-desc">数据保存在本机浏览器，并自动同步到云端（见下方）。导出快照仍可作为离线备份手段。</div>' +
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

    html += '<div class="card"><h3><span class="h-ico">☁️</span>云端同步</h3>' +
      '<div class="card-desc">数据自动同步到站点部署平台（Netlify），换设备打开即最新。本地始终第一落点，断网不影响录入；演示数据不上传。</div>' +
      '<div class="small-note" id="syncStatus">' + S.syncStatusText() + '</div>' +
      '<div class="btn-row mt8">' +
      '<button class="btn" id="dmSyncUp">⬆️ 上传本地到云端</button>' +
      '<button class="btn" id="dmSyncDown">⬇️ 恢复云端数据</button>' +
      '</div></div>';

    html += '<div class="card"><h3><span class="h-ico">ℹ️</span>关于</h3>' +
      '<div class="dim" style="font-size:14px">XBrain · grade-insight 高中成绩跟踪分析。纯静态零构建，数据三重归一（得分率/排名百分位/相对均分）跨考试可比。' +
      '分析结论由规则引擎生成，趋势外推仅供参考，不构成任何升学承诺。</div>' +
      '<div class="btn-row"><a class="btn" href="../index.html">← 返回 XBrain 门户</a></div></div>';
    return html;
  }

  function bindSettingsEvents(state) {
    document.getElementById('stSave').addEventListener('click', function () {
      var name = document.getElementById('stName').value.trim() || '学生';
      var ey = parseInt(document.getElementById('stEnroll').value, 10);
      var tg = parseFloat(document.getElementById('stTarget').value);
      state.student.name = name;
      if (ey >= 2000 && ey <= 2100) state.student.enrollYear = ey;
      if (tg >= 10 && tg <= 100) state.student.targetRate = tg / 100;
      S.save();
      toast('设置已保存');
      openSettingsSheet();
    });

    document.querySelectorAll('#modalBody .sub-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.setting-subject-row');
        var key = row.getAttribute('data-key');
        var name = row.querySelector('.sub-name').value;
        if (state.subjects.length <= 1) { toast('至少保留一个科目'); return; }
        if (confirm('删除科目「' + name + '」？已有考试中该科数据仍保留在历史记录里。')) {
          S.removeSubject(key);
          openSettingsSheet();
        }
      });
    });
    document.getElementById('subSave').addEventListener('click', function () {
      document.querySelectorAll('#modalBody .setting-subject-row').forEach(function (row) {
        S.updateSubject(row.getAttribute('data-key'), {
          name: row.querySelector('.sub-name').value.trim(),
          full: parseFloat(row.querySelector('.sub-full').value)
        });
      });
      toast('科目已保存');
      openSettingsSheet();
    });
    document.getElementById('newSubAdd').addEventListener('click', function () {
      var n = document.getElementById('newSubName').value.trim();
      var f = parseFloat(document.getElementById('newSubFull').value);
      if (!n) { toast('请填写科目名'); return; }
      if (!f || f <= 0) { toast('请填写有效满分'); return; }
      S.addSubject(n, f);
      openSettingsSheet();
    });

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
      openSettingsSheet();
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
          navigate('report');
        } catch (err) {
          toast('导入失败：' + err.message);
        }
      });
    });
    document.getElementById('dmSyncUp').addEventListener('click', function () {
      S.syncUp().then(function () {
        toast('已上传到云端');
        openSettingsSheet();
      }).catch(function (err) {
        toast('上传失败：' + err.message);
        openSettingsSheet();
      });
    });
    document.getElementById('dmSyncDown').addEventListener('click', function () {
      S.syncDown().then(function (st) {
        toast('已恢复云端数据，共 ' + st.exams.length + ' 场考试');
        openSettingsSheet();
      }).catch(function (err) {
        toast('恢复失败：' + err.message);
      });
    });
    document.getElementById('dmLoadSample').addEventListener('click', function () {
      if (confirm('载入示例数据将覆盖当前全部数据，确定？')) {
        S.loadSample();
        entryOpen = false; editingId = null;
        closeModal();
        toast('示例数据已载入');
        navigate('report');
      }
    });
    document.getElementById('dmClear').addEventListener('click', function () {
      if (confirm('确定清空全部数据？此操作不可恢复，建议先导出备份。')) {
        if (confirm('再次确认：真的要清空吗？')) {
          S.clearAll();
          entryOpen = false; editingId = null;
          closeModal();
          toast('已清空');
          navigate('report');
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
    setDetailSheet(false);
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
    /* Tab 点击接管（事件委托，覆盖图标/文字子元素） */
    document.getElementById('tabbar').addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[data-route]') : null;
      if (!a) return;
      e.preventDefault();
      navigate(a.getAttribute('data-route'));
    });
    var gear = document.getElementById('btnGear');
    if (gear) gear.addEventListener('click', openSettingsSheet);
    S.load();
    if (!location.hash) {
      try { history.replaceState(null, '', '#report'); } catch (e) { location.hash = '#report'; }
    }
    onRoute();
    /* 浏览器前进/后退、手动改 URL、外链深链仍走 hash/popstate 同步 */
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('popstate', onRoute);
    /* 云端较新数据落地后重渲染当前视图（SPEC-2026-0006） */
    document.addEventListener('gi:remote-applied', onRoute);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 暴露给内联调用 */
  window.GIApp = { toast: toast, startEntry: startEntry, openExamModal: openExamModal, navigate: navigate, openSettingsSheet: openSettingsSheet };
})();
