const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

const { app } = require('../server');
const User = require('../models/User');
const Developer = require('../models/Developer');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');

let mongoServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Developer.deleteMany({}),
    Task.deleteMany({}),
    Sprint.deleteMany({}),
  ]);
});

test('smoke: login then fetch dashboard analytics', async () => {
  await request(app)
    .post('/api/auth/signup')
    .send({
      name: 'Test Manager',
      email: 'manager@test.dev',
      password: 'secret123',
      role: 'Manager',
    })
    .expect(201);

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'manager@test.dev', password: 'secret123' })
    .expect(200);

  assert.ok(loginResponse.body.token, 'Expected JWT token in login response');

  const developer = await Developer.create({
    name: 'Dev One',
    email: 'dev1@test.dev',
    commits: 2,
    pullRequestsMerged: 1,
    bugsFixed: 1,
    tasksAssigned: 1,
    tasksCompleted: 0,
  });

  await Task.create({
    title: 'Smoke Task',
    description: 'Task for analytics smoke test',
    deadline: new Date(Date.now() + 86400000),
    status: 'Pending',
    priority: 'Medium',
    assignedTo: developer._id,
    assignedToName: developer.name,
  });

  const dashboardResponse = await request(app)
    .get('/api/analytics/team')
    .set('Authorization', `Bearer ${loginResponse.body.token}`)
    .expect(200);

  assert.equal(dashboardResponse.body.summary.totalTasks, 1);
  assert.equal(dashboardResponse.body.summary.teamSize, 1);
});
