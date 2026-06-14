# 修复 rawData.ts 中的民办学校数据
import re

filepath = r'd:\data\wy25311753\workspace\ws_workbuddy\ws_study8\query-system\src\utils\rawData.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 记录修改次数
changes = 0

# 1. 替换名称变更的学校
replacements = {
    # 北培 -> 朝晖
    '广州市北培高级中学有限公司（公费班）': '广州市朝晖高级中学有限公司（原北培）（公费班）',
    '广州市北培高级中学有限公司': '广州市朝晖高级中学有限公司（原北培）',
    # 央美 -> 南郡
    '广州市央美现代高级中学有限公司（公费班）': '广州市南郡高级中学有限公司（原央美现代高级中学）（公费班）',
    '广州市央美现代高级中学有限公司': '广州市南郡高级中学有限公司（原央美现代高级中学）',
}

for old_name, new_name in replacements.items():
    count = content.count(old_name)
    if count > 0:
        content = content.replace(old_name, new_name)
        changes += count
        print(f"[REPLACE] '{old_name}' -> '{new_name}' ({count}处)")

# 2. 删除已不存在的学校（整行删除）
schools_to_remove = [
    '广州南洋英文学校',
    '博罗县东江广雅学校有限公司',
    '广州市华美英语实验学校（中加高中）',
    '广州市博萃德学校',
    '广州市番禺区祈福英语实验学校（中美加班）',
    '广州市香江中学（AP 课程班）',
    '广州龙涛外国语学校（原南洋英文学校）（公费班）',
    '广州龙涛外国语学校（原南洋英文学校）',
]

lines = content.split('\n')
new_lines = []
removed_count = 0

for line in lines:
    should_remove = False
    for school in schools_to_remove:
        if school in line and line.strip().startswith('|'):
            should_remove = True
            removed_count += 1
            print(f"[REMOVE] {line.strip()}")
            break
    if not should_remove:
        new_lines.append(line)

content = '\n'.join(new_lines)

# 3. 重新编号民办学校（在各自的数据块中）
# 找到所有民办学校的表格并重新编号
def renumber_private_schools(text):
    # 匹配民办学校表格区域
    pattern = r'(### 二、民办普通高中.*?\n\|.*?\|\n)(.*?)(?=\n###|\nexport|\Z)'
    
    def replace_section(match):
        header = match.group(1)
        body = match.group(2)
        
        lines = body.strip().split('\n')
        new_lines = []
        idx = 1
        for line in lines:
            if line.strip().startswith('|') and '学校名称' not in line and ':--' not in line:
                # 替换序号
                new_line = re.sub(r'^\|\s*\d+\s*\|', f'| {idx} |', line, count=1)
                new_lines.append(new_line)
                idx += 1
            else:
                new_lines.append(line)
        
        return header + '\n'.join(new_lines) + '\n'
    
    return re.sub(pattern, replace_section, text, flags=re.DOTALL)

content = renumber_private_schools(content)

# 保存修改
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n[SUCCESS] 共修改 {changes} 处名称，删除 {removed_count} 行")
print(f"[INFO] 文件已保存: {filepath}")
