# 📤 將 API 文檔上傳到 GitHub 指南

## 📋 準備工作確認

✅ **已完成**:
- ✅ Git 遠端倉庫已設定: `origin -> https://github.com/jeff-cheng101/ADAS-one-Demo.git`
- ✅ API 文檔已建立: `API-REFERENCE.md`
- ✅ 分支: `main`

---

## 🚀 執行步驟

### **步驟 1: 檢查當前狀態**
```bash
cd /Users/tongsijie/ADAS-one-Demo
git status
```

**預期看到**:
- `API-REFERENCE.md` (未追蹤文件)
- `backend/index.js` (已修改)
- `.DS_Store` (可忽略)

---

### **步驟 2: 加入文件到暫存區**

**選項 A: 只提交 API 文檔** (推薦)
```bash
git add API-REFERENCE.md
```

**選項 B: 同時提交 API 文檔和後端修改**
```bash
git add API-REFERENCE.md backend/index.js
```

**選項 C: 提交所有更改** (包含後端修改)
```bash
git add API-REFERENCE.md backend/index.js
```

---

### **步驟 3: 確認暫存的文件**
```bash
git status
```

**預期看到**:
```
Changes to be committed:
  new file:   API-REFERENCE.md
  modified:   backend/index.js  (如果選擇提交)
```

---

### **步驟 4: 提交更改**

**建議的提交訊息**:
```bash
git commit -m "docs: 新增完整的 API 參考文檔

- 新增 API-REFERENCE.md 包含 18 個 API 端點文檔
- 涵蓋 AI 配置、ELK 分析、趨勢對比、安全分析等功能
- 包含請求/回應範例和使用場景"
```

**簡短版本**:
```bash
git commit -m "docs: 新增 API 參考文檔 (API-REFERENCE.md)"
```

---

### **步驟 5: 推送到 GitHub**

```bash
git push origin main
```

如果遇到權限問題或需要認證，可能需要:
```bash
# 如果使用 HTTPS，可能需要輸入 GitHub 帳號密碼或 token
git push origin main

# 如果使用 SSH (推薦)
git remote set-url origin git@github.com:jeff-cheng101/ADAS-one-Demo.git
git push origin main
```

---

## ✅ 驗證上傳結果

### **方法 1: 在終端確認**
```bash
git log --oneline -1
```

### **方法 2: 在 GitHub 網站確認**
1. 訪問: https://github.com/jeff-cheng101/ADAS-one-Demo
2. 檢查是否有新的 commit
3. 確認 `API-REFERENCE.md` 文件存在

---

## 🎯 完整的單行指令組合

**快速提交所有更改**:
```bash
cd /Users/tongsijie/ADAS-one-Demo && \
git add API-REFERENCE.md backend/index.js && \
git commit -m "docs: 新增 API 參考文檔 (API-REFERENCE.md)" && \
git push origin main
```

**只提交 API 文檔**:
```bash
cd /Users/tongsijie/ADAS-one-Demo && \
git add API-REFERENCE.md && \
git commit -m "docs: 新增 API 參考文檔" && \
git push origin main
```

---

## 🔍 常見問題處理

### **問題 1: 需要先 pull**
如果遠端有更新，先執行:
```bash
git pull origin main
# 如果有衝突，解決後再 push
```

### **問題 2: 權限錯誤**
```bash
# 檢查遠端 URL
git remote -v

# 如果需要改用 SSH
git remote set-url origin git@github.com:jeff-cheng101/ADAS-one-Demo.git
```

### **問題 3: 提交後想修改訊息**
```bash
# 修改最後一次提交訊息（尚未 push）
git commit --amend -m "新的提交訊息"
git push origin main --force  # 注意：只有在沒有人基於你的提交工作時使用
```

### **問題 4: 想取消本次提交**
```bash
# 取消暫存（但保留文件）
git reset HEAD API-REFERENCE.md

# 完全取消並丟棄更改（謹慎使用）
git checkout -- API-REFERENCE.md
```

---

## 📝 提交訊息規範建議

使用一致的提交訊息格式有助於維護專案歷史：

```
<類型>: <簡短描述>

<詳細說明（可選）>
```

**常用類型**:
- `docs`: 文檔相關更改
- `feat`: 新功能
- `fix`: 修復問題
- `refactor`: 重構代碼
- `chore`: 構建過程或工具變更

**範例**:
```
docs: 新增 API 參考文檔

- 新增 API-REFERENCE.md 包含 18 個 API 端點
- 涵蓋所有主要功能模組
- 包含使用範例和常見場景
```

---

## 🎊 完成後

上傳成功後，其他人可以:
1. 在 GitHub 上查看 API 文檔
2. 克隆或拉取最新的程式碼和文檔
3. 參考 API 文檔進行開發整合

---

**需要幫助？** 執行 `git status` 隨時查看當前狀態！

