// Compatibility layer for migrating from Supabase to new API
// This file provides the same interface as the old supabase.ts but uses the new services

export const supabase = null; // No longer using Supabase client
export const isDemo = !process.env.REACT_APP_API_URL; // Demo mode if no API URL

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          room_code: string;
          facilitator_id: string | null;
          created_at: string;
          ended_at: string | null;
          config: {
            timerDuration: number;
            maxParticipants: number;
            moderationEnabled: boolean;
            contentWarnings: boolean;
          };
          status: 'waiting' | 'active' | 'complete' | 'cancelled';
          metadata: Record<string, any>;
        };
        Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>;
      };
      participants: {
        Row: {
          id: string;
          session_id: string;
          fingerprint: string;
          joined_at: string;
          left_at: string | null;
          user_agent: string | null;
          ip_hash: string | null;
          is_active: boolean;
          metadata: Record<string, any>;
        };
        Insert: Omit<Database['public']['Tables']['participants']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['participants']['Insert']>;
      };
      scenarios: {
        Row: {
          id: string;
          title: string;
          context: string;
          ai_option: string;
          non_ai_option: string;
          assumptions: string[];
          ethical_axes: string[];
          risk_notes: string;
          metrics: {
            benefit_estimate: string;
            error_rate?: string;
            cost_comparison?: string;
          };
          content_warnings: string[];
          difficulty_level: 'beginner' | 'intermediate' | 'advanced';
          discussion_prompts: string[];
          mitigations?: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['scenarios']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['scenarios']['Insert']>;
      };
      votes: {
        Row: {
          id: string;
          session_id: string;
          participant_id: string;
          scenario_id: string;
          vote: 'pull' | 'dont_pull';
          created_at: string;
          latency_ms: number | null;
        };
        Insert: Omit<Database['public']['Tables']['votes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['votes']['Insert']>;
      };
      rationales: {
        Row: {
          id: string;
          vote_id: string;
          original_text: string;
          processed_text: string | null;
          word_count: number | null;
          moderated: boolean;
          moderation_reason: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rationales']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['rationales']['Insert']>;
      };
    };
    Views: {
      active_sessions: {
        Row: {
          id: string;
          room_code: string;
          created_at: string;
          config: any;
          active_participants: number;
          current_scenario_id: string | null;
          current_scenario_title: string | null;
        };
      };
      vote_summary: {
        Row: {
          session_id: string;
          scenario_id: string;
          total_votes: number;
          pull_votes: number;
          dont_pull_votes: number;
          avg_latency_ms: number | null;
        };
      };
    };
    Functions: {
      create_session: {
        Args: {
          p_facilitator_id?: string;
          p_config?: any;
        };
        Returns: Database['public']['Tables']['sessions']['Row'];
      };
      generate_room_code: {
        Args: {};
        Returns: string;
      };
    };
  };
};

if (isDemo) {
  console.warn('🎮 Running in DEMO MODE - API not configured');
}