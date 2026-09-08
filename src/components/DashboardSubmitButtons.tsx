'use client'

import { useFormStatus } from 'react-dom'
import { VideoGameIcon, DoorIcon } from '@/components/icons'
import { Pen } from 'lucide-react'

export function CreateRoomButton() {
  const { pending } = useFormStatus()
  
  return (
    <button 
      disabled={pending}
      className={`w-full bg-[#1a237e] hover:bg-blue-900 text-white font-black uppercase tracking-widest py-4 px-6 rounded shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] border-4 border-gray-900 dark:border-gray-100 transition-all flex justify-center items-center gap-3 ${pending ? 'opacity-80 translate-y-1 shadow-none' : 'hover:translate-y-1 hover:shadow-[0px_0px_0_#000]'}`}
    >
      {pending ? (
        <div className="animate-spin text-white"><Pen size={24} /></div>
      ) : (
        <VideoGameIcon className="text-3xl bg-white border-2 border-black rounded-sm p-1" />
      )}
      {pending ? 'Creating...' : 'Create Room'}
    </button>
  )
}

export function JoinRoomButton() {
  const { pending } = useFormStatus()
  
  return (
    <button 
      disabled={pending}
      className={`bg-[#b81d22] hover:bg-red-800 text-white font-bold py-3 px-6 rounded shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] border-4 border-gray-900 dark:border-gray-100 transition-all flex items-center justify-center ${pending ? 'opacity-80 translate-y-1 shadow-none' : 'hover:translate-y-1 hover:shadow-none'}`}
    >
      {pending ? (
        <div className="animate-spin text-white"><Pen size={24} /></div>
      ) : (
        <DoorIcon className="text-3xl bg-white border-2 border-black rounded-sm p-1" />
      )}
    </button>
  )
}
