const db = require('./config');
const fs = require('fs');
const path = require('path');

const initDatabase = () => {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error initializing database:', err);
        } else {
            console.log('Database tables created successfully');
        }
    });
};

initDatabase();