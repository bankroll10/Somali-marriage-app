import type { Dispatch } from 'react'
import { Button } from '../../components/ui'
import { openLinks, type Action, type Session } from './flow'
import { fill, peopleFor } from './fixtures'
import type { Person } from './types'

/**
 * The simulated other person, and nothing else that is simulated.
 *
 * This is the only place that reads what the made-up people have chosen. It is
 * a tester's panel, labelled as not part of the product: in a product none of
 * this would be visible, and the other person would act for themselves. Each
 * button is one explicit action by one made-up person. Nothing here acts on
 * its own, and nothing is delivered anywhere.
 */

type Where = 'suggestions' | 'suggestion' | 'people' | 'conversation'

export function ControlsPanel({ s, dispatch, where, person }: { s: Session; dispatch: Dispatch<Action>; where: Where; person?: Person }) {
  const people = s.me.side ? peopleFor(s.me.side) : []
  const shown = s.shown.map((id) => people.find((p) => p.id === id)!).filter(Boolean)
  const subjects = person ? [person] : where === 'suggestions' || where === 'people' ? shown : []
  return (
    <details className="mt-10 rounded-card border border-dashed border-gold/60 bg-gold/[0.06]">
      <summary className="cursor-pointer px-4 py-3 text-[0.92rem] font-medium text-ink">
        Try another scenario
      </summary>
      <div className="px-4 pb-4">
        <p className="text-[0.86rem] leading-snug text-muted text-pretty">
          These buttons play the made-up people, so you can see what happens when someone chooses you, writes back, shares a photo or ends a conversation. Nobody real is involved.
        </p>
        {subjects.map((p) => {
          const t = (x: string) => fill(x, p.side, p.firstName)
          const they = s.they[p.id]
          const link = s.links[p.id]
          return (
            <div key={p.id} className="mt-4 rounded-2xl border border-line bg-white/60 px-4 py-3">
              <p className="font-medium text-ink">{p.firstName} (made up)</p>
              {!link && (
                <label className="mt-2 flex min-h-11 items-center gap-3 text-[0.92rem] text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-forest"
                    checked={they?.interestedInYou ?? false}
                    onChange={(e) => dispatch({ type: 'theyChoose', person: p.id, on: e.target.checked })}
                  />
                  {t('Simulate: {name} has chosen you')}
                </label>
              )}
              {link?.status === 'open' && (
                <div className="mt-2 grid gap-2">
                  {p.replies.map((line) => (
                    <Button key={line} variant="outline" className="!rounded-2xl !px-4 !py-2.5 !text-left" onClick={() => dispatch({ type: 'theySend', person: p.id, text: line })}>
                      {`Simulate: ${p.firstName} writes “${line}”`}
                    </Button>
                  ))}
                  <label className="flex min-h-11 items-center gap-3 text-[0.92rem] text-ink-soft">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-forest"
                      checked={they?.sharePhoto ?? false}
                      onChange={(e) => dispatch({ type: 'theyShare', person: p.id, on: e.target.checked })}
                    />
                    {t('Simulate: {name} shares {his} photo with you (a placeholder)')}
                  </label>
                  <Button variant="outline" className="!px-4 !py-2.5" onClick={() => dispatch({ type: 'theyEnd', person: p.id })}>
                    {t('Simulate: {name} ends the conversation')}
                  </Button>
                </div>
              )}
              {link && link.status !== 'open' && <p className="mt-2 text-[0.88rem] text-muted">Conversation ended in this tab.</p>}
            </div>
          )
        })}
        {where === 'conversation' && openLinks(s).length > 1 && (
          <p className="mt-3 text-[0.82rem] text-muted">Photo sharing is per conversation: what you do here changes nothing in your other conversations.</p>
        )}
      </div>
    </details>
  )
}
