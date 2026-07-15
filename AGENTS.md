# 專案協作規則

- 所有由 Codex 建立的 Git commit message 預設使用繁體中文，除非使用者明確指定其他語言。
- 需要推送至 GitHub 時，使用既有的 macOS Keychain Git 認證直接執行 `git push`，不因環境缺少 GitHub CLI (`gh`) 而要求使用者安裝。需要建立或管理 Pull Request 時，先以既有的 Git 認證推送功能分支，再優先使用已連接的 GitHub Connector／App；若無可用 Connector，則使用已登入的 GitHub 網頁完成。只有使用者明確要求以命令列操作，或前述方式皆不可用且 `gh` 確實是必要備援時，才檢查或建議安裝 `gh`；不得將 `gh` 視為 Pull Request 的必備條件。
