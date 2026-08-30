import {formatRating, formatResult} from '@/lib/format'

export interface PairingListItem {
  round?: number
  board: number
  white: {name: string; rating: number | null} | null
  black: {name: string; rating: number | null} | null
  outcome?: string | null
}

function PairingTable({pairings, showRound}: {pairings: PairingListItem[]; showRound: boolean}) {
  return (
    <table className="table">
      <thead>
        <tr>
          {showRound && <th>Round</th>}
          <th>Board</th>
          <th>White</th>
          <th>Black</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        {pairings.map((p, i) => (
          <tr key={`${p.round ?? 0}-${p.board}-${i}`}>
            {showRound && <td>{p.round}</td>}
            <td>{p.board}</td>
            <td>{p.white ? `${p.white.name} (${formatRating(p.white.rating)})` : 'Bye'}</td>
            <td>{p.black ? `${p.black.name} (${formatRating(p.black.rating)})` : 'Bye'}</td>
            <td>{formatResult(p.outcome)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PairingList({
  pairings,
  showRound = false,
}: {
  pairings: PairingListItem[]
  showRound?: boolean
}) {
  if (pairings.length === 0) {
    return <p className="text-base-content/60">No pairings yet.</p>
  }

  if (!showRound) {
    return (
      <div className="overflow-x-auto">
        <PairingTable pairings={pairings} showRound={false} />
      </div>
    )
  }

  const rounds = Array.from(new Set(pairings.map((p) => p.round))).sort(
    (a, b) => (a ?? 0) - (b ?? 0),
  )

  return (
    <div className="flex flex-col gap-8">
      {rounds.map((round) => (
        <div key={round} className="overflow-x-auto">
          <h3 className="mb-2 font-semibold">Round {round}</h3>
          <PairingTable pairings={pairings.filter((p) => p.round === round)} showRound={false} />
        </div>
      ))}
    </div>
  )
}
