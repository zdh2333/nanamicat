# Security

Do not commit `.env`, `.dev.vars`, Wrangler state, production data, API keys,
SMTP passwords, or administrator keys.

Configure production secrets with Cloudflare:

```sh
npx wrangler secret put ADMIN_KEY
npx wrangler secret put RESEND_API_KEY
```

Report security issues privately to the repository owner rather than opening a
public issue.
