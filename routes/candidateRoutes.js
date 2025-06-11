const express = require('express');
const router = express.Router();
const controller = require('../controllers/candidateController');
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post("/", upload.single("photo"), controller.create); // << file upload support
router.put("/:id", upload.single("photo"), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;