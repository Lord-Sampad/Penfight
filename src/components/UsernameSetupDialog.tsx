'use client'

import { useState } from 'react'
import { updateProfile } from '@/app/profile/actions'

type UsernameSetupDialogProps = {
  isOpen: boolean
}

export function UsernameSetupDialog({ isOpen }: UsernameSetupDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(isOpen)

  if (!visible) return null

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    
    const username = formData.get('username') as string
    if (!username || username.trim() === '') {
      setError('Username cannot be empty')
      setLoading(false)
      return
    }

    const result = await updateProfile(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setVisible(false) // Hide dialog on success
      window.location.reload() // Force reload to update username everywhere
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 p-6 md:p-8 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#fff] w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        
        <div className="absolute -top-4 -left-4 bg-blue-500 border-4 border-gray-900 dark:border-gray-100 px-4 py-1 transform -rotate-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff]">
          <span className="font-black text-white uppercase tracking-widest text-sm">Welcome!</span>
        </div>

        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest border-b-4 border-red-600 pb-2 mb-4 mt-2">
          Claim Your Tag
        </h2>
        
        <p className="font-mono text-gray-600 dark:text-gray-400 mb-6 text-sm">
          You need a unique username before you can enter the arena and start battling!
        </p>

        <form action={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900 border-2 border-red-600 text-red-900 dark:text-red-100 p-2 font-bold text-xs shadow-[2px_2px_0_#b81d22]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <input 
              type="text" 
              name="username" 
              placeholder="e.g. InkMaster99"
              className="border-4 border-gray-900 dark:border-gray-100 rounded px-4 py-3 font-bold text-lg focus:border-red-600 focus:outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-inner"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#b81d22] hover:bg-red-800 disabled:bg-gray-500 text-white font-black uppercase tracking-widest py-3 px-6 rounded shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] border-4 border-gray-900 dark:border-gray-100 transition-all hover:translate-y-1 hover:shadow-[0px_0px_0_#000] mt-2"
          >
            {loading ? 'Saving...' : 'Set Username'}
          </button>
        </form>
      </div>
    </div>
  )
}
