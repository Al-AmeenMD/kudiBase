import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { AutoReminderSettings } from './types';

type Props = {
    premium: boolean;
    settings: AutoReminderSettings;
    onToggle: (enabled: boolean) => void;
    onSelectFrequency: (frequency: 'daily' | 'weekly') => void;
    onSelectTime: (time: '09:00' | '13:00' | '18:00') => void;
    onSelectWeekday: (weekday: number) => void;
};

export function AutoRemindersSection({
    premium,
    settings,
    onToggle,
    onSelectFrequency,
    onSelectTime,
    onSelectWeekday,
}: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const router = useRouter();

    const scheduleLabel = (() => {
        const timeLabel =
            settings.time === '09:00' ? '9:00 AM' : settings.time === '13:00' ? '1:00 PM' : '6:00 PM';
        if (settings.frequency === 'weekly') {
            const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return `${weekdays[settings.weekday] ?? 'Mon'} at ${timeLabel}`;
        }
        return `Daily at ${timeLabel}`;
    })();

    if (!premium) {
        return (
            <View style={styles.section}>
                <ThemedText type="subtitle">Auto reminders</ThemedText>
                <View style={[styles.lockCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                    <View style={styles.lockRow}>
                        <View style={styles.lockContent}>
                            <ThemedText style={styles.lockTitle}>Auto debtor reminders</ThemedText>
                            <ThemedText style={[styles.lockSubtitle, { color: theme.muted }]}>
                                Schedule WhatsApp reminders automatically.
                            </ThemedText>
                        </View>
                        <View style={styles.lockActions}>
                            <IconSymbol name="crown.fill" size={18} color={theme.primaryDeep} />
                            <Pressable
                                onPress={() => router.push('/premium')}
                                style={[styles.lockButton, { borderColor: theme.border }]}>
                                <ThemedText style={styles.lockButtonText}>Unlock</ThemedText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.section}>
            <ThemedText type="subtitle">Auto reminders</ThemedText>
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <View style={styles.autoRow}>
                    <View>
                        <ThemedText style={styles.autoTitle}>Auto reminders</ThemedText>
                        <ThemedText style={[styles.autoMeta, { color: theme.muted }]}>
                            {settings.enabled ? scheduleLabel : 'Reminders are currently off.'}
                        </ThemedText>
                    </View>
                    <Pressable
                        onPress={() => onToggle(!settings.enabled)}
                        style={[
                            styles.autoToggle,
                            {
                                backgroundColor: settings.enabled ? theme.primary : theme.surface,
                                borderColor: theme.border,
                            },
                        ]}>
                        <ThemedText style={[styles.autoToggleText, { color: settings.enabled ? '#FFFFFF' : theme.text }]}>
                            {settings.enabled ? 'On' : 'Off'}
                        </ThemedText>
                    </Pressable>
                </View>

                {settings.enabled && (
                    <>
                        <View style={[styles.autoDivider, { backgroundColor: theme.border }]} />
                        <ThemedText style={styles.autoLabel}>Frequency</ThemedText>
                        <View style={styles.optionRow}>
                            {(['daily', 'weekly'] as const).map((option) => (
                                <Pressable
                                    key={option}
                                    onPress={() => onSelectFrequency(option)}
                                    style={[
                                        styles.optionPill,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: settings.frequency === option ? theme.primary : theme.surface,
                                        },
                                    ]}>
                                    <ThemedText
                                        style={[
                                            styles.optionText,
                                            { color: settings.frequency === option ? '#FFFFFF' : theme.text },
                                        ]}>
                                        {option === 'daily' ? 'Daily' : 'Weekly'}
                                    </ThemedText>
                                </Pressable>
                            ))}
                        </View>

                        {settings.frequency === 'weekly' && (
                            <>
                                <ThemedText style={styles.autoLabel}>Day</ThemedText>
                                <View style={styles.optionRow}>
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
                                        <Pressable
                                            key={`${label}-${index}`}
                                            onPress={() => onSelectWeekday(index)}
                                            style={[
                                                styles.optionCircle,
                                                {
                                                    borderColor: theme.border,
                                                    backgroundColor: settings.weekday === index ? theme.primary : theme.surface,
                                                },
                                            ]}>
                                            <ThemedText
                                                style={[
                                                    styles.optionText,
                                                    { color: settings.weekday === index ? '#FFFFFF' : theme.text },
                                                ]}>
                                                {label}
                                            </ThemedText>
                                        </Pressable>
                                    ))}
                                </View>
                            </>
                        )}

                        <ThemedText style={styles.autoLabel}>Time</ThemedText>
                        <View style={styles.optionRow}>
                            {([
                                { value: '09:00', label: '9 AM' },
                                { value: '13:00', label: '1 PM' },
                                { value: '18:00', label: '6 PM' },
                            ] as const).map((option) => (
                                <Pressable
                                    key={option.value}
                                    onPress={() => onSelectTime(option.value)}
                                    style={[
                                        styles.optionPill,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: settings.time === option.value ? theme.primary : theme.surface,
                                        },
                                    ]}>
                                    <ThemedText
                                        style={[
                                            styles.optionText,
                                            { color: settings.time === option.value ? '#FFFFFF' : theme.text },
                                        ]}>
                                        {option.label}
                                    </ThemedText>
                                </Pressable>
                            ))}
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        gap: 12,
    },
    card: {
        borderWidth: 1,
        borderRadius: 16,
    },
    lockCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
    },
    lockRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    lockContent: {
        flex: 1,
        minWidth: 180,
    },
    lockTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    lockSubtitle: {
        fontSize: 12,
        marginTop: 4,
    },
    lockActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    lockButton: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    lockButtonText: {
        fontSize: 12,
    },
    autoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        padding: 16,
        paddingBottom: 12,
    },
    autoTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    autoMeta: {
        fontSize: 12,
        marginTop: 4,
    },
    autoToggle: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    autoToggleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    autoDivider: {
        height: 1,
        opacity: 0.6,
        marginHorizontal: 16,
    },
    autoLabel: {
        fontSize: 12,
        marginTop: 12,
        marginHorizontal: 16,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 4,
    },
    optionPill: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    optionCircle: {
        borderWidth: 1,
        borderRadius: 999,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        fontSize: 12,
    },
});
