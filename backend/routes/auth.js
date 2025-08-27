
import express from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller.js';

const router = express.Router();

const loginValidation = [
  body('username').trim().isLength({ min: 1 }).escape(),
  body('password').isLength({ min: 1 })
];

const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters').escape(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['dispatcher', 'player']).withMessage('Role must be either dispatcher or player')
];

router.post('/login', loginValidation, authController.login);

router.post('/register', registerValidation, authController.register);

router.get('/verify', authController.verify);

export default router;
