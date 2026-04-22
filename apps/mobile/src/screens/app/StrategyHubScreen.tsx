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
import { useTranslation } from 'react-i18next';

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

type WhatIfSimulation = {
  current_concentration_score: string;
  projected_concentration_score: string;
  current_volatility_score: string;
  projected_volatility_score: string;
  rebalance_cost_estimate: string;
  expected_impact_summary: string;
};

type Goal = {
  title: string;
  target_value: string;
  due_date: string;
  risk_mode: string;
};

export const StrategyHubScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [coachSummary, setCoachSummary] = useState(t('strategyHub.loading'));
  const [coachActions, setCoachActions] = useState<CoachAction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [riskGuidance, setRiskGuidance] = useState<string[]>([]);
  const [weeklyHeadline, setWeeklyHeadline] = useState(t('strategyHub.weeklyLoading'));
  const [shareLink, setShareLink] = useState<string>('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [whatIf, setWhatIf] = useState<WhatIfSimulation | null>(null);

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
      setWeeklyHeadline(weeklyRes.data.headline ?? t('strategyHub.weeklyReady'));
      const whatIfRes = await apiClient.post('/api/v1/strategy/what-if', {
        target_allocations: { BTC: 35, ETH: 25, USDTRY: 15, XAU: 10, OTHER: 15 },
        rebalance_budget: 2500,
      });
      setWhatIf(whatIfRes.data ?? null);
    } catch {
      setError(t('strategyHub.loadError'));
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
      setError(t('strategyHub.actionError'));
    }
  };

  const saveGoal = async () => {
    if (!goalTitle.trim() || !goalTarget.trim() || !goalDate.trim()) {
      setError(t('strategyHub.goalValidation'));
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
      setError(t('strategyHub.goalSaveError'));
    }
  };

  const createShareSnapshot = async () => {
    try {
      logEvent('strategy_snapshot_created');
      await flushAnalyticsQueue();
      const { data } = await apiClient.post('/api/v1/strategy/public-snapshot/create');
      const compare = data?.compare_badge ? `\n${t('strategyHub.badgeLabel')}: ${data.compare_badge}` : '';
      const challenge = data?.challenge_link ? `\n${t('strategyHub.challengeLabel')}: ${data.challenge_link}` : '';
      setShareLink(`${data?.share_url ?? ''}${compare}${challenge}`);
    } catch {
      setError(t('strategyHub.snapshotError'));
    }
  };

  return (
    <Box flex={1} bg={colors.background.base}>
      <Box row align="center" style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginRight: spacing.md }}>
          <ArrowLeft color={colors.text.primary} size={22} />
        </Pressable>
        <Text variant="h3" weight="700">{t('strategyHub.title')}</Text>
      </Box>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        {error ? (
          <Box style={{ marginBottom: spacing.md, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,92,92,0.2)', backgroundColor: 'rgba(255,92,92,0.1)' }}>
            <Text variant="caption" color={colors.sentiment.bear_red}>{error}</Text>
          </Box>
        ) : null}

        <PremiumCard delay={80} style={{ marginBottom: spacing.md }}>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.xs }}>{t('strategyHub.dailyWeekly')}</Text>
          <Text variant="body" color={colors.text.secondary}>{coachSummary}</Text>
        </PremiumCard>

        <PremiumCard delay={120} style={{ marginBottom: spacing.md }}>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.sm }}>{t('strategyHub.insightAction')}</Text>
          {coachActions.length === 0 ? (
            <Text variant="caption" color={colors.text.secondary}>{t('strategyHub.noActions')}</Text>
          ) : (
            coachActions.map((a) => (
              <Box key={a.id} style={{ marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <Text variant="body" weight="600">{a.title}</Text>
                <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 2 }}>{a.description}</Text>
                <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                  {t('strategyHub.reasonLine', { reason: a.reason })}
                </Text>
                <Text variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                  {t('strategyHub.impactLine', { impact: a.expected_impact, confidence: a.confidence_score })}
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
            <Text variant="h3" weight="700">{t('strategyHub.goalPortfolio')}</Text>
          </Box>
          {goals.map((g, idx) => (
            <Text key={`${g.title}-${idx}`} variant="caption" color={colors.text.secondary} style={{ marginBottom: 4 }}>
              {t('strategyHub.goalLine', { title: g.title, target: g.target_value, dueDate: g.due_date })}
            </Text>
          ))}
          <TextInput
            value={goalTitle}
            onChangeText={setGoalTitle}
            placeholder={t('strategyHub.goalTitlePlaceholder')}
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, marginTop: spacing.sm }}
          />
          <TextInput
            value={goalTarget}
            onChangeText={setGoalTarget}
            placeholder={t('strategyHub.goalAmountPlaceholder')}
            placeholderTextColor={colors.text.muted}
            keyboardType="numeric"
            style={{ color: colors.text.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, marginTop: spacing.sm }}
          />
          <TextInput
            value={goalDate}
            onChangeText={setGoalDate}
            placeholder={t('strategyHub.goalDatePlaceholder')}
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, marginTop: spacing.sm }}
          />
          <Pressable onPress={saveGoal} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: spacing.sm }]}>
            <Text variant="caption" color={colors.accent.primary_blue} weight="700">{t('strategyHub.saveGoal')}</Text>
          </Pressable>
        </PremiumCard>

        <PremiumCard delay={200} style={{ marginBottom: spacing.md }}>
          <Box row align="center" style={{ marginBottom: spacing.sm }}>
            <ShieldAlert color={colors.sentiment.bear_red} size={16} style={{ marginRight: spacing.xs }} />
            <Text variant="h3" weight="700">{t('strategyHub.riskEngine')}</Text>
          </Box>
          {riskGuidance.map((line) => (
            <Text key={line} variant="caption" color={colors.text.secondary} style={{ marginBottom: 4 }}>
              {`• ${line}`}
            </Text>
          ))}
        </PremiumCard>

        <PremiumCard delay={240} style={{ marginBottom: spacing.md }}>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.xs }}>{t('strategyHub.lifecycle')}</Text>
          <Text variant="caption" color={colors.text.secondary}>{weeklyHeadline}</Text>
        </PremiumCard>

        <PremiumCard delay={260} style={{ marginBottom: spacing.md }}>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.xs }}>{t('strategyHub.whatIf')}</Text>
          {whatIf ? (
            <>
              <Text variant="caption" color={colors.text.secondary}>
                {t('strategyHub.concentrationLine', { from: whatIf.current_concentration_score, to: whatIf.projected_concentration_score })}
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {t('strategyHub.volatilityLine', { from: whatIf.current_volatility_score, to: whatIf.projected_volatility_score })}
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {t('strategyHub.costLine', { cost: whatIf.rebalance_cost_estimate })}
              </Text>
              <Text variant="caption" color={colors.text.muted} style={{ marginTop: spacing.xs }}>
                {whatIf.expected_impact_summary}
              </Text>
            </>
          ) : (
            <Text variant="caption" color={colors.text.secondary}>{t('strategyHub.whatIfLoading')}</Text>
          )}
        </PremiumCard>

        <PremiumCard delay={280}>
          <Text variant="h3" weight="700" style={{ marginBottom: spacing.xs }}>{t('strategyHub.growthSurface')}</Text>
          <Pressable onPress={createShareSnapshot} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Text variant="caption" color={colors.accent.primary_blue} weight="700">{t('strategyHub.createSnapshot')}</Text>
          </Pressable>
          {shareLink ? (
            <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>{shareLink}</Text>
          ) : null}
        </PremiumCard>
      </ScrollView>
    </Box>
  );
};
