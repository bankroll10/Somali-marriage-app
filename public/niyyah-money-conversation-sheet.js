/*
 * What niyyah-money-conversation-sheet.html does while someone fills it in.
 *
 *  - Keeps the answers in this browser, on this device, under one key
 *    (niyyah.moneysheet.v1), so the page can be closed and come back. Nothing
 *    is sent anywhere. "Clear my answers" removes the key, and so does the
 *    app's Forget me (src/lib/forget.ts names it).
 *  - Says so when it puts answers back, and warns before leaving if the browser
 *    refused to keep them.
 *  - Puts the two names on the columns in place of Person A and Person B.
 *  - Grows each answer box to fit what is written in it.
 *
 * Without this file the page still works as a form that keeps nothing, and its
 * own note says that (tests/sheet-page.test.ts).
 */
;(function () {
  'use strict'

  var KEY = 'niyyah.moneysheet.v1'
  var SAVE_DELAY = 400

  var root = document.documentElement
  var fields = Array.prototype.slice.call(document.querySelectorAll('main input[id], main textarea[id]'))
  var areas = fields.filter(function (f) {
    return f.tagName === 'TEXTAREA'
  })
  var box = document.getElementById('privacy')
  var restored = box ? box.querySelector('.restored') : null
  var problem = box ? box.querySelector('.save-problem') : null
  var clearButton = document.querySelector('[data-clear-answers]')
  var dateField = document.getElementById('sheet-date')

  // ------------------------------------------------------------------ storage

  function storage() {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  function readSaved() {
    var s = storage()
    if (!s) return null
    try {
      var raw = s.getItem(KEY)
      if (!raw) return null
      var data = JSON.parse(raw)
      return data && data.v === 1 && data.fields && typeof data.fields === 'object' ? data.fields : null
    } catch {
      return null
    }
  }

  function current() {
    var out = {}
    fields.forEach(function (f) {
      if (f.value !== '') out[f.id] = f.value
    })
    return out
  }

  function hasAnswers() {
    return fields.some(function (f) {
      return f.value.trim() !== ''
    })
  }

  // True while what is on screen is not what is kept: a save still waiting, or a browser that refused it.
  var unsaved = false
  var timer = null

  function save() {
    timer = null
    var s = storage()
    var values = current()
    try {
      if (!s) throw new Error('no storage')
      if (Object.keys(values).length === 0) s.removeItem(KEY)
      else s.setItem(KEY, JSON.stringify({ v: 1, fields: values }))
      unsaved = false
      if (problem) problem.hidden = true
    } catch {
      unsaved = hasAnswers()
      if (problem) problem.hidden = !unsaved
    }
  }

  function saveSoon() {
    unsaved = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(save, SAVE_DELAY)
  }

  function saveNow() {
    if (timer) {
      clearTimeout(timer)
      save()
    }
  }

  // -------------------------------------------------------- names on the columns

  function nameOf(id, fallback) {
    var el = document.getElementById(id)
    var v = el ? el.value.replace(/\s+/g, ' ').trim() : ''
    return v || fallback
  }

  function relabel() {
    var a = nameOf('name-a', 'Person A')
    var b = nameOf('name-b', 'Person B')
    Array.prototype.forEach.call(document.querySelectorAll('.cols label'), function (label) {
      var forId = label.getAttribute('for') || ''
      if (/-a$/.test(forId)) label.textContent = a
      else if (/-b$/.test(forId)) label.textContent = b
    })
  }

  // --------------------------------------------------------------- growing boxes

  function grow(area) {
    area.style.height = ''
    if (!area.value) return
    var frame = area.offsetHeight - area.clientHeight
    area.style.height = area.scrollHeight + frame + 'px'
  }

  function growAll() {
    areas.forEach(grow)
  }

  function markDate() {
    if (dateField) dateField.classList.toggle('is-empty', !dateField.value)
  }

  // ------------------------------------------------------------------ the page

  function say(message) {
    if (restored) restored.textContent = message
  }

  function clearAll() {
    if (hasAnswers() && !window.confirm('Clear every answer on this page and remove them from this device?')) return
    if (timer) clearTimeout(timer)
    timer = null
    fields.forEach(function (f) {
      f.value = ''
    })
    var s = storage()
    try {
      if (s) s.removeItem(KEY)
      unsaved = false
    } catch {
      unsaved = false
    }
    if (problem) problem.hidden = true
    relabel()
    growAll()
    markDate()
    say('Your answers were cleared from this device.')
  }

  function start() {
    root.classList.add('js-grow')
    Array.prototype.forEach.call(document.querySelectorAll('[data-without-script]'), function (el) {
      el.hidden = true
    })
    if (box) box.hidden = false

    var saved = readSaved()
    if (saved) {
      var any = false
      fields.forEach(function (f) {
        if (typeof saved[f.id] === 'string') {
          f.value = saved[f.id]
          if (saved[f.id].trim()) any = true
        }
      })
      if (any) say('We restored your answers on this device.')
    }

    relabel()
    growAll()
    markDate()

    fields.forEach(function (f) {
      f.addEventListener('input', function () {
        if (f.tagName === 'TEXTAREA') grow(f)
        if (f.id === 'name-a' || f.id === 'name-b') relabel()
        if (f === dateField) markDate()
        saveSoon()
      })
      f.addEventListener('change', function () {
        if (f === dateField) markDate()
        saveSoon()
      })
    })

    if (clearButton) clearButton.addEventListener('click', clearAll)

    // A save still waiting goes now; leaving with answers the browser would not keep asks first.
    window.addEventListener('pagehide', saveNow)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') saveNow()
    })
    window.addEventListener('beforeunload', function (e) {
      saveNow()
      if (unsaved && hasAnswers()) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    })

    var resizeTimer = null
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(growAll, 150)
    })
  }

  start()
})()
