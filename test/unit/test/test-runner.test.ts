import { beforeAll, beforeEach, describe, expect, test, TestRunner } from 'vitest'

describe('TestRunner.getTestFn returns the body of a test', () => {
  const calls: string[] = []

  beforeEach(({ task }) => {
    const body = TestRunner.getTestFn(task)
    TestRunner.setTestFn(task, async () => {
      calls.push('before body')
      await body()
    })
  })

  test('which can still be called from a replacement', () => {
    calls.push('body')
  })

  test('so the replacement can run code before it', () => {
    expect(calls).toEqual(['before body', 'body', 'before body'])
  })
})

describe('TestRunner.setTestFn replaces the body of a test', () => {
  beforeEach(({ task }) => {
    TestRunner.setTestFn(task, () => {})
  })

  test('so the original body never runs', () => {
    throw new Error('the original body should not run')
  })
})

describe('TestRunner.getSuiteHooks returns the hooks registered on a suite', () => {
  beforeAll(() => {})
  beforeEach(() => {})
  beforeEach(() => {})

  test('grouped by hook name', ({ task }) => {
    const hooks = TestRunner.getSuiteHooks(task.suite!)
    expect(Object.fromEntries(Object.entries(hooks).map(([name, list]) => [name, list.length])))
      .toMatchInlineSnapshot(`
      {
        "afterAll": 0,
        "afterEach": 0,
        "aroundAll": 0,
        "aroundEach": 0,
        "beforeAll": 1,
        "beforeEach": 2,
      }
    `)
  })
})

describe('TestRunner.setSuiteHooks replaces the hooks of a suite', () => {
  const calls: string[] = []

  beforeAll(({}, suite) => {
    const hooks = TestRunner.getSuiteHooks(suite)
    TestRunner.setSuiteHooks(suite, {
      ...hooks,
      beforeEach: [
        ...hooks.beforeEach,
        () => {
          calls.push('added beforeEach')
        },
      ],
    })
  })

  test('so a hook added at runtime runs before the next test', () => {
    expect(calls).toEqual(['added beforeEach'])
  })
})
