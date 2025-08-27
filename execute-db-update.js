import { pool } from './backend/config/database.js';

const executeSqlScript = async () => {
  const connection = await pool.getConnection();
  
  try {
    console.log('开始执行数据库架构更新...');
    
    // 添加超时时间列到任务表
    console.log('正在添加 overtime_at 列...');
    await connection.execute(`
      ALTER TABLE tasks 
      ADD COLUMN overtime_at DATETIME NULL COMMENT '任务超时时间'
    `);
    console.log('✅ 添加 overtime_at 列成功');

    // 修改任务表的状态枚举，添加 overtime 状态
    console.log('正在更新状态枚举...');
    await connection.execute(`
      ALTER TABLE tasks 
      MODIFY COLUMN status ENUM('pending', 'accepted', 'in_progress', 'paused', 'completed', 'cancelled', 'overtime') 
      DEFAULT 'pending' 
      COMMENT '任务状态'
    `);
    console.log('✅ 任务表状态枚举添加 overtime 状态成功');

    console.log('🎉 数据库架构更新完成！');
    
  } catch (error) {
    // 如果列已存在，忽略错误
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ overtime_at 列已存在，跳过添加');
      
      // 尝试更新状态枚举
      try {
        await connection.execute(`
          ALTER TABLE tasks 
          MODIFY COLUMN status ENUM('pending', 'accepted', 'in_progress', 'paused', 'completed', 'cancelled', 'overtime') 
          DEFAULT 'pending' 
          COMMENT '任务状态'
        `);
        
        console.log('✅ 任务表状态枚举添加 overtime 状态成功');
        console.log('🎉 数据库架构更新完成！');
      } catch (enumError) {
        console.error('状态枚举更新失败:', enumError.message);
      }
    } else {
      console.error('数据库架构更新失败:', error.message);
    }
  } finally {
    connection.release();
    process.exit(0);
  }
};

executeSqlScript();