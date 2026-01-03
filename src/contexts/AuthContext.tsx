import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFaceVerified: boolean;
  isOAuthUser: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  verifyFace: (faceDescriptorHash: string) => Promise<{ success: boolean; error?: string }>;
  setFaceVerified: (verified: boolean) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  checkUsernameExists: (username: string) => Promise<boolean>;
  checkFaceHashExists: (hash: string) => Promise<boolean>;
  checkFaceSimilarity: (descriptor: number[]) => Promise<{ exists: boolean; walletAddress: string | null }>;
}

interface Profile {
  id: string;
  user_id: string;
  username: string;
  face_descriptor_hash: string | null;
  face_descriptor: number[] | null;
  wallet_address: string | null;
  wallet_private_key_encrypted: string | null;
  created_at: string;
  updated_at: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFaceVerified, setIsFaceVerified] = useState(false);

  // Check if user signed in via OAuth (no password-based auth)
  const isOAuthUser = user?.app_metadata?.provider === 'google' || 
                      (user?.app_metadata?.providers?.includes('google') ?? false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Reset face verification on logout
        if (event === 'SIGNED_OUT') {
          setIsFaceVerified(false);
          setProfile(null);
        }
        
        // Fetch profile on sign in (use setTimeout to avoid deadlock)
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const checkUsernameExists = async (username: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('username_exists', {
      _username: username.toLowerCase().trim()
    });
    
    if (error) {
      console.error('Error checking username:', error);
      return false;
    }
    
    return data === true;
  };

  const checkFaceHashExists = async (hash: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('face_hash_exists', {
      _hash: hash
    });
    
    if (error) {
      console.error('Error checking face hash:', error);
      return false;
    }
    
    return data === true;
  };

  // Check if a similar face already exists using Euclidean distance
  // Returns { exists: boolean, walletAddress: string | null }
  const checkFaceSimilarity = async (descriptor: number[]): Promise<{ exists: boolean; walletAddress: string | null }> => {
    const { data, error } = await supabase.rpc('check_face_similarity_with_wallet', {
      _descriptor: descriptor,
      _threshold: 0.6
    });
    
    if (error) {
      console.error('Error checking face similarity:', error);
      return { exists: false, walletAddress: null };
    }
    
    // The function returns a table with similar_exists and wallet_address
    if (data && data.length > 0) {
      return { exists: data[0].similar_exists, walletAddress: data[0].wallet_address };
    }
    
    return { exists: false, walletAddress: null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    // Check if username already exists
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      return { error: { message: 'Username already taken. Please choose a different one.' } };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username.toLowerCase().trim()
        }
      }
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsFaceVerified(false);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    return { error };
  };

  const verifyFace = async (faceDescriptorHash: string) => {
    if (!user || !profile) {
      return { success: false, error: 'Not authenticated' };
    }

    // If user has a stored face hash, compare it
    if (profile.face_descriptor_hash) {
      if (profile.face_descriptor_hash === faceDescriptorHash) {
        setIsFaceVerified(true);
        return { success: true };
      } else {
        return { success: false, error: 'Face does not match registered face' };
      }
    }

    return { success: false, error: 'No face registered for this account' };
  };

  const setFaceVerified = (verified: boolean) => {
    setIsFaceVerified(verified);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: { message: 'Not authenticated' } };
    }

    // Filter out face_descriptor if it's an array (handle separately via raw query)
    const { face_descriptor, ...otherUpdates } = updates as any;
    
    let updateData: Record<string, any> = { ...otherUpdates };
    
    // If face_descriptor is provided, add it to the update
    if (face_descriptor && Array.isArray(face_descriptor)) {
      updateData.face_descriptor = face_descriptor;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id);

    if (error) {
      console.error('Profile update error:', error);
    } else {
      // Refetch profile to ensure state is in sync with database
      await fetchProfile(user.id);
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: !!user,
        isFaceVerified,
        isOAuthUser,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        verifyFace,
        setFaceVerified,
        updateProfile,
        checkUsernameExists,
        checkFaceHashExists,
        checkFaceSimilarity
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
