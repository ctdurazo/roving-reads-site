const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const script = readFileSync(join(__dirname, '../feedback.js'), 'utf8');
function setup(fetch, config = { endpoint: 'https://api.example/feedback' }) {
  const ids = ['feedback-form','submit','status','support','support-link','contact','email-section','email','diagnostics','details','category','description','platform','version','website'];
  const elements = Object.fromEntries(ids.map(id => [id, { value: '', checked: false, hidden: false,
    handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, reportValidity() { return true; }, reset() { this.resetCalled = true; } }]));
  elements.category.value = 'bug'; elements.description.value = 'Cannot join my club.';
  vm.runInNewContext(script, { window: { ROVING_FEEDBACK: config }, document: { getElementById: id => elements[id] }, URL, fetch, AbortController, setTimeout, clearTimeout });
  return { el: elements, submit: () => elements['feedback-form'].handlers.submit({ preventDefault() {} }) };
}
const receipt = () => Promise.resolve({ status: 201, json: async () => ({ ok: true, reference: 'a'.repeat(32) }) });
test('receipt follows confirmed storage; sends no identity, contact or diagnostics by default', async () => {
  let request;
  const s = setup(async (url, options) => { request = { url, options }; return receipt(); });
  await s.submit();
  assert.equal(request.url, 'https://api.example/feedback');
  assert.deepEqual(JSON.parse(request.options.body), { category: 'bug', description: 'Cannot join my club.', contactPermission: false, website: '' });
  assert.equal(request.options.credentials, 'omit');
  assert.match(s.el.status.textContent, /Your feedback was received/);
  assert.equal(s.el['feedback-form'].hidden, true);
  assert.equal(s.el['feedback-form'].resetCalled, true);
});
test('contact and diagnostic values require explicit opt-in', async () => {
  let body;
  const s = setup(async (_, options) => { body = JSON.parse(options.body); return receipt(); });
  s.el.contact.checked = true; s.el.email.value = 'reply@example.test';
  s.el.diagnostics.checked = true; s.el.platform.value = 'ios'; s.el.version.value = '1.0';
  await s.submit();
  assert.equal(body.email, 'reply@example.test');
  assert.deepEqual(body.diagnostics, { platform: 'ios', appVersion: '1.0' });
});
test('turning contact off clears email and prevents submission of it', async () => {
  let body;
  const s = setup(async (_, options) => { body = JSON.parse(options.body); return receipt(); });
  s.el.email.value = 'discard@example.test';
  s.el.contact.handlers.change();
  assert.equal(s.el.email.value, '');
  await s.submit();
  assert.equal(body.email, undefined);
});
test('network failure preserves input, does not claim receipt, and permits retry', async () => {
  let calls = 0;
  const s = setup(async () => { if (++calls === 1) throw new Error('offline'); return receipt(); });
  await s.submit();
  assert.match(s.el.status.textContent, /could not confirm delivery/);
  assert.equal(s.el.description.value, 'Cannot join my club.');
  assert.equal(s.el['submit'].disabled, false);
  await s.submit(); assert.match(s.el.status.textContent, /was received/);
});
test('double submit is single-flight, completed receipt cannot submit again', async () => {
  let finish, calls = 0;
  const s = setup(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const pending = s.submit(); await s.submit(); assert.equal(calls, 1);
  finish(await receipt()); await pending; await s.submit(); assert.equal(calls, 1);
});
test('over-limit and unconfigured routes never claim success', async () => {
  const s = setup(async () => ({ status: 429, json: async () => ({}) }));
  await s.submit(); assert.match(s.el.status.textContent, /has not been submitted/);
  const bad = setup(() => { throw new Error('must not call'); }, { endpoint: 'http://unsafe.test' });
  assert.equal(bad.el.submit.disabled, true); await bad.submit();
});
