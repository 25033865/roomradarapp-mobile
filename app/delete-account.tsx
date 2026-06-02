import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../authprovider';
import {
  deleteAccountWithPassword,
  getFriendlyAuthErrorMessage,
} from '../securityService';

const APP_BACKGROUND = '#05071A';
const PANEL = '#101427';
const PANEL_ALT = '#0B1022';
const PRIMARY_TEXT = '#FAFAFE';
const SECONDARY_TEXT = '#B9B9BE';
const MUTED_TEXT = '#8F95AA';
const BORDER = 'rgba(255,255,255,0.10)';
const DANGER = '#FF4E6A';
const ACCENT = '#EAF2FF';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [understandsPermanentDelete, setUnderstandsPermanentDelete] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = useMemo(
    () =>
      understandsPermanentDelete &&
      confirmationText.trim() === 'DELETE' &&
      currentPassword.length > 0 &&
      !isDeleting,
    [confirmationText, currentPassword, isDeleting, understandsPermanentDelete]
  );

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/');
    }
  }, [initializing, router, user]);

  const handleDeleteAccount = useCallback(() => {
    if (!user || !canDelete) {
      return;
    }

    Alert.alert(
      'Delete account permanently?',
      'This cannot be undone. Your account and RoomRadar security data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);

            try {
              await deleteAccountWithPassword(user, currentPassword);
              Alert.alert('Account deleted', 'Your RoomRadar account has been deleted.');
              router.replace('/');
            } catch (error) {
              Alert.alert('Delete failed', getFriendlyAuthErrorMessage(error));
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [canDelete, currentPassword, router, user]);

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
            <Text style={styles.title}>Delete Account</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.warningBox}>
            <View style={styles.warningIcon}>
              <Ionicons name="warning-outline" size={24} color="#FFE8ED" />
            </View>
            <View style={styles.warningTextWrap}>
              <Text style={styles.warningTitle}>This action is permanent</Text>
              <Text style={styles.warningText}>
                Deleting your account cannot be undone. You will lose access immediately.
              </Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>What will be deleted</Text>
            {[
              'Your Firebase Authentication account',
              'Your RoomRadar profile details and local profile extras',
              'Saved places, favorites, and app preferences on this device',
              'Security sessions, backup codes, and login history in Firestore',
              'Account-linked posts, appointments, and support requests when those collections are added',
            ].map((item) => (
              <View key={item} style={styles.dataRow}>
                <Ionicons name="remove-circle-outline" size={18} color={DANGER} />
                <Text style={styles.dataText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setUnderstandsPermanentDelete((value) => !value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: understandsPermanentDelete }}
            >
              <Ionicons
                name={understandsPermanentDelete ? 'checkbox' : 'square-outline'}
                size={22}
                color={understandsPermanentDelete ? DANGER : MUTED_TEXT}
              />
              <Text style={styles.checkboxText}>
                I understand this action is permanent and cannot be undone.
              </Text>
            </Pressable>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type DELETE to confirm</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="text-outline" size={18} color={MUTED_TEXT} />
                <TextInput
                  style={styles.input}
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                  autoCapitalize="characters"
                  placeholder="DELETE"
                  placeholderTextColor="#6F7488"
                  accessibilityLabel="Type DELETE to confirm account deletion"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={MUTED_TEXT} />
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  placeholderTextColor="#6F7488"
                  accessibilityLabel="Current password"
                />
                <Pressable
                  onPress={() => setShowPassword((value) => !value)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={MUTED_TEXT}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, !canDelete && styles.buttonDisabled]}
            onPress={handleDeleteAccount}
            disabled={!canDelete}
            activeOpacity={0.78}
            accessibilityRole="button"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FFE8ED" />
            ) : (
              <Ionicons name="trash-outline" size={19} color="#FFE8ED" />
            )}
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Deleting account...' : 'Delete account permanently'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: PRIMARY_TEXT,
    fontSize: 18,
    fontWeight: '900',
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,78,106,0.45)',
    backgroundColor: 'rgba(255,78,106,0.14)',
    padding: 15,
  },
  warningIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DANGER,
  },
  warningTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  warningTitle: {
    color: PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '900',
  },
  warningText: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: PANEL,
    padding: 15,
    gap: 13,
  },
  sectionTitle: {
    color: PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '900',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  dataText: {
    flex: 1,
    color: SECONDARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkboxText: {
    flex: 1,
    color: PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
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
    fontWeight: '700',
    paddingVertical: 14,
  },
  deleteButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: DANGER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: '#FFE8ED',
    fontSize: 15,
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.48,
  },
});
