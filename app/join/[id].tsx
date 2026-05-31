import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { useChallenges } from '../../lib/challenges-context';
import { setPendingInvite } from '../../lib/pending-invite';
import { useSupabase } from '../../lib/supabase';
import { useThemeColors } from '../../lib/theme-context';
import { formatSchedule, type Weekday } from '../../lib/weekdays';

interface InviteInfo {
  id: string;
  name: string;
  description: string | null;
  days_of_week: number[];
  start_date: string;
  end_date: string | null;
  cover_image_url: string | null;
  owner_clerk_id: string;
  owner_display_name: string | null;
  owner_avatar_url: string | null;
  participant_count: number;
  is_already_member: boolean;
}

export default function JoinChallengeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();
  const { joinChallenge } = useChallenges();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  // Signed-out users: stash the id and bounce to sign-in. The auth screens'
  // finalize handlers will read it back and route to /join/<id> after success.
  useEffect(() => {
    if (!isLoaded) return;
    if (!user && id) {
      setPendingInvite(id).finally(() => {
        router.replace('/(auth)/sign-in');
      });
    }
  }, [isLoaded, user, id, router]);

  useEffect(() => {
    if (!isLoaded || !user || !id) return;
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const { data, error } = await supabase.rpc('get_challenge_invite_info', {
          p_id: id,
        });
        if (cancelled) return;
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as InviteInfo[];
        setInfo(rows[0] ?? null);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load invite');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, id, supabase]);

  const handleJoin = async () => {
    if (!info || isJoining) return;
    setIsJoining(true);
    try {
      await joinChallenge(info.id);
      router.replace(`/challenges/${info.id}`);
    } catch (e) {
      Alert.alert(
        "Couldn't join challenge",
        e instanceof Error ? e.message : 'Try again in a moment.',
      );
      setIsJoining(false);
    }
  };

  const goBackOrTabs = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  // ----- Render -----

  if (!isLoaded || (!user && id)) {
    return <Centered colors={colors}><ActivityIndicator color={colors.primary} /></Centered>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <Pressable
          onPress={goBackOrTabs}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="h-10 w-10 items-center justify-center">
          <Ionicons name="close" size={26} color={colors.primaryText} />
        </Pressable>
      </View>

      {isLoading ? (
        <Centered colors={colors}><ActivityIndicator color={colors.primary} /></Centered>
      ) : loadError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load invitation"
          body={loadError}
          ctaLabel="Back to Challenges"
          onPress={() => router.replace('/(tabs)/challenges')}
        />
      ) : !info ? (
        <EmptyState
          icon="help-circle-outline"
          title="Challenge not found"
          body="This invitation link may have expired or the challenge was deleted."
          ctaLabel="Back to Challenges"
          onPress={() => router.replace('/(tabs)/challenges')}
        />
      ) : info.is_already_member ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="You're already in this challenge"
          body={info.name}
          ctaLabel="Open Challenge"
          onPress={() => router.replace(`/challenges/${info.id}`)}
        />
      ) : (
        <Preview
          info={info}
          isJoining={isJoining}
          onJoin={handleJoin}
          onDecline={goBackOrTabs}
        />
      )}
    </SafeAreaView>
  );
}

// ---- Inner components ------------------------------------------------------

function Centered({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: { background: string };
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      {children}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  body,
  ctaLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  ctaLabel: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name={icon} size={48} color={colors.hint} />
      <Text className="mt-4 text-title-large font-primary-bold text-primary-text text-center">
        {title}
      </Text>
      <Text className="mt-2 text-body-medium font-secondary text-secondary-text text-center">
        {body}
      </Text>
      <View className="mt-8 w-full">
        <Button onPress={onPress} accessibilityLabel={ctaLabel}>
          {ctaLabel}
        </Button>
      </View>
    </View>
  );
}

function Preview({
  info,
  isJoining,
  onJoin,
  onDecline,
}: {
  info: InviteInfo;
  isJoining: boolean;
  onJoin: () => void;
  onDecline: () => void;
}) {
  const colors = useThemeColors();
  const daysOfWeek = (info.days_of_week ?? []) as Weekday[];
  const isCustomSchedule = daysOfWeek.length > 0 && daysOfWeek.length < 7;
  const ownerName = info.owner_display_name ?? 'Someone';

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}>
        <Text className="text-body-medium font-secondary-semibold text-secondary-text">
          You&apos;re invited to join
        </Text>
        <Text className="mt-1 text-headline-medium font-primary-bold text-primary-text">
          {info.name}
        </Text>

        {info.description ? (
          <Text className="mt-3 text-body-medium font-secondary text-primary-text">
            {info.description}
          </Text>
        ) : null}

        {info.cover_image_url ? (
          <Image
            source={{ uri: info.cover_image_url }}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              borderRadius: 14,
              marginTop: 16,
            }}
            resizeMode="cover"
          />
        ) : null}

        <View className="mt-6 rounded-md bg-surface p-4">
          <View className="flex-row items-center">
            {info.owner_avatar_url ? (
              <Image
                source={{ uri: info.owner_avatar_url }}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface }}
              />
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="person" size={20} color={colors.secondaryText} />
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text className="text-body-small font-secondary text-secondary-text">
                Invited by
              </Text>
              <Text className="text-body-large font-primary-bold text-primary-text">
                {ownerName}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-3 rounded-md bg-surface p-4">
          <DetailRow icon="calendar-outline" label="Starts" value={formatDate(info.start_date)} />
          {info.end_date ? (
            <DetailRow icon="flag-outline" label="Ends" value={formatDate(info.end_date)} />
          ) : null}
          {isCustomSchedule ? (
            <DetailRow icon="repeat-outline" label="Repeats" value={formatSchedule(daysOfWeek)} />
          ) : (
            <DetailRow icon="repeat-outline" label="Repeats" value="Daily" />
          )}
          <DetailRow
            icon="people-outline"
            label="Members"
            value={`${info.participant_count} ${info.participant_count === 1 ? 'person' : 'people'}`}
          />
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 16,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 8,
        }}>
        <Button
          onPress={onJoin}
          loading={isJoining}
          leadingIcon={<Ionicons name="checkmark" size={20} color={colors.onPrimary} />}
          accessibilityLabel="Join challenge">
          Join Challenge
        </Button>
        <View style={{ height: 8 }} />
        <Button
          onPress={onDecline}
          variant="secondary"
          disabled={isJoining}
          accessibilityLabel="Not now">
          Not now
        </Button>
      </View>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center py-1.5">
      <Ionicons name={icon} size={18} color={colors.secondaryText} />
      <Text className="ml-3 flex-1 text-body-medium font-secondary text-secondary-text">
        {label}
      </Text>
      <Text className="text-body-medium font-secondary-semibold text-primary-text">{value}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
