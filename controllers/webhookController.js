const pool = require('../config/db');

/**
 * Identify events and process WhatsApp webhooks.
 * Used to track delivery and read receipts for OTPs and other notifications.
 */

// Handle Webhook Verification (WhatsApp requires this when setting up the webhook URL)
exports.verifyWebhook = (req, res, next) => {
    /**
     * UPDATE YOUR VERIFY TOKEN
     * This will be the Verify Token value when you set up webhook in Meta App Dashboard
     */
    const verify_token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    // Parse params from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token === verify_token) {
            // Respond with 200 OK and challenge token from the request
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    } else {
        res.status(400).send("Missing parameters");
    }
};

// Handle Incoming Webhook Events
exports.receiveWebhook = async (req, res, next) => {
    // Return a '200 OK' response to all requests
    res.sendStatus(200);

    const body = req.body;

    // Check the Incoming webhook message
    // console.log(JSON.stringify(req.body, null, 2));

    if (body.object === 'whatsapp_business_account') {
        try {
            for (let entry of body.entry) {
                for (let change of entry.changes) {
                    const value = change.value;

                    // Handle message statuses (sent, delivered, read, failed)
                    if (value.statuses && value.statuses.length > 0) {
                        for (let status of value.statuses) {
                            const messageId = status.id;
                            const messageStatus = status.status; // 'sent', 'delivered', 'read', 'failed'
                            const timestamp = new Date(status.timestamp * 1000);
                            const recipientId = status.recipient_id; // mobile number

                            // Log or save to database for monitoring
                            console.log(`[WhatsApp Status] Message ${messageId} to ${recipientId} is now ${messageStatus} at ${timestamp.toISOString()}`);

                            // Example integration point for Event-Driven Architecture:
                            // if (messageStatus === 'failed') {
                            //     // Trigger an event to send an SMS fallback or alert Admin
                            // }

                            // Save status directly into the database log
                            await pool.query('UPDATE whatsapp_logs SET status = $1, updated_at = $2 WHERE message_id = $3', [messageStatus, timestamp, messageId]);

                            // Emit live event for the monitoring dashboard
                            const io = req.app.get('io');
                            if (io) {
                                io.emit('wa_status_update', {
                                    message_id: messageId,
                                    status: messageStatus,
                                    recipient: recipientId,
                                    timestamp: timestamp
                                });
                            }
                        }
                    }

                    // Handle incoming user messages (if people reply to the WhatsApp bot)
                    if (value.messages && value.messages.length > 0) {
                        for (let message of value.messages) {
                            const from = message.from; // Sender's phone number
                            const messageId = message.id;
                            console.log(`[WhatsApp Inbox] Received message from ${from}. ID: ${messageId}`);

                            // Example: auto-reply logic could go here
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[WhatsApp Webhook Error]', error);
        }
    }
};
