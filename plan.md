\# Nostalgic Indian Pen Fight - Antigravity IDE Blueprint



\*\*Context for Antigravity Agent:\*\*

You are building a web-based multiplayer physics game using Next.js (App Router), Supabase (Auth, Database, Realtime), `@react-three/fiber` (Three.js), and `@react-three/rapier` (physics). The game is a nostalgic Indian school pen fight. The camera is isometric orthographic. The desk is visually 2D but physics are 3D. 



Execute these phases sequentially. Wait for my approval and artifact review after each phase before moving to the next.



\## Phase 1: Foundation \& Supabase Auth

\*\*Goal:\*\* Setup project, database schemas, and user authentication.

\*\*Prompt:\*\*

1\. Initialize a Next.js App Router project with Tailwind CSS, Lucide React (for icons), and the Supabase SSR client.

2\. Create the Supabase SQL schema and types for:

&#x20;  - `profiles` (id, username, avatar\_url, wins, matches\_played)

&#x20;  - `rooms` (id, host\_id, status: 'waiting' | 'playing' | 'finished', mode: '1v1' | 'ffa' | 'team')

&#x20;  - `room\_players` (room\_id, player\_id, team, status).

3\. Build the Authentication UI at `/login` supporting Google OAuth and Email/Password using `@supabase/ssr`. Use a nostalgic "school notebook ruled paper" CSS background.

4\. Create a protected `/dashboard` page where authenticated users view their profile stats and can click "Create Room" or "Join Room via Code".

5\. Set up Row Level Security (RLS) policies so users can only update their own profiles and host-controlled rooms.



\## Phase 2: Multiplayer Lobby \& Realtime State

\*\*Goal:\*\* Allow players to join rooms and sync state before the game starts.

\*\*Prompt:\*\*

1\. Build a `/room/\[id]` page acting as the pre-game lobby.

2\. Implement Supabase Realtime (Presence) to show players joining the room instantly.

3\. Allow the host to select the Game Mode (1v1, Free-For-All, 2v2).

4\. Implement a "Select Your Pen" UI with the following nostalgic presets (store these stats in a constant):

&#x20;  - \*\*Reynolds 045\*\* (Lightweight, High Speed, Low Friction)

&#x20;  - \*\*Cello Gripper\*\* (Medium weight, Rubber grip for high friction)

&#x20;  - \*\*Montex Mega Top\*\* (Heavy weight, High Momentum, Hard to move)

&#x20;  - \*\*Linc Ocean\*\* (Medium weight, Balanced)

&#x20;  - \*\*Nataraj Gel\*\* (Slim, very fast but easily knocked out)

5\. Add a "Start Game" button (host only) that updates the room status to 'playing' and routes players to `/play/\[id]`.



\## Phase 3: Isometric 3D Arena Setup

\*\*Goal:\*\* Create the fixed orthographic scene and the physical boundaries.

\*\*Prompt:\*\*

1\. Create the main game component using `@react-three/fiber` and `@react-three/rapier`.

2\. Configure an `OrthographicCamera` set to an isometric angle (e.g., position `\[10, 10, 10]`, looking at `\[0, 0, 0]`). Disable camera panning/rotation so the perspective remains completely static.

3\. Build the "School Desk" environment:

&#x20;  - A flat visual 2D plane with a scratched wooden desk texture acting as the floor.

&#x20;  - Invisible 3D physics colliders (`Cuboid`) at the edges of the desk. Configure these as sensor triggers (`sensor={true}`)—if a pen intersects them, it triggers a "Ring Out" event.

4\. Add static 3D obstacles on the desk (a Nataraj eraser, a Camel wooden ruler, a geometry box) using simple Three.js geometries with Rapier rigid bodies (`type="fixed"`).



\## Phase 4: Pen Physics \& Drag Mechanics

\*\*Goal:\*\* Model the pens and implement the pull-back-to-shoot mechanic.

\*\*Prompt:\*\*

1\. Create a `Pen` 3D component. Use basic composed 3D shapes (cylinders for body, cones for tips, toruses for grips) scaled to match real-world proportions and colored accurately to their brands.

2\. Apply Rapier rigid body physics (`type="dynamic"`) to the pens. Assign mass, friction, and restitution values dynamically based on the selected pen brand.

3\. Implement the drag-to-shoot interaction mechanic:

&#x20;  - Make the pen body clickable using `onPointerDown`. Detect the exact world coordinate of the click.

&#x20;  - When the user drags the mouse backward, draw a visual 3D trajectory/force arrow on the desk originating from the pen, scaling its length and color (green to red) with drag distance.

&#x20;  - On `onPointerUp`, calculate the impulse vector based on the drag distance and angle. 

&#x20;  - Apply the impulse (`applyImpulseAtPoint`) exactly at the stored contact point to ensure the pen spins realistically if flicked on the edge.



\## Phase 5: Turn-based Multiplayer Sync

\*\*Goal:\*\* Sync physics across clients so everyone sees the exact same pen fight.

\*\*Prompt:\*\*

1\. Build a turn-based state machine using Supabase Realtime Broadcast.

2\. Enforce turn logic: Only the active player's pen accepts `onPointerDown` events.

3\. When the active player releases their shot, DO NOT simulate locally immediately. Broadcast the `contact\_point` and `impulse\_vector` payload to all clients in the room via Supabase Realtime.

4\. When clients (including the sender) receive this payload, their local Rapier engines apply the exact same impulse vector to the specific pen simultaneously.

5\. Listen for the `sleep` event on all pen rigid bodies. Once all pens have stopped moving, transfer the turn to the next player.

6\. Implement the win condition: When a pen triggers the edge sensor (falls off the desk), mark that player as eliminated. The last pen standing wins. Update the Supabase `profiles` table to record the match result.

