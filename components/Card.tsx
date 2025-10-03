import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

export interface CardProps extends ViewProps {
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ bordered = true, style, children, ...rest }) => (
  <View
    style={[
      styles.base,
      bordered && styles.bordered,
      style,
    ]}
    {...rest}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.accent,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
});

export default Card;
