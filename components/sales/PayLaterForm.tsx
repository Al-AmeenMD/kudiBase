import DateTimePicker from '@react-native-community/datetimepicker';
import { useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';

type Props = {
    customerName: string;
    customerPhone: string;
    dueDate: Date;
    balanceDue: number;
    amountReceived: string;
    subtotal: number;
    onCustomerNameChange: (name: string) => void;
    onCustomerPhoneChange: (phone: string) => void;
    onDueDateChange: (date: Date) => void;
    onAmountReceivedChange: (amount: string) => void;
    onPickContact: () => void;
    recentCustomers: Array<{ name: string; phone: string | null }>;
    onSelectRecent: (name: string, phone?: string | null) => void;
};

function formatDateLabel(date: Date) {
    return date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' });
}

function formatNumberInput(value: string) {
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) {
        return '';
    }
    const number = Number(digits);
    return Number.isFinite(number) ? number.toLocaleString('en-NG') : '';
}

function parseNumberInput(value: string) {
    const digits = value.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
}

export function PayLaterForm({
    customerName,
    customerPhone,
    dueDate,
    balanceDue,
    amountReceived,
    subtotal,
    onCustomerNameChange,
    onCustomerPhoneChange,
    onDueDateChange,
    onAmountReceivedChange,
    onPickContact,
    recentCustomers,
    onSelectRecent,
}: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { format } = useCurrency();
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);
    const amountWarnedRef = useRef(false);

    function handleAmountChange(value: string) {
        const formatted = formatNumberInput(value);
        if (!formatted) {
            onAmountReceivedChange('');
            return;
        }
        const parsed = parseNumberInput(formatted);
        const clamped = Math.min(parsed, subtotal);
        if (parsed > subtotal && !amountWarnedRef.current) {
            amountWarnedRef.current = true;
            Alert.alert('Amount limit', 'Amount received cannot exceed the total.');
        }
        if (parsed <= subtotal) {
            amountWarnedRef.current = false;
        }
        onAmountReceivedChange(formatNumberInput(String(Math.floor(clamped))));
    }

    return (
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.inputRow}>
                <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>
                    Amount received
                </ThemedText>
                <TextInput
                    value={amountReceived}
                    onChangeText={handleAmountChange}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.muted}
                    style={[
                        styles.textInput,
                        { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                    ]}
                />
            </View>

            <View style={styles.inputGroup}>
                <Pressable
                    onPress={onPickContact}
                    style={[styles.contactButton, { borderColor: theme.border }]}>
                    <ThemedText style={styles.contactButtonText}>Pick from contacts</ThemedText>
                </Pressable>
                <View style={styles.inputRow}>
                    <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>
                        Customer name
                    </ThemedText>
                    <TextInput
                        value={customerName}
                        onChangeText={onCustomerNameChange}
                        placeholder="Ahmad Yusuf"
                        placeholderTextColor={theme.muted}
                        style={[
                            styles.textInput,
                            { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                        ]}
                    />
                </View>
                <View style={styles.inputRow}>
                    <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>
                        Phone number
                    </ThemedText>
                    <TextInput
                        value={customerPhone}
                        onChangeText={onCustomerPhoneChange}
                        keyboardType="phone-pad"
                        placeholder="0803 000 0000"
                        placeholderTextColor={theme.muted}
                        style={[
                            styles.textInput,
                            { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                        ]}
                    />
                </View>
                <View style={styles.inputRow}>
                    <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>
                        Due date
                    </ThemedText>
                    <Pressable
                        onPress={() => setShowDueDatePicker(true)}
                        style={[
                            styles.dateField,
                            { borderColor: theme.border, backgroundColor: theme.surface },
                        ]}>
                        <ThemedText style={styles.dateFieldText}>
                            {formatDateLabel(dueDate)}
                        </ThemedText>
                    </Pressable>
                </View>
                <View style={styles.balanceRow}>
                    <ThemedText style={[styles.balanceLabel, { color: theme.muted }]}>
                        Balance due
                    </ThemedText>
                    <ThemedText style={styles.balanceValue}>{format(balanceDue)}</ThemedText>
                </View>
                {recentCustomers.length > 0 ? (
                    <View style={styles.recentBlock}>
                        <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>Recent customers</ThemedText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {recentCustomers.map((customer) => (
                                <Pressable
                                    key={`${customer.name}-${customer.phone ?? ''}`}
                                    onPress={() => onSelectRecent(customer.name, customer.phone)}
                                    style={[styles.recentChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                                    <ThemedText style={styles.recentChipText}>{customer.name}</ThemedText>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}
            </View>

            {showDueDatePicker && Platform.OS !== 'ios' && (
                <DateTimePicker
                    value={dueDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                    onChange={(_event, date) => {
                        setShowDueDatePicker(false);
                        if (date) {
                            const next = new Date(date);
                            next.setHours(23, 59, 59, 999);
                            onDueDateChange(next);
                        }
                    }}
                />
            )}
            {showDueDatePicker && Platform.OS === 'ios' && (
                <Modal transparent animationType="fade" onRequestClose={() => setShowDueDatePicker(false)}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowDueDatePicker(false)}>
                        <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]}>
                            <View style={styles.modalHeader}>
                                <ThemedText type="subtitle">Select due date</ThemedText>
                                <Pressable onPress={() => setShowDueDatePicker(false)}>
                                    <ThemedText style={styles.modalDone}>Done</ThemedText>
                                </Pressable>
                            </View>
                            <DateTimePicker
                                value={dueDate}
                                mode="date"
                                display="spinner"
                                minimumDate={new Date()}
                                textColor={theme.text}
                                themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                                onChange={(_event, date) => {
                                    if (date) {
                                        const next = new Date(date);
                                        next.setHours(23, 59, 59, 999);
                                        onDueDateChange(next);
                                    }
                                }}
                            />
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    inputRow: { gap: 6 },
    inputLabel: { fontSize: 12 },
    textInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        fontFamily: 'Sora-Regular',
    },
    inputGroup: {
        marginTop: 16,
        gap: 12,
    },
    contactButton: {
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    contactButtonText: {
        fontSize: 13,
        color: '#0F6A3D',
    },
    dateField: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    dateFieldText: { fontSize: 14 },
    balanceRow: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    balanceLabel: { fontSize: 12 },
    balanceValue: { fontSize: 16 },
    recentBlock: {
        gap: 8,
    },
    recentChip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
    },
    recentChipText: {
        fontSize: 12,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalDone: {
        fontSize: 14,
        color: '#0F6A3D',
    },
});
