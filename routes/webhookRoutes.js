const express = require('express');
const router = express.Router();
const webhookCtrl = require('../controllers/webhookController');

// WhatsApp API Webhook endpoint configuration:
// WhatsApp requires a public endpoint with no authentication layer for GET and POST

// Handle Webhook Verification Request
router.get('/whatsapp', webhookCtrl.verifyWebhook);

// Handle Incoming Data from WhatsApp
router.post('/whatsapp', webhookCtrl.receiveWebhook);

module.exports = router;
