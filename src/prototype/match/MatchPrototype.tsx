import { useReducer, useRef } from 'react'
import { TextButton } from '../../components/ui'
import { FocusHeading } from '../../hooks/useFocusHeading'
import { initial, reduce } from './flow'
import { Conversation } from './screens/Connect'
import { Notes } from './screens/Notes'
import { About, Front, Point, Review, Words } from './screens/Setup'
import { People, Suggestion, Suggestions } from './screens/Browse'

/**
 * The matching prototype (docs/MATCH-PROTOTYPE.md): one page, one reducer, in
 * memory. Opened only from match.html in development; `vite build` never
 * reaches it. It reads no storage and sends nothing.
 */
export default function MatchPrototype() {
  const [s, dispatch] = useReducer(reduce, undefined, initial)
  const ref = useRef<HTMLDivElement>(null)

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
        return <Conversation s={s} dispatch={dispatch} />
      case 'notes':
        return <Notes dispatch={dispatch} from={s.from} />
    }
  })()

  return (
    <div className="min-h-dvh bg-cream">
      <div className="border-b border-gold/50 bg-gold/10 px-5 py-2.5 text-center text-[0.84rem] leading-snug text-ink-soft sm:px-6">
        <p>
          <strong className="font-medium text-ink">Prototype.</strong> The people here are made up. Nothing you type is saved or sent.
          {s.stage !== 'notes' && (
            <>
              {' '}
              <TextButton className="text-forest underline" onClick={() => dispatch({ type: 'go', stage: 'notes' })}>
                What is real here
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
          )}
        </p>
      </div>
      <div key={`${s.stage}:${s.focus ?? ''}:${s.stage === 'point' ? s.point : ''}`} ref={ref}>
        {screen}
        <FocusHeading within={ref} />
      </div>
    </div>
  )
}
