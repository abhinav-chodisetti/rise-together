import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { useHabits, type Habit } from '../../lib/habits-context';
import { useNavigationGuard } from '../../lib/use-navigation-guard';
import { useThemeColors, useThemeFonts } from '../../lib/theme-context';
import { isScheduledToday } from '../../lib/weekdays';
import { HabitCard } from '../../components/HabitCard';

const MAX_FREE_HABITS = 3;

export default function Home() {
  const { user } = useUser();
  const router = useNavigationGuard();
  const colors = useThemeColors();
  const fonts = useThemeFonts();
  const { habits, toggleHabit, removeHabit } = useHabits();

  const scheduledToday = habits.filter((h) => isScheduledToday(h.daysOfWeek));
  const completedCount = scheduledToday.filter((h) => h.isCompletedToday).length;
  const totalCount = scheduledToday.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const hasAnyHabits = habits.length > 0;
  const isAllRestDay = hasAnyHabits && totalCount === 0;

  const onAddHabit = () => {
    if (habits.length >= MAX_FREE_HABITS) {
      Alert.alert(
        'Upgrade to add more',
        `The free plan supports ${MAX_FREE_HABITS} habits. Upgrade to add unlimited habits and unlock challenges with friends.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }
    router.push('/add-habit');
  };

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'there';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between pt-2 pb-6">
          <View className="flex-1 pr-4">
            <Text className="text-body-large font-secondary text-secondary-text">
              Welcome back
            </Text>
            <Text
              className="mt-1 text-headline-medium text-primary-text"
              style={{ fontFamily: fonts.primaryBold }}>
              {displayName}
            </Text>
          </View>
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 2,
                borderColor: colors.primary,
              }}
            />
          ) : (
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 2,
                borderColor: colors.primary,
              }}
              className="items-center justify-center bg-surface">
              <Ionicons name="person" size={28} color={colors.primary} />
            </View>
          )}
        </View>

        <View className="rounded-md bg-surface p-5">
          <View className="flex-row items-center justify-between">
            <Text
              className="text-title-large text-primary-text"
              style={{ fontFamily: fonts.primaryBold }}>
              Daily Goal
            </Text>
            {isAllRestDay ? null : (
              <Text
                className="text-title-medium font-primary-bold"
                style={{ color: colors.primary }}>
                {progressPercent}%
              </Text>
            )}
          </View>
          {isAllRestDay ? null : (
            <View className="mt-4 h-2 w-full overflow-hidden rounded-full bg-divider">
              <View
                className="h-full rounded-full"
                style={{ width: `${progressPercent}%`, backgroundColor: colors.primary }}
              />
            </View>
          )}
          <Text className="mt-4 text-body-medium font-secondary text-secondary-text">
            {isAllRestDay
              ? 'Rest day — nothing scheduled today'
              : `${completedCount} of ${totalCount} habits completed`}
          </Text>
        </View>

        <Text
          className="mt-8 text-title-large text-primary-text"
          style={{ fontFamily: fonts.primaryBold }}>
          My Habits
        </Text>

        <View className="mt-4 gap-3">
          {habits.map((habit) => (
            <SwipeableHabit
              key={habit.id}
              habit={habit}
              onToggle={toggleHabit}
              onDelete={removeHabit}
              onPress={(id) => router.push(`/edit-habit/${id}`)}
            />
          ))}
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
          onPress={onAddHabit}
          leadingIcon={<Ionicons name="add" size={20} color={colors.onPrimary} />}
          accessibilityLabel="Add new habit">
          Add New Habit
        </Button>
      </View>
    </SafeAreaView>
  );
}

function SwipeableHabit({
  habit,
  onToggle,
  onDelete,
  onPress,
}: {
  habit: Habit;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
}) {
  const colors = useThemeColors();
  const ref = useRef<SwipeableMethods>(null);
  // True from swipe-threshold cross until the swipeable fully closes again.
  // Suppresses concurrent tap-to-edit while the delete Alert is up.
  const isSwipingRef = useRef(false);

  const renderLeftActions = () => (
    <View
      style={{
        width: 96,
        backgroundColor: colors.error,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: -12,
      }}>
      <Ionicons name="trash-outline" size={26} color="white" />
    </View>
  );

  const promptDelete = () => {
    isSwipingRef.current = true;
    ref.current?.close();
    Alert.alert(
      'Delete this habit?',
      `"${habit.name}" and its streak history will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(habit.id) },
      ],
    );
  };

  const handleCardPress = (id: string) => {
    if (isSwipingRef.current) return;
    onPress(id);
  };

  return (
    <ReanimatedSwipeable
      ref={ref}
      renderLeftActions={renderLeftActions}
      leftThreshold={60}
      friction={1.5}
      overshootLeft={false}
      onSwipeableWillOpen={promptDelete}
      onSwipeableClose={() => {
        isSwipingRef.current = false;
      }}>
      <HabitCard habit={habit} onToggle={onToggle} onPress={handleCardPress} />
    </ReanimatedSwipeable>
  );
}
