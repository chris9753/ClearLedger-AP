import React, { Component, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Image, Animated, Easing } from 'react-native';
import { NavigationParams } from 'react-navigation';



function Splash() {
    const stage = useRef(new Animated.Value(0)).current
    const position = useRef(new Animated.Value(0)).current
    const visibility = useRef(new Animated.Value(0)).current
    
    const imageScale = stage.interpolate({ inputRange: [0, 1], outputRange: [1, .385] })
    const imageLogoPosition = position.interpolate({ inputRange: [0, 1], outputRange: [0, -270] })
    const textLogoPosition = position.interpolate({ inputRange: [0, 1], outputRange: [-50, 30] })
    const imageTextVisibility = visibility.interpolate({ inputRange: [0, 1], outputRange: [0, 1],extrapolate:'clamp' })
    let animation = Animated.spring(stage, {
        toValue: 1,
        // duration: 1000,
        // easing: Easing.ease,
        // tension:.04,
        restSpeedThreshold: 100,
        // delay:1000,
        // restDisplacementThreshold:1
    })
    let slideLeftAndOpacifyAnimation = Animated.parallel([
        Animated.timing(position, {
            delay:1000,
            toValue: 1,
            duration: 500
        })
        , Animated.timing(visibility, {
            delay:1000,
            toValue: 1,
            duration: 500
        })
    ]
    )
    useEffect(() => {

        setTimeout(x => {
            Animated.sequence([animation, slideLeftAndOpacifyAnimation]).start()
        }, 200)

    }, [])

    return (
        <Animated.View style={styles.container}>
            <Animated.Image style={{ width: 150, zIndex: 1, resizeMode: 'contain', transform: [{ scale: imageScale }, { translateX: imageLogoPosition }] }} source={require('../assets/images/logo_image.png')} />
            <Animated.Image style={{ width: 175, overflow: 'hidden', opacity:imageTextVisibility,resizeMode: 'contain', position: 'absolute', transform: [{ translateX: textLogoPosition }] }} source={require('../assets/images/logo_text.png')} />
        </Animated.View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
})
export default Splash