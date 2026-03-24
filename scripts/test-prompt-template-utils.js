/* eslint-disable no-console */
const assert = require('node:assert/strict');

async function runTests() {
  const {
    formatTemplateValue,
    replaceTemplateVariables,
    customizeTemplateValue,
  } = await import('../lib/ai/promptTemplateUtils.js');

  // formatTemplateValue edge cases
  assert.equal(formatTemplateValue(0), '0');
  assert.equal(formatTemplateValue(false), 'false');
  assert.equal(formatTemplateValue(''), '');
  assert.equal(formatTemplateValue(['a', 2, false]), 'a, 2, false');
  assert.equal(formatTemplateValue({ a: 1 }), '{"a":1}');

  // replaceTemplateVariables edge cases
  assert.equal(
    replaceTemplateVariables('v1={a}, v2={b}, v3={c}', { a: 0, b: false, c: '' }),
    'v1=0, v2=false, v3='
  );
  assert.equal(
    replaceTemplateVariables('missing={missing}', {}),
    'missing={missing}'
  );
  assert.equal(
    replaceTemplateVariables('list={items}', { items: ['house', 'techno'] }),
    'list=house, techno'
  );

  // customizeTemplateValue nested structure support
  const nestedTemplate = {
    system: 'flag={flag}',
    user: {
      title: 'count={count}',
      tags: ['first={first}', 'missing={missing}'],
    },
  };
  const customized = customizeTemplateValue(
    nestedTemplate,
    { flag: false, count: 0, first: 'ok' },
    replaceTemplateVariables
  );
  assert.deepEqual(customized, {
    system: 'flag=false',
    user: {
      title: 'count=0',
      tags: ['first=ok', 'missing={missing}'],
    },
  });

  console.log('All promptTemplateUtils tests passed.');
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
