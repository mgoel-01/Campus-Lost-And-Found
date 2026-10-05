// Automated system tests for the Campus Lost & Found REST API.
//
// Run with:  npm test   (from the server folder, MongoDB must be running)
//
// The tests start the real Express app on a random port and talk to it over HTTP,
// exactly like the React website does. They use a SEPARATE database
// (campus-lost-found-test) which is wiped before and after, so your demo data
// is never touched.
//
// Each test name starts with a test-case ID (TC-01, TC-02, ...) that matches the
// test case table in the Testing Report.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Claim from '../src/models/Claim.js';

process.env.JWT_SECRET = 'test-secret';
const TEST_DB = 'mongodb://127.0.0.1:27017/campus-lost-found-test';

let server;
let baseUrl;

// Small helper: send a request and return { status, body }.
async function call(method, url, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(baseUrl + url, { method, headers, body });
  return { status: res.status, body: await res.json() };
}

function itemForm(overrides = {}) {
  const fields = {
    type: 'found',
    title: 'Black umbrella',
    description: 'Foldable black umbrella left in the reading room.',
    category: 'Other',
    location: 'Central Library',
    date: '2026-10-01',
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value);
  }
  return form;
}

// Accounts and posts shared between tests.
const ctx = {};

before(async () => {
  await mongoose.connect(TEST_DB);
  await mongoose.connection.dropDatabase();
  await Claim.syncIndexes();
  await User.syncIndexes();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise((resolve) => server.close(resolve));
});

describe('Module 1: User accounts (register / login)', () => {
  it('TC-01 Register with valid details creates an account and returns a token', async () => {
    const res = await call('POST', '/api/auth/register', {
      json: { name: 'Finder One', email: 'finder@campus.edu', password: 'secret123', phone: '9000000001' },
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'finder@campus.edu');
    assert.equal(res.body.user.password, undefined, 'password must never be sent back');
    ctx.finder = res.body.token;
  });

  it('TC-02 Register with a missing field is rejected', async () => {
    const res = await call('POST', '/api/auth/register', { json: { email: 'x@campus.edu', password: 'secret123' } });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /required/);
  });

  it('TC-03 Register with a password shorter than 6 characters is rejected', async () => {
    const res = await call('POST', '/api/auth/register', {
      json: { name: 'Shorty', email: 'short@campus.edu', password: '123' },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /at least 6/);
  });

  it('TC-04 Register with an email that is already used (any capitalisation) is rejected', async () => {
    const res = await call('POST', '/api/auth/register', {
      json: { name: 'Copy', email: 'FINDER@campus.edu', password: 'secret123' },
    });
    assert.equal(res.status, 409);
  });

  it('TC-05 Register with an invalid email format is rejected', async () => {
    const res = await call('POST', '/api/auth/register', {
      json: { name: 'Bad Email', email: 'not-an-email', password: 'secret123' },
    });
    assert.equal(res.status, 400);
  });

  it('TC-06 Password is stored hashed, never as plain text', async () => {
    const user = await User.findOne({ email: 'finder@campus.edu' }).select('+password');
    assert.notEqual(user.password, 'secret123');
    assert.match(user.password, /^\$2[aby]\$/, 'should be a bcrypt hash');
  });

  it('TC-07 Login with correct email and password succeeds', async () => {
    const res = await call('POST', '/api/auth/login', { json: { email: 'finder@campus.edu', password: 'secret123' } });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
  });

  it('TC-08 Login with a wrong password fails with a generic message', async () => {
    const res = await call('POST', '/api/auth/login', { json: { email: 'finder@campus.edu', password: 'wrongpass' } });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Incorrect email or password.');
  });

  it('TC-09 Login with empty fields is rejected', async () => {
    const res = await call('POST', '/api/auth/login', { json: { email: '', password: '' } });
    assert.equal(res.status, 400);
  });

  it('TC-10 Login with a non-text email (injection attempt) is rejected cleanly', async () => {
    const res = await call('POST', '/api/auth/login', { json: { email: { $gt: '' }, password: 'x' } });
    assert.equal(res.status, 400);
  });

  it('TC-11 "Who am I" works with a valid token', async () => {
    const res = await call('GET', '/api/auth/me', { token: ctx.finder });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, 'Finder One');
  });

  it('TC-12 "Who am I" without a token or with a fake token is refused', async () => {
    assert.equal((await call('GET', '/api/auth/me')).status, 401);
    assert.equal((await call('GET', '/api/auth/me', { token: 'fake.token.value' })).status, 401);
  });

  it('(setup) create two more students: an owner and a second claimant', async () => {
    const owner = await call('POST', '/api/auth/register', {
      json: { name: 'Owner Two', email: 'owner@campus.edu', password: 'secret123' },
    });
    const other = await call('POST', '/api/auth/register', {
      json: { name: 'Other Three', email: 'other@campus.edu', password: 'secret123' },
    });
    ctx.owner = owner.body.token;
    ctx.ownerId = owner.body.user.id;
    ctx.other = other.body.token;
  });
});

describe('Module 2: Posting and managing items', () => {
  it('TC-13 Logged-in student can post a found item', async () => {
    const res = await call('POST', '/api/items', { token: ctx.finder, form: itemForm() });
    assert.equal(res.status, 201);
    assert.equal(res.body.item.status, 'open');
    ctx.itemId = res.body.item._id;
  });

  it('TC-14 Posting without logging in is refused', async () => {
    const res = await call('POST', '/api/items', { form: itemForm() });
    assert.equal(res.status, 401);
  });

  it('TC-15 Posting with a required field missing is rejected', async () => {
    const res = await call('POST', '/api/items', { token: ctx.finder, form: itemForm({ location: undefined }) });
    assert.equal(res.status, 400);
  });

  it('TC-16 Posting with a category that is not in the list is rejected', async () => {
    const res = await call('POST', '/api/items', { token: ctx.finder, form: itemForm({ category: 'Spaceship' }) });
    assert.equal(res.status, 400);
  });

  it('TC-17 Posting with a valid photo saves it under a random file name', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const form = itemForm({ title: 'Red pencil box', category: 'Books & Stationery' });
    form.append('image', new Blob([png], { type: 'image/png' }), '../../evil-name.png');
    const res = await call('POST', '/api/items', { token: ctx.finder, form });
    assert.equal(res.status, 201);
    assert.match(res.body.item.imageUrl, /^\/uploads\/[0-9a-f-]{36}\.png$/);
    assert.ok(fs.existsSync(path.resolve('uploads', path.basename(res.body.item.imageUrl))));
    ctx.photoItemId = res.body.item._id;
    ctx.photoPath = path.resolve('uploads', path.basename(res.body.item.imageUrl));
  });

  it('TC-18 Uploading a file that is not an image is rejected', async () => {
    const form = itemForm();
    form.append('image', new Blob(['hello'], { type: 'text/plain' }), 'notes.txt');
    const res = await call('POST', '/api/items', { token: ctx.finder, form });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Only image files/);
  });

  it('TC-19 Uploading an image larger than 5 MB is rejected', async () => {
    const form = itemForm();
    form.append('image', new Blob([Buffer.alloc(5.5 * 1024 * 1024)], { type: 'image/png' }), 'big.png');
    const res = await call('POST', '/api/items', { token: ctx.finder, form });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Image must be smaller than 5 MB.');
  });

  it('TC-20 Owner can edit their own post', async () => {
    const form = new FormData();
    form.append('title', 'Black umbrella with wooden handle');
    const res = await call('PATCH', `/api/items/${ctx.itemId}`, { token: ctx.finder, form });
    assert.equal(res.status, 200);
    assert.equal(res.body.item.title, 'Black umbrella with wooden handle');
  });

  it("TC-21 A student cannot edit or delete someone else's post", async () => {
    const form = new FormData();
    form.append('title', 'Hacked');
    assert.equal((await call('PATCH', `/api/items/${ctx.itemId}`, { token: ctx.other, form })).status, 403);
    assert.equal((await call('DELETE', `/api/items/${ctx.itemId}`, { token: ctx.other })).status, 403);
  });

  it('TC-22 "My posts" lists only the items I posted', async () => {
    const res = await call('GET', '/api/items/mine', { token: ctx.finder });
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 2);
    const other = await call('GET', '/api/items/mine', { token: ctx.other });
    assert.equal(other.body.items.length, 0);
  });
});

describe('Module 3: Searching and viewing items', () => {
  it('(setup) owner reports a lost item', async () => {
    const res = await call('POST', '/api/items', {
      token: ctx.owner,
      form: itemForm({
        type: 'lost',
        title: 'Lost Casio calculator',
        description: 'FX-991EX with my initials on the back.',
        category: 'Electronics',
        location: 'Canteen',
      }),
    });
    ctx.lostId = res.body.item._id;
  });

  it('TC-23 Browsing lists open items, newest first', async () => {
    const res = await call('GET', '/api/items');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
    assert.equal(res.body.items[0]._id, ctx.lostId);
  });

  it('TC-24 Keyword search matches title, description or location', async () => {
    assert.equal((await call('GET', '/api/items?q=calculator')).body.total, 1);
    assert.equal((await call('GET', '/api/items?q=canteen')).body.total, 1);
    assert.equal((await call('GET', '/api/items?q=reading%20room')).body.total, 2);
  });

  it('TC-25 Filters by category and by found/lost', async () => {
    assert.equal((await call('GET', '/api/items?category=Electronics')).body.total, 1);
    assert.equal((await call('GET', '/api/items?type=found')).body.total, 2);
    assert.equal((await call('GET', '/api/items?type=lost&category=Other')).body.total, 0);
  });

  it('TC-26 Search text with special characters does not break the server', async () => {
    const res = await call('GET', '/api/items?q=' + encodeURIComponent('(.*'));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
  });

  it('TC-27 Results are split into pages', async () => {
    const res = await call('GET', '/api/items?limit=2&page=2');
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.pages, 2);
  });

  it("TC-28 Visitors who are not logged in cannot see the poster's email or phone", async () => {
    const res = await call('GET', `/api/items/${ctx.itemId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.item.postedBy.name, 'Finder One');
    assert.equal(res.body.item.postedBy.email, undefined);
    assert.equal(res.body.item.postedBy.phone, undefined);
  });

  it("TC-29 Logged-in students can see the poster's contact details", async () => {
    const res = await call('GET', `/api/items/${ctx.itemId}`, { token: ctx.other });
    assert.equal(res.body.item.postedBy.email, 'finder@campus.edu');
    assert.equal(res.body.item.postedBy.phone, '9000000001');
  });

  it('TC-30 Opening an item with a malformed or unknown id gives a clear error', async () => {
    const bad = await call('GET', '/api/items/12345');
    assert.equal(bad.status, 400);
    assert.equal(bad.body.message, 'Invalid id.');
    const missing = await call('GET', `/api/items/${new mongoose.Types.ObjectId()}`);
    assert.equal(missing.status, 404);
  });

  it('TC-31 Home page statistics count open and returned items', async () => {
    const res = await call('GET', '/api/items/stats');
    assert.deepEqual(res.body, { found: 2, lost: 1, resolved: 0 });
  });
});

describe('Module 4: Claim requests', () => {
  it('TC-32 A student can send a claim request on a found item', async () => {
    const res = await call('POST', '/api/claims', {
      token: ctx.owner,
      json: { itemId: ctx.itemId, message: 'It has a wooden handle with a scratch near the button.' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.claim.status, 'pending');
    ctx.claimId = res.body.claim._id;
  });

  it('TC-33 Claiming without logging in is refused', async () => {
    const res = await call('POST', '/api/claims', { json: { itemId: ctx.itemId, message: 'mine' } });
    assert.equal(res.status, 401);
  });

  it('TC-34 A claim without a message is rejected', async () => {
    const res = await call('POST', '/api/claims', { token: ctx.other, json: { itemId: ctx.itemId, message: '' } });
    assert.equal(res.status, 400);
  });

  it('TC-35 A student cannot claim their own post', async () => {
    const res = await call('POST', '/api/claims', { token: ctx.finder, json: { itemId: ctx.itemId, message: 'mine' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'You cannot claim your own post.');
  });

  it('TC-36 The same student cannot claim the same item twice', async () => {
    const res = await call('POST', '/api/claims', { token: ctx.owner, json: { itemId: ctx.itemId, message: 'again' } });
    assert.equal(res.status, 409);
  });

  it('TC-37 Poster sees received requests; claimant sees sent requests', async () => {
    const second = await call('POST', '/api/claims', {
      token: ctx.other,
      json: { itemId: ctx.itemId, message: 'I think I left it there on Monday.' },
    });
    ctx.secondClaimId = second.body.claim._id;

    const received = await call('GET', '/api/claims/received', { token: ctx.finder });
    assert.equal(received.body.claims.length, 2);
    assert.ok(received.body.claims[0].claimant.email, 'poster can contact claimant');

    const sent = await call('GET', '/api/claims/sent', { token: ctx.owner });
    assert.equal(sent.body.claims.length, 1);
    assert.equal(sent.body.claims[0].item.title, 'Black umbrella with wooden handle');
  });

  it('TC-38 Only the poster can approve or reject a request', async () => {
    const res = await call('PATCH', `/api/claims/${ctx.claimId}`, { token: ctx.other, json: { status: 'approved' } });
    assert.equal(res.status, 403);
  });

  it('TC-39 An invalid decision value is rejected', async () => {
    const res = await call('PATCH', `/api/claims/${ctx.claimId}`, { token: ctx.finder, json: { status: 'maybe' } });
    assert.equal(res.status, 400);
  });

  it('TC-40 Approving a request marks the item returned and rejects the other requests', async () => {
    const res = await call('PATCH', `/api/claims/${ctx.claimId}`, { token: ctx.finder, json: { status: 'approved' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.claim.status, 'approved');

    const item = await call('GET', `/api/items/${ctx.itemId}`, { token: ctx.finder });
    assert.equal(item.body.item.status, 'resolved');
    assert.equal(item.body.item.resolvedWith, ctx.ownerId);

    const other = await Claim.findById(ctx.secondClaimId);
    assert.equal(other.status, 'rejected');
  });

  it('TC-41 A returned item can no longer be claimed', async () => {
    const res = await call('POST', '/api/claims', {
      token: ctx.other,
      json: { itemId: ctx.itemId, message: 'please' },
    });
    // "other" already has a (rejected) claim, so use a fresh account.
    const fresh = await call('POST', '/api/auth/register', {
      json: { name: 'Late Comer', email: 'late@campus.edu', password: 'secret123' },
    });
    const late = await call('POST', '/api/claims', {
      token: fresh.body.token,
      json: { itemId: ctx.itemId, message: 'please' },
    });
    assert.ok([400, 409].includes(res.status));
    assert.equal(late.status, 400);
    assert.equal(late.body.message, 'This item has already been returned.');
  });

  it('TC-42 Once an item is returned, its other requests cannot be approved', async () => {
    const res = await call('PATCH', `/api/claims/${ctx.secondClaimId}`, {
      token: ctx.finder,
      json: { status: 'approved' },
    });
    assert.equal(res.status, 400);
    const item = await call('GET', `/api/items/${ctx.itemId}`, { token: ctx.finder });
    assert.equal(item.body.item.resolvedWith, ctx.ownerId, 'item must stay returned to the first claimant');
  });

  it('TC-43 Deleting a post also deletes its photo and its claim requests', async () => {
    await call('POST', '/api/claims', { token: ctx.other, json: { itemId: ctx.photoItemId, message: 'my pencil box' } });
    const res = await call('DELETE', `/api/items/${ctx.photoItemId}`, { token: ctx.finder });
    assert.equal(res.status, 200);
    assert.equal(await Claim.countDocuments({ item: ctx.photoItemId }), 0);
    assert.equal(fs.existsSync(ctx.photoPath), false);
  });
});

describe('Module 5: General', () => {
  it('TC-44 Health check responds', async () => {
    const res = await call('GET', '/api/health');
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('TC-45 Unknown addresses return a clear "not found" message', async () => {
    const res = await call('GET', '/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.match(res.body.message, /Route not found/);
  });
});
