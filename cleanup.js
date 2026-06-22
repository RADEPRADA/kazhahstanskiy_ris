const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./cinema.db');

console.log('🔥 Пересоздаём таблицу movies с нуля...');

// Эталонные материалы (10 штук)
const correctMaterials = [
    { title: 'ПГС (песчано-гравийная смесь)', description: 'ПГС — песчано-гравийная смесь. Природная смесь с содержанием гравия до 30%. Идеально для дорожных работ, отсыпки оснований.', duration_minutes: 850, release_year: '2017', poster_url: 'https://avatars.mds.yandex.net/i?id=8f1e2c3b4a5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f&nom', genre_id: 1, rating: 5 },
    { title: 'Щебень', description: 'Щебень гранитный для бетонных смесей, фундаментов и дорожного покрытия. Соответствует ГОСТ 8267-93.', duration_minutes: 1250, release_year: '2014', poster_url: 'https://avatars.mds.yandex.net/i?id=9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b&nom', genre_id: 2, rating: 5 },
    { title: 'Песок', description: 'Песок строительный карьерный, мытый, без примесей глины. Подходит для бетона, штукатурки, кладки.', duration_minutes: 650, release_year: '2018', poster_url: 'https://avatars.mds.yandex.net/i?id=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b&nom', genre_id: 3, rating: 4 },
    { title: 'Глина', description: 'Глина техническая для строительства, керамики, буровых работ. Пластичная, жирная.', duration_minutes: 450, release_year: '2017', poster_url: 'https://avatars.mds.yandex.net/i?id=0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e&nom', genre_id: 4, rating: 4 },
    { title: 'Гравий речной', description: 'Речной гравий фракции 5-40 мм. Для дренажа, бетона, ландшафта.', duration_minutes: 950, release_year: '5-40 мм', poster_url: 'https://via.placeholder.com/300x260?text=Гравий', genre_id: 5, rating: 4 },
    { title: 'Отсев гранитный', description: 'Гранитный отсев фракции 0-5 мм. Для отсыпки дорожек и брусчатки.', duration_minutes: 550, release_year: '0-5 мм', poster_url: 'https://via.placeholder.com/300x260?text=Отсев', genre_id: 6, rating: 3 },
    { title: 'Керамзит', description: 'Керамзит для утепления перекрытий, стяжек, кровли.', duration_minutes: 1200, release_year: '10-20 мм', poster_url: 'https://via.placeholder.com/300x260?text=Керамзит', genre_id: 7, rating: 5 },
    { title: 'Известняк дроблёный', description: 'Известняк для известкования почв и производства извести.', duration_minutes: 750, release_year: '20-40 мм', poster_url: 'https://via.placeholder.com/300x260?text=Известняк', genre_id: 8, rating: 4 },
    { title: 'Доломитовая мука', description: 'Доломитовая мука для раскисления почв и стройсмесей.', duration_minutes: 500, release_year: '0-1 мм', poster_url: 'https://via.placeholder.com/300x260?text=Доломит', genre_id: 9, rating: 3 },
    { title: 'Грунт растительный', description: 'Плодородный грунт для озеленения и газонов.', duration_minutes: 300, release_year: 'насыпной', poster_url: 'https://via.placeholder.com/300x260?text=Грунт', genre_id: 10, rating: 4 }
];

db.serialize(() => {
    // 1. Удаляем старую таблицу movies
    db.run(`DROP TABLE movies`, (err) => {
        if (err) console.log('⚠️ Таблица movies не существовала или уже удалена');
        else console.log('✅ Старая таблица movies удалена');
    });

    // 2. Создаём новую таблицу с UNIQUE
    db.run(`
        CREATE TABLE movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            description TEXT,
            duration_minutes INTEGER,
            release_year TEXT,
            poster_url TEXT,
            genre_id INTEGER,
            rating INTEGER
        )
    `, (err) => {
        if (err) console.log('❌ Ошибка создания:', err.message);
        else console.log('✅ Новая таблица movies создана');
    });

    // 3. Добавляем 10 материалов
    correctMaterials.forEach(m => {
        db.run(`
            INSERT INTO movies (title, description, duration_minutes, release_year, poster_url, genre_id, rating)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [m.title, m.description, m.duration_minutes, m.release_year, m.poster_url, m.genre_id, m.rating], (err) => {
            if (err) console.log(`❌ Ошибка добавления ${m.title}:`, err.message);
            else console.log(`✅ Добавлен: ${m.title}`);
        });
    });

    // 4. Проверяем результат
    setTimeout(() => {
        db.all(`SELECT id, title FROM movies ORDER BY id`, (err, rows) => {
            if (err) {
                console.log('Ошибка:', err.message);
            } else {
                console.log('\n📋 Итоговый каталог материалов:');
                rows.forEach(row => {
                    console.log(`   ID ${row.id}: ${row.title}`);
                });
                console.log(`\n✅ Всего материалов: ${rows.length}`);
            }
            db.close();
        });
    }, 1500);
});