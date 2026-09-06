'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'An unknown error occurred.'

  return (
    <div className="bg-white dark:bg-gray-900/90 p-4 md:p-4 md:p-6 lg:p-8 shadow-xl border border-red-200 rounded text-center max-w-md w-full">
      <h1 className="text-xl md:text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong.</h1>
      <p className="text-gray-700 dark:text-gray-300 font-mono mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm break-words">{message}</p>
      <Link href="/login" className="inline-block bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 transition-colors">
        Back to Login
      </Link>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <div className="ruled-paper dark:invert dark:opacity-40 min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  )
}
