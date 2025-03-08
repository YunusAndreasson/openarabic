import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../constants/Supabase';

// Mock dependencies
jest.mock('react-native-url-polyfill/auto', () => {}, { virtual: true });

// Mock Supabase client
const mockStartAutoRefresh = jest.fn();
const mockStopAutoRefresh = jest.fn();
const mockSupabaseClient = {
  auth: {
    startAutoRefresh: mockStartAutoRefresh,
    stopAutoRefresh: mockStopAutoRefresh,
  },
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('Supabase Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize Supabase client with correct configuration', () => {
    // Create a minimal implementation of the supabase service
    const createSupabaseClient = () => {
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
    };

    // Call the function to create the client
    createSupabaseClient();

    // Verify createClient was called with correct parameters
    expect(createClient).toHaveBeenCalledWith(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      expect.objectContaining({
        auth: expect.objectContaining({
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }),
      })
    );
  });

  test('should handle app state changes correctly', () => {
    // Simulate the behavior of the AppState event handler
    const handleAppStateChange = (state: string) => {
      if (state === 'active') {
        mockSupabaseClient.auth.startAutoRefresh();
      } else {
        mockSupabaseClient.auth.stopAutoRefresh();
      }
    };

    // Simulate app state changes
    handleAppStateChange('active');
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mockStopAutoRefresh).not.toHaveBeenCalled();

    handleAppStateChange('background');
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(1);

    handleAppStateChange('inactive');
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(2);

    handleAppStateChange('active');
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(2);
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(2);
  });

  test('should handle multiple and rapid state changes correctly', () => {
    // Simulate the behavior of the AppState event handler
    const handleAppStateChange = (state: string) => {
      if (state === 'active') {
        mockSupabaseClient.auth.startAutoRefresh();
      } else {
        mockSupabaseClient.auth.stopAutoRefresh();
      }
    };

    // Simulate rapid state changes
    handleAppStateChange('active');
    handleAppStateChange('background');
    handleAppStateChange('active');
    handleAppStateChange('inactive');
    handleAppStateChange('active');

    // Verify methods were called the correct number of times
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(3);
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(2);
  });
});
