import React from 'react'
import { StyleSheet, TouchableOpacity,View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

const Wrapper = (props) => {
  if(props.onPress){
   return ( <TouchableOpacity activeOpacity={.8} {...props}>
     {props.children}
    </TouchableOpacity>)
  } else {
    return ( <View {...props}>
     {props.children}
    </View>)
  }
}

const MaterialIcon = ({name,color,onPress = () => {},size=22,style = {},iconStyle = {}}) =>  {
  
    return (
      <Wrapper style={[styles.container,style]} onPress={onPress}>
        <Icon name={name} color={color} style={iconStyle} size={size} />
      </Wrapper>
    )
}

const styles = StyleSheet.create({
    container : {
        padding : 4,    
    }
})

export default MaterialIcon