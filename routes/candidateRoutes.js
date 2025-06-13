// routes/candidateRoutes.js
const express    = require('express');
const controller = require('../controllers/candidateController');

/**
 * Export a function so app.js can inject the configured
 * multer instance (memory storage in your case).
 *
 * @param  {multer} upload  ← passed from app.js
 * @return {Router}
 */
module.exports = (upload) => {
  const router = express.Router();

  router.get('/',        controller.getAll);
  router.get('/:id',     controller.getOne);

  // Use the caller-supplied upload middleware
  router.post(   '/',    upload.single('photo'), controller.create);
  router.put( '/:id',    upload.single('photo'), controller.update);

  router.delete('/:id',  controller.remove);
  return router;
};
