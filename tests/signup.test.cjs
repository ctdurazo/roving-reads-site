const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const script = readFileSync(join(__dirname, '../signup.js'), 'utf8');
function setup(fetch, endpoint = 'https://api.example/beta-signups') {
  const ids = ['beta-signup-form', 'beta-submit', 'beta-status', 'beta-email'];
  const elements = Object.fromEntries(ids.map(id => [id, { value: ' reader@example.test ', hidden: false,
    handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, reportValidity() { return true; }, reset() { elements['beta-email'].value = ''; } }]));
  vm.runInNewContext(script, { window: { ROVING_SIGNUP: { endpoint } }, document: { getElementById: id => elements[id] }, URL, fetch, AbortController, setTimeout, clearTimeout });
  return { el: elements, submit: () => elements['beta-signup-form'].handlers.submit({ preventDefault() {} }) };
}
const success = () => Promise.resolve({ status: 200, json: async () => ({ ok: true }) });
test('existing signup markup has exactly one form field and a real submit button', () => {
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
  const form = html.match(/<form id="beta-signup-form">([\s\S]*?)<\/form>/)[1];
  assert.equal((form.match(/<input\b/g) || []).length, 1);
  assert.match(form, /name="email"/); assert.match(form, /type="submit"/);
  assert.match(html, /beta invitation/);
});
test('sends only email without credentials and acknowledges confirmed receipt', async () => {
  let request;
  const s = setup(async (url, options) => { request = { url, options }; return success(); });
  await s.submit();
  assert.deepEqual(JSON.parse(request.options.body), { email: 'reader@example.test' });
  assert.equal(request.options.credentials, 'omit');
  assert.equal(s.el['beta-signup-form'].hidden, true);
  assert.match(s.el['beta-status'].textContent, /request was received/);
  assert.equal(s.el['beta-email'].value, '');
});
test('duplicate taps and successful resubmission do not send again', async () => {
  let calls = 0, finish;
  const s = setup(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const pending = s.submit(); await s.submit(); assert.equal(calls, 1);
  finish(await success()); await pending; await s.submit(); assert.equal(calls, 1);
});
test('failure retains email and allows safe retry without false success', async () => {
  let calls = 0;
  const s = setup(async () => { if (++calls === 1) throw new Error('offline'); return success(); });
  await s.submit();
  assert.match(s.el['beta-status'].textContent, /could not confirm/);
  assert.equal(s.el['beta-email'].value, ' reader@example.test ');
  assert.equal(s.el['beta-submit'].disabled, false);
  await s.submit(); assert.match(s.el['beta-status'].textContent, /request was received/);
});
test('validation, limit and disabled responses provide recovery', async () => {
  for (const [code, message] of [[400, /valid email/], [429, /busy/], [503, /could not confirm/]]) {
    const s = setup(async () => ({ status: code, json: async () => ({}) }));
    await s.submit(); assert.match(s.el['beta-status'].textContent, message);
    assert.equal(s.el['beta-submit'].disabled, false);
  }
});
test('unconfigured endpoint and invalid native form cannot submit', async () => {
  const fail = () => { throw new Error('must not send'); };
  const bad = setup(fail, 'javascript:alert(1)');
  assert.equal(bad.el['beta-submit'].disabled, true); await bad.submit();
  const invalid = setup(fail);
  invalid.el['beta-signup-form'].reportValidity = () => false;
  await invalid.submit();
});
