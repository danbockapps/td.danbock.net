'use client'

import {submitResult} from '@/app/admin/(protected)/tournaments/[slug]/actions'
import {useState, useTransition} from 'react'

const OUTCOMES = [
  {value: 'white', label: '1-0'},
  {value: 'black', label: '0-1'},
  {value: 'draw', label: '½-½'},
  {value: 'white_forfeit', label: '0-1 (forfeit)'},
  {value: 'black_forfeit', label: '1-0 (forfeit)'},
  {value: 'double_forfeit', label: '0-0 (double forfeit)'},
]

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
          <option value="" disabled>
            Select result
          </option>
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
    </tr>
  )
}
