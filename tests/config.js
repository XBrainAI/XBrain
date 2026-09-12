/**
 * 回归测试配置：范围、常量与已知缺陷豁免清单。
 *
 * KNOWN_ISSUES 是「显式记账的技术债」：每一项必须注明理由与清理条件，
 * 对应重构项落地后应立即删除对应条目，让检查恢复强制。
 * 新增豁免须经审核，禁止为让测试变绿而静默加白。
 */
'use strict';

const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/** 门户必须提供卡片的子站目录（AGENTS.md §1.1） */
const SUBSITE_DIRS = [
  'query-system',   // 类型 B，卡片指向 dist/index.html
  '四季景点',
  '健康',
  '采购与维护',
  '学习与成长',
  '生活点滴',
  'grade-insight',
];

/** 品牌规范（Logo/viewport/id=top 等）检查的页面范围：门户 + 上述子站（SPA 壳层单独查 S5.4） */
const BRAND_SCOPE_DIRS = SUBSITE_DIRS.filter((d) => d !== 'query-system');

/** 链接扫描时整体排除的目录：模板/文档性质，非部署页面 */
const SCAN_EXCLUDE_DIRS = ['brand'];

/** 链接扫描时排除的具体文件（相对路径）：SPA 源码壳（部署的是 dist/index.html） */
const SCAN_EXCLUDE_FILES = ['query-system/index.html', 'query-system/demo-scheme-B.html'];

/**
 * 已知缺陷豁免清单。
 * 匹配语义：file（相对路径，POSIX 分隔）+ rule（用例编号）+ ref（引用目标或片段，可选）
 * 全部命中才豁免；ref 省略表示该文件该规则整体豁免。
 */
const KNOWN_ISSUES = [
  // 已清偿并删除的条目：KI-1（新风机完整版死链，C1 迁入修复）、
  // KI-11/KI-12（query-system/home 两页 body 滚动锁，随迁移修复/删除）——均于 2026-09 重构清偿。
  {
    id: 'KI-2', file: 'index.html', rule: 'S2.1', ref: '/brand/auth.css',
    reason: '根绝对路径引认证样式：Netlify 根部署有效，file:// 预览失效；重构时相对化（同步删 KI-3）',
  },
  { id: 'KI-3', file: 'index.html', rule: 'S2.4', ref: '/brand/auth.css', reason: '同 KI-2' },
  {
    id: 'KI-4', file: '健康/妈/index.html', rule: 'S2.1', ref: '/brand/auth.css',
    reason: 'generate_index.py 历史产出用根绝对路径，生产有效；重构时改生成器相对化（同步删 KI-5/KI-6/KI-7）',
  },
  { id: 'KI-5', file: '健康/妈/index.html', rule: 'S2.4', ref: '/brand/auth.css', reason: '同 KI-4' },
  { id: 'KI-6', file: '健康/妈/index.html', rule: 'S2.1', ref: '/brand/auth.js', reason: '同 KI-4' },
  { id: 'KI-7', file: '健康/妈/index.html', rule: 'S2.4', ref: '/brand/auth.js', reason: '同 KI-4' },
  {
    id: 'KI-8', file: '学习与成长/纪录片推荐.html', rule: 'S3.3',
    reason: '存量页缺 id="top" 首屏锚点，待按 IP 规范（§6.7/§13）补齐',
  },
  {
    id: 'KI-9', file: '健康/弟/换牙/index.html', rule: 'S3.6',
    reason: '存量模态用 body 滚动锁（§14.2 铁律 1 反模式），待按 §14.3 模板修复',
  },
  {
    id: 'KI-10', file: '四季景点/古埃及展南沙周末家庭游/index.html', rule: 'S3.6',
    reason: '存量灯箱用 body 滚动锁，待按 §14.3 模板修复',
  },
];

module.exports = { ROOT, SUBSITE_DIRS, BRAND_SCOPE_DIRS, SCAN_EXCLUDE_DIRS, SCAN_EXCLUDE_FILES, KNOWN_ISSUES };

/** 查询 (file, rule, ref) 是否被豁免；ref 可省略表示该文件该规则整体豁免 */
function isExempt(file, rule, ref) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  return KNOWN_ISSUES.some((k) => {
    if (k.file !== rel || k.rule !== rule) return false;
    if (k.ref && ref) return k.ref === ref;
    return true;
  });
}

module.exports.isExempt = isExempt;
