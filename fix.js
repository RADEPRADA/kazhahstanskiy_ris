const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./cinema.db');

db.serialize(() => {
    // Очищаем movies
    db.run(`DELETE FROM movies`);
    db.run(`DELETE FROM sqlite_sequence WHERE name='movies'`);
    
    // Добавляем сорта риса
    const rice = [
        ['Сорт «КАМОЛИНО ЯНТАРЬ»', 'Рис | сорт "Камолино ЯНТАРЬ" — элитный сорт с нежным ароматом', 1000, 'Вакуумная упаковка', 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 1, 5],
        ['Сорт «КАМОЛИНО ЛИДЕР»', 'Рис | сорт "Камолино ЛИДЕР" — премиальный сорт с отличной клейковиной', 1000, 'Вакуумная упаковка', 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 1, 5],
        ['Вакуумная упаковка', 'Рис "Элита" | Вакуумная упаковка — сохраняет свежесть и аромат', 1000, 'Вакуумная упаковка', 'https://images.unsplash.com/photo-1551537482-f2075a1d41f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 1, 5],
        ['Сорт «БАРАКАТ»', 'Рис | сорт "Баракат" — качественный рис для повседневного использования', 1000, 'Стандартная упаковка', 'https://images.unsplash.com/photo-1516684732162-798a0062be99?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 1, 4],
        ['Сорт «ЯНТАРЬ»', 'Рис | сорт "Янтарь" — элитный длиннозерный рис с янтарным оттенком', 1000, 'Стандартная упаковка', 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 1, 5],
        ['Сорт «ЛИДЕР»', 'Рис | сорт "Лидер" — премиальный круглозерный сорт', 1000, 'Стандартная упаковка', 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 1, 4],
        ['Сорт «КАМОЛИНО»', 'Рис | сорт "Камолино" — уникальный сорт с ореховым ароматом', 1000, 'Стандартная упаковка', 'https://images.unsplash.com/photo-1551537482-f2075a1d41f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 1, 5],
        ['Сорт «ЭЛИТА»', 'Рис "Элита" | Вакуумная упаковка — отборный рис высшего качества', 1000, 'Вакуумная упаковка', 'https://images.unsplash.com/photo-1516684732162-798a0062be99?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 1, 5],
        ['Сорт «ЛИДЕР» Элита', 'Рис "Элита" | сорт "Лидер" — лучший выбор для гурманов', 1000, 'Вакуумная упаковка', 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 1, 5]
    ];
    
    rice.forEach(r => {
        db.run(`INSERT INTO movies (title, description, duration_minutes, release_year, poster_url, genre_id, rating)
                VALUES (?, ?, ?, ?, ?, ?, ?)`, r);
    });
    
    console.log('✅ Сорта риса добавлены!');
});

db.close();