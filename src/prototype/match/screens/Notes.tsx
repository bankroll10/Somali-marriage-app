import type { Dispatch } from 'react'
import { Button } from '../../../components/ui'
import type { Action, Stage } from '../flow'
import { H1, H2, P, Screen } from '../parts'

const WORKING = [
  'The forms, and what requirement, preference and doesn’t matter each do.',
  'Eligibility in both directions, the limit of three, and no refill.',
  'Where your answers line up with a person’s and where they differ, worked out from the answers you give.',
  'Private interest, and a conversation that opens only when both of you have chosen.',
  'Writing first from either side, kept in this tab.',
  'Photo sharing: per conversation, per direction, and only by an explicit choice.',
  'Disconnect, block and report, as changes to this tab’s state.',
  'Keyboard use, focus, and narrow screens.',
]

const SIMULATED = [
  'The other people: ten made-up fixtures, with fictional names and adult fictional ages.',
  'What they choose, write and share. The Prototype controls do it, one explicit action at a time.',
  'The plain-language summary and the questions worth asking: fixed text under a “Prototype fixture” label, written for one sample scenario each. No AI model is called. If you change your answers the text is marked unavailable; it never claims something your answers no longer say.',
  'Messages: nothing is delivered. Notifications: none, including the one a disconnect would send.',
  'Photos: placeholder tiles only. There is no upload and no image.',
  'Moderation: a report is recorded in this tab and nobody receives or reviews it. A block holds in this tab and nothing else.',
  'Identity, age checks and accounts: none. Storage: none. A reload clears everything.',
]

const NOT_COVERED = [
  'Age is shown but not used. Age preferences are not built in this slice, so eligibility here does not cover every requirement a real product would need.',
  'The six points (timing, children, practice, city, work, household) are provisional prototype choices, not launch policy. Some topics, such as clan, mahr, plans to move back and how families would disagree, are left out because the research ledger keeps them as conversations that never become matching signals.',
  'The choice of which three people are shown is a fixed order among those who are eligible. It is not a selection policy.',
  'Launch questions (identity, retention, moderation operations, vendor terms, admission size, and more) are recorded in docs/MATCH-PROTOTYPE.md and are not answered here.',
]

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 list-disc pl-5 text-[0.97rem] leading-relaxed text-ink-soft">
      {items.map((x) => (
        <li key={x} className="mt-1.5 text-pretty">
          {x}
        </li>
      ))}
    </ul>
  )
}

export function Notes({ dispatch, from }: { dispatch: Dispatch<Action>; from: Stage }) {
  return (
    <Screen onBack={() => dispatch({ type: 'go', stage: from === 'notes' ? 'front' : from })}>
      <H1>What is real here, and what is not.</H1>
      <P>This is a prototype of the way meeting someone could work. It shows the interactions. It is not a service.</P>
      <H2>Real, and working</H2>
      <List items={WORKING} />
      <H2>Simulated</H2>
      <List items={SIMULATED} />
      <H2>Not covered, and not decided</H2>
      <List items={NOT_COVERED} />
      <div className="mt-8">
        <Button variant="outline" onClick={() => dispatch({ type: 'reset' })}>
          Start again
        </Button>
      </div>
    </Screen>
  )
}
