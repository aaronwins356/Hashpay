
import React, { useMemo } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles, TypographyStyles } from '../theme/styles';

export interface ModalProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  actionLabel?: string;
  children: React.ReactNode;
}

const createStyles = (colors: ThemeColors, typography: TypographyStyles) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.modalBackdrop,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      ...typography.heading,
      fontSize: 22,
      textAlign: 'center',
      marginBottom: 12,
    },
    content: {
      marginBottom: 24,
    },
  });

export const Modal: React.FC<ModalProps> = ({ visible, title, onClose, actionLabel = 'Close', children }) => {
  const { colors } = useTheme();
  const { typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <RNModal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={event => event.stopPropagation()}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View style={styles.content}>{children}</View>
          <Button label={actionLabel} onPress={onClose} fullWidth />
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

export default Modal;
