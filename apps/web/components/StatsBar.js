'use client'

export default function StatsBar({ stats }) {
  const items = [
    { label: 'Total Players', value: stats?.totalPlayers || 0 },
    { label: 'Total Volume', value: `$${Number(stats?.totalVolume || 0).toLocaleString()}` },
    { label: 'Total Traders', value: stats?.totalTraders || 0 },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface-200 border border-surface-300 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-white">{item.value}</p>
          <p className="text-sm text-gray-500 mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
