'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RoomErrorDialogContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (error === 'room_not_found') {
      setErrorMessage('Room not found. Please check the code and try again.')
      setIsOpen(true)
    } else if (error === 'room_already_started') {
      setErrorMessage('Match has already started in this room.')
      setIsOpen(true)
    }
  }, [error])

  const handleClose = () => {
    setIsOpen(false)
    router.replace('/dashboard')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border-4 border-black dark:border-gray-100 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#fff] p-8 max-w-sm w-full text-center flex flex-col gap-6 animate-in zoom-in-95 duration-200">
        <h2 className="text-3xl font-black uppercase text-red-600 tracking-widest">Error</h2>
        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
          {errorMessage}
        </p>
        <button 
          className="w-full bg-[#1a237e] text-white hover:-translate-y-1 hover:shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none border-4 border-black font-black py-3 uppercase tracking-widest transition-all"
          onClick={handleClose}
        >
          Okay
        </button>
      </div>
    </div>
  )
}

export function RoomErrorDialog() {
  return (
    <Suspense fallback={null}>
      <RoomErrorDialogContent />
    </Suspense>
  )
}
