'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function AdminPasswordChangePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.current_password) {
      newErrors.current_password = 'Current password is required'
    }

    if (!formData.new_password) {
      newErrors.new_password = 'New password is required'
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters long'
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your new password'
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match'
    }

    if (formData.current_password === formData.new_password) {
      newErrors.new_password = 'New password must be different from current password'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      
      // Get CSRF token
      const meResponse = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      if (!meResponse.ok) {
        const errorData = await meResponse.json().catch(() => ({}))
        toast.error(errorData.error || 'Failed to authenticate. Please refresh the page.')
        return
      }
      
      const meData = await meResponse.json()
      const csrfToken = meData.csrf_token

      if (!csrfToken) {
        toast.error('CSRF token missing. Please refresh the page and try again.')
        return
      }

      const response = await fetch(`${apiUrl}/admin/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: formData.current_password,
          new_password: formData.new_password,
        }),
      })

      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        // If response is not JSON, try to get text
        const text = await response.text()
        console.error('Non-JSON response:', text)
        toast.error('Invalid response from server. Please try again.')
        return
      }

      if (response.ok) {
        toast.success('Password changed successfully!')
        setFormData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        })
        setErrors({})
      } else {
        console.error('Password change error:', response.status, data)
        toast.error(data.error || data.message || `Failed to change password (${response.status})`)
      }
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-4 md:p-8 backdrop-blur-3xl"
        >
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Change Password</h1>
            <p className="text-stone-400">Update your admin account password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Current Password *
              </label>
              <input
                type="password"
                value={formData.current_password}
                onChange={(e) =>
                  setFormData({ ...formData, current_password: e.target.value })
                }
                className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                placeholder="Enter your current password"
                required
              />
              {errors.current_password && (
                <p className="text-[#DC143C] text-sm mt-1">{errors.current_password}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                New Password *
              </label>
              <input
                type="password"
                value={formData.new_password}
                onChange={(e) =>
                  setFormData({ ...formData, new_password: e.target.value })
                }
                className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                placeholder="Enter your new password (min. 8 characters)"
                required
              />
              {errors.new_password && (
                <p className="text-[#DC143C] text-sm mt-1">{errors.new_password}</p>
              )}
              <p className="text-stone-400 text-xs mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) =>
                  setFormData({ ...formData, confirm_password: e.target.value })
                }
                className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                placeholder="Confirm your new password"
                required
              />
              {errors.confirm_password && (
                <p className="text-[#DC143C] text-sm mt-1">{errors.confirm_password}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4 border-t border-stone-600/50">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 text-white bg-stone-700/50 border border-stone-600 rounded-md hover:bg-stone-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white rounded-md hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}





