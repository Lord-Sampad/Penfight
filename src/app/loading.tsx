import { Pen } from 'lucide-react'

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border-4 border-black dark:border-white shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#fff] p-8 max-w-sm w-full text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200">
        <div className="animate-spin text-red-600">
          <Pen size={48} />
        </div>
        <h2 className="text-2xl font-black uppercase text-black dark:text-white tracking-widest animate-pulse">Loading...</h2>
        <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Please wait while we sharpen the pens.</p>
      </div>
    </div>
  )
}
