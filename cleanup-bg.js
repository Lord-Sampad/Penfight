const fs = require('fs');
const path = require('path');

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.tsx') && !p.includes('node_modules')) {
      let c = fs.readFileSync(p, 'utf8');
      let modified = false;

      // For dashboard, garage, leaderboard, room, play
      const regex = /\{\/\* Background Chalkboard Elements \*\/\}[\s\S]*?\{\/\* Grid overlay \*\/\}[\s\S]*?<div className="fixed inset-0 z-0 pointer-events-none opacity-50 ruled-paper !bg-transparent"><\/div>/g;
      if (regex.test(c)) {
        c = c.replace(regex, '{/* Faded grid overlay */}\n      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.92] ruled-paper"></div>');
        modified = true;
      }

      // For login, signup
      const regexLogin = /\{\/\* Background Chalkboard Elements \*\/\}[\s\S]*?\{\/\* Table foreground \*\/\}[\s\S]*?-z-10\">\s*<\/div>/g;
      if (p.includes('login') || p.includes('signup')) {
        if (regexLogin.test(c)) {
          c = c.replace(regexLogin, '');
          modified = true;
        }
      }

      if (modified) {
        console.log('Updated', p);
        fs.writeFileSync(p, c);
      }
    }
  });
}

walk('src/app');
