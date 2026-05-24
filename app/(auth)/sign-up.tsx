import { useSignUp } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { Input } from '../../components/Input';
import { useThemeColors } from '../../lib/theme-context';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

type Mode = 'form' | 'verify';

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const colors = useThemeColors();

  const [mode, setMode] = useState<Mode>('form');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [code, setCode] = useState('');

  const [localErrors, setLocalErrors] = useState<{
    firstName?: string;
    email?: string;
    password?: string;
  }>({});
  const [topError, setTopError] = useState<string | undefined>();

  const isFetching = fetchStatus === 'fetching';

  const onSignUp = async () => {
    setTopError(undefined);
    const next: typeof localErrors = {};

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (trimmedFirst.length === 0) next.firstName = 'Enter your first name';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email';
    if (password.length < MIN_PASSWORD) next.password = `At least ${MIN_PASSWORD} characters`;

    setLocalErrors(next);
    if (Object.keys(next).length > 0) return;

    const { error } = await signUp.password({
      emailAddress: email.trim(),
      password,
      firstName: trimmedFirst,
      lastName: trimmedLast,
    });

    if (error) {
      setTopError(error.message ?? "We couldn't create your account. Try again.");
      return;
    }

    if (
      signUp.status === 'missing_requirements' &&
      signUp.unverifiedFields.includes('email_address')
    ) {
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) {
        setTopError(sent.error.message ?? "We couldn't send a verification code.");
        return;
      }
      setMode('verify');
    } else if (signUp.status === 'complete') {
      await finalizeSignUp();
    }
  };

  const finalizeSignUp = async () => {
    await signUp.finalize({
      navigate: ({ decorateUrl }) => {
        router.replace(decorateUrl('/(tabs)') as Href);
      },
    });
  };

  const onVerify = async () => {
    setTopError(undefined);
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      setTopError(error.message ?? 'That code didn’t work. Try again.');
      return;
    }
    if (signUp.status === 'complete') {
      await finalizeSignUp();
    }
  };

  const onResend = async () => {
    setTopError(undefined);
    setCode('');
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) {
      setTopError(error.message ?? "We couldn't send a new code.");
    }
  };

  const canSubmitForm =
    firstName.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    password.length >= MIN_PASSWORD &&
    termsAccepted &&
    !isFetching;

  const canSubmitCode = code.length === 6 && !isFetching;

  const emailFieldError = localErrors.email ?? errors?.fields?.emailAddress?.message;
  const passwordFieldError = localErrors.password ?? errors?.fields?.password?.message;
  const hasFieldError = !!localErrors.firstName || !!emailFieldError || !!passwordFieldError;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between pb-8 pt-2">
            <Pressable
              onPress={() => {
                if (mode === 'verify') {
                  setMode('form');
                } else if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(auth)/sign-in');
                }
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="h-11 w-11 items-center justify-center rounded-md bg-surface border border-divider">
              <Ionicons name="chevron-back" size={22} color={colors.primaryText} />
            </Pressable>

            <View className="flex-row gap-1.5">
              <View className="h-1.5 w-6 rounded-full bg-primary" />
              <View
                className={mode === 'verify' ? 'h-1.5 w-6 rounded-full bg-primary' : 'h-1.5 w-6 rounded-full bg-divider'}
              />
              <View className="h-1.5 w-6 rounded-full bg-divider" />
            </View>
          </View>

          {mode === 'form' ? (
            <>
              <Text className="text-headline-large font-primary-bold text-primary">
                Create Account
              </Text>
              <Text className="mb-8 mt-2 text-body-large font-secondary text-secondary-text">
                Build habits. Stay consistent. Rise together.
              </Text>

              {topError && !hasFieldError ? (
                <View className="mb-4 rounded-md border border-error bg-surface px-4 py-3">
                  <Text className="text-body-small font-secondary text-error">{topError}</Text>
                </View>
              ) : null}

              <Input
                label="First name"
                placeholder="Alex"
                leadingIcon="person-outline"
                autoCapitalize="words"
                autoComplete="given-name"
                value={firstName}
                onChangeText={(t) => {
                  setFirstName(t);
                  if (localErrors.firstName)
                    setLocalErrors((e) => ({ ...e, firstName: undefined }));
                }}
                error={localErrors.firstName}
                returnKeyType="next"
                containerClassName="mb-4"
              />

              <Input
                label="Last name"
                placeholder="Rivera"
                leadingIcon="person-outline"
                autoCapitalize="words"
                autoComplete="family-name"
                value={lastName}
                onChangeText={setLastName}
                returnKeyType="next"
                containerClassName="mb-4"
              />

              <Input
                label="Email address"
                placeholder="alex@example.com"
                leadingIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (localErrors.email) setLocalErrors((e) => ({ ...e, email: undefined }));
                }}
                error={emailFieldError}
                returnKeyType="next"
                containerClassName="mb-4"
              />

              <Input
                label="Password"
                placeholder="At least 8 characters"
                leadingIcon="lock-closed-outline"
                secureTextEntry
                autoComplete="new-password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (localErrors.password)
                    setLocalErrors((e) => ({ ...e, password: undefined }));
                }}
                error={passwordFieldError}
                returnKeyType="done"
                containerClassName="mb-5"
              />

              <Checkbox
                checked={termsAccepted}
                onChange={setTermsAccepted}
                accessibilityLabel="I agree to the Terms of Service and Privacy Policy">
                <Text className="text-body-medium font-secondary text-primary">
                  I agree to the{' '}
                  <Text
                    className="font-secondary-semibold"
                    onPress={() => router.push('/terms')}>
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text className="font-secondary-semibold">Privacy Policy</Text>
                </Text>
              </Checkbox>

              <View className="mt-8">
                <Button
                  onPress={onSignUp}
                  disabled={!canSubmitForm}
                  loading={isFetching}
                  accessibilityLabel="Create account">
                  Create Account
                </Button>
              </View>

              <View className="mt-6 flex-row items-center justify-center">
                <Text className="text-body-medium font-secondary text-secondary-text">
                  Already have an account?{' '}
                </Text>
                <Link href="/(auth)/sign-in" asChild>
                  <Pressable hitSlop={6}>
                    <Text className="text-body-medium font-secondary-semibold text-primary">
                      Sign In
                    </Text>
                  </Pressable>
                </Link>
              </View>

              {/* Required for Clerk's bot protection on sign-up */}
              <View nativeID="clerk-captcha" />
            </>
          ) : (
            <>
              <Text className="text-headline-large font-primary-bold text-primary-text">
                Verify your email
              </Text>
              <Text className="mb-8 mt-2 text-body-large font-secondary text-secondary-text">
                We sent a 6-digit code to{' '}
                <Text className="font-secondary-semibold text-primary-text">{email.trim()}</Text>
              </Text>

              {topError ? (
                <View className="mb-4 rounded-md border border-error bg-surface px-4 py-3">
                  <Text className="text-body-small font-secondary text-error">{topError}</Text>
                </View>
              ) : null}

              <Input
                label="Verification code"
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                returnKeyType="go"
                onSubmitEditing={canSubmitCode ? onVerify : undefined}
                containerClassName="mb-8"
              />

              <Button
                onPress={onVerify}
                disabled={!canSubmitCode}
                loading={isFetching}
                accessibilityLabel="Verify code">
                Verify
              </Button>

              <Pressable
                onPress={onResend}
                disabled={isFetching}
                hitSlop={8}
                className="mt-6 items-center"
                accessibilityRole="button">
                <Text className="text-body-medium font-secondary-semibold text-primary">
                  Send a new code
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
