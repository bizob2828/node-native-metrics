/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')

tap.test('Resource Usage Meter', function (t) {
  const CPU_EPSILON = 50 // Allowed fudge factor for CPU times in MS
  const SPIN_TIME = 2000
  const metricEmitter = require('../../')({ timeout: 200 })

  // set a timeout to keep the process from closing before the tests
  // complete
  setTimeout(function () {}, SPIN_TIME)

  t.teardown(function () {
    metricEmitter.unbind()
  })

  let firstUsage = null
  metricEmitter.on('usage', function (data) {
    t.comment('usage emitted')
    if (!t.type(data, Object, 'should have usage data object')) {
      return t.end()
    }
    t.type(data.diff, Object, 'should have usage diff data object')
    t.type(data.current, Object, 'should have usage current data object')
    if (!t.passing()) {
      return t.end()
    }

    if (!firstUsage) {
      firstUsage = data
      process.nextTick(spin)
    } else {
      checkValues(firstUsage, data)
    }
  })

  function spin() {
    const start = Date.now()
    while (Date.now() - start < SPIN_TIME) {} // Spin the CPU for 2 seconds.
    t.comment('cpu spin completed')
  }

  function checkValues(startUsage, usage) {
    const keys = [
      'ru_utime',
      'ru_stime',
      'ru_maxrss',
      'ru_ixrss',
      'ru_idrss',
      'ru_isrss',
      'ru_minflt',
      'ru_majflt',
      'ru_nswap',
      'ru_inblock',
      'ru_oublock',
      'ru_msgsnd',
      'ru_msgrcv',
      'ru_nsignals',
      'ru_nvcsw',
      'ru_nivcsw'
    ]
    keys.forEach(function (key) {
      t.comment(key)
      t.type(usage.diff[key], 'number', 'usage.diff should have key')
      t.type(usage.current[key], 'number', 'usage.current should have key')

      t.equal(
        cleanFloat(usage.diff[key]),
        cleanFloat(usage.current[key] - startUsage.current[key]),
        'usage.diff should be difference between last reading and this reading'
      )
    })

    t.comment('cpu usage')
    const time = usage.diff.ru_utime + usage.diff.ru_stime
    t.ok(time > SPIN_TIME - CPU_EPSILON, 'should have expected CPU usage time (is ' + time + ')')
    t.end()
  }
})

function cleanFloat(num) {
  return Math.round(num * 1000) / 1000
}
