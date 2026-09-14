'use client'

import {submitResult} from '@/app/admin/(protected)/tournaments/[slug]/actions'
import {RESULT_OUTCOMES, RESULT_OUTCOME_LABELS} from '@/lib/results'
import {useState, useTransition} from 'react'

export function ResultRow({
  pairingId,
  board,
  whiteLabel,
  blackLabel,
  initialOutcome,
}: {
  pairingId: number
  board: number
  whiteLabel: string
  blackLabel: string
  initialOutcome: string | null
}) {
  const [outcome, setOutcome] = useState(initialOutcome ?? '')
  const [pending, startTransition] = useTransition()

  function submit(value: string) {
    setOutcome(value)
    startTransition(async () => {
      await submitResult(pairingId, value)
    })
  }

  return (
    <tr>
      <td>{board}</td>
      <td>{whiteLabel}</td>
      <td>{blackLabel}</td>
      <td>
        <select
          className="select select-sm"
          value={outcome}
          disabled={pending}
          onChange={(e) => submit(e.target.value)}
        >
          <option value="">No result</option>
          {RESULT_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {RESULT_OUTCOME_LABELS[o]}
            </option>
          ))}
        </select>
      </td>
    </tr>
  )
}
