# DDoS 攻擊圖表演示系統啟動指南

## 🚨 "Failed to fetch" 錯誤解決方法

### 問題原因
前端無法連接到後端 API，通常是因為：
1. 後端服務未啟動
2. 前端服務未啟動
3. 端口衝突
4. 網絡連接問題

### 🔧 解決步驟

#### 1. 啟動後端服務
```bash
cd backend
node index.js
```
確認看到：`Backend API on http://localhost:8080`

#### 2. 啟動前端服務
```bash
cd frontend
npm start
```
確認看到：`webpack compiled successfully`

#### 3. 驗證服務
- 後端：http://localhost:8080/api/models
- 前端：http://localhost:3000

### 🧪 測試連接

#### 測試後端 API
```bash
curl http://localhost:8080/api/attack
curl http://localhost:8080/api/models
```

#### 測試前端載入
```bash
curl http://localhost:3000
```

### 🔄 重啟服務

如果遇到問題，請按順序重啟：

1. **停止所有服務**
```bash
pkill -f "node index.js"
pkill -f "npm start"
```

2. **重新啟動後端**
```bash
cd backend
node index.js &
```

3. **重新啟動前端**
```bash
cd frontend
npm start
```

### 🐛 常見問題

#### Q: 看到 "Failed to fetch" 錯誤
A: 檢查後端服務是否正在運行 (http://localhost:8080)

#### Q: 頁面空白或無法載入
A: 檢查前端服務是否正在運行 (http://localhost:3000)

#### Q: AI 分析失敗
A: 檢查 AI 助手設定頁面是否已配置 API Key

#### Q: 端口被占用
A: 更改端口或結束占用程序
```bash
lsof -i :3000  # 檢查前端端口
lsof -i :8080  # 檢查後端端口
```

### 📋 服務狀態檢查

```bash
# 檢查後端服務
ps aux | grep "node index.js"

# 檢查前端服務
ps aux | grep "npm start"

# 檢查端口使用
netstat -an | grep :3000
netstat -an | grep :8080
```

### 🎯 正確的啟動順序

1. ✅ 先啟動後端服務
2. ✅ 再啟動前端服務
3. ✅ 驗證兩個服務都正常運行
4. ✅ 打開瀏覽器訪問 http://localhost:3000

### 💡 提示

- 後端服務必須在前端服務之前啟動
- 確保沒有其他程序占用 3000 和 8080 端口
- 如果修改了後端程式碼，需要重新啟動後端服務
- 前端會自動重新載入，不需要手動重啟（除非遇到問題） 