import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useAuth } from '../authprovider';
import {
    changePasswordWithReauth,
    connectSocialProvider,
    fetchActiveSessions,
    fetchLoginHistory,
    formatSecurityDate,
    generateBackupCodes,
    getCurrentSecuritySessionId,
    getFriendlyAuthErrorMessage,
    isIdentityPlatformMfaAvailable,
    reportSuspiciousLogin,
    requestVerifiedEmailChange,
    resendCurrentEmailVerification,
    revokeAllOtherSessions,
    revokeSession,
    SOCIAL_PROVIDERS,
    subscribeToSecuritySettings,
    unlinkSocialProvider,
    updateMfaPreference,
    updateNewLoginEmailPreference,
    validatePassword,
    type LoginHistoryEntry,
    type LoginHistoryStatus,
    type SecuritySession,
    type SecuritySettings,
    type SocialProviderId,
} from '../securityService';

const APP_BACKGROUND = '#05071A';
const PANEL = '#101427';
const PANEL_ALT = '#0B1022';
const PRIMARY_TEXT = '#FAFAFE';
const SECONDARY_TEXT = '#B9B9BE';
const MUTED_TEXT = '#8F95AA';
const BORDER = 'rgba(255,255,255,0.10)';
const ACCENT = '#EAF2FF';
const SUCCESS = '#6EE7A8';
const WARNING = '#FFD166';
const DANGER = '#FF4E6A';

const DEFAULT_SETTINGS: SecuritySettings = {
  mfaEnabled: false,
  backupCodes: [],
  emailNotificationsNewLogin: true,
  updatedAt: null,
};

type LoadingKey =
  | 'password'
  | 'email'
  | 'resendEmail'
  | 'sessions'
  | 'revokeAll'
  | 'backupCodes'
  | 'mfa'
  | 'preference'
  | 'loginHistory'
  | `revoke:${string}`
  | `provider:${string}`
  | `report:${string}`;

type ToastType = 'success' | 'error' | 'info';

type ToastState = {
  message: string;
  type: ToastType;
} | null;

export default function ManageProfileScreen() {
  const router = useRouter();
  const { user, initializing, isEmailVerified, checkEmailVerification } = useAuth();
  const { width } = useWindowDimensions();
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState<LoadingKey | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [historyFilter, setHistoryFilter] = useState<LoginHistoryStatus | 'all'>('all');
  const [providerVersion, setProviderVersion] = useState(0);

  const isCompact = width < 360;
  const isNarrow = width < 420;

  const layoutStyles = useMemo(
    () => ({
      statusLine: {
        flexDirection: isNarrow ? 'column' : 'row',
        alignItems: isNarrow ? 'flex-start' : 'center',
        gap: isNarrow ? 10 : 12,
      },
      statusRight: {
        flexDirection: isNarrow ? 'row' : 'column',
        alignItems: isNarrow ? 'center' : 'flex-end',
        alignSelf: isNarrow ? 'stretch' : 'auto',
        gap: isNarrow ? 10 : 8,
      },
      backupHeader: {
        flexDirection: isNarrow ? 'column' : 'row',
        alignItems: isNarrow ? 'flex-start' : 'center',
        gap: isNarrow ? 10 : 10,
      },
      inlineActions: {
        flexWrap: 'wrap',
        justifyContent: isNarrow ? 'flex-start' : 'flex-end',
      },
      sectionToolbar: {
        flexDirection: isNarrow ? 'column' : 'row',
        alignItems: isNarrow ? 'flex-start' : 'center',
        gap: isNarrow ? 10 : 10,
      },
      emailRow: {
        flexDirection: isNarrow ? 'column' : 'row',
        alignItems: isNarrow ? 'flex-start' : 'center',
        gap: isNarrow ? 8 : 10,
      },
      codeGrid: {
        gap: isCompact ? 6 : 8,
      },
    }),
    [isCompact, isNarrow]
  );

  const passwordValidation = useMemo(
    () => validatePassword(newPassword),
    [newPassword]
  );
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canChangePassword =
    currentPassword.length > 0 && passwordValidation.isValid && passwordsMatch;
  const mfaAvailable = isIdentityPlatformMfaAvailable();

  const connectedProviderIds = useMemo(() => {
    void providerVersion;
    return new Set(user?.providerData.map((provider) => provider.providerId) ?? []);
  }, [providerVersion, user?.providerData]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/');
    }
  }, [initializing, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToSecuritySettings(
      user,
      setSettings,
      (error) => showToast(getFriendlyAuthErrorMessage(error), 'error')
    );
  }, [showToast, user]);

  const loadSessions = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading('sessions');

    try {
      const [activeSessions, sessionId] = await Promise.all([
        fetchActiveSessions(user),
        getCurrentSecuritySessionId(user),
      ]);
      setSessions(activeSessions);
      setCurrentSessionId(sessionId);
    } catch (error) {
      showToast(getFriendlyAuthErrorMessage(error), 'error');
    } finally {
      setLoading((current) => (current === 'sessions' ? null : current));
    }
  }, [showToast, user]);

  const loadLoginHistory = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading('loginHistory');

    try {
      setLoginHistory(await fetchLoginHistory(user, historyFilter));
    } catch (error) {
      showToast(getFriendlyAuthErrorMessage(error), 'error');
    } finally {
      setLoading((current) => (current === 'loginHistory' ? null : current));
    }
  }, [historyFilter, showToast, user]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void loadLoginHistory();
  }, [loadLoginHistory]);

  const handleChangePassword = useCallback(async () => {
    if (!user || loading) {
      return;
    }

    if (!canChangePassword) {
      showToast('Complete all password rules before updating.', 'error');
      return;
    }

    setLoading('password');

    try {
      await changePasswordWithReauth(user, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully.', 'success');
    } catch (error) {
      showToast(getFriendlyAuthErrorMessage(error), 'error');
    } finally {
      setLoading(null);
    }
  }, [canChangePassword, currentPassword, loading, newPassword, showToast, user]);

  const handleOpenEmailModal = useCallback(() => {
    setNewEmail(user?.email ?? '');
    setEmailPassword('');
    setIsEmailModalVisible(true);
  }, [user?.email]);

  const handleRequestEmailChange = useCallback(async () => {
    if (!user || loading) {
      return;
    }

    if (!newEmail.trim() || !emailPassword) {
      showToast('Enter the new email and current password.', 'error');
      return;
    }

    setLoading('email');

    try {
      await requestVerifiedEmailChange(user, newEmail, emailPassword);
      setIsEmailModalVisible(false);
      setEmailPassword('');
      showToast('Verification email sent to your new address.', 'success');
    } catch (error) {
      showToast(getFriendlyAuthErrorMessage(error), 'error');
    } finally {
      setLoading(null);
    }
  }, [emailPassword, loading, newEmail, showToast, user]);

  const handleResendVerification = useCallback(async () => {
    if (!user || loading) {
      return;
    }

    setLoading('resendEmail');

    try {
      await resendCurrentEmailVerification(user);
      await checkEmailVerification();
      showToast('Verification email sent.', 'success');
    } catch (error) {
      showToast(getFriendlyAuthErrorMessage(error), 'error');
    } finally {
      setLoading(null);
    }
  }, [checkEmailVerification, loading, showToast, user]);

  const handleMfaToggle = useCallback(
    async (enabled: boolean) => {
      if (!user || loading) {
        return;
      }

      if (!mfaAvailable) {
        showToast(getFriendlyAuthErrorMessage(new Error('MFA_UPGRADE_REQUIRED')), 'info');
        return;
      }

      setLoading('mfa');

      try {
        await updateMfaPreference(user, enabled);
        showToast(enabled ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.', 'success');
      } catch (error) {
        showToast(getFriendlyAuthErrorMessage(error), 'error');
      } finally {
        setLoading(null);
      }
    },
    [loading, mfaAvailable, showToast, user]
  );

  const handleGenerateBackupCodes = useCallback(() => {
    if (!user || loading) {
      return;
    }

    if (!mfaAvailable) {
      showToast(getFriendlyAuthErrorMessage(new Error('MFA_UPGRADE_REQUIRED')), 'info');
      return;
    }

    Alert.alert(
      'Generate new backup codes?',
      'Your old backup codes will stop being shown here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setLoading('backupCodes');

            try {
              await generateBackupCodes(user);
              showToast('New backup codes generated.', 'success');
            } catch (error) {
              showToast(getFriendlyAuthErrorMessage(error), 'error');
            } finally {
              setLoading(null);
            }
          },
        },
      ]
    );
  }, [loading, mfaAvailable, showToast, user]);

  const handleCopyBackupCodes = useCallback(async () => {
    if (!settings.backupCodes.length) {
      showToast('No backup codes to copy yet.', 'info');
      return;
    }

    await Clipboard.setStringAsync(settings.backupCodes.join('\n'));
    showToast('Backup codes copied.', 'success');
  }, [settings.backupCodes, showToast]);

  const handleRevokeSession = useCallback(
    (session: SecuritySession) => {
      if (!user || loading || session.id === currentSessionId) {
        return;
      }

      Alert.alert(
        'Revoke this session?',
        `${session.deviceName} will be signed out the next time it checks in.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Revoke',
            style: 'destructive',
            onPress: async () => {
              const key = `revoke:${session.id}` as const;
              setLoading(key);

              try {
                await revokeSession(user, session.id);
                await loadSessions();
                showToast('Session revoked.', 'success');
              } catch (error) {
                showToast(getFriendlyAuthErrorMessage(error), 'error');
              } finally {
                setLoading(null);
              }
            },
          },
        ]
      );
    },
    [currentSessionId, loadSessions, loading, showToast, user]
  );

  const handleRevokeAllOtherSessions = useCallback(() => {
    if (!user || loading) {
      return;
    }

    Alert.alert(
      'Sign out all other devices?',
      'Every other active RoomRadar session will be revoked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setLoading('revokeAll');

            try {
              await revokeAllOtherSessions(user, currentSessionId);
              await loadSessions();
              showToast('Other devices signed out.', 'success');
            } catch (error) {
              showToast(getFriendlyAuthErrorMessage(error), 'error');
            } finally {
              setLoading(null);
            }
          },
        },
      ]
    );
  }, [currentSessionId, loadSessions, loading, showToast, user]);

  const handleConnectProvider = useCallback(
    async (providerId: SocialProviderId) => {
      if (!user || loading) {
        return;
      }

      const key = `provider:${providerId}` as const;
      setLoading(key);

      try {
        await connectSocialProvider(user, providerId);
        setProviderVersion((value) => value + 1);
        showToast('Provider connected.', 'success');
      } catch (error) {
        showToast(getFriendlyAuthErrorMessage(error), 'error');
      } finally {
        setLoading(null);
      }
    },
    [loading, showToast, user]
  );

  const handleUnlinkProvider = useCallback(
    (providerId: SocialProviderId, label: string) => {
      if (!user || loading) {
        return;
      }

      Alert.alert(`Unlink ${label}?`, 'You can reconnect this provider later.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            const key = `provider:${providerId}` as const;
            setLoading(key);

            try {
              await unlinkSocialProvider(user, providerId);
              setProviderVersion((value) => value + 1);
              showToast(`${label} unlinked.`, 'success');
            } catch (error) {
              showToast(getFriendlyAuthErrorMessage(error), 'error');
            } finally {
              setLoading(null);
            }
          },
        },
      ]);
    },
    [loading, showToast, user]
  );

  const handlePreferenceToggle = useCallback(
    async (enabled: boolean) => {
      if (!user || loading) {
        return;
      }

      setLoading('preference');

      try {
        await updateNewLoginEmailPreference(user, enabled);
        showToast('Login notification preference updated.', 'success');
      } catch (error) {
        showToast(getFriendlyAuthErrorMessage(error), 'error');
      } finally {
        setLoading(null);
      }
    },
    [loading, showToast, user]
  );

  const handleReportSuspicious = useCallback(
    (entry: LoginHistoryEntry) => {
      if (!user || loading || entry.reported) {
        return;
      }

      Alert.alert('Report suspicious activity?', 'We will flag this login entry for review.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            const key = `report:${entry.id}` as const;
            setLoading(key);

            try {
              await reportSuspiciousLogin(user, entry);
              await loadLoginHistory();
              showToast('Login entry reported.', 'success');
            } catch (error) {
              showToast(getFriendlyAuthErrorMessage(error), 'error');
            } finally {
              setLoading(null);
            }
          },
        },
      ]);
    },
    [loadLoginHistory, loading, showToast, user]
  );

  if (initializing || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={APP_BACKGROUND} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={APP_BACKGROUND} />

      {toast ? <Toast toast={toast} /> : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.back()}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={PRIMARY_TEXT} />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Password & Security</Text>
              <Text style={styles.subtitle}>Manage your account access and recent activity.</Text>
            </View>
          </View>

          <Section title="Change Password" icon="key-outline">
            <SecureInput
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secure={!showCurrentPassword}
              onToggleSecure={() => setShowCurrentPassword((value) => !value)}
              textContentType="password"
            />
            <SecureInput
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secure={!showNewPassword}
              onToggleSecure={() => setShowNewPassword((value) => !value)}
              textContentType="newPassword"
            />
            <PasswordStrengthMeter score={passwordValidation.score} strength={passwordValidation.strength} />
            <View style={styles.ruleList}>
              {passwordValidation.rules.map((rule) => (
                <RuleRow key={rule.key} label={rule.label} met={rule.met} />
              ))}
              <RuleRow
                label="Passwords match"
                met={passwordsMatch}
                pending={!confirmPassword.length}
              />
            </View>
            <SecureInput
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secure={!showConfirmPassword}
              onToggleSecure={() => setShowConfirmPassword((value) => !value)}
              textContentType="newPassword"
            />
            <PrimaryButton
              label="Update password"
              icon="shield-checkmark-outline"
              loading={loading === 'password'}
              disabled={!canChangePassword || Boolean(loading)}
              onPress={handleChangePassword}
            />
          </Section>

          <Section title="Email Management" icon="mail-outline">
            <View style={[styles.emailRow, layoutStyles.emailRow]}>
              <View style={styles.emailTextWrap}>
                <Text style={styles.label}>Current email</Text>
                <Text style={styles.primaryValue} numberOfLines={1}>{user.email ?? 'No email on file'}</Text>
              </View>
              <StatusBadge
                label={isEmailVerified ? 'Verified' : 'Unverified'}
                tone={isEmailVerified ? 'success' : 'warning'}
              />
            </View>
            <View style={styles.buttonRow}>
              <SecondaryButton
                label="Change Email"
                icon="create-outline"
                onPress={handleOpenEmailModal}
                disabled={Boolean(loading)}
              />
              {!isEmailVerified ? (
                <SecondaryButton
                  label="Resend Verification"
                  icon="send-outline"
                  onPress={handleResendVerification}
                  loading={loading === 'resendEmail'}
                  disabled={Boolean(loading)}
                />
              ) : null}
            </View>
          </Section>

          <Section title="Multi-Factor Authentication" icon="lock-closed-outline">
            <View style={[styles.statusLine, layoutStyles.statusLine]}>
              <View>
                <Text style={styles.primaryValue}>Authenticator app</Text>
                <Text style={styles.metaText}>
                  {mfaAvailable
                    ? 'Use Firebase Identity Platform MFA enrollment.'
                    : 'Upgrade required for Firebase authenticator app MFA.'}
                </Text>
              </View>
              <View style={[styles.statusRight, layoutStyles.statusRight]}>
                <StatusBadge label={settings.mfaEnabled ? 'On' : 'Off'} tone={settings.mfaEnabled ? 'success' : 'muted'} />
                <Switch
                  value={settings.mfaEnabled}
                  onValueChange={handleMfaToggle}
                  disabled={Boolean(loading)}
                  thumbColor={settings.mfaEnabled ? SUCCESS : '#F4F5F7'}
                  trackColor={{ false: '#384056', true: 'rgba(110,231,168,0.45)' }}
                  accessibilityLabel="Toggle two-factor authentication"
                />
              </View>
            </View>
            {settings.mfaEnabled ? (
              <SecondaryButton
                label="Manage Authenticator App"
                icon="qr-code-outline"
                onPress={() => showToast('Open the Firebase Identity Platform MFA enrollment flow for authenticator app setup.', 'info')}
                disabled={Boolean(loading)}
              />
            ) : null}
            <View style={[styles.backupHeader, layoutStyles.backupHeader]}>
              <Text style={styles.label}>Backup codes</Text>
              <View style={[styles.inlineActions, layoutStyles.inlineActions]}>
                <IconAction
                  icon="copy-outline"
                  label="Copy backup codes"
                  onPress={handleCopyBackupCodes}
                  disabled={!settings.backupCodes.length}
                />
                <IconAction
                  icon="refresh-outline"
                  label="Generate backup codes"
                  onPress={handleGenerateBackupCodes}
                  loading={loading === 'backupCodes'}
                  disabled={Boolean(loading)}
                />
              </View>
            </View>
            <View style={[styles.codeGrid, layoutStyles.codeGrid]}>
              {settings.backupCodes.length ? (
                settings.backupCodes.map((code) => (
                  <Text key={code} style={styles.backupCode}>{code}</Text>
                ))
              ) : (
                <Text style={styles.emptyText}>No backup codes generated.</Text>
              )}
            </View>
          </Section>

          <Section title="Active Sessions" icon="phone-portrait-outline">
            <View style={[styles.sectionToolbar, layoutStyles.sectionToolbar]}>
              <Text style={styles.metaText}>{sessions.length} active session{sessions.length === 1 ? '' : 's'}</Text>
              <IconAction
                icon="refresh-outline"
                label="Refresh sessions"
                onPress={loadSessions}
                loading={loading === 'sessions'}
              />
            </View>
            {sessions.length ? (
              sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isCurrent={session.id === currentSessionId}
                  loading={loading === `revoke:${session.id}`}
                  onRevoke={() => handleRevokeSession(session)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No active sessions found.</Text>
            )}
            <DangerButton
              label="Sign Out All Other Devices"
              icon="log-out-outline"
              loading={loading === 'revokeAll'}
              disabled={Boolean(loading) || sessions.filter((session) => session.id !== currentSessionId).length === 0}
              onPress={handleRevokeAllOtherSessions}
            />
          </Section>

          <Section title="Connected Accounts" icon="link-outline">
            {SOCIAL_PROVIDERS.map((provider) => {
              const isConnected = connectedProviderIds.has(provider.id);
              const providerLoading = loading === `provider:${provider.id}`;

              return (
                <ProviderRow
                  key={provider.id}
                  icon={provider.icon as keyof typeof Ionicons.glyphMap}
                  label={provider.label}
                  connected={isConnected}
                  loading={providerLoading}
                  onConnect={() => handleConnectProvider(provider.id)}
                  onUnlink={() => handleUnlinkProvider(provider.id, provider.label)}
                  disabled={Boolean(loading)}
                />
              );
            })}
          </Section>

          <Section title="Login History" icon="time-outline">
            <View style={styles.segmentedControl} accessibilityRole="tablist">
              {[
                { key: 'all', label: 'All' },
                { key: 'success', label: 'Successful' },
                { key: 'failed', label: 'Failed' },
              ].map((tab) => {
                const active = historyFilter === tab.key;

                return (
                  <Pressable
                    key={tab.key}
                    style={[styles.segment, active && styles.segmentActive]}
                    onPress={() => setHistoryFilter(tab.key as LoginHistoryStatus | 'all')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.statusLine, layoutStyles.statusLine]}>
              <View style={styles.flexShrink}>
                <Text style={styles.primaryValue}>Email alerts for new logins</Text>
                <Text style={styles.metaText}>Preference is stored in Firestore.</Text>
              </View>
              <Switch
                value={settings.emailNotificationsNewLogin}
                onValueChange={handlePreferenceToggle}
                disabled={Boolean(loading)}
                thumbColor={settings.emailNotificationsNewLogin ? SUCCESS : '#F4F5F7'}
                trackColor={{ false: '#384056', true: 'rgba(110,231,168,0.45)' }}
                accessibilityLabel="Toggle email alerts for new logins"
              />
            </View>
            {loading === 'loginHistory' ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : loginHistory.length ? (
              loginHistory.map((entry) => (
                <LoginHistoryRow
                  key={entry.id}
                  entry={entry}
                  loading={loading === `report:${entry.id}`}
                  onReport={() => handleReportSuspicious(entry)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No login history entries for this filter.</Text>
            )}
          </Section>

          <Section title="Delete Account" icon="trash-outline" danger>
            <Text style={styles.metaText}>
              Permanently delete your RoomRadar account and security data from a separate confirmation screen.
            </Text>
            <DangerButton
              label="Open Delete Account Screen"
              icon="trash-outline"
              onPress={() => router.push('/delete-account')}
            />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isEmailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEmailModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalPanel}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Email</Text>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setIsEmailModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close change email dialog"
                >
                  <Ionicons name="close" size={22} color={PRIMARY_TEXT} />
                </TouchableOpacity>
              </View>
              <Input
                label="New email"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
              />
              <SecureInput
                label="Current password"
                value={emailPassword}
                onChangeText={setEmailPassword}
                secure
                textContentType="password"
              />
              <PrimaryButton
                label="Send Verification Email"
                icon="send-outline"
                onPress={handleRequestEmailChange}
                loading={loading === 'email'}
                disabled={Boolean(loading)}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Toast({ toast }: { toast: NonNullable<ToastState> }) {
  const icon =
    toast.type === 'success'
      ? 'checkmark-circle'
      : toast.type === 'error'
      ? 'alert-circle'
      : 'information-circle';

  return (
    <View style={[styles.toast, toast.type === 'error' && styles.toastError]}>
      <Ionicons name={icon} size={18} color={toast.type === 'error' ? DANGER : SUCCESS} />
      <Text style={styles.toastText}>{toast.message}</Text>
    </View>
  );
}

function Section({
  title,
  icon,
  children,
  danger,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <View style={[styles.section, danger && styles.sectionDanger]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, danger && styles.sectionIconDanger]}>
          <Ionicons name={icon} size={18} color={danger ? DANGER : ACCENT} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={MUTED_TEXT} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholderTextColor="#6F7488"
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

function SecureInput({
  label,
  value,
  onChangeText,
  secure,
  onToggleSecure,
  textContentType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure: boolean;
  onToggleSecure?: () => void;
  textContentType?: 'password' | 'newPassword';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={18} color={MUTED_TEXT} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          autoCapitalize="none"
          placeholderTextColor="#6F7488"
          textContentType={textContentType}
          accessibilityLabel={label}
        />
        {onToggleSecure ? (
          <Pressable
            onPress={onToggleSecure}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={secure ? `Show ${label}` : `Hide ${label}`}
          >
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color={MUTED_TEXT} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PasswordStrengthMeter({
  score,
  strength,
}: {
  score: number;
  strength: string;
}) {
  const tone = strength === 'Strong' ? SUCCESS : strength === 'Medium' ? WARNING : DANGER;

  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthHeader}>
        <Text style={styles.label}>Password strength</Text>
        <Text style={[styles.strengthLabel, { color: tone }]}>{strength}</Text>
      </View>
      <View style={styles.strengthTrack}>
        <View style={[styles.strengthFill, { width: `${Math.max(score, 1) * 20}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

function RuleRow({
  label,
  met,
  pending,
}: {
  label: string;
  met: boolean;
  pending?: boolean;
}) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : pending ? 'ellipse-outline' : 'close-circle'}
        size={17}
        color={met ? SUCCESS : pending ? MUTED_TEXT : DANGER}
      />
      <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  icon,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#0B1220" />
      ) : (
        <Ionicons name={icon} size={18} color="#0B1220" />
      )}
    </TouchableOpacity>
  );
}

function SecondaryButton({
  label,
  icon,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.78}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={ACCENT} />
      ) : (
        <Ionicons name={icon} size={16} color={ACCENT} />
      )}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function DangerButton({
  label,
  icon,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.dangerButton, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.78}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFE8ED" />
      ) : (
        <Ionicons name={icon} size={17} color="#FFE8ED" />
      )}
      <Text style={styles.dangerButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  loading,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.iconAction, disabled && styles.iconActionDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={ACCENT} />
      ) : (
        <Ionicons name={icon} size={17} color={ACCENT} />
      )}
    </Pressable>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'warning' | 'muted';
}) {
  const color = tone === 'success' ? SUCCESS : tone === 'warning' ? WARNING : MUTED_TEXT;

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Ionicons
        name={tone === 'success' ? 'checkmark-circle' : tone === 'warning' ? 'warning' : 'ellipse'}
        size={14}
        color={color}
      />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function SessionRow({
  session,
  isCurrent,
  loading,
  onRevoke,
}: {
  session: SecuritySession;
  isCurrent: boolean;
  loading: boolean;
  onRevoke: () => void;
}) {
  return (
    <View style={styles.listRow}>
      <View style={styles.listIcon}>
        <Ionicons name={session.platform === 'web' ? 'desktop-outline' : 'phone-portrait-outline'} size={18} color={ACCENT} />
      </View>
      <View style={styles.listText}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>{session.deviceName}</Text>
          {isCurrent ? <Text style={styles.currentPill}>This device</Text> : null}
        </View>
        <Text style={styles.metaText}>{session.browser} • {session.location}</Text>
        <Text style={styles.metaText}>Last active {formatSecurityDate(session.lastActiveAt)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.smallDangerButton, isCurrent && styles.buttonDisabled]}
        onPress={onRevoke}
        disabled={isCurrent || loading}
        accessibilityRole="button"
        accessibilityLabel={`Revoke ${session.deviceName} session`}
      >
        {loading ? <ActivityIndicator size="small" color={DANGER} /> : <Text style={styles.smallDangerText}>Revoke</Text>}
      </TouchableOpacity>
    </View>
  );
}

function ProviderRow({
  icon,
  label,
  connected,
  loading,
  disabled,
  onConnect,
  onUnlink,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  connected: boolean;
  loading: boolean;
  disabled: boolean;
  onConnect: () => void;
  onUnlink: () => void;
}) {
  return (
    <View style={styles.listRow}>
      <View style={styles.listIcon}>
        <Ionicons name={icon} size={18} color={ACCENT} />
      </View>
      <View style={styles.listText}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.metaText}>{connected ? 'Connected' : 'Not Connected'}</Text>
      </View>
      <TouchableOpacity
        style={connected ? styles.unlinkButton : styles.connectButton}
        onPress={connected ? onUnlink : onConnect}
        disabled={disabled || loading}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator size="small" color={connected ? DANGER : ACCENT} />
        ) : (
          <>
            <Ionicons name={connected ? 'unlink-outline' : 'link-outline'} size={15} color={connected ? DANGER : ACCENT} />
            <Text style={connected ? styles.unlinkButtonText : styles.connectButtonText}>
              {connected ? 'Unlink' : 'Connect'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function LoginHistoryRow({
  entry,
  loading,
  onReport,
}: {
  entry: LoginHistoryEntry;
  loading: boolean;
  onReport: () => void;
}) {
  const success = entry.status === 'success';

  return (
    <View style={styles.listRow}>
      <View style={[styles.listIcon, !success && styles.listIconDanger]}>
        <Ionicons name={success ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={18} color={success ? SUCCESS : DANGER} />
      </View>
      <View style={styles.listText}>
        <Text style={styles.rowTitle}>{success ? 'Successful login' : 'Failed login'}</Text>
        <Text style={styles.metaText}>{formatSecurityDate(entry.timestamp)}</Text>
        <Text style={styles.metaText}>{entry.maskedIp} • {entry.deviceName} • {entry.browser}</Text>
      </View>
      <TouchableOpacity
        style={[styles.reportButton, entry.reported && styles.buttonDisabled]}
        onPress={onReport}
        disabled={entry.reported || loading}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator size="small" color={WARNING} />
        ) : (
          <Text style={styles.reportButtonText}>{entry.reported ? 'Reported' : 'Report'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
  },
  flex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: PRIMARY_TEXT,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    borderRadius: 18,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
  },
  sectionDanger: {
    borderColor: 'rgba(255,78,106,0.38)',
    backgroundColor: 'rgba(255,78,106,0.08)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(234,242,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconDanger: {
    backgroundColor: 'rgba(255,78,106,0.12)',
  },
  sectionTitle: {
    color: PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionBody: {
    gap: 13,
  },
  inputGroup: {
    gap: 7,
  },
  label: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    fontWeight: '800',
  },
  inputWrap: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 14,
  },
  strengthWrap: {
    gap: 7,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '900',
  },
  strengthTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  ruleList: {
    gap: 7,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    fontWeight: '600',
  },
  ruleTextMet: {
    color: PRIMARY_TEXT,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#0B1220',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(234,242,255,0.38)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(234,242,255,0.06)',
  },
  secondaryButtonText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '800',
  },
  dangerButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: DANGER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  dangerButtonText: {
    color: '#FFE8ED',
    fontSize: 14,
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  emailTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  primaryValue: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  metaText: {
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  badge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 9,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234,242,255,0.30)',
    backgroundColor: 'rgba(234,242,255,0.06)',
  },
  iconActionDisabled: {
    opacity: 0.45,
  },
  codeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  backupCode: {
    color: PRIMARY_TEXT,
    fontSize: 12,
    fontWeight: '900',
    backgroundColor: PANEL_ALT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emptyText: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  sectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  listRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: PANEL_ALT,
    padding: 11,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(234,242,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIconDanger: {
    backgroundColor: 'rgba(255,78,106,0.10)',
  },
  listText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  rowTitle: {
    flexShrink: 1,
    color: PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '900',
  },
  currentPill: {
    color: SUCCESS,
    fontSize: 10,
    fontWeight: '900',
    borderWidth: 1,
    borderColor: 'rgba(110,231,168,0.45)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  smallDangerButton: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,78,106,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  smallDangerText: {
    color: DANGER,
    fontSize: 12,
    fontWeight: '900',
  },
  connectButton: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234,242,255,0.36)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  connectButtonText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
  },
  unlinkButton: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,78,106,0.44)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  unlinkButtonText: {
    color: DANGER,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: PANEL_ALT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: ACCENT,
  },
  segmentText: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#0B1220',
  },
  flexShrink: {
    flex: 1,
    minWidth: 0,
  },
  reportButton: {
    minHeight: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.42)',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  reportButtonText: {
    color: WARNING,
    fontSize: 12,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.66)',
    justifyContent: 'center',
    padding: 18,
  },
  modalKeyboard: {
    width: '100%',
  },
  modalPanel: {
    borderRadius: 20,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: PRIMARY_TEXT,
    fontSize: 18,
    fontWeight: '900',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 28,
    left: 16,
    right: 16,
    zIndex: 50,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(110,231,168,0.35)',
    backgroundColor: '#10231C',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
  },
  toastError: {
    borderColor: 'rgba(255,78,106,0.35)',
    backgroundColor: '#2A1018',
  },
  toastText: {
    flex: 1,
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '800',
  },
});
