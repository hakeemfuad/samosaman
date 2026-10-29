const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const sourcePath = process.env.EMAIL_FUNCTIONS_SOURCE || path.resolve(__dirname, '../functions/index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function loadFunctions(secretValue) {
  const calls = { secretReads: 0, transports: [], messages: [] };
  const register = (options, handler) => ({ options, handler });
  const sandbox = {
    exports: {},
    console: { log() {}, error() {} },
    require(name) {
      if (name === './catering-order') return require('../functions/catering-order');
      if (name === 'firebase-functions/v2/https') return { onRequest: register };
      if (name === 'firebase-functions/v2/firestore') return { onDocumentCreated: register };
      if (name === 'firebase-functions/params') {
        return { defineSecret: (name) => ({ name, value() { calls.secretReads++; return secretValue; } }) };
      }
      if (name === 'firebase-functions/logger') return { info() {}, error() {}, warn() {} };
      if (name === 'crypto') return require('node:crypto');
      if (name === 'cors') return () => (_req, _res, next) => next();
      if (name === 'nodemailer') {
        return {
          createTransport(options) {
            calls.transports.push(options);
            return { async sendMail(message) { calls.messages.push(message); } };
          }
        };
      }
      throw new Error(`Unexpected dependency: ${name}`);
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: sourcePath });
  return { sandbox, calls };
}

test('all production email functions declare the runtime secret', () => {
  const functions = require(sourcePath);
  for (const name of ['sendWelcomeEmail', 'processPayment', 'submitCateringInquiry']) {
    const bindings = functions[name].__endpoint.secretEnvironmentVariables;
    assert.ok(bindings.some(({ key }) => key === 'SMTP_PASSWORD'), `${name} must bind SMTP_PASSWORD`);
  }
  assert.equal(functions.sendWelcomeEmail.__endpoint.eventTrigger.eventFilterPathPatterns.document, 'users/{userId}');
});

test('email transport reads the secret only at runtime and reuses the connection configuration', () => {
  const { sandbox, calls } = loadFunctions('test-runtime-credential');
  assert.equal(calls.secretReads, 0);
  const first = sandbox.getTransporter();
  assert.equal(sandbox.getTransporter(), first);
  assert.equal(calls.secretReads, 1);
  assert.equal(calls.transports.length, 1);
  assert.equal(calls.transports[0].auth.user, 'no_reply@samosamanvt.com');
  assert.equal(calls.transports[0].auth.pass, 'test-runtime-credential');
});

test('a missing secret blocks email transport without a fallback password', () => {
  const { sandbox, calls } = loadFunctions('');
  assert.throws(() => sandbox.getTransporter(), /SMTP_PASSWORD is not configured/);
  assert.equal(calls.transports.length, 0);
});

test('welcome email uses the runtime secret without sending a real message', async () => {
  const { sandbox, calls } = loadFunctions('test-runtime-credential');
  await sandbox.exports.sendWelcomeEmail.handler({
    data: { data: () => ({ email: 'test@example.invalid', firstName: 'Test' }) }
  });
  assert.equal(calls.messages.length, 1);
  assert.equal(calls.messages[0].to, 'test@example.invalid');
  assert.equal(calls.transports[0].auth.pass, 'test-runtime-credential');
});
