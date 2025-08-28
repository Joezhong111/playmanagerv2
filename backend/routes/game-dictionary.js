import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { gameDictionaryController } from '../controllers/game-dictionary.controller.js';

const router = express.Router();

// 公共接口 - 获取活跃字典（需要登录）
router.get('/active', 
  authenticateToken,
  gameDictionaryController.getActiveDictionary
);

// 获取游戏模式（可筛选，需要登录）
router.get('/modes', 
  authenticateToken,
  [
    query('gameNameId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('游戏名称ID必须是正整数')
  ],
  gameDictionaryController.getGameModes
);

// 以下为超级管理员专用接口
router.use(authenticateToken, requireSuperAdmin);

// 游戏名称管理
router.get('/names', gameDictionaryController.getAllGameNames);

router.post('/names', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('游戏名称长度必须在1-100个字符之间'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active必须是布尔值'),
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('排序权重必须是非负整数')
], gameDictionaryController.createGameName);

router.put('/names/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('游戏名称长度必须在1-100个字符之间'),
  body('is_active')
    .isBoolean()
    .withMessage('is_active必须是布尔值'),
  body('sort_order')
    .isInt({ min: 0 })
    .withMessage('排序权重必须是非负整数')
], gameDictionaryController.updateGameName);

router.delete('/names/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数')
], gameDictionaryController.deleteGameName);

// 游戏模式管理
router.get('/modes/all', gameDictionaryController.getAllGameModes);

router.post('/modes', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('游戏模式名称长度必须在1-100个字符之间'),
  body('game_name_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) {
        return true;
      }
      if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        throw new Error('游戏名称ID必须是正整数或null');
      }
      return true;
    }),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active必须是布尔值'),
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('排序权重必须是非负整数')
], gameDictionaryController.createGameMode);

router.put('/modes/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('游戏模式名称长度必须在1-100个字符之间'),
  body('game_name_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) {
        return true;
      }
      if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        throw new Error('游戏名称ID必须是正整数或null');
      }
      return true;
    }),
  body('is_active')
    .isBoolean()
    .withMessage('is_active必须是布尔值'),
  body('sort_order')
    .isInt({ min: 0 })
    .withMessage('排序权重必须是非负整数')
], gameDictionaryController.updateGameMode);

router.delete('/modes/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数')
], gameDictionaryController.deleteGameMode);

export default router;