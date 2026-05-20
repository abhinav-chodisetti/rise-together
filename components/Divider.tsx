import { Text, View } from 'react-native';

import { cn } from './cn';

export interface DividerProps {
  children?: React.ReactNode;
  className?: string;
}

export function Divider({ children, className }: DividerProps) {
  if (!children) {
    return <View className={cn('h-px w-full bg-divider', className)} />;
  }
  return (
    <View className={cn('flex-row items-center', className)}>
      <View className="h-px flex-1 bg-divider" />
      <Text className="mx-4 text-body-medium font-secondary text-secondary-text">{children}</Text>
      <View className="h-px flex-1 bg-divider" />
    </View>
  );
}
