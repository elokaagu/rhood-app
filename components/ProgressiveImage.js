import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const ProgressiveImage = ({
  source,
  style,
  placeholder = "LEHV6nWB2yk8pyo0adR*.7kCMdnj", // Default BlurHash
  contentFit = "cover",
  transition = 300,
  ...props
}) => {
  return (
    <Image
      source={source}
      placeholder={placeholder}
      placeholderContentFit="cover"
      contentFit={contentFit}
      transition={transition}
      cachePolicy="disk"
      style={[styles.image, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    flex: 1,
  },
});

export default ProgressiveImage;
