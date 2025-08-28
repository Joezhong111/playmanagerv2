import { validationResult } from 'express-validator';
import { gameDictionaryService } from '../services/game-dictionary.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

class GameDictionaryController {

  // 获取活跃字典（供创建任务使用）
  getActiveDictionary = asyncHandler(async (req, res, next) => {
    const dictionary = await gameDictionaryService.getActiveDictionary();
    
    res.status(200).json({
      success: true,
      data: dictionary
    });
  });

  // 管理员接口 - 获取所有游戏名称
  getAllGameNames = asyncHandler(async (req, res, next) => {
    const gameNames = await gameDictionaryService.getAllGameNames();
    
    res.status(200).json({
      success: true,
      data: gameNames
    });
  });

  // 管理员接口 - 创建游戏名称
  createGameName = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('输入数据验证失败', errors.array());
    }

    const gameName = await gameDictionaryService.createGameName(req.body);
    
    res.status(201).json({
      success: true,
      message: '游戏名称创建成功',
      data: gameName
    });
  });

  // 管理员接口 - 更新游戏名称
  updateGameName = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('输入数据验证失败', errors.array());
    }

    const { id } = req.params;
    const gameName = await gameDictionaryService.updateGameName(parseInt(id), req.body);
    
    if (!gameName) {
      return res.status(404).json({
        success: false,
        message: '游戏名称不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      message: '游戏名称更新成功',
      data: gameName
    });
  });

  // 管理员接口 - 删除游戏名称
  deleteGameName = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const result = await gameDictionaryService.deleteGameName(parseInt(id));
    
    let message = '游戏名称删除成功';
    if (result.deactivated) {
      message = '游戏名称已停用（因为存在关联任务）';
    }
    
    res.status(200).json({
      success: true,
      message,
      data: result
    });
  });

  // 管理员接口 - 获取所有游戏模式
  getAllGameModes = asyncHandler(async (req, res, next) => {
    const gameModes = await gameDictionaryService.getAllGameModes();
    
    res.status(200).json({
      success: true,
      data: gameModes
    });
  });

  // 获取游戏模式（可筛选）
  getGameModes = asyncHandler(async (req, res, next) => {
    const { gameNameId } = req.query;
    const gameModes = await gameDictionaryService.getActiveGameModes(
      gameNameId ? parseInt(gameNameId) : null
    );
    
    res.status(200).json({
      success: true,
      data: gameModes
    });
  });

  // 管理员接口 - 创建游戏模式
  createGameMode = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('输入数据验证失败', errors.array());
    }

    const gameMode = await gameDictionaryService.createGameMode(req.body);
    
    res.status(201).json({
      success: true,
      message: '游戏模式创建成功',
      data: gameMode
    });
  });

  // 管理员接口 - 更新游戏模式
  updateGameMode = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('输入数据验证失败', errors.array());
    }

    const { id } = req.params;
    const gameMode = await gameDictionaryService.updateGameMode(parseInt(id), req.body);
    
    if (!gameMode) {
      return res.status(404).json({
        success: false,
        message: '游戏模式不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      message: '游戏模式更新成功',
      data: gameMode
    });
  });

  // 管理员接口 - 删除游戏模式
  deleteGameMode = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const result = await gameDictionaryService.deleteGameMode(parseInt(id));
    
    let message = '游戏模式删除成功';
    if (result.deactivated) {
      message = '游戏模式已停用（因为存在关联任务）';
    }
    
    res.status(200).json({
      success: true,
      message,
      data: result
    });
  });
}

export const gameDictionaryController = new GameDictionaryController();