# -*- coding: utf-8 -*-
"""
深圳周末家庭游 · 游记章节自动生成器（原型）
规则：主题优先（R0 文件名主题词） + 时间戳范围归并（R3 gap 聚类）
输入：游记/ 文件夹（文件名含主题与时间戳）
输出：index.auto.html（用生成章节替换 #log） + 控制台对比报告

设计说明：
- 素材分组/排序/自动包含新文件 由本脚本完成（数据驱动、确定性、可复现）
- 章节文案（标题/描写/标签）来自 THEME_META 受控配置（人工策展的质量层）
- 作者意图无法从文件名推导处（如同主题跨章节），用 PINNED 硬边界兜底
"""
import os, re, datetime, sys

BASE = os.path.dirname(os.path.abspath(__file__))
FOLDER = os.path.join(BASE, "游记")
PAGE = os.path.join(BASE, "index.html")
OUT = os.path.join(BASE, "index.auto.html")

# ---------- 可调参数（算法的"动态分析"收敛为两个确定性常量） ----------
GAP_MAX = 90          # 相邻素材间隔超过此分钟数 → 强制拆章
THEME_MIN = 20        # 主题切换且间隔超过此分钟数 → 拆章（否则归并）
SAME_LOC_MERGE = 60   # 同城（文件名地点前缀相同）且间隔 < 此值 → 强制归并
PINNED = {"清晨退潮", "清晨最后一眼"}   # 作者硬边界：永不自动并入邻章

# ---------- 主题受控词表 + 策展文案 ----------
# time: 章节时间标签; order: 排序用绝对时间; caption: 描写; tags: 标签
THEME_META = {
    "早餐": dict(time="07-11 07:00", order=datetime.datetime(2026,7,11,7,0),
        caption="周六天还没大亮，4 口之家从荔湾西村出发。两车程对小孩是考验，所以我们早走、中途在服务区吃顿踏实的早餐。厚街服务区里，热气腾腾的粥粉面，小孩扒着碗，爸妈借着咖啡醒神——旅行的仪式感，往往从服务区第一口热食开始。",
        tags=[("eat","早餐"),("drive","自驾"),("free","服务区")]),
    "海洋世界": dict(time="07-11 10:30", order=datetime.datetime(2026,7,11,10,30),
        caption="抵达小梅沙，停好车直奔海洋世界。入口那座白色海神雕塑群，小孩仰头看了好久。极地馆的企鹅、海底隧道的鲨鱼、还有海豚表演——这是本次唯一完整玩下来的核心。爸举着手机拍个不停，妈在旁边笑：「值了，光这一项就值了。」",
        tags=[("view","海洋世界"),("kid","亲子")]),
    "妈发烧": dict(time="07-11 12:30", order=datetime.datetime(2026,7,11,12,30), text=True,
        caption="午餐时，妈说不舒服，一量体温——发烧了。原本打算下午去世界之窗、第二天再奔大鹏，那一刻全被放下。我们快速吃完，决定放弃所有后续景点，回酒店等入住、让妈休息。爸后来笑着说：「原计划写得那么满，最后救场的，是酒店。」",
        tags=[("warn","临时调整"),("","健康优先")]),
    "入住初见海": dict(time="07-11 13:54", order=datetime.datetime(2026,7,11,13,54),
        caption="回酒店等待入住的间隙，先去海边走了一圈。酒店沙滩景致第一次撞进眼里——湛蓝、开阔，妈靠在栏杆上深吸一口气：「先不管去哪，这一眼就值了。」旅行的松弛，往往从放下计划的那一刻开始。",
        tags=[("view","海景"),("hotel","酒店"),("free","初见")]),
    "儿童乐园": dict(time="07-11 14:37", order=datetime.datetime(2026,7,11,14,37),
        caption="酒店里的儿童乐园成了兄弟俩的小天地。滑梯、海洋球、攀爬架，玩到满头大汗。妈在旁边躺椅上看着，脸色渐渐好起来。原来「不出门」也能这么尽兴——度假的真谛，是被允许什么都不赶。",
        tags=[("kid","儿童乐园"),("hotel","酒店")]),
    "沙滩疯跑": dict(time="07-11 17:00", order=datetime.datetime(2026,7,11,17,0),
        caption="入住后妈躺下，爸带两兄弟下楼。酒店质素真的在线，推开窗就是海。小孩在沙滩上追逐浪花、堆沙堡，沙子沾了满脸也乐。妈在楼上歇着，听见楼下笑闹，发来一条：「你们玩，我缓一会儿。」那一刻忽然觉得，旅行的意义不在打卡，而在各得其所。",
        tags=[("kid","沙滩"),("hotel","海景"),("view","自由")]),
    "海景晚餐": dict(time="07-11 18:14", order=datetime.datetime(2026,7,11,18,14),
        caption="上来换好衣服，到酒店高端海景餐厅。窗外就是海，灯光温柔。妈精神好了些，给俩小子夹菜；小孩难得安静坐着，把盘子吃得干净。爸举杯：「敬临时改的计划。」一家人笑作一团。",
        tags=[("eat","晚餐"),("view","海景")]),
    "夜里美高梅": dict(time="07-11 19:30", order=datetime.datetime(2026,7,11,19,30),
        caption="晚饭后散步，夜里的美高梅灯火璀璨，海风轻轻。泳池边的灯、大堂的吊灯、沙滩远处渔船的星点，都映在玻璃上。妈说：「这样也挺好。」旅行不必赶场，慢下来才看得见光。",
        tags=[("view","夜景"),("hotel","酒店"),("free","散步")]),
    "Mshow": dict(time="07-11 20:00", order=datetime.datetime(2026,7,11,20,0),
        caption="饭后拐到 M-show 的场地——来自国外的杂技演员，力量与柔美交错，空中飞人、柔术、火环，小孩看直了眼，连呼吸都忘了。表演结束，全场掌声。这是酒店送给我们的意外惊喜。",
        tags=[("view","夜景"),("kid","演出"),("hotel","酒店")]),
    "清晨退潮": dict(time="07-12 06:03", order=datetime.datetime(2026,7,12,6,3),
        caption="退房前，赶在清晨退潮去沙滩走了一圈。滩涂映着晨光，安静得只有海浪声。俩小子光脚踩水，妈在岸边笑着拍照。回程在即，却因这半小时的安静，整趟旅行忽然圆满。",
        tags=[("view","日出"),("free","免费"),("kid","亲子")]),
    "清晨最后一眼": dict(time="07-12 07:18", order=datetime.datetime(2026,7,12,7,18),
        caption="退房后没急着走，又绕着酒店转了转。清晨的酒店大堂空荡安静，落地窗把整片海框成一幅画；沙滩在晨光里泛着金。兄弟俩趴在窗边，谁也没说话——好像要把这海，装进记忆里带走。",
        tags=[("view","日出"),("hotel","酒店"),("free","免费")]),
    "福永午餐": dict(time="07-12 13:00", order=datetime.datetime(2026,7,12,13,0),
        caption="长途自驾，福永服务区的一顿午餐格外香。两兄弟「津津有味」地扒着饭，爸妈相视一笑——出门时妈还病着，回家时全家人都精神了。车窗外高速飞驰，后视镜里是渐渐远去的深圳海岸。",
        tags=[("eat","午餐"),("drive","回程")]),
    "彩蛋": dict(time="🚗 彩蛋", order=datetime.datetime(2026,7,13,7,25),
        caption="回来后翻行车记录仪，截下一帧——高速、海、和后视镜里渐渐缩小的城市。这趟旅行没有按计划走，却把「一家人好好在一起」这件事，记得比哪次都清楚。",
        tags=[("drive","自驾"),("free","记录")]),
}

# ---------- 文件名 → 主题分类（R0：主题词提取） ----------
def classify(name, dt):
    n = name
    if "早餐" in n or "厚街" in n: return "早餐"
    if "海洋世界" in n: return "海洋世界"
    if "Mshow" in n or "M-show" in n: return "Mshow"
    if "儿童乐园" in n: return "儿童乐园"
    if "沙滩兄弟" in n: return "沙滩疯跑"
    if "海滩" in n: return "沙滩疯跑"
    if "晚饭" in n or "海景餐厅" in n: return "海景晚餐"
    if "晚饭后散步" in n: return "夜里美高梅"
    if "酒店夜景" in n: return "夜里美高梅"
    if "夜景" in n: return "夜里美高梅"
    if "酒店沙滩景致" in n or "沙滩景致" in n:
        if dt.day == 11:                      # 07-11 13:54 两段视频 → 入住初见海
            return "入住初见海"
        low = datetime.datetime(2026,7,12,6,0); high = datetime.datetime(2026,7,12,6,30)
        return "清晨退潮" if low <= dt < high else "清晨最后一眼"
    if "酒店内景" in n: return "清晨最后一眼"
    if "回程" in n or "福永" in n or "午餐" in n: return "福永午餐"
    if "行车记录" in n or "713" in n: return "彩蛋"
    return "其他"

def parse_dt(name):
    m = re.search(r"(\d{8})[_\-](\d{6})", name)
    if not m: return None
    return datetime.datetime.strptime(m.group(1)+m.group(2), "%Y%m%d%H%M%S")

# ---------- 扫描文件夹 ----------
def scan():
    items = []  # (theme, dt, file, is_video)
    for f in sorted(os.listdir(FOLDER)):
        if f.lower().endswith((".md",)): continue
        if not re.search(r"\.(jpg|jpeg|png|mp4|webm)$", f, re.I): continue
        dt = parse_dt(f)
        if not dt:
            print("  [跳过] 无法解析时间戳:", f); continue
        items.append((classify(f, dt), dt, f, f.lower().endswith((".mp4",".webm"))))
    return items

# ---------- 渲染单主题章节 HTML ----------
def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def render_theme(theme, files):
    meta = THEME_META[theme]
    imgs = [f for f in files if not f[3]]
    vids = [f for f in files if f[3]]
    media = ""
    if imgs:
        cover = imgs[0][2]
        gal = "".join(
            '<img src="游记/%s" alt="%s" loading="lazy" decoding="async">' % (esc(f[2]), esc(theme))
            for f in imgs)
        media += ('<div class="media-block">\n'
                  '  <div class="media-cover"><img src="游记/%s" alt="%s" loading="lazy" decoding="async"></div>\n'
                  '  <div class="media-gallery">%s</div>\n</div>\n' % (esc(cover), esc(theme), gal))
    if vids:
        media += '<p class="log-video-cap">▶ %s（视频实拍）</p>\n' % esc(meta["time"] if meta["time"]!="🚗 彩蛋" else "彩蛋")
        for _,_,vf,_ in vids:
            # 视频首屏预览：参考古埃及子站原生方案——不设 poster（poster 指向 .mp4 无效→黑块），
            # 仅用 preload="metadata"，浏览器原生显示首帧。
            media += ('<video class="log-video" controls preload="metadata"><source src="游记/%s" type="video/mp4"></video>\n'
                      % esc(vf))
    tags = "".join('<span class="chapter-tag %s">%s</span>' % (cls, esc(txt)) for cls,txt in meta["tags"])
    return ('    <div class="log-chapter">\n'
            '      <div class="chapter-head"><span class="chapter-time">%s</span><span class="chapter-title">%s</span></div>\n'
            '      <p>%s</p>\n'
            '      <div class="chapter-tags">%s</div>\n'
            '      %s'
            '    </div>' % (esc(meta["time"]), esc(theme), esc(meta["caption"]), tags, media))

# ---------- 聚类（R3） ----------
def cluster(themes_sorted, gap_max, theme_min, pinned):
    """themes_sorted: list of (theme, dt). 返回 clusters: list[list[theme]] 与 merges 记录。"""
    clusters = []; merges = []
    cur = []; cur_end = None
    for theme, dt in themes_sorted:
        if not cur:
            cur = [theme]; cur_end = dt; continue
        gap = (dt - cur_end).total_seconds()/60.0
        cur_has_pinned = any(t in pinned for t in cur)
        start_new = (gap > gap_max) or (theme != cur[-1] and gap > theme_min) or (theme in pinned) or cur_has_pinned
        if start_new:
            clusters.append(cur); cur = [theme]; cur_end = dt
        else:
            if theme != cur[-1]:
                merges.append((cur[-1], theme, round(gap)))
            cur.append(theme); cur_end = max(cur_end, dt)
    if cur: clusters.append(cur)
    return clusters, merges

# ---------- 主流程 ----------
def main():
    print("=== 扫描 游记/ ===")
    items = scan()
    by_theme = {}
    for theme, dt, f, vid in items:
        by_theme.setdefault(theme, []).append((theme, dt, f, vid))
    for t in by_theme: by_theme[t].sort(key=lambda x: x[1])
    print("  素材 %d 个 → 主题 %d 个: %s" % (len(items), len(by_theme), ", ".join(sorted(by_theme))))

    # 排序主题（用 THEME_META.order；含无素材的文本章如"妈发烧"）
    # 规则"无图必然不对"：只渲染「有真实素材」或「显式文本章(text=True)」的主题；
    #   其余（无素材又非文本标记，如曾引用不存在文件的 夜里沙滩）一律跳过，
    #   从根上杜绝"空章节 / 坏视频引用"。
    order_map = {t: THEME_META[t]["order"] for t in THEME_META}
    def keep_theme(t):
        if by_theme.get(t): return True          # 有真实素材
        if THEME_META[t].get("text"): return True # 显式文本章（如妈发烧）
        return False
    themes_sorted = [t for t in sorted(THEME_META.keys(), key=lambda t: order_map[t]) if keep_theme(t)]

    print("\n=== 聚类（GAP_MAX=%d, THEME_MIN=%d, PINNED=%s）===" % (GAP_MAX, THEME_MIN, sorted(PINNED)))
    clusters, merges = cluster([(t, order_map[t]) for t in themes_sorted], GAP_MAX, THEME_MIN, PINNED)
    chapters = []
    for c in clusters:
        if len(c) == 1:
            t = c[0]
            chapters.append(render_theme(t, by_theme.get(t, [])))
            print("  · [%s] %s" % (THEME_META[t]["time"], t))
        else:
            t0 = THEME_META[c[0]]["time"]; t1 = THEME_META[c[-1]]["time"]
            print("  · [合并] %s ~ %s : %s" % (t0, t1, " + ".join(c)))
            sub = ""
            for t in c:
                sub += ("      <div class=\"chapter-sub\"><div class=\"chapter-head\"><span class=\"chapter-time\">%s</span><span class=\"chapter-title\">%s</span></div>\n"
                        % (THEME_META[t]["time"], t))
                sub += render_theme(t, by_theme.get(t, [])).split("</div>\n", 2)[-1]
                sub = sub.rstrip("\n") + "\n      </div>\n"
            blk = ('    <div class="log-chapter">\n'
                   '      <div class="chapter-head"><span class="chapter-time">%s ~ %s</span><span class="chapter-title">时段概览</span></div>\n'
                   '      <p>以下相邻活动处于同一连续时段，自动归并为一章。</p>\n%s'
                   '    </div>' % (t0, t1, sub))
            chapters.append(blk)
    if merges:
        print("  归并记录:", merges)
    else:
        print("  归并记录: 无（本届数据各活动间隔均 > THEME_MIN，未触发跨主题归并）")

    # 生成预览页
    s = open(PAGE, encoding="utf-8").read()
    m = re.search(r'(<section class="section" id="log" hidden>.*?</p>\n)', s, re.S)
    prefix = s[:m.end()]
    rest = s[m.end():]
    idx = rest.index('</div>    <div class="section-backtop">')
    suffix = rest[idx+len('</div>'):]   # 去掉紧邻的最后一个章节闭合 div（已由 new_middle 末章自身闭合）
    new_middle = "\n\n".join(chapters)
    s2 = prefix + new_middle + suffix
    open(OUT, "w", encoding="utf-8").write(s2)
    print("\n已写入预览:", OUT)

    # 校验
    print("\n=== 校验 ===")
    print("  div", s2.count("<div"), s2.count("</div>"), "section", s2.count("<section"), s2.count("</section>"))
    refs = sorted(set(re.findall(r'游记/([^"\'>\s]+)', s2)))
    disk = sorted(f for f in os.listdir(FOLDER) if not f.lower().endswith(".md"))
    missing = [r for r in refs if r not in disk]
    unused = [d for d in disk if d not in refs]
    print("  引用素材 %d / 磁盘 %d | MISSING %s | UNUSED %s" % (len(refs), len(disk), missing, unused))
    # 对比当前手动章节
    cur_chapters = re.findall(r'class="chapter-time">([^<]+)<', s)
    print("  当前手动章节时间序(%d): %s" % (len(cur_chapters), cur_chapters))
    new_times = re.findall(r'class="chapter-time">([^<]+)<', s2)
    print("  生成章节时间序(%d): %s" % (len(new_times), new_times))

    # 演示：若取消"主题切换拆章"（theme_min 拉到极大），看连续时段内多主题如何归并
    print("\n=== 假设 THEME_MIN=999（仅按 GAP_MAX 归并，演示跨主题归并行为）===")
    c2, mg2 = cluster([(t, order_map[t]) for t in themes_sorted], GAP_MAX, 999, PINNED)
    for cc in c2:
        if len(cc) > 1:
            print("  合并章:", " + ".join(cc))
    if not [cc for cc in c2 if len(cc)>1]:
        print("  （无）")

if __name__ == "__main__":
    main()
