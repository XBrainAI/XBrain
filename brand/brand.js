/**
 * XBrain 共享品牌壳 · 行为层
 * 规格：SPEC-008（阶段 2）｜设计计划：docs/ui/品牌层设计计划-两遍法留痕.md
 * 提供：① Logo 滚动淡出（IP 行为基线：ratio*0.7、scrolled 阈值 0.3vh，语义零变化）
 *       ② top-nav 滚动高亮 setActiveNav（README §十标准行为）
 *       ③ hero 单编排序列（每页一个编排瞬间——逐卡渐入默认关闭）
 * 用法：<script src="<相对路径>/brand/brand.js" defer></script>
 */
(function () {
  'use strict';
  if (window.XBrainBrand && window.XBrainBrand.__initialized) return;

  var api = { __initialized: true };

  /* ---- ① Logo 滚动淡出（IP 行为基线） ---- */
  function initLogoFade() {
    var logo = document.querySelector('.xbrain-brand');
    if (!logo) return;
    var ticking = false;

    function updateLogo() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var ratio = Math.min(scrollY / vh, 1);
      logo.style.opacity = 1 - ratio * 0.7;
      logo.classList.toggle('scrolled', scrollY > vh * 0.3);
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () { updateLogo(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    updateLogo();
  }

  /* ---- ② top-nav 滚动高亮 + 汉堡下拉（README §十标准行为） ---- */
  function initActiveNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.top-nav .nav-inner a[href^="#"]'));
    if (!links.length) return;
    var sections = [];
    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var s = id && document.getElementById(id);
      if (s) sections.push([a, s]);
    });
    if (!sections.length) return;

    function update() {
      var y = window.pageYOffset + 80;
      var cur = sections[0][0];
      sections.forEach(function (p) { if (p[1].offsetTop <= y) cur = p[0]; });
      links.forEach(function (a) { a.classList.toggle('active', a === cur); });
    }

    window.addEventListener('scroll', update, { passive: true });
    update();

    // 汉堡下拉切换（§十标准：点击展开/收起含图标切换，点链接后收起）
    var toggle = document.querySelector('.top-nav .nav-hamburger');
    var dropdown = document.querySelector('.nav-mobile-dropdown');
    if (toggle && dropdown) {
      var icon = toggle.querySelector('svg');
      var ICON_MENU = '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>';
      var ICON_CLOSE = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
      function setIcon(open) { if (icon) icon.innerHTML = open ? ICON_CLOSE : ICON_MENU; }
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = dropdown.classList.toggle('open');
        setIcon(open);
      });
      dropdown.addEventListener('click', function (e) {
        if (e.target.closest('a')) { dropdown.classList.remove('open'); setIcon(false); }
      });
      document.addEventListener('click', function (e) {
        if (dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== toggle) {
          dropdown.classList.remove('open');
          setIcon(false);
        }
      });
    }
  }

  /* ---- ③ hero 单编排序列（唯一非用户触发动效） ---- */
  function initHeroSequence() {
    var seq = document.querySelector('.xb-hero-seq');
    if (!seq) return;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { seq.classList.add('xb-in'); });
    });
  }

  /* ---- 逐元素渐入（默认关闭；页面容器加 .xb-reveal-on 显式启用） ---- */
  function initReveal() {
    if (!document.querySelector('.xb-reveal-on')) return;
    var els = document.querySelectorAll('.xb-reveal');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach && els.forEach(function (el) { el.classList.add('xb-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('xb-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function boot() {
    initLogoFade();
    initActiveNav();
    initHeroSequence();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.XBrainBrand = api;
})();
