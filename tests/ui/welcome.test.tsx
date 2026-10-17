// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import Welcome from '../../src/components/Welcome'
import Talking from '../../src/components/Talking'
import { familyScript } from '../../src/data/families'
import { mount, type Mounted } from '../support/render'

/**
 * The first screen (docs/DECISIONS.md Part 25, release R3, then release R4):
 * a headline that says what Niyyah is for, a way into a clearly labelled
 * fictional demo, the existing tools for someone already considering a person,
 * and a way to manage an earlier introduction request. Real introductions and
 * messaging are not open, and nothing here implies matching that works or
 * members who are there. A promise about privacy is the one thing that must not
 * outrun the code (docs/PRIVACY.md): the eleven is sent to another person on
 * purpose, so neither "No one else sees it" nor "Private to you" is true of the
 * page as a whole.
 */

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

const props = () => ({
  onBegin: vi.fn(),
  onLooking: vi.fn(),
  onTalking: vi.fn(),
  onResume: vi.fn(),
  onEnter: vi.fn(),
  hasProgress: false,
  completed: false,
})

describe('Welcome', () => {
  it('leads with meeting, learning about each other and deciding about marriage, starting in Minneapolis–St. Paul', async () => {
    screen = await mount(<Welcome {...props()} />)
    const text = screen.text()
    expect(screen.container.querySelector('h1')?.textContent).toBe('Meet with marriage in mind.')
    expect(text).toContain('We’re building Niyyah to help Somali singles meet, learn about each other, and decide about marriage. Starting with Minneapolis–St. Paul.')
    expect(text).not.toMatch(/Think marriage through/)
  })

  it('offers the fictional demo first, as a link to /demo/, and says what it is and what is not open, once', async () => {
    screen = await mount(<Welcome {...props()} />)
    const demo = screen.container.querySelector('a[href="/demo/"]') as HTMLAnchorElement
    expect(demo).not.toBeNull()
    expect(demo.textContent).toMatch(/^Explore the demo/)
    expect(screen.has(/^Explore the demo/)).toBe(true)
    // First in reading and tab order among the controls.
    const first = screen.container.querySelector('a[href], button')
    expect(first).toBe(demo)
    const text = screen.text()
    expect(text).toContain('Try the experience with fictional people. Real introductions and messaging aren’t open yet.')
    // The closed status is said once on this screen: no second paragraph repeating it.
    expect(text.match(/aren’t open|not available|are closed|isn’t open/g)).toHaveLength(1)
    expect(text).not.toMatch(/New introduction requests are closed/)
  })

  it('keeps the existing tools as the second door, with the same handler, and the quieter paths', async () => {
    screen = await mount(<Welcome {...props()} />)
    const text = screen.text()
    expect(text).toContain('Already considering someone?')
    expect(text).toContain('Explore tools for the conversations and decisions ahead.')
    for (const name of [/^Use the tools/, 'Start where you are', /Manage an earlier introduction request/, /Bring your map back/]) {
      expect(screen.has(name), String(name)).toBe(true)
    }
    for (const gone of [/I’m looking for someone serious/, /See how introductions work/, /Choose where to start/]) expect(screen.has(gone), String(gone)).toBe(false)
  })

  it('claims no members, no open introductions, no working AI and no date', async () => {
    screen = await mount(<Welcome {...props()} />)
    const text = screen.text()
    expect(text).not.toMatch(/\bAI\b|artificial|algorithm|your matches|matched with|available (members|singles|people)|members (near|in|you)|browse (members|profiles)|waitlist|sign up/i)
    expect(text).not.toMatch(/Meet someone serious|founder-led|made by hand|founder speaks with you|looking for someone serious|See how introductions work/i)
    expect(text).not.toMatch(/\b(soon|opens|launch|coming)\b/i)
  })

  it('sends the tools door where it did, the map path where it says, and an earlier request to its screen', async () => {
    const p = props()
    screen = await mount(<Welcome {...p} />)
    await screen.press(/Manage an earlier introduction request/)
    expect(p.onLooking).toHaveBeenCalledTimes(1)
    await screen.press(/^Use the tools/)
    expect(p.onTalking).toHaveBeenCalledTimes(1)
    await screen.press('Start where you are')
    expect(p.onBegin).toHaveBeenCalledTimes(1)
    expect(p.onEnter).not.toHaveBeenCalled()
  })

  it('offers resuming only to someone with progress, and Enter to someone finished; the demo is offered to all', async () => {
    screen = await mount(<Welcome {...props()} />)
    expect(screen.has('Pick up where you left off')).toBe(false)
    expect(screen.container.querySelector('a[href="/demo/"]')).not.toBeNull()
    screen.unmount()
    screen = await mount(<Welcome {...props()} hasProgress />)
    expect(screen.has('Pick up where you left off')).toBe(true)
    expect(screen.container.querySelector('a[href="/demo/"]')).not.toBeNull()
    screen.unmount()
    screen = await mount(<Welcome {...props()} completed />)
    expect(screen.has(/^Enter Niyyah/)).toBe(true)
    expect(screen.container.querySelector('a[href="/demo/"]')).not.toBeNull()
    // A returning member can still reach an earlier request.
    expect(screen.has(/Manage an earlier introduction request/)).toBe(true)
  })

  it('makes no completion-time claim and no blanket privacy claim', async () => {
    screen = await mount(<Welcome {...props()} />)
    const text = screen.text()
    expect(text).not.toMatch(/two minutes/i)
    expect(text).not.toMatch(/No one else sees it/i)
    expect(text).not.toMatch(/Private to you/i)
    expect(text).not.toMatch(/What’s in your way/)
    // What it says instead is scoped to what the code does.
    expect(text).toMatch(/stays on your phone unless you choose to send something, such as questions for the person you are talking to/)
    // The step count is on unless she turns it off (Trust, "Tell us which steps you reach"), so the page says it counts steps.
    expect(text).toMatch(/counts which steps people reach, in one word each and never in your words; you can turn that off under Your privacy/)
    expect(text).not.toMatch(/founder reads|your name for an introduction/)
  })
})

describe('Talking', () => {
  it('explains its three options without needing the product’s own terms first', async () => {
    const go = { onRead: vi.fn(), onBeforeYes: vi.fn(), onFamilies: vi.fn(), onBack: vi.fn() }
    screen = await mount(<Talking {...go} />)
    const text = screen.text()
    expect(text).not.toMatch(/introduction/i)
    expect(text).not.toMatch(/\bthe read\b|\bget a read\b|the eleven/i)
    await screen.press(/I can’t tell what they mean yet/)
    await screen.press(/We’re getting serious/)
    await screen.press(/The families are coming in/)
    expect(go.onRead).toHaveBeenCalledTimes(1)
    expect(go.onBeforeYes).toHaveBeenCalledTimes(1)
    expect(go.onFamilies).toHaveBeenCalledTimes(1)
  })
})

describe('Talking: the family-script invitation is true of the scripts that exist', () => {
  it('says the sentences are for your own family, for the other person and for when the families meet — and each has a script', async () => {
    const go = { onRead: vi.fn(), onBeforeYes: vi.fn(), onFamilies: vi.fn(), onBack: vi.fn() }
    screen = await mount(<Talking {...go} />)
    expect(screen.text()).toContain('Word-for-word sentences to say aloud — to your own family, to the other person, and for when the families meet.')
    // To her own family, to the other person, and for the two families meeting (src/data/families.ts).
    expect(familyScript('tell-wali-online', 'woman')).toBeDefined()
    expect(familyScript('send-his-people', 'woman')).toBeDefined()
    expect(familyScript('open-mahr-and-living', 'woman')).toBeDefined()
    expect(familyScript('families-meet', 'woman')).toBeDefined()
  })
})
