import { Animated } from 'react-native';
const { add, multiply } = Animated;
function conditional(
  condition: Animated.AnimatedInterpolation,
  main: Animated.AnimatedInterpolation,
  fallback: Animated.AnimatedInterpolation
) {
  // To implement this behavior, we multiply the main node with the condition.
  // So if condition is 0, result will be 0, and if condition is 1, result will be main node.
  // Then we multiple reverse of the condition (0 if condition is 1) with the fallback.
  // So if condition is 0, result will be fallback node, and if condition is 1, result will be 0,
  // This way, one of them will always be 0, and other one will be the value we need.
  // In the end we add them both together, 0 + value we need = value we need
  return add(
    multiply(condition, main),
    multiply(
      condition.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
      fallback
    )
  );
    }
export const forFade = ({closing, current, index, insets, inverted, next, layouts, swiping}:any) => {
 
  const progress = add(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        })
      : 0
  );

  const opacity = progress.interpolate({
    inputRange: [0, 0.8, 1, 1.2, 2],
    outputRange: [0, 0.9, 1, 0.9, 0],
  });

  const scale = conditional(
    closing,
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
      extrapolate: 'clamp',
    }),
    progress.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0.85, 1, 1.1],
    })
  );

  return {
    containerStyle: {
      opacity,
      transform: [{ scale }],
    },
  }
}