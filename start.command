#!/bin/zsh
# Bật cả backend và frontend qua PM2
pm2 start /Users/hienthan/Developments/GoogleAds/crawler-demo/ecosystem.config.cjs

# Đợi 1 giây rồi tự động mở trình duyệt
sleep 1
open http://localhost:5173

echo "✅ App đã khởi động thành công tại http://localhost:5173"
