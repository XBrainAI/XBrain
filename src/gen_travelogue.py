# -*- coding: utf-8 -*-
"""
gen_travelogue.py —— 「调用 home/src 共享模板生成生活点滴/四季景点记录页」工具

读取 home/src/site-template-travelogue.html（纯记录型共享模板），
读懂 <记录目录>/README.MD（日期 / 简介 / ##实录 分段叙述），
扫描该目录真实媒体（图片+视频，按文件名时间戳归章），
产出 <记录目录>/index.html（静态、图文并茂、生活实录）。

章节切割规则（对齐 四季景点 AGENTS.md §14.5 / §14.6）：
  - README.MD 是「叙事底稿 / 组织线索」，不是用来直接显示的；其正文（## 简介、
    ## 实录 的纯文本）指导页面怎么组织，但绝不原样照搬进页面。
  - 尤其是 ## 简介 内若夹带 ```markdown 围栏里的长文（如某篇背景文章），
    那是作者底稿，生成器会**剥离**，不当作页面内容显示；该素材若需呈现，
    应由作者按模板的「美食 & 随手发现」卡片手工组织，而非自动 dump。
  - 章节（.log-chapter）的时间锚点来自 README 的 `### HH:MM 标题`（作者裁剪好的
    时间窗 + 标题 + 叙述）；每个媒体文件按自身**文件名时间戳**归入最近的锚点章，
    实现「按 readme.md 与图片/视频文件的时间共同切割」。
  - §14.6.2 R5：无真实素材支撑且非显式文本章的章节不产出（避免空/坏章节）。

用法：
    python home/src/gen_travelogue.py <记录相对路径，如 2026/0816>
    # 在 home/ 下运行；记录目录须含 README.MD 与媒体文件。

产物是静态 HTML（从模板复制+填占位符），非运行时动态——符合「调用模板生成」约定。
"""
import os
import re
import sys
from datetime import datetime

HOME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_TPL = os.path.join(HOME, "src", "site-template-travelogue.html")

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
VID_EXT = {".mp4", ".mov", ".webm"}

# ===== 子站级文案（由 {{SITE_LABEL}} / {{RECORD_HEADING}} 决定）=====
SITE_LABEL = "生活点滴"
RECORD_HEADING = "生活实录"
# 生活点滴用冷色调（与四季景点暖金区分）
ACCENT = "#64b4ff"
ACCENT2 = "#9fd0ff"
# ⚠️ 末尾必须有 `;`！曾因漏分号导致 CSS 解析器把 --text 当作 --hero-grad 值的一部分
#    吞掉，--text 未定义 → color: var(--text) 回退浏览器默认黑色 → 全页文字不可见。
HERO_GRAD = ("radial-gradient(ellipse at 50% -10%, rgba(100,180,255,0.16) 0%, transparent 60%),"
             "radial-gradient(circle at 80% 20%, rgba(140,200,255,0.10) 0%, transparent 40%);")


def parse_time(fn):
    """文件名时间戳 → datetime。支持 IMG_/VID_YYYYMMDD_HHMMSS 与裸 YYYYMMDD。"""
    m = re.search(r"(?:IMG|VID)_(\d{8})_(\d{6})", fn)
    if m:
        return datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S")
    m = re.search(r"(\d{8})(?:[-_]|$)", fn)
    if m:
        # 仅日期（无时分秒）：置为正午，便于按天归章（具体时段交给锚点/主题判断）
        return datetime.strptime(m.group(1) + "120000", "%Y%m%d%H%M%S")
    return None


def theme_of(fn):
    """从文件名抽取主题词（去掉地点前缀、时间戳、扩展名）。"""
    base = os.path.splitext(fn)[0]
    base = re.sub(r"-edit_\d+$", "", base)
    base = re.sub(r"[_-]?(?:IMG|VID)_?\d{8}[_-]?\d{6}", "", base)
    base = re.sub(r"\d{8}", "", base)
    base = base.replace("四中津园周边", "").replace("四中津园", "")
    base = base.replace("高一军训", "").replace("军训第一天", "")
    return base.replace("-", " ").replace("_", " ").strip()


def humanize(fn):
    return theme_of(fn) or os.path.splitext(fn)[0]


def _strip_fence(text):
    """去掉所有 ```...``` 围栏块（含 markdown 标识），并清掉引导语『详见以下介绍』等。"""
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    text = re.sub(r"详见以下(介绍|内容)?\s*$", "", text.strip())
    return text.strip()


def read_readme(path):
    """解析 README.MD：日期 / 简介(剥离围栏) / ##实录 的 ### HH:MM 章节。"""
    with open(path, encoding="utf-8") as f:
        rm = f.read()
    date = ""
    m = re.search(r"##\s*日期\s*\n(.+)", rm)
    if m:
        date = m.group(1).strip()

    intro = ""
    m = re.search(r"##\s*简介\s*\n(.*?)(?:\n##\s*实录|\Z)", rm, re.S)
    if m:
        intro = _strip_fence(m.group(1))

    logs = []
    for m in re.finditer(r"###\s*(\d{1,2}:\d{2})\s*([^\n]+)\n(.*?)(?=\n###|\n##|\Z)", rm, re.S):
        body = m.group(3).strip()
        body = re.sub(r"```.*?```", "", body, flags=re.S)  # 实录内若夹围栏也剥离
        logs.append({
            "time": m.group(1).strip(),
            "title": m.group(2).strip(),
            "body": body,
        })
    return date, intro, logs


def scan_media(folder):
    items = []
    for fn in sorted(os.listdir(folder)):
        ext = os.path.splitext(fn)[1].lower()
        if ext not in IMG_EXT and ext not in VID_EXT:
            continue
        dt = parse_time(fn)
        items.append({
            "fn": fn,
            "dt": dt,
            "typ": "video" if ext in VID_EXT else "image",
            "theme": theme_of(fn),
        })
    return items


def _to_minutes(t):
    return t.hour * 60 + t.minute


def assign_chapters(media, logs):
    """把媒体按文件名时间戳归入最近的 README 锚点章（§14.6：媒体时间 + README 时间共同切割）。

    - 有时间戳：归入时间上最近的锚点（|Δ| 最小）；并列时取较早锚点。
    - 无时间戳（如仅含日期或裸文件）：按主题词启发式归入收尾章（接沙/放学类）→ 末章；
      否则归入末章。
    - 返回与 logs 等长的列表，每项是该章媒体（按时间升序；无时间者置后）。
    """
    if not logs:
        return [media]
    anchors = [datetime.strptime(s["time"], "%H:%M").time() for s in logs]
    ch = [[] for _ in logs]

    # 末章主题启发（收尾类素材无时间时归末章）
    tail_theme = ("放学", "操场", "午休", "教室", "家长", "等候", "接沙")

    for m in media:
        if m["dt"] is None:
            # 无时间：收尾类 → 末章；否则也末章（最稳妥）
            ch[-1].append(m)
            continue
        t = m["dt"].time()
        best, bestdiff = 0, None
        for i, at in enumerate(anchors):
            diff = abs(_to_minutes(t) - _to_minutes(at))
            if bestdiff is None or diff < bestdiff:
                bestdiff, best = diff, i
        ch[best].append(m)

    # 章内按时间升序；无时间者保持在后
    for c in ch:
        c.sort(key=lambda x: (x["dt"] is None, x["dt"] or datetime.max))
    return ch


def media_block(items):
    imgs = [i for i in items if i["typ"] == "image"]
    vids = [i for i in items if i["typ"] == "video"]
    h = ""
    if imgs:
        cover = imgs[0]["fn"]
        gal = "".join(
            f'          <img src="{i["fn"]}" alt="{humanize(i["fn"])}" loading="lazy" decoding="async">\n'
            for i in imgs)
        h += (f'      <div class="media-block">\n'
              f'        <div class="media-cover"><img src="{cover}" alt="{humanize(cover)}" loading="lazy" decoding="async"></div>\n'
              f'        <div class="media-gallery">\n{gal}        </div>\n'
              f'      </div>\n')
    for v in vids:
        h += (f'      <video class="log-video" src="{v["fn"]}" controls preload="metadata"></video>\n'
              f'      <div class="log-video-cap">{humanize(v["fn"])}</div>\n')
    return h


def _render_body(body):
    """把实录正文按行渲染为独立 <p>，并去除连续重复行（README 草稿常有复制粘贴重复）。"""
    lines = [l.strip() for l in body.split("\n") if l.strip()]
    out = []
    for l in lines:
        if out and out[-1] == l:
            continue
        out.append(l)
    if not out:
        return ""
    return "\n      ".join(f"<p>{l}</p>" for l in out)


def build_log_section(logs, chapters):
    out = []
    for sec, items in zip(logs, chapters):
        imgs = [i for i in items if i["typ"] == "image"]
        vids = [i for i in items if i["typ"] == "video"]
        # §14.6.2 R5：无素材且无非空叙述 → 跳过（避免空/坏章节）
        if not imgs and not vids and not sec["body"].strip():
            continue
        tag = ('      <div class="chapter-tags"><span class="chapter-tag view">记录</span>'
               '<span class="chapter-tag kid">亲子</span></div>\n') if (imgs or vids) else ""
        body = _render_body(sec["body"])
        body_html = f"      {body}\n" if body else ""
        mb = media_block(items)
        out.append(
            f'    <div class="log-chapter">\n'
            f'      <div class="chapter-head">\n'
            f'        <span class="chapter-time">{sec["time"]}</span>\n'
            f'        <span class="chapter-title">{sec["title"]}</span>\n'
            f'      </div>\n'
            f'{body_html}'
            f'{tag}'
            f'{mb}'
            f'    </div>')
    chapters_html = "\n".join(out)
    return (
        '  <section class="section" id="log">\n'
        '    <h2 class="section-title">\n'
        '      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>\n'
        f'      {RECORD_HEADING}\n'
        '    </h2>\n'
        f'    <p class="section-desc">按时间顺序记录这一天的点滴；每章一段叙述 + 组图，点缩略图可切换主图。</p>\n'
        f'{chapters_html}\n'
        '    <div class="section-backtop"><a href="#top">↑ 返回顶部</a></div>\n'
        '  </section>')


def fill(tpl, date, intro, logs, chapters):
    # 顶部导航/页脚: 返回链接在两级深记录页 -> ../../index.html
    tpl = tpl.replace('../index.html', '../../index.html')
    # 令牌
    tpl = tpl.replace('{{SITE_LABEL}}', SITE_LABEL)
    tpl = tpl.replace('{{RECORD_HEADING}}', RECORD_HEADING)
    # 换肤（冷色）
    tpl = tpl.replace('--accent: #ffc46b;', f'--accent: {ACCENT};')
    tpl = tpl.replace('--accent2: #ffd9a0;', f'--accent2: {ACCENT2};')
    tpl = tpl.replace(
        "radial-gradient(ellipse at 50% -10%, rgba(255, 180, 100, 0.16) 0%, transparent 60%),\n                   radial-gradient(circle at 80% 20%, rgba(255, 200, 140, 0.10) 0%, transparent 40%);",
        HERO_GRAD)
    # hero
    tpl = tpl.replace('{{站点标题 · 如：XX公园半日游记录}} · XBrain',
                      f'高一军训第一天 · 泮塘随记 · XBrain')
    tpl = tpl.replace('{{出游标签 · 如：周日下午 · 家门口半日游}}', f'生活点滴 · {date}')
    tpl = tpl.replace('{{主标题}}', '高一军训第一天')
    tpl = tpl.replace('<span>高亮词</span>', '<span>泮塘</span>')
    tpl = tpl.replace('{{副标题 · 一句话感受，如：熟悉的园子，慢悠悠走一遍}}',
                      '送沙军训、泮塘寻味，老荔湾的烟火与文脉')
    tpl = tpl.replace('{{日期}}', date)
    tpl = tpl.replace('{{同行人}}', '沙（高一）')
    tpl = tpl.replace('{{交通方式}}', '自驾 + 周边步行')
    tpl = tpl.replace('🚗 {{交通方式}}', '🚗 自驾 / 步行')
    tpl = tpl.replace('🌤️ {{天气}}', '🌤️ 夏末晴热')
    # 开场白 = README 简介（已剥离围栏长文，不再照搬）
    tpl = tpl.replace('{{开场白：为什么去、整体感受、大概待了多久}}', intro)
    tpl = tpl.replace('{{约 X 小时}}', '约 10 小时')
    tpl = tpl.replace('{{自驾/地铁/步行}}', '自驾 / 步行')
    tpl = tpl.replace('{{约 ¥X / 免费}}', '免费（校服支出另计）')
    tpl = tpl.replace('{{入口 → 走了哪几个点 → 出口，约 X 公里 / X 步。熟悉的地方，跟着感觉走就行。}}',
                      '送沙入校（津园）→ 西外周边老街 → 下午泮塘/泮溪酒家 → 接沙放学')
    tpl = tpl.replace('{{天气 + 体感，是否需要防晒/带伞。纯记录，非出行前预警。}}',
                      '夏末晴热，户外行走建议补水防晒；纯记录。')
    tpl = tpl.replace('{{按时间或站点顺序写；每章一段叙述 + 可选组图，主图命名 index.*}}',
                      '按时间顺序记录这一天的点滴；每章一段叙述 + 组图，点缩略图可切换主图。')
    # #log section 整段替换
    tpl = re.sub(r'<section class="section" id="log">.*?</section>',
                 build_log_section(logs, chapters), tpl, flags=re.S)
    # food
    tpl = tpl.replace('{{吃了什么、哪家店、随手的小发现（小店/展览/路人有趣的事）}}',
                      '泮溪酒家的园林与点心、泮塘水乡的五秀风物、西关老字号与洋咖啡的街角碰撞。')
    tpl = tpl.replace('🍜 {{店名 / 小吃}}', '🍜 泮溪酒家')
    tpl = tpl.replace('{{吃了什么、味道、值得再来吗。}}',
                      '岭南园林酒家，临荔湾湖；隔壁粤剧歌声飘入。马蹄糕、绿茵白兔饺不可错过。')
    tpl = tpl.replace('{{人均 ¥X · 推荐指数}}', '人均视茶点 · 推荐指数 ★★★★★')
    tpl = tpl.replace('☕ {{店名 / 饮品}}', '🌿 泮塘五秀 · 马蹄文化')
    tpl = tpl.replace('{{环境、是否适合带娃、出片与否。}}',
                      '泮塘五秀（莲藕/马蹄/菱角/茭笋/茨菇）是水乡风物；周边马蹄粉产业仍可见，适合慢逛出片。')
    tpl = tpl.replace('{{人均 ¥X}}', '免费逛')
    # 追加第三个 food card（老字号碰撞）
    tpl = tpl.replace(
        '      <!-- 复制 .food-card 增加更多 -->\n',
        '      <div class="food-card">\n'
        '        <h4>☕ 西关老字号 × 洋咖啡</h4>\n'
        '        <p>老荔湾的老字号店铺与年轻人在排队的洋咖啡比邻，新旧并存，街角即风景。</p>\n'
        '        <div class="price">随手发现 · 免费</div>\n'
        '      </div>\n      <!-- 复制 .food-card 增加更多 -->\n')
    # notes
    tpl = tpl.replace('{{下次再来的tips：停车/门票/最佳时段/带什么，属回忆性备注}}',
                      '校服采购、泮塘顺游与最佳时段等回忆性备注。')
    tpl = tpl.replace('{{停车：哪进门、车位紧不紧张、收费多少}}', '周边老街停车位紧张，建议公共交通或就近短停。')
    tpl = tpl.replace('{{门票/开放：本次所见，非官方核实，仅供参考}}', '泮溪酒家正常营业；泮塘五约、仁威庙免费开放。')
    tpl = tpl.replace('{{最佳时段：人少/光线好的经验}}', '清晨人少清静；下午园林光影最佳，粤剧声起时最有味道。')
    tpl = tpl.replace('{{带什么：水、野餐垫、防蚊、换洗衣物…}}', '补水、防晒；带娃备替换衣物。')
    tpl = tpl.replace('{{亲子注意：母婴室/洗手间/婴儿车友好度}}', '泮溪酒家母婴/洗手间齐全；泮塘古村石板路婴儿车略颠。')
    # footer 站点名
    tpl = tpl.replace('{{站点名}}', '高一军训第一天 · 泮塘随记')
    return tpl


def main():
    if len(sys.argv) < 2:
        print("用法: python gen_travelogue.py <记录相对路径，如 2026/0816>")
        sys.exit(1)
    rel = sys.argv[1].replace("\\", "/")
    folder = os.path.join(HOME, "生活点滴", rel)
    readme = os.path.join(folder, "README.MD")
    if not os.path.isdir(folder):
        sys.exit(f"[错误] 目录不存在: {folder}")
    if not os.path.isfile(readme):
        sys.exit(f"[错误] 缺少 README.MD: {readme}")
    date, intro, logs = read_readme(readme)
    if not logs:
        sys.exit("[错误] README.MD 未解析到 ## 实录 分段（### HH:MM 标题）")
    media = scan_media(folder)
    if not media:
        sys.exit("[错误] 该目录未找到任何图片/视频")
    chapters = assign_chapters(media, logs)
    with open(SRC_TPL, encoding="utf-8") as f:
        tpl = f.read()
    out = fill(tpl, date, intro, logs, chapters)
    out_path = os.path.join(folder, "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(out)
    n_img = sum(1 for m in media if m["typ"] == "image")
    n_vid = sum(1 for m in media if m["typ"] == "video")
    print(f"[完成] {out_path}")
    print(f"  日期={date} 章节={len(logs)} 图片={n_img} 视频={n_vid} 总媒体={len(media)}")
    # 各章媒体分布
    for i, (sec, ch) in enumerate(zip(logs, chapters)):
        print(f"  · {sec['time']} {sec['title']} → {len(ch)} 媒体")


if __name__ == "__main__":
    main()
