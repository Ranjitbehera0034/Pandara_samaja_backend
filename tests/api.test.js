const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app } = require('../app');

test('POST /api/v1/auth/login - fails with empty body', async () => {
    const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

    // Since we use Zod validation middleware, it should return 400 or something similar
    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.success, false);
});

test('GET /unknown-route - returns 404', async () => {
    const response = await request(app).get('/unknown-route');
    assert.strictEqual(response.status, 404);
});
