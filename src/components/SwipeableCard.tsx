import React, { Fragment, useMemo, useRef, useState, useEffect, useLayoutEffect, useReducer, ForwardRefExoticComponent, RefAttributes, useCallback } from 'react';
import { Image, SafeAreaView, StyleSheet, View, ViewStyle, Platform, StatusBar, Animated, PanResponder, Dimensions, Text, UIManager, LayoutAnimation } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import theme from '../theme';
import { useCountRenders } from '../util/performance';
import LinearGradient from 'react-native-linear-gradient';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import ImageGallery from './ImageGallery';
import { Profile } from '../entities/profiles/model';
import layout from '../signed-out/layout';

export type Handle<T> = T extends ForwardRefExoticComponent<RefAttributes<infer T2>> ? T2 : never;
interface Props {
    items: Profile[]
    onComplete: () => void;
    onSwipeUp: (item: Profile) => void;
    onSwipeLeft: (item: any) => void;
    onSwipeRight: (item: Profile) => void;
    // placeholder :() => JSX.Element;
}

const SCREEN_WIDTH = Dimensions.get('screen').width
function SwipeableCard({ items, onComplete, onSwipeUp, onSwipeLeft, onSwipeRight }: Props) {
    const [currentIndex, setCurrentIndex] = useState(items.length - 1)
    useCountRenders("swipeable")
    const position = useRef(new Animated.ValueXY())
    const deltaY = useRef(new Animated.Value(1)).current
    const tappableImageGalleryRef = useRef(null)

    useLayoutEffect(() => {
        // UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
        // LayoutAnimation.linear()
    }, [])
    // Card Released
    useLayoutEffect(() => {


        if (currentIndex != items.length - 1) {
            console.log("position changing back...", currentIndex)
            
        }
        if (currentIndex < 0) {

            onComplete()
        }

    }, [currentIndex])

    // new items came in
    useEffect(() => {

        setCurrentIndex(items.length - 1)
    }, [items])


    const onSwipeComplete = () => {

        console.log("swipe complete")

        position.current.setValue({ x: 0, y: 0 })
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
        outputRange: [1, 0.97, 1],
        extrapolate: 'clamp'
    }))
    const rotateAndTranslate = useRef({
        transform: [{
            rotate: rotate.current
        },
        ...position.current.getTranslateTransform()
        ]
    })
    
    const touchThreshold = 10;
    // const cachedImageGallery = useCallback((item)=>{
    //     console.log("recomputed",item.id)
    //     return <ImageGallery ref={tappableImageGalleryRef} images={item.images} />
    // },[])
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder : () => false,
        onMoveShouldSetPanResponder : (e, gestureState) => {
            const {dx, dy} = gestureState;
    
            return (Math.abs(dx) > touchThreshold) || (Math.abs(dy) > touchThreshold);
        },
        onPanResponderMove: (evt, gestureState) => {
            position.current.setValue({ x: gestureState.dx, y: gestureState.dy });
            if (gestureState.dy < -100) {
                onSwipeUp(items[currentIndex])
            }
            if (Math.abs(gestureState.dx) > touchThreshold || Math.abs(gestureState.dy) > touchThreshold) {
                const ImageGalleryRef = tappableImageGalleryRef.current as any | null
                if (ImageGalleryRef) {
                    ImageGalleryRef.parentGesture.current = true;
                }
                //   moveInProgress.current = true;
            } else {
                const ImageGalleryRef = tappableImageGalleryRef.current as any | null
                if (ImageGalleryRef) {
                    ImageGalleryRef.parentGesture.current = false;
                }
                //   moveInProgress.current = false;
            }
        },
        onPanResponderRelease: (evt, gestureState) => {
           
                const ImageGalleryRef = tappableImageGalleryRef.current as any | null
                if (ImageGalleryRef) {
                    ImageGalleryRef.parentGesture.current = false;
                }
            

            if (gestureState.dx > 120) {


                Animated.timing(position.current, {
                    useNativeDriver: true,
                    toValue: { x: SCREEN_WIDTH + 100, y: gestureState.dy },
                    // restSpeedThreshold: 1000, 
                    duration:25,
                    easing:(e) => 10
                    // restDisplacementThreshold: 40
                }).start(() => {onSwipeComplete(); onSwipeRight(items[currentIndex])})

            } else if (gestureState.dx < -120) {


                Animated.timing(position.current, {
                    useNativeDriver: true,
                    toValue: { x: -SCREEN_WIDTH - 100, y: gestureState.dy },
                    // restSpeedThreshold: 1000, restDisplacementThreshold: 40
                    duration:25,
                    easing:(e) => 10
                }).start(onSwipeComplete)

            } else {
                Animated.spring(position.current, {
                    useNativeDriver: true,
                    toValue: { x: 0, y: 0 },
                    friction: 10
                }).start()

            }
        }
    }), [currentIndex])
    

    return <Fragment>
        {items.map((item: Profile, i: number) => {
            if (i > currentIndex) {
                // past viewed cards in stack
                return null;
            } else if (i == currentIndex) {
                // CURRENT CARD AT TOP OF STACK.
                return <Animated.View
                    {...panResponder.panHandlers}
                    key={item.uid}
                    style={[styles.stage, rotateAndTranslate.current]}>
                    {/* Tappable Gallery Controls */}
                    <View shouldRasterizeIOS style={[styles.stage, {
                        shadowColor: "black",
                        backgroundColor: 'white',

                        shadowOpacity: 0.10,
                        shadowRadius: 4,

                        elevation: 5,
                        shadowOffset: {
                            height: 10,
                            width: 0
                        }
                    }]}>









                        {/* LABELS */}
                        <Animated.View
                            style={{
                                opacity: likeOpacity.current,
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
                                    fontFamily: 'Montserrat',
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
                                opacity: nopeOpacity.current,
                                transform: [{ rotate: "30deg" }],
                                position: "absolute",
                                top: 50,
                                right: 40,
                                zIndex: 1000
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: 'Montserrat',
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
                        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.5)']} style={styles.info}>
                            <View style={layout.column}>
                            <Text style={styles.infoText}>{item.preferredName ? item.preferredName :item.name} , {item.age}</Text>
                            <Text style={[styles.infoText,{marginTop:20,fontSize:16}]}>{item.jobTitle} @ {item.company}</Text>
                            </View>
                          

                        </LinearGradient>

                        <ImageGallery key={item.uid} ref={tappableImageGalleryRef} images={item.images || []} id={item.uid} />
                        {/* {cachedImageGallery(item)} */}
                    </View>
                </Animated.View>
            } else if ((i == (currentIndex - 1))) {
                // NEXT CARD IN STACK
                return <Animated.View
                    key={item.uid}
                    style={[styles.stage, {
                        // opacity: nextCardOpacity.current,
                        //  top: 1.1 * (currentIndex + i),
                        transform: [{ scale: nextCardScale.current }]
                    },
                    { shadowColor: 'transparent' }

                    ]}>
                    <View shouldRasterizeIOS style={[styles.stage, {
                        shadowColor: "black",
                        backgroundColor: 'white',

                        shadowOpacity: 0.10,
                        shadowRadius: 4,

                        elevation: 5,
                        shadowOffset: {
                            height: 10,
                            width: 0
                        }
                    }]}>


                        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.5)']} style={styles.info}>
                            <Text style={styles.infoText}>{item.name}, {item.age}</Text>
                        </LinearGradient>
                        <ImageGallery key={item.uid} ref={tappableImageGalleryRef} images={item.images || []} id={item.uid} />
                        {/* {cachedImageGallery(item)} */}
           
                    </View>
                </Animated.View>
            } else {
                return null
            }
        })}
    </Fragment>
}


const styles = StyleSheet.create({
    info: {
        flex: 1,
        zIndex: 1,
        position: 'absolute',
        bottom: 0,
        flexDirection: 'row',
        height: 200,
        width: '100%',
        paddingTop: 30,
        paddingHorizontal: 20,
        borderRadius: 8,




        // marginTop
    },
    infoText: {
        color: 'white',
        fontFamily: 'Open Sans',
        fontSize: 32
    },
    stage: {
        width: '100%',
        // backgroundColor:'blue',
        height: '100%',
        // flexDirection:'row',
        alignItems: 'center',
        borderRadius: 8,
        // overflow:'hidden',
        // paddingHorizontal: 10,
        position: 'absolute',
        // borderWidth:1,
        // borderColor:'black',
        // borderStyle:'solid'

    },
    image: {
        flex: 1,
        alignSelf: 'stretch',
        height: undefined,
        width: undefined,
        borderRadius: 8,
        // overflow:'hidden',
        resizeMode: 'cover'
    }
})

export default SwipeableCard;