/**
 * Middleware to verify Cloudflare Turnstile CAPTCHA token
 */
const verifyTurnstile = async (req, res, next) => {
    // Skip CAPTCHA check in development if needed, 
    // but better to use Cloudflare's test keys
    if (process.env.NODE_ENV === 'test') return next();

    const token = req.body.captchaToken;
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'CAPTCHA token is missing'
        });
    }

    try {
        const response = await fetch(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    secret: secretKey,
                    response: token,
                    remoteip: req.ip
                })
            }
        );

        const data = await response.json();

        if (data.success) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: 'CAPTCHA verification failed',
                errors: data['error-codes']
            });
        }
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during CAPTCHA verification'
        });
    }
};

module.exports = { verifyTurnstile };
