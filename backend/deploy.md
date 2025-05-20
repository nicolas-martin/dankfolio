```
sudo apt install -y nginx python3-certbot-nginx`
mkdir -p /var/www/certbot/.well-known/acme-challenge/test
sudo chown -R www-data:www-data /var/www/certbot
sudo chmod -R 755 /var/www/certbot
sudo certbot --nginx -d corsairsoftware.io
sudo certbot renew --dry-run --nginx
systemctl list-timers | grep certbot
sudo certbot renew --nginx
sudo systemctl status certbot.timer
```


nginx
```sh
# Redirect all HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name corsairsoftware.io;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri =404;
    }

    # if we use 301 here it converts it a GET and drops the body
    location / {
        return 308 https://$host$request_uri;
    }
}

# Terminate TLS and proxy gRPC
server {
   listen 443 ssl http2;
   listen [::]:443 ssl http2;

   server_name corsairsoftware.io;

   ssl_certificate     /etc/letsencrypt/live/corsairsoftware.io/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/corsairsoftware.io/privkey.pem;

   location / {
       proxy_pass http://127.0.0.1:9000;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
}
```
