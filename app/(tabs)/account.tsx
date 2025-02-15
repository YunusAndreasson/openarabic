import { StyleSheet, Alert, Linking, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/services/supabase';
import Auth from '@/components/Auth';
import { useColors } from '@/hooks/useColors';

export default function AccountScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const colors = useColors();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  async function signOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert('Error', error.message);
        },
      },
    ]);
  }

  const getInitials = (email: string) => {
    // Get username part before @ symbol
    const username = email.split('@')[0];
    // Split by common separators and get first letter of each part
    const parts = username.split(/[-._]/);
    // Take first two parts and get their first letters
    return parts
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  };

  const handleSupport = () => {
    Linking.openURL('mailto:yunus@edenmind.com');
  };

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.authContainer}>
          <ThemedText type="title" style={styles.welcomeTitle}>
            Welcome
          </ThemedText>
          <ThemedText style={styles.subtitle}>Sign in to access your account</ThemedText>
          <Auth />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View>
          <View style={styles.avatarContainer}>
            <View
              style={[styles.avatar, { backgroundColor: colors.tint, shadowColor: colors.text }]}
            >
              <ThemedText
                style={[styles.avatarText, { color: colors.background }]}
                skipDefaultColor
              >
                {session.user.email ? getInitials(session.user.email) : 'U'}
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText style={styles.email} numberOfLines={1} ellipsizeMode="tail">
                {session.user.email}
              </ThemedText>
              <ThemedText style={styles.memberSince}>
                Member since {new Date(session.user.created_at).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>

          <View style={styles.settingsContainer}>
            <View style={styles.settingRow}>
              <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
              <ThemeToggle />
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <ThemedButton
            variant="outlined"
            title="Need Help?"
            onPress={handleSupport}
            style={styles.button}
          />
          <ThemedButton
            variant="outlined"
            title="Sign Out"
            onPress={signOut}
            style={styles.button}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 32,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    height: 32,
    lineHeight: 32,
    marginTop: -2,
  },
  profileInfo: {
    flex: 1,
  },
  email: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberSince: {
    opacity: 0.6,
    fontSize: 14,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    width: '100%',
  },
  settingsContainer: {
    marginTop: 32,
    borderRadius: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});
