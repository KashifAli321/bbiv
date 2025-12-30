// Issuer configuration - Role-based access control
// Authorization is now handled server-side via database roles (admin role = authorized issuer)
// This file provides client-side helper functions that call server-side RPC functions

import { supabase } from '@/integrations/supabase/client';

// Check if the current user is an authorized issuer (has admin role)
export async function isAuthorizedIssuer(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_authorized_issuer');
    if (error) {
      console.error('Error checking issuer authorization:', error);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error('Error checking issuer authorization:', error);
    return false;
  }
}

// Get the issuer status message for the current user
export async function getIssuerStatus(): Promise<{ authorized: boolean; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        authorized: false,
        message: 'Please sign in to access issuer functions'
      };
    }

    const authorized = await isAuthorizedIssuer();
    
    if (authorized) {
      return {
        authorized: true,
        message: 'You are an authorized credential issuer'
      };
    }
    
    return {
      authorized: false,
      message: 'Only authorized administrators can issue credentials'
    };
  } catch (error) {
    console.error('Error getting issuer status:', error);
    return {
      authorized: false,
      message: 'Error checking authorization status'
    };
  }
}

// Synchronous check for use in components (uses cached value)
// For real-time checks, use the async versions above
let cachedIsAuthorized: boolean | null = null;
let cachedCheckTime: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function getCachedIssuerStatus(): Promise<boolean> {
  const now = Date.now();
  if (cachedIsAuthorized !== null && (now - cachedCheckTime) < CACHE_DURATION) {
    return cachedIsAuthorized;
  }
  
  cachedIsAuthorized = await isAuthorizedIssuer();
  cachedCheckTime = now;
  return cachedIsAuthorized;
}

export function clearIssuerCache(): void {
  cachedIsAuthorized = null;
  cachedCheckTime = 0;
}
