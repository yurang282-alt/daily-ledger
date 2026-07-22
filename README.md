# 每日收支

一个手机优先的极简记账网页 App。正式版只用 Rocky 统一登录和 CloudBase 个人账本。

当前统一登录版本：`v0.4.0-sso`

## 本地使用

打开 `index.html`，或访问本地预览地址：

```text
http://127.0.0.1:4173
```

## CloudBase-only 运行方式

1. 部署新函数 `rockyMoneyPersonalWeb`，公开路径仍为同源 `/daily-ledger-api`。
2. 创建 `rocky_money_personal_records`、`rocky_money_personal_categories`、`rocky_money_personal_settings` 三个 namespaced 集合。
3. 用户先在 `/account/` 登录；页面和后端分别校验中央 `money` grant。
4. 后端只从中央会话取得 `rockyUserId`，浏览器不能提交或选择 owner。

旧账号名/密码、旧 token、旧本地账本和历史集合不再参与正式运行，也不会自动迁移、合并或删除。

## 数据和同步边界

- `config.js` 只保存浏览器可公开使用的 CloudBase API 地址，不保存服务端密钥。
- Rocky 登录态由中央账号服务签发；Money 不维护第二套密码或 token。
- 正式账本只写入 `rocky_money_personal_*`，结构仍为记录、分类、预算。
- 导出的 JSON 带 `schemaVersion`、来源状态和记录摘要，方便后续迁移到小程序或其他后端。
- 云端保存失败时，页面会恢复到提交前的账本状态，避免看起来保存成功但云端未写入。
- 导入、清空本月、合并本地数据这类高风险动作会先下载当前账本备份。

## 从 Supabase 迁移

- 当前版本不再依赖 Supabase 登录或 Supabase Data API。
- 旧 Supabase 数据不要直接删除。本期不读取、不迁移、不删除。
- `supabase.schema.sql` 仅保留作历史参考，不再是当前主线部署必需项。

## 部署到 CloudBase

- 每日记账只部署到 `/apps/ledger/`。
- 根目录 `/` 属于 Rocky App 工厂启动页，不部署每日记账。
- 发布前必须确认 service worker 和 cache 清理只作用于当前 App 路径。
- 正式主入口：`https://rocky4ai.com/apps/ledger/`。
- CloudBase HTTP 服务域名和静态托管备用入口仅用于开发或故障证据，不作为交给用户的正式链接。
- 正式 API 使用同源 `/daily-ledger-api`，由精确路由指向 `rockyMoneyPersonalWeb`。

## 部署到 Vercel

Vercel 仍可作为静态 H5 镜像，但主推荐入口是 CloudBase `/apps/ledger/`，因为 CloudBase 页面和 API 都能走国内可访问链路。

## 安装到手机主屏幕

iPhone 用 Safari 打开线上地址，点分享按钮，然后选择“添加到主屏幕”。

Android 用 Chrome 打开线上地址，点菜单，然后选择“安装应用”或“添加到主屏幕”。

## 版本管理

- `VERSION` 保存当前稳定版本号。
- `CHANGELOG.md` 记录每个稳定版本的用户可见变化、验证结果和已知限制。
- 稳定版本用 Git tag 标记，例如 `v0.3.3`。
- 小改动验证通过后可以直接进 `main`；登录、同步、数据库、数据迁移这类高风险改动先走分支。
- 线上版本以 GitHub `main` + CloudBase `/apps/ledger/` 发布结果为准，本地文件和本地预览不等于用户可见版本。
