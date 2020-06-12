import React from 'react'
import { Text, View ,Image} from 'react-native'
import {styles} from '../res/style/CommonStyle/ChatStyle'
import {OnlineOffline} from '../Shared/Index'
import MaterialIcon from '../Shared/MaterialIcon'
import {colors} from '../res/style/colors'
import posed from 'react-native-pose'

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

const ContactList = ({uri,userName,status="At Work",isOnline,showCallIcon,navigation}) => {
  
    if (status.length > 20) {
      status = status.slice(0, 20)+'...'  
    }

    onCall = () => {
      navigation.navigate('Calling',{
        uri,
        name : userName
      })
    }

    return(
      <Item activeOpacity={.8} style={styles.chatContainer}> 
        <View style={[styles.img,styles.imgWrapper]}>
           <Image style={styles.img} source={{uri}}/>
        </View>
        <OnlineOffline isOnline={isOnline} />
        <View style={styles.chatUserDetailsWrapper}>
          <Text style={styles.chatUserName}>{userName}</Text>
          <Text style={styles.chatText}>{status}</Text>
        </View>
        {showCallIcon && (
         <View style={[styles.secondRow,{alignItems:'center'}]}>
          <MaterialIcon onPress={onCall} name="phone" style={[styles.icon,{padding:0}]} size={24} color={colors.primary}/>
          <MaterialIcon name="video" style={[styles.icon,{padding:0}]} size={24} color={colors.primary}/>
         </View>)
        }
      </Item>
    )
}


export default ContactList