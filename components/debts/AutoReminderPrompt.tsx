import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { Debt } from './types';
import { formatDueDate } from './utils';

type Props = {
    visible: boolean;
    targets: Debt[];
    formatCurrency: (value: number) => string;
    onSendReminder: (debt: Debt) => void;
    onClose: () => void;
};

export function AutoReminderPrompt({ visible, targets, formatCurrency, onSendReminder, onClose }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <ThemedText type="subtitle">Auto reminders ready</ThemedText>
                    <ThemedText style={[styles.modalMeta, { color: theme.muted }]}>
                        {targets.length} debtors need reminders.
                    </ThemedText>
                    <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                        {targets.map((debt) => (
                            <View key={debt.id} style={styles.modalRow}>
                                <View style={styles.modalInfo}>
                                    <ThemedText style={styles.modalName}>{debt.customerName ?? 'Customer'}</ThemedText>
                                    <ThemedText style={[styles.modalSub, { color: theme.muted }]}>
                                        {formatCurrency(debt.balanceDue)} • {formatDueDate(debt.dueDate)}
                                    </ThemedText>
                                </View>
                                <Pressable
                                    onPress={() => onSendReminder(debt)}
                                    style={[styles.modalAction, { backgroundColor: theme.primary }]}>
                                    <ThemedText style={styles.modalActionText}>Send</ThemedText>
                                </Pressable>
                            </View>
                        ))}
                    </ScrollView>
                    <Pressable onPress={onClose} style={[styles.modalCloseButton, { borderColor: theme.border }]}>
                        <ThemedText style={styles.modalCloseText}>Close</ThemedText>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
    },
    modalMeta: {
        fontSize: 12,
    },
    modalList: {
        maxHeight: 280,
    },
    modalListContent: {
        gap: 12,
        paddingVertical: 4,
    },
    modalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalInfo: {
        flex: 1,
        gap: 2,
    },
    modalName: {
        fontSize: 14,
    },
    modalSub: {
        fontSize: 12,
    },
    modalAction: {
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    modalActionText: {
        color: '#FFFFFF',
        fontSize: 12,
    },
    modalCloseButton: {
        borderWidth: 1,
        borderRadius: 999,
        alignItems: 'center',
        paddingVertical: 8,
    },
    modalCloseText: {
        fontSize: 12,
    },
});
