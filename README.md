# GROVIT – Peer-to-Peer Learning Marketplace

A full-stack web platform where students teach each other and share books. Students earn credits by tutoring and spend them to book sessions with others, so knowledge becomes the currency instead of money.

## Features

- **Accounts:** register and log in, with passwords hashed using **bcrypt**. Every new user starts with 50 credits.
- **Offer a lecture:** tutors list a subject, a description and a credit price.
- **Search lectures:** find tutors by subject.
- **Book a session:** credits move from the student to the tutor inside a **database transaction**, so if any step fails the whole booking is rolled back and no credits are lost. Students without enough credits are blocked.
- **Book sharing:** list books you own and browse books from other students.
- **Dashboard:** one place to reach every feature.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript (Fetch API) |
| Backend | Node.js, Express 5 |
| Database | SQLite (`sqlite` + `sqlite3`) |
| Security | bcrypt password hashing, CORS |

## Database schema

| Table | Key columns |
| --- | --- |
| `users` | id, name, email (unique), password (hashed), credits |
| `books` | id, title, author, owner_id → users, swapped |
| `listings` | id, tutor_id → users, subject, description, credits_cost |
| `sessions` | id, tutor_id → users, student_id → users, subject, credits, zoom_link |

## API

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/register` | Create an account |
| POST | `/login` | Log in |
| POST | `/books` | Add a book |
| GET | `/books` | List all books with owner names |
| POST | `/listings` | Offer a lecture |
| GET | `/listings/search?subject=` | Search lectures by subject |
| POST | `/sessions` | Book a session (credit transfer as a transaction) |

## Running it

```bash
git clone https://github.com/Rahulsti/GROVIT.git
cd GROVIT
npm install
node server.js
```

The API runs at http://localhost:5000, and the SQLite database (`vinhack.db`) is created automatically. Open `index.html` in a browser to use the app.

## Pages

`index.html` (login and register) · `dashboard.html` · `tutor.html` (offer a lecture) · `search.html` (find lectures) · `sessions.html` (book a session) · `books.html` (book sharing)
