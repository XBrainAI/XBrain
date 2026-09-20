#!/usr/bin/env bash
# compress_media.sh — 批量压缩目录内的图片/视频（保质量、降体积，适合入库 git）
# 依赖: ffmpeg + ffprobe（Git Bash / Windows 均可用）
#
# 策略:
#   图片 jpg/jpeg : 重编码 JPEG（默认 -q:v 3 ≈ 质量85），默认去除 EXIF 等元数据
#   图片 png      : 重编码 PNG（含透明通道的跳过），仅在更小时才替换
#   视频 h264     : libx264  CRF20（默认），音频流直接 copy 不重编码
#   视频 hevc     : libx265  CRF24（默认），写 hvc1 tag，音频 copy
#   其他视频编码  : 统一转 h264 CRF20
#   所有输出只有比原文件小 --min-saving% 以上才会替换原文件，否则保留原文件
#
# 用法:
#   ./compress_media.sh [选项] [目录]     # 目录默认为当前目录
# 选项:
#   --dry-run          只预览将要做什么，不写任何文件
#   --backup-dir DIR   替换前把原文件按相对路径备份到 DIR
#   --preset NAME      x264/x265 预设（默认 slow；ultrafast..veryslow）
#   --jpeg-quality N   ffmpeg -q:v 档位（默认 3；2≈质量90，3≈85，4≈80，数字越小质量越高）
#   --crf-h264 N       默认 20
#   --crf-hevc N       默认 24
#   --webp             图片改转 WebP（体积更小，扩展名会变为 .webp）
#   --keep-exif        保留图片元数据（默认去除；去 EXIF 一般还能省几百 KB/张）
#   --min-saving PCT   压缩收益低于此百分比则放弃（默认 5）
#   --min-size KB      小于该 KB 的图片直接跳过（默认 200，再压意义不大）
#   --video-preset-only / --image-only / --video-only   只处理其中一类
#   -h, --help         显示帮助
#
# 示例:
#   ./compress_media.sh --dry-run .                 # 预览
#   ./compress_media.sh --backup-dir ../_bak .      # 压缩当前目录并备份原件
#   ./compress_media.sh --webp ./screenshots        # 图片转 webp 求极致体积

set -u
FFMPEG=${FFMPEG:-ffmpeg}
FFPROBE=${FFPROBE:-ffprobe}

DRY_RUN=0; JPEG_Q=3; CRF_H264=20; CRF_HEVC=24; PRESET=slow
MIN_SAVING=5; MIN_IMG_KB=200; TO_WEBP=0; KEEP_EXIF=0
BACKUP_DIR=""; DIR="."; FILTER="all"

usage() { grep '^#   ' "$0" | sed 's/^#   //;s/^#//'; exit 0; }

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --backup-dir) BACKUP_DIR="$2"; shift ;;
    --preset) PRESET="$2"; shift ;;
    --jpeg-quality) JPEG_Q="$2"; shift ;;
    --crf-h264) CRF_H264="$2"; shift ;;
    --crf-hevc) CRF_HEVC="$2"; shift ;;
    --webp) TO_WEBP=1 ;;
    --keep-exif) KEEP_EXIF=1 ;;
    --min-saving) MIN_SAVING="$2"; shift ;;
    --min-size) MIN_IMG_KB="$2"; shift ;;
    --image-only) FILTER="image" ;;
    --video-only) FILTER="video" ;;
    -h|--help) usage ;;
    *) DIR="$1" ;;
  esac
  shift
done

command -v "$FFMPEG" >/dev/null 2>&1 || { echo "错误: 未找到 ffmpeg（可用 FFMPEG=路径 环境变量指定）" >&2; exit 1; }
# ffprobe 必须存在: 视频音轨探测依赖它，缺失时 probe_audio 返回空会走 -an 静默丢音轨
command -v "$FFPROBE" >/dev/null 2>&1 || { echo "错误: 未找到 ffprobe（可用 FFPROBE=路径 环境变量指定；系统 Python 3.10 可 pip install static-ffmpeg 获得）" >&2; exit 1; }
[ -d "$DIR" ] || { echo "错误: 目录不存在: $DIR" >&2; exit 1; }

IMG_EXT='*.jpg|*.jpeg|*.png'
VID_EXT='*.mp4|*.mov|*.mkv|*.avi|*.webm|*.m4v'
case "$FILTER" in
  image) PATTERN=(-iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png') ;;
  video) PATTERN=(-iname '*.mp4' -o -iname '*.mov' -o -iname '*.mkv' -o -iname '*.avi' -o -iname '*.webm' -o -iname '*.m4v') ;;
  *)     PATTERN=(-iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.mp4' -o -iname '*.mov' -o -iname '*.mkv' -o -iname '*.avi' -o -iname '*.webm' -o -iname '*.m4v') ;;
esac

TOTAL_IN=0; TOTAL_OUT=0; N_DONE=0; N_SKIP=0; N_FAIL=0

human() { # 字节数 -> 人类可读
  local b=$1
  awk -v b="$b" 'BEGIN{s="B";if(b>=1048576){b/=1048576;s="M"}else if(b>=1024){b/=1024;s="K"}printf "%.1f%s",b,s}'
}

filesize() { stat -c %s "$1" 2>/dev/null || echo 0; }

# 探测视频流信息: 输出 "vcodec acodec"
probe_video() {
  "$FFPROBE" -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$1" 2>/dev/null | head -1
}
probe_audio() {
  "$FFPROBE" -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$1" 2>/dev/null | head -1
}
probe_pixfmt() {
  "$FFPROBE" -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$1" 2>/dev/null | head -1
}

# 计划写备份（镜像相对路径）
do_backup() {
  [ -n "$BACKUP_DIR" ] || return 0
  local rel="${1#"$DIR"/}" dir
  dir="$BACKUP_DIR/$(dirname "$rel")"
  mkdir -p "$dir"
  cp -p "$1" "$dir/$(basename "$rel")"
}

commit() { # 收益达标才落地: $1=tmp $2=orig $3=原大小
  local tmp=$1 orig=$2 old=$3 new
  new=$(filesize "$tmp")
  local gain=$(( (old - new) * 100 / (old>0?old:1) ))
  if [ "$new" -ge "$old" ] || [ "$gain" -lt "$MIN_SAVING" ]; then
    rm -f "$tmp"; N_SKIP=$((N_SKIP+1))
    printf '  [跳过] 收益 %d%% < %d%%，保留原文件\n' "$gain" "$MIN_SAVING"
    return 0
  fi
  if [ "$DRY_RUN" -eq 1 ]; then rm -f "$tmp"; fi
  if [ "$DRY_RUN" -eq 0 ]; then
    do_backup "$orig"
    mv -f "$tmp" "$orig"
  fi
  TOTAL_IN=$((TOTAL_IN+old)); TOTAL_OUT=$((TOTAL_OUT+new)); N_DONE=$((N_DONE+1))
  printf '  [完成] %s -> %s （省 %d%%）\n' "$(human "$old")" "$(human "$new")" "$gain"
}

compress_image() {
  local f=$1 base ext out tmp pix
  base="${f%.*}"; ext="${f##*.}"
  if [ "$TO_WEBP" -eq 1 ]; then out="$base.webp"; else out="$f"; fi
  tmp="${out}.tmp$$"
  pix=$(probe_pixfmt "$f")
  case "$pix" in *rgba*|*bgra*|*argb*|*abgr*|*alpha*|*pal8*)
    if [ "$TO_WEBP" -eq 0 ]; then printf '  [跳过] 含透明通道且目标是 JPEG，不动\n'; N_SKIP=$((N_SKIP+1)); return 0; fi ;;
  esac
  local meta=(); [ "$KEEP_EXIF" -eq 0 ] && meta=(-map_metadata -1)
  if [ "$TO_WEBP" -eq 1 ]; then
    "$FFMPEG" -nostdin -y -hide_banner -loglevel error -i "$f" "${meta[@]}" -c:v libwebp -quality 85 -f image2 "$tmp"
  elif [ "${ext,,}" = "png" ]; then
    "$FFMPEG" -nostdin -y -hide_banner -loglevel error -i "$f" "${meta[@]}" -c:v png -compression_level 9 -f image2 "$tmp"
  else
    "$FFMPEG" -nostdin -y -hide_banner -loglevel error -i "$f" "${meta[@]}" -c:v mjpeg -q:v "$JPEG_Q" -huffman optimal -f mjpeg "$tmp"
  fi
  [ $? -eq 0 ] || { rm -f "$tmp"; N_FAIL=$((N_FAIL+1)); printf '  [失败] ffmpeg 编码出错，保留原文件\n'; return 0; }
  commit "$tmp" "$f" "$(filesize "$f")"
}

compress_video() {
  local f=$1 ext tmp vcodec acodec
  ext="${f##*.}"; ext="${ext,,}"
  tmp="${f}.tmp$$"
  vcodec=$(probe_video "$f"); acodec=$(probe_audio "$f")
  local venc acode
  case "$vcodec" in
    h264) venc=(-c:v libx264 -crf "$CRF_H264" -preset "$PRESET") ;;
    hevc|h265) venc=(-c:v libx265 -crf "$CRF_HEVC" -preset "$PRESET" -tag:v hvc1) ;;
    *) venc=(-c:v libx264 -crf "$CRF_H264" -preset "$PRESET") ;;
  esac
  case "$acodec" in
    aac|mp3) acode=(-c:a copy) ;;
    "") acode=(-an) ;;
    *) acode=(-c:a aac -b:a 128k) ;;
  esac
  local mov=(); case "$ext" in mp4|mov|m4v) mov=(-movflags +faststart) ;; esac
  local vfmt; case "$ext" in mp4|m4v) vfmt=mp4 ;; mov) vfmt=mov ;; mkv) vfmt=matroska ;; avi) vfmt=avi ;; webm) vfmt=webm ;; *) vfmt=mp4 ;; esac
  "$FFMPEG" -nostdin -y -hide_banner -loglevel error -i "$f" -map 0:v:0 -map '0:a?' \
    "${venc[@]}" "${acode[@]}" "${mov[@]}" -f "$vfmt" "$tmp"
  [ $? -eq 0 ] || { rm -f "$tmp"; N_FAIL=$((N_FAIL+1)); printf '  [失败] ffmpeg 编码出错，保留原文件\n'; return 0; }
  commit "$tmp" "$f" "$(filesize "$f")"
}

echo "== 压缩目录: $DIR （dry-run=$DRY_RUN preset=$PRESET jpeg_q=$JPEG_Q crf_h264=$CRF_H264 crf_hevc=$CRF_HEVC webp=$TO_WEBP）=="
while IFS= read -r -d '' f; do
  [ "${f##*.}" = "tmp$$" ] && continue   # 跳过临时文件
  printf '%s\n' "${f#"$DIR"/}"
  if [[ "${f,,}" =~ \.(jpg|jpeg|png)$ ]]; then
    if [ "$FILTER" = "video" ]; then continue; fi
    local_size=$(filesize "$f")
    [ "$local_size" -lt $((MIN_IMG_KB*1024)) ] && { printf '  [跳过] 图片小于 %sKB\n' "$MIN_IMG_KB"; N_SKIP=$((N_SKIP+1)); continue; }
    compress_image "$f"
  else
    if [ "$FILTER" = "image" ]; then continue; fi
    compress_video "$f"
  fi
done < <(find "$DIR" -type f \( "${PATTERN[@]}" \) -print0 | sort -z)

SAVED=$((TOTAL_IN - TOTAL_OUT))
echo "----------------------------------------"
printf '完成 %d 个，跳过 %d 个，失败 %d 个\n' "$N_DONE" "$N_SKIP" "$N_FAIL"
printf '合计: %s -> %s （节省 %s，降幅 %d%%）\n' \
  "$(human "$TOTAL_IN")" "$(human "$TOTAL_OUT")" "$(human "$SAVED")" \
  "$(( TOTAL_IN>0 ? (TOTAL_IN-TOTAL_OUT)*100/TOTAL_IN : 0 ))"
