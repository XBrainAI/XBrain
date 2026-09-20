#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""compress_media.py — compress_media.sh 的 Windows 服务入口。

为什么需要本入口:
  compress_media.sh 依赖 ffmpeg + ffprobe + Git Bash，本机（Windows）PATH 里
  三者均不可直接用（PATH 的 bash.exe 是 WSL 存根，imageio_ffmpeg 只有 ffmpeg）。
  本入口自动定位三项依赖并透传调用 .sh，让「上传后压缩」成为一条命令的服务。

定位顺序:
  ffmpeg/ffprobe: 环境变量 FFMPEG/FFPROBE（须两者齐全）→ static_ffmpeg（推荐，
                  pip install static-ffmpeg，含双二进制）→ imageio_ffmpeg（仅 ffmpeg，
                  缺 ffprobe 无法安全探测音轨，会拒绝执行以防 -an 静默丢音轨）
  bash.exe      : git.exe 同仓 <Git>/bin/bash.exe → 常见安装路径 → PATH 里的 bash
                  （显式排除 WindowsApps 下的 WSL 存根）

用法（参数与 .sh 完全一致，--help 看 .sh 头部说明）:
  python src/compress_media.py --dry-run 生活点滴/2026/0920     # 预览
  python src/compress_media.py --backup-dir ../_media_bak 生活点滴/2026/0920
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

# Git Bash 输出为 UTF-8 字节流，而 Windows 控制台默认 GBK 解码；
# 本入口接管字节流并按 UTF-8 解码后经 sys.stdout（GBK）重发，中文不乱码
ENCODING = "utf-8"


def locate_ff_tools():
    """定位 ffmpeg/ffprobe，返回 (ffmpeg, ffprobe)；ffprobe 可能为 None。"""
    env_ff = os.environ.get("FFMPEG", "")
    env_fp = os.environ.get("FFPROBE", "")
    if env_ff and env_fp and Path(env_ff).exists() and Path(env_fp).exists():
        return env_ff, env_fp
    try:
        # 首选 static_ffmpeg：一次性提供 ffmpeg + ffprobe 静态双二进制
        from static_ffmpeg import run as sf_run

        ffmpeg, ffprobe = sf_run.get_or_fetch_platform_executables_else_raise()
        if Path(ffmpeg).exists() and Path(ffprobe).exists():
            return ffmpeg, ffprobe
    except ImportError:
        pass
    try:
        # 兜底 imageio_ffmpeg：只有 ffmpeg，缺 ffprobe（宁缺毋滥，拒绝执行）
        import imageio_ffmpeg

        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        if Path(ffmpeg).exists():
            return ffmpeg, None
    except ImportError:
        pass
    return None, None


def locate_bash():
    """定位 Git Bash 的 bash.exe，排除 WSL 存根。"""
    # 1) 从 git.exe 反推同仓 bash: <Git>/cmd/git.exe → <Git>/bin/bash.exe
    git = shutil.which("git")
    if git:
        cand = Path(git).resolve().parent.parent / "bin" / "bash.exe"
        if cand.exists():
            return cand
    # 2) 常见安装路径
    for cand in (
        Path(r"C:\Program Files\Git\bin\bash.exe"),
        Path(r"C:\Program Files (x86)\Git\bin\bash.exe"),
        Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Git" / "bin" / "bash.exe",
    ):
        if cand.exists():
            return cand
    # 3) PATH 里的 bash，但 WindowsApps 下是 WSL 存根，绝不可用
    which = shutil.which("bash")
    if which and "windowsapps" not in which.lower():
        return Path(which)
    return None


def main():
    script = Path(__file__).resolve().parent / "compress_media.sh"
    if not script.exists():
        print("[FAIL] 未找到 compress_media.sh（应与本脚本同目录）")
        return 1

    ffmpeg, ffprobe = locate_ff_tools()
    if not ffmpeg or not ffprobe:
        print("[FAIL] 缺少 ffmpeg/ffprobe，无法安全压缩（ffprobe 缺失会导致视频音轨误删）")
        print("       修复: 用系统 Python 3.10 执行  pip install static-ffmpeg")
        print("       或设环境变量 FFMPEG / FFPROBE 指向已有二进制")
        return 1
    bash = locate_bash()
    if not bash:
        print("[FAIL] 未找到 Git Bash 的 bash.exe，请安装 Git for Windows")
        return 1

    print(f"[INFO] ffmpeg : {ffmpeg}")
    print(f"[INFO] ffprobe: {ffprobe}")
    print(f"[INFO] bash   : {bash}")

    # Windows 路径转正斜杠（bash.exe 接受 D:/... 风格），参数原样透传
    cmd = [str(bash), str(script).replace("\\", "/")] + sys.argv[1:]
    env = dict(os.environ, FFMPEG=ffmpeg, FFPROBE=ffprobe)
    proc = subprocess.Popen(
        cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
    )
    for raw in proc.stdout:
        sys.stdout.write(raw.decode(ENCODING, errors="replace"))
        sys.stdout.flush()
    return proc.wait()


if __name__ == "__main__":
    sys.exit(main())
