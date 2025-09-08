import { createClient } from '@supabase/supabase-js';

// Supabase project configuration
const supabaseUrl = 'https://jsmcduecuxtaqizhmiqo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database helper functions
export const db = {
  // User Profile Functions
  async createUserProfile(profile) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([profile])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Opportunities Functions
  async getOpportunities() {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createOpportunity(opportunity) {
    const { data, error } = await supabase
      .from('opportunities')
      .insert([opportunity])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async applyToOpportunity(opportunityId, userId) {
    const { data, error } = await supabase
      .from('applications')
      .insert([{
        opportunity_id: opportunityId,
        user_id: userId,
        status: 'pending'
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Notifications Functions
  async getNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createNotification(notification) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Communities Functions
  async getCommunities() {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async joinCommunity(communityId, userId) {
    const { data, error } = await supabase
      .from('community_members')
      .insert([{
        community_id: communityId,
        user_id: userId
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  }
};
