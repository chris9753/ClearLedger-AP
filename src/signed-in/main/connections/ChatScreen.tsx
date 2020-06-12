import React,{useState,useEffect} from 'react'
import { Text, View,StyleSheet,TextInput,Image,ScrollView,TouchableOpacity,Keyboard } from 'react-native'
import {colors} from './res/style/colors'
import {fontSizes} from './res/style/fontSize'
import {fonts} from './res/style/fonts'
import {OnlineOffline} from './Shared/Index'
import StatusBar from './Shared/StatusBar'
import Fontisto from 'react-native-vector-icons/Fontisto'
import {Icon,MaterialIcon} from './Shared/Index'
import {chatDetails} from "./res/data/data"
import {MoneyChat,GalleryChat} from './ChatComponents/ChatType'
import posed,{Transition} from 'react-native-pose';
import {moderateScale} from './res/style/scalingUnit'
import { NavigationParams, SafeAreaView } from 'react-navigation'
import Hero from '../../../components/Hero';
import { useProfile, useChats, useConnections } from '../../../util/helpers'
import { message } from '../../../entities/chats/model'
import { Profile } from '../../../entities/profiles/model'
import { ChatService } from '../../../entities/chats/service'
import moment from 'moment'
const attachmentIcons = [
  {
    id : 1,
    name : 'Document',
    iconName : 'document',
    colorCode : colors.documentIcon
  },
  {
    id : 2,
    name : 'Payment',
    iconName : 'rupee',
    colorCode : colors.paymentIcon
  },
  {
    id : 3,
    name : 'Gallery',
    iconName : 'gallery',
    colorCode : colors.galleryIcon
  },
  {
    id : 4,
    name : 'Audio',
    iconName : 'music',
    colorCode : colors.musicIcon
  },
  {
    id : 5,
    name : 'Location',
    iconName : 'location',
    colorCode : colors.locationIcon
  },
  {
    id : 6,
    name : 'Profile',
    iconName : 'profile',
    colorCode : colors.profileIcon
  },
]


const config = {
  enter : {
    opacity :1,
    y :0,
    scale:1,
    staggerChildren: 60,
    delayChildren: 100,
  },
  exit : {
    opacity : 0,
    y :200,
    scale : 0,
    delay : 100
  }
}

const attachmentIconConfig = {
  enter : {
    opacity :1,
    scale :1,
  },
  exit : {
    opacity : 0,
    scale : 0
  }
}

const AttachmentView = posed.View(config)
const AttachmentIcon = posed.View(attachmentIconConfig)

interface Props {
  route: any;
  navigation: NavigationParams;
}


const ChatScreen = ({route, navigation}:Props) => {


   const [messages, setMessages] = useState([]) as any
   const [typeMessage, setMessage] = useState('')
   const [isAttachmentContentShow, setAttachmentContentShow] = useState(false)
   const [keyboardHeight,setKeyboardHeight] = useState(0)
   const [isKeyboardShow,setKeyboardShow] = useState(false)
   const [otherUserProfile,setOtherUserProfile] = useState(null)
   const myProfile = useProfile()
    const chats = useChats()
   const chatType = (isSend: boolean,text: string) =>{   
     
         
  
           return <Text style={isSend ? styles.sentText : styles.receivedText}>{text}</Text>
     
   }

   const onSend = async () => {
    const {id} = route.params
     if(typeMessage.length !== 0) {
       const chatService = new ChatService([],chats!)
  
      setMessage("")
      await chatService.sendMessage(id,typeMessage)
     
     }
   }



    useEffect(() => {
      let keyboardDidShowSub = Keyboard.addListener(
        "keyboardDidShow",
        keyboardDidShow
      );
      let keyboardDidHideSub = Keyboard.addListener(
        "keyboardDidHide", //keyboardWillHide
        keyboardDidHide
      );

      return ()=>{
        keyboardDidShowSub.remove();
        keyboardDidHideSub.remove();
      }
    })

    useEffect(() => {
      if(route.params.id && route.params.profile){
        const otherUserProfile = route.params.profile
        setOtherUserProfile(otherUserProfile)
        
      }
      if(chats){
        const chatService = new ChatService([],chats!)
        setMessages(chatService.getMessagesFor(route.params.id))
      }
      
    },[route,myProfile,chats])

    const keyboardDidShow = (event: any) => {
       setAttachmentContentShow(false)
       setKeyboardShow(true)
       setKeyboardHeight(event.endCoordinates.screenY)
    };
    
    const keyboardDidHide = (event: any) => {
      setKeyboardShow(false)
    };

    const onCamera = () => {
      // navigation.navigate('CameraScreen',{
      //   uri
      // })
    }

    const onProfile = () => {

      // navigation.navigate('ContactProfileScreen', {
      //   id,
      //   uri,
      //   username,
      //   status
      // })
    }

    const onCall = () => {
      // navigation.navigate('Calling',{
      //   uri,
      //   name : username
      // })
    }

    return (
     
      <SafeAreaView  style={{flex:1,marginBottom:10}} onStartShouldSetResponder={
        () =>  {
          setAttachmentContentShow(false)
          return false
        }
        }>
        <StatusBar backgroundColor={'transparent'} barStyle="dark-content"  />
        {otherUserProfile ? <View style={styles.headerContainer}>
         <View style={styles.firstRow}>
          <MaterialIcon onPress={() => {navigation.goBack()}} name="arrow-left" size={24} color={colors.primary} />
           <TouchableOpacity activeOpacity={.8} onPress={onProfile} style={styles.userDetail}>
              <View style={[styles.img,{backgroundColor:colors.lightGrey}]}>
               <Image style={styles.img} source={{uri:(otherUserProfile! as Profile).images![0].uri}}/>
              </View>
              {/* <OnlineOffline userWrapperStyle={styles.userWrapperStyle} userContainerStyle={styles.userContainerStyle} isOnline={status} /> */}
              <Text style={styles.searchText}>{(otherUserProfile! as Profile).name}</Text>
          </TouchableOpacity>
         </View>
         <View style={styles.secondRow}>
          <MaterialIcon name="video" size={24} color={colors.primary} />
          <MaterialIcon onPress={onCall} name="phone" size={24} color={colors.primary} />
          <MaterialIcon name="dots-horizontal-circle" size={24} color={colors.primary} />
         </View>
        </View>
        : null}
        <ScrollView style={styles.inverted} contentContainerStyle={styles.content}>
          {
            (messages as message[]).sort((a, b) => new Date(String(b.at.toDate())).getTime() - new Date(String(a.at.toDate())).getTime()).map((message)=>{
                const chatService = new ChatService([],chats!)
              const isSend =  chatService.sentByMe(message)
              const messageType = false
              
              return(
                <View key={message.text} style={[isSend ? styles.sentContainer : styles.receivedContainer,styles.inverted]}>
                 <View style={{  paddingVertical: 4,paddingHorizontal: 6,}}>
                  <View 
                   style={[[styles.bubble,messageType && { paddingVertical: 0,
                    paddingHorizontal: 0,}],isSend ? [styles.sent,styles.sendBorderRadiusStyle,messageType && {backgroundColor:'transparent',padding:0}] : [styles.received,styles.receivedBorderRadiusStyle,messageType && {backgroundColor:'transparent'}]]}>
                   {
                     chatType(isSend,message.text)
                   }
                   </View>
                   <View style={[styles.timeContainer,isSend && {justifyContent:'flex-end'}]}>
                   <Text style={styles.timeText}>{moment(new Date(String(message.at.toDate()))).fromNow() }</Text>
               
                     </View>
                 </View>
                </View>
              )
            })
          }
        </ScrollView>
        <Transition>
        { isAttachmentContentShow ? <AttachmentView key="attach" style={[styles.attachmentContentWrapper, isKeyboardShow && {transform : [{ translateY : keyboardHeight }],zIndex : 99999}]}>
            { attachmentIcons.map((item) => (
              <AttachmentIcon key={item.id} style={styles.iconContainer}>
               <View style={[styles.iconWrapper,{borderColor:item.colorCode}]}>
                <Icon name={item.iconName} color={item.colorCode} size={moderateScale(22)}/>
               </View>
               <Text style={styles.iconText}>{item.name}</Text>
              </AttachmentIcon>
            )) }
          </AttachmentView>
          : <View key="unique">
            </View>
          }
        </Transition>
        <View style={styles.writeMessageContainer}>
         <View style={styles.firstCol}>
          <Fontisto style={{marginTop : 6}} name="smiley" size={20} color={colors.darkGrey}/>
          <TextInput 
           style={styles.input}
           textAlignVertical={'center'}
           placeholder="Type your message"
           underlineColorAndroid="transparent"
           multiline={true}
           onFocus={() => isAttachmentContentShow && setAttachmentContentShow(false)}
           onChangeText={(text) => {setMessage(text)}}
           value={typeMessage}
          />
         </View>
         <View style={styles.secondCol}>

              <MaterialIcon onPress={onSend} iconStyle={{marginLeft:6}} style={styles.sendIconWrapper} name="send" size={22} color={colors.white}/>
            
         </View>
        </View>
      </SafeAreaView>

    )
}

const styles = StyleSheet.create({
    container : {
        flex:1,
        backgroundColor : colors.white
    },
    headerContainer : {
        flexDirection : 'row',
        alignItems : 'center',
        paddingHorizontal : 14,
        paddingVertical : 10,
        justifyContent : 'space-between',
        borderBottomWidth : 1,
        borderBottomColor : colors.lightGrey
      },
    userDetail : {
        marginLeft : 10,
        flexDirection: 'row',
        alignItems : 'center',
        justifyContent : 'flex-start',
        flex : 1,
        paddingRight : 8,
        paddingVertical : 2,
    },
    searchText : {
        fontSize : fontSizes.medium,
        color : colors.black,
        fontFamily : fonts.Medium,
        marginLeft : 12
      },
    firstRow : {
        flexDirection : 'row',
        justifyContent : 'flex-start',
        alignItems : 'center',
        width : '60%',
      },
    secondRow : {
        flexDirection : 'row',
        width : '40%',
        justifyContent : 'space-around',
        alignItems : 'center'
      },
    img : {
        width : 35,
        height:35,
        borderRadius:35/2,
   }, 
   userWrapperStyle : {
        bottom:-2,
        left:14,
        width:8,
        height:8,
        borderRadius:8/2,
   },
   userContainerStyle : {
        width:6,
        height:6,
        borderRadius:6/2,
   },
   inverted : {
       transform: [{ scaleY: -1 }],
   },
   content : {
       padding : 10
   },
  receivedContainer: {
       flexDirection: 'row',
  },
  sentContainer: {
      flexDirection: 'row-reverse',
      
  }, 
  bubble: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems : 'center',
      justifyContent : 'center'
  },
  sent: {
      backgroundColor: colors.primary,
  },
  received: {
      backgroundColor: colors.lightGrey,
  },
  sentText: {
     color: colors.white,
     fontSize : fontSizes.small,
     fontFamily : fonts.Regular
  },
  receivedText: {
     color: colors.black,
     fontSize : fontSizes.small,
     fontFamily : fonts.Regular
  },
  sendBorderRadiusStyle : {
    borderTopStartRadius : 6,
    borderTopRightRadius : 6,
    borderBottomEndRadius : 6
  },
  receivedBorderRadiusStyle : {
    borderTopStartRadius : 6,
    borderBottomRightRadius : 6,
    borderBottomStartRadius : 6
  },
  input : {
    flex:1,
    height: 50,
    paddingVertical: 10,
    marginLeft : 10,
    paddingRight:5,
    paddingTop:15,
    fontSize : fontSizes.medium,
  },
  writeMessageContainer : {
    flexDirection : 'row',
    paddingBottom : 6,
    justifyContent:'center',
    borderTopWidth : .8,
    borderTopColor : '#E7E7E7'
  },
  firstCol : {
    flexDirection : 'row',
    alignItems : 'center',
    paddingHorizontal: 10,
    justifyContent:'space-between',
    width : '80%'
  },
  secondCol : {
    flexDirection : 'row',
    // paddingHorizontal: 4,
    justifyContent : 'space-between',
    alignItems : 'center',
    width :'10%',
    // paddingHorizontal: 10,
    
  },
  timeContainer : {
    paddingVertical : 2,
    paddingHorizontal : 4,
    flexDirection : 'row',
  },
  timeText : {
    fontSize : fontSizes.tinySmall,
    fontFamily : fonts.Regular,
    color : colors.darkGrey
  },
  checkMarkIcon : {
    marginLeft : 4,
    alignSelf : 'flex-start',
    padding:0
  },
  attachIcon : {
    transform : [{rotate : '315deg'}]
  },
  sendIconWrapper : {
    padding:1,
    width : 40,
    height:40,
    borderRadius:40/2,
    backgroundColor:colors.primary,
    justifyContent:'center',
    alignItems: 'center'
  },
  iconContainer : {
    alignItems : 'center',
    marginHorizontal : 20,
    marginVertical : 10
  },
  attachmentContentWrapper : {
    position : 'absolute',
    bottom : 56,
    paddingVertical : 10,
    paddingHorizontal : 20,
    margin : 10,
    backgroundColor : colors.white,
    flexWrap : 'wrap',
    flexDirection : 'row',
    justifyContent : 'space-evenly',
    borderWidth : .8,
    borderColor : '#E7E7E7',
    borderRadius : 10
  },
  iconWrapper : {
    width : moderateScale(55),
    height : moderateScale(55),
    borderRadius : moderateScale(55)/2,
    borderWidth : .8,
    justifyContent : 'center',
    alignItems : 'center'
  },
  iconText : {
    fontSize : 12,
    color : colors.black,
    marginTop : 10,
    fontFamily : fonts.Regular
  },
  iconContentContainer : {
    padding : 6
  },
  icon : {
    marginHorizontal: 4
  }
})

export default ChatScreen