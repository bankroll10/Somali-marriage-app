/*
 * The PDF buttons on niyyah-money-conversation-sheet.html.
 *
 * "Download only my answers" makes one person's answers into a PDF. "Download our combined PDF" puts
 * both partners' answers side by side, after a first page that lists what to talk about: each choice
 * or amount marked Likely agree or Talk about this by the simple rules under "marks" below, anything in
 * someone's own words marked Compare in session, and a yes/no answered differently marked Talk about
 * this. Each subject ends with lines for notes at the session.
 *
 * Everything happens in this page, on this device. The questions are read from the page, the answers
 * from niyyah-money-conversation-sheet.js (window.NiyyahMoneySheet), and the file is handed to the
 * browser. Nothing is sent anywhere and nothing is stored. (tests/sheet-pdf.test.ts reads this file for
 * any network or storage call.)
 *
 * Needs vendor/jspdf.umd.min.js (jsPDF, MIT). Without it the rest of the page works and the button says so.
 *
 * The layout is done here, not by the library, so that a long answer can never be cut off: every answer
 * is wrapped to its column and carried onto as many pages as it needs, with the question number and the
 * names repeated at the top of each new page.
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
  var TALK_INK = [138, 45, 28]

  var F = {
    title: { f: 'times', s: 'bold', z: 22 },
    h2: { f: 'times', s: 'bold', z: 15 },
    lede: { f: 'helvetica', s: 'normal', z: 10.5 },
    framing: { f: 'helvetica', s: 'italic', z: 10 },
    q: { f: 'helvetica', s: 'bold', z: 10.5 },
    a: { f: 'helvetica', s: 'normal', z: 10.5 },
    none: { f: 'helvetica', s: 'italic', z: 10 },
    label: { f: 'helvetica', s: 'bold', z: 8.5 },
    h3: { f: 'times', s: 'bold', z: 13 },
    badge: { f: 'helvetica', s: 'bold', z: 9 },
    pick: { f: 'helvetica', s: 'bold', z: 10 },
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

  /** An answer as written: inner line breaks kept, blank lines at either end dropped. */
  function answerText(v) {
    return clean(v || '').replace(/^\s*\n/, '').replace(/\s+$/, '')
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

  function choiceOf(el) {
    return {
      key: el.getAttribute('data-key'),
      short: el.getAttribute('data-short') || '',
      options: Array.prototype.map.call(el.querySelectorAll('input[type="radio"]'), function (r) {
        return { v: r.value, label: squash(r.parentNode.textContent) }
      }),
    }
  }

  /**
   * The sheet as data, read from the page itself: each section, its yes/no question, and each question with
   * the choice or number attached to it. The words are the page's own, so the PDF can never ask something else.
   */
  function schema() {
    var lede = document.querySelector('header .lede')
    var model = { title: squash(document.querySelector('h1').textContent), lede: lede ? squash(lede.textContent) : '', sections: [], closing: [] }
    Array.prototype.forEach.call(document.querySelectorAll('main section'), function (sec) {
      var framing = sec.querySelector('.framing')
      var out = { title: squash(sec.querySelector('h2').textContent), framing: framing ? squash(framing.textContent) : '', gate: null, items: [] }
      var g = sec.querySelector('.gate')
      if (g) {
        out.gate = {
          key: g.getAttribute('data-key'),
          ask: squash(g.querySelector('legend').textContent),
          short: g.getAttribute('data-short') || '',
          hides: g.getAttribute('data-hides') === 'true',
          noLine: g.getAttribute('data-no-line') || '',
        }
      }
      var block = sec.querySelector('.ask-block')
      if (block) out.items.push({ number: 0, text: squash(block.querySelector('legend').textContent), choice: choiceOf(block), num: null, textKey: null })
      Array.prototype.forEach.call(sec.querySelectorAll('ol.qs > li'), function (li, i) {
        var ch = li.querySelector('[data-kind="choice"]')
        var nm = li.querySelector('[data-kind="number"]')
        out.items.push({
          number: i + 1,
          text: squash(li.querySelector('.q').textContent),
          choice: ch ? choiceOf(ch) : null,
          num: nm ? { key: nm.getAttribute('data-key'), short: nm.getAttribute('data-short') || '' } : null,
          textKey: li.getAttribute('data-q'),
        })
      })
      model.sections.push(out)
    })
    Array.prototype.forEach.call(document.querySelectorAll('footer p'), function (p) {
      if (!p.querySelector('a')) model.closing.push(squash(p.textContent))
    })
    return model
  }

  /** One person, or the two, in the order of the columns: Person 1 on the left. */
  function people(mode) {
    var api = window.NiyyahMoneySheet
    var mine = api ? api.mine() : { person: 0, name: '', date: '', answers: {} }
    if (mode !== 'combined') return [mine]
    var other = api.partner()
    return other.person === 1 && mine.person !== 1 ? [other, mine] : [mine, other]
  }

  function nameOf(p, i, pair) {
    var n = squash(p.name)
    if (n) return n
    var same = pair.length === 2 && pair[0].person === pair[1].person
    return 'Person ' + (p.person && !same ? p.person : i + 1)
  }

  function everyString(model, pair) {
    var all = [model.title, model.lede, FOOTER].concat(model.closing)
    model.sections.forEach(function (s) {
      all.push(s.title, s.framing)
      if (s.gate) all.push(s.gate.ask, s.gate.short, s.gate.noLine)
      s.items.forEach(function (it) {
        all.push(it.text)
        if (it.choice) {
          all.push(it.choice.short)
          it.choice.options.forEach(function (o) {
            all.push(o.label)
          })
        }
        if (it.num) all.push(it.num.short)
      })
    })
    pair.forEach(function (p) {
      all.push(p.name, p.date)
      Object.keys(p.answers).forEach(function (k) {
        all.push(p.answers[k])
      })
    })
    return all
  }

  // ------------------------------------------------------------------- marks

  // Simple rules, written down so a couple can see them: the same choice, or numbers within a tenth of each
  // other, is likely agreement; a different choice, a "Not sure yet" or numbers further apart is something to
  // talk about; anything in someone's own words is never guessed at.
  var AGREE = 'Likely agree'
  var TALK = 'Talk about this'
  var COMPARE = 'Compare in session'
  var NEAR = 0.1

  function parseNumber(text) {
    var t = String(text || '').replace(/[\s,']/g, '')
    if (!/^\d+(\.\d+)?$/.test(t)) return null
    return Number(t)
  }

  // "Me" from one and "My partner" from the other are the same person: compare who, not the words.
  function whoPays(v, i) {
    if (v === 'me') return 'person' + i
    if (v === 'partner') return 'person' + (1 - i)
    return v
  }

  function choiceMark(ch, pair) {
    var a = pair[0].answers[ch.key]
    var b = pair[1].answers[ch.key]
    if (!a || !b) return COMPARE
    if (a === 'unsure' || b === 'unsure') return TALK
    if (ch.key === 'c-pay') return whoPays(a, 0) === whoPays(b, 1) ? AGREE : TALK
    return a === b ? AGREE : TALK
  }

  function numberMark(nm, pair) {
    var a = parseNumber(pair[0].answers[nm.key])
    var b = parseNumber(pair[1].answers[nm.key])
    if (a === null || b === null) return COMPARE
    var big = Math.max(a, b)
    return big === 0 || Math.abs(a - b) <= big * NEAR ? AGREE : TALK
  }

  function itemMark(item, pair) {
    if (item.choice) return choiceMark(item.choice, pair)
    if (item.num) return numberMark(item.num, pair)
    return COMPARE
  }

  /** A gate answered differently is to be talked about; answered the same, it needs no mark. */
  function gateMark(gate, pair) {
    var a = pair[0].answers[gate.key]
    var b = pair[1].answers[gate.key]
    if (!a || !b) return COMPARE
    return a === b ? '' : TALK
  }

  function yesNo(v) {
    return v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not answered'
  }

  function choiceLabel(ch, v, i, pair) {
    var o = ch.options.filter(function (x) {
      return x.v === v
    })[0]
    if (!o) return ''
    if (ch.key === 'c-pay' && pair.length === 2 && (v === 'me' || v === 'partner')) {
      return o.label + ' (' + nameOf(pair[v === 'me' ? i : 1 - i], v === 'me' ? i : 1 - i, pair) + ')'
    }
    return o.label
  }

  /** What one person gave for a choice or number, as a short line, or ''. */
  function pickLine(item, p, i, pair) {
    if (item.choice) {
      var label = choiceLabel(item.choice, p.answers[item.choice.key], i, pair)
      return label ? 'Chose: ' + label : ''
    }
    if (item.num) {
      var n = squash(p.answers[item.num.key])
      return n ? 'Amount: ' + n : ''
    }
    return ''
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

  function layout(be, P, model, pair, mode, total) {
    var L = 54
    var R = P.w - 54
    var W = R - L
    var TOP = 54
    var BOTTOM = P.h - 62
    var LH = 14.5
    var GAP = 20
    var y = TOP
    var pageTop = TOP
    var page = 1
    var WRITE_GAP = 22
    var NOTE_LINES = 5
    var combined = mode === 'combined'
    var names = pair.map(function (p, i) {
      return nameOf(p, i, pair)
    })
    var date = prettyDate((pair[0] && pair[0].date) || (pair[1] && pair[1].date) || '')
    var meta = [names.join(' and '), date ? 'Session date: ' + date : ''].filter(Boolean).join('   \u00B7   ')

    function footer() {
      be.line(L, P.h - 44, R, P.h - 44, 0.5, LIGHT)
      be.text(FOOTER, L, P.h - 30, F.small, MUTED)
      if (total) be.text('Page ' + page + ' of ' + total, R, P.h - 30, F.small, MUTED, { right: true })
    }

    function runningHeader() {
      be.text(model.title, L, TOP + 8, F.label, MUTED)
      var room = W - be.measure(model.title, F.label) - 24
      be.text(fit(be, meta, F.small, room), R, TOP + 8, F.small, MUTED, { right: true })
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

    function paragraph(text, font, color, width, after, x) {
      wrap(be, text, font, width).forEach(function (line) {
        ensure(LH)
        if (line) be.text(line, x || L, y + 10, font, color, { w: width })
        y += LH
      })
      y += after || 0
    }

    function badge(mark) {
      if (!mark) return
      var color = mark === TALK ? TALK_INK : mark === AGREE ? INK : MUTED
      be.text(mark, L + 20, y + 9, mark === COMPARE ? F.small : F.badge, color)
      y += 14
    }

    /** The columns of one question: each person's choice or amount, then their own words. */
    function columns(item, who) {
      var n = who.length
      var cw = n === 1 ? W : (W - GAP) / 2
      var cols = who.map(function (w) {
        var lines = []
        var pick = item ? pickLine(item, w.p, w.i, pair) : ''
        if (pick) wrap(be, pick, F.pick, cw).forEach(function (t) {
          lines.push({ t: t, f: F.pick, c: INK })
        })
        var text = item && item.textKey ? answerText(w.p.answers[item.textKey]) : ''
        if (text) wrap(be, text, F.a, cw).forEach(function (t) {
          lines.push({ t: t, f: F.a, c: BODY })
        })
        if (!lines.length) lines.push({ t: 'Not answered', f: F.none, c: MUTED })
        return lines
      })
      var rows = Math.max.apply(null, cols.map(function (c) { return c.length }))
      var top
      function open(continued) {
        if (continued) {
          be.text((item && item.number ? 'Question ' + item.number : 'This question') + ', continued', L, y + 8, F.small, MUTED)
          y += 14
        }
        who.forEach(function (w, k) {
          be.text(fit(be, names[w.i], F.label, cw), L + k * (cw + GAP), y + 8, F.label, MUTED, { w: cw })
        })
        y += 16
        top = y
      }
      function close() {
        who.forEach(function (w, k) {
          var x = L + k * (cw + GAP)
          be.line(x - 7, top - 3, x - 7, y, 1, LIGHT)
        })
      }
      open(false)
      for (var r = 0; r < rows; r++) {
        if (y + LH > BOTTOM) {
          close()
          newPage()
          open(true)
        }
        cols.forEach(function (lines, k) {
          var l = lines[r]
          if (l && l.t) be.text(l.t, L + k * (cw + GAP), y + 10, l.f, l.c, { w: cw })
        })
        y += LH
      }
      close()
      y += 14
    }

    function question(item, who, mark) {
      var indent = item.number ? 20 : 0
      var qLines = wrap(be, item.text, F.q, W - indent)
      ensure(qLines.length * LH + (mark ? 14 : 0) + 6 + 16 + 2 * LH + 8)
      qLines.forEach(function (line, i) {
        if (i === 0 && item.number) be.text(item.number + '.', L, y + 10, F.q, INK)
        be.text(line, L + indent, y + 10, F.q, INK, { w: W - indent })
        y += LH
      })
      if (mark) badge(mark)
      y += 6
      columns(item, who)
    }

    function notes() {
      ensure(16 + NOTE_LINES * WRITE_GAP + 8)
      be.text('NOTES FROM THE SESSION', L, y + 8, F.label, MUTED)
      y += 14
      for (var i = 1; i <= NOTE_LINES; i++) be.line(L, y + i * WRITE_GAP, R, y + i * WRITE_GAP, 0.5, RULE)
      y += NOTE_LINES * WRITE_GAP + 22
    }

    function titleBlock(subtitle) {
      be.text(model.title, L, y + 22, F.title, INK)
      y += 34
      if (subtitle) {
        be.text(subtitle, L, y + 14, F.h2, INK)
        y += 26
      }
      pair.forEach(function (p, i) {
        be.text(combined ? 'PERSON ' + (i + 1) : 'NAME', L, y + 10, F.label, MUTED)
        be.text(fit(be, names[i], F.a, W - 110), L + 110, y + 10, F.a, INK)
        y += LH
      })
      if (date) {
        be.text('SESSION DATE', L, y + 10, F.label, MUTED)
        be.text(date, L + 110, y + 10, F.a, INK)
        y += LH
      }
      be.line(L, y + 4, R, y + 4, 1.5, INK)
      y += 24
    }

    // ---- the first page of a combined PDF: what to talk about, first
    var lists = { talk: [], agree: [], compare: [] }
    if (combined) {
      model.sections.forEach(function (sec, si) {
        var g = sec.gate
        var hidden = [false, false]
        if (g) {
          var gm = gateMark(g, pair)
          if (gm === TALK) lists.talk.push({ sec: sec, what: g.short, vals: pair.map(function (p) { return yesNo(p.answers[g.key]) }) })
          if (g.hides) hidden = pair.map(function (p) { return p.answers[g.key] === 'no' })
        }
        var counted = 0
        sec.items.forEach(function (it) {
          var wrote = it.textKey && pair.some(function (p, k) { return !hidden[k] && answerText(p.answers[it.textKey]) })
          if (wrote) counted += 1
          if (hidden[0] || hidden[1]) return
          var mark = itemMark(it, pair)
          var short = it.choice ? it.choice.short : it.num ? it.num.short : ''
          if (short && mark !== COMPARE) {
            ;(mark === TALK ? lists.talk : lists.agree).push({
              sec: sec,
              what: short,
              vals: pair.map(function (p, i) {
                return pickLine(it, p, i, pair).replace(/^(Chose|Amount): /, '') || 'Not answered'
              }),
            })
          }
        })
        lists.compare.push({ sec: sec, n: counted, si: si })
      })

      titleBlock('What to talk about')
      function list(heading, items, color) {
        ensure(40)
        be.text(heading + ' (' + items.length + ')', L, y + 12, F.h3, color)
        y += 22
        if (!items.length) {
          paragraph('Nothing here.', F.none, MUTED, W, 8)
          return
        }
        items.forEach(function (e) {
          var line = e.sec.title.split('.')[0] + '. ' + e.what + ': ' + names[0] + ': ' + e.vals[0] + '. ' + names[1] + ': ' + e.vals[1] + '.'
          wrap(be, line, F.a, W - 14).forEach(function (t, i) {
            ensure(LH)
            if (i === 0) be.text('\u2022', L, y + 10, F.a, color)
            be.text(t, L + 14, y + 10, F.a, BODY, { w: W - 14 })
            y += LH
          })
          y += 3
        })
        y += 10
      }
      list(TALK, lists.talk, TALK_INK)
      list(AGREE, lists.agree, INK)
      ensure(40)
      be.text(COMPARE, L, y + 12, F.h3, MUTED)
      y += 22
      paragraph('Answers written in your own words are not marked. Read them together in the session:', F.a, BODY, W, 4)
      lists.compare.forEach(function (c) {
        paragraph('\u2022  ' + c.sec.title + ': ' + (c.n ? c.n + (c.n === 1 ? ' question' : ' questions') + ' with written answers' : 'nothing written'), F.a, BODY, W - 14, 0, L + 4)
      })
      y += 12
      paragraph(
        'How the marks are made: the same choice from both of you, or amounts within a tenth of each other, is marked Likely agree. A different choice, a Not sure yet, or amounts further apart is marked Talk about this. The marks are a place to start, not a judgement.',
        F.small,
        MUTED,
        W,
        0
      )
      newPage()
    } else {
      titleBlock('')
    }

    // ---- every subject, one after another
    model.sections.forEach(function (sec, i) {
      var framing = sec.framing ? wrap(be, sec.framing, F.framing, W - 10).length : 0
      if (i > 0 && y > pageTop) y += 18
      ensure(24 + framing * LH + 20 + 90)
      be.text(sec.title, L, y + 14, F.h2, INK, { w: W })
      y += 24
      if (sec.framing) paragraph(sec.framing, F.framing, MUTED, W - 10, 0)
      be.line(L, y + 2, R, y + 2, 0.5, RULE)
      y += 18

      var who = pair.map(function (p, k) {
        return { p: p, i: k }
      })
      var g = sec.gate
      if (g) {
        var gm = combined ? gateMark(g, pair) : ''
        var line = g.ask + '  ' + pair.map(function (p, k) { return (combined ? names[k] + ': ' : '') + yesNo(p.answers[g.key]) + '.' }).join('  ')
        paragraph(line, F.q, INK, W, 0)
        if (gm) badge(gm)
        y += 8
        if (g.hides) {
          var no = who.filter(function (w) { return w.p.answers[g.key] === 'no' })
          var yes = who.filter(function (w) { return w.p.answers[g.key] !== 'no' })
          if (no.length) {
            paragraph(no.map(function (w) { return (combined ? names[w.i] + ': ' : '') + g.noLine + '.' }).join('  '), F.pick, BODY, W, 6)
          }
          if (!yes.length) {
            notes()
            return
          }
          if (no.length) {
            paragraph('Only ' + names[yes[0].i] + ' answered the questions below.', F.small, MUTED, W, 6)
          }
          who = yes
        }
      }
      sec.items.forEach(function (it) {
        var touched = who.some(function (w) {
          var a = w.p.answers
          return (it.textKey && answerText(a[it.textKey])) || (it.choice && a[it.choice.key]) || (it.num && squash(a[it.num.key]))
        })
        question(it, who, combined && who.length === 2 && touched ? itemMark(it, pair) : '')
      })
      notes()
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

  function makePdf(mode) {
    var model = schema()
    var pair = people(mode)
    var P = paper()
    var make = needsImages(everyString(model, pair)) ? imageBackend : textBackend
    // Two passes: the first only counts the pages, so every footer can say "Page 2 of 6".
    var counter = countingBackend(make(P))
    layout(counter, P, model, pair, mode, 0)
    var be = make(P)
    layout(be, P, model, pair, mode, counter.pages())
    return { blob: be.finish(), name: fileName(pair) }
  }

  /** money-conversation-Amina-Omar-2026-10-31.pdf: the names as typed, in any script, and the date. */
  function fileName(pair) {
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
    var raw = squash((pair[0] && pair[0].date) || (pair[1] && pair[1].date) || '')
    var date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : part(raw)
    var names = pair.map(function (p) {
      return part(p.name)
    })
    return [FILE_STEM].concat(names, [date]).filter(Boolean).join('-') + '.pdf'
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
    var holder = button.closest('.finish, .partner') || button.parentNode
    var status = holder.querySelector('.pdf-status')
    var mode = button.getAttribute('data-pdf') === 'combined' ? 'combined' : 'mine'
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      say(status, 'The PDF maker did not load. Reload this page, or print it and choose Save as PDF.')
      return
    }
    var api = window.NiyyahMoneySheet
    if (mode === 'combined' && !(api && api.partner())) {
      say(status, "Add your partner's answers first.")
      return
    }
    // Made and handed over inside the tap itself, so a phone still counts it as the person's own action.
    try {
      deliver(makePdf(mode), status)
    } catch {
      say(status, 'Sorry, the PDF could not be made. You can still print this page.')
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-pdf-button]'), function (button) {
    button.addEventListener('click', function () {
      onPress(button)
    })
  })
})()
