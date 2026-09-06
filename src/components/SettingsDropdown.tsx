'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings, User, LogOut } from 'lucide-react'
import Link from 'next/link'

export function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="border-2 border-gray-900 dark:border-gray-100 rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#fff] text-gray-900 dark:text-gray-100 transition-transform active:translate-y-1 active:shadow-none focus:outline-none focus:border-red-600"
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] z-50 overflow-hidden flex flex-col">
          <Link 
            href="/profile" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-800 transition-colors"
          >
            <User size={16} />
            Profile
          </Link>
          <form action="/auth/signout" method="post" className="m-0">
            <button 
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
