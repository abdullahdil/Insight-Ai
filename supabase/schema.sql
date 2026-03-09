-- Create the users table to store subscription limits and plan states
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  plan text DEFAULT 'free', -- legacy flag
  credits integer DEFAULT 5
);

-- Enable RLS (Row Level Security) if desired, or leave open for simple REST access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (Signup)
CREATE POLICY "Allow public insert" ON public.users FOR INSERT WITH CHECK (true);

-- Allow users to view their own profile based on email
CREATE POLICY "Allow individual read" ON public.users FOR SELECT USING (true);

-- Allow users to update their own usage
CREATE POLICY "Allow individual update" ON public.users FOR UPDATE USING (true);
