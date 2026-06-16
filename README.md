# 每日收支

一个手机优先的极简记账网页 App，支持本地账本和 Supabase 云端同步。

当前稳定版本：`v0.2.0`

## 本地使用

打开 `index.html`，或访问本地预览地址：

```text
http://127.0.0.1:4173
```

## 开启云端同步

1. 在 Supabase 新建项目。
2. 打开 Supabase SQL Editor，执行 `supabase.schema.sql`。
3. 在 Supabase Auth 里开启 Email/Password 登录，并关闭邮箱确认。
4. 把项目 URL 和 publishable key 填到 `config.js`，不要使用 secret key。
5. 回到页面后，用账号名和密码注册；之后直接用账号名和密码登录。
6. 登录后可以在同一个登录区域更改密码。

账号名支持中文、字母、数字、下划线和短横线。应用会把账号名转换成 Supabase 可识别的内部登录身份，用户侧不需要真实邮箱，也不需要验证码。

登录后如果浏览器里已有本地账本，页面会提示同步到云端。

## 数据和同步边界

- `config.js` 只保存浏览器可公开使用的 Supabase publishable key。
- Supabase session 由 Supabase SDK 自己持久化，应用不额外复制 refresh token。
- 本地账本、云端账本都走同一组账本数据对象：记录、分类、预算。
- 导出的 JSON 带 `schemaVersion`，方便后续迁移到小程序或其他后端。
- 云端保存失败时，页面会恢复到提交前的账本状态，避免看起来保存成功但云端未写入。

## 部署到 Vercel

1. 把项目推送到 GitHub。
2. 在 Vercel 新建项目，选择这个仓库。
3. Framework Preset 保持默认或选择 Other。
4. Build Command 留空。
5. Output Directory 留空。
6. 部署完成后，把 Vercel 域名填到 Supabase 的 Authentication URL Configuration。

Supabase 里建议保留两个跳转地址：

```text
http://127.0.0.1:8000
https://你的项目.vercel.app
```

## 安装到手机主屏幕

iPhone 用 Safari 打开线上地址，点分享按钮，然后选择“添加到主屏幕”。

Android 用 Chrome 打开线上地址，点菜单，然后选择“安装应用”或“添加到主屏幕”。

## 版本管理

- `VERSION` 保存当前稳定版本号。
- `CHANGELOG.md` 记录每个稳定版本的用户可见变化、验证结果和已知限制。
- 稳定版本用 Git tag 标记，例如 `v0.2.0`。
- 小改动验证通过后可以直接进 `main`；登录、同步、数据库、数据迁移这类高风险改动先走分支。
- 线上版本以 GitHub `main` + Vercel 部署结果为准，本地文件和本地预览不等于用户可见版本。
