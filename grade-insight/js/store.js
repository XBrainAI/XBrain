/* ============================================================
   grade-insight · 存储层
   - 主存储：localStorage（键 xbrain_grade_insight_v1）
   - 种子：js/data.js 的 window.GRADE_SNAPSHOT（首次打开载入）
   - 导出：data.js 快照文本 / JSON 备份；导入两者皆收
   ============================================================ */
(function () {
  'use strict';

  var STORE_KEY = 'xbrain_grade_insight_v1';

  /* ---------- 内部工具 ---------- */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function subjectName(subjects, key) {
    for (var i = 0; i < subjects.length; i++) {
      if (subjects[i].key === key) return subjects[i].name;
    }
    return key;
  }

  /* ---------- 状态初始化 ---------- */
  function seedState() {
    var snap = window.GRADE_SNAPSHOT || {};
    var defaults = window.GI_DEFAULTS || {};
    return normalizeState({
      schema: snap.schema || 1,
      student: snap.student || deepClone(defaults.student || {}),
      subjects: snap.subjects || deepClone(defaults.subjects || []),
      exams: snap.exams || [],
      isSample: !!snap.sample,
      lastExportAt: null,
      lastModified: new Date().toISOString()
    });
  }

  /* 补全字段、合并默认科目配置（导入旧数据兜底） */
  function normalizeState(state) {
    var defaults = window.GI_DEFAULTS || {};
    state.schema = 1;
    state.student = state.student || {};
    if (typeof state.student.name !== 'string') state.student.name = '学生';
    if (typeof state.student.enrollYear !== 'number') state.student.enrollYear = new Date().getFullYear();
    if (typeof state.student.targetRate !== 'number' || state.student.targetRate <= 0 || state.student.targetRate > 1) {
      state.student.targetRate = 0.8;
    }
    state.subjects = Array.isArray(state.subjects) ? state.subjects : [];
    /* 快照缺科目配置时，用默认补齐（按 key 去重） */
    (defaults.subjects || []).forEach(function (d) {
      var found = state.subjects.some(function (s) { return s.key === d.key; });
      if (!found) state.subjects.push(deepClone(d));
    });
    state.subjects = state.subjects.filter(function (s) {
      return s && s.key && s.name && typeof s.full === 'number' && s.full > 0;
    });
    state.exams = Array.isArray(state.exams) ? state.exams : [];
    state.exams = state.exams.map(normalizeExam).filter(Boolean);
    state.isSample = !!state.isSample;
    state.lastExportAt = state.lastExportAt || null;
    state.lastModified = state.lastModified || new Date().toISOString();
    return state;
  }

  function normalizeExam(e) {
    if (!e || !e.name || !e.date) return null;
    return {
      id: e.id || makeExamId(e),
      name: String(e.name),
      date: String(e.date),
      term: e.term || '',
      type: e.type || '其他',
      note: e.note || '',
      subjects: (e.subjects || []).map(function (s) {
        return {
          key: s.key,
          full: typeof s.full === 'number' ? s.full : null,
          score: (s.score === null || s.score === undefined || s.score === '') ? null : Number(s.score),
          avgClass: (s.avgClass === undefined || s.avgClass === null || s.avgClass === '') ? null : Number(s.avgClass),
          avgGrade: (s.avgGrade === undefined || s.avgGrade === null || s.avgGrade === '') ? null : Number(s.avgGrade),
          rank: (s.rank === undefined || s.rank === null || s.rank === '') ? null : Number(s.rank),
          rankSize: (s.rankSize === undefined || s.rankSize === null || s.rankSize === '') ? null : Number(s.rankSize),
          level: s.level || null
        };
      }),
      totalRank: (e.totalRank === undefined || e.totalRank === null || e.totalRank === '') ? null : Number(e.totalRank),
      totalRankSize: (e.totalRankSize === undefined || e.totalRankSize === null || e.totalRankSize === '') ? null : Number(e.totalRankSize)
    };
  }

  function makeExamId(e) {
    return String(e.date || '') + '-' + String(e.name || '').replace(/\s+/g, '');
  }

  /* ---------- 读取 / 保存 ---------- */
  var _state = null;

  function load(force) {
    if (_state && !force) return _state;
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (err) { raw = null; }
    if (raw) {
      try {
        _state = normalizeState(JSON.parse(raw));
        return _state;
      } catch (err) { /* 损坏则回落种子 */ }
    }
    _state = seedState();
    save();
    return _state;
  }

  function save() {
    _state = _state || load();
    _state.lastModified = new Date().toISOString();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(_state));
    } catch (err) {
      if (window.GIApp && GIApp.toast) GIApp.toast('本地存储失败：' + err.message);
    }
    return _state;
  }

  function replaceAll(newState) {
    _state = normalizeState(newState);
    save();
    return _state;
  }

  /* ---------- 录入校验 ----------
     返回 { errors:[], warnings:[] } */
  function validateExam(exam, state) {
    var errors = [], warnings = [];
    if (!exam.name) errors.push('请填写考试名称');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exam.date)) errors.push('请选择考试日期');

    var scored = exam.subjects.filter(function (s) { return s.score !== null; });
    if (scored.length === 0) errors.push('至少要有一个科目填写了得分');

    var subjects = state.subjects;
    scored.forEach(function (s) {
      var nm = subjectName(subjects, s.key);
      if (s.score === null || isNaN(s.score)) {
        errors.push(nm + '：得分不是有效数字');
      } else if (s.score < 0) {
        errors.push(nm + '：得分不能为负数');
      } else if (s.full && s.score > s.full) {
        errors.push(nm + '：得分 ' + s.score + ' 超过满分 ' + s.full);
      }
      if (s.full && (!s.full || s.full <= 0)) errors.push(nm + '：满分必须大于 0');
      if (s.rank !== null && s.rankSize !== null && s.rank > s.rankSize) {
        warnings.push(nm + '：排名 ' + s.rank + ' 大于年级人数 ' + s.rankSize + '，请确认');
      }
      if (s.avgGrade !== null && s.full && s.avgGrade > s.full) {
        warnings.push(nm + '：年级均分超过满分，请确认');
      }
    });

    if (exam.totalRank !== null && exam.totalRankSize !== null && exam.totalRank > exam.totalRankSize) {
      warnings.push('总分排名大于年级人数，请确认');
    }

    /* 同日同名去重（按日期+名称比对，兼容任何 id 方案；编辑时跳过自身） */
    var dup = state.exams.some(function (e) {
      return e.id !== exam.id && e.date === exam.date && e.name === exam.name;
    });
    if (dup) errors.push('已存在同日期同名称的考试记录');

    return { errors: errors, warnings: warnings };
  }

  /* ---------- 导出 ---------- */
  function buildSnapshotPayload(state) {
    return {
      schema: 1,
      sample: false,
      exportedAt: new Date().toISOString(),
      student: state.student,
      subjects: state.subjects,
      exams: state.exams
    };
  }

  /* 生成 data.js 文件文本（提交仓库做备份 / 多设备同步） */
  function buildSnapshotText(state) {
    var payload = buildSnapshotPayload(state);
    return '/* ============================================================\n' +
      '   grade-insight 数据快照\n' +
      '   生成时间：' + payload.exportedAt + '\n' +
      '   由页面「设置 → 导出 data.js 快照」生成，替换 js/data.js 中的\n' +
      '   window.GRADE_SNAPSHOT 并提交仓库即可完成备份 / 多设备同步。\n' +
      '   ============================================================ */\n\n' +
      'window.GRADE_SNAPSHOT = ' + JSON.stringify(payload, null, 2) + ';\n';
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function markExported(state) {
    state.lastExportAt = new Date().toISOString();
    save();
  }

  /* ---------- 导入 ---------- */
  /* 支持：纯 JSON 文本 / data.js 快照文本（含 window.GRADE_SNAPSHOT = {...};） */
  function parseImportText(text) {
    text = String(text || '').trim();
    if (!text) throw new Error('内容为空');
    try {
      return JSON.parse(text);
    } catch (e) { /* 继续尝试快照格式 */ }
    var m = text.match(/window\.GRADE_SNAPSHOT\s*=\s*([\s\S]*?);\s*$/);
    if (!m) throw new Error('无法识别内容：既不是 JSON，也不是 data.js 快照格式');
    return JSON.parse(m[1]);
  }

  function importSnapshot(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('数据格式不正确');
    if (!Array.isArray(payload.exams)) throw new Error('数据缺少 exams 字段');
    var state = load();
    return replaceAll({
      schema: 1,
      student: payload.student || state.student,
      subjects: payload.subjects || state.subjects,
      exams: payload.exams,
      isSample: false,
      lastExportAt: payload.exportedAt || null,
      lastModified: new Date().toISOString()
    });
  }

  /* ---------- 备份提醒 ----------
     距上次导出 > 14 天 且 之后有修改 → 建议导出 */
  function backupNeeded(state) {
    if (!state.exams.length) return false;
    if (!state.lastExportAt) return true;
    var days = (Date.now() - new Date(state.lastExportAt).getTime()) / 86400000;
    var modifiedAfterExport = new Date(state.lastModified).getTime() > new Date(state.lastExportAt).getTime();
    return days > 14 && modifiedAfterExport;
  }

  /* ---------- 增删改 ---------- */
  function upsertExam(exam) {
    var state = load();
    var norm = normalizeExam(exam);
    var idx = state.exams.findIndex(function (e) { return e.id === norm.id; });
    if (idx >= 0) state.exams[idx] = norm; else state.exams.push(norm);
    save();
    return norm;
  }

  function deleteExam(id) {
    var state = load();
    state.exams = state.exams.filter(function (e) { return e.id !== id; });
    save();
  }

  function getExam(id) {
    var state = load();
    for (var i = 0; i < state.exams.length; i++) {
      if (state.exams[i].id === id) return state.exams[i];
    }
    return null;
  }

  function clearAll() {
    _state = {
      schema: 1,
      student: { name: '学生', studentId: 's1', enrollYear: new Date().getFullYear(), targetRate: 0.8 },
      subjects: deepClone((window.GI_DEFAULTS || {}).subjects || []),
      exams: [],
      isSample: false,
      lastExportAt: null,
      lastModified: new Date().toISOString()
    };
    save();
    return _state;
  }

  function loadSample() {
    _state = seedState();
    save();
    return _state;
  }

  /* ---------- 科目配置 ---------- */
  function addSubject(name, full) {
    var state = load();
    var key = 'custom_' + Date.now().toString(36);
    state.subjects.push({ key: key, name: name, full: full });
    save();
    return key;
  }

  function removeSubject(key) {
    var state = load();
    state.subjects = state.subjects.filter(function (s) { return s.key !== key; });
    save();
  }

  function updateSubject(key, patch) {
    var state = load();
    var s = state.subjects.find(function (x) { return x.key === key; });
    if (s) {
      if (patch.name) s.name = patch.name;
      if (patch.full && patch.full > 0) s.full = patch.full;
      save();
    }
  }

  /* ---------- 暴露 ---------- */
  window.GIStore = {
    load: load,
    save: save,
    replaceAll: replaceAll,
    validateExam: validateExam,
    makeExamId: makeExamId,
    buildSnapshotText: buildSnapshotText,
    buildSnapshotPayload: buildSnapshotPayload,
    download: download,
    markExported: markExported,
    parseImportText: parseImportText,
    importSnapshot: importSnapshot,
    backupNeeded: backupNeeded,
    upsertExam: upsertExam,
    deleteExam: deleteExam,
    getExam: getExam,
    clearAll: clearAll,
    loadSample: loadSample,
    addSubject: addSubject,
    removeSubject: removeSubject,
    updateSubject: updateSubject,
    subjectName: subjectName,
    STORE_KEY: STORE_KEY
  };
})();
