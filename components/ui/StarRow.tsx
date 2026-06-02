// components/ui/StarRow.tsx
import { Text } from 'react-native';
import { Colors } from '../../constants/theme';

interface StarRowProps {
  /** Número de estrellas llenas (0–5) */
  count: number;
  size?: number;
}

export function StarRow({ count = 0, size = 14 }: StarRowProps) {
  const llenas = Math.max(0, Math.min(5, count));
  return (
    <Text
      style={{ fontSize: size, color: Colors.gold, letterSpacing: 2 }}
      accessibilityLabel={`${llenas} de 5 estrellas`}
    >
      {'★'.repeat(llenas)}
      <Text style={{ color: '#DDD' }}>{'★'.repeat(5 - llenas)}</Text>
    </Text>
  );
}
