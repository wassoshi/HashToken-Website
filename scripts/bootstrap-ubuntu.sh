#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root: sudo scripts/bootstrap-ubuntu.sh your-domain.com"
  exit 1
fi

domain="${1:-}"
if [ -z "$domain" ]; then
  echo "Usage: scripts/bootstrap-ubuntu.sh your-domain.com"
  exit 1
fi

case "$domain" in
  http://*|https://*|*/*)
    echo "Use only the domain name, for example: hashtoken.example"
    exit 1
    ;;
esac

apt-get update
apt-get install -y ca-certificates curl git openssl ufw

# A small swap file gives the 1 GB VPS enough breathing room for npm/Docker
# builds without affecting normal runtime performance.
if [ ! -e /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
elif ! grep -q '^/swapfile ' /proc/swaps; then
  echo "/swapfile exists but is not active; leaving it unchanged"
fi

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
architecture="$(dpkg --print-architecture)"
codename="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
printf '%s\n' \
  'Types: deb' \
  'URIs: https://download.docker.com/linux/ubuntu' \
  "Suites: $codename" \
  'Components: stable' \
  "Architectures: $architecture" \
  'Signed-By: /etc/apt/keyrings/docker.asc' \
  > /etc/apt/sources.list.d/docker.sources

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

if [ ! -f .env ]; then
  umask 077
  {
    echo "DOMAIN=$domain"
    printf 'POSTGRES_PASSWORD='
    openssl rand -hex 32
  } > .env
else
  echo ".env already exists; leaving it unchanged"
fi

docker compose up -d --build
docker compose ps

echo "Deployment started. Point the domain A record to this VPS, then check:"
echo "  docker compose logs --tail=100 app caddy"
