import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { cn } from '../components/cn';
import { useNavigationGuard } from '../lib/use-navigation-guard';
import { useThemeColors } from '../lib/theme-context';

type Tier = 'monthly' | 'annual';

const INDIVIDUAL_FEATURES = [
  'Unlimited daily habits',
  'Advanced progress analytics',
  'Priority reminder system',
];

const SHARED_FEATURES = [
  'Everything in Individual',
  'Shared group challenges',
  'Up to 4 separate profiles',
];

const HEADER_HEIGHT = 280;
const FADE_HEIGHT = 160;
// Pixels to shift the header image. Positive = right/down, negative = left/up.
const IMAGE_OFFSET_X = -65;
const IMAGE_OFFSET_Y = -110;

export default function PaywallScreen() {
  const router = useNavigationGuard();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [individualTier, setIndividualTier] = useState<Tier>('annual');
  const [sharedTier, setSharedTier] = useState<Tier>('annual');

  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  // TODO(payments): swap for the real RevenueCat / StoreKit / Play Billing call,
  // then dismiss only on success.
  const onSubscribe = () => {
    dismiss();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ height: HEADER_HEIGHT, overflow: 'hidden' }}>
          <Image
            source={require('../assets/paywall-header.png')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              transform: [
                { translateX: IMAGE_OFFSET_X },
                { translateY: IMAGE_OFFSET_Y },
              ],
            }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'transparent', colors.background, colors.background]}
            locations={[0, 0.25, 0.55, 1]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: FADE_HEIGHT,
            }}
          />
          <Pressable
            onPress={dismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              position: 'absolute',
              top: insets.top + 16,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 8 }}>
            <Text className="text-headline-medium font-primary-bold text-primary-text">
              Rise Together Premium
            </Text>
            <Text className="mt-2 text-body-medium font-secondary text-secondary-text">
              Unlock your full potential with advanced tracking and community challenges.
            </Text>
          </View>
        </View>

        <View className="px-6">
          <PlanCard
            title="Individual Plan"
            subtitle="Perfect for solo habit builders"
            subtitleVariant="secondary"
            monthly={{
              label: 'Monthly Subscription',
              sublabel: 'Flexible, cancel anytime',
              price: '$4.99',
              period: 'per month',
            }}
            annual={{
              label: 'Annual Subscription',
              sublabel: 'Save 50% yearly',
              price: '$29.99',
              period: 'per year',
            }}
            features={INDIVIDUAL_FEATURES}
            tier={individualTier}
            onTierChange={setIndividualTier}
            ctaLabel="Start Individual Pro"
            onSubscribe={onSubscribe}
            containerClassName="mt-4"
          />

          <PlanCard
            title="Family & Friends"
            badge="BEST VALUE"
            subtitle="Accountability for up to 4 users"
            subtitleVariant="primary"
            monthly={{
              label: 'Monthly Sharing',
              sublabel: 'Billed monthly',
              price: '$7.99',
              period: 'per month',
            }}
            annual={{
              label: 'Annual Sharing',
              sublabel: 'Best value for groups',
              price: '$59.99',
              period: 'per year',
            }}
            features={SHARED_FEATURES}
            tier={sharedTier}
            onTierChange={setSharedTier}
            ctaLabel="Get Shared Plan"
            onSubscribe={onSubscribe}
            containerClassName="mt-5"
          />

          <View className="mt-8 flex-row items-center justify-center">
            <Pressable
              onPress={() => {
                /* TODO(payments): restore purchase */
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Restore purchase">
              <Text
                className="text-body-medium font-secondary-semibold"
                style={{ color: colors.primary }}>
                Restore Purchase
              </Text>
            </Pressable>
            <Text className="mx-3 text-body-medium font-secondary text-divider">|</Text>
            <Pressable
              onPress={() => router.push('/terms')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Terms of Service">
              <Text
                className="text-body-medium font-secondary-semibold"
                style={{ color: colors.primary }}>
                Terms of Service
              </Text>
            </Pressable>
          </View>
          <Text className="mt-3 text-center text-body-small font-secondary text-secondary-text">
            Recurring billing. Cancel anytime in settings.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

interface TierInfo {
  label: string;
  sublabel: string;
  price: string;
  period: string;
}

interface PlanCardProps {
  title: string;
  badge?: string;
  subtitle: string;
  subtitleVariant: 'primary' | 'secondary';
  monthly: TierInfo;
  annual: TierInfo;
  features: string[];
  tier: Tier;
  onTierChange: (next: Tier) => void;
  ctaLabel: string;
  onSubscribe: () => void;
  containerClassName?: string;
}

function PlanCard({
  title,
  badge,
  subtitle,
  subtitleVariant,
  monthly,
  annual,
  features,
  tier,
  onTierChange,
  ctaLabel,
  onSubscribe,
  containerClassName,
}: PlanCardProps) {
  const colors = useThemeColors();
  const subtitleColor =
    subtitleVariant === 'primary' ? colors.primary : colors.secondaryText;
  return (
    <View className={cn('rounded-lg bg-surface p-5', containerClassName)}>
      <View className="flex-row items-center justify-between">
        <Text className="text-title-large font-primary-bold text-primary-text">{title}</Text>
        {badge ? (
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: colors.primary }}>
            <Text
              className="text-body-small font-secondary-semibold"
              style={{ color: colors.onPrimary }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        className="mt-1 text-body-medium font-secondary"
        style={{ color: subtitleColor }}>
        {subtitle}
      </Text>

      <View className="my-5 h-px bg-divider" />

      <View className="gap-3">
        <TierOption
          info={monthly}
          selected={tier === 'monthly'}
          onPress={() => onTierChange('monthly')}
        />
        <TierOption
          info={annual}
          selected={tier === 'annual'}
          onPress={() => onTierChange('annual')}
        />
      </View>

      <View className="mt-5 gap-2.5">
        {features.map((feature) => (
          <FeatureRow key={feature} text={feature} />
        ))}
      </View>

      <View className="mt-5">
        <Button onPress={onSubscribe} accessibilityLabel={ctaLabel}>
          {ctaLabel}
        </Button>
      </View>
    </View>
  );
}

function TierOption({
  info,
  selected,
  onPress,
}: {
  info: TierInfo;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${info.label}, ${info.price} ${info.period}`}
      className={cn(
        'flex-row items-center justify-between rounded-md bg-background px-4 py-3.5',
        selected ? 'border-2 border-primary' : 'border border-divider',
      )}>
      <View className="flex-1 pr-3">
        <Text className="text-body-large font-primary-bold text-primary-text">{info.label}</Text>
        <Text className="mt-0.5 text-body-small font-secondary text-secondary-text">
          {info.sublabel}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-title-medium font-primary-bold text-primary-text">{info.price}</Text>
        <Text className="text-body-small font-secondary text-secondary-text">{info.period}</Text>
      </View>
    </Pressable>
  );
}

function FeatureRow({ text }: { text: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center">
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.success,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
      </View>
      <Text className="ml-3 flex-1 text-body-medium font-secondary text-primary-text">{text}</Text>
    </View>
  );
}
