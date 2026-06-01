#!/bin/bash
cd "$(dirname "$0")"
echo "每日收支 App 预览服务已启动："
echo "http://127.0.0.1:8000"
echo
python3 -m http.server 8000 --bind 127.0.0.1
