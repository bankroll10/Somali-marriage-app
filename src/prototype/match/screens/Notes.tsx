import type { Dispatch } from 'react'
import { Button } from '../../../components/ui'
import type { Action, Stage } from '../flow'
import { H1, H2, P, Screen } from '../parts'

const REAL = [
  'This is a demonstration with fictional people.',
  'Suggestions use fixed rules and sample profiles.',
  'Summaries and suggested questions are prewritten examples. No AI model generates them here.',
  'Messages, photo sharing, blocking and reporting are simulated. No person receives a message or report.',
  'Use made-up answers. Don’t enter personal or contact information.',
]

const WORKING = [
  'The forms, and what requirement, preference and doesn’t matter each do.',
  'Eligibility in both directions, the limit of three, and no refill.',
  'Age works like the six points. Your own age is kept apart from the ages you would consider in a partner, which you give as a youngest and an oldest age (both included) and as a requirement, a preference or doesn’t matter. A requirement leaves out anyone outside the range, in both directions. A preference shows the person and points out the difference. Doesn’t matter ignores your range, and your own age is still checked against what others require.',
  'Where a person’s answers fit what you asked for and where they differ, worked out from the answers you give.',
  'Private interest, withdrawing it until a conversation exists, undoing “Not for me” straight away, and a conversation that opens only when both of you have chosen.',
  'Writing first from either side, kept in this tab.',
  'Photo sharing: per conversation, per direction, and only by an explicit choice.',
  'Disconnect, block and report, as changes to this tab’s state.',
  'Keyboard use, focus, and narrow screens.',
]

const SIMULATED = [
  'The other people: ten made-up fixtures, with fictional names, adult fictional ages and their own made-up choices about the ages they would consider.',
  'What they choose, write and share. The “Try another scenario” controls do it, one explicit action at a time.',
  'The plain-language summary and the questions worth asking: prewritten examples under a “Demo example” label, written for one sample scenario each. No AI model generates them. If you change your answers the text is marked unavailable; it never claims something your answers no longer say.',
  'Messages: nothing is delivered. Notifications: none, including the one a disconnect would send.',
  'Photos: placeholder tiles only. There is no upload and no image.',
  'Moderation: a report is recorded in this tab and nobody receives or reviews it. A block holds in this tab and nothing else.',
  'Identity, age checks and accounts: none. Storage: none. A reload clears everything.',
]

const NOT_COVERED = [
  'Ages from 18 to 99 are the limits of this demo, not a policy. No age is checked or verified: the demo takes whatever made-up age you give it. A real service would have to decide its own limits, how to check them, and whether a person may be introduced across them.',
  'Eligibility here reads age and the six points only, so it does not cover every requirement a real product would need.',
  'The six points (timing, children, practice, city, work, household) are provisional demo choices, not policy. Some topics, such as clan, mahr, plans to move back and how families would disagree, are left out: they are conversations for two people, not signals for sorting them.',
  'The choice of which three people are shown is a fixed order among those who are eligible. It is not a selection policy.',
  'Questions a real service would have to answer first, such as identity checks, moderation and who is admitted, are not answered here.',
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
      <H1>What’s real here?</H1>
      <List items={REAL} />
      <P>
        It shows how meeting someone could work. It is not a service: real introductions and messaging aren’t open yet. Your private tools (the map, the read, the
        eleven, the Guide) are not used here, and nothing here is added to them.
      </P>
      <H2>In more detail: what works as described</H2>
      <List items={WORKING} />
      <H2>What is simulated</H2>
      <List items={SIMULATED} />
      <H2>What isn’t covered, and isn’t decided</H2>
      <List items={NOT_COVERED} />
      <div className="mt-8">
        <Button variant="outline" onClick={() => dispatch({ type: 'reset' })}>
          Start again
        </Button>
      </div>
    </Screen>
  )
}
