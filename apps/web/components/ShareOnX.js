'use client'

export default function ShareOnX({ text, url, via = 'KickStock_XL' }) {
  const params = new URLSearchParams()
  if (text) params.set('text', text)
  if (url) params.set('url', url)
  if (via) params.set('via', via)

  const intentUrl = `https://twitter.com/intent/tweet?${params.toString()}`

  function handleClick() {
    window.open(intentUrl, '_blank', 'width=550,height=420,noopener,noreferrer')
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 bg-surface-200 border border-surface-300 hover:border-accent-green/40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Share on X
    </button>
  )
}
