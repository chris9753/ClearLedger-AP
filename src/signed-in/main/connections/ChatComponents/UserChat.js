import React,{useState,useEffect} from 'react'
import { Text, View ,Image,TouchableOpacity,StyleSheet} from 'react-native'
import {OnlineOffline,SwipeList} from '../Shared/Index'
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import {styles} from '../res/style/CommonStyle/ChatStyle'
import {chatDetails} from '../res/data/data'
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

const UserChat = ({onSelect,userImage,userName,message,sentByMe,onDelete,matchedPlaces = []}) => {
  


    return(
      <Item> 
        <TouchableOpacity onLongPress={onDelete} onPress={onSelect} activeOpacity={.8} style={styles.chatContainer}>
          <View style={[styles.img,styles.imgWrapper]}>
           <Image style={styles.img} source={{uri:userImage}}/>
          </View>
          <View style={styles.chatUserDetailsWrapper}>
            <Text style={styles.chatUserName}>{userName}</Text>
            <View style={styles.chatWrapper}>
             { 
              sentByMe && (<MaterialIcon name="check-all" color={colors.primary} size={18} />)
             }
             <Text style={[styles.chatText,!sentByMe && {marginLeft:0}]}>{message ? message.text : "Start the conversation!"}</Text>
             </View>
          </View>
          <View style={styles.topInfo}>
               {matchedPlaces.map(place => {
                 return <Text key={place} style={styles.chatUserNameTime}>{place}</Text>
               })}
             
             </View>
          <View style={styles.secondRow}>
            <Text style={styles.chatUserNameTime}>{message ? '12:40AM' : ''}</Text>
          </View>
        </TouchableOpacity>
      </Item>
    )
}


export default UserChat