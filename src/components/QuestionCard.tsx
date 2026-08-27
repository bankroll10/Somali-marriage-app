import type { AnswerValue, Option, Question } from '../types'
import { fieldClass } from './ui'

interface Props {
  question: Question
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
}

export default function QuestionCard({ question, value, onChange }: Props) {
  return (
    <div>
      <h2 className="font-display text-[1.6rem] font-medium leading-snug tracking-tight text-ink text-balance sm:text-[1.9rem]">
        {question.prompt}
      </h2>
      {question.helper && (
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted text-pretty">
          {question.helper}
        </p>
      )}

      <div className="mt-7">
        {question.type === 'single' && (
          <SingleChoice question={question} value={value as string} onChange={onChange} />
        )}
        {question.type === 'multi' && (
          <MultiChoice question={question} value={(value as string[]) ?? []} onChange={onChange} />
        )}
        {question.type === 'scale' && (
          <Scale question={question} value={value as number} onChange={onChange} />
        )}
        {question.type === 'text' && (
          <TextAnswer question={question} value={(value as string) ?? ''} onChange={onChange} />
        )}
      </div>
    </div>
  )
}

function OptionRow({
  option,
  selected,
  onClick,
  index,
  kind,
}: {
  option: Option
  selected: boolean
  onClick: () => void
  index: number
  kind: 'radio' | 'check'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${index * 45}ms` }}
      className={`animate-rise group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 ${
        selected
          ? 'border-forest bg-forest text-cream shadow-lift'
          : 'border-line bg-white/50 text-ink hover:border-forest/40 hover:bg-white'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center border transition-colors ${
          kind === 'radio' ? 'rounded-full' : 'rounded-md'
        } ${selected ? 'border-gold-soft bg-gold-soft/20' : 'border-line group-hover:border-forest/40'}`}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12.5 10 17.5 19 6.5"
              stroke="var(--color-gold-soft)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.98rem] font-medium leading-snug">{option.label}</span>
        {option.hint && (
          <span
            className={`mt-1 block text-[0.83rem] leading-snug ${selected ? 'text-cream/70' : 'text-muted'}`}
          >
            {option.hint}
          </span>
        )}
      </span>
    </button>
  )
}

function SingleChoice({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string | undefined
  onChange: (v: AnswerValue) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {question.options?.map((opt, i) => (
        <OptionRow
          key={opt.id}
          option={opt}
          index={i}
          kind="radio"
          selected={value === opt.id}
          onClick={() => onChange(opt.id)}
        />
      ))}
    </div>
  )
}

function MultiChoice({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string[]
  onChange: (v: AnswerValue) => void
}) {
  const max = question.max ?? Infinity
  const atMax = value.length >= max

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else if (!atMax) {
      onChange([...value, id])
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {question.options?.map((opt, i) => {
        const selected = value.includes(opt.id)
        const disabled = !selected && atMax
        return (
          <div key={opt.id} className={disabled ? 'opacity-45 transition-opacity' : ''}>
            <OptionRow
              option={opt}
              index={i}
              kind="check"
              selected={selected}
              onClick={() => toggle(opt.id)}
            />
          </div>
        )
      })}
      {question.max && (
        <p className="mt-1 text-right text-xs text-muted">
          {value.length} / {question.max} chosen
        </p>
      )}
    </div>
  )
}

function Scale({
  question,
  value,
  onChange,
}: {
  question: Question
  value: number | undefined
  onChange: (v: AnswerValue) => void
}) {
  const s = question.scale!
  const steps = []
  for (let i = s.min; i <= s.max; i++) steps.push(i)

  return (
    <div className="animate-rise rounded-2xl border border-line bg-white/50 p-6">
      <div className="flex items-center justify-between gap-2">
        {steps.map((step) => {
          const active = value === step
          return (
            <button
              key={step}
              type="button"
              onClick={() => onChange(step)}
              aria-label={`${step}`}
              className={`flex h-12 flex-1 items-center justify-center rounded-xl text-[0.95rem] font-medium transition-all duration-200 ${
                active
                  ? 'bg-forest text-cream shadow-lift'
                  : 'bg-sand/60 text-ink-soft hover:bg-sand'
              }`}
            >
              {step}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[0.82rem] text-muted">
        <span>{s.minLabel}</span>
        <span className="text-right">{s.maxLabel}</span>
      </div>
    </div>
  )
}

function TextAnswer({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string
  onChange: (v: AnswerValue) => void
}) {
  return (
    <div className="animate-rise">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        rows={5}
        className={`w-full resize-none p-4 text-[1rem] leading-relaxed ${fieldClass}`}
      />
      {question.optional && (
        <p className="mt-2 text-xs text-muted">Optional — but worth it.</p>
      )}
    </div>
  )
}
