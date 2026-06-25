# -*- coding: utf-8 -*-
"""
生成哥的健康档案单页面 index.html
整合所有子站点目录 + md 报告文件
参考妈子站点模式：时间线 + 单页整合 + 支持增量追加
"""
import os
import re
from pathlib import Path

BASE = Path(r"d:\data\wy25311753\workspace\git\github\XBrain\home\健康\哥")
OUTPUT = BASE / "index.html"

EXCLUDE_DIRS = {"MR-无需建立子站点"}
EXCLUDE_FILES = {"generate_index.py", "index.html", "README.md", "README.MD"}


def parse_dir_name(name):
    """从目录名解析日期和标题: YYYYMMDD.标题"""
    if "." in name and len(name) > 9 and name[:8].isdigit():
        date_str = name[:8]
        date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        title = name[9:]
        return date, title
    return "", name


def parse_md_filename(name):
    """从md文件名解析日期和标题: YYYYMMDD.标题.md"""
    if name.endswith(".md"):
        name = name[:-3]
    if "." in name and len(name) > 9 and name[:8].isdigit():
        date_str = name[:8]
        date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        title = name[9:]
        return date, title
    return "", name


def escape_html(text):
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    return text


def inline_format(text):
    """处理行内格式：加粗、斜体、图片、链接"""
    text = re.sub(r"!\[(.*?)\]\((.*?)\)", r'<img src="\2" alt="\1" class="report-img">', text)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r'<a href="\2" target="_blank">\1</a>', text)
    text = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.*?)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"`(.*?)`", r"<code>\1</code>", text)
    return text


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

        if not line.strip():
            if in_table:
                flush_table()
            if in_blockquote:
                flush_bq()
            flush_list()
            continue

        if line.strip().startswith("|") and "|" in line[1:]:
            if in_blockquote:
                flush_bq()
            flush_list()
            in_table = True
            table_rows.append(line.strip())
            continue
        elif in_table:
            flush_table()

        if line.strip().startswith("> "):
            flush_list()
            if not in_blockquote:
                in_blockquote = True
            bq_lines.append(line.strip()[2:])
            continue
        elif in_blockquote:
            flush_bq()

        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            flush_list()
            level = len(m.group(1))
            title = inline_format(m.group(2))
            html_lines.append(f"<h{level}>{title}</h{level}>")
            continue

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

        if re.match(r"^---+\s*$", line.strip()):
            flush_list()
            html_lines.append("<hr>")
            continue

        flush_list()
        html_lines.append(f"<p>{inline_format(line)}</p>")

    if in_table:
        flush_table()
    if in_blockquote:
        flush_bq()
    flush_list()

    return "\n".join(html_lines)


def get_items():
    """获取所有条目（子目录 + md文件），按日期倒序"""
    items = []

    # 1. 处理子目录
    for entry in sorted(BASE.iterdir(), reverse=True):
        if not entry.is_dir():
            continue
        if entry.name in EXCLUDE_DIRS or entry.name.startswith("."):
            continue

        date, title = parse_dir_name(entry.name)

        # 读取 README
        readme = entry / "README.MD"
        if not readme.exists():
            readme = entry / "README.md"
        desc = ""
        if readme.exists():
            desc = readme.read_text(encoding="utf-8").strip()

        # 读取子目录内所有 md 文件（合并为详细内容）
        detail_md_files = sorted(entry.glob("*.md"))
        detail_html_parts = []
        for md_file in detail_md_files:
            if md_file.name in {"README.md", "README.MD"}:
                continue
            md_text = md_file.read_text(encoding="utf-8")
            section_html = md_to_html(md_text)
            # 修正子目录内 HTML 图片的相对路径，使其相对于 index.html 生效
            def _fix_html_img(m):
                prefix, src, suffix = m.group(1), m.group(2), m.group(3)
                if src.startswith(("http://", "https://", "/", "./", "../")):
                    return m.group(0)
                return f'{prefix}./{entry.name}/{src}{suffix}'
            section_html = re.sub(
                r'(<img[^>]*?src=")([^"/][^"]*?)("[^>]*?>)',
                _fix_html_img,
                section_html
            )
            detail_html_parts.append(f'<div class="subdir-section">{section_html}</div>')
        detail_html = "\n".join(detail_html_parts)

        # 收集子目录内图片
        images = sorted(entry.glob("*.png")) + sorted(entry.glob("*.jpg")) + sorted(entry.glob("*.jpeg"))
        img_paths = [f"./{entry.name}/{img.name}" for img in images]

        items.append({
            "type": "subdir",
            "date": date,
            "title": title,
            "tag": "就诊记录",
            "desc": desc,
            "detail_html": detail_html,
            "images": img_paths,
            "link": f"./{entry.name}/index.html",
            "sort_key": date,
        })

    # 2. 处理根目录 md 文件
    for entry in sorted(BASE.iterdir(), reverse=True):
        if not entry.is_file() or entry.suffix != ".md":
            continue
        if entry.name in EXCLUDE_FILES:
            continue

        date, title = parse_md_filename(entry.name)
        content = entry.read_text(encoding="utf-8")
        content_html = md_to_html(content)

        # 图片关联：先找同名 png，再找 image.png
        img_path = None
        same_name_png = entry.with_suffix(".png")
        if same_name_png.exists():
            img_path = f"./{same_name_png.name}"
        elif (BASE / "image.png").exists():
            img_path = "./image.png"

        items.append({
            "type": "md",
            "date": date,
            "title": title,
            "tag": "健康报告",
            "content_html": content_html,
            "img_path": img_path,
            "sort_key": date,
        })

    # 按日期倒序排列
    items.sort(key=lambda x: x["sort_key"], reverse=True)
    return items


def build_html(items):
    # 年份列表
    years = sorted(set(item["date"][:4] for item in items if item["date"]), reverse=True)
    year_tags = "\n".join(f'<button class="year-tag" data-year="{y}">{y}</button>' for y in years)

    # 时间线条目
    timeline_items = []
    for item in items:
        date_display = item["date"]
        title = item["title"]
        tag = item["tag"]

        # 图片 HTML（默认折叠）
        img_section = ""
        if item["type"] == "subdir" and item["images"]:
            thumbs = "\n".join(
                f'<img src="{src}" alt="{title}" class="report-thumb" loading="lazy" onclick="openModal(this.src)">'
                for src in item["images"]
            )
            img_section = f'<div class="img-fold" style="display:none;"><div class="thumb-grid">{thumbs}</div></div>'
        elif item["type"] == "md" and item.get("img_path"):
            img_section = f'<div class="img-fold" style="display:none;"><img src="{item["img_path"]}" alt="{title}" class="report-thumb" loading="lazy" onclick="openModal(this.src)"></div>'

        # 操作按钮
        actions = []
        if img_section:
            actions.append('<button class="btn-img-toggle" onclick="toggleImages(this)">查看图片</button>')
        if item["type"] == "subdir":
            actions.append(f'<a href="{item["link"]}" class="btn-link">查看详情页</a>')
        if item.get("detail_html") or item.get("content_html"):
            actions.append('<button class="btn-expand" onclick="toggleReport(this)">查看完整报告</button>')
        actions_html = "\n".join(actions)

        # 详情内容
        detail_content = item.get("detail_html", "") or item.get("content_html", "")
        detail_html = f'''<div class="timeline-detail" style="display:none;">
  <div class="report-body">{detail_content}</div>
</div>''' if detail_content else ""

        item_html = f'''  <div class="timeline-item" data-date="{item['date']}" data-year="{item['date'][:4] if item['date'] else ''}">
    <div class="timeline-dot"></div>
    <div class="timeline-card">
      <div class="timeline-header">
        <span class="timeline-date">{date_display}</span>
        <span class="timeline-tag">{tag}</span>
      </div>
      <h4 class="timeline-title">{title}</h4>
      {img_section}
      <div class="timeline-actions">
        {actions_html}
      </div>
      {detail_html}
    </div>
  </div>'''
        timeline_items.append(item_html)

    timeline_html = "\n".join(timeline_items)
    total_count = len(items)

    html = f'''<!-- GENERATED BY generate_index.py - DO NOT EDIT -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
<title>哥 · 个人健康档案 — XBrain</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{{margin:0;padding:0;box-sizing:border-box}}
:root{{
  --xb-deep:#0a0a1a;--xb-mid:#1a1030;--xb-light:#2d1b4e;--xb-accent:#64b4ff;
  --xb-accent2:#80c0ff;--xb-glow:rgba(100,180,255,0.35);--xb-border:rgba(100,180,255,0.2);
  --xb-text:#e8ecf4;--xb-text-dim:rgba(200,210,230,0.6);
  --xb-card-bg:linear-gradient(135deg,rgba(20,20,50,0.6) 0%,rgba(30,20,60,0.5) 100%);
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
.xbrain-brand.scrolled{{
  background:rgba(15,10,40,0.4);backdrop-filter:blur(4px);border-color:rgba(100,180,255,0.08);box-shadow:none;
}}
.xbrain-brand.scrolled:hover{{opacity:0.7 !important;border-color:rgba(100,180,255,0.2)}}
.xbrain-brand svg{{width:32px;height:32px;flex-shrink:0;filter:drop-shadow(0 0 12px rgba(100,180,255,0.55))}}
.xbrain-brand .xbrain-text{{font-size:15px;font-weight:800;letter-spacing:1.5px;color:#e8ecf4;text-shadow:0 0 12px rgba(100,180,255,0.55)}}
.xbrain-brand .xbrain-text span{{color:#64b4ff;text-shadow:0 0 18px rgba(100,180,255,0.9)}}

/* ===== Layout ===== */
.container{{max-width:900px;margin:0 auto;padding:5rem 1.2rem 2rem}}

/* ===== Hero ===== */
.hero{{text-align:center;padding:2rem 0 1.5rem}}
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
.thumb-grid{{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:0.5rem;margin:0.5rem 0;
}}
.report-thumb{{
  width:100%;max-width:320px;border-radius:8px;margin:0.5rem 0;
  border:1px solid var(--xb-border);cursor:pointer;
}}
.thumb-grid .report-thumb{{
  margin:0;max-width:100%;
}}
.timeline-actions{{
  display:flex;gap:0.5rem;margin-top:0.5rem;
}}
.btn-expand,.btn-link{{
  padding:0.4rem 0.9rem;border-radius:6px;border:1px solid var(--xb-border);
  background:rgba(100,180,255,0.1);color:var(--xb-accent);font-size:0.8rem;
  cursor:pointer;transition:all 0.2s;text-decoration:none;display:inline-flex;align-items:center;
}}
.btn-expand:hover,.btn-link:hover{{
  background:var(--xb-accent);color:var(--xb-deep);
}}
.btn-img-toggle{{
  padding:0.4rem 0.9rem;border-radius:6px;border:1px solid var(--xb-border);
  background:rgba(100,180,255,0.06);color:var(--xb-text-dim);font-size:0.8rem;
  cursor:pointer;transition:all 0.2s;
}}
.btn-img-toggle:hover{{
  background:rgba(100,180,255,0.15);color:var(--xb-accent);border-color:var(--xb-accent);
}}
.img-fold{{
  display:none;animation:fadeIn 0.3s ease;
}}
.timeline-detail{{
  margin-top:0.8rem;padding-top:0.8rem;border-top:1px solid var(--xb-border);
  animation:fadeIn 0.3s ease;
}}
@keyframes fadeIn{{from{{opacity:0}}to{{opacity:1}}}}

/* ===== Report Body (md converted) ===== */
.report-body h1,.report-body h2{{
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
.subdir-section{{
  margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--xb-border);
}}
.subdir-section:last-child{{
  border-bottom:none;margin-bottom:0;padding-bottom:0;
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
  .thumb-grid{{grid-template-columns:repeat(2,1fr)}}
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
    <h1>哥<span>个人健康档案</span></h1>
    <p class="meta">就诊记录 · 检查报告 · 病情分析 · 共{total_count}份</p>
  </section>

  <!-- 时间线 -->
  <section>
    <h2 class="section-title">健康档案时间线</h2>
    <div class="timeline-controls">
      <input type="text" class="search-box" id="searchBox" placeholder="搜索检查项目、关键词...">
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

  // Toggle images fold
  window.toggleImages=function(btn){{
    var fold=btn.parentElement.previousElementSibling;
    if(!fold||!fold.classList.contains('img-fold')) return;
    var show=fold.style.display==='none';
    fold.style.display=show?'block':'none';
    btn.textContent=show?'收起图片':'查看图片';
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

</body>
</html>'''
    return html


def main():
    items = get_items()
    html = build_html(items)
    OUTPUT.write_text(html, encoding="utf-8")
    print("[OK] index.html generated")
    print(f"[INFO] Total items: {len(items)}")
    for item in items:
        print(f"  - [{item['type']}] {item['date']} {item['title']}")


if __name__ == "__main__":
    main()
