import { useEffect, useReducer, useRef, useState } from 'react'
import { TextButton } from '../../components/ui'
import { FocusHeading } from '../../hooks/useFocusHeading'
import { initial, reduce } from './flow'
import { Conversation } from './screens/Connect'
import { Notes } from './screens/Notes'
import { About, Front, Point, Review, Words } from './screens/Setup'
import { People, Suggestion, Suggestions } from './screens/Browse'

/**
 * The public demo (docs/MATCH-PROTOTYPE.md): one page, one reducer, in memory.
 * Built by its own config into /demo/ (vite.demo.config.ts), apart from the app.
 * It reads no storage and sends nothing, and its headers say so to the browser
 * (netlify.toml, tests/demo-site.test.ts).
 */
export default function MatchPrototype() {
  const [s, dispatch] = useReducer(reduce, undefined, initial)
  const ref = useRef<HTMLDivElement>(null)
  // A message not yet sent, for each person. Held here so that looking at their profile and coming back does not lose it;
  // it is cleared by Start again and, like everything else, by a reload.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  useEffect(() => {
    if (s.stage === 'front') setDrafts((d) => (Object.keys(d).length ? {} : d))
  }, [s.stage])

  const screen = (() => {
    switch (s.stage) {
      case 'front':
        return <Front dispatch={dispatch} />
      case 'about':
        return <About s={s} dispatch={dispatch} />
      case 'point':
        return <Point s={s} dispatch={dispatch} />
      case 'words':
        return <Words s={s} dispatch={dispatch} />
      case 'review':
        return <Review s={s} dispatch={dispatch} />
      case 'suggestions':
        return <Suggestions s={s} dispatch={dispatch} />
      case 'suggestion':
        return <Suggestion s={s} dispatch={dispatch} />
      case 'people':
        return <People s={s} dispatch={dispatch} />
      case 'conversation':
        return <Conversation s={s} dispatch={dispatch} draft={drafts[s.focus ?? ''] ?? ''} setDraft={(text) => s.focus && setDrafts((d) => ({ ...d, [s.focus!]: text }))} />
      case 'notes':
        return <Notes dispatch={dispatch} from={s.from} />
    }
  })()

  return (
    <div className="min-h-dvh bg-cream">
      <div className="border-b border-gold/50 bg-gold/10 px-5 py-2.5 text-center text-[0.84rem] leading-snug text-ink-soft sm:px-6">
        <p>
          <strong className="font-medium text-ink">Demo</strong> · Fictional people. Your demo answers and messages stay in this tab and clear when you refresh.
          {s.stage !== 'notes' && (
            <>
              {' '}
              <TextButton className="text-forest underline" onClick={() => dispatch({ type: 'go', stage: 'notes' })}>
                What’s real here?
              </TextButton>
            </>
          )}
          {s.stage !== 'front' && s.stage !== 'notes' && (
            <>
              {' '}
              <TextButton className="text-forest underline" onClick={() => dispatch({ type: 'reset' })}>
                Start again
              </TextButton>
            </>
          )}{' '}
          <a href="/" className="inline-flex min-h-11 items-center px-2 text-forest underline underline-offset-4">
            Leave the demo
          </a>
        </p>
      </div>
      <div key={`${s.stage}:${s.focus ?? ''}:${s.stage === 'point' ? s.point : ''}`} ref={ref}>
        {screen}
        <FocusHeading within={ref} />
      </div>
    </div>
  )
}
