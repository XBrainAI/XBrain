# 回归测试套件（tests/）

> 定期重构的安全网。每次重构（删除/移动/整合/优化）落地后必须全绿，方可提交推送。
> 零外部依赖：Node 内置 `node:test` + 少量 Python/CLI 调用，全部只读（不修改任何站点文件）。

## 运行方式（仓库根执行）

| 命令 | 层级 | 内容 | 耗时 |
|------|------|------|------|
| `npm run test:repo` | 静态层 | S1–S6：门户/链接/品牌/生成页/配置/语法 | 秒级 |
| `npm run test:repo:full` | 静态层 + 深层 | + D1 健康站一致性守卫、D2 SPA lint/test/build/产物 | 分钟级 |

push 前的完整门禁 = `test:repo:full` 全绿（等同 AGENTS §2 纪律的全仓版）。

## 测试报告（每次运行自动生成）

- 固定入口：`tests/reports/latest.md`；历史存档：`tests/reports/report-<时间戳>.md`（目录已 gitignore，不入库）。
- 报告内容：结论（可否推送）、运行时间/层级/代码基线（commit + 工作区是否干净）、环境、结果概览、逐用例明细表、失败详情（完整错误信息）、已知债务快照（KNOWN_ISSUES 逐条 + 棘轮基线）。
- 重构留档：如需把某次报告作为重构凭证，拷贝该份 MD 随重构提交即可。

## 用例矩阵

### S1 门户完整性（static/portal.test.js）
| ID | 断言 | 依据 |
|----|------|------|
| S1.1 | 门户存在，含 `.sites-grid`、`.site-card`、品牌 Logo | §3/§4 |
| S1.2 | 每张卡片 href 可解析；SPA 卡片指向 dist（产物存在性归 D2.5） | §4 |
| S1.3 | 七大子站均被门户卡片覆盖（防漏加卡片） | §1.1/§3 |

### S2 链接与资源完整性（static/links.test.js）——重构后最重要的一张网
| ID | 断言 | 依据 |
|----|------|------|
| S2.0 | 扫描覆盖面守卫：参与检查的页面数 ≥ 40（防范围误改静默漏扫） | — |
| S2.1 | href/src/poster + CSS `url()` + JS 媒体字符串的目标文件存在（dist 产物除外） | §9.1/§10 |
| S2.2 | 页内锚点无死链：`href="#x"` 必须有 `id="x"`（`#top` 享浏览器回退；grade-insight hash 路由除外） | §13 |
| S2.3 | 禁二次编码 `%25`；`%20` 仅当解码后文件不存在才报（磁盘文件名含空格时 `%20` 是合法编码） | §10 |
| S2.4 | 本地引用禁止根绝对路径（必须相对） | §10 |

### S3 品牌 / 移动端规范（static/brand.test.js）——范围：门户 + 6 个静态子站全部 HTML
| ID | 断言 | 依据 |
|----|------|------|
| S3.1 | `.xbrain-brand` + `.xbrain-text` + `<span>X</span>Brain` + SVG 四件套齐全 | §6.3/§6.7 |
| S3.2 | 品牌链接不死链：门户 `#top`；子站 `#top` 或解析后目标存在 | §6.3 |
| S3.3 | 每页有 `id="top"` 首屏锚点 | §6.7/§13 |
| S3.4 | viewport meta 存在，禁止 `user-scalable=no` | §6.9① |
| S3.5 | `.xbrain-brand` 规则块内禁止 `border-radius:100px` 胶囊形（仅查品牌块，不误伤业务药丸按钮） | §6.3 |
| S3.6 | 禁止 `body.style.overflow` 锁滚动（iOS 灯箱错位铁律） | §14.2 |
| S3.7 | `.lightbox-nav.prev/.next` 禁止负偏移推出屏幕 | §14.2 |

### S4 脚本生成页约定（static/generated.test.js）
| ID | 断言 | 依据 |
|----|------|------|
| S4.1 | `健康/妈/index.html` 含 GENERATED 标志（防手改） | §8.1 |
| S4.2 | `generate_index.py` 与 `check_consistency.py` 的 `EXCLUDE_FILES` 两处一致 | §8.1 |
| S4.3 | `orphans.json`（若存在）count=0 | §11.4 |
| S4.4 | 生活点滴生成页无 `{{` 占位符残留（剥注释后） | §8.3 |
| S4.5 | 生活点滴画廊双向完整：磁盘记录目录 ⊆ 画廊链接，画廊链接均存在 | §8.3 |

### S5 子站结构与配置（static/subsites.test.js）
| ID | 断言 | 依据 |
|----|------|------|
| S5.1 | 根 + grade-insight 的 auth.config.json 可解析 | §7 |
| S5.2 | grade-insight echarts 走本地 vendor，禁止外链图表库 CDN | grade-insight/AGENTS |
| S5.3 | grade-insight 全部 JS 通过 `node --check` | §14.9 |
| S5.4 | SPA 壳层（query-system/index.html）保留 xbrain-brand | §11.3 |
| S5.5 | netlify.toml：publish="." + query-system 重定向 + build 命令 | §9 |
| S5.6 | 根 package.json：build 编排 SPA；test:repo 两个脚本已注册 | §2 |
| S5.7 | git 卫生：dist/ 与 node_modules/ 未被跟踪 | §2 |

### S6 Python 健康（static/python.test.js）
| ID | 断言 | 依据 |
|----|------|------|
| S6.1 | 全部 .py 通过 ast.parse（只读，无 __pycache__ 副作用） | — |

### S7 媒体编码守卫（static/media.test.js）
| ID | 断言 | 依据 |
|----|------|------|
| S7.0 | 跟踪的视频文件数 ≥ 40（防漏扫） | — |
| S7.1 | 全部 mp4/mov/webm 编码为 H.264/VP9，禁止 HEVC(hvc1/hev1)（Chrome/安卓不可播） | §10 视频编码铁律 |
| S7.2 | MP4 必须 faststart（moov 前置，支持流式播放） | §10 |

### 深层（deep/，仅 test:repo:full）
| ID | 断言 | 依据 |
|----|------|------|
| D1.1 | `健康/妈/check_consistency.py` 退出码 0（只读守卫） | §8.1 |
| D2.1 | SPA lint 错误/警告数 ≤ 基线（棘轮） | §2 |
| D2.2 | SPA 单元测试失败数 ≤ 基线、通过数不得减少（棘轮） | §2 |
| D2.3 | `npm run build` 通过并产出 dist/ | §2/§9 |
| D2.4 | dist 含两份列表 JSON（非空）、清单内学校报告逐一平铺就位、other_infos 已复制 | §5.3 |
| D2.5 | 构建 后门户 SPA 卡片可达；dist/index.html 内部资源自洽 | §11.1 |

## 已知债务的两种记账方式

1. **KNOWN_ISSUES 豁免清单**（`tests/config.js`）：站点文件层面的存量缺陷（死链、缺锚点、
   body 滚动锁等）。每条必须带 `id` + `reason` + 清理条件；**对应重构项落地后必须删除条目**，
   让检查恢复强制。禁止为让测试变绿而静默加白。
2. **棘轮基线**（`tests/baseline.json`）：SPA 内部门禁的存量红（lint 95 错 / 测试 57 失败，
   系 b1f2208 数据模型大改未同步所致）。规则：失败数 ≤ 基线即通过，**更优时自动收紧基线**；
   通过数减少（删测试作弊）一律 fail。清偿为 0 后删除对应字段，门禁自动转严格。

## 维护约定

- 重构导致页面数/基线变化时，同步调整 S2.0 的 40 基线与 `baseline.json`，并在本文件记录。
- 新增子站：更新 `config.js` 的 `SUBSITE_DIRS`（自动纳入品牌与门户检查）。
- 新增忽略范围：只允许加 `SCAN_EXCLUDE_*`（模板/源码壳等非部署文件），并写明理由。
- 本套件不替代浏览器端人工验证（§11.2 移动端清单、触摸手势、safe-area 等仍需真机抽查）。

## 媒体入库三重防线（防 HEVC 复发）

| 层 | 触发时机 | 拦截内容 | 位置 |
|----|----------|----------|------|
| ① pre-commit 钩子 | 每次 `git commit` | HEVC / >100MB 拒绝提交；moov 后置警告 | `tests/hooks/scan-media.js` → `.bare/hooks/pre-commit`（**换机须重装**） |
| ② GitHub Actions CI | 每次 push | 自动跑全部静态层（含 S7 编码守卫） | `.github/workflows/regression.yml` |
| ③ 回归套件 S7 | 手动 `test:repo` | 全量视频编码 + faststart + 覆盖面 | `static/media.test.js` |
