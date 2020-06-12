import React from 'react'
import { StyleSheet, TouchableOpacity,View } from 'react-native'
import icomoonconfig from '../res/icons/selection.json'
import {createIconSetFromIcoMoon} from 'react-native-vector-icons'
const IconContainer = createIconSetFromIcoMoon(icomoonconfig) 
//if want to use custom icon you can export as SVG then upload on IconMoon site
//then you will get selection.json file you can see in icon folder

const Wrapper = (props) => {
    if(props.onPress){
     return ( <TouchableOpacity {...props}>
       {props.children}
      </TouchableOpacity>)
    } else {
      return ( <View {...props}>
       {props.children}
      </View>)
    }
}

const Icon = ({name,color,onPress = () => {},size=24,style = {}}) =>  {
  
    return (
      <Wrapper style={[styles.container,style]} onPress={onPress}>
        <IconContainer name={name} color={color} size={size} />
      </Wrapper>
    )
}

const styles = StyleSheet.create({
    container : {
        padding : 6,
        
    }
})

export default Icon