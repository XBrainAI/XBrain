# -*- coding: utf-8 -*-
"""
妈子站数据一致性守卫（harness 检查层）
================================================
问题背景：深度汇总报告 `个人健康档案与深度医学分析报告.md` 中的统计数字
（报告总数 / 覆盖时间 / 时间线份数 / 患者年龄）是从目录内报告文件派生出来的，
但此前没有任何机制保证二者同步 → 新增报告后汇总报告长期停留在旧口径。

本脚本把「同步汇总报告」从软性提醒变成可执行的闸门：
在 generate_index.py 之后、git push 之前运行，全部通过方可推送。

用法：
    cd 健康/妈
    python generate_index.py
    python check_consistency.py      # 退出码 0 = PASS，1 = FAIL
"""
import re
import sys
from datetime import date
from pathlib import Path

BASE = Path(r"d:\data\wy25311753\workspace\git\github\XBrain\home\健康\妈")
SUMMARY = BASE / "个人健康档案与深度医学分析报告.md"
# 与 generate_index.py 的 EXCLUDE_FILES 保持一致（README.md 曾漏排除 → 生成 READ-ME- 垃圾条目）
EXCLUDE_FILES = {"个人健康档案与深度医学分析报告.md", "p.report.md", "README.md"}

# 患者出生年月（用于年龄一致性校验）
BIRTH_YEAR, BIRTH_MONTH = 1983, 9

errors = []
warnings = []
checks = []


def ok(name, detail=""):
    checks.append(("PASS", name, detail))


def bad(name, detail=""):
    checks.append(("FAIL", name, detail))
    errors.append(f"{name}：{detail}")


# ---------- 收集实际数据 ----------
md_files = sorted(f for f in BASE.glob("*.md") if f.name not in EXCLUDE_FILES)
total = len(md_files)
report_dates = set()
for f in md_files:
    d = f.stem.split("-")[0]
    if re.fullmatch(r"\d{8}", d):
        report_dates.add(f"{d[:4]}-{d[4:6]}-{d[6:8]}")
    else:
        # 文件名不合规会直接生成垃圾条目（曾出现 README.md → data-date="READ-ME-"），故为硬错误
        bad("文件名日期格式非法", f"{f.name} 不匹配 YYYYMMDD-项目-医院，会生成垃圾时间线条目；请加入 EXCLUDE_FILES 或改名")

latest_date = max(report_dates) if report_dates else ""
latest_year, latest_month = (int(latest_date[:4]), int(latest_date[5:7])) if latest_date else (0, 0)

if not SUMMARY.exists():
    print(f"[FAIL] 缺少汇总报告：{SUMMARY.name}")
    sys.exit(1)
text = SUMMARY.read_text(encoding="utf-8")


def find(pattern, label):
    m = re.search(pattern, text)
    if not m:
        bad(label, f"在汇总报告中未找到匹配「{pattern}」")
        return None
    return m


# ---------- 1. 报告总数 ----------
n = find(r"\*\*报告总数\*\*：\s*(\d+)\s*份", "报告总数")
if n:
    if int(n.group(1)) == total:
        ok("报告总数", f"{total} 份")
    else:
        bad("报告总数", f"汇总报告写 {n.group(1)} 份，实际 {total} 份")

# ---------- 2. 覆盖时间 ----------
n = find(r"\*\*报告覆盖时间\*\*：\s*(\d{4})年(\d{1,2})月\s*~\s*(\d{4})年(\d{1,2})月", "覆盖时间")
if n:
    ey, em = int(n.group(3)), int(n.group(4))
    if (ey, em) == (latest_year, latest_month):
        ok("覆盖时间", f"止于 {ey}年{em}月")
    else:
        bad("覆盖时间", f"汇总报告止于 {ey}年{em}月，最新报告为 {latest_year}年{latest_month}月")

# ---------- 3. 时间线标题份数 ----------
n = find(r"##\s*二、完整检查时间线（\s*(\d+)\s*份报告）", "时间线标题份数")
if n:
    if int(n.group(1)) == total:
        ok("时间线标题份数", f"{total} 份")
    else:
        bad("时间线标题份数", f"标题写 {n.group(1)} 份，实际 {total} 份")

# ---------- 4. 最新报告是否已入时间线 ----------
if latest_date:
    if latest_date in text:
        ok("最新报告已入时间线", latest_date)
    else:
        bad("最新报告已入时间线", f"汇总报告中未出现最新日期 {latest_date}")

# ---------- 5. 时间线是否含不存在的日期（幽灵行） ----------
table_dates = set(re.findall(r"^\|\s*(\d{4}-\d{2}-\d{2})\s*\|", text, re.MULTILINE))
ghost = sorted(d for d in table_dates if d not in report_dates)
if ghost:
    warnings.append("时间线表格含目录中不存在的日期（需人工确认）：" + ", ".join(ghost))
else:
    ok("时间线无幽灵日期", f"校验 {len(table_dates)} 个日期")

# ---------- 6. 患者年龄 ----------
today = date.today()
age = today.year - BIRTH_YEAR - (1 if today.month < BIRTH_MONTH else 0)
n = find(r"现\s*(\d+)\s*岁", "患者年龄")
if n:
    if int(n.group(1)) == age:
        ok("患者年龄", f"{age} 岁")
    else:
        bad("患者年龄", f"汇总报告写 {n.group(1)} 岁，按 {BIRTH_YEAR}-{BIRTH_MONTH:02d} 出生应为 {age} 岁")

# ---------- 7. 文末总结与免责声明的份数 ----------
tail = text[-1200:]
for pat, label in (
    (rf"(\d+)\s*份检查报告", "总结段份数"),
    (rf"所有\s*(\d+)\s*份检查资料", "免责声明份数"),
):
    m = re.search(pat, tail)
    if not m:
        warnings.append(f"{label}：未在文末匹配到，建议人工核对")
    elif int(m.group(1)) != total:
        bad(label, f"写 {m.group(1)} 份，实际 {total} 份")
    else:
        ok(label, f"{total} 份")

# ---------- 8. 生成页面无垃圾条目 ----------
index_html = BASE / "index.html"
if index_html.exists():
    html = index_html.read_text(encoding="utf-8")
    item_dates = re.findall(r'<div class="timeline-item" data-date="([^"]*)"', html)
    illegal = sorted({d for d in item_dates if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d)})
    if illegal:
        bad("生成页面含非法条目日期", "、".join(illegal) + "（多为非报告文件未排除，请检查 EXCLUDE_FILES）")
    else:
        ok("生成页面条目日期合法", f"{len(item_dates)} 条")

# ---------- 9. 遗留软措辞（历史坑位提醒） ----------
for stale in ("4年来", "4年间"):
    if stale in text:
        warnings.append(f"含时间跨度旧表述「{stale}」，若跨度已超 4 年建议改为「4年多来」")

# ---------- 输出 ----------
print("=" * 62)
print("妈子站数据一致性校验")
print("=" * 62)
for status, name, detail in checks:
    mark = "[PASS]" if status == "PASS" else "[FAIL]"
    print(f"{mark} {name}" + (f" — {detail}" if detail else ""))

if warnings:
    print("\n[WARN] 提示项（不阻断）：")
    for w in warnings:
        print(f"       - {w}")

print("-" * 62)
if errors:
    print(f"结果：FAIL（{len(errors)} 项不一致）—— 请修正汇总报告后重跑")
    sys.exit(1)
print(f"结果：PASS（报告 {total} 份，最新 {latest_date}）")
sys.exit(0)
