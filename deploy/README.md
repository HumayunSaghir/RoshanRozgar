# Deployment (AWS EC2 + CloudFront)

The app runs on one EC2 instance (Amazon Linux 2023): nginx on port 80 routes `/api` and `/uploads` to the
Express API (port 5000) and everything else to Next.js (port 3000). CloudFront sits in front for HTTPS
(required for microphone access) and is the only thing allowed to reach port 80.

## Auto-deploy from GitHub
`rr-deploy.timer` runs `deploy/poll-deploy.sh` every minute. When `origin/main` has a new commit the server:

1. checks it out in `/opt/rr`,
2. runs `deploy/post-deploy.sh`, which reinstalls dependencies and rebuilds only the part that changed
   (backend: install + restart; frontend: install + `next build` + restart).

So pushing to `main` updates the live site within a few minutes (a frontend change takes about 3-5 minutes to build).
The server holds no GitHub credentials (public repo) and GitHub holds no AWS credentials.

Server files that are not in git: `backend/.env`, `frontend/.env.local`, `backend/auth_info_baileys/` (WhatsApp session), `backend/uploads/`.

Useful commands (via AWS Systems Manager Session Manager):
```
journalctl -u rr-deploy -n 50      # deploy log
journalctl -u rr-api -f            # API log (WhatsApp status, errors)
systemctl status rr-api rr-web nginx
```
