const fs = require('fs');

['src/app/dashboard/page.tsx', 'src/app/garage/page.tsx', 'src/app/leaderboard/page.tsx', 'src/app/room/[id]/RoomClient.tsx'].forEach(p => { 
  let c = fs.readFileSync(p, 'utf8'); 
  if (!c.includes('ThemeToggle }')) { 
    fs.writeFileSync(p, 'import { ThemeToggle } from "@/components/ThemeToggle";\n' + c); 
    console.log(p); 
  } 
});
