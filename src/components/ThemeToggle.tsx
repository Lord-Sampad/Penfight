"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = theme === 'system' ? resolvedTheme : theme;

  return (
    <button
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 border-2 border-gray-900 rounded hover:bg-gray-100 shadow-[2px_2px_0_#000] text-gray-900 transition-transform active:translate-y-1 active:shadow-none dark:border-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 dark:shadow-[2px_2px_0_#fff]"
      title="Toggle Theme"
    >
      {mounted && currentTheme === 'dark' ? (
        <Sun className="h-4 w-4 md:h-5 md:w-5 transition-all" />
      ) : (
        <Moon className="h-4 w-4 md:h-5 md:w-5 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
