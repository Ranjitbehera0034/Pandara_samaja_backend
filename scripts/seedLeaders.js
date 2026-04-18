const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pandara_samaja',
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

const stateLeaders = [
    { name: 'Bijaya Kumar Badatya', role: 'State Committee', src: 'assets/img/NOPS/Bijaya Kumar Badatya.png' },
    { name: 'ChandrSekher Badatya', role: 'State Committee', src: 'assets/img/NOPS/ChandrSekher Badatya.png' },
    { name: 'Madan Sekher Badatya', role: 'State Committee', src: 'assets/img/NOPS/Madan sekher Badatya.png' },
    { name: 'Chiranjibi Badatya', role: 'State Committee', src: 'assets/img/NOPS/Chiranjibi Badatya.png' },
    { name: 'Kishore Hari Badatya', role: 'State Committee', src: 'assets/img/NOPS/Kishore Hari Badatya.png' },
    { name: 'Sarat Chandra Behera', role: 'State Committee', src: 'assets/img/NOPS/Sarat Chandra Behera.png' },
    { name: 'Purna Chandra Behera', role: 'State Committee', src: 'assets/img/NOPS/Purna chandra Behera.png' },
    { name: 'Bharata Bhusana Badatya', role: 'State Committee', src: 'assets/img/NOPS/Bharata Bhusana Badatya.png' },
    { name: 'Bhagawan Badatya', role: 'State Committee', src: 'assets/img/NOPS/Bhagawan Badatya.png' },
    { name: 'Rajendra Badatya', role: 'State Committee', src: 'assets/img/NOPS/Rajendra Badatya.png' },
    { name: 'Arjuna Behera', role: 'State Committee', src: 'assets/img/NOPS/Arjuna Behera.png' },
    { name: 'Sukanta Badatya', role: 'State Committee', src: 'assets/img/NOPS/Sukanta Badatya.png' },
    { name: 'Ganesh Behera', role: 'State Committee', src: 'assets/img/NOPS/Ganesh Behera.png' },
    { name: 'Chandrakanta Badatya', role: 'State Committee', src: 'assets/img/NOPS/Chandrakanta Badatya.png' },
    { name: 'Hemant Kumar Behera', role: 'State Committee', src: 'assets/img/NOPS/Hemant Kumar Behera.png' }
];

const districtLeaderImages = {
    "GANJAM": [
        { "name": "Ashok Kumar Badatya", "src": "assets/img/GANJAM/Ashok Kumar Badatya.png" },
        { "name": "Hrisikesh Badatya", "src": "assets/img/GANJAM/Hrisikesh Badatya.png" },
        { "name": "Pramod Badatya", "src": "assets/img/GANJAM/Pramod Badatya.png" },
        { "name": "Santosh Badatya", "src": "assets/img/GANJAM/Santosh Badatya.png" },
        { "name": "Jagannath Badatya", "src": "assets/img/GANJAM/Jagannath Badatya.png" },
        { "name": "BanchhaNidhi Behera", "src": "assets/img/GANJAM/BanchhaNidhi Behera.png" },
        { "name": "Santosh", "src": "assets/img/GANJAM/Santosh.png" },
        { "name": "Sudama Behera", "src": "assets/img/GANJAM/Sudama Behera.png" },
        { "name": "Susanta Kumar Badatya", "src": "assets/img/GANJAM/Susanta Kumar Badatya.png" },
        { "name": "Trilochan Badatya", "src": "assets/img/GANJAM/Trilochan Badatya.png" },
        { "name": "Upendra Badatya", "src": "assets/img/GANJAM/Upendra Badatya.png" }
    ],
    "JHARSAGUDA": [
        { "name": "RankaMani Badatya", "src": "assets/img/JHARSAGUDA/RankaMani Badatya.jpg" },
        { "name": "Dhoba Badatya", "src": "assets/img/JHARSAGUDA/Dhoba Badatya.jpg" },
        { "name": "Manoj Kumar Badatya", "src": "assets/img/JHARSAGUDA/Manoj Kumar Badatya.jpg" },
        { "name": "Dillip Kumar Badatya", "src": "assets/img/JHARSAGUDA/Dillip Kumar Badatya.jpg" },
        { "name": "Manoranjan Badatya", "src": "assets/img/JHARSAGUDA/Manoranjan Badatya.jpg" },
        { "name": "Tuna Badatya", "src": "assets/img/JHARSAGUDA/Tuna Badatya.jpg" }
    ],
    "SAMBALAPUR": [
        { "name": "IMG-20250630-WA0003", "src": "assets/img/SAMBALAPUR/IMG-20250630-WA0003.jpg" },
        { "name": "IMG-20250630-WA0002", "src": "assets/img/SAMBALAPUR/IMG-20250630-WA0002.jpg" },
        { "name": "IMG-20250630-WA0006", "src": "assets/img/SAMBALAPUR/IMG-20250630-WA0006.jpg" },
        { "name": "IMG-20250630-WA0005", "src": "assets/img/SAMBALAPUR/IMG-20250630-WA0005.jpg" },
        { "name": "IMG-20250630-WA0001", "src": "assets/img/SAMBALAPUR/IMG-20250630-WA0001.jpg" },
        { "name": "IMG-20250630-WA0004", "src": "assets/img/SAMBALAPUR/IMG-20250630-WA0004.jpg" },
        { "name": "IMG-20250630-WA0008", "src": "assets/img/SAMBALAPUR/IMG-20250630-WA0008.jpg" },
        { "name": "IMG-20250630-WA0007", "src": "assets/img/SAMBALAPUR/IMG-20250630-WA0007.jpg" },
        { "name": "IMG-20250711-WA0011", "src": "assets/img/SAMBALAPUR/IMG-20250711-WA0011.jpg" },
        { "name": "IMG-20250711-WA0013", "src": "assets/img/SAMBALAPUR/IMG-20250711-WA0013.jpg" },
        { "name": "IMG-20250711-WA0014", "src": "assets/img/SAMBALAPUR/IMG-20250711-WA0014.jpg" },
        { "name": "IMG-20250711-WA0018", "src": "assets/img/SAMBALAPUR/IMG-20250711-WA0018.jpg" }
    ]
};

async function seed() {
    try {
        console.log("Seeding State Leaders...");
        for (let i = 0; i < stateLeaders.length; i++) {
            const l = stateLeaders[i];
            await pool.query(
                'INSERT INTO leaders (name, role, level, location, image_url, display_order) VALUES ($1, $2, $3, $4, $5, $6)',
                [l.name, l.role, 'State', null, l.src, i]
            );
        }
        console.log("Seeding District Leaders...");
        for (const loc of Object.keys(districtLeaderImages)) {
            const arr = districtLeaderImages[loc];
            for (let i = 0; i < arr.length; i++) {
                const l = arr[i];
                let name = l.name.replace(/IMG-\d+-WA\d+/i, 'Leader');
                await pool.query(
                    'INSERT INTO leaders (name, role, level, location, image_url, display_order) VALUES ($1, $2, $3, $4, $5, $6)',
                    [name, "District Committee", 'District', loc, l.src, i]
                );
            }
        }
        console.log("Successfully seeded leaders!");
    } catch (e) {
        console.error("Error seeding leaders:", e);
    } finally {
        pool.end();
    }
}

seed();
