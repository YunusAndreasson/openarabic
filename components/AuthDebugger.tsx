import type { Session } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

import { useSupabase } from '@/hooks/useSupabase';
import type { UserSession } from '@/types/auth';

import { useAuth } from '../hooks/useAuth';
import { useColors } from '../hooks/useColors';
import { supabase } from '../services/supabase';

/**
 * Debug component to help troubleshoot authentication issues
 * Add this component to your screens when debugging auth problems
 */
export default function AuthDebugger() {
  const { user, session, refreshSession } = useAuth();
  const colors = useColors();
  const [lastChecked, setLastChecked] = useState('');
  const [sessionInfo, setSessionInfo] = useState<string>('');

  // Format session info for display
  const formatSessionInfo = (session: UserSession | null) => {
    if (!session) return 'No session';

    return JSON.stringify(
      {
        expires_at: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : 'unknown',
        user_id: session.user?.id || 'unknown',
      },
      null,
      2
    );
  };

  // Check session directly from supabase
  const checkSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setSessionInfo(`Error: ${error.message}`);
      } else {
        setSessionInfo(formatSessionInfo(data.session));
      }

      setLastChecked(new Date().toISOString());
    } catch (e) {
      setSessionInfo(`Exception: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Manually refresh the token
  const handleRefresh = async () => {
    try {
      const refreshedSession = await refreshSession();
      setSessionInfo(formatSessionInfo(refreshedSession));
      setLastChecked(new Date().toISOString());
    } catch (e) {
      setSessionInfo(`Exception during refresh: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Direct token refresh
  const handleDirectRefresh = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        setSessionInfo(`Error refreshing: ${error.message}`);
      } else {
        setSessionInfo(formatSessionInfo(data.session));
      }

      setLastChecked(new Date().toISOString());
    } catch (e) {
      setSessionInfo(`Exception: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.card + '80' }]}>
      <Text style={[styles.title, { color: colors.text }]}>Auth Debugger</Text>

      <View style={styles.statusContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Status:</Text>
        <Text style={[styles.status, { color: user ? colors.success : colors.error }]}>
          {user ? 'Signed In' : 'Not Signed In'}
        </Text>
      </View>

      {user ? (
        <View style={styles.userContainer}>
          <Text style={[styles.label, { color: colors.text }]}>User ID:</Text>
          <Text style={[styles.value, { color: colors.text }]} selectable>
            {user.id}
          </Text>
        </View>
      ) : null}

      <View style={styles.sessionContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Session:</Text>
        <Text
          style={[styles.code, { color: colors.text, backgroundColor: colors.card }]}
          selectable
        >
          {sessionInfo}
        </Text>
      </View>

      <Text style={[styles.timestamp, { color: colors.secondary }]}>
        Last checked: {lastChecked || 'Never'}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={checkSession}
        >
          <Text style={styles.buttonText}>Check Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={handleRefresh}
        >
          <Text style={styles.buttonText}>Hook Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.warning }]}
          onPress={handleDirectRefresh}
        >
          <Text style={styles.buttonText}>Direct Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  code: {
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12,
    padding: 8,
  },
  container: {
    borderRadius: 8,
    margin: 10,
    padding: 16,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  sessionContainer: {
    marginBottom: 10,
  },
  status: {
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  timestamp: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  userContainer: {
    marginBottom: 10,
  },
  value: {
    fontSize: 12,
  },
});
