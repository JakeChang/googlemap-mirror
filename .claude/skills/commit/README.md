# Commit 使用指南

建立簡潔、符合規範的 git commit。

## 安裝

```bash
npx openskills install JakeChang/skill_pool/commit
npx openskills sync
```

## 使用方式

```
/commit
```

## 工作流程

1. 檢查 `git status` 和 `git diff` 查看變更
2. 分析變更內容
3. 執行 `git add .` 加入檔案
4. 建立 commit 並顯示結果

## Commit 訊息格式

```
<type>: <簡短描述>

- <詳細變更項目 1>
- <詳細變更項目 2>
- <詳細變更項目 3>
```

**type 類型：**

| Type | 說明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 錯誤修復 |
| `refactor` | 重構 |
| `chore` | 雜項維護 |
| `docs` | 文件更新 |
| `style` | 格式調整 |
| `test` | 測試相關 |

## 範例輸出

```
[main abc1234] feat: 新增使用者登入功能

- 建立 LoginForm 元件
- 新增 auth API 端點
- 整合 JWT 驗證

 3 files changed, 150 insertions(+)
 create mode 100644 src/components/LoginForm.vue
 create mode 100644 src/api/auth.ts
```

## 更新技能

```
/commit update
```

將本機的 commit skill 更新到最新版本。
