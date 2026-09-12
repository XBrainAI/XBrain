#!/bin/sh
# XBrain 仓库 pre-commit 钩子：媒体编码/体积守卫（源文件 tests/hooks/scan-media.js）
exec node "$(git rev-parse --show-toplevel)/tests/hooks/scan-media.js"
