/* ============================================================
   grade-insight · 图表封装（vendor/echarts.min.js，本地加载无 CDN 依赖）
   统一品牌主题色（--xb-accent 系），百分比轴、自动 resize、复用销毁。
   ============================================================ */
(function () {
  'use strict';

  var PALETTE = ['#64b4ff', '#7ee2a8', '#ffd479', '#ff8f8f', '#c79bff', '#8fd3ff', '#ffc0dd', '#a0e7c8', '#ffdf9e'];
  var DIM = '#9aa7c4';
  var HINT = '#6f7b96';
  var BORDER = 'rgba(100, 180, 255, 0.18)';

  var registry = {};

  function ready() {
    return typeof window.echarts !== 'undefined';
  }

  function fallbackText(el, msg) {
    el.innerHTML = '<div class="empty-state" style="padding:24px 10px"><div class="es-ico">📉</div>' +
      (msg || '图表库未能加载') + '</div>';
  }

  /* 通用公共配置 */
  function commonGrid(hasZoom) {
    return {
      left: 46, right: 18, top: 34,
      bottom: hasZoom ? 44 : 26,
      containLabel: false
    };
  }

  function axisLabelPct() {
    return { formatter: function (v) { return Math.round(v * 100) + '%'; }, color: DIM, fontSize: 11 };
  }

  /* rate 轴的智能范围：贴数据但不到 0/1 死板边界 */
  function rateAxis() {
    return {
      type: 'value',
      min: function (v) { return Math.max(0, Math.floor((v.min - 0.06) * 50) / 50); },
      max: function (v) { return Math.min(1, Math.ceil((v.max + 0.04) * 50) / 50); },
      axisLabel: axisLabelPct(),
      splitLine: { lineStyle: { color: BORDER } }
    };
  }

  function catAxis(labels) {
    return {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: BORDER } },
      axisTick: { show: false },
      axisLabel: { color: DIM, fontSize: 11, hideOverlap: true }
    };
  }

  function legend(series) {
    if (series.length <= 1) return { show: false };
    return {
      top: 2, right: 6,
      textStyle: { color: DIM, fontSize: 11 },
      itemWidth: 14, itemHeight: 8,
      icon: 'roundRect'
    };
  }

  function tooltipPct() {
    return {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 15, 50, 0.95)',
      borderColor: 'rgba(100, 180, 255, 0.5)',
      textStyle: { color: '#e8ecf4', fontSize: 12 },
      valueFormatter: function (v) { return v === null || v === undefined || isNaN(v) ? '-' : (v * 100).toFixed(1) + '%'; }
    };
  }

  /* ---------- 渲染入口：同容器重复渲染先销毁 ---------- */
  function render(id, option) {
    var el = document.getElementById(id);
    if (!el) return null;
    if (!ready()) { fallbackText(el, 'echarts.min.js 未能加载，图表不可用'); return null; }
    if (registry[id]) { registry[id].dispose(); delete registry[id]; }
    var inst = window.echarts.init(el);
    inst.setOption(option);
    registry[id] = inst;
    return inst;
  }

  /* ---------- 折线（得分率序列，值域 0-1 小数） ---------- */
  function line(id, opts) {
    var series = opts.series.filter(function (s) { return s.data && s.data.some(function (v) { return v !== null; }); });
    if (!series.length) return fallbackText(document.getElementById(id), '暂无可绘制的得分率数据');
    var hasZoom = opts.zoom && opts.xLabels.length > 9;
    render(id, {
      color: PALETTE,
      animationDuration: 300,
      grid: commonGrid(hasZoom),
      legend: legend(series),
      tooltip: tooltipPct(),
      xAxis: catAxis(opts.xLabels),
      yAxis: rateAxis(),
      dataZoom: hasZoom ? [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', height: 16, bottom: 6, borderColor: 'transparent', backgroundColor: 'rgba(100,180,255,0.06)', fillerColor: 'rgba(100,180,255,0.18)', textStyle: { color: HINT, fontSize: 10 } }
      ] : [],
      series: series.map(function (s, i) {
        return {
          name: s.name,
          type: 'line',
          data: s.data,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          connectNulls: true,
          lineStyle: { width: 2.5 },
          emphasis: { focus: 'series' }
        };
      })
    });
  }

  /* ---------- 柱线混搭（相对均分差：柱=总差值） ---------- */
  function barDiff(id, opts) {
    var data = opts.data.filter(function (v) { return v !== null; });
    if (!data.length) return fallbackText(document.getElementById(id), '暂无均分对比数据（录入年级均分后自动出现）');
    render(id, {
      color: PALETTE,
      animationDuration: 300,
      grid: commonGrid(false),
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(20, 15, 50, 0.95)',
        borderColor: 'rgba(100, 180, 255, 0.5)',
        textStyle: { color: '#e8ecf4', fontSize: 12 },
        valueFormatter: function (v) { return v === null || v === undefined || isNaN(v) ? '-' : (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + ' 个百分点'; }
      },
      xAxis: {
        type: 'category',
        data: opts.xLabels,
        axisLine: { lineStyle: { color: BORDER } },
        axisTick: { show: false },
        axisLabel: { color: DIM, fontSize: 11, hideOverlap: true }
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: function (v) { return (v >= 0 ? '' : '') + Math.round(v * 100) + '%'; }, color: DIM, fontSize: 11 },
        splitLine: { lineStyle: { color: BORDER } }
      },
      series: [{
        name: opts.name || '高于均分',
        type: 'bar',
        data: opts.data,
        barMaxWidth: 26,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: function (p) { return p.value >= 0 ? 'rgba(126, 226, 168, 0.75)' : 'rgba(255, 143, 143, 0.75)'; }
        },
        label: { show: opts.xLabels.length <= 12, position: 'top', color: DIM, fontSize: 10, formatter: function (p) { return (p.value >= 0 ? '+' : '') + (p.value * 100).toFixed(1); } }
      }]
    });
  }

  /* ---------- 雷达（最近一次 vs 个人均值，0-1） ---------- */
  function radar(id, opts) {
    if (!opts.indicators.length) return fallbackText(document.getElementById(id), '暂无数据');
    render(id, {
      color: ['#64b4ff', '#ffd479'],
      animationDuration: 300,
      tooltip: {
        backgroundColor: 'rgba(20, 15, 50, 0.95)',
        borderColor: 'rgba(100, 180, 255, 0.5)',
        textStyle: { color: '#e8ecf4', fontSize: 12 }
      },
      legend: {
        bottom: 0,
        textStyle: { color: DIM, fontSize: 11 },
        itemWidth: 14, itemHeight: 8
      },
      radar: {
        indicator: opts.indicators,
        radius: '62%',
        center: ['50%', '48%'],
        axisName: { color: DIM, fontSize: 11 },
        splitArea: { areaStyle: { color: ['rgba(100,180,255,0.03)', 'rgba(100,180,255,0.06)'] } },
        axisLine: { lineStyle: { color: BORDER } },
        splitLine: { lineStyle: { color: BORDER } }
      },
      series: [{
        type: 'radar',
        symbolSize: 4,
        data: opts.series.map(function (s) {
          return { name: s.name, value: s.values, areaStyle: { opacity: 0.12 } };
        })
      }]
    });
  }

  /* ---------- 迷你折线（总览用，无轴简洁风） ---------- */
  function spark(id, opts) {
    render(id, {
      animationDuration: 300,
      grid: { left: 6, right: 6, top: 10, bottom: 6, containLabel: false },
      tooltip: tooltipPct(),
      xAxis: { type: 'category', data: opts.xLabels, show: false, boundaryGap: false },
      yAxis: { type: 'value', show: false, min: function (v) { return Math.max(0, v.min - 0.05); }, max: function (v) { return Math.min(1, v.max + 0.05); } },
      series: [{
        type: 'line',
        data: opts.data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: true,
        lineStyle: { width: 2.5, color: '#64b4ff' },
        itemStyle: { color: '#80c0ff' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(100,180,255,0.35)' },
              { offset: 1, color: 'rgba(100,180,255,0.02)' }
            ]
          }
        }
      }]
    });
  }

  /* ---------- 单科小图网格（科目页） ---------- */
  function sparkSub(id, opts) {
    render(id, {
      animationDuration: 300,
      grid: { left: 4, right: 4, top: 14, bottom: 4, containLabel: false },
      xAxis: { type: 'category', data: opts.xLabels, show: false, boundaryGap: false },
      yAxis: { type: 'value', show: false, min: function (v) { return Math.max(0, v.min - 0.08); }, max: function (v) { return Math.min(1, v.max + 0.08); } },
      series: [{
        type: 'line',
        data: opts.data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        connectNulls: true,
        lineStyle: { width: 2, color: opts.color || '#64b4ff' },
        itemStyle: { color: opts.color || '#64b4ff' }
      }]
    });
  }

  /* ---------- resize 全量 ---------- */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      Object.keys(registry).forEach(function (id) {
        try { registry[id].resize(); } catch (e) { /* 忽略 */ }
      });
    }, 150);
  });

  window.GICharts = {
    PALETTE: PALETTE,
    line: line,
    barDiff: barDiff,
    radar: radar,
    spark: spark,
    sparkSub: sparkSub,
    ready: ready
  };
})();
