import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useChallenges } from '../../lib/challenges-context';
import { useHabits } from '../../lib/habits-context';
import { toISO, todayISO } from '../../lib/streak';
import { useThemeColors, useThemeFonts } from '../../lib/theme-context';
import { isScheduledToday, type Weekday } from '../../lib/weekdays';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Sunday-first to match Date.getDay()'s 0..6 indexing.
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const SAFETY_DAY_CAP = 400;

export default function Stats() {
  const colors = useThemeColors();
  const fonts = useThemeFonts();
  const { habits } = useHabits();
  const { challenges } = useChallenges();

  // ---------------------------------------------------------------------------
  // All derivations memoized off habits + challenges. Recomputes when either
  // changes (e.g. a habit toggled, a challenge ended).
  // ---------------------------------------------------------------------------
  const stats = useMemo(() => {
    const now = new Date();
    const todayIso = todayISO();
    const todayDay = startOfDay(now);

    // Helper: for a date range [start, end] inclusive, sum scheduled habit-days
    // and completed habit-days across all habits. A habit only counts as
    // scheduled on days >= its createdAt — days before the habit existed
    // shouldn't inflate the denominator.
    const tallyRange = (start: Date, end: Date) => {
      let scheduled = 0;
      let completed = 0;
      if (end.getTime() < start.getTime()) return { scheduled, completed };
      const cursor = startOfDay(start);
      const last = startOfDay(end);
      for (let i = 0; i < SAFETY_DAY_CAP; i++) {
        const iso = toISO(cursor);
        for (const h of habits) {
          if (iso < h.createdAt) continue; // habit didn't exist yet
          if (isScheduledToday(h.daysOfWeek as Weekday[], cursor)) {
            scheduled++;
            if (h.completedDates.includes(iso)) completed++;
          }
        }
        if (cursor.getTime() >= last.getTime()) break;
        cursor.setDate(cursor.getDate() + 1);
      }
      return { scheduled, completed };
    };

    // --- Top stat cards ----------------------------------------------------
    const sevenDaysAgo = new Date(todayDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const week = tallyRange(sevenDaysAgo, todayDay);
    const weeklyConsistency =
      week.scheduled > 0 ? Math.round((week.completed / week.scheduled) * 100) : 0;

    const totalCompletions = habits.reduce(
      (sum, h) => sum + h.completedDates.length,
      0,
    );

    const bestStreak = habits.reduce((m, h) => Math.max(m, h.streak), 0);

    const activeChallengeCount = challenges.filter(
      (c) => !c.endDate || c.endDate >= todayIso,
    ).length;
    const activeGoals = habits.length + activeChallengeCount;

    // --- Weekly Activity bars (last 7 days, oldest → newest) ----------------
    const weeklyBars: { label: string; count: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDay);
      d.setDate(d.getDate() - i);
      const iso = toISO(d);
      const count = habits.reduce(
        (s, h) => s + (h.completedDates.includes(iso) ? 1 : 0),
        0,
      );
      weeklyBars.push({
        label: DAY_LABELS[d.getDay()],
        count,
        isToday: iso === todayIso,
      });
    }
    const maxWeeklyCount = Math.max(1, ...weeklyBars.map((d) => d.count));

    // --- Monthly Progress ---------------------------------------------------
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = tallyRange(monthStart, todayDay);
    const monthlyHabitPct =
      month.scheduled > 0 ? Math.round((month.completed / month.scheduled) * 100) : 0;

    // Scope to the current month: numerator = challenges that ended this month;
    // denominator = challenges whose lifespan overlapped this month at all.
    // (The card sits under "This Month" — lifetime totals don't belong here.)
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStartIso = `${monthKey}-01`;
    const completedChallengeCount = challenges.filter(
      (c) => c.endDate && c.endDate < todayIso && c.endDate.startsWith(monthKey),
    ).length;
    const totalChallengeCount = challenges.filter(
      (c) => c.startDate <= todayIso && (!c.endDate || c.endDate >= monthStartIso),
    ).length;
    const winsPct =
      totalChallengeCount > 0
        ? Math.round((completedChallengeCount / totalChallengeCount) * 100)
        : 0;

    // --- Consistency History (last 6 months, oldest → newest) ---------------
    // We also track `hadData` per month (was anything scheduled?) so we can
    // trim leading months with no habits — otherwise a fresh account shows
    // a depressing flat-zero line back to whenever the chart window starts.
    const historyBarsAll: { label: string; pct: number; hadData: boolean }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // End-of-month: clamp to today if we're inside the current month so
      // we don't pad the bar with not-yet-elapsed days.
      const endOfMonth = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      );
      const end =
        endOfMonth.getTime() > todayDay.getTime() ? todayDay : endOfMonth;
      const m = tallyRange(monthDate, end);
      historyBarsAll.push({
        label: MONTH_LABELS[monthDate.getMonth()],
        pct: m.scheduled > 0 ? Math.round((m.completed / m.scheduled) * 100) : 0,
        hadData: m.scheduled > 0,
      });
    }
    // Drop leading months with no scheduled habit-days; keep everything from
    // the first month with real data onward (including any zero-completion
    // months that came after — those are genuine "you had habits but didn't
    // check in" signal, not "you didn't have the app yet").
    const firstWithData = historyBarsAll.findIndex((m) => m.hadData);
    const historyBars =
      firstWithData === -1 ? [] : historyBarsAll.slice(firstWithData);

    return {
      weeklyConsistency,
      totalCompletions,
      bestStreak,
      activeGoals,
      weeklyBars,
      maxWeeklyCount,
      monthlyHabitPct,
      completedChallengeCount,
      totalChallengeCount,
      winsPct,
      historyBars,
    };
  }, [habits, challenges]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text
          className="pt-2 pb-6 text-headline-large text-primary-text"
          style={{ fontFamily: fonts.primaryBold }}>
          Stats
        </Text>

        {/* Stat cards (2x2) */}
        <View className="flex-row gap-3">
          <StatCard label="Consistency" value={`${stats.weeklyConsistency}%`} />
          <StatCard label="Completions" value={`${stats.totalCompletions}`} />
        </View>
        <View className="mt-3 flex-row gap-3">
          <StatCard label="Day Streak" value={`${stats.bestStreak}`} />
          <StatCard label="Active Goals" value={`${stats.activeGoals}`} />
        </View>

        {/* Weekly Activity */}
        <View className="mt-8 flex-row items-baseline justify-between">
          <Text
            className="text-title-large text-primary-text"
            style={{ fontFamily: fonts.primaryBold }}>
            Weekly Activity
          </Text>
          <Text
            className="text-label-large font-secondary-semibold"
            style={{ color: colors.primary }}>
            Last 7 Days
          </Text>
        </View>
        <View className="mt-4 rounded-md bg-surface p-5">
          <View className="flex-row items-end justify-between" style={{ height: 140 }}>
            {stats.weeklyBars.map((d, i) => {
              const h = (d.count / stats.maxWeeklyCount) * 120;
              return (
                <View key={i} className="items-center" style={{ width: 28 }}>
                  <View
                    style={{
                      width: 18,
                      height: Math.max(4, h),
                      borderRadius: 6,
                      backgroundColor: d.count > 0 ? colors.primary : colors.divider,
                      opacity: d.isToday ? 1 : 0.85,
                    }}
                  />
                </View>
              );
            })}
          </View>
          <View className="mt-2 flex-row justify-between">
            {stats.weeklyBars.map((d, i) => (
              <Text
                key={i}
                style={{ width: 28, textAlign: 'center', color: colors.secondaryText }}
                className="text-body-small font-secondary">
                {d.label}
              </Text>
            ))}
          </View>
          <Text className="mt-4 text-center text-body-small font-secondary text-secondary-text">
            Avg. {stats.weeklyConsistency}% completion rate this week
          </Text>
        </View>

        {/* Monthly Progress */}
        <Text
          className="mt-8 text-title-large text-primary-text"
          style={{ fontFamily: fonts.primaryBold }}>
          Monthly Progress
        </Text>
        <View className="mt-4 rounded-md bg-surface p-5">
          <ProgressRow
            label="Habit Completion"
            valueText={`${stats.monthlyHabitPct}%`}
            valueColor={colors.primary}
            barPct={stats.monthlyHabitPct}
            barColor={colors.primary}
            trackColor={colors.divider}
          />
          <View style={{ height: 18 }} />
          <ProgressRow
            label="Challenges Completed"
            valueText={`${stats.completedChallengeCount}/${stats.totalChallengeCount}`}
            valueColor={colors.primaryText}
            barPct={stats.winsPct}
            barColor={colors.primary}
            trackColor={colors.divider}
          />
        </View>

        {/* Consistency History */}
        <Text
          className="mt-8 text-title-large text-primary-text"
          style={{ fontFamily: fonts.primaryBold }}>
          Consistency History
        </Text>
        <View className="mt-4 rounded-md bg-surface p-5">
          {stats.historyBars.length === 0 ? (
            <View className="items-center py-10">
              <Text className="text-center text-body-medium font-secondary text-secondary-text">
                No history yet. Keep checking in to see your trend.
              </Text>
            </View>
          ) : stats.historyBars.length === 1 ? (
            <View className="items-center py-8">
              <Text
                className="text-headline-large"
                style={{ fontFamily: fonts.primaryBold, color: colors.primary }}>
                {stats.historyBars[0].pct}%
              </Text>
              <Text className="mt-1 text-body-medium font-secondary text-secondary-text">
                in {stats.historyBars[0].label}
              </Text>
              <Text className="mt-4 text-center text-body-small font-secondary text-secondary-text">
                Your trend will appear once you have a second month of data.
              </Text>
            </View>
          ) : (
            <AreaChart
              data={stats.historyBars}
              maxPct={100}
              lineColor={colors.primary}
              fillColor={colors.primary}
              dotColor={colors.primary}
              labelColor={colors.secondaryText}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Helpers ----------------------------------------------------------------

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function StatCard({ label, value }: { label: string; value: string }) {
  const fonts = useThemeFonts();
  return (
    <View className="flex-1 rounded-md bg-surface p-4">
      <Text
        className="text-headline-medium text-primary-text"
        style={{ fontFamily: fonts.primaryBold }}>
        {value}
      </Text>
      <Text className="mt-1 text-body-small font-secondary text-secondary-text">{label}</Text>
    </View>
  );
}

function AreaChart({
  data,
  maxPct,
  lineColor,
  fillColor,
  dotColor,
  labelColor,
}: {
  data: { label: string; pct: number }[];
  maxPct: number;
  lineColor: string;
  fillColor: string;
  dotColor: string;
  labelColor: string;
}) {
  const [width, setWidth] = useState(0);
  const chartHeight = 140;
  const padX = 12;
  const padTop = 12;
  const padBottom = 8;

  if (data.length === 0) return null;

  const innerW = Math.max(0, width - padX * 2);
  const innerH = chartHeight - padTop - padBottom;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const safeMax = Math.max(1, maxPct);
  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padTop + innerH - (d.pct / safeMax) * innerH,
  }));

  // Smooth Catmull-Rom curve through every point, expressed as cubic Beziers.
  // Skip the line + area entirely when we only have one point — a single
  // dot is the right visual; a degenerate path would just draw a stem.
  const baselineY = padTop + innerH;
  const linePath = points.length >= 2 ? pointsToSmoothPath(points) : '';
  const areaPath =
    points.length >= 2
      ? linePath +
        ` L ${points[points.length - 1].x},${baselineY}` +
        ` L ${points[0].x},${baselineY} Z`
      : '';

  return (
    <View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: chartHeight }}>
        {width > 0 ? (
          <Svg width={width} height={chartHeight}>
            {areaPath ? <Path d={areaPath} fill={fillColor} fillOpacity={0.25} /> : null}
            {linePath ? (
              <Path d={linePath} stroke={lineColor} strokeWidth={2} fill="none" />
            ) : null}
            {points.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={4} fill={dotColor} />
            ))}
          </Svg>
        ) : null}
      </View>
      <View className="mt-2 flex-row justify-between" style={{ paddingHorizontal: padX - 14 }}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={{ width: 28, textAlign: 'center', color: labelColor }}
            className="text-body-small font-secondary">
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * Convert a list of points into an SVG path string using Catmull-Rom →
 * cubic-Bezier conversion so the line smoothly passes through every point.
 *
 * Each Bezier segment's control-point y values are clamped to the y-range of
 * the two endpoints — this preserves smoothness on real data while killing
 * Catmull-Rom's classic "overshoot" when a flat run is followed by a spike
 * (which otherwise dips the curve below the floor before rising).
 */
function pointsToSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;
    const segMin = Math.min(p1.y, p2.y);
    const segMax = Math.max(p1.y, p2.y);
    cp1y = Math.max(segMin, Math.min(segMax, cp1y));
    cp2y = Math.max(segMin, Math.min(segMax, cp2y));
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function ProgressRow({
  label,
  valueText,
  valueColor,
  barPct,
  barColor,
  trackColor,
}: {
  label: string;
  valueText: string;
  valueColor: string;
  barPct: number;
  barColor: string;
  trackColor: string;
}) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-body-medium font-primary-bold text-primary-text">{label}</Text>
        <Text className="text-body-medium font-primary-bold" style={{ color: valueColor }}>
          {valueText}
        </Text>
      </View>
      <View
        className="mt-2 w-full overflow-hidden rounded-full"
        style={{ height: 6, backgroundColor: trackColor }}>
        <View
          style={{
            width: `${Math.min(100, Math.max(0, barPct))}%`,
            height: '100%',
            backgroundColor: barColor,
          }}
        />
      </View>
    </View>
  );
}
