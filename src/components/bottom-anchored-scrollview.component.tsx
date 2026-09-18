import React, { useRef, useCallback } from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

type Props = {
  text: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  enabled?: boolean;
};

export default function BottomAnchoredScrollView({
  text,
  style,
  contentStyle,
  textStyle,
  enabled = true,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const isNearBottom = useRef(true);

  const handleContentSizeChange = useCallback(() => {
    if (isNearBottom.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      style={style}
      contentContainerStyle={[styles.content, contentStyle]}
      scrollEventThrottle={16}
      onContentSizeChange={enabled ? handleContentSizeChange : undefined}
    >
      <Text style={textStyle}>{text}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'flex-end',
  },
});
