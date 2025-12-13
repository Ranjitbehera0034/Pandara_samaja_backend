// routes/candidateRoutes.js
const express = require('express');
const controller = require('../controllers/candidateController');
const { requireAuth } = require('../middleware/auth');

/**
 * Export a function so app.js can inject the configured
 * multer instance (memory storage in your case).
 *
 * @param  {multer} upload  ← passed from app.js
 * @return {Router}
 */
module.exports = (upload) => {
  const router = express.Router();

  // Public routes
  router.get('/', controller.getAll);
  router.get('/:id', controller.getOne);

  // Protected routes (require authentication)
  router.post('/', requireAuth, upload.single('photo'), controller.create);
  router.put('/:id', requireAuth, upload.single('photo'), controller.update);
  router.put('/:id/match', requireAuth, controller.markMatched);
  router.delete('/:id', requireAuth, controller.remove);
  return router;
};
