'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

// ─── Deployment Modal ──────────────────────────────────────────────────────────
function DeploymentModal({
  isOpen,
  elapsed,
  status,
  runUrl,
  onClose,
}: {
  isOpen: boolean
  elapsed: number
  status: 'deploying' | 'idle' | 'error' | 'success'
  runUrl?: string
  onClose: () => void
}) {
  if (!isOpen) return null

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
  }

  // Success
  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-stone-900 border-2 border-green-500/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Build Successful!</h2>
            <p className="text-stone-400 text-sm mb-6">
              GitHub Actions completed the build and deployed to the store.
            </p>
            {runUrl && (
              <a
                href={runUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-4 text-sm text-blue-400 hover:text-blue-300 underline"
              >
                View build logs on GitHub →
              </a>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // In Progress
  const estimatedTotal = 360 // 6 min max for GitHub Actions
  const progress = Math.min((elapsed / estimatedTotal) * 100, 95)

  const steps = [
    { label: 'Queued on GitHub Actions', threshold: 0 },
    { label: 'Installing Node.js + deps', threshold: 20 },
    { label: 'Building Next.js (npm run build)', threshold: 60 },
    { label: 'Uploading site via FTPS', threshold: 180 },
    { label: 'Uploading PHP API via FTPS', threshold: 250 },
    { label: 'Finalizing deployment', threshold: 300 },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-stone-900 border-2 border-[#DC143C]/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#DC143C]/20 mb-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-[#DC143C]/30 rounded-full" />
              <div className="absolute inset-0 border-4 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Building on GitHub Actions</h2>
          <p className="text-stone-400 text-sm">
            Your build is running on GitHub&apos;s servers. No local machine needed!
          </p>
        </div>

        {/* Steps */}
        <div className="bg-stone-800/50 rounded-lg p-4 mb-6 font-mono text-xs space-y-2">
          {steps.map((step, i) => {
            const done = elapsed > (steps[i + 1]?.threshold ?? Infinity)
            const active = elapsed >= step.threshold && !done
            return (
              <div key={i} className="flex items-center gap-2">
                {done
                  ? <span className="text-green-400">✓</span>
                  : active
                    ? <span className="text-yellow-400 animate-pulse">⏳</span>
                    : <span className="text-stone-600">○</span>}
                <span className={done ? 'text-stone-400' : active ? 'text-white' : 'text-stone-600'}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-stone-400">Progress</span>
            <span className="text-white font-semibold">{formatTime(elapsed)}</span>
          </div>
          <div className="h-3 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#DC143C] to-[#b01030] transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          <p className="text-xs text-stone-500 mt-2 text-center">
            Estimated time remaining: ~{formatTime(Math.max(0, 300 - elapsed))}
          </p>
        </div>

        {runUrl && (
          <div className="text-center">
            <a
              href={runUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Watch live on GitHub Actions →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DeployPage() {
  const [deploying, setDeploying] = useState(false)
  const [status, setStatus] = useState<'idle' | 'deploying' | 'error' | 'success'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [deploymentInitiated, setDeploymentInitiated] = useState(false)
  const [runUrl, setRunUrl] = useState<string>('')
  const [lastConclusion, setLastConclusion] = useState<string | null>(null)
  const [failureReason, setFailureReason] = useState<string | null>(null)

  // Token management
  const [tokenInput, setTokenInput] = useState('')
  const [savingToken, setSavingToken] = useState(false)
  const [migratingDb, setMigratingDb] = useState(false)
  const [showTokenSection, setShowTokenSection] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'

  // ── Poll status ──────────────────────────────────────────────────────────────
  useEffect(() => {
    checkStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!deploying) return
    const interval = setInterval(() => {
      checkStatus()
      setElapsed(prev => prev + 3)
    }, 3000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploying, deploymentInitiated])

  const checkStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/deploy/status`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()

      const currentStatus: 'idle' | 'deploying' | 'success' | 'error' =
        data.status === 'deploying' ? 'deploying'
          : data.conclusion === 'success' ? 'success'
            : data.failed ? 'error'
              : 'idle'

      if (data.run_url) setRunUrl(data.run_url)
      if (data.elapsed !== undefined) setElapsed(data.elapsed)
      if (data.conclusion) setLastConclusion(data.conclusion)
      if (data.failure_reason !== undefined) setFailureReason(data.failure_reason)

      setStatus(currentStatus)

      // If we initiated deployment and it's now done
      if (deploymentInitiated && deploying && data.status !== 'deploying') {
        setDeploying(false)
        if (data.failed || (data.conclusion && data.conclusion !== 'success')) {
          setStatus('error')
          setShowModal(false)
          const reason = data.failure_reason || 'Check GitHub Actions for details.'
          toast.error(`Build failed: ${reason}`, { duration: 8000 })
        } else if (data.conclusion === 'success') {
          setStatus('success')
          toast.success('Build completed successfully!')
        }
      }
    } catch {
      // silent
    }
  }

  // ── Trigger deploy ───────────────────────────────────────────────────────────
  const handleRedeploy = async () => {
    if (!confirm('This will trigger a GitHub Actions build. It takes about 3–5 minutes. Continue?')) return

    setDeploying(true)
    setStatus('deploying')
    setElapsed(0)
    setShowModal(true)
    setDeploymentInitiated(false)
    setLastConclusion(null)

    try {
      const meRes = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      if (!meRes.ok) throw new Error('Failed to authenticate')
      const meData = await meRes.json()
      const csrfToken = meData.csrf_token
      if (!csrfToken) throw new Error('CSRF token missing')

      const res = await fetch(`${apiUrl}/admin/deploy/redeploy`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok || data.success) {
        setDeploymentInitiated(true)
        if (data.github_url) setRunUrl(data.github_url)
        toast.success(data.message || 'Build triggered on GitHub Actions!')
        return
      }

      throw new Error(data.message || data.error || 'Failed to trigger build')
    } catch (err: any) {
      setDeploying(false)
      setStatus('error')
      setShowModal(false)
      toast.error(err.message || 'Failed to trigger build')
    }
  }

  // ── Save GitHub token ────────────────────────────────────────────────────────
  const handleRunMigrations = async () => {
    setMigratingDb(true)
    try {
      const meRes = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      const meData = await meRes.json()
      const csrfToken = meData.csrf_token
      const res = await fetch(`${apiUrl}/admin/deploy/migrate-db`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken || '' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        toast.success('Database migration completed.')
      } else {
        toast.error(data.error || 'Migration failed')
      }
    } catch {
      toast.error('Network error running migration')
    } finally {
      setMigratingDb(false)
    }
  }

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      toast.error('Please enter a GitHub token')
      return
    }
    setSavingToken(true)
    try {
      const meRes = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      const meData = await meRes.json()
      const csrfToken = meData.csrf_token

      const res = await fetch(`${apiUrl}/admin/settings/github-token`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('GitHub token saved!')
        setTokenInput('')
        setShowTokenSection(false)
      } else {
        toast.error(data.error || 'Failed to save token')
      }
    } catch {
      toast.error('Network error saving token')
    } finally {
      setSavingToken(false)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <>
      <DeploymentModal
        isOpen={showModal && (deploying || status === 'success')}
        elapsed={elapsed}
        status={status}
        runUrl={runUrl}
        onClose={() => {
          setShowModal(false)
          setStatus('idle')
          setDeploying(false)
          setElapsed(0)
          setDeploymentInitiated(false)
        }}
      />

      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🔁</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Rebuild Store</h1>
            <p className="text-stone-400 text-sm">Powered by GitHub Actions — builds run on GitHub servers</p>
          </div>
        </div>

        {/* Main deploy card */}
        <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-6 backdrop-blur-3xl mb-6">

          {/* Status row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${status === 'deploying' ? 'bg-yellow-400 animate-pulse'
                  : status === 'success' ? 'bg-green-500'
                    : status === 'error' ? 'bg-red-500'
                      : 'bg-stone-600'
                }`} />
              <div>
                <p className="text-sm text-stone-400">Status</p>
                <p className="text-white font-semibold capitalize">
                  {status === 'deploying' ? 'Build in progress…'
                    : status === 'success' ? 'Last build succeeded ✓'
                      : status === 'error' ? `Last build failed (${lastConclusion ?? 'error'})`
                        : 'Idle — ready to build'}
                </p>
              </div>
            </div>
            {runUrl && (
              <a
                href={runUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                View on GitHub Actions
              </a>
            )}
          </div>

          {/* Progress bar when deploying */}
          {status === 'deploying' && !showModal && (
            <div className="mb-6">
              <div className="h-2 bg-stone-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-[#DC143C] transition-all duration-300"
                  style={{ width: `${Math.min((elapsed / 360) * 100, 95)}%` }}
                />
              </div>
              <p className="text-xs text-stone-400">{formatTime(elapsed)} elapsed · GitHub Actions is building…</p>
            </div>
          )}

          {/* Trigger button */}
          <button
            onClick={handleRedeploy}
            disabled={deploying || status === 'deploying'}
            className="flex items-center gap-2 px-6 py-3 bg-[#DC143C] hover:bg-[#b01030] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deploying || status === 'deploying' ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Building… ({formatTime(elapsed)})
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rebuild &amp; Deploy Store
              </>
            )}
          </button>
        </div>

        {/* Info cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-stone-800/30 border border-stone-700/30 rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-2 text-white">📦 When to Rebuild</h2>
            <ul className="space-y-1 text-stone-300 text-sm">
              <li>• After adding a new product</li>
              <li>• After product route changes</li>
              <li>• If a product page redirects to homepage</li>
            </ul>
          </div>
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-2 text-blue-300">🚀 How it Works</h2>
            <ul className="space-y-1 text-stone-300 text-sm">
              <li>• Triggers a GitHub Actions workflow</li>
              <li>• GitHub builds Next.js + bundles PHP vendor</li>
              <li>• Deploys via FTPS (Hostinger blocks GitHub SSH/rsync)</li>
              <li>• Usually takes 4–6 minutes</li>
            </ul>
          </div>
        </div>

        {/* GitHub Secrets reminder */}
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 mb-4">
          <h2 className="text-sm font-semibold mb-2 text-yellow-300">⚙️ GitHub Secrets Required</h2>
          <p className="text-stone-300 text-sm mb-2">
            The following secrets must be set in{' '}
            <a
              href="https://github.com/cybernetsaudi/secrets-store/settings/secrets/actions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              GitHub → Settings → Secrets
            </a>:
          </p>
          <div className="font-mono text-xs bg-stone-900/50 rounded p-3 space-y-1 text-stone-300">
            <div><span className="text-yellow-400">SSH_HOST</span>  = u950050130@145.79.209.14</div>
            <div><span className="text-yellow-400">SSH_PORT</span>  = 65002</div>
            <div><span className="text-yellow-400">SSH_PASS</span>  = Hostinger SSH password</div>
            <div><span className="text-yellow-400">FTP_HOST</span>  = 141.136.39.245</div>
            <div><span className="text-yellow-400">FTP_USER</span>  = u950050130.secrets.gatvia.com</div>
            <div><span className="text-yellow-400">FTP_PASS</span>  = Hostinger FTP password (hPanel → FTP Access)</div>
            <div><span className="text-yellow-400">FTP_REMOTE_ROOT</span> = public_html</div>
            <div><span className="text-yellow-400">NEXT_PUBLIC_API_URL</span> = https://secrets.gatvia.com/api</div>
            <div><span className="text-yellow-400">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span> = pk_live_...</div>
          </div>
        </div>

        <div className="bg-stone-800/30 border border-stone-700/30 rounded-lg p-4 mb-4">
          <h2 className="text-sm font-semibold mb-2 text-white">🗄️ After FTPS deploy</h2>
          <p className="text-stone-400 text-xs mb-3">
            GitHub cannot SSH into Hostinger. After a successful build, run the variant DB migration once (safe to repeat).
          </p>
          <button
            type="button"
            onClick={handleRunMigrations}
            disabled={migratingDb}
            className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {migratingDb ? 'Running migration…' : 'Run DB migration'}
          </button>
        </div>

        {/* GitHub Token section */}
        <div className="bg-stone-800/30 border border-stone-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white">🔑 GitHub Deploy Token</h2>
            <button
              onClick={() => setShowTokenSection(!showTokenSection)}
              className="text-xs text-stone-400 hover:text-white transition-colors"
            >
              {showTokenSection ? 'Hide' : 'Update token'}
            </button>
          </div>
          <p className="text-stone-400 text-xs mb-3">
            Use a Personal Access Token from the <strong className="text-stone-300">cybernetsaudi</strong> GitHub account
            (repo <code className="text-stone-400">cybernetsaudi/secrets-store</code>). Do not use iwaqasmaqbool for Secrets.
            Stored securely in the server database (never in the code).
          </p>
          {showTokenSection && (
            <div className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="ghp_..."
                className="flex-1 bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#DC143C]"
              />
              <button
                onClick={handleSaveToken}
                disabled={savingToken}
                className="px-4 py-2 bg-[#DC143C] hover:bg-[#b01030] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {savingToken ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
