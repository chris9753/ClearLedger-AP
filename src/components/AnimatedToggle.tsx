import React, { Fragment, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle, Animated } from 'react-native';
import { TouchableOpacity, TapGestureHandler} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useCountRenders } from '../util/performance';

interface Props {
    optionSelected: (selectedOption:selectedOptions) => void;
}

export enum selectedOptions {
    none,
    option1,
    option2
}
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
function AnimatedToggle({optionSelected }: Props) {
    let optionOneColor = useRef('#3498db').current
    let optionTwoColor = useRef('#9b59b6').current
    const stage1 = useRef(new Animated.Value(0)).current
    const stage2 = useRef(new Animated.Value(0)).current
    const option1Scale = useRef(stage1.interpolate({ inputRange: [0,.5, 1], outputRange: [1, 1.25,1] ,extrapolate:'clamp'})).current
    const option2Scale = useRef(stage2.interpolate({ inputRange: [0,.5, 1], outputRange: [1, 1.25,1],extrapolate:'clamp' })).current
    const [selected, setSelected] = useState(selectedOptions.none)
    useCountRenders("animatedToggle")
    useEffect(()=> {
        // animation1.stop()
        // animation2.stop()
       
        if(selected != selectedOptions.none) {
            
            console.log("firing",stage1,stage2)
            // stage2.setValue(0)
            // stage2.setValue(0)
            optionSelected(selected)
        }
    },[selected])
    // useEffect(()=>{
    //     setInterval(()=> {
    //         setSelected(selectedOptions.option1)
    //     },10000)
    // },[])
    let animation1 = Animated.spring(stage1, {
        toValue: 1,
        // easing: Easing.ease,
        // tension:.04,
        restSpeedThreshold: 100,
        // // delay:1000,
        // restDisplacementThreshold:100,
        useNativeDriver:true
    })
    let animation2 = Animated.spring(stage2, {
        toValue: 1,
        // duration: 1000,
        // easing: Easing.ease,
        // tension:.04,
        restSpeedThreshold: 100,
        useNativeDriver:true
        // delay:1000,
        // restDisplacementThreshold:1
    })
    const iconColor = (selected: selectedOptions, current: selectedOptions) => {

        if (selected == current) {
            return 'white'
        } 
        if (current == selectedOptions.option1) return optionOneColor
        if (current == selectedOptions.option2) return optionTwoColor
       
    }
    const backgroundColor = (selected: selectedOptions, current: selectedOptions) => {

        if (selected == current) {
            if (current == selectedOptions.option1) return optionOneColor
            if (current == selectedOptions.option2) return optionTwoColor
        } 
        return 'white'
       
       
    }
    const option1Handler = () =>  {
        if(selected !== selectedOptions.option1) {
            stage1.setValue(0)
            animation1.start()
             setSelected(selectedOptions.option1); 
        }
      
        }

        const option2Handler = () =>  {
            if(selected !== selectedOptions.option2) {
                stage2.setValue(0)
                animation2.start()
                setSelected(selectedOptions.option2); 
            }
            }

    return <View style={styles.row}>
         <TapGestureHandler onHandlerStateChange={option1Handler}>
         <Animated.View  style={[styles.option,{backgroundColor:backgroundColor(selected,selectedOptions.option1)},{transform: [{ scale: option1Scale }]}]}>
              
              <Icon size={34} name="mars" color={iconColor(selected, selectedOptions.option1)} />
          </Animated.View >
         </TapGestureHandler>
            
         
         <TapGestureHandler onHandlerStateChange={option2Handler}>
         <Animated.View  style={[styles.option,{backgroundColor:backgroundColor(selected,selectedOptions.option2)},{transform: [{ scale: option2Scale }]}]}>
                <Icon size={34} name="venus" color={iconColor(selected,selectedOptions.option2)} />
            </Animated.View >
         </TapGestureHandler>
      
           
        </View>
    

}

const styles = StyleSheet.create({

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        marginVertical: 30
    },
    option: {
        shadowColor: "grey",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.20,
        shadowRadius: 3.84,

        elevation: 2,
        // padding:25,
        // paddingHorizontal:30,
        height: 80,
        width: 80,
        backgroundColor: 'white',
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center'
    }

})


export default AnimatedToggle