# Fix vaidya-gpt.com showing Hostinger parking page

If you see **"Registered at Hostinger"** / **"Start your online journey"**, your domain DNS is **not pointing to your VPS** where Vaidya GPT runs.

## Current problem (typical)

| What | Wrong | Correct |
|------|--------|---------|
| Domain | `vaidya-gpt.com` → Hostinger parking IP (e.g. `2.57.91.91`) | → Your VPS IP (e.g. `72.61.243.228`) |
| Server | App runs on VPS port **7111** via PM2 | nginx on port **80/443** proxies to 7111 |

The app can be **online on the VPS** while the **domain** still shows Hostinger's placeholder.

---

## Step 1 — Fix DNS in Hostinger hPanel

1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com)
2. Go to **Domains** → **vaidya-gpt.com** → **DNS / DNS Zone**
3. **Delete or edit** any A records pointing to parking/shared hosting IPs (not your VPS)
4. Add or update:

| Type | Name | Points to | TTL |
|------|------|-----------|-----|
| **A** | `@` | `YOUR_VPS_IP` (e.g. `72.61.243.228`) | 3600 |
| **A** | `www` | `YOUR_VPS_IP` (same IP) | 3600 |

5. **Do not** attach the domain to "Website Builder" or shared web hosting for this project — use **VPS + DNS only**.

Find your VPS IP: Hostinger → **VPS** → your server → IP address (same IP you use for `ssh root@...`).

### Verify DNS (from your PC)

```bash
nslookup vaidya-gpt.com
```

The address should match your **VPS IP**, not `2.57.91.91` or other Hostinger parking IPs.

Wait **5–30 minutes** (sometimes up to 24h) for propagation.

---

## Step 2 — nginx on the VPS

SSH into the VPS:

```bash
ssh root@YOUR_VPS_IP
cd /var/www/carely
git pull origin main
bash scripts/hostinger/setup-nginx-ssl.sh vaidya-gpt.com your-email@example.com
```

This installs nginx, proxies `vaidya-gpt.com` → `http://127.0.0.1:7111`, and requests Let's Encrypt SSL.

Without SSL email (HTTP only first):

```bash
bash scripts/hostinger/setup-nginx-ssl.sh vaidya-gpt.com
```

---

## Step 3 — Confirm app + env

On the VPS:

```bash
pm2 status
curl -I http://127.0.0.1:7111
```

In `/var/www/carely/.env`:

```env
NEXT_PUBLIC_APP_URL=https://vaidya-gpt.com
APP_URL=https://vaidya-gpt.com
```

Then:

```bash
pm2 restart vaidya-gpt --update-env
```

---

## Step 4 — Test in browser

- https://vaidya-gpt.com — should show **Vaidya GPT**, not Hostinger parking
- https://vaidya-gpt.com/admin/login — admin login

---

## Quick test before DNS propagates

Use the VPS IP directly (if firewall allows port 7111):

```text
http://YOUR_VPS_IP:7111
```

If that works but the domain does not → **DNS/nginx issue**, not the app.

---

## Firewall (if IP:7111 does not load)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Use nginx on 80/443 for production; avoid exposing 7111 publicly if possible.
