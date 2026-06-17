# -*- coding: utf-8 -*-
"""
生成妈的个人健康档案单页面 index.html
整合所有md报告 + 深度医学分析报告
"""
import os
import re
from pathlib import Path

BASE = Path(r"d:\data\wy25311753\workspace\github\XBrainAI\XBrain\健康\妈")
OUTPUT = BASE / "index.html"


def parse_filename(filename):
    """从文件名解析日期、项目、医院"""
    name = filename.replace(".md", "")
    parts = name.split("-")
    date_str = parts[0]
    date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
    project = parts[1] if len(parts) > 1 else ""
    hospital = parts[2] if len(parts) > 2 else ""
    return date, project, hospital


def md_to_html(text):
    """简单的markdown转html"""
    lines = text.splitlines()
    html_lines = []
    in_ul = False
    in_ol = False
    in_table = False
    table_rows = []
    in_blockquote = False
    bq_lines = []

    def flush_table():
        nonlocal table_rows, in_table
        if not table_rows:
            return
        # 检测表头分隔行并移除
        header_rows = []
        for i, row in enumerate(table_rows):
            cells = [c.strip() for c in row.split("|")]
            cells = [c for c in cells if c]
            if all(re.match(r"^[-:]+$", c.replace(" ", "")) for c in cells):
                continue
            header_rows.append((i, cells))
        if not header_rows:
            in_table = False
            table_rows = []
            return
        html_lines.append('<div class="table-wrap"><table>')
        for idx, (orig_idx, cells) in enumerate(header_rows):
            tag = "th" if idx == 0 else "td"
            html_lines.append("<tr>" + "".join(f"<{tag}>{inline_format(escape_html(c))}</{tag}>" for c in cells) + "</tr>")
        html_lines.append('</table></div>')
        in_table = False
        table_rows = []

    def flush_bq():
        nonlocal in_blockquote, bq_lines
        if bq_lines:
            content = "\n".join(bq_lines)
            content = inline_format(content)
            html_lines.append(f'<blockquote>{content}</blockquote>')
            bq_lines = []
        in_blockquote = False

    def flush_list():
        nonlocal in_ul, in_ol
        if in_ul:
            html_lines.append("</ul>")
            in_ul = False
        if in_ol:
            html_lines.append("</ol>")
            in_ol = False

    for raw_line in lines:
        line = raw_line.rstrip()

        # 空行处理
        if not line.strip():
            if in_table:
                flush_table()
            if in_blockquote:
                flush_bq()
            flush_list()
            continue

        # 表格行
        if line.strip().startswith("|") and "|" in line[1:]:
            if in_blockquote:
                flush_bq()
            flush_list()
            in_table = True
            table_rows.append(line.strip())
            continue
        elif in_table:
            flush_table()

        # 引用
        if line.strip().startswith("> "):
            flush_list()
            if not in_blockquote:
                in_blockquote = True
            bq_lines.append(line.strip()[2:])
            continue
        elif in_blockquote:
            flush_bq()

        # 标题
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            flush_list()
            level = len(m.group(1))
            title = inline_format(m.group(2))
            html_lines.append(f"<h{level}>{title}</h{level}>")
            continue

        # 无序列表
        if re.match(r"^[-*]\s+", line):
            if in_ol:
                html_lines.append("</ol>")
                in_ol = False
            if not in_ul:
                html_lines.append("<ul>")
                in_ul = True
            item = re.sub(r"^[-*]\s+", "", line)
            html_lines.append(f"<li>{inline_format(item)}</li>")
            continue

        # 有序列表
        if re.match(r"^\d+\.\s+", line):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            if not in_ol:
                html_lines.append("<ol>")
                in_ol = True
            item = re.sub(r"^\d+\.\s+", "", line)
            html_lines.append(f"<li>{inline_format(item)}</li>")
            continue

        # 分隔线
        if re.match(r"^---+\s*$", line.strip()):
            flush_list()
            html_lines.append("<hr>")
            continue

        # 普通段落
        flush_list()
        html_lines.append(f"<p>{inline_format(line)}</p>")

    if in_table:
        flush_table()
    if in_blockquote:
        flush_bq()
    flush_list()

    return "\n".join(html_lines)


def escape_html(text):
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    return text


def inline_format(text):
    """处理行内格式：加粗、斜体、图片、链接"""
    # 图片 ![alt](url)
    text = re.sub(r"!\[(.*?)\]\((.*?)\)", r'<img src="\2" alt="\1" class="report-img">', text)
    # 链接 [text](url)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r'<a href="\2" target="_blank">\1</a>', text)
    # 加粗 **text**
    text = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", text)
    # 斜体 *text*
    text = re.sub(r"(?<!\*)\*(?!\*)(.*?)\*(?!\*)", r"<em>\1</em>", text)
    # 行内代码
    text = re.sub(r"`(.*?)`", r"<code>\1</code>", text)
    return text


def build_html(main_html, reports):
    reports_json = []
    for r in reports:
        # 对内容html做简单转义以便嵌入JSON
        content = r["content_html"].replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        reports_json.append({
            "date": r["date"],
            "project": r["project"],
            "hospital": r["hospital"],
            "hasImg": r["has_img"],
            "imgName": r["img_name"],
            "content": content
        })

    # 年份列表
    years = sorted(set(r["date"][:4] for r in reports), reverse=True)
    year_tags = "\n".join(f'<button class="year-tag" data-year="{y}">{y}</button>' for y in years)

    # 时间线条目HTML（初始渲染）
    timeline_items = []
    for r in reports:
        date_display = r["date"]
        project = r["project"]
        hospital = r["hospital"]
        img_html = f'<img src="./{r["img_name"]}" alt="{project}" class="report-thumb" loading="lazy" onclick="openModal(this.src)">' if r["has_img"] else ""
        item = f"""<div class="timeline-item" data-date="{r["date"]}" data-year="{r["date"][:4]}">
  <div class="timeline-dot"></div>
  <div class="timeline-card">
    <div class="timeline-header">
      <span class="timeline-date">{date_display}</span>
      <span class="timeline-tag">{hospital}</span>
    </div>
    <h4 class="timeline-title">{project}</h4>
    {img_html}
    <div class="timeline-actions">
      <button class="btn-expand" onclick="toggleReport(this)">查看完整报告</button>
    </div>
    <div class="timeline-detail" style="display:none;">
      <div class="report-body">{r["content_html"]}</div>
    </div>
  </div>
</div>"""
        timeline_items.append(item)

    timeline_html = "\n".join(timeline_items)

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
<title>妈 · 个人健康档案 — XBrain</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/brand/auth.css">
<style>
*,*::before,*::after{{margin:0;padding:0;box-sizing:border-box}}
:root{{
  --xb-deep:#0a0a1a;--xb-mid:#1a1030;--xb-light:#2d1b4e;--xb-accent:#64b4ff;
  --xb-accent2:#80c0ff;--xb-glow:rgba(100,180,255,0.35);--xb-border:rgba(100,180,255,0.2);
  --xb-text:#e8ecf4;--xb-text-dim:rgba(200,210,230,0.6);--xb-card-bg:linear-gradient(135deg,rgba(20,20,50,0.6) 0%,rgba(30,20,60,0.5) 100%);
  --success:#2ed573;--warning:#ffa502;--danger:#ff6b6b;
}}
html{{scroll-behavior:smooth}}
body{{
  font-family:'Noto Sans SC',-apple-system,BlinkMacSystemFont,sans-serif;
  background:var(--xb-deep);color:var(--xb-text);line-height:1.7;overflow-x:hidden;
  -webkit-text-size-adjust:100%;
}}

/* ===== XBrain Logo ===== */
.xbrain-brand{{
  position:fixed;top:16px;left:16px;z-index:100;display:flex;align-items:center;gap:8px;
  background:linear-gradient(135deg,rgba(20,15,50,0.94) 0%,rgba(40,30,80,0.92) 100%);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border:1.5px solid rgba(180,210,255,0.55);border-radius:12px;padding:6px 14px 6px 8px;
  box-shadow:0 0 12px rgba(255,255,255,0.15),0 0 40px rgba(80,140,255,0.35),0 4px 20px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.12);
  text-decoration:none;transition:opacity 0.6s ease,box-shadow 0.6s ease;
}}
.xbrain-brand:hover{{box-shadow:0 0 24px rgba(80,140,255,0.40),0 4px 20px rgba(0,0,0,0.5);transform:translateY(-1px)}}
.xbrain-brand.scrolled{{background:rgba(15,10,40,0.4);backdrop-filter:blur(4px);border-color:rgba(100,180,255,0.08);box-shadow:none}}
.xbrain-brand svg{{width:32px;height:32px;flex-shrink:0;filter:drop-shadow(0 0 12px rgba(100,180,255,0.55))}}
.xbrain-brand .xbrain-text{{font-size:15px;font-weight:800;letter-spacing:1.5px;color:#e8ecf4;text-shadow:0 0 12px rgba(100,180,255,0.55)}}
.xbrain-brand .xbrain-text span{{color:#64b4ff;text-shadow:0 0 18px rgba(100,180,255,0.9)}}

/* ===== Layout ===== */
.container{{max-width:900px;margin:0 auto;padding:5rem 1.2rem 2rem}}

/* ===== Hero ===== */
.hero{{
  text-align:center;padding:2rem 0 1.5rem;
}}
.hero h1{{
  font-family:'Noto Serif SC',serif;font-size:clamp(1.6rem,5vw,2.4rem);font-weight:900;
  letter-spacing:2px;margin-bottom:0.5rem;
}}
.hero h1 span{{color:var(--xb-accent);text-shadow:0 0 30px rgba(100,180,255,0.5)}}
.hero .meta{{
  color:var(--xb-text-dim);font-size:0.85rem;letter-spacing:1px;
}}

/* ===== Section Title ===== */
.section-title{{
  font-family:'Noto Serif SC',serif;font-size:clamp(1.2rem,3vw,1.6rem);font-weight:700;
  margin:2.5rem 0 1rem;padding-bottom:0.5rem;border-bottom:1px solid var(--xb-border);
  display:flex;align-items:center;gap:0.5rem;
}}
.section-title::before{{
  content:'';width:4px;height:1.2rem;background:var(--xb-accent);border-radius:2px;
}}

/* ===== Cards ===== */
.card{{
  background:var(--xb-card-bg);border:1px solid var(--xb-border);border-radius:16px;
  padding:1.2rem;margin-bottom:1rem;backdrop-filter:blur(10px);
}}
.card h3{{
  font-size:1.05rem;font-weight:700;margin-bottom:0.6rem;color:var(--xb-accent2);
}}

/* ===== Status Badge ===== */
.status-grid{{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.6rem;margin:1rem 0;
}}
.status-item{{
  background:rgba(100,180,255,0.05);border:1px solid var(--xb-border);border-radius:10px;
  padding:0.8rem;text-align:center;font-size:0.8rem;
}}
.status-item .sys-name{{color:var(--xb-text-dim);margin-bottom:0.3rem}}
.status-item .sys-val{{font-weight:700;font-size:0.95rem}}
.status-ok{{color:var(--success)}}
.status-warn{{color:var(--warning)}}
.status-danger{{color:var(--danger)}}

/* ===== Timeline Controls ===== */
.timeline-controls{{
  position:sticky;top:0;z-index:90;background:linear-gradient(to bottom,var(--xb-deep) 80%,transparent);
  padding:0.8rem 0;margin-bottom:1rem;
}}
.search-box{{
  width:100%;padding:0.7rem 1rem;border-radius:10px;border:1px solid var(--xb-border);
  background:rgba(20,20,50,0.6);color:var(--xb-text);font-size:0.95rem;outline:none;
  margin-bottom:0.6rem;
}}
.search-box::placeholder{{color:var(--xb-text-dim)}}
.search-box:focus{{border-color:var(--xb-accent);box-shadow:0 0 12px rgba(100,180,255,0.2)}}
.year-filters{{display:flex;gap:0.5rem;flex-wrap:wrap;}}
.year-tag{{
  padding:0.35rem 0.9rem;border-radius:20px;border:1px solid var(--xb-border);
  background:rgba(100,180,255,0.08);color:var(--xb-text-dim);font-size:0.8rem;
  cursor:pointer;transition:all 0.2s;
}}
.year-tag.active,.year-tag:hover{{
  background:var(--xb-accent);color:var(--xb-deep);border-color:var(--xb-accent);
  box-shadow:0 0 12px rgba(100,180,255,0.3);
}}

/* ===== Timeline ===== */
.timeline{{
  position:relative;padding-left:1.5rem;
}}
.timeline::before{{
  content:'';position:absolute;left:6px;top:0;bottom:0;width:2px;
  background:linear-gradient(to bottom,var(--xb-accent),transparent);
}}
.timeline-item{{
  position:relative;margin-bottom:1.2rem;opacity:0;transform:translateY(30px);
  transition:opacity 0.6s ease,transform 0.6s ease;
}}
.timeline-item.visible{{opacity:1;transform:translateY(0)}}
.timeline-dot{{
  position:absolute;left:-1.5rem;top:1.2rem;width:14px;height:14px;border-radius:50%;
  background:var(--xb-deep);border:2px solid var(--xb-accent);
  box-shadow:0 0 8px rgba(100,180,255,0.4);
}}
.timeline-card{{
  background:var(--xb-card-bg);border:1px solid var(--xb-border);border-radius:14px;
  padding:1rem;backdrop-filter:blur(10px);
}}
.timeline-header{{
  display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;
}}
.timeline-date{{
  font-size:0.85rem;color:var(--xb-accent);font-weight:600;
}}
.timeline-tag{{
  font-size:0.7rem;padding:0.15rem 0.5rem;border-radius:4px;
  background:rgba(100,180,255,0.1);color:var(--xb-accent2);border:1px solid var(--xb-border);
}}
.timeline-title{{
  font-size:1rem;font-weight:700;margin-bottom:0.5rem;
}}
.report-thumb{{
  width:100%;max-width:320px;border-radius:8px;margin:0.5rem 0;
  border:1px solid var(--xb-border);cursor:pointer;
}}
.btn-expand{{
  padding:0.4rem 0.9rem;border-radius:6px;border:1px solid var(--xb-border);
  background:rgba(100,180,255,0.1);color:var(--xb-accent);font-size:0.8rem;
  cursor:pointer;transition:all 0.2s;
}}
.btn-expand:hover{{
  background:var(--xb-accent);color:var(--xb-deep);
}}
.timeline-detail{{
  margin-top:0.8rem;padding-top:0.8rem;border-top:1px solid var(--xb-border);
  animation:fadeIn 0.3s ease;
}}
@keyframes fadeIn{{from{{opacity:0}}to{{opacity:1}}}}

/* ===== Report Body (md converted) ===== */
.report-body h2{{
  font-family:'Noto Serif SC',serif;font-size:1.1rem;font-weight:700;margin:1rem 0 0.5rem;
  color:var(--xb-accent2);
}}
.report-body h3{{
  font-size:0.95rem;font-weight:700;margin:0.8rem 0 0.4rem;color:var(--xb-accent);
}}
.report-body h4{{
  font-size:0.9rem;font-weight:600;margin:0.6rem 0 0.3rem;color:var(--xb-text);
}}
.report-body p{{
  margin-bottom:0.5rem;color:var(--xb-text-dim);font-size:0.9rem;
}}
.report-body ul,.report-body ol{{
  margin:0.4rem 0 0.6rem 1.2rem;color:var(--xb-text-dim);font-size:0.9rem;
}}
.report-body li{{
  margin:0.2rem 0;
}}
.report-body blockquote{{
  border-left:3px solid var(--xb-accent);padding-left:0.8rem;margin:0.6rem 0;
  color:var(--xb-text-dim);font-size:0.9rem;
}}
.report-body strong{{
  color:var(--xb-text);
}}
.report-body hr{{
  border:none;border-top:1px solid var(--xb-border);margin:1rem 0;
}}
.report-body .table-wrap{{
  overflow-x:auto;margin:0.6rem 0;
}}
.report-body table{{
  width:100%;border-collapse:collapse;font-size:0.85rem;
  background:rgba(100,180,255,0.03);border-radius:8px;overflow:hidden;
}}
.report-body th,.report-body td{{
  padding:0.5rem 0.6rem;border:1px solid var(--xb-border);text-align:left;
}}
.report-body th{{
  background:rgba(100,180,255,0.1);color:var(--xb-accent);font-weight:600;
}}
.report-body img.report-img{{
  max-width:100%;border-radius:8px;margin:0.5rem 0;border:1px solid var(--xb-border);
}}
.report-body code{{
  background:rgba(100,180,255,0.1);padding:0.1rem 0.3rem;border-radius:4px;
  font-size:0.85rem;color:var(--xb-accent2);
}}

/* ===== Modal ===== */
.modal{{
  display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.85);
  align-items:center;justify-content:center;padding:1rem;
}}
.modal.active{{display:flex}}
.modal img{{
  max-width:100%;max-height:90vh;border-radius:8px;box-shadow:0 0 40px rgba(0,0,0,0.5);
}}
.modal-close{{
  position:absolute;top:1rem;right:1rem;width:36px;height:36px;border-radius:50%;
  background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);
  font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;
}}

/* ===== Back link ===== */
.back-link{{
  display:inline-flex;align-items:center;gap:0.5rem;margin:2rem auto 0;
  padding:0.6rem 1.2rem;color:var(--xb-accent);text-decoration:none;
  border:1px solid var(--xb-border);border-radius:8px;font-size:0.9rem;
  transition:all 0.3s ease;
}}
.back-link:hover{{
  background:rgba(100,180,255,0.1);border-color:var(--xb-accent);
}}

/* ===== Footer ===== */
footer{{
  text-align:center;padding:2rem 1rem;color:var(--xb-text-dim);font-size:0.8rem;
}}

/* ===== Responsive ===== */
@media (max-width:640px){{
  .container{{padding:4.5rem 0.8rem 1.5rem}}
  .timeline{{padding-left:1.2rem}}
  .timeline-dot{{left:-1.2rem;width:12px;height:12px}}
  .status-grid{{grid-template-columns:repeat(2,1fr)}}
}}
</style>
</head>
<body>

<!-- XBrain Logo -->
<a class="xbrain-brand" href="../index.html" title="XBrain">
  <svg viewBox="0 0 420 360" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <defs>
      <radialGradient id="cg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#64b4ff" stop-opacity="1"/><stop offset="60%" stop-color="#3a7bd5" stop-opacity="0.6"/><stop offset="100%" stop-color="#1a2a5e" stop-opacity="0"/></radialGradient>
      <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80c0ff"/><stop offset="50%" stop-color="#4a90e2"/><stop offset="100%" stop-color="#80c0ff"/></linearGradient>
      <filter id="gf" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="176" cy="180" r="170" fill="url(#cg)" opacity="0.12"/>
    <circle cx="176" cy="180" r="168" fill="none" stroke="url(#lg)" stroke-width="2" opacity="0.55" filter="url(#gf)"/>
    <g transform="matrix(0 -1 1 0 30 300)"><rect fill="#2a4080" width="240" height="36" rx="4"/><rect fill="url(#lg)" width="240" height="3" rx="1.5" y="4" opacity="0.9"/><rect fill="url(#lg)" width="240" height="3" rx="1.5" y="29" opacity="0.6"/></g>
    <g transform="matrix(0 -1 1 0 66 200)" opacity="0.35"><rect fill="#3a60a0" width="40" height="280" rx="3"/><rect fill="#64b4ff" width="6" height="200" rx="3" x="17" y="20" opacity="0.5"/></g>
    <g transform="matrix(0 -1 1 0 30 230)"><circle cx="50" cy="50" r="50" fill="#0d1636"/><circle cx="50" cy="50" r="46" fill="#162850" opacity="0.8"/><circle cx="50" cy="50" r="42" fill="none" stroke="#64b4ff" stroke-width="2" opacity="0.7" filter="url(#gf)"/><circle cx="50" cy="50" r="34" fill="none" stroke="#4a90e2" stroke-width="1.2" opacity="0.45"/><line x1="22" y1="22" x2="78" y2="78" stroke="#64b4ff" stroke-width="1.5" opacity="0.5"/><line x1="78" y1="22" x2="22" y2="78" stroke="#64b4ff" stroke-width="1.5" opacity="0.5"/><circle cx="50" cy="50" r="10" fill="#80c0ff" filter="url(#gf)" opacity="0.9"/><circle cx="50" cy="50" r="4" fill="#fff"/></g>
  </svg>
  <div class="xbrain-text"><span>X</span>Brain</div>
</a>

<div class="container">

  <!-- Hero -->
  <section class="hero" id="top">
    <h1>妈<span>个人健康档案</span></h1>
    <p class="meta">广东省妇幼保健院 · 2024年2月 ~ 2026年5月 · 共{len(reports)}份检查报告</p>
  </section>

  <!-- 健康总览 -->
  <section>
    <h2 class="section-title">健康状况总览</h2>
    <div class="status-grid">
      <div class="status-item"><div class="sys-name">妇科（内膜）</div><div class="sys-val status-ok">息肉已消退</div></div>
      <div class="status-item"><div class="sys-name">妇科（微生态）</div><div class="sys-val status-warn">菌群失衡</div></div>
      <div class="status-item"><div class="sys-name">妇科（宫颈）</div><div class="sys-val status-ok">HPV阴性</div></div>
      <div class="status-item"><div class="sys-name">乳腺</div><div class="sys-val status-warn">BI-RADS 3级</div></div>
      <div class="status-item"><div class="sys-name">肺部</div><div class="sys-val status-warn">结节待复查</div></div>
      <div class="status-item"><div class="sys-name">甲状腺</div><div class="sys-val status-warn">待超声定性</div></div>
      <div class="status-item"><div class="sys-name">颈椎</div><div class="sys-val status-warn">椎间盘突出</div></div>
      <div class="status-item"><div class="sys-name">泌尿系统</div><div class="sys-val status-ok">正常</div></div>
      <div class="status-item"><div class="sys-name">甲功</div><div class="sys-val status-ok">正常</div></div>
      <div class="status-item"><div class="sys-name">听力</div><div class="sys-val status-ok">正常</div></div>
      <div class="status-item"><div class="sys-name">胃肠镜</div><div class="sys-val status-ok">已检查</div></div>
      <div class="status-item"><div class="sys-name">整体评级</div><div class="sys-val status-ok">B+ 良好</div></div>
    </div>
  </section>

  <!-- 深度分析报告 -->
  <section>
    <h2 class="section-title">深度医学分析报告</h2>
    <div class="card report-body">
      {main_html}
    </div>
  </section>

  <!-- 时间线 -->
  <section>
    <h2 class="section-title">检查报告时间线</h2>
    <div class="timeline-controls">
      <input type="text" class="search-box" id="searchBox" placeholder="搜索检查项目、医院、关键词...">
      <div class="year-filters">
        <button class="year-tag active" data-year="all">全部</button>
        {year_tags}
      </div>
    </div>
    <div class="timeline" id="timeline">
      {timeline_html}
    </div>
  </section>

  <div style="text-align:center;">
    <a class="back-link" href="../index.html">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      返回健康档案
    </a>
  </div>

</div>

<!-- Image Modal -->
<div class="modal" id="imgModal" onclick="closeModal()">
  <button class="modal-close" onclick="closeModal()">&times;</button>
  <img id="modalImg" src="" alt="报告图片">
</div>

<footer>
  <p>XBrain &copy; 2026</p>
  <p>个人健康档案 · 仅供家庭参考</p>
</footer>

<script>
(function(){{
  // Logo scroll fade
  var logo=document.querySelector('.xbrain-brand');
  function updLogo(){{
    var sy=window.pageYOffset||0,vh=window.innerHeight||600;
    var r=Math.min(sy/vh,1);
    if(logo){{logo.style.opacity=1-r*0.7;logo.classList.toggle('scrolled',sy>vh*0.3);}}
  }}
  window.addEventListener('scroll',function(){{requestAnimationFrame(updLogo);}},{{passive:true}});
  updLogo();

  // Timeline reveal
  var items=document.querySelectorAll('.timeline-item');
  var obs=new IntersectionObserver(function(entries){{
    entries.forEach(function(e,i){{
      if(e.isIntersecting){{
        setTimeout(function(){{e.target.classList.add('visible');}},i*80);
        obs.unobserve(e.target);
      }}
    }});
  }},{{threshold:0.1}});
  items.forEach(function(it){{obs.observe(it);}});

  // Toggle report detail
  window.toggleReport=function(btn){{
    var detail=btn.parentElement.nextElementSibling;
    var show=detail.style.display==='none';
    detail.style.display=show?'block':'none';
    btn.textContent=show?'收起报告':'查看完整报告';
  }};

  // Search
  var searchBox=document.getElementById('searchBox');
  searchBox.addEventListener('input',function(){{
    var q=this.value.toLowerCase();
    items.forEach(function(it){{
      var txt=it.textContent.toLowerCase();
      it.style.display=txt.includes(q)?'':'none';
    }});
  }});

  // Year filter
  var yearBtns=document.querySelectorAll('.year-tag');
  yearBtns.forEach(function(btn){{
    btn.addEventListener('click',function(){{
      yearBtns.forEach(function(b){{b.classList.remove('active');}});
      this.classList.add('active');
      var y=this.dataset.year;
      items.forEach(function(it){{
        it.style.display=(y==='all'||it.dataset.year===y)?'':'none';
      }});
    }});
  }});

  // Image modal
  window.openModal=function(src){{
    document.getElementById('modalImg').src=src;
    document.getElementById('imgModal').classList.add('active');
  }};
  window.closeModal=function(){{
    document.getElementById('imgModal').classList.remove('active');
  }};
}})();
</script>

<script src="/brand/auth.js"></script>
<script>
(function(){{
  // Sub-site authentication (妈)
  if (window.XBrainAuth) {{
    XBrainAuth.init({{
      level: 'sub',
      subSiteName: 'mom',
      configPath: '/健康/妈/auth.config.json',
      onAuthSuccess: function() {{
        console.log('[XBrainAuth] Sub-site authentication successful');
      }},
      onAuthFail: function() {{
        console.log('[XBrainAuth] Sub-site authentication failed');
      }}
    }});
  }}
}})();
</script>

</body>
</html>'''
    return html


def main():
    # 读取深度分析报告
    main_path = BASE / "个人健康档案与深度医学分析报告.md"
    main_text = main_path.read_text(encoding="utf-8")
    main_html = md_to_html(main_text)

    # 读取其他报告
    md_files = sorted(
        [f for f in BASE.glob("*.md") if f.name != "个人健康档案与深度医学分析报告.md"],
        key=lambda x: x.name,
        reverse=True
    )

    reports = []
    for f in md_files:
        date, project, hospital = parse_filename(f.name)
        content = f.read_text(encoding="utf-8")
        content_html = md_to_html(content)
        img_name = f.with_suffix(".png").name
        has_img = (BASE / img_name).exists()
        reports.append({
            "date": date,
            "project": project,
            "hospital": hospital,
            "content_html": content_html,
            "has_img": has_img,
            "img_name": img_name,
        })

    html = build_html(main_html, reports)
    OUTPUT.write_text(html, encoding="utf-8")
    print("[OK] index.html generated")
    print(f"[INFO] Total reports: {len(reports)}")


if __name__ == "__main__":
    main()
