// routes/candidateRoutes.js
const express = require('express');
const controller = require('../controllers/candidateController');
const { requireAuth } = require('../middleware/auth');
const { requireAnyAuth } = require('../middleware/anyAuth');

/**
 * Export a function so app.js can inject the configured
 * multer instance (memory storage in your case).
 *
 * @param  {multer} upload  ← passed from app.js
 * @return {Router}
 */
module.exports = (upload) => {
  const router = express.Router();

  // Public/Member Protected routes
  router.get('/', requireAnyAuth, controller.getAll);
  router.get('/:id', requireAnyAuth, controller.getOne);

  // Protected routes (require authentication)
  router.post('/', requireAnyAuth, upload.single('photo'), controller.create);
  router.put('/:id', requireAnyAuth, upload.single('photo'), controller.update);
  router.put('/:id/match', requireAnyAuth, controller.markMatched);
  router.delete('/:id', requireAnyAuth, controller.remove);
  return router;
};
