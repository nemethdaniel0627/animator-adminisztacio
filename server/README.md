# Animator Administration - Backend API Bridge

This directory contains the backend REST API service that acts as the secure intermediary between the web application (React PWA) and the private MySQL/MariaDB database (`anim_uj`).

Two interchangeable deployment options are provided:
1. **Node.js (Express)**: `server/index.js`
2. **PHP (PDO)**: `server/api.php`

---

## Option 1: Node.js (Express)

### 1. Requirements
- Node.js 18+
- MySQL / MariaDB server running with the `anim_uj` schema.

### 2. Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` with your database credentials:
```env
PORT=3001
CORS_ORIGIN=*
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=anim_uj
```

### 3. Running
```bash
npm install
npm start
```

---

## Option 2: PHP (PDO) for Apache / phpMyAdmin Hosting

If your private server is a standard Apache / LAMP hosting environment where phpMyAdmin is deployed:
1. Copy `api.php` into your web server's document root (e.g., `/var/www/html/api/` or `htdocs/api/`).
2. Set environment variables in `.htaccess` or edit the database credentials at the top of `api.php`:
   ```php
   $dbHost = 'localhost';
   $dbName = 'anim_uj';
   $dbUser = 'your_username';
   $dbPass = 'your_password';
   ```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Diagnostic ping and database connectivity check |
| `GET` | `/api/events` | List events with attendee counts (`attendeeCount`) |
| `GET` | `/api/events/next-id` | Returns upcoming `next_esemeny_ID` (`MAX + 1`) |
| `POST` | `/api/events` | Create new event (`{ cim, datum, tipus }`) |
| `GET` | `/api/animators` | Directory of animators ordered by name |
| `GET` | `/api/events/:id/attendances` | Recorded attendees for an event |
| `POST` | `/api/events/:id/attendances` | **Transactional batch insert** (`{ animator_ids: [...] }`) with duplicate detection |
| `DELETE` | `/api/attendances/:jelenlet_ID` | Delete single attendance record |
