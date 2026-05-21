import { useSignIn } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useThemeColors } from '../../lib/theme-context';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

type Mode = 'request' | 'verify' | 'reset';

export default function ForgotPasswordScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const colors = useThemeColors();

  const [mode, setMode] = useState<Mode>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [localErrors, setLocalErrors] = useState<{
    email?: string;
    code?: string;
    password?: string;
  }>({});
  const [topError, setTopError] = useState<string | undefined>();

  const isFetching = fetchStatus === 'fetching';

  const onSendCode = async () => {
    setTopError(undefined);
    if (!EMAIL_RE.test(email.trim())) {
      setLocalErrors({ email: 'Enter a valid email' });
      return;
    }
    setLocalErrors({});

    const createResult = await signIn.create({ identifier: email.trim() });
    if (createResult.error) {
      setTopError(createResult.error.message ?? "We couldn't find an account with that email.");
      return;
    }

    const sendResult = await signIn.resetPasswordEmailCode.sendCode();
    if (sendResult.error) {
      setTopError(sendResult.error.message ?? "We couldn't send a reset code. Try again.");
      return;
    }

    setMode('verify');
  };

  const onVerify = async () => {
    setTopError(undefined);
    if (code.length !== 6) {
      setLocalErrors({ code: 'Enter the 6-digit code' });
      return;
    }
    setLocalErrors({});

    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (error) {
      setTopError(error.message ?? 'That code didn’t work. Try again.');
      return;
    }
    setMode('reset');
  };

  const onResend = async () => {
    setTopError(undefined);
    setCode('');
    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) {
      setTopError(error.message ?? "We couldn't send a new code.");
    }
  };

  const onSubmitNewPassword = async () => {
    setTopError(undefined);
    if (newPassword.length < MIN_PASSWORD) {
      setLocalErrors({ password: `At least ${MIN_PASSWORD} characters` });
      return;
    }
    setLocalErrors({});

    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password: newPassword,
    });
    if (error) {
      setTopError(error.message ?? "We couldn't update your password. Try again.");
      return;
    }

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl('/(tabs)') as Href);
        },
      });
    }
  };

  const onBack = () => {
    if (mode === 'reset') return setMode('verify');
    if (mode === 'verify') return setMode('request');
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/sign-in');
  };

  const canSendCode = EMAIL_RE.test(email.trim()) && !isFetching;
  const canVerify = code.length === 6 && !isFetching;
  const canSubmit = newPassword.length >= MIN_PASSWORD && !isFetching;

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
          <View className="flex-row items-center pb-8 pt-2">
            <Pressable
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="h-11 w-11 items-center justify-center rounded-md bg-surface border border-divider">
              <Ionicons name="chevron-back" size={22} color={colors.primaryText} />
            </Pressable>
          </View>

          {topError ? (
            <View className="mb-4 rounded-md border border-error bg-surface px-4 py-3">
              <Text className="text-body-small font-secondary text-error">{topError}</Text>
            </View>
          ) : null}

          {mode === 'request' ? (
            <>
              <Text className="text-headline-large font-primary-bold text-primary-text">
                Reset your password
              </Text>
              <Text className="mb-8 mt-2 text-body-large font-secondary text-secondary-text">
                Enter the email you signed up with and we&apos;ll send you a 6-digit code.
              </Text>

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
                  if (localErrors.email) setLocalErrors({});
                }}
                error={localErrors.email}
                returnKeyType="go"
                onSubmitEditing={canSendCode ? onSendCode : undefined}
                containerClassName="mb-8"
              />

              <Button
                onPress={onSendCode}
                disabled={!canSendCode}
                loading={isFetching}
                accessibilityLabel="Send reset code">
                Send reset code
              </Button>

              <View className="mt-6 flex-row items-center justify-center">
                <Text className="text-body-medium font-secondary text-secondary-text">
                  Remembered it?{' '}
                </Text>
                <Link href="/(auth)/sign-in" asChild>
                  <Pressable hitSlop={6}>
                    <Text className="text-body-medium font-secondary-semibold text-primary">
                      Sign In
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </>
          ) : null}

          {mode === 'verify' ? (
            <>
              <Text className="text-headline-large font-primary-bold text-primary-text">
                Check your email
              </Text>
              <Text className="mb-8 mt-2 text-body-large font-secondary text-secondary-text">
                We sent a 6-digit code to{' '}
                <Text className="font-secondary-semibold text-primary-text">{email.trim()}</Text>
              </Text>

              <Input
                label="Verification code"
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  if (localErrors.code) setLocalErrors({});
                }}
                error={localErrors.code}
                returnKeyType="go"
                onSubmitEditing={canVerify ? onVerify : undefined}
                containerClassName="mb-8"
              />

              <Button
                onPress={onVerify}
                disabled={!canVerify}
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
          ) : null}

          {mode === 'reset' ? (
            <>
              <Text className="text-headline-large font-primary-bold text-primary-text">
                Set a new password
              </Text>
              <Text className="mb-8 mt-2 text-body-large font-secondary text-secondary-text">
                Pick something you&apos;ll remember. You&apos;ll be signed in right after.
              </Text>

              <Input
                label="New password"
                placeholder="At least 8 characters"
                leadingIcon="lock-closed-outline"
                secureTextEntry
                autoComplete="new-password"
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  if (localErrors.password) setLocalErrors({});
                }}
                error={localErrors.password}
                returnKeyType="go"
                onSubmitEditing={canSubmit ? onSubmitNewPassword : undefined}
                containerClassName="mb-8"
              />

              <Button
                onPress={onSubmitNewPassword}
                disabled={!canSubmit}
                loading={isFetching}
                accessibilityLabel="Set new password and sign in">
                Update password
              </Button>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
