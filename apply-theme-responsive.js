const fs = require('fs');
const path = require('path');

const replacements = {
  // Padding & Font Size (Responsive / Normal size)
  'p-8': 'p-4 md:p-6 lg:p-8',
  'p-6': 'p-4 md:p-6',
  'gap-8': 'gap-4 md:gap-8',
  'gap-12': 'gap-4 md:gap-8 lg:gap-12',
  'gap-6': 'gap-4 md:gap-6',
  'text-9xl': 'text-6xl md:text-8xl lg:text-9xl',
  'text-3xl': 'text-2xl md:text-3xl',
  'text-2xl': 'text-xl md:text-2xl',
  'text-4xl': 'text-2xl md:text-4xl',
  'pt-24 pb-12 px-6': 'pt-16 pb-8 px-4 md:pt-24 md:pb-12 md:px-6',
  'max-w-6xl mx-auto p-8': 'max-w-6xl mx-auto p-4 md:p-8',
  
  // Dark Mode colors
  'bg-white': 'bg-white dark:bg-gray-900',
  'bg-gray-50': 'bg-gray-50 dark:bg-gray-800',
  'bg-gray-100': 'bg-gray-100 dark:bg-gray-800',
  'bg-gray-200': 'bg-gray-200 dark:bg-gray-700',
  'bg-blue-100': 'bg-blue-100 dark:bg-blue-900',
  'bg-green-100': 'bg-green-100 dark:bg-green-900',
  'text-gray-900': 'text-gray-900 dark:text-gray-100',
  'text-gray-800': 'text-gray-800 dark:text-gray-200',
  'text-gray-700': 'text-gray-700 dark:text-gray-300',
  'text-gray-600': 'text-gray-600 dark:text-gray-400',
  'text-gray-500': 'text-gray-500 dark:text-gray-400',
  'text-gray-400': 'text-gray-400 dark:text-gray-500',
  'border-gray-900': 'border-gray-900 dark:border-gray-100',
  'border-gray-300': 'border-gray-300 dark:border-gray-700',
  'border-gray-200': 'border-gray-200 dark:border-gray-800',
  
  // Dark Mode Shadows
  'shadow-[8px_8px_0_#000]': 'shadow-[4px_4px_0_#000] md:shadow-[8px_8px_0_#000] dark:shadow-[4px_4px_0_#fff] md:dark:shadow-[8px_8px_0_#fff]',
  'shadow-[6px_6px_0_#000]': 'shadow-[4px_4px_0_#000] md:shadow-[6px_6px_0_#000] dark:shadow-[4px_4px_0_#fff] md:dark:shadow-[6px_6px_0_#fff]',
  'shadow-[4px_4px_0_#000]': 'shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff]',
  'shadow-[2px_2px_0_#000]': 'shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#fff]',
  'shadow-[3px_3px_0_#000]': 'shadow-[3px_3px_0_#000] dark:shadow-[3px_3px_0_#fff]',
  'shadow-[0_4px_0_#000]': 'shadow-[0_4px_0_#000] dark:shadow-[0_4px_0_#fff]',
  
  // Specific Nav Bar Responsiveness fixes (flex rows to cols on small screens if needed, but flex-wrap is better)
  'flex items-center justify-between text-gray-900': 'flex flex-wrap items-center justify-between gap-4 text-gray-900 dark:text-gray-100',
  'flex items-center gap-12': 'flex flex-wrap items-center gap-4 md:gap-8 lg:gap-12',
  'flex gap-6 text-sm': 'flex flex-wrap gap-4 md:gap-6 text-xs md:text-sm',
  
  // Ruled paper dark mode (Invert colors via CSS filter)
  'ruled-paper': 'ruled-paper dark:invert dark:opacity-40'
};

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.tsx') && !p.includes('node_modules')) {
      let originalContent = fs.readFileSync(p, 'utf8');
      let c = originalContent;

      // Import ThemeToggle if Nav exists
      if (c.includes('<nav')) {
        if (!c.includes('ThemeToggle')) {
          // Find imports end and insert
          c = c.replace(/import .*? from '.*?'.*\n/g, match => match); // just to find it? No, better way:
          const importLines = c.match(/import .*?\n/g);
          if (importLines) {
             const lastImport = importLines[importLines.length - 1];
             c = c.replace(lastImport, lastImport + `import { ThemeToggle } from '@/components/ThemeToggle'\n`);
          }
        }
        
        // Insert ThemeToggle button into Nav's right side controls
        // In Dashboard: <form action="/auth/signout" method="post">
        // In Garage/Leaderboard/RoomClient: <div className="flex gap-2"> or <div className="flex items-center gap-4">
        if (c.includes('<div className="flex items-center gap-4">')) {
           c = c.replace('<div className="flex items-center gap-4">', '<div className="flex items-center gap-2 md:gap-4"><ThemeToggle />');
        } else if (c.includes('<div className="flex gap-2">')) {
           c = c.replace('<div className="flex gap-2">', '<div className="flex gap-2"><ThemeToggle />');
        } else if (c.includes('<div className="font-mono bg-blue-900')) {
           // Garage specifically
           c = c.replace('<div className="font-mono bg-blue-900', '<div className="flex items-center gap-2 md:gap-4"><ThemeToggle /><div className="font-mono bg-blue-900');
           c = c.replace('1240} Ink\n        </div>', '1240} Ink\n        </div>\n        </div>');
        }
      }

      // String Replacements
      // We must order them carefully if there's overlap, but let's just do a naive multi-replace
      // To prevent double replacement, we'll do a word-boundary match where possible, but tailwind classes don't have nice boundaries.
      // Easiest is to just use a sequence of replaceAll
      
      // We'll skip bg-white if it's already bg-white dark:bg-gray-900
      if (!c.includes('dark:bg-gray-900')) {
        for (const [key, value] of Object.entries(replacements)) {
            // escape brackets for regex
            const regexStr = key.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
            const regex = new RegExp(`(?<!dark:)${regexStr}(?! dark:)`, 'g');
            c = c.replace(regex, value);
        }
      }

      if (c !== originalContent) {
        fs.writeFileSync(p, c);
        console.log('Updated', p);
      }
    }
  });
}

walk('src/app');
