# -*- coding: utf-8 -*-
"""
gen_life_record.py —— 生活点滴「简单记录」页生成器（通用版）

背景：
  home/src/gen_travelogue.py 是 0816「泮塘随记」的专用原型，其 fill() 写死了
  泮塘文案，且要求 README 含 ## 实录 / ### HH:MM 章节结构。生活点滴里大量记录
  （如 0822 军训最后一天、2023 沙初中军训等）只是「日期 + 简介 + 一堆媒体」的
  简单随拍，没有 ## 实录 结构，用 gen_travelogue.py 会失败或产生错误内容。

本脚本是通用版本，专门处理「简单记录」：
  - 读取 home/src/site-template-travelogue.html（单一来源共享模板）
  - 填 {{SITE_LABEL}}=生活点滴 / {{RECORD_HEADING}}=生活实录 / 冷色换肤
  - 顶部导航只保留：返回 / 首页 / 行程总览 / 生活实录（移除美食&实用信息，因简单记录无此内容）
  - #log 章节直接放「全部媒体」：图片用 .media-block（首图自动解析 + 缩略图切换 + 滑动），
    视频用 <video controls> 整宽块（与模板 JS 完全兼容，无需改 HTML）
  - Logo / 返回链接按两级深记录页改为 ../../index.html

产物是静态 HTML（与复制模板填占位符等价），符合「调用 home/src 共享模板」约定。

用法（在 home/ 下运行）：
    python home/src/gen_life_record.py <记录相对路径，如 2026/0822>
    python home/src/gen_life_record.py gallery        # 重建 生活点滴/index.html 画廊
"""
import os
import re
import sys

HOME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_TPL = os.path.join(HOME, "src", "site-template-travelogue.html")
LIFE_DIR = os.path.join(HOME, "生活点滴")

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
VID_EXT = {".mp4", ".mov", ".webm"}

# ===== 子站级文案 / 换肤（冷色，与四季景点暖金区分）=====
SITE_LABEL = "生活点滴"
RECORD_HEADING = "生活实录"
ACCENT = "#64b4ff"
ACCENT2 = "#9fd0ff"
# ⚠️ 末尾必须有 `;`！漏分号会让 CSS 解析器吞掉下一变量，导致 --text 未定义 → 全页文字变黑。
HERO_GRAD = ("radial-gradient(ellipse at 50% -10%, rgba(100,180,255,0.16) 0%, transparent 60%),"
             "radial-gradient(circle at 80% 20%, rgba(140,200,255,0.10) 0%, transparent 40%);")


def theme_of(fn):
    """从文件名抽取主题词（去掉地点/时间戳/扩展名）。"""
    base = os.path.splitext(fn)[0]
    base = re.sub(r"-edit_\d+$", "", base)
    base = re.sub(r"[_-]?(?:IMG|VID)_?\d{8}[_-]?\d{6}", "", base)
    base = re.sub(r"\d{8}", "", base)
    base = base.replace("四中津园周边", "").replace("四中津园", "")
    base = base.replace("高一军训", "").replace("军训第一天", "").replace("沙初中军训", "").replace("沙军训", "")
    return base.replace("-", " ").replace("_", " ").strip()


def humanize(fn):
    return theme_of(fn) or os.path.splitext(fn)[0]


def read_readme(path):
    with open(path, encoding="utf-8") as f:
        rm = f.read()
    date = ""
    m = re.search(r"##\s*日期\s*\n(.+)", rm)
    if m:
        date = m.group(1).strip().split("\n")[0].strip()
    intro_lines = []
    m = re.search(r"##\s*简介\s*\n(.*?)(?:\n##\s|\Z)", rm, re.S)
    if m:
        for line in m.group(1).split("\n"):
            line = re.sub(r"```.*?```", "", line, flags=re.S).strip()
            line = line.replace("[text](", "").replace(")", "")
            if line:
                intro_lines.append(line)
    intro = " ".join(intro_lines).strip()
    return date, intro


def scan_media(folder):
    imgs, vids = [], []
    for fn in sorted(os.listdir(folder)):
        ext = os.path.splitext(fn)[1].lower()
        if ext in IMG_EXT:
            imgs.append(fn)
        elif ext in VID_EXT:
            vids.append(fn)
    return imgs, vids


def build_media_html(imgs, vids):
    h = ""
    if imgs:
        # 首图优先 index.*，否则第一张
        cover = None
        for im in imgs:
            if os.path.splitext(im)[0].lower() == "index":
                cover = im
                break
        if not cover:
            cover = imgs[0]
        gal = "".join(
            '          <img src="%s" alt="%s" loading="lazy" decoding="async">\n' % (im, humanize(im))
            for im in imgs)
        h += ('      <div class="media-block">\n'
              '        <div class="media-cover"><img src="%s" alt="%s" loading="lazy" decoding="async"></div>\n'
              '        <div class="media-gallery">\n%s        </div>\n'
              '      </div>\n') % (cover, humanize(cover), gal)
    for v in vids:
        h += ('      <video class="log-video" src="%s" controls preload="metadata"></video>\n'
              '      <div class="log-video-cap">%s</div>\n') % (v, humanize(v))
    if not h:
        h = '      <p class="section-desc">本记录暂无可显示的媒体文件。</p>\n'
    return h


def fill_record(tpl, date, intro, imgs, vids, year):
    # 站点标签 / 记录标题
    tpl = tpl.replace("{{SITE_LABEL}}", SITE_LABEL)
    tpl = tpl.replace("{{RECORD_HEADING}}", RECORD_HEADING)
    # 换肤（冷色）
    tpl = tpl.replace("--accent: #ffc46b;", "--accent: %s;" % ACCENT)
    tpl = tpl.replace("--accent2: #ffd9a0;", "--accent2: %s;" % ACCENT2)
    tpl = tpl.replace(
        "radial-gradient(ellipse at 50% -10%, rgba(255, 180, 100, 0.16) 0%, transparent 60%),\n                   radial-gradient(circle at 80% 20%, rgba(255, 200, 140, 0.10) 0%, transparent 40%);",
        HERO_GRAD)
    # 两级深记录页：返回 / Logo 回 ../../index.html
    tpl = tpl.replace('../index.html', '../../index.html')
    # 移除美食 & 实用信息 导航链接（简单记录无此内容）
    tpl = tpl.replace('      <a href="#food">美食发现</a>\n', '')
    tpl = tpl.replace('      <a href="#notes">实用信息</a>\n', '')
    tpl = tpl.replace('      <a href="#food">美食 & 随手发现</a>\n', '')
    # 移除 #food / #notes 整个 section
    tpl = re.sub(r'  <!-- ===== 3\. 美食 & 随手发现.*?</section>\n', '', tpl, flags=re.S)
    tpl = re.sub(r'  <!-- ===== 4\. 实用信息.*?</section>\n', '', tpl, flags=re.S)

    companion = "沙（高一）" if year == "2026" else "沙（初中）"
    title = ("高一军训 · %s" % date) if year == "2026" else ("沙初中军训 · %s" % date)
    sub = intro[:40] if intro else "照片与视频串起的非计划随拍。"

    # <title>
    tpl = tpl.replace("{{站点标题 · 如：XX公园半日游记录}} · XBrain", "%s · XBrain" % title)
    # HERO
    tpl = tpl.replace("{{出游标签 · 如：周日下午 · 家门口半日游}}", "生活点滴 · %s" % date)
    tpl = tpl.replace("{{主标题}}", title)
    tpl = tpl.replace("<span>高亮词</span>", "<span>军训</span>")
    tpl = tpl.replace("{{副标题 · 一句话感受，如：熟悉的园子，慢悠悠走一遍}}", sub)
    tpl = tpl.replace("{{日期}}", date)
    tpl = tpl.replace("👨‍👩‍👧 {{同行人}}", "👨‍👩‍👧 %s" % companion)
    tpl = tpl.replace("🚗 {{交通方式}}", "🚗 校内 / 步行")
    tpl = tpl.replace("🌤️ {{天气}}", "🌤️ 夏末晴热")
    # #summary 总览
    tpl = tpl.replace("{{开场白：为什么去、整体感受、大概待了多久}}",
                      intro if intro else "这一天拍下的照片与视频，串起军训日常的点滴。")
    tpl = tpl.replace("{{同行人}}", companion)
    tpl = tpl.replace("{{自驾/地铁/步行}}", "校内 / 步行")
    tpl = tpl.replace("{{约 X 小时}}", "一天")
    tpl = tpl.replace("{{约 ¥X / 免费}}", "免费（校服另计）")
    tpl = tpl.replace("{{入口 → 走了哪几个点 → 出口，约 X 公里 / X 步。熟悉的地方，跟着感觉走就行。}}",
                      "送沙入校军训，一天的点滴记录。")
    tpl = tpl.replace("{{天气 + 体感，是否需要防晒/带伞。纯记录，非出行前预警。}}",
                      "夏末晴热，户外注意补水防晒；纯记录，非出行前预警。")
    # #log 章节说明
    tpl = tpl.replace("{{按时间或站点顺序写；每章一段叙述 + 可选组图，主图命名 index.*}}",
                      "这一天拍下的照片与视频；点缩略图或左右滑动可切换主图。")
    # 用真实媒体替换占位 .log-chapter 块
    media_html = build_media_html(imgs, vids)
    tpl = re.sub(r'<!-- 复制 \.log-chapter 增加更多章节 -->.*?(?=\n  </section>)',
                 media_html + '    <div class="section-backtop"><a href="#top">↑ 返回顶部</a></div>',
                 tpl, flags=re.S)
    # footer 站点名
    tpl = tpl.replace("{{站点名}}", title)
    return tpl


def gen_record(rel):
    folder = os.path.join(LIFE_DIR, rel)
    readme = os.path.join(folder, "README.MD")
    if not os.path.isdir(folder):
        sys.exit("[错误] 目录不存在: %s" % folder)
    if not os.path.isfile(readme):
        sys.exit("[错误] 缺少 README.MD: %s" % readme)
    date, intro = read_readme(readme)
    if not date:
        sys.exit("[错误] README 未解析到 ## 日期")
    imgs, vids = scan_media(folder)
    if not imgs and not vids:
        sys.exit("[错误] 该目录未找到任何图片/视频")
    year = rel.split("/")[0]
    with open(SRC_TPL, encoding="utf-8") as f:
        tpl = f.read()
    out = fill_record(tpl, date, intro, imgs, vids, year)
    # 安全校验：不得残留占位符（忽略 HTML 注释内的演示占位符）
    chk = re.sub(r"<!--.*?-->", "", out, flags=re.S)
    left = re.findall(r"\{\{[^}]+\}\}", chk)
    if left:
        sys.exit("[致命] 仍存在未替换占位符: %s" % ", ".join(sorted(set(left))))
    out_path = os.path.join(folder, "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(out)
    print("[完成] %s  (日期=%s 图片=%d 视频=%d)" % (out_path, date, len(imgs), len(vids)))


# ===================== 画廊（生活点滴/index.html）=====================

def collect_records():
    recs = []
    for year in sorted(os.listdir(LIFE_DIR)):
        yp = os.path.join(LIFE_DIR, year)
        if not os.path.isdir(yp) or not re.match(r"^\d{4}$", year):
            continue
        for day in sorted(os.listdir(yp)):
            dp = os.path.join(yp, day)
            rm = os.path.join(dp, "README.MD")
            if not os.path.isdir(dp) or not os.path.isfile(rm):
                continue
            date, intro = read_readme(rm)
            if not date:
                continue
            imgs, vids = scan_media(dp)
            # 排序键：年 + 月日起点数字
            m = re.match(r"(\d{4})", day)
            mmdd = int(m.group(1)) if m else 0
            # 封面图（无图则用渐变占位）
            cover = None
            for im in imgs:
                if os.path.splitext(im)[0].lower() == "index":
                    cover = im
                    break
            if not cover and imgs:
                cover = imgs[0]
            rel = "%s/%s" % (year, day)
            title_default = ("高一军训 · %s" % date) if year == "2026" else ("沙初中军训 · %s" % date)
            recs.append({
                "year": year, "day": day, "rel": rel,
                "sort_key": (int(year), mmdd),
                "date": date, "intro": intro, "cover": cover,
                "has_media": bool(imgs or vids),
                "title_default": title_default,
            })
    # 新→旧
    recs.sort(key=lambda r: r["sort_key"], reverse=True)
    return recs


def extract_existing_titles(gallery_html):
    """从现有画廊提取 已手写的卡片标题（保留 0816 等精修标题，不被默认标题覆盖）。"""
    mapping = {}
    for m in re.finditer(r'<a class="site-card" href="([^"]+)">.*?<h3>(.*?)</h3>', gallery_html, re.S):
        href = m.group(1)
        title = re.sub(r"\s+", " ", m.group(2)).strip()
        mapping[href] = title
    return mapping


def gen_gallery():
    gallery_path = os.path.join(LIFE_DIR, "index.html")
    with open(gallery_path, encoding="utf-8") as f:
        ghtml = f.read()
    existing = extract_existing_titles(ghtml)
    recs = collect_records()
    if not recs:
        sys.exit("[错误] 未扫描到任何记录")

    cards = []
    for r in recs:
        href = "%s/index.html" % r["rel"]
        title = existing.get(href, r["title_default"])
        sub = r["intro"][:46] if r["intro"] else "照片与视频串起的非计划随拍。"
        if r["cover"]:
            img_style = "background-image:url('%s/%s')" % (r["rel"], r["cover"])
            badge_extra = ""
        else:
            img_style = "background:linear-gradient(135deg, var(--xb-light), var(--xb-mid))"
            badge_extra = '\n          <span class="play-glyph">▶</span>'
        card = (
            '      <a class="site-card" href="%s">\n'
            '        <div class="site-card-image" style="%s">\n'
            '          <span class="badge">生活实录</span>%s\n'
            '        </div>\n'
            '        <div class="site-card-content">\n'
            '          <span class="site-card-tag">Vlog</span>\n'
            '          <h3>%s</h3>\n'
            '          <p class="card-date">%s</p>\n'
            '        </div>\n'
            '      </a>') % (href, img_style, badge_extra, title, sub)
        cards.append(card)
    cards_html = "\n".join(cards)

    new_html = re.sub(r'(<div class="sites-grid">).*?(\n    </div>)',
                      lambda m: m.group(1) + "\n" + cards_html + m.group(2),
                      ghtml, flags=re.S)
    # 注入 play-glyph 样式（若不存在）
    if ".play-glyph" not in new_html:
        new_html = new_html.replace(
            "    .site-card-image .badge {",
            "    .site-card-image .play-glyph { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 2rem; color: var(--accent2); opacity: .85; text-shadow: 0 0 14px rgba(100,180,255,.6); }\n"
            "    .site-card-image .badge {")
    with open(gallery_path, "w", encoding="utf-8") as f:
        f.write(new_html)
    print("[完成] 画廊已重建，共 %d 条记录：%s" % (len(recs), ", ".join(r["rel"] for r in recs)))


def main():
    if len(sys.argv) < 2:
        print("用法: python gen_life_record.py <记录相对路径 如 2026/0822> | gallery")
        sys.exit(1)
    arg = sys.argv[1].replace("\\", "/")
    if arg == "gallery":
        gen_gallery()
    else:
        gen_record(arg)


if __name__ == "__main__":
    main()
