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
  const candidateUpload = upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'manual_form', maxCount: 1 }
  ]);

  router.post('/', requireAnyAuth, candidateUpload, controller.create);
  router.put('/:id', requireAnyAuth, candidateUpload, controller.update);
  router.put('/:id/match', requireAnyAuth, controller.markMatched);
  router.delete('/:id', requireAnyAuth, controller.remove);
  return router;
};
