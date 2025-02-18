import { StyleSheet, Alert, Linking, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

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

  const handleSocialLink = (url: string) => {
    Linking.openURL(url);
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
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
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
              <ThemedText
                style={[styles.memberSince, { color: colors.tabIconDefault }]}
                skipDefaultColor
              >
                Member since {new Date(session.user.created_at).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
          <View style={[styles.settingsContainer, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Ionicons name="moon" size={20} color={colors.tabIconDefault} />
                <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
              </View>
              <ThemeToggle />
            </View>
          </View>
        </View>

        {/* Connect Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Connect With Us</ThemedText>
          <View style={[styles.connectContainer, { backgroundColor: colors.cardBackground }]}>
            <ThemedButton
              variant="outlined"
              title="Twitter"
              onPress={() => handleSocialLink('https://twitter.com/openarabicio')}
              icon="logo-twitter"
              style={styles.actionButton}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <ThemedButton
              variant="outlined"
              title="Instagram"
              onPress={() => handleSocialLink('https://instagram.com/openarabic.io')}
              icon="logo-instagram"
              style={styles.actionButton}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <ThemedButton
              variant="outlined"
              title="Facebook"
              onPress={() => handleSocialLink('https://www.facebook.com/OpenArabic.io/')}
              icon="logo-facebook"
              style={styles.actionButton}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
        </View>

        {/* Support & Account Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Support & Account</ThemedText>
          <View style={[styles.actionsContainer, { backgroundColor: colors.cardBackground }]}>
            <ThemedButton
              variant="outlined"
              title="Contact Support"
              onPress={handleSupport}
              icon="mail"
              style={styles.actionButton}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <ThemedButton
              variant="outlined"
              title="Sign Out"
              onPress={signOut}
              icon="log-out"
              style={[styles.actionButton, styles.signOutButton]}
            />
          </View>
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
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
    fontSize: 14,
  },
  settingsContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  connectContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButton: {
    width: '100%',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 0,
    borderWidth: 0,
  },
  signOutButton: {
    opacity: 0.7,
  },
  divider: {
    height: 1,
    opacity: 0.2,
  },
});
