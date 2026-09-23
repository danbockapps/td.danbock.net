import {formatRating, formatResult} from '@/lib/format'
import styles from './PairingList.module.css'

export interface PairingListItem {
  round?: number
  board: number
  white: {name: string; rating: number | null; points?: number} | null
  black: {name: string; rating: number | null; points?: number} | null
  outcome?: string | null
}

function formatPlayer(player: {name: string; rating: number | null; points?: number} | null) {
  if (!player) return 'Bye'
  const points = player.points !== undefined ? `, ${player.points} pts` : ''
  return `${player.name} (${formatRating(player.rating)}${points})`
}

function PairingTable({pairings, showRound}: {pairings: PairingListItem[]; showRound: boolean}) {
  return (
    <>
      {/* Card layout on small screens */}
      <div className="flex flex-col gap-2 sm:hidden">
        {pairings.map((p, i) => (
          <div
            key={`${p.round ?? 0}-${p.board}-${i}`}
            className={`${styles.rowIn} card bg-base-100 border border-base-300 p-3`}
            style={{animationDelay: `${Math.min(i, 12) * 220}ms`}}
          >
            <div className="mb-1 flex items-center justify-between text-xs text-base-content/60">
              <span>
                {showRound && p.round != null ? `Round ${p.round} · ` : ''}Board {p.board}
              </span>
              <span>{formatResult(p.outcome)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{formatPlayer(p.white)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{formatPlayer(p.black)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table layout on larger screens */}
      <div className="hidden sm:block">
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
              <tr
                key={`${p.round ?? 0}-${p.board}-${i}`}
                className={styles.rowIn}
                style={{animationDelay: `${Math.min(i, 12) * 220}ms`}}
              >
                {showRound && <td>{p.round}</td>}
                <td>{p.board}</td>
                <td>{formatPlayer(p.white)}</td>
                <td>{formatPlayer(p.black)}</td>
                <td>{formatResult(p.outcome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
