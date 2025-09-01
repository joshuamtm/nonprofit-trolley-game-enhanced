import { create } from 'zustand';
import { Database, isDemo } from '../services/supabaseCompat';
import { RoomService } from '../services/rooms';
import { MockRoomService } from '../services/mockData';
import { realtimeService } from '../services/realtimeLegacy';

type Session = Database['public']['Tables']['sessions']['Row'];
type Participant = Database['public']['Tables']['participants']['Row'];
type Scenario = Database['public']['Tables']['scenarios']['Row'];
type Vote = Database['public']['Tables']['votes']['Row'];

export interface GameState {
  // Session state
  session: Session | null;
  participant: Participant | null;
  currentScenario: Scenario | null;
  participants: Participant[];
  
  // Voting state
  hasVoted: boolean;
  myVote: 'pull' | 'dont_pull' | null;
  myRationale: string;
  voteSummary: {
    total_votes: number;
    pull_votes: number;
    dont_pull_votes: number;
  } | null;
  
  // Timer state
  timerActive: boolean;
  secondsRemaining: number;
  
  // UI state
  loading: boolean;
  error: string | null;
  showResults: boolean;
  
  // Rationales data
  rationales: {
    pull: string[];
    dont_pull: string[];
  };
}

export interface GameActions {
  // Room actions
  createRoom: (config?: any) => Promise<void>;
  joinRoom: (roomCode: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  
  // Voting actions
  submitVote: (vote: 'pull' | 'dont_pull', rationale?: string, mitigation?: string) => Promise<void>;
  
  // Scenario actions
  startScenario: (scenarioId: string) => Promise<void>;
  
  // Timer actions
  startTimer: (duration: number) => void;
  stopTimer: () => void;
  
  // State updates
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  updateVoteSummary: (summary: any) => void;
  updateRationales: (rationales: any) => void;
  reset: () => void;
}

const initialState: GameState = {
  session: null,
  participant: null,
  currentScenario: null,
  participants: [],
  hasVoted: false,
  myVote: null,
  myRationale: '',
  voteSummary: null,
  timerActive: false,
  secondsRemaining: 0,
  loading: false,
  error: null,
  showResults: false,
  rationales: {
    pull: [],
    dont_pull: [],
  },
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  createRoom: async (config = {}) => {
    set({ loading: true, error: null });
    
    try {
      const { room, error } = isDemo 
        ? await MockRoomService.createRoom(config)
        : await RoomService.createRoom(config);
      
      if (error) throw error;
      
      set({ session: room, loading: false });
      
      // Only set up realtime in non-demo mode
      if (!isDemo) {
        // Join realtime channel
        await realtimeService.joinRoom(room.id);
        
        // Set up event listeners
        realtimeService.on('participant_joined', (data) => {
          console.log('Participant joined:', data);
        });
        
        realtimeService.on('participant_left', (data) => {
          console.log('Participant left:', data);
        });
      }
      
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  joinRoom: async (roomCode: string) => {
    set({ loading: true, error: null });
    
    try {
      if (isDemo) {
        const { participant, error } = await MockRoomService.joinRoom(roomCode);
        if (error) throw error;
        
        const { data: session } = await MockRoomService.getRoomStatus(roomCode);
        
        set({ 
          participant, 
          session: session as Session,
          loading: false 
        });
      } else {
        const { participant, error } = await RoomService.joinRoom(roomCode);
        
        if (error) throw error;
        
        // Get session info
        const { data: session } = await RoomService.getRoomStatus(roomCode);
        
        set({ 
          participant, 
          session: session as Session,
          loading: false 
        });
        
        // Join realtime channel
        await realtimeService.joinRoom(participant.session_id);
        
        // Set up event listeners
        realtimeService.on('vote_cast', (data) => {
          get().updateVoteSummary(data);
        });
        
        realtimeService.on('scenario_started', async (data) => {
          // Load the new scenario data
          console.log('📢 scenario_started event received:', data);
          try {
            // Load scenario from database
            console.log('🔍 Loading scenario from database...');
            const { data: scenarios, error } = await RoomService.loadScenarios();
            if (scenarios && scenarios.length > 0) {
              const currentScenario = scenarios.find(s => s.id === data.scenario_id) || scenarios[0];
              console.log('🎯 Setting current scenario:', currentScenario?.title);
              set({ 
                currentScenario,
                hasVoted: false,
                myVote: null,
                myRationale: '',
                voteSummary: null,
                showResults: false,
                timerActive: true,  // Set timer as active when scenario starts
                secondsRemaining: 30  // Default to 30 seconds
              });
              console.log('✅ Scenario state updated for participants');
            }
          } catch (error) {
            console.error('❌ Failed to load scenario:', error);
          }
        });
        
        realtimeService.on('timer_started', (data) => {
          get().startTimer(data.duration);
        });
        
        realtimeService.on('timer_tick', (data) => {
          set({ secondsRemaining: data.seconds_remaining });
        });
        
        realtimeService.on('decision_announced', (data) => {
          set({ 
            showResults: true,
            timerActive: false,
          });
        });
      }
      
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  leaveRoom: async () => {
    await realtimeService.leaveRoom();
    set(initialState);
  },

  submitVote: async (vote: 'pull' | 'dont_pull', rationale = '', mitigation = '') => {
    const { session, participant, currentScenario } = get();
    
    if (!session || !participant || !currentScenario) {
      set({ error: 'Invalid session state' });
      return;
    }
    
    if (get().hasVoted) {
      set({ error: 'You have already voted on this scenario' });
      return;
    }
    
    set({ loading: true });
    
    try {
      const { error } = isDemo 
        ? await MockRoomService.submitVote(session.id, participant.id, currentScenario.id, vote, rationale, mitigation)
        : await RoomService.submitVote(session.id, participant.id, currentScenario.id, vote, rationale, mitigation);
      
      if (error) throw error;
      
      set({ 
        hasVoted: true,
        myVote: vote,
        myRationale: rationale,
        loading: false 
      });
      
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  startScenario: async (scenarioId: string) => {
    const { session } = get();
    
    if (!session) return;
    
    try {
      // Load scenario data first
      const { data: scenarios, error: loadError } = await RoomService.loadScenarios();
      if (loadError) throw loadError;
      
      const scenario = scenarios?.find(s => s.id === scenarioId);
      if (!scenario) throw new Error('Scenario not found');
      
      // Only call RoomService in non-demo mode (demo scenarios are handled in components)
      if (!isDemo) {
        await RoomService.startScenario(session.id, scenarioId);
      }
      
      // Set the current scenario and reset voting state
      set({
        currentScenario: scenario,
        hasVoted: false,
        myVote: null,
        myRationale: '',
        voteSummary: null,
        showResults: false,
        rationales: { pull: [], dont_pull: [] },
      });
      
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  startTimer: (duration: number) => {
    set({ 
      timerActive: true, 
      secondsRemaining: duration 
    });
    
    const timer = setInterval(() => {
      const { secondsRemaining, timerActive } = get();
      
      if (!timerActive) {
        clearInterval(timer);
        return;
      }
      
      if (secondsRemaining <= 1) {
        clearInterval(timer);
        set({ 
          timerActive: false, 
          secondsRemaining: 0,
          showResults: true 
        });
        return;
      }
      
      set({ secondsRemaining: secondsRemaining - 1 });
    }, 1000);
  },

  stopTimer: () => {
    set({ timerActive: false });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  updateVoteSummary: (summary: any) => {
    set({ voteSummary: summary });
  },

  updateRationales: (rationales: any) => {
    set({ rationales: rationales });
  },

  reset: () => {
    set(initialState);
  },
}));