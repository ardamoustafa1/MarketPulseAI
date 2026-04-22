import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldAlert, Target } from 'lucide-react-native';
import { Box } from '../../components/ui/Box';
import { Text } from '../../components/ui/Text';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { colors, radius, spacing } from '../../theme';
import { apiClient } from '../../api/client';
import { flushAnalyticsQueue, logEvent, logScreen } from '../../monitoring/analytics';

type CoachAction = {
  id: string;
  title: string;
  description: string;
  cta: string;
  status: string;
  reason: string;
  expected_impact: string;
  confidence_score: string;
  metadata?: Record<string, unknown>;
};

type Goal = {
  title: string;
  target_value: string;
  due_date: string;
  risk_mode: string;
};

export const StrategyHubScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [coachSummary, setCoachSummary] = useState('Yukleniyor...');
  const [coachActions, setCoachActions] = useState<CoachAction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [riskGuidance, setRiskGuidance] = useState<string[]>([]);
  const [weeklyHeadline, setWeeklyHeadline] = useState('Haftalik rapor yukleniyor...');
  const [shareLink, setShareLink] = useState<string>('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [coachRes, goalsRes, riskRes, weeklyRes] = await Promise.all([
        apiClient.get('/api/v1/strategy/coach-loop'),
        apiClient.get('/api/v1/strategy/goals'),
        apiClient.get('/api/v1/strategy/risk-report'),
        apiClient.get('/api/v1/notifications/weekly-summary'),
      ]);
      setCoachSummary(`${coachRes.data.daily_summary} ${coachRes.data.weekly_summary}`);
      setCoachActions(Array.isArray(coachRes.data.actions) ? coachRes.data.actions : []);
      setGoals(Array.isArray(goalsRes.data.goals) ? goalsRes.data.goals : []);
      setRiskGuidance(Array.isArray(riskRes.data.guidance) ? riskRes.data.guidance : []);
      setWeeklyHeadline(weeklyRes.data.headline ?? 'Haftalik rapor hazir.');
    } catch {
      setError('Strateji merkezi yuklenemedi. Lutfen tekrar dene.');
    }
  }, []);

  useEffect(() => {
    logScreen('StrategyHub', { source: 'home_dashboard' });
    logEvent('strategy_hub_opened', { source: 'home_dashboard' });
    void flushAnalyticsQueue();
    void load();
  }, [load]);

  const applyCoachAction = async (actionId: string) => {
    try {
      logEvent('strategy_coach_action_applied', { actionId });
      await flushAnalyticsQueue();
      await apiClient.post(`/api/v1/strategy/coach-actions/${actionId}`, {});
      await load();
    } catch {
      setError('Aksiyon uygulanamadi. Tekrar dene.');
    }
  };

  const saveGoal = async () => {
    if (!goalTitle.trim() || !goalTarget.trim() || !goalDate.trim()) {
      setError('Hedef icin baslik, tutar ve tarih gir.');
      return;
    }
    const nextGoals = [
      ...goals,
      { title: goalTitle.trim(), target_value: goalTarget.trim(), due_date: goalDate.trim(), risk_mode: 'balanced' },
    ];
    try {
      logEvent('strategy_goal_saved', { title: goalTitle.trim() });
      await flushAnalyticsQueue();
      await apiClient.post('/api/v1/strategy/goals', { goals: nextGoals });
      setGoalTitle('');
      setGoalTarget('');
      setGoalDate('');
      setGoals(nextGoals);
      setError(null);
    } catch {
      setError('Hedef kaydedilemedi. Girdileri kontrol edip tekrar dene.');
    }
  };

  const createShareSnapshot = async () => {
    try {
      logEvent('strategy_snapshot_created');
      await flushAnalyticsQueue();
      const { data } = await apiClient.post('/api/v1/strategy/public-snapshot/create');
      setShareLink(data?.share_url ?? '');
    } catch {
      setError('Paylasim linki olusturulamadi. Tekrar dene.');
    }
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <Box row align="center" style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginRight: spacing.md }}>
          <ArrowLeft color={colors.text.primary} size={22} />
        </Pressable>
        <Text variant="h3" weight="700">Yatirim Kocu</Text>
      </Box>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        {error ? (
          <Box style={{ marginBottom: spacing.md, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,92,92,0.2)', backgroundColor: 'rgba(255,92,92,0.1)' }}>
            <Text variant="caption" color={colors.sentiment.bear_red}>{error}</Text>
          </Box>
        ) : null}

        <PremiumCard delay={80} style={{ marginBottom: spacing.md }}>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.xs }}>Gunluk + Haftalik Ozet</Text>
          <Text variant="body" color={colors.text.secondary}>{coachSummary}</Text>
        </PremiumCard>

        <PremiumCard delay={120} style={{ marginBottom: spacing.md }}>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>Insight -> Action</Text>
          {coachActions.length === 0 ? (
            <Text variant="caption" color={colors.text.secondary}>Bugun icin aksiyon yok.</Text>
          ) : (
            coachActions.map((a) => (
              <Box key={a.id} style={{ marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <Text variant="body" weight="600">{a.title}</Text>
                <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 2 }}>{a.description}</Text>
                <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                  {`Neden: ${a.reason}`}
                </Text>
                <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                  {`Beklenen etki: ${a.expected_impact} · Guven: ${a.confidence_score}`}
                </Text>
                <Pressable onPress={() => applyCoachAction(a.id)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: spacing.xs }]}>
                  <Text variant="caption" color={colors.accent.primary_blue} weight="700">{a.cta}</Text>
                </Pressable>
              </Box>
            ))
          )}
        </PremiumCard>

        <PremiumCard delay={160} style={{ marginBottom: spacing.md }}>
          <Box row align="center" style={{ marginBottom: spacing.sm }}>
            <Target color={colors.accent.primary_blue} size={16} style={{ marginRight: spacing.xs }} />
            <Text variant="h3" weight="700">Hedef Bazli Portfoy</Text>
          </Box>
          {goals.map((g, idx) => (
            <Text key={`${g.title}-${idx}`} variant="caption" color={colors.text.secondary} style={{ marginBottom: 4 }}>
              {`• ${g.title} -> ${g.target_value} (son tarih ${g.due_date})`}
            </Text>
          ))}
          <TextInput
            value={goalTitle}
            onChangeText={setGoalTitle}
            placeholder="Hedef basligi"
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, marginTop: spacing.sm }}
          />
          <TextInput
            value={goalTarget}
            onChangeText={setGoalTarget}
            placeholder="Hedef tutar (USD)"
            placeholderTextColor={colors.text.muted}
            keyboardType="numeric"
            style={{ color: colors.text.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, marginTop: spacing.sm }}
          />
          <TextInput
            value={goalDate}
            onChangeText={setGoalDate}
            placeholder="Son tarih (YYYY-MM-DD)"
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, marginTop: spacing.sm }}
          />
          <Pressable onPress={saveGoal} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: spacing.sm }]}>
            <Text variant="caption" color={colors.accent.primary_blue} weight="700">Hedefi kaydet</Text>
          </Pressable>
        </PremiumCard>

        <PremiumCard delay={200} style={{ marginBottom: spacing.md }}>
          <Box row align="center" style={{ marginBottom: spacing.sm }}>
            <ShieldAlert color={colors.sentiment.bear_red} size={16} style={{ marginRight: spacing.xs }} />
            <Text variant="h3" weight="700">Proaktif Risk Motoru</Text>
          </Box>
          {riskGuidance.map((line) => (
            <Text key={line} variant="caption" color={colors.text.secondary} style={{ marginBottom: 4 }}>
              {`• ${line}`}
            </Text>
          ))}
        </PremiumCard>

        <PremiumCard delay={240} style={{ marginBottom: spacing.md }}>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.xs }}>Lifecycle / Engagement</Text>
          <Text variant="caption" color={colors.text.secondary}>{weeklyHeadline}</Text>
        </PremiumCard>

        <PremiumCard delay={280}>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.xs }}>Growth Surface</Text>
          <Pressable onPress={createShareSnapshot} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Text variant="caption" color={colors.accent.primary_blue} weight="700">Public snapshot linki olustur</Text>
          </Pressable>
          {shareLink ? (
            <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>{shareLink}</Text>
          ) : null}
        </PremiumCard>
      </ScrollView>
    </Box>
  );
};
