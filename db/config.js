const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(
    path.join(__dirname, 'bless.db'),
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err) => {
        if (err) console.error('Database connection error:', err);
        else console.log('Database connected successfully');
    }
);

module.exports = db;