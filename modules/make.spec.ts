import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { make } from '../modules/make';

/*
  in tstd we try to get rid of some useless keywords that involve a lot of language magic
  one of them is the whole this/new/class/extends/super family

  plus, constructors often throw, which is another thing we don't like
*/

test('init safely', () => {
  // i have a module that needs to be instantiated as a class
  // but constructors can explode so i use the make utility instead of new
  assert.equal(make(URL, '').branch, 'error');

  // if everything's fine, i can work with the instance
  const href = 'https://example.com/';
  const url = make(URL, href);
  assert.equal(url.branch, 'success');
  assert.equal(url.value.href, href);
});
