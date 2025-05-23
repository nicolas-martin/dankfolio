project/
├── docker-compose.yml
├── .env
├── .env.local
├── nginx.conf             # production with TLS
├── nginx.local.conf       # local without TLS
├── promtail-config.yaml
├── certbot/
│   ├── conf/
│   └── www/
├── golang/
│   ├── Dockerfile
│   └── main.go


Start prod (with TLS):
```bash
docker compose --env-file .env up --build
```
Start local (no TLS):
```bash
docker compose --env-file .env.local up --build
```
```bash
Certbot initial one-time TLS command:
bash
Copy
Edit
docker run --rm \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email you@example.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com
```
