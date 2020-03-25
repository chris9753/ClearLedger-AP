import React, { Fragment, useMemo, useRef, useState, useEffect, useLayoutEffect, useReducer } from 'react';
import { Image, SafeAreaView, StyleSheet, View, ViewStyle, Platform, StatusBar, Animated, PanResponder, Dimensions, Text, UIManager, LayoutAnimation } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import theme from '../theme';
import { useCountRenders } from '../util/performance';

interface Props {
    items: any[]
}

const SCREEN_WIDTH = Dimensions.get('screen').width
function SwipeableCard({ items }: Props) {
    const [currentIndex, setCurrentIndex] = useState(items.length - 1)
    useCountRenders()
    const position = useRef(new Animated.ValueXY())
    // Card Released

  
    useLayoutEffect(() => {
        if(currentIndex != items.length - 1) {
            console.log("position changing back...",currentIndex)
            position.current.setValue({ x: 0, y: 0 })
        }
        // setTimeout(()=> {
        //     console.log("changing index")
        //     setCurrentIndex(c => c - 1)
        // },5000)
    },[currentIndex])

   
   const onSwipeComplete = () => {
       console.log("swipe complete")
    UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
    LayoutAnimation.spring();
    setCurrentIndex(currentIndex - 1)
   }
    // ANIMATION DEFINTIONS
    const rotate = useRef(position.current.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: ['-10deg', '0deg', '10deg'],
        extrapolate: 'clamp'
    }))
   const likeOpacity = useRef(position.current.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp'
     }))
     const nopeOpacity = useRef(position.current.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: [1, 0, 0],
        extrapolate: 'clamp'
     }))
     const nextCardOpacity = useRef(position.current.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: [1, 0, 1],
        extrapolate: 'clamp'
     }))
     const nextCardScale = useRef(position.current.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: [1, 0.8, 1],
        extrapolate: 'clamp'
     }))
    const rotateAndTranslate = useRef({
        transform: [{
            rotate: rotate.current
        },
        ...position.current.getTranslateTransform()
        ]
    })
    const panResponder = useMemo( () => PanResponder.create({
        onStartShouldSetPanResponder: (evt: any, gestureState: any) => true,
        onPanResponderMove: (evt, gestureState) => {
            position.current.setValue({ x: gestureState.dx, y: gestureState.dy });
        },
        onPanResponderRelease: (evt, gestureState) => {
            if (gestureState.dx > 120) {
                  
              
                Animated.spring(position.current, {
                  toValue: { x: SCREEN_WIDTH + 100, y: gestureState.dy},
                  restSpeedThreshold: 1000, restDisplacementThreshold: 40
                }).start(onSwipeComplete)
                
              } else if (gestureState.dx < -120) {
            
              
                Animated.spring(position.current, {
                  toValue: { x: -SCREEN_WIDTH - 100, y: gestureState.dy },
                  restSpeedThreshold: 1000, restDisplacementThreshold: 40
                }).start(onSwipeComplete)

              } else {
                Animated.spring(position.current, {
                    toValue: { x: 0, y: 0 },
                    friction: 4
                    }).start()
             
              }
        }
    }),[currentIndex])

    return <Fragment> 
        { items.map((item: any, i: number) => {
            if (i > currentIndex) {
                // NO MORE CARDS IN STACK.
                return null;
            } else if (i == currentIndex) {
                // CURRENT CARD AT TOP OF STACK.
                return <Animated.View
                    {...panResponder.panHandlers}
                    key={i}
                    style={[styles.stage, rotateAndTranslate.current, { top:5}]}>
                    {/* LABELS */}
                    <Animated.View
                        style={{
                            opacity:likeOpacity.current,
                            transform: [{ rotate: "-30deg" }],
                            position: "absolute",
                            top: 50,
                            left: 40,
                            zIndex: 1000
                        }}
                    >
                        <Text
                            style={{
                                // borderWidth: 1,
                                // borderColor: "green",
                                color: theme.colors.light.primary,
                                fontFamily:'Montserrat',
                                fontSize: 32,
                                fontWeight: "800",
                                padding: 10
                            }}
                        >
                            LIKE
                             </Text>
                    </Animated.View>
                    <Animated.View
                        style={{
                            opacity:nopeOpacity.current,
                            transform: [{ rotate: "30deg" }],
                            position: "absolute",
                            top: 50,
                            right: 40,
                            zIndex: 1000
                        }}
                    >
                        <Text
                            style={{
                                fontFamily:'Montserrat',
                                color: theme.colors.light.secondary,
                                fontSize: 32,
                                fontWeight: "800",
                                padding: 10
                            }}
                        >
                            NOPE
                            </Text>
                    </Animated.View>

                    {/* LABELS -- END */}
                    {/* MAIN */}
                    <Image
                        style={styles.image}
                        source={{ uri: item.image }}
                    />

                </Animated.View>
            } else {
                // NEXT CARD IN STACK
                return <Animated.View
                    key={i}
                    style={[styles.stage,{
                        opacity: nextCardOpacity.current,
                         top: 1.5 * (currentIndex + i),
                        transform: [{ scale: nextCardScale.current }]}
                        
                        ]}>

                    <Image
                        style={styles.image}
                        source={{ uri: item.image }}
                    />
                </Animated.View>
            }
        })}
        </Fragment>
}


const styles = StyleSheet.create({
    stage: {
        width: '100%',
        // backgroundColor:'white',
        height: '100%',
        paddingHorizontal: 10,
        position: 'absolute',
        top:0
    },
    image: {
        flex: 1,
        // alignSelf:'stretch',
        height: undefined,
        width: undefined,
        borderRadius: 20,
        resizeMode: 'cover'
    }
})

export default  SwipeableCard;