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

## License

MIT
