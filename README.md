# 每日收支

一个手机优先的极简记账网页 App，支持本地账本和 CloudBase 云端同步。

当前稳定版本：`v0.3.0`

## 本地使用

打开 `index.html`，或访问本地预览地址：

```text
http://127.0.0.1:4173
```

## 开启云端同步

1. 部署 CloudBase HTTP 函数 `daily-ledger-api`。
2. 在 CloudBase 创建或确认这些集合：`daily_ledger_users`、`daily_ledger_records`、`daily_ledger_categories`、`daily_ledger_settings`。
3. 把 CloudBase API 地址填到 `config.js`。
4. 回到页面后，用账号名和密码注册；之后直接用账号名和密码登录。
5. 登录后可以在同一个登录区域更改密码。

账号名支持中文、字母、数字、下划线和短横线，也兼容邮箱形式。用户侧不需要真实邮箱，也不需要验证码。

登录后如果浏览器里已有本地账本，页面会提示合并到云端。合并不会删除云端已有记录，执行前会先下载云端账本备份。

## 数据和同步边界

- `config.js` 只保存浏览器可公开使用的 CloudBase API 地址，不保存服务端密钥。
- CloudBase session token 由 `daily-ledger-api` 签发，前端只保存在本机浏览器。
- 本地账本、云端账本都走同一组账本数据对象：记录、分类、预算。
- 导出的 JSON 带 `schemaVersion`、来源状态和记录摘要，方便后续迁移到小程序或其他后端。
- 云端保存失败时，页面会恢复到提交前的账本状态，避免看起来保存成功但云端未写入。
- 导入、清空本月、合并本地数据这类高风险动作会先下载当前账本备份。

## 从 Supabase 迁移

- 当前版本不再依赖 Supabase 登录或 Supabase Data API。
- 旧 Supabase 数据不要直接删除。先在旧版本或备份流程中导出 JSON，再在 CloudBase 版本里导入。
- `supabase.schema.sql` 仅保留作历史参考，不再是当前主线部署必需项。

## 部署到 CloudBase

- 每日记账只部署到 `/apps/ledger/`。
- 根目录 `/` 属于 Rocky App 工厂启动页，不部署每日记账。
- 发布前必须确认 service worker 和 cache 清理只作用于当前 App 路径。
- 当前主入口：`https://cloud1-d3g79qnvd808824c9-1444897143.ap-shanghai.app.tcloudbase.com/apps/ledger/`。
- 静态托管备用入口：`https://cloud1-d3g79qnvd808824c9-1444897143.tcloudbaseapp.com/apps/ledger/index.html`。
- 当前 API：`https://cloud1-d3g79qnvd808824c9-1444897143.ap-shanghai.app.tcloudbase.com/daily-ledger-api`。

## 部署到 Vercel

Vercel 仍可作为静态 H5 镜像，但主推荐入口是 CloudBase `/apps/ledger/`，因为 CloudBase 页面和 API 都能走国内可访问链路。

## 安装到手机主屏幕

iPhone 用 Safari 打开线上地址，点分享按钮，然后选择“添加到主屏幕”。

Android 用 Chrome 打开线上地址，点菜单，然后选择“安装应用”或“添加到主屏幕”。

## 版本管理

- `VERSION` 保存当前稳定版本号。
- `CHANGELOG.md` 记录每个稳定版本的用户可见变化、验证结果和已知限制。
- 稳定版本用 Git tag 标记，例如 `v0.3.0`。
- 小改动验证通过后可以直接进 `main`；登录、同步、数据库、数据迁移这类高风险改动先走分支。
- 线上版本以 GitHub `main` + CloudBase `/apps/ledger/` 发布结果为准，本地文件和本地预览不等于用户可见版本。
