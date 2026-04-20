import { clamp, getDeviceFlags } from '@/constants/responsive';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginUser, registerUser } from '../../authService';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [switchTrackWidth, setSwitchTrackWidth] = useState(0);

  const { width, height } = useWindowDimensions();
  const { isSmallPhone, isTablet, isLargeTablet } = getDeviceFlags(width);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const switchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, scaleAnim, floatingAnim]);

  useEffect(() => {
    Animated.timing(switchAnim, {
      toValue: mode === 'login' ? 0 : 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mode, switchAnim]);

  const bubbleTranslateY = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const switchTranslateX = switchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, switchTrackWidth * 0.49],
  });

  const loginOpacity = switchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.72],
  });

  const signupOpacity = switchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  const subtitle = useMemo(
    () =>
      mode === 'login'
        ? 'Welcome back. Sign in to continue your journey.'
        : 'Create your account and start building something amazing.',
    [mode]
  );

  const responsiveStyles = useMemo(() => {
    const baseSize = Math.min(width, height);
    const horizontalPadding = clamp(width * 0.06, 16, isLargeTablet ? 40 : 28);
    const cardMaxWidth = isLargeTablet ? 560 : isTablet ? 520 : 480;
    const cardWidth = Math.min(width - horizontalPadding * 2, cardMaxWidth);
    const bubbleLargeSize = clamp(baseSize * 0.24, 130, 240);
    const bubbleSmallSize = clamp(baseSize * 0.17, 95, 180);
    const glowOneSize = clamp(baseSize * 0.19, 110, 200);
    const glowTwoSize = clamp(baseSize * 0.22, 120, 220);
    const logoSize = clamp(width * 0.46, 140, isTablet ? 260 : 210);
    const titleSize = clamp(width * 0.088, 28, isTablet ? 44 : 36);
    const subtitleSize = clamp(width * 0.042, 14, 18);
    const logoHorizontalAlign: 'center' | 'flex-start' = isTablet ? 'center' : 'flex-start';
    const textAlign: 'center' | 'left' = isTablet ? 'center' : 'left';
    const rowDirection: 'column' | 'row' = isSmallPhone ? 'column' : 'row';

    return {
      bubbleLarge: {
        top: clamp(height * 0.08, 40, 96),
        right: -Math.round(bubbleLargeSize * 0.23),
        width: bubbleLargeSize,
        height: bubbleLargeSize,
        borderRadius: bubbleLargeSize / 2,
      },
      bubbleSmall: {
        top: clamp(height * 0.22, 130, 240),
        left: -Math.round(bubbleSmallSize * 0.24),
        width: bubbleSmallSize,
        height: bubbleSmallSize,
        borderRadius: bubbleSmallSize / 2,
      },
      glowOne: {
        top: clamp(height * 0.12, 72, 138),
        left: clamp(width * 0.08, 18, 60),
        width: glowOneSize,
        height: glowOneSize,
        borderRadius: glowOneSize / 2,
      },
      glowTwo: {
        bottom: clamp(height * 0.18, 104, 190),
        right: clamp(width * 0.05, 18, 42),
        width: glowTwoSize,
        height: glowTwoSize,
        borderRadius: glowTwoSize / 2,
      },
      scrollContent: {
        paddingHorizontal: horizontalPadding,
        paddingTop: clamp(height * 0.03, 18, 34),
        paddingBottom: clamp(height * 0.04, 22, 38),
        alignItems: 'center' as const,
      },
      hero: {
        width: '100%' as const,
        maxWidth: cardWidth,
        marginBottom: clamp(baseSize * 0.03, 14, 24),
      },
      logoWrap: {
        width: logoSize,
        height: logoSize,
        marginLeft: isTablet ? 0 : -Math.round(logoSize * 0.18),
        marginBottom: -Math.round(logoSize * (isTablet ? 0.1 : 0.2)),
        alignSelf: logoHorizontalAlign,
        alignItems: logoHorizontalAlign,
      },
      title: {
        fontSize: titleSize,
        textAlign,
      },
      subtitle: {
        fontSize: subtitleSize,
        lineHeight: Math.round(subtitleSize * 1.45),
        maxWidth: isTablet ? 520 : cardWidth,
        textAlign,
      },
      card: {
        width: '100%' as const,
        maxWidth: cardWidth,
        padding: clamp(width * 0.048, 16, 26),
        borderRadius: clamp(baseSize * 0.045, 20, 30),
      },
      switchOuter: {
        borderRadius: clamp(baseSize * 0.03, 16, 22),
        marginBottom: clamp(baseSize * 0.03, 16, 24),
      },
      switchPill: {
        borderRadius: clamp(baseSize * 0.025, 12, 18),
      },
      switchBtn: {
        paddingVertical: clamp(baseSize * 0.015, 10, 14),
      },
      switchText: {
        fontSize: clamp(width * 0.04, 14, 17),
      },
      formWrap: {
        gap: clamp(baseSize * 0.018, 10, 14),
        marginBottom: clamp(baseSize * 0.03, 16, 24),
      },
      inputWrap: {
        minHeight: clamp(baseSize * 0.09, 52, 62),
        borderRadius: clamp(baseSize * 0.03, 16, 20),
        paddingHorizontal: clamp(baseSize * 0.022, 12, 16),
      },
      inputIconWrap: {
        width: clamp(baseSize * 0.048, 28, 34),
      },
      input: {
        fontSize: clamp(width * 0.04, 14, 17),
        paddingVertical: clamp(baseSize * 0.025, 14, 18),
      },
      forgotText: {
        fontSize: clamp(width * 0.035, 12, 14),
      },
      primaryButton: {
        height: clamp(baseSize * 0.09, 52, 62),
        borderRadius: clamp(baseSize * 0.03, 16, 20),
        marginTop: clamp(baseSize * 0.01, 4, 10),
      },
      primaryButtonText: {
        fontSize: clamp(width * 0.042, 15, 18),
      },
      dividerRow: {
        marginBottom: clamp(baseSize * 0.024, 14, 20),
      },
      dividerText: {
        fontSize: clamp(width * 0.033, 11, 13),
      },
      socialRow: {
        flexDirection: rowDirection,
        marginBottom: clamp(baseSize * 0.03, 16, 24),
      },
      socialButton: {
        minHeight: clamp(baseSize * 0.08, 48, 58),
        borderRadius: clamp(baseSize * 0.028, 14, 18),
      },
      socialText: {
        fontSize: clamp(width * 0.038, 13, 15),
      },
      bottomRow: {
        flexDirection: rowDirection,
        gap: isSmallPhone ? 4 : 0,
      },
      bottomText: {
        fontSize: clamp(width * 0.038, 13, 15),
      },
      bottomLink: {
        fontSize: clamp(width * 0.038, 13, 15),
      },
    };
  }, [height, isLargeTablet, isSmallPhone, isTablet, width]);

  const inputFieldResponsiveProps = useMemo(
    () => ({
      containerStyle: responsiveStyles.inputWrap,
      iconWrapStyle: responsiveStyles.inputIconWrap,
      inputStyle: responsiveStyles.input,
    }),
    [responsiveStyles]
  );

  const getAuthErrorMessage = (error: unknown): string => {
    if (!(error instanceof FirebaseError)) {
      return 'Something went wrong. Please try again.';
    }

    switch (error.code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already in use.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      default:
        return error.message || 'Authentication failed. Please try again.';
    }
  };

  const onLogin = async () => {
    if (isSubmitting) {
      return;
    }

    if (!loginEmail.trim() || !loginPassword) {
      Alert.alert('Missing information', 'Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await loginUser(loginEmail, loginPassword);
      router.replace('/explore');
    } catch (error) {
      Alert.alert('Sign in failed', getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignup = async () => {
    if (isSubmitting) {
      return;
    }

    if (!fullName.trim() || !signupEmail.trim() || !signupPassword || !confirmPassword) {
      Alert.alert('Missing information', 'Please fill in all fields to create an account.');
      return;
    }

    if (signupPassword !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser(fullName, signupEmail, signupPassword);
      router.replace('/explore');
    } catch (error) {
      Alert.alert('Sign up failed', getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginTabTextStyle = mode === 'login' ? styles.switchTextActive : styles.switchTextInactive;
  const signupTabTextStyle = mode === 'signup' ? styles.switchTextActive : styles.switchTextInactive;

  const onSwitchOuterLayout = useCallback((event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;

    setSwitchTrackWidth((prevWidth) => {
      if (Math.abs(prevWidth - measuredWidth) < 0.5) {
        return prevWidth;
      }

      return measuredWidth;
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.background}>
        <Animated.View
          style={[
            styles.bubbleLarge,
            responsiveStyles.bubbleLarge,
            { transform: [{ translateY: bubbleTranslateY }] },
          ]}
        />
        <Animated.View
          style={[
            styles.bubbleSmall,
            responsiveStyles.bubbleSmall,
            {
              transform: [
                {
                  translateY: floatingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 14],
                  }),
                },
              ],
            },
          ]}
        />
        <View style={[styles.glowOne, responsiveStyles.glowOne]} />
        <View style={[styles.glowTwo, responsiveStyles.glowTwo]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, responsiveStyles.scrollContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.hero,
              responsiveStyles.hero,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={[styles.logoWrap, responsiveStyles.logoWrap]}>
              <Image
                source={require('../../assets/images/RoomRadar.png')}
                style={styles.brandIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, responsiveStyles.title]}>
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={[styles.subtitle, responsiveStyles.subtitle]}>{subtitle}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              responsiveStyles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <View style={[styles.switchOuter, responsiveStyles.switchOuter]} onLayout={onSwitchOuterLayout}>
              <Animated.View
                style={[
                  styles.switchPill,
                  responsiveStyles.switchPill,
                  { transform: [{ translateX: switchTranslateX }] },
                ]}
              />

              <Pressable style={[styles.switchBtn, responsiveStyles.switchBtn]} onPress={() => setMode('login')}>
                <Animated.Text
                  style={[
                    styles.switchText,
                    responsiveStyles.switchText,
                    loginTabTextStyle,
                    { opacity: loginOpacity },
                  ]}>
                  Sign In
                </Animated.Text>
              </Pressable>

              <Pressable style={[styles.switchBtn, responsiveStyles.switchBtn]} onPress={() => setMode('signup')}>
                <Animated.Text
                  style={[
                    styles.switchText,
                    responsiveStyles.switchText,
                    signupTabTextStyle,
                    { opacity: signupOpacity },
                  ]}>
                  Sign Up
                </Animated.Text>
              </Pressable>
            </View>

            {mode === 'login' ? (
              <View style={[styles.formWrap, responsiveStyles.formWrap]}>
                <InputField
                  icon="mail-outline"
                  placeholder="Email address"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  {...inputFieldResponsiveProps}
                />

                <InputField
                  icon="lock-closed-outline"
                  placeholder="Password"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightPress={() => setShowPassword((prev) => !prev)}
                  {...inputFieldResponsiveProps}
                />

                <Pressable style={styles.forgotBtn}>
                  <Text style={[styles.forgotText, responsiveStyles.forgotText]}>Forgot password?</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.primaryButton,
                    responsiveStyles.primaryButton,
                    isSubmitting && styles.primaryButtonDisabled,
                  ]}
                  onPress={onLogin}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.primaryButtonText, responsiveStyles.primaryButtonText]}>
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </Text>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#0B1220" />
                  ) : (
                    <Ionicons name="arrow-forward" size={18} color="#dcdcdc" />
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={[styles.formWrap, responsiveStyles.formWrap]}>
                <InputField
                  icon="person-outline"
                  placeholder="Full name"
                  value={fullName}
                  onChangeText={setFullName}
                  {...inputFieldResponsiveProps}
                />

                <InputField
                  icon="mail-outline"
                  placeholder="Email address"
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  {...inputFieldResponsiveProps}
                />

                <InputField
                  icon="lock-closed-outline"
                  placeholder="Create password"
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightPress={() => setShowPassword((prev) => !prev)}
                  {...inputFieldResponsiveProps}
                />

                <InputField
                  icon="shield-checkmark-outline"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightPress={() => setShowConfirmPassword((prev) => !prev)}
                  {...inputFieldResponsiveProps}
                />

                <Pressable
                  style={[
                    styles.primaryButton,
                    responsiveStyles.primaryButton,
                    isSubmitting && styles.primaryButtonDisabled,
                  ]}
                  onPress={onSignup}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.primaryButtonText, responsiveStyles.primaryButtonText]}>
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                  </Text>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#0B1220" />
                  ) : (
                    <Ionicons name="arrow-forward" size={18} color="#0B1220" />
                  )}
                </Pressable>
              </View>
            )}

            <View style={[styles.dividerRow, responsiveStyles.dividerRow]}>
              <View style={styles.divider} />
              <Text style={[styles.dividerText, responsiveStyles.dividerText]}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={[styles.socialRow, responsiveStyles.socialRow]}>
              <SocialButton
                icon="logo-google"
                label="Google"
                buttonStyle={responsiveStyles.socialButton}
                textStyle={responsiveStyles.socialText}
              />
              <SocialButton
                icon="logo-apple"
                label="Apple"
                buttonStyle={responsiveStyles.socialButton}
                textStyle={responsiveStyles.socialText}
              />
            </View>

            <View style={[styles.bottomRow, responsiveStyles.bottomRow]}>
              <Text style={[styles.bottomText, responsiveStyles.bottomText]}>
                {mode === 'login'
                  ? "Don't have an account?"
                  : 'Already have an account?'}
              </Text>
              <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                <Text style={[styles.bottomLink, responsiveStyles.bottomLink]}>
                  {mode === 'login' ? ' Sign Up' : ' Sign In'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type InputFieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  iconWrapStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  rightIcon,
  onRightPress,
  containerStyle,
  iconWrapStyle,
  inputStyle,
}: InputFieldProps) {
  const inputModeKey = secureTextEntry ? 'secure' : 'plain';

  return (
    <View style={[styles.inputWrap, containerStyle]}>
      <View style={[styles.inputIconWrap, iconWrapStyle]}>
        <Ionicons name={icon} size={18} color="#9FB0C7" />
      </View>

      <TextInput
        key={inputModeKey}
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor="#7C8CA3"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={Boolean(secureTextEntry)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />

      {rightIcon ? (
        <Pressable onPress={onRightPress} hitSlop={8}>
          <Ionicons name={rightIcon} size={18} color="#9FB0C7" />
        </Pressable>
      ) : null}
    </View>
  );
}

type SocialButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

function SocialButton({ icon, label, buttonStyle, textStyle }: SocialButtonProps) {
  return (
    <Pressable style={[styles.socialButton, buttonStyle]}>
      <Ionicons name={icon} size={18} color="#EAF2FF" />
      <Text style={[styles.socialText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050816',
  },
  flex: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050816',
  },
  bubbleLarge: {
    position: 'absolute',
    top: 70,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(125, 92, 255, 0.18)',
  },
  bubbleSmall: {
    position: 'absolute',
    top: 190,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 224, 199, 0.12)',
  },
  glowOne: {
    position: 'absolute',
    top: 100,
    left: 40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 209, 255, 0.10)',
  },
  glowTwo: {
    position: 'absolute',
    bottom: 150,
    right: 30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 77, 166, 0.08)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
  },
  hero: {
    marginBottom: 18,
  },
  logoWrap: {
    width: 200,
    height: 200,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: -45,
    marginBottom: -45,
  },
  brandIcon: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: '#F8FBFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  subtitle: {
    color: '#9FB0C7',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    backgroundColor: 'rgba(12, 18, 35, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  switchOuter: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#0E1730',
    borderRadius: 18,
    padding: 4,
    marginBottom: 18,
  },
  switchPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: '2%',
    width: '47%',
    borderRadius: 14,
    backgroundColor: '#EAF2FF',
  },
  switchBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    zIndex: 1,
  },
  switchText: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchTextActive: {
    color: '#0A1020',
  },
  switchTextInactive: {
    color: '#EAF2FF',
  },
  formWrap: {
    gap: 12,
    marginBottom: 18,
  },
  inputWrap: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#0B1224',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputIconWrap: {
    width: 30,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    color: '#F8FBFF',
    fontSize: 15,
    paddingVertical: 16,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  forgotText: {
    color: '#9BC2FF',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: '#7F90A7',
    fontSize: 12,
    fontWeight: '600',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  socialButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#0B1224',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialText: {
    color: '#EAF2FF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomText: {
    color: '#91A1B7',
    fontSize: 14,
  },
  bottomLink: {
    color: '#9BC2FF',
    fontSize: 14,
    fontWeight: '800',
  },
});
