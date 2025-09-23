const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let db;

// Database Initialization and Table Creation
(async () => {
    try {
        db = await open({ filename: './vinhack.db', driver: sqlite3.Database });
        console.log('Database connection established.');
        
        // --- CHANGE IS HERE ---
        await db.exec(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE,
            password TEXT, credits INTEGER DEFAULT 50
        )`);
        
        await db.exec(`CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, author TEXT,
            owner_id INTEGER, swapped INTEGER DEFAULT 0,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tutor_id INTEGER, student_id INTEGER,
            subject TEXT, credits INTEGER, zoom_link TEXT,
            FOREIGN KEY(tutor_id) REFERENCES users(id),
            FOREIGN KEY(student_id) REFERENCES users(id)
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tutor_id INTEGER,
            subject TEXT NOT NULL,
            description TEXT,
            credits_cost INTEGER NOT NULL,
            FOREIGN KEY(tutor_id) REFERENCES users(id)
        )`);

    } catch (error) { console.error('Error connecting to database', error); }
})();

// --- User & Auth Routes ---
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).send({ error: "All fields required" });
        const hash = await bcrypt.hash(password, 10);
        const result = await db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, hash]);
        
        // --- CHANGE IS HERE ---
        res.status(201).send({ id: result.lastID, name, email, credits: 50 });

    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).send({ error: "Email already exists" });
        res.status(500).send({ error: err.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).send({ error: "Email and password required" });
        const user = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
        if (!user) return res.status(401).send({ error: "Invalid email or password" });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).send({ error: "Invalid email or password" });
        res.send({ id: user.id, name: user.name, email: user.email, credits: user.credits });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// --- Book Routes ---
app.post('/books', async (req, res) => {
    try {
        const { title, author, owner_id } = req.body;
        const result = await db.run(`INSERT INTO books (title, author, owner_id) VALUES (?, ?, ?)`, [title, author, owner_id]);
        const newBook = await db.get(`SELECT * FROM books WHERE id = ?`, [result.lastID]);
        res.status(201).send(newBook);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.get('/books', async (req, res) => {
    const books = await db.all(`SELECT b.*, u.name as owner_name FROM books b JOIN users u ON b.owner_id = u.id`);
    res.send(books);
});

// --- Session Route with Transaction ---
app.post('/sessions', async (req, res) => {
    const { tutor_id, student_id, subject, credits, zoom_link } = req.body;
    try {
        const student = await db.get('SELECT * FROM users WHERE id = ?', [student_id]);
        if (student.credits < credits) {
            return res.status(400).json({ error: 'Student has insufficient credits.' });
        }
        await db.exec('BEGIN TRANSACTION');
        await db.run(`UPDATE users SET credits = credits - ? WHERE id = ?`, [credits, student_id]);
        await db.run(`UPDATE users SET credits = credits + ? WHERE id = ?`, [credits, tutor_id]);
        const result = await db.run(
            `INSERT INTO sessions (tutor_id, student_id, subject, credits, zoom_link) VALUES (?, ?, ?, ?, ?)`,
            [tutor_id, student_id, subject, credits, zoom_link]
        );
        await db.exec('COMMIT');
        const newSession = await db.get(`SELECT * FROM sessions WHERE id = ?`, [result.lastID]);
        res.status(201).send(newSession);
    } catch (error) {
        await db.exec('ROLLBACK');
        res.status(500).send({ error: "Transaction failed: " + error.message });
    }
});

// --- Listing Routes ---
app.post('/listings', async (req, res) => {
    try {
        const { tutor_id, subject, description, credits_cost } = req.body;
        if (!tutor_id || !subject || !credits_cost) {
            return res.status(400).send({ error: 'Tutor ID, subject, and credit cost are required.' });
        }
        const result = await db.run(
            `INSERT INTO listings (tutor_id, subject, description, credits_cost) VALUES (?, ?, ?, ?)`,
            [tutor_id, subject, description, credits_cost]
        );
        res.status(201).send({ id: result.lastID, message: 'Listing created successfully!' });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.get('/listings/search', async (req, res) => {
    try {
        const { subject } = req.query;
        if (!subject) {
            return res.status(400).send({ error: 'A subject query parameter is required.' });
        }
        const listings = await db.all(
            `SELECT l.*, u.name as tutor_name 
             FROM listings l 
             JOIN users u ON l.tutor_id = u.id 
             WHERE l.subject LIKE ?`,
            [`%${subject}%`]
        );
        res.send(listings);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));