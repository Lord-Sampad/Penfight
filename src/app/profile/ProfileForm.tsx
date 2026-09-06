'use client'

import { useState } from 'react'
import { updateProfile } from './actions'

type ProfileFormProps = {
  initialUsername?: string
  isDefaultUsername?: boolean
}

export function ProfileForm({ initialUsername, isDefaultUsername }: ProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleProfileSubmit(formData: FormData) {
    setLoading(true)
    setMessage('')
    setError('')
    
    const result = await updateProfile(formData)
    
    if (result?.error) {
      setError(result.error)
    } else {
      setMessage('Profile updated successfully!')
    }
    setLoading(false)
  }

  async function handleSecuritySubmit(formData: FormData) {
    setLoading(true)
    setMessage('')
    setError('')
    
    const password = formData.get('password') as string
    if (!password) {
      setError('Password cannot be empty')
      setLoading(false)
      return
    }

    const result = await updateProfile(formData)
    
    if (result?.error) {
      setError(result.error)
    } else {
      setMessage('Password updated successfully!')
      const passwordInput = document.getElementById('password') as HTMLInputElement
      const confirmInput = document.getElementById('confirmPassword') as HTMLInputElement
      if (passwordInput) passwordInput.value = ''
      if (confirmInput) confirmInput.value = ''
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border-2 border-red-600 text-red-900 dark:text-red-100 p-2 font-bold text-xs shadow-[2px_2px_0_#b81d22]">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-100 dark:bg-green-900 border-2 border-green-600 text-green-900 dark:text-green-100 p-2 font-bold text-xs shadow-[2px_2px_0_#16a34a]">
          {message}
        </div>
      )}

      {isDefaultUsername && (
        <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-600 text-blue-900 dark:text-blue-100 p-3 font-bold text-xs shadow-[2px_2px_0_#2563eb] mb-2 flex flex-col gap-1">
          <p>⚠️ You haven't set a username yet!</p>
          <p className="font-normal opacity-80">Please choose a unique username for the leaderboard.</p>
        </div>
      )}

      <form action={handleProfileSubmit} className="flex flex-col gap-4">
        <div className="border-t-4 border-gray-900 dark:border-gray-100 pt-4">
          <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest mb-3">Profile Info</h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="username" className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest text-xs">
                Username
              </label>
              <input 
                type="text" 
                id="username" 
                name="username" 
                defaultValue={isDefaultUsername ? '' : initialUsername}
                placeholder={isDefaultUsername ? "Choose a username..." : ""}
                className="border-4 border-gray-900 dark:border-gray-100 rounded px-3 py-2 font-bold text-base focus:border-red-600 focus:outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="avatar_file" className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest text-xs flex justify-between">
                <span>Profile Picture</span>
                <span className="font-normal opacity-50 lowercase tracking-normal">Optional</span>
              </label>
              <input 
                type="file" 
                id="avatar_file" 
                name="avatar_file" 
                accept="image/*"
                className="border-4 border-gray-900 dark:border-gray-100 rounded px-3 py-2 font-bold text-sm focus:border-red-600 focus:outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-inner file:mr-3 file:py-1 file:px-3 file:rounded file:border-2 file:border-gray-900 file:dark:border-gray-100 file:text-xs file:font-bold file:bg-gray-200 file:dark:bg-gray-700 file:text-gray-900 file:dark:text-gray-100 hover:file:bg-gray-300 dark:hover:file:bg-gray-600"
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#1a237e] hover:bg-blue-900 disabled:bg-gray-500 text-white font-black uppercase tracking-widest py-2 px-4 text-sm rounded shadow-[3px_3px_0_#000] dark:shadow-[3px_3px_0_#fff] border-4 border-gray-900 dark:border-gray-100 transition-all hover:translate-y-1 hover:shadow-[0px_0px_0_#000] disabled:translate-y-0 disabled:shadow-[3px_3px_0_#000]"
        >
          {loading ? 'Saving...' : 'Save Profile Info'}
        </button>
      </form>

      <form action={handleSecuritySubmit} className="flex flex-col gap-4">
        <div className="border-t-4 border-gray-900 dark:border-gray-100 pt-4 mt-2">
          <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest mb-3">Security</h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest text-xs flex justify-between">
                <span>New Password</span>
              </label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                placeholder="Enter new password"
                className="border-4 border-gray-900 dark:border-gray-100 rounded px-3 py-2 font-bold text-base focus:border-red-600 focus:outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-inner"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword" className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest text-xs flex justify-between">
                <span>Confirm New Password</span>
              </label>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirmPassword" 
                placeholder="Re-enter new password"
                className="border-4 border-gray-900 dark:border-gray-100 rounded px-3 py-2 font-bold text-base focus:border-red-600 focus:outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-inner"
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#b81d22] hover:bg-red-800 disabled:bg-gray-500 text-white font-black uppercase tracking-widest py-2 px-4 text-sm rounded shadow-[3px_3px_0_#000] dark:shadow-[3px_3px_0_#fff] border-4 border-gray-900 dark:border-gray-100 transition-all hover:translate-y-1 hover:shadow-[0px_0px_0_#000] disabled:translate-y-0 disabled:shadow-[3px_3px_0_#000]"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
