'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface DiagnosticsData {
  timestamp: string
  server_info: {
    os: string
    php_version: string
    server_software: string
    document_root: string
    user: string
    home: string
    pwd: string
  }
  php_info: {
    version: string
    sapi: string
    memory_limit: string
    max_execution_time: string
    disabled_functions: string[]
    available_functions: {
      proc_open: boolean
      shell_exec: boolean
      exec: boolean
      system: boolean
      passthru: boolean
      popen: boolean
    }
  }
  command_execution: {
    proc_open: {
      available: boolean
      works: boolean
      output: string | null
      error: string | null
    }
    shell_exec: {
      available: boolean
      works: boolean
      output: string | null
      error: string | null
    }
    exec: {
      available: boolean
      works: boolean
      output: string | null
      error: string | null
    }
  }
  nodejs_info: {
    available: boolean
    version: string | null
    path: string | null
    npm_available: boolean
    npm_version: string | null
    nvm_available: boolean
    nvm_path: string | null
  }
  file_system: {
    home_dir: string
    home_exists: boolean
    home_writable: boolean
    temp_dir: string
    temp_writable: boolean
    frontend_source: string | null
    frontend_exists: boolean
    frontend_writable: boolean
    deploy_script: string | null
    deploy_script_exists: boolean
    deploy_script_executable: boolean
  }
  memory_info: {
    php_memory_limit: string
    php_memory_usage: number
    php_peak_memory: number
    system_memory?: string
    ulimits?: string
  }
  build_capabilities: {
    can_build: boolean
    can_install_dependencies: boolean
    webassembly_support: boolean
    test_results: string[]
  }
  recommendations: Array<{
    level: 'critical' | 'warning' | 'info'
    issue: string
    solution: string
  }>
}

export default function ServerDiagnosticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DiagnosticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDiagnostics()
  }, [])

  const loadDiagnostics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/server/diagnostics`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to load diagnostics')
      }

      const diagnosticsData = await response.json()
      setData(diagnosticsData)
    } catch (err: any) {
      setError(err.message || 'Failed to load server diagnostics')
      toast.error('Failed to load diagnostics')
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">✓ Available</span>
    ) : (
      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">✗ Not Available</span>
    )
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-900/20 border-red-700/30 text-red-300'
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-700/30 text-yellow-300'
      case 'info':
        return 'bg-blue-900/20 border-blue-700/30 text-blue-300'
      default:
        return 'bg-stone-800/30 border-stone-700/30 text-stone-300'
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#DC143C] border-t-transparent"></div>
          <p className="mt-4 text-stone-400">Loading server diagnostics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadDiagnostics}
            className="px-4 py-2 bg-[#DC143C] hover:bg-[#b01030] text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Server Diagnostics</h1>
        <button
          onClick={loadDiagnostics}
          className="px-4 py-2 bg-[#DC143C] hover:bg-[#b01030] text-white rounded-lg text-sm"
        >
          Refresh
        </button>
      </div>

      <p className="text-stone-400 text-sm mb-6">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </p>

      {/* Server Information */}
      <div className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Server Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-stone-400 text-sm">Operating System</p>
            <p className="text-white font-mono">{data.server_info.os}</p>
          </div>
          <div>
            <p className="text-stone-400 text-sm">PHP Version</p>
            <p className="text-white font-mono">{data.server_info.php_version}</p>
          </div>
          <div>
            <p className="text-stone-400 text-sm">Server Software</p>
            <p className="text-white font-mono text-sm">{data.server_info.server_software}</p>
          </div>
          <div>
            <p className="text-stone-400 text-sm">Current User</p>
            <p className="text-white font-mono">{data.server_info.user}</p>
          </div>
          <div>
            <p className="text-stone-400 text-sm">Home Directory</p>
            <p className="text-white font-mono text-sm">{data.server_info.home}</p>
          </div>
          <div>
            <p className="text-stone-400 text-sm">Working Directory</p>
            <p className="text-white font-mono text-sm">{data.server_info.pwd}</p>
          </div>
        </div>
      </div>

      {/* PHP Configuration */}
      <div className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">PHP Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-stone-400 text-sm">Memory Limit</p>
            <p className="text-white font-mono">{data.php_info.memory_limit}</p>
          </div>
          <div>
            <p className="text-stone-400 text-sm">Max Execution Time</p>
            <p className="text-white font-mono">{data.php_info.max_execution_time}s</p>
          </div>
          <div>
            <p className="text-stone-400 text-sm">SAPI</p>
            <p className="text-white font-mono">{data.php_info.sapi}</p>
          </div>
          <div>
            <p className="text-stone-400 text-sm">Current Memory Usage</p>
            <p className="text-white font-mono">{formatBytes(data.memory_info.php_memory_usage)}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-stone-400 text-sm mb-2">Available Functions</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.php_info.available_functions).map(([func, available]) => (
              <div key={func} className="flex items-center gap-2">
                <code className="text-stone-300 text-sm">{func}</code>
                {getStatusBadge(available)}
              </div>
            ))}
          </div>
        </div>

        {data.php_info.disabled_functions.length > 0 && (
          <div className="mt-4">
            <p className="text-stone-400 text-sm mb-2">Disabled Functions</p>
            <div className="bg-stone-900/50 rounded p-3">
              <code className="text-stone-400 text-xs">{data.php_info.disabled_functions.join(', ')}</code>
            </div>
          </div>
        )}
      </div>

      {/* Command Execution Tests */}
      <div className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Command Execution Tests</h2>
        <div className="space-y-4">
          {Object.entries(data.command_execution).map(([method, result]) => (
            <div key={method} className="bg-stone-900/50 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <code className="text-white font-mono">{method}</code>
                {getStatusBadge(result.works)}
              </div>
              {result.output && (
                <div className="mt-2">
                  <p className="text-stone-400 text-xs mb-1">Output:</p>
                  <code className="text-green-400 text-xs bg-stone-800 rounded p-2 block">{result.output}</code>
                </div>
              )}
              {result.error && (
                <div className="mt-2">
                  <p className="text-stone-400 text-xs mb-1">Error:</p>
                  <code className="text-red-400 text-xs bg-stone-800 rounded p-2 block">{result.error}</code>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Node.js Information */}
      <div className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Node.js Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-stone-400 text-sm">Node.js Available</p>
            {getStatusBadge(data.nodejs_info.available)}
          </div>
          {data.nodejs_info.available && (
            <>
              <div>
                <p className="text-stone-400 text-sm">Version</p>
                <p className="text-white font-mono">{data.nodejs_info.version || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-stone-400 text-sm">Path</p>
                <p className="text-white font-mono text-sm">{data.nodejs_info.path || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-stone-400 text-sm">NPM Available</p>
                {getStatusBadge(data.nodejs_info.npm_available)}
              </div>
              {data.nodejs_info.npm_available && (
                <div>
                  <p className="text-stone-400 text-sm">NPM Version</p>
                  <p className="text-white font-mono">{data.nodejs_info.npm_version || 'Unknown'}</p>
                </div>
              )}
              <div>
                <p className="text-stone-400 text-sm">NVM Available</p>
                {getStatusBadge(data.nodejs_info.nvm_available)}
              </div>
              {data.nodejs_info.nvm_available && (
                <div>
                  <p className="text-stone-400 text-sm">NVM Path</p>
                  <p className="text-white font-mono text-sm">{data.nodejs_info.nvm_path || 'Unknown'}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* File System */}
      <div className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">File System</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Home Directory</span>
            <div className="flex items-center gap-2">
              <code className="text-stone-300 text-sm">{data.file_system.home_dir}</code>
              {getStatusBadge(data.file_system.home_exists && data.file_system.home_writable)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Temp Directory</span>
            <div className="flex items-center gap-2">
              <code className="text-stone-300 text-sm">{data.file_system.temp_dir}</code>
              {getStatusBadge(data.file_system.temp_writable)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Frontend Source</span>
            <div className="flex items-center gap-2">
              <code className="text-stone-300 text-sm">{data.file_system.frontend_source || 'Not found'}</code>
              {getStatusBadge(data.file_system.frontend_exists && data.file_system.frontend_writable)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Deploy Script</span>
            <div className="flex items-center gap-2">
              <code className="text-stone-300 text-sm">{data.file_system.deploy_script || 'Not found'}</code>
              {getStatusBadge(data.file_system.deploy_script_exists && data.file_system.deploy_script_executable)}
            </div>
          </div>
        </div>
      </div>

      {/* Memory Information */}
      <div className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Memory Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-stone-400 text-sm">PHP Memory Limit</p>
            <p className="text-white font-mono">{data.memory_info.php_memory_limit}</p>
          </div>
          <div>
            <p className="text-stone-400 text-sm">PHP Peak Memory</p>
            <p className="text-white font-mono">{formatBytes(data.memory_info.php_peak_memory)}</p>
          </div>
        </div>
        {data.memory_info.system_memory && (
          <div className="mt-4">
            <p className="text-stone-400 text-sm mb-2">System Memory</p>
            <pre className="bg-stone-900/50 rounded p-3 text-xs text-stone-300 font-mono overflow-x-auto">
              {data.memory_info.system_memory}
            </pre>
          </div>
        )}
        {data.memory_info.ulimits && (
          <div className="mt-4">
            <p className="text-stone-400 text-sm mb-2">System Limits (ulimit -a)</p>
            <pre className="bg-stone-900/50 rounded p-3 text-xs text-stone-300 font-mono overflow-x-auto max-h-60 overflow-y-auto">
              {data.memory_info.ulimits}
            </pre>
          </div>
        )}
      </div>

      {/* Build Capabilities */}
      <div className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Build Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-stone-400 text-sm mb-2">Can Build</p>
            {getStatusBadge(data.build_capabilities.can_build)}
          </div>
          <div>
            <p className="text-stone-400 text-sm mb-2">Can Install Dependencies</p>
            {getStatusBadge(data.build_capabilities.can_install_dependencies)}
          </div>
          <div>
            <p className="text-stone-400 text-sm mb-2">WebAssembly Support</p>
            {getStatusBadge(data.build_capabilities.webassembly_support)}
          </div>
        </div>
        {data.build_capabilities.test_results.length > 0 && (
          <div className="mt-4">
            <p className="text-stone-400 text-sm mb-2">Test Results</p>
            <ul className="space-y-1">
              {data.build_capabilities.test_results.map((result, idx) => (
                <li key={idx} className="text-stone-300 text-sm">• {result}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recommendations</h2>
          <div className="space-y-3">
            {data.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 ${getLevelColor(rec.level)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-semibold capitalize">{rec.level}:</span>
                  <div className="flex-1">
                    <p className="font-semibold mb-1">{rec.issue}</p>
                    <p className="text-sm opacity-90">{rec.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
