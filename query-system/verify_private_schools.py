# 验证民办学校数据完整性
import re
import json

def extract_schools_from_md(filepath, section_patterns):
    """从markdown文件中提取学校名称"""
    schools = set()
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for pattern in section_patterns:
        # 找到对应章节
        section_match = re.search(pattern, content, re.DOTALL)
        if section_match:
            section = section_match.group(1)
            # 提取表格中的学校名称
            lines = section.split('\n')
            for line in lines:
                if line.startswith('|') and '学校名称' not in line and ':--' not in line:
                    parts = line.split('|')
                    if len(parts) >= 3:
                        school_name = parts[2].strip()
                        if school_name and school_name != '学校名称':
                            schools.add(school_name)
    return schools

def extract_schools_from_rawdata(filepath):
    """从rawData.ts中提取民办学校名称"""
    schools = set()
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 查找所有民办学校的行
    pattern = r'\|\s*\d+\s*\|\s*([^|]+)\|\s*民办\s*\|'
    matches = re.findall(pattern, content)
    for match in matches:
        school_name = match.strip()
        if school_name:
            schools.add(school_name)
    
    return schools

# 数据源文件
db_file = r'd:\data\wy25311753\workspace\ws_workbuddy\ws_study8\database\广州高中学校库.md'
rawdata_file = r'd:\data\wy25311753\workspace\ws_workbuddy\ws_study8\query-system\src\utils\rawData.ts'

# 从数据源提取民办学校
print("=" * 70)
print("[INFO] 从数据源提取民办学校")
print("=" * 70)

# 读取数据源，查找所有民办学校章节
with open(db_file, 'r', encoding='utf-8') as f:
    db_content = f.read()

# 提取所有MBG和MB开头的学校
db_schools = set()
mb_pattern = r'\|\s*MB[GT]?-[A-Z]+-\d+\s*\|\s*([^|]+)\|'
mb_matches = re.findall(mb_pattern, db_content)
for match in mb_matches:
    school_name = match.strip()
    if school_name:
        db_schools.add(school_name)

print(f"[SUMMARY] 数据源中民办学校总数: {len(db_schools)}")
for school in sorted(db_schools):
    print(f"  - {school}")

# 从rawData.ts提取民办学校
print("\n" + "=" * 70)
print("[INFO] 从 rawData.ts 提取民办学校")
print("=" * 70)

raw_schools = extract_schools_from_rawdata(rawdata_file)
print(f"[SUMMARY] rawData.ts中民办学校总数: {len(raw_schools)}")
for school in sorted(raw_schools):
    print(f"  - {school}")

# 对比差异
print("\n" + "=" * 70)
print("[INFO] 数据对比分析")
print("=" * 70)

# 数据源有但rawData没有
missing_in_raw = db_schools - raw_schools
if missing_in_raw:
    print(f"\n[WARN] 数据源中有但 rawData.ts 缺失的学校 ({len(missing_in_raw)}所):")
    for school in sorted(missing_in_raw):
        print(f"  [MISS] {school}")
else:
    print("\n[OK] 数据源中所有民办学校都在 rawData.ts 中")

# rawData有但数据源没有
extra_in_raw = raw_schools - db_schools
if extra_in_raw:
    print(f"\n[WARN] rawData.ts 中有但数据源缺失的学校 ({len(extra_in_raw)}所):")
    for school in sorted(extra_in_raw):
        print(f"  [EXTRA] {school}")
else:
    print("\n[OK] rawData.ts 中没有多余的民办学校")

# 名称差异
print("\n" + "=" * 70)
print("[INFO] 名称差异分析")
print("=" * 70)

# 尝试匹配相似名称
for db_school in sorted(db_schools):
    if db_school not in raw_schools:
        # 查找可能的匹配
        for raw_school in sorted(raw_schools):
            # 去除括号内容后比较
            db_base = re.sub(r'[（(].*?[）)]', '', db_school).strip()
            raw_base = re.sub(r'[（(].*?[）)]', '', raw_school).strip()
            if db_base == raw_base and db_school != raw_school:
                print(f"  [NAME_DIFF] 数据源: '{db_school}' -> rawData: '{raw_school}'")

print("\n" + "=" * 70)
print("[INFO] 验证完成")
print("=" * 70)
