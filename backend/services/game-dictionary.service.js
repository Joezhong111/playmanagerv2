import pool from '../config/database.js';

class GameDictionaryService {
  
  // 获取所有游戏名称（管理员用）
  async getAllGameNames() {
    try {
      const [rows] = await pool.execute(`
        SELECT id, name, is_active, sort_order, created_at, updated_at
        FROM game_names 
        ORDER BY sort_order ASC, name ASC
      `);
      return rows;
    } catch (error) {
      console.error('获取游戏名称失败:', error);
      throw error;
    }
  }

  // 获取活跃的游戏名称
  async getActiveGameNames() {
    try {
      const [rows] = await pool.execute(`
        SELECT id, name, sort_order
        FROM game_names 
        WHERE is_active = TRUE
        ORDER BY sort_order ASC, name ASC
      `);
      return rows;
    } catch (error) {
      console.error('获取活跃游戏名称失败:', error);
      throw error;
    }
  }

  // 创建游戏名称
  async createGameName(data) {
    try {
      const { name, is_active = true, sort_order = 0 } = data;
      
      const [result] = await pool.execute(`
        INSERT INTO game_names (name, is_active, sort_order)
        VALUES (?, ?, ?)
      `, [name, is_active, sort_order]);
      
      return this.getGameNameById(result.insertId);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('游戏名称已存在');
      }
      console.error('创建游戏名称失败:', error);
      throw error;
    }
  }

  // 更新游戏名称
  async updateGameName(id, data) {
    try {
      const { name, is_active, sort_order } = data;
      
      await pool.execute(`
        UPDATE game_names 
        SET name = ?, is_active = ?, sort_order = ?, updated_at = NOW()
        WHERE id = ?
      `, [name, is_active, sort_order, id]);
      
      return this.getGameNameById(id);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('游戏名称已存在');
      }
      console.error('更新游戏名称失败:', error);
      throw error;
    }
  }

  // 删除游戏名称
  async deleteGameName(id) {
    try {
      // 检查是否有关联的游戏模式
      const [modes] = await pool.execute(`
        SELECT COUNT(*) as count FROM game_modes WHERE game_name_id = ?
      `, [id]);
      
      if (modes[0].count > 0) {
        throw new Error('该游戏名称下还有游戏模式，请先删除相关模式');
      }

      // 检查是否有关联的任务
      const [tasks] = await pool.execute(`
        SELECT COUNT(*) as count FROM tasks t
        JOIN game_names gn ON t.game_name = gn.name
        WHERE gn.id = ?
      `, [id]);

      if (tasks[0].count > 0) {
        // 如果有关联任务，只是标记为不活跃而不是删除
        await pool.execute(`
          UPDATE game_names SET is_active = FALSE WHERE id = ?
        `, [id]);
        return { deleted: false, deactivated: true };
      } else {
        // 没有关联任务时才真正删除
        await pool.execute(`DELETE FROM game_names WHERE id = ?`, [id]);
        return { deleted: true, deactivated: false };
      }
    } catch (error) {
      console.error('删除游戏名称失败:', error);
      throw error;
    }
  }

  // 获取单个游戏名称
  async getGameNameById(id) {
    try {
      const [rows] = await pool.execute(`
        SELECT id, name, is_active, sort_order, created_at, updated_at
        FROM game_names 
        WHERE id = ?
      `, [id]);
      
      return rows[0] || null;
    } catch (error) {
      console.error('获取游戏名称失败:', error);
      throw error;
    }
  }

  // 获取所有游戏模式（管理员用）
  async getAllGameModes() {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          gm.id, gm.name, gm.is_active, gm.sort_order, 
          gm.game_name_id, gn.name as game_name,
          gm.created_at, gm.updated_at
        FROM game_modes gm
        LEFT JOIN game_names gn ON gm.game_name_id = gn.id
        ORDER BY gn.sort_order ASC, gn.name ASC, gm.sort_order ASC, gm.name ASC
      `);
      return rows;
    } catch (error) {
      console.error('获取游戏模式失败:', error);
      throw error;
    }
  }

  // 获取活跃的游戏模式
  async getActiveGameModes(gameNameId = null) {
    try {
      let sql = `
        SELECT 
          gm.id, gm.name, gm.sort_order, gm.game_name_id,
          gn.name as game_name
        FROM game_modes gm
        LEFT JOIN game_names gn ON gm.game_name_id = gn.id
        WHERE gm.is_active = TRUE
      `;
      let params = [];

      if (gameNameId) {
        sql += ` AND (gm.game_name_id = ? OR gm.game_name_id IS NULL)`;
        params.push(gameNameId);
      }

      sql += ` ORDER BY gm.sort_order ASC, gm.name ASC`;

      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('获取活跃游戏模式失败:', error);
      throw error;
    }
  }

  // 创建游戏模式
  async createGameMode(data) {
    try {
      const { name, game_name_id = null, is_active = true, sort_order = 0 } = data;
      
      const [result] = await pool.execute(`
        INSERT INTO game_modes (name, game_name_id, is_active, sort_order)
        VALUES (?, ?, ?, ?)
      `, [name, game_name_id, is_active, sort_order]);
      
      return this.getGameModeById(result.insertId);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('该游戏下的模式名称已存在');
      }
      console.error('创建游戏模式失败:', error);
      throw error;
    }
  }

  // 更新游戏模式
  async updateGameMode(id, data) {
    try {
      const { name, game_name_id, is_active, sort_order } = data;
      
      await pool.execute(`
        UPDATE game_modes 
        SET name = ?, game_name_id = ?, is_active = ?, sort_order = ?, updated_at = NOW()
        WHERE id = ?
      `, [name, game_name_id, is_active, sort_order, id]);
      
      return this.getGameModeById(id);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('该游戏下的模式名称已存在');
      }
      console.error('更新游戏模式失败:', error);
      throw error;
    }
  }

  // 删除游戏模式
  async deleteGameMode(id) {
    try {
      // 检查是否有关联的任务
      const [tasks] = await pool.execute(`
        SELECT COUNT(*) as count FROM tasks t
        JOIN game_modes gm ON t.game_mode = gm.name
        WHERE gm.id = ?
      `, [id]);

      if (tasks[0].count > 0) {
        // 如果有关联任务，只是标记为不活跃而不是删除
        await pool.execute(`
          UPDATE game_modes SET is_active = FALSE WHERE id = ?
        `, [id]);
        return { deleted: false, deactivated: true };
      } else {
        // 没有关联任务时才真正删除
        await pool.execute(`DELETE FROM game_modes WHERE id = ?`, [id]);
        return { deleted: true, deactivated: false };
      }
    } catch (error) {
      console.error('删除游戏模式失败:', error);
      throw error;
    }
  }

  // 获取单个游戏模式
  async getGameModeById(id) {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          gm.id, gm.name, gm.is_active, gm.sort_order, 
          gm.game_name_id, gn.name as game_name,
          gm.created_at, gm.updated_at
        FROM game_modes gm
        LEFT JOIN game_names gn ON gm.game_name_id = gn.id
        WHERE gm.id = ?
      `, [id]);
      
      return rows[0] || null;
    } catch (error) {
      console.error('获取游戏模式失败:', error);
      throw error;
    }
  }

  // 获取完整的活跃字典（供创建任务使用）
  async getActiveDictionary() {
    try {
      const gameNames = await this.getActiveGameNames();
      const gameModes = await this.getActiveGameModes();
      
      // 将游戏模式按游戏名称分组
      const gameNamesWithModes = gameNames.map(gameName => ({
        ...gameName,
        modes: gameModes.filter(mode => 
          mode.game_name_id === gameName.id || mode.game_name_id === null
        )
      }));

      return {
        gameNames: gameNamesWithModes,
        commonModes: gameModes.filter(mode => mode.game_name_id === null)
      };
    } catch (error) {
      console.error('获取活跃字典失败:', error);
      throw error;
    }
  }
}

export const gameDictionaryService = new GameDictionaryService();