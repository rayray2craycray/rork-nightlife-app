import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Edit3 } from 'lucide-react-native';
import { mockVenueRules } from '@/mocks/analytics';
import { VenueRule } from '@/types';
import * as Haptics from 'expo-haptics';

export default function RulesEngineScreen() {
  const [rules, setRules] = useState<VenueRule[]>(mockVenueRules);

  const toggleRule = (ruleId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRules(prev =>
      prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    );
  };

  const getRuleColor = (type: VenueRule['type']) => {
    switch (type) {
      case 'SPENDING_TIER':
        return '#00ff88';
      case 'FREQUENCY_TIER':
        return '#00d4ff';
      case 'SPECIFIC_PURCHASE':
        return '#ff6b9d';
      case 'PERFORMER_LOYALTY':
        return '#ffa64d';
      default:
        return '#00ffcc';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Automation Rules</Text>
          <Text style={styles.headerDescription}>
            Configure triggers that automatically unlock server access and reward loyal customers
          </Text>
        </View>

        <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
          <Plus size={20} color="#0a0a0f" />
          <Text style={styles.addButtonText}>Create New Rule</Text>
        </TouchableOpacity>

        <View style={styles.rulesContainer}>
          {rules.map(rule => (
            <View key={rule.id} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <View
                  style={[
                    styles.ruleTypeIndicator,
                    { backgroundColor: getRuleColor(rule.type) + '30' },
                  ]}
                >
                  <View
                    style={[
                      styles.ruleTypeDot,
                      { backgroundColor: getRuleColor(rule.type) },
                    ]}
                  />
                </View>
                <View style={styles.ruleHeaderInfo}>
                  <Text style={styles.ruleType}>
                    {rule.type.replace(/_/g, ' ')}
                  </Text>
                  <Switch
                    value={rule.isActive}
                    onValueChange={() => toggleRule(rule.id)}
                    trackColor={{ false: '#2a2a3e', true: '#00ffcc50' }}
                    thumbColor={rule.isActive ? '#00ffcc' : '#666680'}
                  />
                </View>
              </View>

              <View style={styles.ruleBody}>
                <View style={styles.ruleSection}>
                  <Text style={styles.ruleSectionLabel}>Trigger</Text>
                  <Text style={styles.ruleSectionValue}>
                    {rule.trigger.condition}
                  </Text>
                  <View style={styles.thresholdRow}>
                    <Text style={styles.thresholdLabel}>Threshold:</Text>
                    <Text style={styles.thresholdValue}>
                      {rule.trigger.threshold}
                      {rule.trigger.timeWindow
                        ? ` in ${rule.trigger.timeWindow} days`
                        : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.ruleSection}>
                  <Text style={styles.ruleSectionLabel}>Reward</Text>
                  <Text style={styles.ruleSectionValue}>
                    Access to {rule.reward.serverAccess}
                  </Text>
                  {rule.reward.badgeType && (
                    <View style={styles.badgeRow}>
                      <Text style={styles.badgeLabel}>Badge:</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{rule.reward.badgeType}</Text>
                      </View>
                    </View>
                  )}
                  {rule.reward.notifyManager && (
                    <Text style={styles.notifyText}>
                      ✓ Notify manager when triggered
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.ruleActions}>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                  <Edit3 size={16} color="#00d4ff" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                  <Trash2 size={16} color="#ff6b6b" />
                  <Text style={[styles.actionButtonText, { color: '#ff6b6b' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#fff',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#00ffcc',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0a0a0f',
  },
  rulesContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  ruleCard: {
    backgroundColor: '#15151f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f1f2e',
  },
  ruleHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 16,
  },
  ruleTypeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  ruleTypeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ruleHeaderInfo: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  ruleType: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    textTransform: 'capitalize' as const,
  },
  ruleBody: {
    gap: 16,
  },
  ruleSection: {
    gap: 8,
  },
  ruleSectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#00ffcc',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  ruleSectionValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  thresholdRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  thresholdLabel: {
    fontSize: 13,
    color: '#999',
  },
  thresholdValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#1f1f2e',
  },
  badgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  badgeLabel: {
    fontSize: 13,
    color: '#999',
  },
  badge: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#00ffcc',
  },
  notifyText: {
    fontSize: 12,
    color: '#00d4ff',
    fontWeight: '500' as const,
  },
  ruleActions: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f1f2e',
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1f1f2e',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#00d4ff',
  },
  bottomPadding: {
    height: 40,
  },
});
