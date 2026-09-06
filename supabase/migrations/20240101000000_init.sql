-- Create enum types
CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'finished');
CREATE TYPE room_mode AS ENUM ('1v1', 'ffa', 'team');
CREATE TYPE player_status AS ENUM ('joined', 'ready', 'eliminated', 'winner');

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  wins INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create rooms table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES profiles(id) NOT NULL,
  code TEXT UNIQUE NOT NULL, -- Short code like 'A7B2'
  status room_status DEFAULT 'waiting' NOT NULL,
  mode room_mode DEFAULT '1v1' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create room_players table
CREATE TABLE room_players (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team TEXT,
  status player_status DEFAULT 'joined' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (room_id, player_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

-- Rooms Policies
CREATE POLICY "Rooms are viewable by everyone."
  ON rooms FOR SELECT
  USING ( true );

CREATE POLICY "Authenticated users can create rooms."
  ON rooms FOR INSERT
  WITH CHECK ( auth.uid() = host_id );

CREATE POLICY "Hosts can update their rooms."
  ON rooms FOR UPDATE
  USING ( auth.uid() = host_id );

CREATE POLICY "Hosts can delete their rooms."
  ON rooms FOR DELETE
  USING ( auth.uid() = host_id );

-- Room Players Policies
CREATE POLICY "Room players are viewable by everyone."
  ON room_players FOR SELECT
  USING ( true );

CREATE POLICY "Authenticated users can join rooms."
  ON room_players FOR INSERT
  WITH CHECK ( auth.uid() = player_id );

CREATE POLICY "Players can update their own status."
  ON room_players FOR UPDATE
  USING ( auth.uid() = player_id OR auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id) );

CREATE POLICY "Players can leave rooms."
  ON room_players FOR DELETE
  USING ( auth.uid() = player_id OR auth.uid() IN (SELECT host_id FROM rooms WHERE id = room_id) );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    new.email, -- Default username is email, can be changed later
    ''
  );
  RETURN new;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
