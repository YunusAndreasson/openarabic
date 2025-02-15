import { StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
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

  const dynamicStyles = {
    avatar: {
      shadowColor: colors.text,
      backgroundColor: colors.tint,
    },
    avatarText: {
      color: colors.background,
    },
    menuItem: {
      borderBottomColor: colors.icon,
    },
  };

  if (!session) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <ThemedView style={styles.authContainer}>
          <ThemedText type="title" style={styles.welcomeTitle}>
            Welcome
          </ThemedText>
          <ThemedText style={styles.subtitle}>Sign in to access your account</ThemedText>
          <Auth />
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <ThemedView style={styles.profileHeader}>
        <ThemedView style={styles.avatarContainer}>
          <ThemedView style={[styles.avatar, dynamicStyles.avatar]}>
            <ThemedText style={[styles.avatarText, dynamicStyles.avatarText]}>
              {session.user.email ? getInitials(session.user.email) : 'U'}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.profileInfo}>
            <ThemedText style={styles.email} numberOfLines={1} ellipsizeMode="tail">
              {session.user.email}
            </ThemedText>
            <ThemedText style={styles.memberSince}>
              Member since {new Date(session.user.created_at).toLocaleDateString()}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      {/* Settings Section */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Account Settings</ThemedText>

        <TouchableOpacity
          style={[styles.menuItem, dynamicStyles.menuItem]}
          onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
        >
          <ThemedView style={styles.menuItemLeft}>
            <ThemedText style={styles.menuItemText}>Edit Profile</ThemedText>
          </ThemedView>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, dynamicStyles.menuItem]}
          onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
        >
          <ThemedView style={styles.menuItemLeft}>
            <ThemedText style={styles.menuItemText}>Change Password</ThemedText>
          </ThemedView>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, dynamicStyles.menuItem]}
          onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
        >
          <ThemedView style={styles.menuItemLeft}>
            <ThemedText style={styles.menuItemText}>Notifications</ThemedText>
          </ThemedView>
        </TouchableOpacity>
      </ThemedView>

      {/* Support Section */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Support</ThemedText>

        <TouchableOpacity
          style={[styles.menuItem, dynamicStyles.menuItem]}
          onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
        >
          <ThemedView style={styles.menuItemLeft}>
            <ThemedText style={styles.menuItemText}>Help Center</ThemedText>
          </ThemedView>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, dynamicStyles.menuItem]}
          onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
        >
          <ThemedView style={styles.menuItemLeft}>
            <ThemedText style={styles.menuItemText}>Terms & Privacy</ThemedText>
          </ThemedView>
        </TouchableOpacity>
      </ThemedView>

      {/* Sign Out Button */}
      <ThemedButton
        variant="outlined"
        title="Sign Out"
        onPress={signOut}
        style={styles.signOutButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
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
  profileHeader: {
    marginBottom: 24,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    opacity: 0.8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  signOutButton: {
    marginTop: 8,
  },
});
