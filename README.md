# FourFind / 四格寻踪

A responsive category-grouping puzzle game for text and image challenges.

## Local development

```sh
npm install
copy .env.example .env
npm run dev
```

Never commit `.env` or production credentials.

## Build

```sh
npm run build
```

## Production

The frontend deploys to Cloudflare Pages. The API uses Cloudflare Workers and
D1. Copy `wrangler.example.toml` to `wrangler.toml`, configure your own
bindings and domain, then store `ADMIN_KEY` and `RESEND_API_KEY` as Cloudflare
secrets.

The support QR image is intentionally excluded from the repository. Add your
own `public/wechat-pay.jpg` locally if you want to enable that support panel.

## iOS App

See `NanamiCat-iOS/README.md`. Regenerate the Xcode project after adding files:

```sh
python3 NanamiCat-iOS/generate_xcodeproj.py
```

## 投稿成功感谢邮件（免费方案）

已支持在投稿接口里填写可选邮箱，投稿成功后会尝试发送感谢邮件。

推荐免费方案：`Resend` 免费层 + Cloudflare Pages/Workers（Cloudflare 免费版可用）。

### 1) 在 Resend 创建免费账号并验证发信域名

- 创建 API Key（用于 Worker 调用）
- 验证发信域名（例如 `mail.nanamicat.com`）
- 准备发件地址（例如 `NanamiCat <thanks@mail.nanamicat.com>`）

### 2) 在 Cloudflare Pages 项目设置环境变量

- `RESEND_API_KEY`：Resend API Key
- `THANK_YOU_EMAIL_FROM`：发件地址（必须是已验证域名）
- `SITE_URL`：站点地址（可选，默认 `https://nanamicat.com`）

### 3) 执行数据库迁移

```bash
npx wrangler d1 migrations apply nanamicat-db --remote
```

新增迁移会为 `puzzle_submissions` 增加 `contact_email` 字段。

## License

MIT
