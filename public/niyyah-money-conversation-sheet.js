/*
 * What niyyah-money-conversation-sheet.html does while one person fills it in.
 *
 * Two people each fill the sheet on their own device, as Person 1 and Person 2.
 * Neither sees the other's answers on the page. Each taps Finish and sends the
 * other a link (the answers ride in the part after #, which a browser never
 * sends to a server) or a small file. Opening the partner's link or file here
 * makes one combined PDF (niyyah-money-conversation-sheet-pdf.js).
 *
 *  - Your own answers are kept in this browser, on this device, under one key
 *    (niyyah.moneysheet.v1), for 14 days after the last change. "Clear my
 *    answers" removes them, and so does the app's Forget me (src/lib/forget.ts).
 *  - Your partner's answers are kept only while the page is open: never stored,
 *    never shown on the page, used only to make the PDF.
 *  - A yes/no question that hides its section's follow-up questions does so
 *    here, and the hidden answers are left out of what you send.
 *  - Nothing is sent anywhere by this page.
 *
 * Without this file the page still works as a form that keeps nothing, and its
 * own note says that (tests/sheet-page.test.ts).
 */
;(function () {
  'use strict'

  var KEY = 'niyyah.moneysheet.v1'
  var FORMAT = 'niyyah-money-conversation'
  var SAVE_DELAY = 400
  // Kept for 14 full days after the last change, and gone on the day after. Only the day is stored, never a time.
  var KEEP_DAYS = 14
  var DAY_MS = 24 * 60 * 60 * 1000
  // A link longer than this makes a QR code too dense to scan from a phone screen.
  var QR_MAX = 1100
  // What a partner's link or file may hold, at most: enough for long answers, not enough to hurt the page.
  var MAX_CODE = 200000
  var MAX_VALUE = 6000
  // How long Copy the link says Copied before it goes back to its own words.
  var COPIED_FOR = 2500

  var root = document.documentElement
  var main = document.querySelector('main')
  var box = document.getElementById('privacy')
  var restored = box ? box.querySelector('.restored') : null
  var problem = box ? box.querySelector('.save-problem') : null
  var clearButton = document.querySelector('[data-clear-answers]')
  var dateField = document.getElementById('sheet-date')
  var finishBlock = document.getElementById('finish')
  var partnerBlock = document.getElementById('partner')
  var arrived = document.querySelector('.arrived')

  /** Every field that is part of someone's answers. Each has a data-key; radios share theirs. */
  var inputs = Array.prototype.slice.call(main.querySelectorAll('input[data-key], textarea[data-key]'))
  var areas = inputs.filter(function (f) {
    return f.tagName === 'TEXTAREA'
  })
  var keys = []
  inputs.forEach(function (f) {
    var k = f.getAttribute('data-key')
    if (keys.indexOf(k) === -1) keys.push(k)
  })
  // Who this is, and when the session is, travel separately from the answers.
  var ABOUT = ['role', 'name', 'date']

  // ----------------------------------------------------------------- values

  function fieldsFor(key) {
    return inputs.filter(function (f) {
      return f.getAttribute('data-key') === key
    })
  }

  function valueOf(key) {
    var fs = fieldsFor(key)
    if (!fs.length) return ''
    if (fs[0].type === 'radio') {
      var on = fs.filter(function (f) {
        return f.checked
      })[0]
      return on ? on.value : ''
    }
    return fs[0].value
  }

  function setValue(key, value) {
    fieldsFor(key).forEach(function (f) {
      if (f.type === 'radio') f.checked = f.value === value
      else f.value = value
    })
  }

  function current() {
    var out = {}
    keys.forEach(function (k) {
      var v = valueOf(k)
      if (v !== '') out[k] = v
    })
    return out
  }

  function hasAnswers() {
    return keys.some(function (k) {
      return k !== 'role' && valueOf(k).trim() !== ''
    })
  }

  // ------------------------------------------------------------------ gates

  /** The yes/no questions that hide their section's follow-ups when the answer is No. */
  var gates = Array.prototype.slice.call(main.querySelectorAll('.gate[data-hides="true"]')).map(function (g) {
    var section = g.closest('section')
    return { key: g.getAttribute('data-key'), follow: section ? section.querySelector('.follow') : null }
  })

  function hiddenKeys() {
    var out = []
    gates.forEach(function (g) {
      if (valueOf(g.key) !== 'no' || !g.follow) return
      Array.prototype.forEach.call(g.follow.querySelectorAll('[data-key]'), function (el) {
        var k = el.getAttribute('data-key')
        if (out.indexOf(k) === -1) out.push(k)
      })
    })
    return out
  }

  function applyGates() {
    gates.forEach(function (g) {
      if (g.follow) g.follow.hidden = valueOf(g.key) === 'no'
    })
    growAll()
  }

  // ---------------------------------------------------------------- storage

  function storage() {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  function today() {
    return new Date(Date.now()).toISOString().slice(0, 10)
  }

  function expired(day) {
    var at = Date.parse(day)
    return !isFinite(at) || Date.now() >= at + (KEEP_DAYS + 1) * DAY_MS
  }

  // When Finish was last tapped, as a day, or '' if not yet. Changing an answer after it makes the sent link out of date.
  var finished = ''
  var changedSinceFinish = false
  // Answers the two-column sheet of 2026-10-26 kept, both people on one page, until someone says which of them this is.
  var legacy = null

  /** What is kept: { fields, finished } or 'expired' (and then removed), or null. */
  function readSaved() {
    var s = storage()
    if (!s) return null
    try {
      var raw = s.getItem(KEY)
      if (!raw) return null
      var data = JSON.parse(raw)
      if (!(data && data.fields && typeof data.fields === 'object' && (data.v === 1 || data.v === 2))) return null
      if (typeof data.at !== 'string') {
        // Kept before answers expired (until 2026-10-27): the 14 days start now, so it cannot stay forever.
        data.at = today()
        s.setItem(KEY, JSON.stringify(data))
      } else if (expired(data.at)) {
        s.removeItem(KEY)
        return 'expired'
      }
      if (data.v === 1) {
        legacy = data.fields
        return null
      }
      return { fields: data.fields, finished: typeof data.finished === 'string' ? data.finished : '' }
    } catch {
      return null
    }
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
      if (Object.keys(values).length === 0 && !legacy) s.removeItem(KEY)
      else if (Object.keys(values).length > 0) s.setItem(KEY, JSON.stringify({ v: 2, at: today(), finished: finished, fields: values }))
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

  // ---------------------------------------------------------- the old sheet

  /** The two-column sheet kept both people's answers: bring over the column of whoever this is. */
  function bringOverLegacy(role) {
    if (!legacy) return
    var col = role === '2' ? '-b' : '-a'
    var any = false
    Object.keys(legacy).forEach(function (k) {
      var m = /^(q\d[a-e])(-a|-b)$/.exec(k)
      if (m && m[2] === col && typeof legacy[k] === 'string' && valueOf(m[1]) === '') {
        setValue(m[1], legacy[k])
        if (legacy[k].trim()) any = true
      }
    })
    var name = legacy[role === '2' ? 'name-b' : 'name-a']
    if (typeof name === 'string' && name && !valueOf('name')) setValue('name', name)
    if (typeof legacy['sheet-date'] === 'string' && !valueOf('date')) setValue('date', legacy['sheet-date'])
    legacy = null
    if (any) say('We brought over the answers this device had saved for Person ' + (role === '2' ? 'B' : 'A') + ' on the earlier version of this sheet.')
    save()
  }

  // --------------------------------------------------------------- the page

  function grow(area) {
    area.style.height = ''
    if (!area.value || !area.offsetParent) return
    var frame = area.offsetHeight - area.clientHeight
    area.style.height = area.scrollHeight + frame + 'px'
  }

  function growAll() {
    areas.forEach(grow)
  }

  function markDate() {
    if (dateField) dateField.classList.toggle('is-empty', !dateField.value)
  }

  function say(message) {
    if (restored) restored.textContent = message
  }

  function setText(el, message) {
    if (el) el.textContent = message
  }

  /** The questions, Finish and the partner's block wait until someone says who they are. */
  function showForRole() {
    var chosen = valueOf('role') !== ''
    Array.prototype.forEach.call(main.querySelectorAll('section'), function (sec) {
      sec.hidden = !chosen
    })
    var jump = document.querySelector('.jump')
    if (jump) jump.hidden = !chosen
    if (finishBlock) finishBlock.hidden = !chosen
    if (partnerBlock) partnerBlock.hidden = !chosen && !partner
    growAll()
  }

  // ------------------------------------------------------- sending answers

  function bytesToBase64url(bytes) {
    var bin = ''
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.prototype.slice.call(bytes, i, i + 0x8000))
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  function base64urlToBytes(text) {
    var b = text.replace(/-/g, '+').replace(/_/g, '/')
    while (b.length % 4) b += '='
    var bin = atob(b)
    var out = new Uint8Array(bin.length)
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }

  function streamThrough(bytes, stream) {
    var piped = new Blob([bytes]).stream().pipeThrough(stream)
    return new Response(piped).arrayBuffer().then(function (buf) {
      return new Uint8Array(buf)
    })
  }

  /** What is sent: who, when, and the answers that apply (a follow-up hidden by a No is left out). */
  function exportObject() {
    var hidden = hiddenKeys()
    var answers = {}
    keys.forEach(function (k) {
      if (ABOUT.indexOf(k) !== -1 || hidden.indexOf(k) !== -1) return
      var v = valueOf(k)
      if (v.trim() !== '') answers[k] = v
    })
    return {
      format: FORMAT,
      v: 1,
      person: Number(valueOf('role')) || 0,
      name: valueOf('name').replace(/\s+/g, ' ').trim(),
      date: valueOf('date'),
      day: today(),
      answers: answers,
    }
  }

  /** "1z." and the answers deflated, or "1j." and the plain text where the browser cannot compress. */
  function encode(obj) {
    var json = new TextEncoder().encode(JSON.stringify(obj))
    if (typeof CompressionStream === 'function') {
      return streamThrough(json, new CompressionStream('deflate-raw')).then(function (z) {
        return '1z.' + bytesToBase64url(z)
      })
    }
    return Promise.resolve('1j.' + bytesToBase64url(json))
  }

  function decodeCode(code) {
    var m = /^1([zj])\.([A-Za-z0-9_-]+)$/.exec(code)
    if (!m) return Promise.reject(new Error('not a code'))
    var bytes = base64urlToBytes(m[2])
    if (m[1] === 'j') return Promise.resolve(new TextDecoder().decode(bytes))
    if (typeof DecompressionStream !== 'function') return Promise.reject(new Error('cannot decompress'))
    return streamThrough(bytes, new DecompressionStream('deflate-raw')).then(function (b) {
      return new TextDecoder().decode(b)
    })
  }

  var shared = { link: '', code: '', obj: null }

  function linkFor(code) {
    return location.origin + location.pathname + '#a=' + code
  }

  function safeName(text) {
    var t = String(text || '')
    var out
    try {
      out = t.replace(new RegExp('[^\\p{L}\\p{N}]+', 'gu'), '-')
    } catch {
      out = t.replace(/[^A-Za-z0-9]+/g, '-')
    }
    return Array.from(out.replace(/^-+|-+$/g, '')).slice(0, 40).join('').replace(/-+$/, '')
  }

  function drawQr(link) {
    var holder = finishBlock.querySelector('.qr-box')
    var note = finishBlock.querySelector('.qr-note')
    var canvas = finishBlock.querySelector('canvas.qr')
    holder.hidden = true
    note.hidden = true
    if (typeof window.qrcode !== 'function' || !canvas) return
    if (link.length > QR_MAX) {
      note.hidden = false
      return
    }
    var qr = window.qrcode(0, 'L')
    qr.addData(link)
    qr.make()
    var n = qr.getModuleCount()
    var quiet = 4
    var cell = 4
    canvas.width = canvas.height = (n + quiet * 2) * cell
    var ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000000'
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell)
    holder.hidden = false
  }

  function finish() {
    var status = finishBlock.querySelector('.finish-status')
    if (!valueOf('role')) {
      setText(status, 'Choose Person 1 or Person 2 at the top first.')
      return
    }
    saveNow()
    var obj = exportObject()
    if (Object.keys(obj.answers).length === 0) {
      setText(status, 'There are no answers to send yet.')
      return
    }
    setText(status, 'Making your link...')
    encode(obj).then(
      function (code) {
        shared = { link: linkFor(code), code: code, obj: obj }
        finished = obj.day
        changedSinceFinish = false
        save()
        finishBlock.querySelector('.share').hidden = false
        setText(finishBlock.querySelector('.share-status'), '')
        setText(status, 'Done. Send the link to your partner by text, or save the file and send that. When their answers arrive, add them below.')
        drawQr(shared.link)
        refreshPartner()
      },
      function () {
        setText(status, 'Sorry, the link could not be made. Save as a file instead.')
        shared = { link: '', code: '', obj: obj }
        finished = obj.day
        save()
        finishBlock.querySelector('.share').hidden = false
        refreshPartner()
      }
    )
  }

  function shareLink() {
    var status = finishBlock.querySelector('.share-status')
    if (!shared.link) return setText(status, 'Tap Finish first.')
    if (navigator.share) {
      navigator.share({ text: 'My answers for our money conversation sheet. Open this link to add them:', url: shared.link }).then(
        function () {
          setText(status, 'Sent.')
        },
        function (err) {
          if (!err || err.name !== 'AbortError') copyLink()
        }
      )
      return
    }
    copyLink()
  }

  function showLinkToCopy() {
    var status = finishBlock.querySelector('.share-status')
    var out = finishBlock.querySelector('textarea.link-out')
    if (!out) {
      out = document.createElement('textarea')
      out.className = 'link-out'
      out.readOnly = true
      out.rows = 3
      out.setAttribute('aria-label', 'Your link, to copy')
      status.parentNode.insertBefore(out, status.nextSibling)
    }
    out.value = shared.link
    out.focus()
    out.select()
    // Older browsers without the clipboard API can still copy what is selected.
    var copied = false
    try {
      copied = document.execCommand('copy')
    } catch {
      copied = false
    }
    if (copied) showCopied()
    else setText(status, 'Copy the link below and send it to your partner.')
  }

  var copiedTimer = null

  /** Said on the button itself, where the eye already is, and in the line below for a screen reader. */
  function showCopied() {
    var button = finishBlock.querySelector('[data-copy-link]')
    setText(finishBlock.querySelector('.share-status'), 'Copied. Paste the link into a message to your partner.')
    if (!button) return
    if (!copiedTimer) button.style.minWidth = button.offsetWidth ? button.offsetWidth + 'px' : ''
    button.textContent = 'Copied'
    button.classList.add('is-copied')
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(function () {
      copiedTimer = null
      button.textContent = 'Copy the link'
      button.classList.remove('is-copied')
      button.style.minWidth = ''
    }, COPIED_FOR)
  }

  function copyLink() {
    var status = finishBlock.querySelector('.share-status')
    if (!shared.link) return setText(status, 'Tap Finish first.')
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shared.link).then(showCopied, showLinkToCopy)
      return
    }
    showLinkToCopy()
  }

  function saveFile() {
    var status = finishBlock.querySelector('.share-status')
    var obj = shared.obj || exportObject()
    var name = ['money-conversation', safeName(obj.name), 'person' + obj.person].filter(Boolean).join('-') + '.json'
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })
    var file = null
    try {
      file = new File([blob], name, { type: 'application/json' })
    } catch {
      file = null
    }
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIOS && file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).then(
        function () {
          setText(status, 'File ready.')
        },
        function (err) {
          if (!err || err.name !== 'AbortError') download(blob, name, status)
        }
      )
      return
    }
    download(blob, name, status)
  }

  function download(blob, name, status) {
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url
    a.download = name
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(function () {
      URL.revokeObjectURL(url)
    }, 60000)
    setText(status, 'Saved as ' + name + '. Send that file to your partner.')
  }

  // ---------------------------------------------------- your partner's answers

  var partner = null

  /** Checks a partner's answers strictly: they are someone else's text, so nothing in them is trusted. */
  function validate(obj) {
    if (!obj || typeof obj !== 'object' || obj.format !== FORMAT) throw new Error('not ours')
    if (obj.v !== 1) throw new Error('version')
    if (obj.person !== 1 && obj.person !== 2) throw new Error('person')
    if (!obj.answers || typeof obj.answers !== 'object') throw new Error('answers')
    var answers = {}
    Object.keys(obj.answers).forEach(function (k) {
      var v = obj.answers[k]
      if (keys.indexOf(k) !== -1 && ABOUT.indexOf(k) === -1 && typeof v === 'string' && v.length <= MAX_VALUE) answers[k] = v
    })
    var name = typeof obj.name === 'string' ? obj.name.replace(/\s+/g, ' ').trim().slice(0, 60) : ''
    var date = typeof obj.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : ''
    return { person: obj.person, name: name, date: date, answers: answers }
  }

  function parseIncoming(text) {
    var t = String(text || '').trim()
    if (!t || t.length > MAX_CODE) return Promise.reject(new Error('empty or too long'))
    if (t.charAt(0) === '{') {
      return new Promise(function (resolve) {
        resolve(validate(JSON.parse(t)))
      })
    }
    var m = /#a=([A-Za-z0-9._-]+)/.exec(t) || /^(1[zj]\.[A-Za-z0-9_-]+)$/.exec(t)
    if (!m) return Promise.reject(new Error('no code'))
    return decodeCode(m[1]).then(function (json) {
      return validate(JSON.parse(json))
    })
  }

  function refreshPartner() {
    if (!partnerBlock) return
    var status = partnerBlock.querySelector('.import-status')
    var button = partnerBlock.querySelector('[data-pdf="combined"]')
    var mine = valueOf('role')
    if (!partner) {
      button.disabled = true
      return
    }
    var who = partner.name || 'Person ' + partner.person
    var lines = ['Answers from ' + who + ' are ready. They are kept only while this page is open.']
    if (mine && String(partner.person) === mine) lines.push('You both chose Person ' + mine + '. The PDF still keeps each of you in your own column.')
    if (!mine) lines.push('Choose Person 1 or Person 2 at the top and fill in yours.')
    else if (!finished) lines.push('Fill in yours and tap Finish, then download your combined PDF.')
    setText(status, lines.join(' '))
    button.disabled = !(mine && finished)
  }

  function accept(p, from) {
    partner = p
    if (partnerBlock) partnerBlock.hidden = false
    if (from === 'link' && arrived) {
      arrived.hidden = false
      arrived.textContent =
        "Your partner's answers came with this link. They are not shown here. Fill in yours, tap Finish, then download your combined PDF at the end of the page."
    }
    refreshPartner()
  }

  function refuse(status, message) {
    partner = null
    setText(status, message)
    refreshPartner()
  }

  function importFromBox() {
    var input = document.getElementById('partner-code')
    var status = partnerBlock.querySelector('.import-status')
    parseIncoming(input.value).then(
      function (p) {
        input.value = ''
        accept(p, 'box')
      },
      function () {
        refuse(status, 'That does not look like a link from this sheet. Ask your partner to tap Finish and send it again.')
      }
    )
  }

  function importFromFile(file) {
    var status = partnerBlock.querySelector('.import-status')
    if (!file) return
    if (file.size > MAX_CODE) return refuse(status, 'That file is too big to be from this sheet.')
    var reader = new FileReader()
    reader.onload = function () {
      parseIncoming(String(reader.result)).then(
        function (p) {
          accept(p, 'file')
        },
        function () {
          refuse(status, 'That file is not one this sheet made. Ask your partner to tap Finish and Save as a file.')
        }
      )
    }
    reader.readAsText(file)
  }

  // ------------------------------------------------------------- clearing

  function clearAll() {
    if ((hasAnswers() || partner) && !window.confirm('Clear every answer on this page and remove them from this device?')) return
    if (timer) clearTimeout(timer)
    timer = null
    inputs.forEach(function (f) {
      if (f.type === 'radio') f.checked = false
      else f.value = ''
    })
    var s = storage()
    try {
      if (s) s.removeItem(KEY)
    } catch {
      /* nothing more to try */
    }
    unsaved = false
    legacy = null
    partner = null
    finished = ''
    changedSinceFinish = false
    shared = { link: '', code: '', obj: null }
    if (problem) problem.hidden = true
    if (finishBlock) {
      finishBlock.querySelector('.share').hidden = true
      setText(finishBlock.querySelector('.finish-status'), '')
    }
    if (partnerBlock) setText(partnerBlock.querySelector('.import-status'), '')
    if (arrived) arrived.hidden = true
    applyGates()
    markDate()
    showForRole()
    refreshPartner()
    say('Your answers were cleared from this device.')
  }

  // --------------------------------------------------------------- start

  function start() {
    root.classList.add('js-grow')
    Array.prototype.forEach.call(document.querySelectorAll('[data-without-script]'), function (el) {
      el.hidden = true
    })
    if (box) box.hidden = false

    var saved = readSaved()
    if (saved === 'expired') {
      say('Answers saved on this device more than 14 days ago were removed.')
    } else if (saved) {
      var any = false
      Object.keys(saved.fields).forEach(function (k) {
        if (keys.indexOf(k) !== -1 && typeof saved.fields[k] === 'string') {
          setValue(k, saved.fields[k])
          if (k !== 'role' && saved.fields[k].trim()) any = true
        }
      })
      finished = saved.finished
      if (any) say('We restored your answers on this device.')
    }

    applyGates()
    markDate()
    showForRole()

    inputs.forEach(function (f) {
      var key = f.getAttribute('data-key')
      function changed() {
        if (f.tagName === 'TEXTAREA') grow(f)
        if (f === dateField) markDate()
        if (key === 'role') {
          bringOverLegacy(f.value)
          showForRole()
          refreshPartner()
        }
        if (f.closest('.gate')) applyGates()
        if (finished && key !== 'role' && !changedSinceFinish) {
          changedSinceFinish = true
          setText(finishBlock.querySelector('.finish-status'), 'You changed an answer after tapping Finish. Tap Finish again to send the new version.')
        }
        saveSoon()
      }
      f.addEventListener('input', changed)
      f.addEventListener('change', changed)
    })

    if (clearButton) clearButton.addEventListener('click', clearAll)
    if (finishBlock) {
      finishBlock.querySelector('[data-finish]').addEventListener('click', finish)
      finishBlock.querySelector('[data-share-link]').addEventListener('click', shareLink)
      finishBlock.querySelector('[data-copy-link]').addEventListener('click', copyLink)
      finishBlock.querySelector('[data-save-file]').addEventListener('click', saveFile)
    }
    if (partnerBlock) {
      partnerBlock.querySelector('[data-import]').addEventListener('click', importFromBox)
      var fileInput = document.getElementById('partner-file')
      fileInput.addEventListener('change', function () {
        importFromFile(fileInput.files && fileInput.files[0])
        fileInput.value = ''
      })
    }

    // A partner's link: read it, then take it out of the address bar so it is not left in history or a bookmark.
    var hash = location.hash || ''
    if (/^#a=/.test(hash)) {
      parseIncoming(hash).then(
        function (p) {
          accept(p, 'link')
        },
        function () {
          if (partnerBlock) {
            partnerBlock.hidden = false
            refuse(partnerBlock.querySelector('.import-status'), 'The link you opened could not be read. Ask your partner to tap Finish and send it again.')
          }
        }
      )
      try {
        history.replaceState(null, '', location.pathname + location.search)
      } catch {
        /* the link stays in the address bar; nothing is sent either way */
      }
    }

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

  /**
   * For the PDF button (niyyah-money-conversation-sheet-pdf.js): your answers as they are now, and your
   * partner's, if added. Copies; the PDF script cannot change what is kept.
   */
  window.NiyyahMoneySheet = {
    mine: function () {
      var o = exportObject()
      return { person: o.person, name: o.name, date: o.date, answers: o.answers }
    },
    partner: function () {
      return partner ? JSON.parse(JSON.stringify(partner)) : null
    },
    finished: function () {
      return !!finished
    },
  }

  start()
})()
