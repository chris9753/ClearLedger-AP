import React from 'react'
import { Text, View,Image,TouchableOpacity,StyleSheet } from 'react-native'
import {colors} from '../res/style/colors'
import {fonts} from '../res/style/fonts'
import {fontSizes} from '../res/style/fontSize'
import posed from 'react-native-pose'
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons'

const Item = posed.View({
  enter: { 
    x: 0, opacity: 1,delay:400,
    transition : {
      type : 'spring',
      useNativeDriver : true
    }

   },
  exit: { x: 300, opacity: 0 }
})

const ProfileStatus = ({uri,oneStatus,name="Your Status",status=false,navigation,hidden=false,onChat}) => {
 
 
    return (
     <Item>
      <TouchableOpacity onPress={ !status ? onChat : () =>{}} activeOpacity={.8} style={styles.profileWrapper}>
        <View style={[styles.profileStatus,oneStatus && {borderStyle:'solid'},hidden && {borderColor:'gold'}]}>  
          <View style={[styles.img,{backgroundColor:colors.lightGrey}]}>
           {hidden ? <Image style={styles.img} source={{uri}} blurRadius={9}/> : <Image style={styles.img} source={{uri}}/>}
          </View>
        { status ? <View style={styles.iconWrapper}>
            <MaterialIcon name="plus-circle" size={25} color={colors.primary}/>
            </View> : <View/>}
        </View>
        <Text style={styles.statusName}>{name}</Text>       
      </TouchableOpacity> 
     </Item> 
    )
}

const styles = StyleSheet.create({
    profileWrapper : {
        paddingHorizontal : 10,
        paddingTop : 20,
        paddingBottom : 10
    },
    profileStatus : {
        width : 70,
        height : 70,
        borderRadius : 70/2,
        backgroundColor : colors.white,
        justifyContent : 'center',
        alignItems : 'center',
        borderWidth : 2,
        borderColor : colors.primary,
        borderStyle : 'dashed',
        alignSelf : 'center'
    },
    img : {
        width : 60,
        height:60,
        borderRadius:60/2,
    },
    statusName : {
        textAlign : 'center',
        marginTop : 10,
        fontFamily : fonts.Medium,
        color :colors.black,
        fontSize : fontSizes.small
    },
    iconWrapper : {
        backgroundColor:colors.white,
        position:'absolute',
        bottom:-4,
        right:0,
        borderColor:colors.white,
        width:25,
        height:25,
        borderRadius:25/2,
        justifyContent:'center',
        alignItems:'center'
     },
})

export default ProfileStatus