import { expect, test } from 'vitest'
import { runInlineTests } from '../../test-utils'

function extractLogs(stdout: string): string {
  return stdout
    .split('\n')
    .filter((l) => l.includes('>>'))
    .map((l) => l.trim())
    .join('\n')
}

test('justBeforeEach runs after every beforeEach, parent first', async () => {
  const { stdout, stderr, errorTree } = await runInlineTests({
    'order.test.ts': `
      import { beforeEach, describe, justBeforeEach, test } from 'vitest'

      beforeEach(() => { console.log('>> outer beforeEach') })
      justBeforeEach(() => { console.log('>> outer justBeforeEach') })

      describe('nested', () => {
        beforeEach(() => { console.log('>> inner beforeEach') })
        justBeforeEach(() => { console.log('>> inner justBeforeEach') })

        test('test', () => { console.log('>> test') })
      })
    `,
  })

  expect(stderr).toBe('')
  expect(errorTree()).toMatchInlineSnapshot(`
    {
      "order.test.ts": {
        "nested": {
          "test": "passed",
        },
      },
    }
  `)
  expect(extractLogs(stdout)).toMatchInlineSnapshot(`
    ">> outer beforeEach
    >> inner beforeEach
    >> outer justBeforeEach
    >> inner justBeforeEach
    >> test"
  `)
})

test('justBeforeEach sees the inputs nested suites set', async () => {
  const { stderr, errorTree } = await runInlineTests({
    'inputs.test.ts': `
      import { beforeEach, describe, expect, justBeforeEach, test } from 'vitest'

      let denominator
      let result

      beforeEach(() => { denominator = 2 })
      justBeforeEach(() => { result = 10 / denominator })

      test('uses the default', () => {
        expect(result).toBe(5)
      })

      describe('when the denominator is 1', () => {
        beforeEach(() => { denominator = 1 })

        test('uses the override', () => {
          expect(result).toBe(10)
        })
      })
    `,
  })

  expect(stderr).toBe('')
  expect(errorTree()).toMatchInlineSnapshot(`
    {
      "inputs.test.ts": {
        "uses the default": "passed",
        "when the denominator is 1": {
          "uses the override": "passed",
        },
      },
    }
  `)
})

test('justBeforeEach runs inside aroundEach, and its cleanup runs after the test', async () => {
  const { stdout, stderr } = await runInlineTests({
    'around.test.ts': `
      import { afterEach, aroundEach, beforeEach, justBeforeEach, test } from 'vitest'

      aroundEach(async (runTest) => {
        console.log('>> aroundEach before')
        await runTest()
        console.log('>> aroundEach after')
      })
      beforeEach(() => { console.log('>> beforeEach') })
      justBeforeEach(() => {
        console.log('>> justBeforeEach')
        return () => { console.log('>> justBeforeEach cleanup') }
      })
      afterEach(() => { console.log('>> afterEach') })

      test('test', () => { console.log('>> test') })
    `,
  })

  expect(stderr).toBe('')
  expect(extractLogs(stdout)).toMatchInlineSnapshot(`
    ">> aroundEach before
    >> beforeEach
    >> justBeforeEach
    >> test
    >> afterEach
    >> justBeforeEach cleanup
    >> aroundEach after"
  `)
})

test('justBeforeEach gets the test context and fixtures', async () => {
  const { stdout, stderr, errorTree } = await runInlineTests({
    'context.test.ts': `
      import { test as base } from 'vitest'

      const test = base.extend({ greeting: 'hello' })

      test.justBeforeEach(({ task, greeting }) => {
        console.log('>> ' + greeting + ' from ' + task.name)
      })

      test('my test', () => {})
    `,
  })

  expect(stderr).toBe('')
  expect(errorTree()).toMatchInlineSnapshot(`
    {
      "context.test.ts": {
        "my test": "passed",
      },
    }
  `)
  expect(extractLogs(stdout)).toMatchInlineSnapshot(`">> hello from my test"`)
})

test('justBeforeEach runs again when a test is retried', async () => {
  const { stdout, stderr, errorTree } = await runInlineTests({
    'retry.test.ts': `
      import { expect, justBeforeEach, test } from 'vitest'

      let attempts = 0

      justBeforeEach(() => {
        attempts++
        console.log('>> justBeforeEach ' + attempts)
      })

      test('passes on the second try', { retry: 1 }, () => {
        expect(attempts).toBe(2)
      })
    `,
  })

  expect(stderr).toBe('')
  expect(errorTree()).toMatchInlineSnapshot(`
    {
      "retry.test.ts": {
        "passes on the second try": "passed",
      },
    }
  `)
  expect(extractLogs(stdout)).toMatchInlineSnapshot(`
    ">> justBeforeEach 1
    >> justBeforeEach 2"
  `)
})

test('justBeforeEach gets each concurrent test its own context', async () => {
  const { stderr, errorTree } = await runInlineTests({
    'concurrent.test.ts': `
      import { describe, expect, justBeforeEach, test } from 'vitest'

      const seen = new Map()

      describe.concurrent('concurrent', () => {
        justBeforeEach(async ({ task }) => {
          await new Promise((resolve) => setTimeout(resolve, task.name === 'slow' ? 50 : 0))
          seen.set(task.name, task.id)
        })

        test('slow', ({ task }) => { expect(seen.get('slow')).toBe(task.id) })
        test('fast', ({ task }) => { expect(seen.get('fast')).toBe(task.id) })
      })
    `,
  })

  expect(stderr).toBe('')
  expect(errorTree()).toMatchInlineSnapshot(`
    {
      "concurrent.test.ts": {
        "concurrent": {
          "fast": "passed",
          "slow": "passed",
        },
      },
    }
  `)
})

test('a throwing justBeforeEach fails the test without running it', async () => {
  const { stdout, errorTree } = await runInlineTests({
    'throws.test.ts': `
      import { justBeforeEach, test } from 'vitest'

      justBeforeEach(() => { throw new Error('step failed') })

      test('test', () => { console.log('>> test') })
    `,
  })

  expect(errorTree()).toMatchInlineSnapshot(`
    {
      "throws.test.ts": {
        "test": [
          "step failed",
        ],
      },
    }
  `)
  expect(extractLogs(stdout)).toBe('')
})
