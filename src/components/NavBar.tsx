'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'
import { SettingsDropdown } from './SettingsDropdown'
import { UsernameSetupDialog } from './UsernameSetupDialog'

import { ArenaIcon, GarageIcon, TrophyIcon, PenIcon } from './icons'

type NavBarProps = {
  username?: string
  isDefaultUsername?: boolean
  avatarUrl?: string
  initials?: string
}

export function NavBar({ username, isDefaultUsername, avatarUrl, initials }: NavBarProps) {
  const pathname = usePathname()

  const navLinks = [
    { href: '/dashboard', label: 'Arena', icon: <ArenaIcon className="text-xl" /> },
    { href: '/garage', label: 'Garage', icon: <GarageIcon className="text-xl" /> },
    { href: '/leaderboard', label: 'Ranks', icon: <TrophyIcon className="text-xl" /> },
  ]

  return (
    <nav className="bg-white dark:bg-gray-900 border-b-4 border-gray-900 dark:border-gray-100 px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-gray-900 dark:text-gray-100 z-50 relative shadow-[0_4px_0_#000] dark:shadow-[0_4px_0_#fff]">
      <div className="flex flex-wrap items-center gap-4 md:gap-8 lg:gap-12">
        <div className="border-4 border-gray-900 dark:border-gray-100 p-1 transform -rotate-2 bg-yellow-300 dark:bg-yellow-500 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] flex items-center gap-2 px-3">
          <PenIcon className="text-2xl" />
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Ink Brawl</h1>
        </div>
        <div className="flex flex-wrap gap-4 md:gap-6 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (pathname?.startsWith('/room') && link.href === '/dashboard')
            return (
              <Link 
                key={link.href}
                href={link.href} 
                className={
                  `flex items-center gap-2 ` + 
                  (isActive 
                    ? "text-gray-900 dark:text-gray-100 border-b-4 border-red-600 pb-1"
                    : "hover:text-gray-900 dark:text-gray-100 transition-colors")
                }
              >
                {link.icon}
                <span className="hidden md:inline">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />
        {username && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right font-mono text-xs text-gray-500 dark:text-gray-400">
              Welcome back,<br/>
              <span className="text-gray-900 dark:text-gray-100 font-bold">{username}</span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-gray-900 dark:border-gray-100 shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#fff] overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black text-gray-400 dark:text-gray-500">{initials}</span>
              )}
            </div>
          </div>
        )}
        <SettingsDropdown />
      </div>
      
      {isDefaultUsername && <UsernameSetupDialog isOpen={true} />}
    </nav>
  )
}
