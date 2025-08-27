import { extensionService } from '../services/extension.service.js';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/AppError.js';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class ExtensionController {

  requestExtension = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const taskId = req.params.id;
    const playerId = req.user.userId;
    const data = req.body;

    const extensionRequest = await extensionService.requestExtension(taskId, playerId, data);

    res.status(201).json({
      success: true,
      message: 'Extension request created successfully',
      data: extensionRequest
    });
  });

  reviewExtensionRequest = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const requestId = req.params.id;
    const reviewerId = req.user.userId;
    const data = req.body;

    const updatedRequest = await extensionService.reviewExtensionRequest(requestId, reviewerId, data);

    res.status(200).json({
      success: true,
      message: 'Extension request reviewed successfully',
      data: updatedRequest
    });
  });

  extendTaskDuration = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const taskId = req.params.id;
    const dispatcherId = req.user.userId;
    const data = req.body;

    const updatedTask = await extensionService.extendTaskDuration(taskId, dispatcherId, data);

    res.status(200).json({
      success: true,
      message: 'Task duration extended successfully',
      data: updatedTask
    });
  });

  getExtensionRequests = asyncHandler(async (req, res, next) => {
    const { userId, role } = req.user;
    const { task_id } = req.query;

    const requests = await extensionService.getExtensionRequests(userId, role, task_id);

    res.status(200).json({
      success: true,
      data: requests
    });
  });

  getMyExtensionRequests = asyncHandler(async (req, res, next) => {
    const { userId, role } = req.user;

    const requests = await extensionService.getExtensionRequests(userId, role);

    res.status(200).json({
      success: true,
      data: requests
    });
  });
}

export const extensionController = new ExtensionController();