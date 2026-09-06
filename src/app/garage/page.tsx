import { NavBar } from "@/components/NavBar";
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PEN_PRESETS } from '@/lib/game/pens'
import { Droplet } from 'lucide-react'
import { getAvatarInfo } from '@/lib/userUtils'

export default async function GaragePage() {
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

  // Active pen is Reynolds Trimax for the big showcase card
  const mainPen = PEN_PRESETS['reynolds_trimax']
  // Rest of the pens
  const otherPens = Object.values(PEN_PRESETS).filter(p => p.id !== 'reynolds_trimax')
  
  const { avatarUrl, initials } = getAvatarInfo(user, profile)

  return (
    <div className="classroom-bg min-h-screen relative font-sans">
      {/* Faded grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80 ruled-paper dark:invert dark:opacity-40"></div>

      {/* Top Nav */}
      <NavBar 
        username={profile?.username || user.email} 
        isDefaultUsername={profile?.username === user.email}
        avatarUrl={avatarUrl}
        initials={initials}
      />

      <div className="max-w-6xl mx-auto p-4 md:p-8 relative z-10">
        
        {/* Header section */}
        <div className="flex flex-wrap justify-between items-end mb-6 md:mb-10 border-b-2 border-gray-900 dark:border-gray-100 pb-4">
          <div>
            <div className="bg-[#fbbf24] border-4 border-gray-900 dark:border-gray-100 p-2 transform -rotate-1 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] inline-block mb-3">
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-gray-900">Garage</h1>
            </div>
            <p className="font-mono text-gray-700 dark:text-gray-300">Select and upgrade your arsenal.</p>
          </div>
          <div className="bg-[#1e2348] text-white px-4 py-2 rounded-full border-2 border-gray-900 dark:border-gray-100 font-bold flex items-center gap-2 shadow-[2px_2px_0_#000] mt-4 md:mt-0">
            <Droplet size={16} className="text-blue-400" />
            1240 Ink
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Main Showcase (Left - takes 2 cols on lg) */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#fff] p-6 relative flex flex-col md:flex-row gap-8">
            <div className="absolute -top-3 -right-3 bg-red-600 text-white font-black text-xs uppercase px-12 py-2 transform rotate-45 border-y-4 border-gray-900 shadow-md">
              Equipped
            </div>

            {/* Image Box */}
            <div className="bg-gray-100 dark:bg-gray-800 border-4 border-gray-900 dark:border-gray-100 w-full md:w-1/2 aspect-[4/3] flex items-center justify-center relative overflow-hidden">
               <img src={mainPen.image} alt={mainPen.name} className="w-[120%] object-contain transform -rotate-6 scale-110 drop-shadow-2xl z-10" />
               <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 border-2 border-gray-900 dark:border-gray-100 px-3 py-1 text-xs font-black uppercase transform -rotate-2">
                 Class: {mainPen.weight}
               </div>
            </div>

            {/* Stats Box */}
            <div className="w-full md:w-1/2 flex flex-col justify-between z-10 pt-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black uppercase text-[#1e2348] dark:text-blue-400 mb-1">{mainPen.name}</h2>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mb-8">{mainPen.description}</p>
                
                <div className="space-y-4">
                  {/* Weight Bar — mass in grams */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span className="tracking-widest text-gray-900 dark:text-gray-100">Weight</span>
                      <span className="text-gray-500">{Math.round(mainPen.mass * 1000)}g · {mainPen.weight}</span>
                    </div>
                    <div className="h-4 w-full border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-800 p-0.5">
                      <div className="h-full bg-blue-800" style={{ width: `${Math.min(100, (mainPen.mass / 0.025) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Friction Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span className="tracking-widest text-gray-900 dark:text-gray-100">Grip / Friction</span>
                      <span className="text-gray-500">{Math.round(mainPen.friction * 100)}%</span>
                    </div>
                    <div className="h-4 w-full border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-800 p-0.5">
                      <div className="h-full bg-yellow-400" style={{ width: `${Math.round(mainPen.friction * 100)}%` }} />
                    </div>
                  </div>

                  {/* Bounce Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span className="tracking-widest text-gray-900 dark:text-gray-100">Bounce</span>
                      <span className="text-gray-500">{Math.round(mainPen.restitution * 100)}%</span>
                    </div>
                    <div className="h-4 w-full border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-800 p-0.5">
                      <div className="h-full bg-red-600" style={{ width: `${Math.round(mainPen.restitution * 100)}%` }} />
                    </div>
                  </div>

                  {/* Slide Bar — inverse of linearDamping */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span className="tracking-widest text-gray-900 dark:text-gray-100">Slide</span>
                      <span className="text-gray-500">{Math.round((1 - mainPen.linearDamping) * 100)}%</span>
                    </div>
                    <div className="h-4 w-full border-2 border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-800 p-0.5">
                      <div className="h-full bg-green-500" style={{ width: `${Math.round((1 - mainPen.linearDamping) * 100)}%` }} />
                    </div>
                  </div>
                </div>

              </div>

              <button className="mt-8 w-full bg-[#1e2348] hover:bg-blue-900 text-white font-black uppercase tracking-widest py-3 border-2 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] flex justify-center items-center gap-2 transition-transform active:translate-y-1 active:shadow-none">
                Max Level <span>✔</span>
              </button>
            </div>
          </div>

          {/* Right Column / Grid */}
          <div className="grid grid-cols-1 gap-6 md:gap-8">
             
             {/* Small Card 1 */}
             <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#fff] p-4 flex flex-col">
               <div className="bg-gray-100 dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-100 w-full h-32 mb-4 relative overflow-hidden flex items-center justify-center">
                 <div className="absolute top-2 left-2 bg-yellow-200 border-2 border-gray-900 text-[10px] font-black px-2 py-0.5 transform -rotate-3 z-10 text-gray-900">
                   {otherPens[0].weight}
                 </div>
                 <img src={otherPens[0].image} className="w-[110%] object-contain transform -rotate-12 hover:scale-110 transition-transform" />
               </div>
               <h3 className="font-black text-xl uppercase text-gray-900 dark:text-gray-100">{otherPens[0].name}</h3>
               <p className="font-mono text-xs text-gray-500 mb-4">{otherPens[0].description}</p>
               
               <div className="grid grid-cols-3 gap-2 mb-4">
                 <div className="border-2 border-gray-200 dark:border-gray-800 text-center py-1">
                   <div className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">WGT</div>
                   <div className="font-black text-blue-800 dark:text-blue-400">{Math.round(otherPens[0].mass * 1000)}g</div>
                 </div>
                 <div className="border-2 border-gray-200 dark:border-gray-800 text-center py-1">
                   <div className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">FRI</div>
                   <div className="font-black text-yellow-500">{Math.round(otherPens[0].friction * 100)}</div>
                 </div>
                 <div className="border-2 border-gray-200 dark:border-gray-800 text-center py-1">
                   <div className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">IMP</div>
                   <div className="font-black text-red-600">{Math.round(otherPens[0].restitution * 100)}</div>
                 </div>
               </div>
               <button className="w-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-900 dark:border-gray-100 font-bold text-sm uppercase py-2 hover:bg-gray-200 dark:hover:bg-gray-700">
                 Equip
               </button>
             </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:col-span-3">
            {/* Small Card 2 */}
            <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#fff] p-4 flex flex-col">
               <div className="bg-gray-100 dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-100 w-full h-40 mb-4 relative overflow-hidden flex items-center justify-center">
                 <div className="absolute top-2 left-2 bg-blue-200 border-2 border-gray-900 text-[10px] font-black px-2 py-0.5 transform -rotate-3 z-10 text-gray-900">
                   {otherPens[1].weight}
                 </div>
                 <img src={otherPens[1].image} className="w-[130%] object-contain transform -rotate-12 hover:scale-110 transition-transform" />
               </div>
               <h3 className="font-black text-xl uppercase text-gray-900 dark:text-gray-100">{otherPens[1].name}</h3>
               <p className="font-mono text-xs text-gray-500 mb-4">{otherPens[1].description}</p>
               
               <div className="grid grid-cols-3 gap-2 mb-4">
                 <div className="border-2 border-gray-200 dark:border-gray-800 text-center py-1">
                   <div className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">WGT</div>
                   <div className="font-black text-blue-800 dark:text-blue-400">{Math.round(otherPens[1].mass * 1000)}g</div>
                 </div>
                 <div className="border-2 border-gray-200 dark:border-gray-800 text-center py-1">
                   <div className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">FRI</div>
                   <div className="font-black text-yellow-500">{Math.round(otherPens[1].friction * 100)}</div>
                 </div>
                 <div className="border-2 border-gray-200 dark:border-gray-800 text-center py-1">
                   <div className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">IMP</div>
                   <div className="font-black text-red-600">{Math.round(otherPens[1].restitution * 100)}</div>
                 </div>
               </div>
               <button className="w-full bg-[#fbbf24] border-2 border-gray-900 dark:border-gray-100 font-bold text-sm uppercase py-2 shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#fff] text-gray-900 hover:translate-y-0.5 hover:shadow-none transition-all">
                 ↑ Upgrade (500)
               </button>
             </div>

             {/* Locked Card */}
             <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#fff] p-4 flex flex-col opacity-75">
               <div className="bg-gray-100 dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-100 w-full h-40 mb-4 relative overflow-hidden flex items-center justify-center opacity-50">
                 <div className="text-3xl">🔒</div>
               </div>
               <h3 className="font-black text-xl uppercase text-gray-900 dark:text-gray-100">???</h3>
               <p className="font-mono text-xs text-gray-500">Unlock at Level 10.</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}
