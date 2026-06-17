/**
 * XBrain Authentication Module v1.2
 * 共享认证模块 - 支持主站登录 + 子站独立验证
 * 必须在 </body> 前加载，确保 document.body 已存在
 */
(function () {
  'use strict';

  // 防止重复初始化
  if (window.XBrainAuth && window.XBrainAuth.__initialized) return;
  var XBrainAuth = {};
  XBrainAuth.__initialized = true;

  // ===== 立即隐藏 body 内容（防止闪烁） =====
  var authStyle = document.createElement('style');
  authStyle.id = 'xbrain-auth-style';
  authStyle.textContent = 'html.xbrain-auth-hidden body > *:not(#xbrain-auth-overlay) { display: none !important; }';
  document.head.appendChild(authStyle);
  document.documentElement.classList.add('xbrain-auth-hidden');

  // ===== SHA-256 =====
  async function sha256(message) {
    var msgBuffer = new TextEncoder().encode(message);
    var hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // ===== Session Management =====
  function getSessionKey(level, subSiteName) {
    if (level === 'main') return 'xbrain_auth_session';
    return 'xbrain_auth_sub_' + (subSiteName || 'unknown');
  }

  function saveSession(level, passwordHash, duration, unit, subSiteName) {
    var ms = duration;
    if (unit === 'minutes') ms *= 60000;
    else if (unit === 'hours') ms *= 3600000;
    else if (unit === 'days') ms *= 86400000;

    var session = {
      token: passwordHash,
      expires: Date.now() + ms,
      createdAt: Date.now()
    };
    localStorage.setItem(getSessionKey(level, subSiteName), JSON.stringify(session));
  }

  function getSession(level, subSiteName) {
    try {
      var raw = localStorage.getItem(getSessionKey(level, subSiteName));
      if (!raw) return null;
      var session = JSON.parse(raw);
      if (Date.now() > session.expires) {
        localStorage.removeItem(getSessionKey(level, subSiteName));
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  function clearSession(level, subSiteName) {
    localStorage.removeItem(getSessionKey(level, subSiteName));
  }

  // ===== Lockout Management =====
  function getLockoutKey(level, subSiteName) {
    return getSessionKey(level, subSiteName) + '_lockout';
  }

  function recordFailedAttempt(level, maxAttempts, lockoutDuration, lockoutUnit, subSiteName) {
    var key = getLockoutKey(level, subSiteName);
    var attempts = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(attempts));

    if (attempts >= maxAttempts) {
      var ms = lockoutDuration;
      if (lockoutUnit === 'minutes') ms *= 60000;
      else if (lockoutUnit === 'hours') ms *= 3600000;
      else if (lockoutUnit === 'days') ms *= 86400000;
      localStorage.setItem(key + '_until', String(Date.now() + ms));
    }
  }

  function isLockedOut(level, subSiteName) {
    var key = getLockoutKey(level, subSiteName);
    var until = parseInt(localStorage.getItem(key + '_until') || '0');
    if (Date.now() < until) return until - Date.now();
    localStorage.removeItem(key);
    localStorage.removeItem(key + '_until');
    return 0;
  }

  function resetAttempts(level, subSiteName) {
    var key = getLockoutKey(level, subSiteName);
    localStorage.removeItem(key);
    localStorage.removeItem(key + '_until');
  }

  // ===== UI Rendering =====
  function createOverlay(config, level) {
    var ui = config.ui || {};
    var title = ui.title || '访问验证';
    var subtitle = ui.subtitle || '请输入访问密码';
    var placeholder = ui.placeholder || '输入密码';
    var lockedText = ui.lockedText || '尝试次数过多，请 {minutes} 分钟后重试';
    var btnText = ui.loginButtonText || '进入';
    var isMain = level === 'main';

    var overlay = document.createElement('div');
    overlay.id = 'xbrain-auth-overlay';
    overlay.className = isMain ? 'xbrain-auth-main' : 'xbrain-auth-sub';

    var logoHtml = isMain
      ? '<div class="xbrain-auth-logo">'
      + '<svg viewBox="0 0 420 360" xmlns="http://www.w3.org/2000/svg" width="48" height="48">'
      + '<defs><radialGradient id="cg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#64b4ff"/><stop offset="60%" stop-color="#3a7bd5" stop-opacity="0.6"/><stop offset="100%" stop-color="#1a2a5e" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80c0ff"/><stop offset="50%" stop-color="#4a90e2"/><stop offset="100%" stop-color="#80c0ff"/></linearGradient>'
      + '<filter id="gf"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + '<circle cx="176" cy="180" r="170" fill="url(#cg)" opacity="0.12"/>'
      + '<circle cx="176" cy="180" r="168" fill="none" stroke="url(#lg)" stroke-width="2" opacity="0.55" filter="url(#gf)"/>'
      + '<g transform="matrix(0 -1 1 0 30 300)"><rect fill="#2a4080" width="240" height="36" rx="4"/><rect fill="url(#lg)" width="240" height="3" rx="1.5" y="4" opacity="0.9"/><rect fill="url(#lg)" width="240" height="3" rx="1.5" y="29" opacity="0.6"/></g>'
      + '<g transform="matrix(0 -1 1 0 66 200)" opacity="0.35"><rect fill="#3a60a0" width="40" height="280" rx="3"/><rect fill="#64b4ff" width="6" height="200" rx="3" x="17" y="20" opacity="0.5"/></g>'
      + '<g transform="matrix(0 -1 1 0 30 230)"><circle cx="50" cy="50" r="50" fill="#0d1636"/><circle cx="50" cy="50" r="46" fill="#162850" opacity="0.8"/><circle cx="50" cy="50" r="42" fill="none" stroke="#64b4ff" stroke-width="2" opacity="0.7" filter="url(#gf)"/><circle cx="50" cy="50" r="34" fill="none" stroke="#4a90e2" stroke-width="1.2" opacity="0.45"/><line x1="22" y1="22" x2="78" y2="78" stroke="#64b4ff" stroke-width="1.5" opacity="0.5"/><line x1="78" y1="22" x2="22" y2="78" stroke="#64b4ff" stroke-width="1.5" opacity="0.5"/><circle cx="50" cy="50" r="10" fill="#80c0ff" filter="url(#gf)" opacity="0.9"/><circle cx="50" cy="50" r="4" fill="#fff"/></g>'
      + '</svg>'
      + '<div class="xbrain-auth-brand"><span>X</span>Brain</div></div>'
      : '';

    overlay.innerHTML =
      '<div class="xbrain-auth-card">' +
      logoHtml +
      '<h2 class="xbrain-auth-title">' + title + '</h2>' +
      '<p class="xbrain-auth-subtitle">' + subtitle + '</p>' +
      '<form class="xbrain-auth-form" onsubmit="return false;">' +
      '<input type="password" class="xbrain-auth-input" id="xbrain-auth-pwd" placeholder="' + placeholder + '" autocomplete="off">' +
      '<button type="submit" class="xbrain-auth-btn" id="xbrain-auth-btn">' + btnText + '</button>' +
      '</form>' +
      '<div class="xbrain-auth-error" id="xbrain-auth-error"></div>' +
      '<div class="xbrain-auth-lockout" id="xbrain-auth-lockout" style="display:none;"></div>' +
      '</div>';

    return overlay;
  }

  function showLockoutMessage(overlay, remainingMs, lockedText) {
    var lockoutEl = overlay.querySelector('#xbrain-auth-lockout');
    var minutes = Math.ceil(remainingMs / 60000);
    lockoutEl.textContent = lockedText.replace('{minutes}', String(minutes));
    lockoutEl.style.display = 'block';
    overlay.querySelector('#xbrain-auth-error').style.display = 'none';
    overlay.querySelector('#xbrain-auth-pwd').disabled = true;
    overlay.querySelector('#xbrain-auth-btn').disabled = true;

    var timer = setInterval(function () {
      remainingMs -= 1000;
      if (remainingMs <= 0) {
        clearInterval(timer);
        lockoutEl.style.display = 'none';
        overlay.querySelector('#xbrain-auth-pwd').disabled = false;
        overlay.querySelector('#xbrain-auth-btn').disabled = false;
        overlay.querySelector('#xbrain-auth-pwd').focus();
      } else {
        var m = Math.ceil(remainingMs / 60000);
        lockoutEl.textContent = lockedText.replace('{minutes}', String(m));
      }
    }, 1000);
  }

  function showError(overlay, errorText) {
    var errEl = overlay.querySelector('#xbrain-auth-error');
    errEl.textContent = errorText;
    errEl.style.display = 'block';
    var card = overlay.querySelector('.xbrain-auth-card');
    card.classList.add('shake');
    setTimeout(function () { card.classList.remove('shake'); }, 500);
  }

  function revealContent() {
    document.documentElement.classList.remove('xbrain-auth-hidden');
  }

  // ===== Init Function =====
  XBrainAuth.init = function (options) {
    var level = options.level || 'main';
    var subSiteName = options.subSiteName || '';
    var configPath = options.configPath || './auth.config.json';
    var onAuthSuccess = options.onAuthSuccess || function () { };
    var onAuthFail = options.onAuthFail || function () { };

    // Check for existing session first
    var existingSession = getSession(level, subSiteName);
    if (existingSession) {
      revealContent();
      onAuthSuccess();
      return Promise.resolve();
    }

    // Wait for DOM to be ready before fetching config
    function doInit() {
      // Fetch config
      return fetch(configPath)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (config) {
          var mainConfig = config.main || {};
          var defaults = config.defaults || {};

          var enabled = level === 'main' ? mainConfig.enabled : config.enabled;
          if (!enabled) {
            revealContent();
            onAuthSuccess();
            return;
          }

          var password = level === 'main' ? mainConfig.password : config.password;
          var sessionDuration = level === 'main' ? mainConfig.sessionDuration : (config.sessionDuration || defaults.sessionDuration);
          var sessionUnit = level === 'main' ? mainConfig.sessionUnit : (config.sessionUnit || defaults.sessionUnit);
          var lockoutEnabled = level === 'main' ? mainConfig.lockout.enabled : (config.lockout ? config.lockout.enabled : defaults.lockout.enabled);
          var maxAttempts = level === 'main' ? mainConfig.lockout.maxAttempts : (config.lockout ? config.lockout.maxAttempts : defaults.lockout.maxAttempts);
          var lockoutDuration = level === 'main' ? mainConfig.lockout.lockoutDuration : (config.lockout ? config.lockout.lockoutDuration : defaults.lockout.lockoutDuration);
          var lockoutUnit = level === 'main' ? mainConfig.lockout.lockoutUnit : (config.lockout ? config.lockout.lockoutUnit : defaults.lockout.lockoutUnit);
          var ui = level === 'main' ? mainConfig.ui : (config.ui || {});

          // Create and inject overlay
          var overlay = createOverlay({ ui: ui }, level);
          document.body.appendChild(overlay);

          // Check lockout
          var lockoutRemaining = isLockedOut(level, subSiteName);
          if (lockoutRemaining > 0) {
            showLockoutMessage(overlay, lockoutRemaining, ui.lockedText || '尝试次数过多，请 {minutes} 分钟后重试');
            return;
          }

          // Focus input
          setTimeout(function () {
            overlay.querySelector('#xbrain-auth-pwd').focus();
          }, 100);

          // Handle submit
          var form = overlay.querySelector('.xbrain-auth-form');
          form.addEventListener('submit', function (e) {
            e.preventDefault();
            var pwdInput = overlay.querySelector('#xbrain-auth-pwd');
            var pwd = pwdInput.value;
            if (!pwd) return;

            sha256(pwd).then(function (hash) {
              sha256(password).then(function (expectedHash) {
                if (hash === expectedHash) {
                  resetAttempts(level, subSiteName);
                  saveSession(level, hash, sessionDuration, sessionUnit, subSiteName);
                  overlay.remove();
                  revealContent();
                  onAuthSuccess();
                } else {
                  if (lockoutEnabled) {
                    recordFailedAttempt(level, maxAttempts, lockoutDuration, lockoutUnit, subSiteName);
                    var lockoutRem = isLockedOut(level, subSiteName);
                    if (lockoutRem > 0) {
                      showLockoutMessage(overlay, lockoutRem, ui.lockedText || '尝试次数过多，请 {minutes} 分钟后重试');
                      return;
                    }
                  }
                  showError(overlay, ui.errorText || '密码错误，请重试');
                  pwdInput.value = '';
                  pwdInput.focus();
                  onAuthFail();
                }
              });
            });
          });
        })
        .catch(function (err) {
          console.error('[XBrainAuth] Failed to load config:', err);
          // Config load failed - show error overlay
          if (document.body) {
            var errorOverlay = document.createElement('div');
            errorOverlay.id = 'xbrain-auth-overlay';
            errorOverlay.className = level === 'main' ? 'xbrain-auth-main' : 'xbrain-auth-sub';
            errorOverlay.innerHTML =
              '<div class="xbrain-auth-card">' +
              '<h2 class="xbrain-auth-title">认证配置加载失败</h2>' +
              '<p class="xbrain-auth-subtitle">无法加载认证配置文件</p>' +
              '<p class="xbrain-auth-error" style="display:block;margin-top:1rem;">' + err.message + '</p>' +
              '<button class="xbrain-auth-btn" style="margin-top:1rem;" onclick="location.reload()">刷新页面</button>' +
              '</div>';
            document.body.appendChild(errorOverlay);
          }
          onAuthFail();
        });
    }

    // If DOM is ready, run immediately; otherwise wait
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doInit);
    } else {
      doInit();
    }
  };

  XBrainAuth.logout = function (level, subSiteName) {
    clearSession(level, subSiteName);
    location.reload();
  };

  XBrainAuth.isAuthenticated = function (level, subSiteName) {
    return !!getSession(level, subSiteName);
  };

  window.XBrainAuth = XBrainAuth;
})();
