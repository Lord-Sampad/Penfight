import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { ProfileForm } from './ProfileForm'
import { getAvatarInfo } from '@/lib/userUtils'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { avatarUrl, initials } = getAvatarInfo(user, profile)

  return (
    <div className="classroom-bg min-h-screen relative font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80 ruled-paper dark:invert dark:opacity-40"></div>
      
      <NavBar 
        username={profile?.username || user.email}
        avatarUrl={avatarUrl}
        initials={initials}
      />

      <div className="max-w-md mx-auto p-4 md:p-6 relative z-10 pt-8">
        <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 p-6 md:p-8 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#fff] relative">
          
          <div className="absolute -top-4 -left-4 bg-yellow-400 border-4 border-gray-900 dark:border-gray-100 px-3 py-1 transform -rotate-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] z-10">
            <span className="font-black text-gray-900 uppercase tracking-widest text-sm">ID Card</span>
          </div>

          <div className="flex flex-col items-center mb-6 pt-2">
            <div className="w-24 h-24 rounded-full border-4 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-gray-400 dark:text-gray-500">{initials}</span>
              )}
            </div>
            
            <p className="font-mono text-gray-500 dark:text-gray-400 text-xs">{user.email}</p>
          </div>

          <ProfileForm 
            initialUsername={profile?.username} 
            isDefaultUsername={profile?.username === user.email} 
          />
          
        </div>
      </div>
    </div>
  )
}
