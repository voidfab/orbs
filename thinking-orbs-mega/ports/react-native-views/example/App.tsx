import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  ThinkingOrb,
  type OrbState
} from 'react-native-thinking-orbs';

const STATES: OrbState[] = [
  'working',
  'searching',
  'solving',
  'listening',
  'composing',
  'shaping'
];

export default function App() {
  const [stateIndex, setStateIndex] = useState(0);
  const state = STATES[stateIndex];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <ThinkingOrb state={state} size={148} theme="dark" />
        <Text style={styles.title}>{state}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            setStateIndex((current) => (current + 1) % STATES.length)
          }
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>Next state</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#09090b',
    flex: 1,
    justifyContent: 'center'
  },
  card: {
    alignItems: 'center',
    gap: 24
  },
  title: {
    color: '#fafafa',
    fontSize: 24,
    fontWeight: '700'
  },
  button: {
    backgroundColor: '#fafafa',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  buttonLabel: {
    color: '#09090b',
    fontSize: 15,
    fontWeight: '700'
  }
});
