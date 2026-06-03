#!/usr/bin/env bash
# Install nginx + reverse proxy + optional Let's Encrypt SSL for Vaidya GPT.
# Run ON THE VPS as root:
#   bash scripts/hostinger/setup-nginx-ssl.sh vaidya-gpt.com
set -euo pipefail

DOMAIN="${1:-}"
APP_PORT="${APP_PORT:-7111}"
EMAIL="${SSL_EMAIL:-}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash scripts/hostinger/setup-nginx-ssl.sh YOUR_DOMAIN.com [ssl@email.com]"
  echo "Example: bash scripts/hostinger/setup-nginx-ssl.sh vaidya-gpt.com admin@yourdomain.com"
  exit 1
fi

if [ -z "$EMAIL" ] && [ -n "${2:-}" ]; then
  EMAIL="$2"
fi

echo ""
echo "Vaidya GPT — nginx + SSL setup"
echo "  Domain:   $DOMAIN"
echo "  App port: $APP_PORT"
echo ""

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y nginx

CONF="/etc/nginx/sites-available/vaidya-gpt"
cat > "$CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 30M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf "$CONF" /etc/nginx/sites-enabled/vaidya-gpt
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx

echo ""
echo "[OK] nginx configured for http://${DOMAIN} -> 127.0.0.1:${APP_PORT}"
echo ""

PUBLIC_IP="$(curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 icanhazip.com 2>/dev/null || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || true)"

echo "DNS check:"
echo "  Domain A record:  ${DNS_IP:-unknown}"
echo "  This server IP:   ${PUBLIC_IP:-unknown}"
if [ -n "$PUBLIC_IP" ] && [ -n "$DNS_IP" ] && [ "$PUBLIC_IP" != "$DNS_IP" ]; then
  echo ""
  echo "[WARN] DNS does NOT point to this VPS yet."
  echo "       In Hostinger hPanel → Domains → ${DOMAIN} → DNS:"
  echo "       Set A record @ and www → ${PUBLIC_IP}"
  echo "       Remove parking / website-builder records pointing elsewhere."
  echo "       SSL will fail until DNS propagates (can take up to 24h, usually minutes)."
fi

if [ -n "$EMAIL" ]; then
  echo ""
  echo "[SSL] Installing certbot..."
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || {
    echo ""
    echo "[WARN] certbot failed — usually DNS not pointing here yet."
    echo "       Retry after DNS propagates:"
    echo "       certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  }
else
  echo ""
  echo "Skip SSL for now (no email passed). After DNS points here, run:"
  echo "  apt install -y certbot python3-certbot-nginx"
  echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo ""
echo "Ensure PM2 app is running: pm2 status"
echo "Test locally: curl -I http://127.0.0.1:${APP_PORT}"
echo "Test nginx:   curl -I -H \"Host: ${DOMAIN}\" http://127.0.0.1/"
echo ""
