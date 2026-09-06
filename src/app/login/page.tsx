import { login, signInWithGoogle } from './actions'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="classroom-bg flex items-center justify-center min-h-screen font-sans relative overflow-hidden">
      

      <div className="max-w-md w-full bg-white dark:bg-gray-900 p-4 md:p-4 md:p-6 lg:p-8 shadow-2xl border-4 border-gray-900 dark:border-gray-100 rounded-sm relative z-10">
        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-500 shadow-md border-2 border-red-700"></div>
        <div className="mb-6 pb-2 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest font-sans">Student ID<br/>Required</h1>
        </div>
        
        <form className="flex flex-col gap-4 md:p-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 font-mono text-xs uppercase" htmlFor="email">Student ID (Email)</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className="w-full border-b-2 border-gray-900 dark:border-gray-100 bg-transparent py-2 focus:outline-none focus:border-red-600 font-sans"
              placeholder="Enter your ID"
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 font-mono text-xs uppercase" htmlFor="password">Pass-Code</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="w-full border-b-2 border-gray-900 dark:border-gray-100 bg-transparent py-2 focus:outline-none focus:border-red-600 font-sans"
              placeholder="Secret scribbles"
            />
          </div>
          
          <div className="text-right">
            <a href="#" className="text-xs font-mono text-blue-800 underline decoration-wavy">Forgot Password?</a>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <button 
              formAction={login} 
              className="w-full bg-[#b81d22] hover:bg-red-800 text-white font-bold py-3 px-4 rounded-sm shadow-md border-2 border-gray-900 dark:border-gray-100 transition-all uppercase tracking-wider"
            >
              Login
            </button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-gray-500 font-bold font-mono text-xs uppercase">OR</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
            </div>

            <button 
              formAction={signInWithGoogle} 
              className="w-full bg-white dark:bg-gray-900 hover:bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold py-3 px-4 rounded-sm shadow-md border-2 border-gray-900 dark:border-gray-100 transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Log in with Google
            </button>
            
            <p className="text-center text-sm font-mono mt-2">
              Need an account? <Link href="/signup" className="text-red-600 underline decoration-wavy font-bold">Sign up</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
