import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let connection;
  try {
    // Database connection using environment variables
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'dispatch_system',
      ssl: process.env.DB_HOST?.includes('tidbcloud.com') ? { rejectUnauthorized: true } : undefined,
      multipleStatements: true
    });

    console.log('Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/add_game_dictionary.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    console.log('Running game dictionary migration...');
    await connection.query(migrationSQL);
    
    console.log('✅ Game dictionary migration completed successfully!');
    
    // Insert some initial data
    console.log('Inserting initial game dictionary data...');
    
    // Insert popular games
    const gameNames = [
      '王者荣耀',
      '英雄联盟',
      '和平精英',
      '原神',
      '穿越火线',
      '绝地求生',
      'DOTA2',
      'CS2',
      '炉石传说',
      '我的世界'
    ];

    for (let i = 0; i < gameNames.length; i++) {
      await connection.execute(
        'INSERT INTO game_names (name, is_active, sort_order) VALUES (?, TRUE, ?)',
        [gameNames[i], i + 1]
      );
    }

    // Insert common game modes
    const commonModes = [
      '排位赛',
      '匹配模式',
      '训练模式',
      '娱乐模式',
      '团队模式',
      '单人模式',
      '竞技模式',
      '休闲模式'
    ];

    for (let i = 0; i < commonModes.length; i++) {
      await connection.execute(
        'INSERT INTO game_modes (name, game_name_id, is_active, sort_order) VALUES (?, NULL, TRUE, ?)',
        [commonModes[i], i + 1]
      );
    }

    // Insert specific modes for popular games
    const specificModes = [
      { gameName: '王者荣耀', modes: ['5V5王者峡谷', '无限乱斗', '峡谷异闻', '巅峰赛'] },
      { gameName: '英雄联盟', modes: ['召唤师峡谷', '极地大乱斗', '云顶之弈', '斗魂竞技场'] },
      { gameName: '和平精英', modes: ['经典模式', '创意工坊', '团队竞技', '生存特训'] },
      { gameName: '原神', modes: ['世界探索', '深境螺旋', '秘境挑战', '联机模式'] },
    ];

    for (const game of specificModes) {
      // Get game name ID
      const [gameResult] = await connection.execute(
        'SELECT id FROM game_names WHERE name = ?',
        [game.gameName]
      );
      
      if (gameResult.length > 0) {
        const gameId = gameResult[0].id;
        for (let i = 0; i < game.modes.length; i++) {
          await connection.execute(
            'INSERT INTO game_modes (name, game_name_id, is_active, sort_order) VALUES (?, ?, TRUE, ?)',
            [game.modes[i], gameId, i + 1]
          );
        }
      }
    }

    console.log('✅ Initial game dictionary data inserted successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runMigration();