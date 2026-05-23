const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// On Railway: set DB_PATH=/app/data/econudge.db (persistent volume)
// Locally: saves next to this file
const dbPath = process.env.DB_PATH || path.join(__dirname, 'econudge.db');

// Make sure the directory exists (important for Railway volume)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
console.log('📁 Database location:', dbPath);

function initializeDatabase() {
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      city TEXT DEFAULT 'Hyderabad',
      country TEXT DEFAULT 'India',
      units TEXT DEFAULT 'kg',
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_logged_date TEXT,
      onboarding_done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      amount REAL NOT NULL,
      unit TEXT NOT NULL,
      co2_kg REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS emission_factors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      factor_per_unit REAL NOT NULL,
      unit TEXT NOT NULL,
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      points INTEGER NOT NULL,
      co2_saved_estimate REAL,
      difficulty TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      completed_at TEXT DEFAULT (datetime('now')),
      points_earned INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS city_averages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      avg_daily_co2_kg REAL NOT NULL
    );
  `);

  // Seed emission factors if empty
  const factorCount = db.prepare('SELECT COUNT(*) as count FROM emission_factors').get();
  if (factorCount.count === 0) {
    const insertFactor = db.prepare(`
      INSERT INTO emission_factors (category, activity_name, factor_per_unit, unit, source)
      VALUES (?, ?, ?, ?, ?)
    `);
    const factors = [
      ['transport', 'Car (Petrol)', 0.21, 'km', 'IPCC 2021'],
      ['transport', 'Car (Diesel)', 0.17, 'km', 'IPCC 2021'],
      ['transport', 'Bus', 0.089, 'km', 'IPCC 2021'],
      ['transport', 'Train', 0.041, 'km', 'IPCC 2021'],
      ['transport', 'Flight (Short-haul)', 0.255, 'km', 'IPCC 2021'],
      ['transport', 'Motorcycle', 0.113, 'km', 'IPCC 2021'],
      ['transport', 'Auto Rickshaw', 0.08, 'km', 'Estimated'],
      ['food', 'Beef Meal', 6.61, 'meal', 'Our World in Data'],
      ['food', 'Chicken Meal', 0.97, 'meal', 'Our World in Data'],
      ['food', 'Vegetarian Meal', 0.5, 'meal', 'Our World in Data'],
      ['food', 'Vegan Meal', 0.3, 'meal', 'Our World in Data'],
      ['food', 'Pork Meal', 2.9, 'meal', 'Our World in Data'],
      ['food', 'Fish Meal', 1.34, 'meal', 'Our World in Data'],
      ['energy', 'Electricity (India)', 0.82, 'kWh', 'CEA India 2023'],
      ['energy', 'Electricity (EU)', 0.28, 'kWh', 'EEA 2023'],
      ['energy', 'Electricity (USA)', 0.39, 'kWh', 'EPA 2023'],
      ['energy', 'Natural Gas', 2.0, 'kWh', 'IPCC 2021'],
      ['energy', 'LPG Cooking', 1.51, 'kg', 'IPCC 2021'],
      ['shopping', 'Online Shopping Order', 3.5, 'order', 'MIT Study'],
      ['shopping', 'New Clothing Item', 8.0, 'item', 'WRAP 2022'],
      ['shopping', 'Smartphone', 70.0, 'item', 'Apple LCA'],
      ['shopping', 'Laptop', 300.0, 'item', 'Estimated'],
    ];
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insertFactor.run(...row);
    });
    insertMany(factors);
  }

  // Seed tasks if empty
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
  if (taskCount.count === 0) {
    const insertTask = db.prepare(`
      INSERT INTO tasks (title, description, category, points, co2_saved_estimate, difficulty)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const tasks = [
      ['Skip Meat Today', 'Choose a vegetarian or vegan meal instead of meat.', 'food', 10, 6.0, 'easy'],
      ['Take the Bus', 'Use public transport instead of a private car today.', 'transport', 10, 2.5, 'easy'],
      ['Turn Off Unused Lights', 'Turn off lights in rooms you are not using for the whole day.', 'energy', 5, 0.3, 'easy'],
      ['No Online Shopping This Week', 'Avoid placing any online orders for 7 days.', 'shopping', 20, 3.5, 'medium'],
      ['Walk or Cycle to Work', 'Leave the car or bike at home and walk or cycle.', 'transport', 15, 3.0, 'medium'],
      ['Eat Vegan for a Day', 'Go fully plant-based for all meals today.', 'food', 15, 8.0, 'medium'],
      ['Unplug Electronics', 'Unplug chargers, TVs, and devices when not in use.', 'energy', 5, 0.5, 'easy'],
      ['Cold Water Wash', 'Wash your clothes in cold water today.', 'energy', 8, 0.6, 'easy'],
      ['Carpool to Work', 'Share a ride with a colleague or friend.', 'transport', 12, 2.0, 'easy'],
      ['Buy Second-Hand', 'Purchase a second-hand item instead of new.', 'shopping', 20, 8.0, 'medium'],
      ['Plant-Based Breakfast', 'Start the day with a plant-based breakfast.', 'food', 8, 2.0, 'easy'],
      ['Work From Home', 'Avoid commuting by working from home today.', 'transport', 15, 3.5, 'easy'],
      ['Reduce AC by 2 Degrees', 'Set your AC 2 degrees warmer than usual.', 'energy', 10, 1.0, 'easy'],
      ['No Beef This Week', 'Avoid beef for 7 days straight.', 'food', 30, 46.0, 'hard'],
      ['Train Instead of Flight', 'Choose train travel over a short-haul flight.', 'transport', 50, 50.0, 'hard'],
      ['Zero Waste Shopping', 'Buy groceries with no single-use plastic today.', 'shopping', 15, 1.0, 'medium'],
      ['30-Min Meatless Monday', 'Cook a vegetarian meal from scratch.', 'food', 10, 3.0, 'easy'],
      ['Use a Reusable Bag', 'Bring a reusable bag for all shopping trips today.', 'shopping', 5, 0.1, 'easy'],
      ['Limit Shower to 5 Min', 'Keep your shower under 5 minutes.', 'energy', 8, 0.3, 'easy'],
      ['No Car Day', 'Do not use a car or motorbike for the entire day.', 'transport', 20, 4.0, 'medium'],
    ];
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insertTask.run(...row);
    });
    insertMany(tasks);
  }

  // Seed city averages if empty
  const cityCount = db.prepare('SELECT COUNT(*) as count FROM city_averages').get();
  if (cityCount.count === 0) {
    const insertCity = db.prepare(`
      INSERT INTO city_averages (city, country, avg_daily_co2_kg) VALUES (?, ?, ?)
    `);
    const cities = [
      ['Hyderabad', 'India', 5.2],
      ['Mumbai', 'India', 5.0],
      ['Delhi', 'India', 5.8],
      ['London', 'UK', 8.5],
      ['New York', 'USA', 12.0],
      ['Berlin', 'Germany', 7.0],
      ['Tokyo', 'Japan', 6.8],
      ['Sydney', 'Australia', 10.5],
      ['Lagos', 'Nigeria', 3.2],
      ['Sao Paulo', 'Brazil', 4.5],
    ];
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insertCity.run(...row);
    });
    insertMany(cities);
  }

  console.log('✅ Database initialized successfully');
}

module.exports = { db, initializeDatabase };
