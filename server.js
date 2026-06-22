process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.static('views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'kazakhstan-rice-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// ========== БАЗА ДАННЫХ ==========
const db = new sqlite3.Database('./cinema.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err);
    } else {
        console.log('✅ Подключено к SQLite базе данных');
        
        // Таблица пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            avatar_url TEXT,
            bio TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Ошибка создания users:', err);
        });
        
        db.run(`ALTER TABLE users ADD COLUMN avatar_url TEXT`, (err) => {});
        db.run(`ALTER TABLE users ADD COLUMN bio TEXT`, (err) => {});
        
        // Таблица genres (сорта риса)
        db.run(`CREATE TABLE IF NOT EXISTS genres (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`, (err) => {
            if (err) console.error('Ошибка создания genres:', err);
        });
        
        // Таблица movies (сорта риса)
        db.run(`CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            description TEXT,
            duration_minutes INTEGER,
            release_year TEXT,
            poster_url TEXT,
            genre_id INTEGER,
            rating INTEGER
        )`, (err) => {
            if (err) console.error('Ошибка создания movies:', err);
        });
        
        // ========== ТАБЛИЦА ЗАЯВОК С ПОДДЕРЖКОЙ ФАСОВКИ И РАСЧЁТА ==========
        db.run(`CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            phone TEXT NOT NULL,
            messenger TEXT NOT NULL,
            messenger_contact TEXT NOT NULL,
            material_id INTEGER NOT NULL,
            volume REAL NOT NULL,
            client_type TEXT NOT NULL,
            discount INTEGER DEFAULT 0,
            packaging TEXT,
            price_per_unit INTEGER,
            weight_per_unit REAL,
            total_kg REAL,
            total_price INTEGER,
            comment TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES movies(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error('Ошибка создания requests:', err);
        });
        
        // Добавляем колонки если их нет
        db.run(`ALTER TABLE requests ADD COLUMN packaging TEXT`, (err) => {});
        db.run(`ALTER TABLE requests ADD COLUMN price_per_unit INTEGER`, (err) => {});
        db.run(`ALTER TABLE requests ADD COLUMN discount INTEGER DEFAULT 0`, (err) => {});
        db.run(`ALTER TABLE requests ADD COLUMN weight_per_unit REAL`, (err) => {});
        db.run(`ALTER TABLE requests ADD COLUMN total_kg REAL`, (err) => {});
        db.run(`ALTER TABLE requests ADD COLUMN total_price INTEGER`, (err) => {});
        
        // Таблица отзывов
        db.run(`CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id INTEGER,
            user_id INTEGER NOT NULL,
            rating INTEGER DEFAULT 5,
            comment TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (movie_id) REFERENCES movies(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error('Ошибка создания reviews:', err);
        });
        
        // ========== ДОБАВЛЯЕМ GENRES (СОРТА РИСА) ==========
        db.get(`SELECT COUNT(*) as count FROM genres`, (err, row) => {
            if (err) {
                console.error('Ошибка проверки genres:', err);
                return;
            }
            if (row.count === 0) {
                db.run(`INSERT INTO genres (id, name) VALUES 
                    (1, 'Рис'),
                    (2, 'Камолино'),
                    (3, 'Лидер'),
                    (4, 'Янтарь'),
                    (5, 'Баракат'),
                    (6, 'Элита')`, (err) => {
                        if (err) {
                            console.error('Ошибка вставки genres:', err);
                        } else {
                            console.log('✅ Сорта риса добавлены в genres');
                        }
                    });
            } else {
                console.log('✅ Genres уже существуют, пропускаем');
            }
        });
        
        // ========== ДОБАВЛЯЕМ СОРТА РИСА (ЕСЛИ ТАБЛИЦА ПУСТАЯ) ==========
        db.get(`SELECT COUNT(*) as count FROM movies`, (err, row) => {
            if (err) {
                console.error('Ошибка проверки movies:', err);
                return;
            }
            if (row.count === 0) {
                console.log('📦 Таблица movies пуста, добавляем сорта риса...');
                
                const riceVarieties = [
                    { title: 'Сорт «КАМОЛИНО ЯНТАРЬ»', description: 'Рис | сорт "Камолино ЯНТАРЬ" — элитный сорт с нежным ароматом', price: 1000, year: 'Вакуумная упаковка', poster_url: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', genre_id: 1, rating: 5 },
                    { title: 'Сорт «КАМОЛИНО ЛИДЕР»', description: 'Рис | сорт "Камолино ЛИДЕР" — премиальный сорт с отличной клейковиной', price: 1000, year: 'Вакуумная упаковка', poster_url: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', genre_id: 1, rating: 5 },
                    { title: 'Вакуумная упаковка', description: 'Рис "Элита" | Вакуумная упаковка — сохраняет свежесть и аромат', price: 1000, year: 'Вакуумная упаковка', poster_url: 'https://images.unsplash.com/photo-1551537482-f2075a1d41f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', genre_id: 1, rating: 5 },
                    { title: 'Сорт «БАРАКАТ»', description: 'Рис | сорт "Баракат" — качественный рис для повседневного использования', price: 1000, year: 'Стандартная упаковка', poster_url: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', genre_id: 1, rating: 4 },
                    { title: 'Сорт «ЯНТАРЬ»', description: 'Рис | сорт "Янтарь" — элитный длиннозерный рис с янтарным оттенком', price: 1000, year: 'Стандартная упаковка', poster_url: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', genre_id: 1, rating: 5 },
                    { title: 'Сорт «ЛИДЕР»', description: 'Рис | сорт "Лидер" — премиальный круглозерный сорт', price: 1000, year: 'Стандартная упаковка', poster_url: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', genre_id: 1, rating: 4 },
                    { title: 'Сорт «КАМОЛИНО»', description: 'Рис | сорт "Камолино" — уникальный сорт с ореховым ароматом', price: 1000, year: 'Стандартная упаковка', poster_url: 'https://images.unsplash.com/photo-1551537482-f2075a1d41f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', genre_id: 1, rating: 5 },
                    { title: 'Сорт «ЭЛИТА»', description: 'Рис "Элита" | Вакуумная упаковка — отборный рис высшего качества', price: 1000, year: 'Вакуумная упаковка', poster_url: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', genre_id: 1, rating: 5 },
                    { title: 'Сорт «ЛИДЕР» Элита', description: 'Рис "Элита" | сорт "Лидер" — лучший выбор для гурманов', price: 1000, year: 'Вакуумная упаковка', poster_url: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', genre_id: 1, rating: 5 }
                ];
                
                let inserted = 0;
                riceVarieties.forEach((r, index) => {
                    db.run(`INSERT INTO movies (title, description, duration_minutes, release_year, poster_url, genre_id, rating)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                        [r.title, r.description, r.price, r.year, r.poster_url, r.genre_id, r.rating],
                        (err) => {
                            if (err) {
                                console.error('❌ Ошибка вставки:', err.message);
                            } else {
                                inserted++;
                            }
                            if (index === riceVarieties.length - 1) {
                                console.log(`✅ ${inserted} сортов риса добавлены в каталог`);
                            }
                        }
                    );
                });
            } else {
                console.log(`✅ В таблице movies уже есть ${row.count} записей, пропускаем заполнение`);
            }
        });
        
        // ========== СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ ==========
        setTimeout(() => {
            db.get(`SELECT * FROM users WHERE role = 'admin'`, async (err, admin) => {
                if (!admin) {
                    const hashedPassword = await bcrypt.hash('admin123', 10);
                    db.run(`INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
                        ['admin', 'admin@rice.kz', hashedPassword, 'admin'], (err) => {
                            if (!err) console.log('✅ Тестовый админ создан: admin / admin123');
                        });
                }
            });
            
            db.get(`SELECT * FROM users WHERE role = 'user' AND username = 'user'`, async (err, user) => {
                if (!user) {
                    const hashedPassword = await bcrypt.hash('user123', 10);
                    db.run(`INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
                        ['user', 'user@example.com', hashedPassword, 'user'], (err) => {
                            if (!err) console.log('✅ Тестовый пользователь создан: user / user123');
                        });
                }
            });
        }, 500);
    }
});

// Helper functions
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
    });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

// ========== MIDDLEWARE ==========
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        if (req.xhr || req.headers['content-type'] === 'application/json' || req.path.startsWith('/api/')) {
            res.status(401).json({ error: 'Не авторизован', redirect: '/login' });
        } else {
            res.redirect('/login?error=not_authorized');
        }
    }
};

const isAdmin = (req, res, next) => req.session.user && req.session.user.role === 'admin' ? next() : res.status(403).json({ error: 'Доступ запрещен' });

const sendHtmlFile = (res, filename) => {
    const filePath = path.join(__dirname, 'views', filename);
    fs.existsSync(filePath) ? res.sendFile(filePath) : res.status(404).send(`<h1>404</h1><p>${filename} не найден</p>`);
};

// ========== GIGACHAT ==========
let gigaToken = null;
let tokenExpiresAt = 0;

async function getGigaToken() {
    if (gigaToken && Date.now() < tokenExpiresAt) {
        console.log('✅ Используем существующий токен');
        return gigaToken;
    }
    
    try {
        console.log('🔄 Получаем новый токен GigaChat...');
        
        const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'RqUID': crypto.randomUUID(),
                'Authorization': `Basic ${process.env.GIGA_AUTH_KEY}`
            },
            body: 'scope=GIGACHAT_API_PERS'
        });
        
        console.log('Статус ответа:', response.status);
        
        const data = await response.json();
        console.log('Ответ получен');
        
        if (data.access_token) {
            gigaToken = data.access_token;
            tokenExpiresAt = Date.now() + ((data.expires_at || 1800) * 1000);
            console.log('✅ Токен GigaChat получен');
            return gigaToken;
        } else {
            console.error('❌ Ошибка:', data);
            return null;
        }
    } catch (err) {
        console.error('❌ Ошибка:', err.message);
        return null;
    }
}

async function askGigaChat(userMessage) {
    const token = await getGigaToken();
    if (!token) {
        throw new Error('Не удалось получить токен GigaChat');
    }
    
    const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            model: 'GigaChat',
            messages: [
                { 
                    role: 'system', 
                    content: `Ты - AI-помощник компании "Казахстанский Рис". 
Отвечай кратко и по делу. 

Твоя специализация: 
- казахстанский рис премиум качества
- сорта: "Янтарь", "Лидер", "Камолино", "Баракат", "Элита"
- цена: от 95 до 127 ₽ за кг в зависимости от фасовки

Контакты компании "Казахстанский Рис" (ООО «СВ-КАПИТАЛ»):
📞 Отдел продаж: 8 (961) 924-50-24, 8 (901) 115-63-63
📞 Отдел качества: 8 (932) 540-25-20
✉️ Email: oren-svcapital@mail.ru
📍 Адрес: Оренбург, Загородное шоссе, д. 13/8

Если клиент спрашивает контакты — обязательно сообщай их. 
Помогай клиентам с выбором сорта риса и фасовки, рассказывай о преимуществах каждого сорта, условиях оптовых поставок. 
Если вопрос не по теме - вежливо откажись.` 
                },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 500
        })
    });
    
    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
    } else {
        throw new Error(data.error?.message || 'Ошибка GigaChat');
    }
}

// ========== СТРАНИЦЫ ==========
app.get('/', (req, res) => sendHtmlFile(res, 'index.html'));
app.get('/login', (req, res) => sendHtmlFile(res, 'login.html'));
app.get('/register', (req, res) => sendHtmlFile(res, 'register.html'));
app.get('/schedule', (req, res) => sendHtmlFile(res, 'schedule.html'));
app.get('/reviews-page', (req, res) => sendHtmlFile(res, 'reviews.html'));
app.get('/movies-page', (req, res) => sendHtmlFile(res, 'movies.html'));
app.get('/admin', isAdmin, (req, res) => sendHtmlFile(res, 'admin.html'));
app.get('/profile', isAuthenticated, (req, res) => sendHtmlFile(res, 'profile.html'));
app.get('/request', (req, res) => sendHtmlFile(res, 'request.html'));

// ========== API КАТАЛОГ ==========
app.get('/movies', async (req, res) => {
    try {
        const movies = await dbAll(`SELECT movies.*, genres.name as genre_name FROM movies LEFT JOIN genres ON movies.genre_id = genres.id WHERE movies.title IS NOT NULL ORDER BY movies.id`);
        res.json(movies);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/api/genres', async (req, res) => {
    try {
        const genres = await dbAll('SELECT * FROM genres ORDER BY name');
        res.json(genres);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== API ОТЗЫВЫ ==========
app.get('/reviews', async (req, res) => {
    try {
        const reviews = await dbAll(`
            SELECT r.*, u.username, u.avatar_url, m.title as movie_title 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN movies m ON r.movie_id = m.id
            ORDER BY r.created_at DESC
            LIMIT 100
        `);
        res.json(reviews);
    } catch (err) {
        console.error('Ошибка загрузки отзывов:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/reviews/:movieId', async (req, res) => {
    try {
        const movieId = req.params.movieId;
        
        if (!movieId || isNaN(movieId)) {
            return res.status(400).json({ error: 'Неверный ID сорта' });
        }
        
        const reviews = await dbAll(`
            SELECT r.*, u.username, u.avatar_url, m.title as movie_title 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN movies m ON r.movie_id = m.id
            WHERE r.movie_id = ?
            ORDER BY r.created_at DESC
        `, [movieId]);
        
        res.json(reviews);
    } catch (err) {
        console.error('Ошибка загрузки отзывов для сорта:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/reviews', isAuthenticated, async (req, res) => {
    try {
        const { movie_id, rating, comment } = req.body;
        
        if (!movie_id || !rating || !comment) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }
        
        const result = await dbRun(
            'INSERT INTO reviews (movie_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
            [movie_id, req.session.user.id, rating, comment]
        );
        res.json({ success: true, id: result.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ========== АВТОРИЗАЦИЯ ==========
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existing = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existing) return res.status(400).json({ error: 'Пользователь уже существует' });
        const hashed = await bcrypt.hash(password, 10);
        const result = await dbRun('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashed]);
        const newUser = await dbGet('SELECT id, username, email, role, avatar_url, bio FROM users WHERE id = ?', [result.id]);
        req.session.user = newUser;
        res.json({ success: true, user: newUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) return res.status(401).json({ error: 'Неверные данные' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Неверные данные' });
        req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role || 'user', avatar_url: user.avatar_url, bio: user.bio };
        res.json({ success: true, user: req.session.user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/logout', (req, res) => { 
    req.session.destroy(); 
    res.json({ success: true }); 
});

app.get('/api/user', (req, res) => { 
    res.json({ user: req.session.user || null }); 
});

// ========== ПРОФИЛЬ ==========
app.get('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await dbGet('SELECT id, username, email, role, avatar_url, bio, created_at FROM users WHERE id = ?', [req.session.user.id]);
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
        const { username, email, bio } = req.body;
        await dbRun('UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email), bio = ? WHERE id = ?', [username, email, bio, req.session.user.id]);
        const updated = await dbGet('SELECT id, username, email, role, avatar_url, bio FROM users WHERE id = ?', [req.session.user.id]);
        req.session.user = updated;
        res.json({ success: true, user: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/user/avatar', isAuthenticated, async (req, res) => {
    try {
        await dbRun('UPDATE users SET avatar_url = ? WHERE id = ?', [req.body.avatar_url, req.session.user.id]);
        const updated = await dbGet('SELECT id, username, email, role, avatar_url, bio FROM users WHERE id = ?', [req.session.user.id]);
        req.session.user = updated;
        res.json({ success: true, user: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/user/password', isAuthenticated, async (req, res) => {
    try {
        const user = await dbGet('SELECT password FROM users WHERE id = ?', [req.session.user.id]);
        const valid = await bcrypt.compare(req.body.current_password, user.password);
        if (!valid) return res.status(401).json({ error: 'Текущий пароль неверен' });
        const hashed = await bcrypt.hash(req.body.new_password, 10);
        await dbRun('UPDATE users SET password = ? WHERE id = ?', [hashed, req.session.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== ЗАЯВКИ ==========
// Все заявки (только для админа)
app.get('/api/requests', isAdmin, async (req, res) => {
    try {
        const requests = await dbAll(`SELECT r.*, m.title as material_name, m.duration_minutes as material_price FROM requests r JOIN movies m ON r.material_id = m.id ORDER BY r.created_at DESC`);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создание заявки с поддержкой фасовки и расчёта
app.post('/api/requests', async (req, res) => {
    try {
        const { 
            phone, messenger, messenger_contact, material_id, 
            volume, client_type, comment, discount, 
            packaging, price_per_unit, weight_per_unit,
            total_kg, total_price
        } = req.body;
        
        if (!phone || !messenger || !messenger_contact || !material_id || !volume || !client_type) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }
        
        let userId = null;
        if (req.session.user) {
            userId = req.session.user.id;
        }
        
        const result = await dbRun(
            `INSERT INTO requests (
                user_id, phone, messenger, messenger_contact, 
                material_id, volume, client_type, discount, 
                packaging, price_per_unit, weight_per_unit,
                total_kg, total_price, comment, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [
                userId, phone, messenger, messenger_contact,
                material_id, volume, client_type, discount || 0,
                packaging || null, price_per_unit || null, 
                weight_per_unit || null, total_kg || null, 
                total_price || null, comment || null
            ]
        );
        res.json({ success: true, id: result.id });
    } catch (err) {
        console.error('Ошибка создания заявки:', err);
        res.status(500).json({ error: err.message });
    }
});

// Заявки текущего пользователя
app.get('/api/user/requests', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const requests = await dbAll(`
            SELECT r.*, m.title as material_name 
            FROM requests r 
            JOIN movies m ON r.material_id = m.id 
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `, [userId]);
        
        res.json({ success: true, requests });
    } catch (err) {
        console.error('Ошибка загрузки заявок пользователя:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Изменение статуса заявки (только для админа)
app.put('/api/requests/:id/status', isAdmin, async (req, res) => {
    try {
        await dbRun('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/requests/:id', isAdmin, async (req, res) => {
    try {
        await dbRun('DELETE FROM requests WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== АДМИН ==========
app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        const users = await dbAll('SELECT id, username, email, role, avatar_url, bio, created_at FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id/role', isAdmin, async (req, res) => {
    try {
        await dbRun('UPDATE users SET role = ? WHERE id = ?', [req.body.role, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    try {
        if (req.session.user.id == req.params.id) return res.status(400).json({ error: 'Нельзя удалить себя' });
        await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/reviews/:id', isAdmin, async (req, res) => {
    try {
        await dbRun('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/movies', isAdmin, async (req, res) => {
    try {
        const { title, description, duration_minutes, release_year, poster_url, genre_id, rating } = req.body;
        const result = await dbRun(
            `INSERT INTO movies (title, description, duration_minutes, release_year, poster_url, genre_id, rating)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description, duration_minutes, release_year, poster_url, genre_id, rating]
        );
        res.json({ success: true, id: result.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/movies/:id/price', isAdmin, async (req, res) => {
    try {
        const { price } = req.body;
        await dbRun('UPDATE movies SET duration_minutes = ? WHERE id = ?', [price, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== ЧАТ ==========
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message || '';
        console.log(`💬 Вопрос: ${userMessage}`);
        const reply = await askGigaChat(userMessage);
        console.log(`🤖 Ответ: ${reply}`);
        res.json({ reply });
    } catch (err) {
        console.error('❌ Ошибка:', err.message);
        res.status(500).json({ reply: 'Извините, сервис временно недоступен. Позвоните нам по телефону 8 (961) 924-50-24' });
    }
});

// ========== ЗАПУСК ==========
app.listen(PORT, () => {
    console.log(`\n🌾 Казахстанский Рис запущен на http://localhost:${PORT}`);
    console.log(`👑 Админ-панель: http://localhost:${PORT}/admin`);
    console.log(`👤 Тестовый пользователь: user / user123`);
    console.log(`🔑 Тестовый админ: admin / admin123`);
});