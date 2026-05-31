import { useSignIn } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { consumePendingInviteOrFallback } from '../../lib/pending-invite';
import { useNavigationGuard } from '../../lib/use-navigation-guard';
import { useThemeColors } from '../../lib/theme-context';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useNavigationGuard();
  const colors = useThemeColors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localEmailError, setLocalEmailError] = useState<string | undefined>();
  const [topError, setTopError] = useState<string | undefined>();

  const isFetching = fetchStatus === 'fetching';
  const canSubmit = email.length > 0 && password.length > 0 && !isFetching;

  const onSubmit = async () => {
    setTopError(undefined);
    setLocalEmailError(undefined);

    if (!EMAIL_RE.test(email.trim())) {
      setLocalEmailError('Enter a valid email');
      return;
    }

    const { error } = await signIn.password({
      emailAddress: email.trim(),
      password,
    });

    if (error) {
      setTopError(error.message ?? "We couldn't sign you in. Try again.");
      return;
    }

    try {
      const dest = await consumePendingInviteOrFallback();
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl(dest) as Href);
        },
      });
    } catch {
      setTopError(
        `Sign-in didn't complete (status: ${signIn.status}). Try again or reset your password.`,
      );
    }
  };

  const emailError = localEmailError ?? errors?.fields?.identifier?.message;
  const passwordError = errors?.fields?.password?.message;
  const hasFieldError = !!emailError || !!passwordError;

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
          <View className="items-center pb-12 pt-8">
            <View
              className="h-20 w-20 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.primary + '1A' }}>
              <Ionicons name="sparkles" size={36} color={colors.primary} />
            </View>
            <Text className="mt-5 text-headline-large font-primary-bold text-primary-text">
              RiseTogether
            </Text>
            <Text className="mt-2 text-body-large font-secondary text-secondary-text">
              Consistency is better with friends.
            </Text>
          </View>

          {topError && !hasFieldError ? (
            <View className="mb-4 rounded-md border border-error bg-surface px-4 py-3">
              <Text className="text-body-small font-secondary text-error">{topError}</Text>
            </View>
          ) : null}

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
              if (localEmailError) setLocalEmailError(undefined);
            }}
            error={emailError}
            returnKeyType="next"
            containerClassName="mb-4"
          />

          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-label-large font-secondary-semibold text-primary-text">
              Password
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              hitSlop={8}
              accessibilityRole="link">
              <Text
                className="text-label-large font-secondary-semibold"
                style={{ color: colors.primary }}>
                Forgot?
              </Text>
            </Pressable>
          </View>
          <Input
            placeholder="Enter your password"
            leadingIcon="lock-closed-outline"
            secureTextEntry
            autoComplete="current-password"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            containerClassName="mb-8"
          />

          <Button
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={isFetching}
            accessibilityLabel="Sign in">
            Sign In
          </Button>

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-body-medium font-secondary text-secondary-text">
              Don&apos;t have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable hitSlop={6}>
                <Text
                  className="text-body-medium font-secondary-semibold"
                  style={{ color: colors.primary }}>
                  Sign Up
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
