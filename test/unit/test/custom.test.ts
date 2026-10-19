import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  TestRunner,
} from 'vitest'
import { Gardener } from '../src/custom/gardener.js'

declare module 'vitest' {
  interface TaskMeta {
    customPropertyToDifferentiateTask?: boolean
  }
}

// this function will be called, when Vitest collects tasks
const myCustomTask = TestRunner.createChainable(['todo'], function (name: string, fn: () => void) {
  TestRunner.getCurrentSuite().task(name, {
    ...this,
    meta: {
      customPropertyToDifferentiateTask: true,
    },
    handler: fn,
  })
})

const gardener = new Gardener()

describe('take care of the garden', () => {
  beforeAll(() => {
    gardener.putWorkingClothes()
  })

  beforeEach(() => {
    gardener.standup()
  })

  afterEach(() => {
    gardener.rest()
  })

  myCustomTask('weed the grass', () => {
    gardener.weedTheGrass()
  })
  myCustomTask.todo('mow the lawn', () => {
    gardener.mowerTheLawn()
  })
  myCustomTask('water flowers', () => {
    gardener.waterFlowers()
  })

  afterAll(() => {
    gardener.goHome()
  })
})

describe('TestRunner', () => {
  test('setTestFn replaces the function getTestFn returns', ({ task }) => {
    const original = TestRunner.getTestFn(task)
    const fn = () => {}
    TestRunner.setTestFn(task, fn)
    expect(TestRunner.getTestFn(task)).toBe(fn)
    TestRunner.setTestFn(task, original)
  })

  test('setSuiteHooks replaces the hooks getSuiteHooks returns', ({ task }) => {
    const suite = task.suite!
    const original = TestRunner.getSuiteHooks(suite)
    const hooks = { ...original, beforeEach: [] }
    TestRunner.setSuiteHooks(suite, hooks)
    expect(TestRunner.getSuiteHooks(suite)).toBe(hooks)
    TestRunner.setSuiteHooks(suite, original)
  })
})

test('states are filled correctly', () => {
  expect(gardener.states).toEqual([
    'wake up',
    'working clothes',
    'standup',
    'weed the grass',
    'rest',
    'standup',
    'water flowers',
    'rest',
    'home',
  ])
})
