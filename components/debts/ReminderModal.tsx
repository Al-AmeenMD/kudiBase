import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
    visible: boolean;
    message: string;
    onChangeMessage: (text: string) => void;
    onClose: () => void;
    onSend: () => void;
};

export function ReminderModal({ visible, message, onChangeMessage, onClose, onSend }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <Modal visible={visible} transparent animationType="fade">
            <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
                    <View style={styles.modalHeader}>
                        <ThemedText type="subtitle">Send reminder</ThemedText>
                        <Pressable onPress={onClose}>
                            <ThemedText style={styles.modalClose}>Close</ThemedText>
                        </Pressable>
                    </View>
                    <TextInput
                        value={message}
                        onChangeText={onChangeMessage}
                        multiline
                        style={[
                            styles.modalInput,
                            { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                        ]}
                    />
                    <Pressable onPress={onSend} style={[styles.modalButton, { backgroundColor: theme.primary }]}>
                        <ThemedText style={styles.modalButtonText}>Send WhatsApp</ThemedText>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
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
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalClose: {
        fontSize: 12,
        color: '#0F6A3D',
    },
    modalInput: {
        minHeight: 120,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 13,
        textAlignVertical: 'top',
    },
    modalButton: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
    },
});
