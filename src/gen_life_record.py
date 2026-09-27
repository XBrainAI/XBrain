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
  - #log 章节按「拍摄时序」放全部媒体（页面顺序即活动顺序）：所有图片/视频按文件名
    时间戳统一排序交织编排；连续图片按拍摄间隔（>30 分钟视为不同活动场景）聚成组图块，
    视频落在其拍摄时间点上；文件名无时间戳的媒体稳定排尾。
    index.* 不进页面——它是上层站点卡片的预览图（画廊卡片封面取用它）
  - Logo / 返回链接按两级深记录页改为 ../../index.html
  - README 可选 `## 标题` 一行覆盖默认标题（默认按年份取「高一/沙初中军训 · 日期」），
    支持 `主标题｜高亮短词`（`｜` 后省略时高亮词=主标题）；提供标题时整套文案切换中性版
    （同行人=家人等），适配非军训题材（如 2026/0925-0926 中秋）

产物是静态 HTML（与复制模板填占位符等价），符合「调用 home/src 共享模板」约定。

用法（在 home/ 下运行）：
    python home/src/gen_life_record.py <记录相对路径，如 2026/0822>
    python home/src/gen_life_record.py gallery        # 重建 生活点滴/index.html 画廊
"""
import os
import re
import sys
from datetime import datetime

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
    title, highlight = "", ""
    m = re.search(r"##\s*标题\s*\n(.+)", rm)
    if m:
        line = m.group(1).strip().split("\n")[0].strip()
        title, _, highlight = line.partition("｜")
        title, highlight = title.strip(), highlight.strip()
    m = re.search(r"##\s*简介\s*\n(.*?)(?:\n##\s|\Z)", rm, re.S)
    if m:
        for line in m.group(1).split("\n"):
            line = re.sub(r"```.*?```", "", line, flags=re.S).strip()
            line = line.replace("[text](", "").replace(")", "")
            if line:
                intro_lines.append(line)
    intro = " ".join(intro_lines).strip()
    return date, intro, title, highlight


def scan_media(folder):
    imgs, vids = [], []
    for fn in sorted(os.listdir(folder)):
        ext = os.path.splitext(fn)[1].lower()
        if ext in IMG_EXT:
            imgs.append(fn)
        elif ext in VID_EXT:
            vids.append(fn)
    return imgs, vids


# ===== 媒体时序编排（页面顺序即活动顺序）=====
TS_PATTERNS = [
    # IMG_20260926_183126 / VID_20260926_163640 / Screenshot_20260926_190307
    re.compile(r"(?:IMG|VID|Screenshot)[_-](\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})", re.I),
    # 20230827-202526
    re.compile(r"(?<!\d)(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(?!\d)"),
    # 2026-8-22-09-32（分钟精度，秒缺省 0；不要求补零）
    re.compile(r"(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})-(\d{2})-(\d{2})(?:-(\d{2}))?(?!\d)"),
]
TS_FALLBACK = (9999, 12, 31, 23, 59, 59)  # 文件名无时间戳：稳定排尾（同批按文件名序）
IMG_GAP_MIN = 30  # 相邻图片拍摄间隔超过该分钟数视为不同活动场景，另起组图块


def media_ts(fn):
    """从文件名提取拍摄时间 (Y,M,D,H,M,S)；提取不到或数值非法返回 TS_FALLBACK。"""
    for pat in TS_PATTERNS:
        m = pat.search(fn)
        if m:
            g = [int(x) for x in m.groups()]
            if len(g) < 6:
                g.append(0)
            y, mo, d, h, mi, s = g
            if 1 <= mo <= 12 and 1 <= d <= 31 and h < 24 and mi < 60 and s < 60:
                return (y, mo, d, h, mi, s)
    return TS_FALLBACK


def build_media_html(imgs, vids):
    # index.* 是上层站点卡片的预览图（collect_records 卡片封面用），不是记录页内容：不出现在时间线里
    content_imgs = [im for im in imgs if os.path.splitext(im)[0].lower() != "index"]
    items = sorted(
        [(media_ts(fn), "img", fn) for fn in content_imgs] + [(media_ts(fn), "vid", fn) for fn in vids],
        key=lambda t: (t[0], t[2]))
    # 时间线分段：连续图片聚为一个组图块；遇到视频、或图片间隔超过 IMG_GAP_MIN 则断开
    segs = []  # ("imgs", [fn...]) | ("vid", fn)
    cur, prev_ts = [], None
    for ts, kind, fn in items:
        if kind == "vid":
            if cur:
                segs.append(("imgs", cur))
                cur = []
            segs.append(("vid", fn))
            prev_ts = None
            continue
        if cur and (datetime(*ts) - datetime(*prev_ts)).total_seconds() > IMG_GAP_MIN * 60:
            segs.append(("imgs", cur))
            cur = []
        cur.append(fn)
        prev_ts = ts
    if cur:
        segs.append(("imgs", cur))
    if not segs:
        return '      <p class="section-desc">本记录暂无可显示的媒体文件。</p>\n'
    h = ""
    for kind, payload in segs:
        if kind == "vid":
            h += ('      <video class="log-video" src="%s" controls preload="metadata"></video>\n'
                  '      <div class="log-video-cap">%s</div>\n') % (payload, humanize(payload))
            continue
        # 组块主图：组内最早一张（index.* 是上层卡片预览图，不参与页面媒体）
        cover = payload[0]
        gal = "".join(
            '          <img src="%s" alt="%s" loading="lazy" decoding="async">\n' % (im, humanize(im))
            for im in payload)
        h += ('      <div class="media-block">\n'
              '        <div class="media-cover"><img src="%s" alt="%s" loading="lazy" decoding="async"></div>\n'
              '        <div class="media-gallery">\n%s        </div>\n'
              '      </div>\n') % (cover, humanize(cover), gal)
    return h


def fill_record(tpl, date, intro, imgs, vids, year, title_override="", highlight_override=""):
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

    if title_override:
        # 非军训题材（README 提供标题）：文案切中性版，避免「军训」套话张冠李戴
        title = "%s · %s" % (title_override, date)
        highlight = highlight_override or title_override
        companion, transport = "家人", "步行 / 自驾"
        weather, duration, cost = "秋夜晴，月色佳", "两个晚上", "—（家庭日常）"
        route_desc = "跟着月色走的两个晚上：公寓 · 悦汇城 · 回程路上。"
        weather_tip = "秋夜户外观月注意添衣；纯记录，非出行前预警。"
        open_default = "这两个晚上拍下的照片与视频，串起日常的点滴。"
    else:
        title = ("高一军训 · %s" % date) if year == "2026" else ("沙初中军训 · %s" % date)
        highlight = "军训"
        companion = "沙（高一）" if year == "2026" else "沙（初中）"
        transport, weather, duration, cost = "校内 / 步行", "夏末晴热", "一天", "免费（校服另计）"
        route_desc = "送沙入校军训，一天的点滴记录。"
        weather_tip = "夏末晴热，户外注意补水防晒；纯记录，非出行前预警。"
        open_default = "这一天拍下的照片与视频，串起军训日常的点滴。"
    sub = intro[:40] if intro else "照片与视频串起的非计划随拍。"

    # <title>
    tpl = tpl.replace("{{站点标题 · 如：XX公园半日游记录}} · XBrain", "%s · XBrain" % title)
    # HERO
    tpl = tpl.replace("{{出游标签 · 如：周日下午 · 家门口半日游}}", "生活点滴 · %s" % date)
    tpl = tpl.replace("{{主标题}}", title)
    tpl = tpl.replace("<span>高亮词</span>", "<span>%s</span>" % highlight)
    tpl = tpl.replace("{{副标题 · 一句话感受，如：熟悉的园子，慢悠悠走一遍}}", sub)
    tpl = tpl.replace("{{日期}}", date)
    tpl = tpl.replace("👨‍👩‍👧 {{同行人}}", "👨‍👩‍👧 %s" % companion)
    tpl = tpl.replace("🚗 {{交通方式}}", "🚗 %s" % transport)
    tpl = tpl.replace("🌤️ {{天气}}", "🌤️ %s" % weather)
    # #summary 总览
    tpl = tpl.replace("{{开场白：为什么去、整体感受、大概待了多久}}",
                      intro if intro else open_default)
    tpl = tpl.replace("{{同行人}}", companion)
    tpl = tpl.replace("{{自驾/地铁/步行}}", transport)
    tpl = tpl.replace("{{约 X 小时}}", duration)
    tpl = tpl.replace("{{约 ¥X / 免费}}", cost)
    tpl = tpl.replace("{{入口 → 走了哪几个点 → 出口，约 X 公里 / X 步。熟悉的地方，跟着感觉走就行。}}",
                      route_desc)
    tpl = tpl.replace("{{天气 + 体感，是否需要防晒/带伞。纯记录，非出行前预警。}}",
                      weather_tip)
    # #log 章节说明
    tpl = tpl.replace("{{按时间或站点顺序写；每章一段叙述 + 可选组图，主图命名 index.*}}",
                      "全部媒体按文件名拍摄时序编排（页面顺序即活动顺序，视频落在拍摄时间点）；"
                      "点缩略图或左右滑动可切换主图。")
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
    date, intro, title_override, highlight_override = read_readme(readme)
    if not date:
        sys.exit("[错误] README 未解析到 ## 日期")
    imgs, vids = scan_media(folder)
    if not imgs and not vids:
        sys.exit("[错误] 该目录未找到任何图片/视频")
    year = rel.split("/")[0]
    with open(SRC_TPL, encoding="utf-8") as f:
        tpl = f.read()
    out = fill_record(tpl, date, intro, imgs, vids, year, title_override, highlight_override)
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
            date, intro, title_override, _ = read_readme(rm)
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
            if title_override:
                title_default = "%s · %s" % (title_override, date)
            else:
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


def gen_gallery():
    gallery_path = os.path.join(LIFE_DIR, "index.html")
    with open(gallery_path, encoding="utf-8") as f:
        ghtml = f.read()
    # 既有卡片整卡原样保留（含手写精修标题/摘要/▶ 角标，以及 README 无 ## 日期、
    # collect_records 扫描不到的手写记录如 2026/0901 回忆录）：画廊重建只「新增」卡片，
    # 绝不改写旧卡——否则手写精修丢失，且 S4.5 双向完整门禁会报 missingInGallery。
    # 需要刷新某张旧卡（如换了封面图）时，删掉该卡后重跑本命令即可。
    existing_cards = {}
    for m in re.finditer(r'(^[ \t]*)<a class="site-card" href="(\d{4}/[^"\']+/index\.html)">.*?</a>',
                         ghtml, re.M | re.S):
        existing_cards[m.group(2)[: -len("/index.html")]] = m.group(0)
    recs = collect_records()
    merged = []
    for rel, card_html in existing_cards.items():
        if not os.path.isfile(os.path.join(LIFE_DIR, rel, "index.html")):
            continue  # 磁盘页面已删除：不续挂（避免死链）
        my = re.match(r"(\d{4})/(\d{4})", rel)
        merged.append({"rel": rel, "sort_key": (int(my.group(1)), int(my.group(2))),
                       "carry_card": card_html})
    for r in recs:
        if r["rel"] not in existing_cards:
            merged.append(r)  # 仅画廊里还没有的新记录由生成器产卡
    merged.sort(key=lambda r: r["sort_key"], reverse=True)
    recs = merged
    if not recs:
        sys.exit("[错误] 未扫描到任何记录")

    cards = []
    for r in recs:
        if r.get("carry_card"):
            cards.append(r["carry_card"])
            continue
        href = "%s/index.html" % r["rel"]
        title = r["title_default"]
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
