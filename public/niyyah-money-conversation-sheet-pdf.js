/*
 * The "Download PDF" button on niyyah-money-conversation-sheet.html.
 *
 * Everything happens in this page, on this device. The sheet is read out of the
 * fields on screen, laid out here, and handed to the browser as a file. Nothing
 * is sent anywhere, nothing is stored, and nothing is kept once the tab closes.
 * (tests/sheet-pdf.test.ts reads this file for any network or storage call.)
 *
 * Needs vendor/jspdf.umd.min.js (jsPDF, MIT). Without it the rest of the page
 * works as before and the button says so.
 *
 * The layout is done here, not by the library, so that a long answer can never be
 * cut off: every answer is wrapped to its column and carried onto as many pages
 * as it needs, with the question and the two column headings repeated at the top
 * of each new page.
 */
;(function () {
  'use strict'

  // money-conversation-<NameA>-<NameB>-<date>.pdf, leaving out whatever was not filled in (fileName, below).
  var FILE_STEM = 'money-conversation'
  var FOOTER = 'Niyyah, joinniyyah.com'

  var INK = [22, 39, 31]
  var BODY = [36, 49, 43]
  var MUTED = [74, 86, 79]
  var RULE = [154, 163, 157]
  var LIGHT = [208, 213, 209]

  var F = {
    title: { f: 'times', s: 'bold', z: 22 },
    h2: { f: 'times', s: 'bold', z: 15 },
    lede: { f: 'helvetica', s: 'normal', z: 10.5 },
    framing: { f: 'helvetica', s: 'italic', z: 10 },
    q: { f: 'helvetica', s: 'bold', z: 10.5 },
    a: { f: 'helvetica', s: 'normal', z: 10.5 },
    none: { f: 'helvetica', s: 'italic', z: 10 },
    label: { f: 'helvetica', s: 'bold', z: 8.5 },
    small: { f: 'helvetica', s: 'normal', z: 8.5 }
  }

  // ---------------------------------------------------------------- reading the page

  function clean(s) {
    var text = String(s == null ? '' : s)
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/[\u200B\uFEFF]/g, '')
    // Control characters other than the line break draw as nothing useful; drop them.
    var out = ''
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i)
      if (c === 10 || (c >= 32 && c !== 127)) out += text.charAt(i)
    }
    return out
  }

  function squash(s) {
    return clean(s).replace(/\s+/g, ' ').trim()
  }

  function answer(id) {
    var el = document.getElementById(id)
    // Leading and trailing blank lines are not part of an answer; the ones inside are.
    return el ? clean(el.value).replace(/^\s*\n/, '').replace(/\s+$/, '') : ''
  }

  function prettyDate(raw) {
    var v = squash(raw)
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
    if (!m) return v
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (isNaN(d.getTime()) || d.getMonth() !== Number(m[2]) - 1) return v
    try {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return v
    }
  }

  /** The whole sheet as plain data: the questions as printed, and what each person wrote. */
  function read() {
    var nameA = squash(answer('name-a'))
    var nameB = squash(answer('name-b'))
    var rawDate = squash(answer('sheet-date'))
    var date = prettyDate(rawDate)
    var lede = document.querySelector('header .lede')
    var model = {
      title: squash(document.querySelector('h1').textContent),
      lede: lede ? squash(lede.textContent) : '',
      nameA: nameA,
      nameB: nameB,
      date: date,
      rawDate: rawDate,
      sections: [],
      closing: []
    }
    Array.prototype.forEach.call(document.querySelectorAll('main section'), function (sec) {
      var framing = sec.querySelector('.framing')
      var out = { title: squash(sec.querySelector('h2').textContent), framing: framing ? squash(framing.textContent) : '', items: [] }
      Array.prototype.forEach.call(sec.querySelectorAll('ol.qs > li'), function (li, i) {
        var q = li.querySelector('.q')
        var a = li.querySelector('textarea[id$="-a"]')
        var b = li.querySelector('textarea[id$="-b"]')
        out.items.push({
          number: i + 1,
          text: squash(q.textContent),
          cols: [
            { label: 'Person A', name: nameA, text: a ? answer(a.id) : '' },
            { label: 'Person B', name: nameB, text: b ? answer(b.id) : '' }
          ]
        })
      })
      model.sections.push(out)
    })
    Array.prototype.forEach.call(document.querySelectorAll('footer p'), function (p) {
      if (!p.querySelector('a')) model.closing.push(squash(p.textContent))
    })
    return model
  }

  function everyString(model) {
    var all = [model.title, model.lede, model.nameA, model.nameB, model.date].concat(model.closing, [FOOTER])
    model.sections.forEach(function (s) {
      all.push(s.title, s.framing)
      s.items.forEach(function (it) {
        all.push(it.text)
        it.cols.forEach(function (c) {
          all.push(c.label, c.text)
        })
      })
    })
    return all
  }

  // ------------------------------------------------------- what the built-in fonts can draw

  // The PDF's own fonts draw Windows-1252: Latin letters, accents, curly quotes and dashes.
  // Anything else (Arabic, other scripts, emoji) would come out as the wrong letters, so
  // when a sheet holds any, its pages are drawn by the browser, which has the fonts, and
  // put into the PDF as images.
  var EXTRA = '\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178'

  function drawable(ch) {
    var c = ch.charCodeAt(0)
    return c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || EXTRA.indexOf(ch) !== -1
  }

  function needsImages(strings) {
    for (var i = 0; i < strings.length; i++) {
      var s = strings[i] || ''
      for (var j = 0; j < s.length; j++) if (!drawable(s.charAt(j))) return true
    }
    return false
  }

  // ------------------------------------------------------------------------ paper

  function paper() {
    // Letter in the United States and Canada, A4 everywhere else; the print dialog can rescale either.
    var m = /-([A-Za-z]{2})\b/.exec(navigator.language || 'en-US')
    var region = m ? m[1].toUpperCase() : 'US'
    return region === 'US' || region === 'CA' ? { fmt: 'letter', w: 612, h: 792 } : { fmt: 'a4', w: 595.28, h: 841.89 }
  }

  // ---------------------------------------------------------------------- backends
  // A backend measures and draws; the layout below never touches the library.

  function newDoc(P) {
    var jsPDF = window.jspdf && window.jspdf.jsPDF
    if (!jsPDF) throw new Error('jsPDF is not loaded')
    var doc = new jsPDF({ unit: 'pt', format: P.fmt, orientation: 'portrait', compress: true })
    doc.setProperties({ title: 'The money conversation' })
    return doc
  }

  /** Real text in the PDF: small, sharp, searchable. */
  function textBackend(P) {
    var doc = newDoc(P)
    function setFont(font) {
      doc.setFont(font.f, font.s)
      doc.setFontSize(font.z)
    }
    return {
      measure: function (str, font) {
        setFont(font)
        return doc.getTextWidth(str)
      },
      text: function (str, x, y, font, color, opt) {
        setFont(font)
        doc.setTextColor(color[0], color[1], color[2])
        if (opt && opt.right) doc.text(str, x, y, { align: 'right' })
        else doc.text(str, x, y)
      },
      line: function (x1, y1, x2, y2, w, color) {
        doc.setDrawColor(color[0], color[1], color[2])
        doc.setLineWidth(w)
        doc.line(x1, y1, x2, y2)
      },
      addPage: function () {
        doc.addPage([P.w, P.h], 'portrait')
      },
      finish: function () {
        return doc.output('blob')
      }
    }
  }

  var CANVAS_FONT = {
    times: 'Georgia, "Times New Roman", "Liberation Serif", "Noto Serif", serif',
    helvetica: '-apple-system, "Helvetica Neue", Helvetica, Arial, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Arabic", sans-serif'
  }

  function cssFont(font) {
    return (font.s === 'normal' ? '' : font.s + ' ') + font.z + 'px ' + CANVAS_FONT[font.f]
  }

  function rtlText(str) {
    var rtl = (str.match(/[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g) || []).length
    var ltr = (str.match(/[A-Za-z\u00C0-\u024F]/g) || []).length
    return rtl > ltr
  }

  /** Pages drawn by the browser, then placed in the PDF as JPEG pictures. Any script it has a font for. */
  function imageBackend(P) {
    var doc = newDoc(P)
    var SCALE = 2.5 // about 180 dots per inch
    var probe = document.createElement('canvas').getContext('2d')
    var canvas = null
    var ctx = null
    var pages = 0

    function open() {
      canvas = document.createElement('canvas')
      canvas.width = Math.round(P.w * SCALE)
      canvas.height = Math.round(P.h * SCALE)
      ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(SCALE, SCALE)
      ctx.textBaseline = 'alphabetic'
      pages += 1
    }

    function flush() {
      if (!canvas) return
      if (pages > 1) doc.addPage([P.w, P.h], 'portrait')
      doc.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, P.w, P.h, undefined, 'FAST')
      // A page picture is the biggest thing in memory; let a phone have it back.
      canvas.width = 0
      canvas.height = 0
      canvas = null
      ctx = null
    }

    open()
    return {
      measure: function (str, font) {
        probe.font = cssFont(font)
        return probe.measureText(str).width
      },
      text: function (str, x, y, font, color, opt) {
        ctx.font = cssFont(font)
        ctx.fillStyle = 'rgb(' + color.join(',') + ')'
        if (opt && opt.right) {
          ctx.direction = 'ltr'
          ctx.textAlign = 'right'
          ctx.fillText(str, x, y)
        } else if (opt && opt.w && rtlText(str)) {
          ctx.direction = 'rtl'
          ctx.textAlign = 'right'
          ctx.fillText(str, x + opt.w, y)
        } else {
          ctx.direction = 'ltr'
          ctx.textAlign = 'left'
          ctx.fillText(str, x, y)
        }
      },
      line: function (x1, y1, x2, y2, w, color) {
        ctx.strokeStyle = 'rgb(' + color.join(',') + ')'
        ctx.lineWidth = w
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      },
      addPage: function () {
        flush()
        open()
      },
      finish: function () {
        flush()
        return doc.output('blob')
      }
    }
  }

  /** The same measuring as the real backend, and no drawing: a first pass to learn how many pages there are. */
  function countingBackend(real) {
    var n = 1
    return {
      measure: real.measure,
      text: function () {},
      line: function () {},
      addPage: function () {
        n += 1
      },
      pages: function () {
        return n
      }
    }
  }

  // ----------------------------------------------------------------------- layout

  /** Break text into lines no wider than `width`. Blank lines stay; a word wider than the line is split. */
  function wrap(be, text, font, width) {
    var lines = []
    clean(text)
      .split('\n')
      .forEach(function (para) {
        var words = para.split(/ +/).filter(Boolean)
        if (!words.length) {
          lines.push('')
          return
        }
        var line = ''
        words.forEach(function (word) {
          var tryLine = line ? line + ' ' + word : word
          if (be.measure(tryLine, font) <= width) {
            line = tryLine
            return
          }
          if (line) lines.push(line)
          line = ''
          if (be.measure(word, font) <= width) {
            line = word
            return
          }
          var chunk = ''
          Array.from(word).forEach(function (ch) {
            if (chunk && be.measure(chunk + ch, font) > width) {
              lines.push(chunk)
              chunk = ''
            }
            chunk += ch
          })
          line = chunk
        })
        lines.push(line)
      })
    return lines
  }

  /** A single line cut to fit, with an ellipsis, for a name in a narrow heading. */
  function fit(be, text, font, width) {
    if (be.measure(text, font) <= width) return text
    var out = Array.from(text)
    while (out.length > 1 && be.measure(out.join('') + '\u2026', font) > width) out.pop()
    return out.join('') + '\u2026'
  }

  function layout(be, P, model, total) {
    var L = 54
    var R = P.w - 54
    var W = R - L
    var TOP = 54
    var BOTTOM = P.h - 62
    var LH = 14.5
    var GAP = 20
    var COLW = (W - GAP) / 2
    var y = TOP
    var pageTop = TOP
    var page = 1

    var who = []
    if (model.nameA) who.push('Person A: ' + model.nameA)
    if (model.nameB) who.push('Person B: ' + model.nameB)
    if (model.date) who.push('Session date: ' + model.date)
    var meta = who.join('   \u00B7   ')

    function footer() {
      be.line(L, P.h - 44, R, P.h - 44, 0.5, LIGHT)
      be.text(FOOTER, L, P.h - 30, F.small, MUTED)
      if (total) be.text('Page ' + page + ' of ' + total, R, P.h - 30, F.small, MUTED, { right: true })
    }

    function runningHeader() {
      be.text(model.title, L, TOP + 8, F.label, MUTED)
      if (meta) {
        var room = W - be.measure(model.title, F.label) - 24
        be.text(fit(be, meta, F.small, room), R, TOP + 8, F.small, MUTED, { right: true })
      }
      be.line(L, TOP + 15, R, TOP + 15, 0.5, RULE)
      y = TOP + 34
      pageTop = y
    }

    function newPage() {
      footer()
      be.addPage()
      page += 1
      y = TOP
      runningHeader()
    }

    function ensure(h) {
      if (y + h > BOTTOM) newPage()
    }

    function paragraph(text, font, color, width, after) {
      wrap(be, text, font, width).forEach(function (line) {
        ensure(LH)
        if (line) be.text(line, L, y + 10, font, color, { w: width })
        y += LH
      })
      y += after || 0
    }

    function colHeading(col, x) {
      // The name in place of Person A or Person B, as on the page.
      var label = col.name || col.label
      be.text(fit(be, label, F.label, COLW), x, y + 8, F.label, MUTED, { w: COLW })
    }

    /**
     * One question: the question, then both answers side by side,
     * line by line. When a page runs out the rows carry on to the next one under a repeat of the
     * question's number and the two headings, so nothing is ever cut off.
     */
    function block(item) {
      var indent = item.number ? 20 : 0
      var qLines = item.text ? wrap(be, item.text, F.q, W - indent) : []
      var cols = item.cols.map(function (c) {
        return c.text ? wrap(be, c.text, F.a, COLW) : null
      })
      var rows = Math.max.apply(null, cols.map(function (c) { return c ? c.length : 1 }))
      ensure(qLines.length * LH + 6 + 16 + Math.min(rows, 2) * LH + 8)

      qLines.forEach(function (line, i) {
        if (i === 0 && item.number) be.text(item.number + '.', L, y + 10, F.q, INK)
        be.text(line, L + indent, y + 10, F.q, INK, { w: W - indent })
        y += LH
      })
      y += 6

      var top
      function open(continued) {
        if (continued) {
          be.text('Question ' + item.number + ', continued', L, y + 8, F.small, MUTED)
          y += 14
        }
        item.cols.forEach(function (c, k) {
          colHeading(c, L + k * (COLW + GAP))
        })
        y += 16
        top = y
      }
      function close() {
        item.cols.forEach(function (c, k) {
          var x = L + k * (COLW + GAP)
          be.line(x - 7, top - 3, x - 7, y, 1, LIGHT)
        })
      }

      open(false)
      for (var i = 0; i < rows; i++) {
        if (y + LH > BOTTOM) {
          close()
          newPage()
          open(true)
        }
        cols.forEach(function (lines, k) {
          var x = L + k * (COLW + GAP)
          if (lines === null) {
            if (i === 0) be.text('Not answered', x, y + 10, F.none, MUTED)
          } else if (lines[i]) be.text(lines[i], x, y + 10, F.a, BODY, { w: COLW })
        })
        y += LH
      }
      close()
      y += 14
    }

    // The first page: the sheet's name, who it is for, and the date.
    be.text(model.title, L, y + 22, F.title, INK)
    y += 34
    if (model.lede) paragraph(model.lede, F.lede, BODY, W, 6)
    function row(label, value) {
      var lines = wrap(be, value, F.a, W - 96)
      be.text(label, L, y + 10, F.label, MUTED)
      lines.forEach(function (line) {
        ensure(LH)
        be.text(line, L + 96, y + 10, F.a, INK)
        y += LH
      })
    }
    if (model.nameA) row('PERSON A', model.nameA)
    if (model.nameB) row('PERSON B', model.nameB)
    if (model.date) row('SESSION DATE', model.date)
    be.line(L, y + 4, R, y + 4, 1.5, INK)
    y += 24

    // The subjects follow one another; a new one starts a page only when its heading, its framing line
    // and the start of its first question would not fit, so no page is left nearly empty.
    model.sections.forEach(function (sec, i) {
      var framing = sec.framing ? wrap(be, sec.framing, F.framing, W - 10).length : 0
      var first = sec.items[0]
      var firstNeed = first ? (first.text ? wrap(be, first.text, F.q, W - 20).length * LH : 0) + 6 + 16 + 2 * LH + 8 : 0
      if (i > 0 && y > pageTop) y += 18
      ensure(24 + framing * LH + 20 + firstNeed)
      be.text(sec.title, L, y + 14, F.h2, INK, { w: W })
      y += 24
      if (sec.framing) paragraph(sec.framing, F.framing, MUTED, W - 10, 0)
      be.line(L, y + 2, R, y + 2, 0.5, RULE)
      y += 18
      sec.items.forEach(block)
    })

    if (model.closing.length) {
      ensure(60)
      be.line(L, y, R, y, 1, INK)
      y += 14
      model.closing.forEach(function (text) {
        paragraph(text, F.small, MUTED, W, 4)
      })
    }
    footer()
  }

  // --------------------------------------------------------------- making the file

  function makePdf() {
    var model = read()
    var P = paper()
    var make = needsImages(everyString(model)) ? imageBackend : textBackend
    // Two passes: the first only counts the pages, so every footer can say "Page 2 of 6".
    var counter = countingBackend(make(P))
    layout(counter, P, model, 0)
    var be = make(P)
    layout(be, P, model, counter.pages())
    return { blob: be.finish(), name: fileName(model) }
  }

  /** money-conversation-Amina-Omar-2026-10-31.pdf: the names as typed, in any script, and the date. */
  function fileName(model) {
    function part(text) {
      var t = String(text || '')
      if (t.normalize) t = t.normalize('NFC')
      var out
      try {
        out = t.replace(new RegExp('[^\\p{L}\\p{N}]+', 'gu'), '-')
      } catch {
        out = t.replace(/[^A-Za-z0-9]+/g, '-')
      }
      return Array.from(out.replace(/^-+|-+$/g, '')).slice(0, 40).join('').replace(/-+$/, '')
    }
    var date = /^\d{4}-\d{2}-\d{2}$/.test(model.rawDate) ? model.rawDate : part(model.rawDate)
    return [FILE_STEM, part(model.nameA), part(model.nameB), date].filter(Boolean).join('-') + '.pdf'
  }

  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  var lastUrl = null

  function say(el, message, link) {
    if (!el) return
    el.textContent = message
    if (link) {
      var a = document.createElement('a')
      a.href = link
      a.target = '_blank'
      a.rel = 'noopener'
      a.textContent = 'open it here'
      el.appendChild(document.createTextNode(' If nothing appeared, '))
      el.appendChild(a)
      el.appendChild(document.createTextNode('.'))
    }
  }

  function saveAsLink(blob, name, status) {
    if (lastUrl) URL.revokeObjectURL(lastUrl)
    lastUrl = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = lastUrl
    a.download = name
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    say(status, 'Your PDF was made on this device and should be in your downloads.', lastUrl)
  }

  function deliver(made, status) {
    var blob = made.blob
    var name = made.name
    var file = null
    try {
      file = new File([blob], name, { type: 'application/pdf' })
    } catch {
      file = null
    }
    // On an iPhone or iPad the share sheet is the way to Files, Mail or Print; a plain
    // download is the fallback if it is not there or the person did not get to it.
    if (isIOS && file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).then(
        function () {
          say(status, 'Your PDF is ready.')
        },
        function (err) {
          if (err && err.name === 'AbortError') {
            say(status, 'The PDF was not saved. Tap Download PDF to try again.')
          } else saveAsLink(blob, name, status)
        }
      )
      return
    }
    saveAsLink(blob, name, status)
  }

  function onPress(button) {
    var status = button.parentNode.querySelector('.pdf-status')
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      say(status, 'The PDF maker did not load. Reload this page, or print it and choose Save as PDF.')
      return
    }
    // Made and handed over inside the tap itself, so a phone still counts it as the person's own action.
    try {
      deliver(makePdf(), status)
    } catch {
      say(status, 'Sorry, the PDF could not be made. You can still print this page.')
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-pdf-button]'), function (button) {
    button.parentNode.hidden = false
    button.addEventListener('click', function () {
      onPress(button)
    })
  })
})()
