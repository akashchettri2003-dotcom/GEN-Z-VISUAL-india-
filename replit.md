# Gen/Visual Pro

This project uses Node.js + Express + SQLite.

Run command: `npm start`

The server listens on `$PORT` and serves the `public` directory.

For a real production deployment:
- set `JWT_SECRET` in Secrets
- use HTTPS
- move uploaded media to object storage
- add a real payment provider
- add email verification/password reset
- add CSRF protection for cookie-authenticated state-changing endpoints
- put the app behind a reverse proxy/CDN
