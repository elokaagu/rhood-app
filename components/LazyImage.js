import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LazyImage = ({ 
  source, 
  style, 
  placeholder = null,
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
  };

  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }

    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons 
          name="musical-notes-outline" 
          size={24} 
          color="hsl(0, 0%, 30%)" 
        />
      </View>
    );
  };

  if (hasError) {
    return renderPlaceholder();
  }

  return (
    <Image
      source={source}
      style={style}
      onError={handleError}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'hsl(0, 0%, 15%)',
  },
});

export default LazyImage;
