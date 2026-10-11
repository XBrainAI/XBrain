/* ============================================================
   grade-insight · 存储层
   - 主存储：localStorage（键 xbrain_grade_insight_v1），第一落点
   - 云端镜像：Netlify Blobs（经同域端点自动同步，SPEC-2026-0006）
   - 种子：js/data.js 的 window.GRADE_SNAPSHOT（首次打开载入）
   - 导出：data.js 快照文本 / JSON 备份（离线备份手段，保留）；导入两者皆收
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
          full: numOrNull(s.full),
          score: numOrNull(s.score),
          avgClass: numOrNull(s.avgClass),
          avgGrade: numOrNull(s.avgGrade),
          rank: numOrNull(s.rank),
          rankSize: numOrNull(s.rankSize),
          level: s.level || null
        };
      }),
      totalRank: numOrNull(e.totalRank),
      totalRankSize: numOrNull(e.totalRankSize)
    };
  }

  function makeExamId(e) {
    return String(e.date || '') + '-' + String(e.name || '').replace(/\s+/g, '');
  }

  /* 数值归一：空值 → null；非有限数（NaN/Infinity，导入脏数据）→ null，按缺考口径处理 */
  function numOrNull(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
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
        pullSoon();
        return _state;
      } catch (err) { /* 损坏则回落种子 */ }
    }
    _state = seedState();
    save();
    pullSoon();
    return _state;
  }

  /* 纯写本地（不改 lastModified、不触发上传）：远端数据落本地专用 */
  function saveLocal() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(_state));
    } catch (err) {
      if (window.GIApp && GIApp.toast) GIApp.toast('本地存储失败：' + err.message);
    }
  }

  function save() {
    _state = _state || load();
    _state.lastModified = new Date().toISOString();
    saveLocal();
    pullSoon();   /* 未登录时为空操作；登录后首次操作即与云端对账 */
    schedulePush();
    return _state;
  }

  function replaceAll(newState) {
    _state = normalizeState(newState);
    save();
    return _state;
  }

  /* ---------- 录入校验 ----------
     返回 { errors:[], warnings:[] }
     excludeId：编辑场景下豁免自身（新建场景传 null/省略，同日同名一律判重） */
  function validateExam(exam, state, excludeId) {
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
      if (s.full !== null && s.full !== undefined && s.full <= 0) errors.push(nm + '：满分必须大于 0');
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

    /* 同日同名判重（编辑时经 excludeId 豁免自身；新建考试 id 由日期+名称派生，
       若沿用旧的"按 id 排除自身"写法，新建撞车会被误判为编辑而静默覆盖） */
    var dup = state.exams.some(function (e) {
      return e.id !== excludeId && e.date === exam.date && e.name === exam.name;
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
     距上次导出 > 14 天 且 之后有修改 → 建议导出（示例数据无需备份） */
  function backupNeeded(state) {
    if (state.isSample || !state.exams.length) return false;
    if (!state.lastExportAt) return true;
    var days = (Date.now() - new Date(state.lastExportAt).getTime()) / 86400000;
    var modifiedAfterExport = new Date(state.lastModified).getTime() > new Date(state.lastExportAt).getTime();
    return days > 14 && modifiedAfterExport;
  }

  /* ---------- 云端同步（SPEC-2026-0006） ----------
     本地 localStorage 永远第一落点，云端为异步镜像：录入永不因网络阻塞。
     file:// 本地调试跳过；演示数据（isSample）不上传。
     冲突整档案按 lastModified 新者胜：云端较新时服务端拒绝写入（409），
     前端提示且本地不丢，可经设置弹层手动恢复——绝不静默覆盖。 */
  var SYNC_URL = '/.netlify/functions/grade-store';
  var SYNC_STATUS_KEY = 'xbrain_grade_sync_status_v1';
  var PUSH_DEBOUNCE_MS = 2000;
  var _pushTimer = null;
  var _pushInflight = false;
  var _pullDone = false;

  function syncEnabled() {
    try { return location.protocol !== 'file:'; } catch (err) { return false; }
  }

  /* 凭证复用既有 XBrainAuth 子站会话（brand/auth.js 登录成功后
     session.token = sha256hex(密码)；键构造与 auth.js getSessionKey('sub','grade') 同源）。
     不新增任何凭证；会话过期（默认 7 天）后重新过密码门即自愈。 */
  function authToken() {
    try {
      var raw = localStorage.getItem('xbrain_auth_sub_grade');
      if (!raw) return null;
      var s = JSON.parse(raw);
      return s && s.token ? String(s.token) : null;
    } catch (err) { return null; }
  }

  function getSyncStatus() {
    try { return JSON.parse(localStorage.getItem(SYNC_STATUS_KEY)) || {}; }
    catch (err) { return {}; }
  }

  function markSynced() {
    try {
      localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({ lastSyncAt: new Date().toISOString() }));
    } catch (err) { /* 状态持久化失败不影响同步本身 */ }
  }

  function markSyncError(err) {
    var msg = String((err && err.message) || err || '未知错误');
    try {
      var st = getSyncStatus();
      st.lastError = msg;
      localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(st));
    } catch (err2) { /* 同上 */ }
    return msg;
  }

  function syncToast(msg) {
    if (window.GIApp && GIApp.toast) GIApp.toast(msg);
  }

  function syncHeaders() {
    var t = authToken();
    return t ? { 'X-GI-Auth': t } : null;
  }

  function buildSyncPayload(state) {
    var p = buildSnapshotPayload(state);
    p.lastModified = state.lastModified;
    return p;
  }

  /* 上传本地快照。resolve 'ok' | 'conflict'；网络/服务端错误 reject。
     401（会话过期）按普通错误记状态，不弹窗——重新登录后自愈。 */
  function pushNow(state) {
    if (_pushInflight) return Promise.resolve('skip');
    var h = syncHeaders();
    if (!h || !state || state.isSample) return Promise.resolve('skip');
    _pushInflight = true;
    return fetch(SYNC_URL, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, h),
      body: JSON.stringify(buildSyncPayload(state))
    }).then(function (res) {
      _pushInflight = false;
      if (res.ok) { markSynced(); return 'ok'; }
      if (res.status === 409) {
        return Promise.resolve('conflict').then(function (r) {
          markSyncError(new Error('云端有更新的数据，本次未覆盖'));
          return r;
        });
      }
      return res.json().catch(function () { return {}; }).then(function (body) {
        throw new Error('HTTP ' + res.status + (body && body.detail ? '：' + body.detail.join('；') : ''));
      });
    }).catch(function (err) {
      _pushInflight = false;
      markSyncError(err);
      throw err;
    });
  }

  function schedulePush() {
    if (!syncEnabled()) return;
    if (_pushTimer) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(function () {
      _pushTimer = null;
      if (_state) pushNow(_state).then(function (r) {
        if (r === 'conflict') syncToast('云端已有更新的数据，本次未覆盖；可在设置 → 云端同步中恢复');
      }).catch(function () { /* 失败已记状态，下次保存自动重试 */ });
    }, PUSH_DEBOUNCE_MS);
  }

  /* 远端快照落本地：normalize 兜底（损坏/缺字段不白屏），只写本地不回推 */
  function applyRemote(snapshot) {
    _state = normalizeState(snapshot);
    saveLocal();
    try { document.dispatchEvent(new CustomEvent('gi:remote-applied')); } catch (err) { /* 非页面环境 */ }
    return _state;
  }

  /* 打开/首次保存时与云端对账一次：云端空则初始化上传；
     云端较新则拉取覆盖；本地较新（离线期间改过）则推上去。 */
  function pullSoon() {
    if (_pullDone || !syncEnabled()) return;
    var h = syncHeaders();
    if (!h) return; /* 未登录：不消耗对账标记，登录后下次 load/save 再试 */
    _pullDone = true;
    var local = _state;
    if (!local || local.isSample) return;
    fetch(SYNC_URL, { method: 'GET', headers: h }).then(function (res) {
      if (res.status === 404) {
        if (local.exams.length) return pushNow(local).then(function () { return null; });
        return null;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().then(function (remote) {
        var rnorm = normalizeState(remote);
        var rT = new Date(rnorm.lastModified).getTime();
        var lT = new Date(local.lastModified).getTime();
        if (rT > lT) {
          applyRemote(rnorm);
          markSynced();
        } else if (lT > rT && local.exams.length && !_pushInflight) {
          return pushNow(local).then(function () { return null; });
        }
        return null;
      });
    }).catch(function (err) { markSyncError(err); });
  }

  /* 手动操作（设置弹层） */
  function syncUp() {
    if (!syncEnabled()) return Promise.reject(new Error('本地调试模式，云同步不可用'));
    var state = load();
    if (state.isSample) return Promise.reject(new Error('当前为演示数据，不上传'));
    return pushNow(state).then(function (r) {
      if (r === 'conflict') throw new Error('云端有更新的数据，未覆盖；可点"恢复云端数据"取回');
      return true;
    });
  }

  function syncDown() {
    if (!syncEnabled()) return Promise.reject(new Error('本地调试模式，云同步不可用'));
    var h = syncHeaders();
    if (!h) return Promise.reject(new Error('未登录，请先通过站点密码门'));
    return fetch(SYNC_URL, { method: 'GET', headers: h }).then(function (res) {
      if (res.status === 404) throw new Error('云端暂无数据');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (remote) {
      applyRemote(remote);
      markSynced();
      return _state;
    });
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function syncStatusText() {
    if (!syncEnabled()) return '本地调试模式（file://），云同步不可用';
    var st = getSyncStatus();
    var txt;
    if (st.lastSyncAt) {
      var d = new Date(st.lastSyncAt);
      txt = '最近同步：' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
        ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    } else {
      txt = '尚未同步过（首次打开或保存时自动进行）';
    }
    if (st.lastError) txt += ' · ⚠️ 上次同步：' + st.lastError;
    return txt;
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
    syncEnabled: syncEnabled,
    syncUp: syncUp,
    syncDown: syncDown,
    getSyncStatus: getSyncStatus,
    syncStatusText: syncStatusText,
    STORE_KEY: STORE_KEY
  };
})();
