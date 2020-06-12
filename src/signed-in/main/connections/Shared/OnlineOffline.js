import React from 'react'
import { View,StyleSheet } from 'react-native'
import {colors} from '../res/style/colors'

const OnlineOffline = ({isOnline,userWrapperStyle,userContainerStyle = {}}) =>{
  
    return (
      <View style={[styles.userStatusWrapper,userWrapperStyle]}>
        <View style={[styles.userStatusContainer, !isOnline && {backgroundColor:colors.grey},userContainerStyle]}/>
      </View>
    )
}

const styles = StyleSheet.create({
    userStatusWrapper : {
        position:'absolute',
        bottom:4,
        left:34,
        width:12,
        height:12,
        borderRadius:12/2,
        backgroundColor:colors.white,
        justifyContent:'center',
        alignItems:'center'
      },
      userStatusContainer : {
        width:10,
        height:10,
        borderRadius:10/2,
        backgroundColor:colors.primary
      }
})

export default OnlineOffline