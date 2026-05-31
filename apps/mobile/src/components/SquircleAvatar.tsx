import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface SquircleAvatarProps {
  uri: string;
  size?: number;
  hasStory?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

export const SquircleAvatar = ({ 
  uri, 
  size = 48, 
  hasStory = false,
  isOnline = false,
  style 
}: SquircleAvatarProps) => {
  const borderRadius = size * 0.32; // Approximation of squircle

  return (
    <View style={[styles.container, style]}>
      {hasStory && (
        <View style={[styles.storyRing, { 
          width: size + 6, 
          height: size + 6, 
          borderRadius: (size + 6) * 0.32 
        }]} />
      )}
      
      <Image 
        source={{ uri }} 
        style={[styles.image, { 
          width: size, 
          height: size, 
          borderRadius: borderRadius,
        }]} 
      />
      
      {isOnline && (
        <View style={styles.onlineBadgeContainer}>
          <View style={styles.onlineBadge} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
  },
  storyRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FEA619', // Coral/Orange accent from GUFF
  },
  onlineBadgeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 8,
    padding: 2,
  },
  onlineBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.statusOnline,
  },
});
