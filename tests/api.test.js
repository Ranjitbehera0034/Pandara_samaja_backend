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

test('GET /api/v1/posts - returns public feed', async () => {
    const response = await request(app).get('/api/v1/posts');
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body.posts));
});

test('GET /api/v1/leaders - returns leader list', async () => {
    const response = await request(app).get('/api/v1/leaders');
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body.leaders));
});

test('GET /api/v1/members - requires authentication', async () => {
    const response = await request(app).get('/api/v1/members');
    // Should be unauthorized if no token
    assert.strictEqual(response.status, 401);
});

test('GET /api/v1/admin/dashboard - requires admin authentication', async () => {
    const response = await request(app).get('/api/v1/admin/dashboard');
    assert.strictEqual(response.status, 401);
});

test('GET /unknown-route - returns 404', async () => {
    const response = await request(app).get('/unknown-route');
    assert.strictEqual(response.status, 404);
});
