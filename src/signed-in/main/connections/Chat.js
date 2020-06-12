import React,{useState,useEffect} from 'react'
import { Text, View,StyleSheet,ScrollView,StatusBar,TouchableOpacity,Modal,InteractionManager } from 'react-native'
import {colors} from './res/style/colors'
import {fontSizes} from './res/style/fontSize'
import {fonts} from './res/style/fonts'
import {withNavigation} from 'react-navigation'
import ProfileStatus from './ChatComponents/ProfileStatus'
import UserChat from './ChatComponents/UserChat'
import posed,{Transition} from 'react-native-pose'
import { useProfile, useConnections, useChats } from '../../../util/helpers';
import {getProfile} from '../../../util/firebase'
import { ConnectionService } from '../../../entities/connections/service';
import { ChatService } from '../../../entities/chats/service'
const Overlay = posed.ScrollView({
  enter: { x: 0,staggerChildren: 40,delayChildren: 10, 
    transition : {
      type : 'spring',
      useNativeDriver : true
    }
  },
  exit: { x:0 }
});

const DeleteButtonView = posed.View({
  enter: { y: 0,opacity:1,
    transition : {
      type : 'spring',
      useNativeDriver : true
    }
  },
  exit: { y:380,opacity:0 }
});


const Chat = (props) => {
  
    const { navigation } = props;
      
    const [modalVisible,setModalVisible] = useState(false)
    const [name,setName] = useState('')
    const [chats,setChats] = useState([]) 
    const [currentSelectedUser,setCurrentSelectedUser] = useState('')
    const [userConnectionProfiles,setUserConnectionProfiles] = useState([])
    const [potentialConnectionProfiles,setPotentialConnectionProfiles] = useState([])
    const profile = useProfile()
    const connections = useConnections()
    const chatsContext = useChats()
    const [isDataLoad,setIsDataLoad] = useState(false)
  
    const onUserChat = (id,profile) =>{
      navigation.navigate('ChatScreen',{
        id,
        profile
      })
    }

    useEffect(() => {
      // react native load data when we click on button and we see freeze button
      //InteractionManger helps to load data after interacting screen..
      if(profile && connections){
        InteractionManager.runAfterInteractions(async () => {
          const { chatUsers } = require("./res/data/data")
          let connector = new ConnectionService(connections,profile)
         
          let profiles = await Promise.all(connector.existingConnections().map(userAt => getProfile(userAt.user)))
         
          let potentialConnectionProfiles = await Promise.all(connector.potentialConnections().map(user => {
            return getProfile(user)
          }))
        
            console.log('there are actual chats!',chatsContext)

          setUserConnectionProfiles(profiles)
          setPotentialConnectionProfiles(potentialConnectionProfiles)
          setChats(chatsContext)
          setIsDataLoad(true);
  
       });
      }
  
    },[profile,connections,chatsContext])

    const onDelete = (name,id) => {
       setName(name)
       setCurrentSelectedUser(id)
       setModalVisible(true)
    }
    const unmatch = async () => {
      let connector = new ConnectionService(connections,profile)
      await connector.unmatchUser(currentSelectedUser)
      setModalVisible(false)
    }

    return (
     <View style={styles.container}>
        <ScrollView style={{flex:1}} indicatorStyle="default" >
          <View style={{borderBottomWidth : .4,borderBottomColor : colors.grey}}>
          {isDataLoad && (potentialConnectionProfiles.length || userConnectionProfiles.length) ?   <Transition animateOnMount={true} enterPose="enter" exitPose="exit">
              <Overlay horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusContainer} key="chat">
                {potentialConnectionProfiles.map(profile => {
                    console.log("the profile?",profile)
                 return  <ProfileStatus key={profile.uid} uri={profile.images[0].uri} name="Go Premium" hidden={true} oneStatus={true} onChat={()=>{}} />
                })}

              { userConnectionProfiles.map(profile => {
                  let chatService = new ChatService(userConnectionProfiles,chats)
                  const chat = chatService.findChatFromUser(profile.uid)
                return <ProfileStatus key={profile.uid} uri={profile.images[0].uri} name={profile.name} onChat={()=>{ onUserChat(chat.id,profile)}}  oneStatus={true} />
              })
            }
               {/* !sample */}
                {/* <ProfileStatus uri={"http://tiny.cc/profile3"} name="Preston" navigation={navigation} oneStatus={true} />
                <ProfileStatus uri="http://tiny.cc/profile4" name="Estell" navigation={navigation} oneStatus={true}/>
                <ProfileStatus uri="http://tiny.cc/profile6" name="Caryl" navigation={navigation} />
                <ProfileStatus uri="http://tiny.cc/profile7" name="Jill" navigation={navigation} /> */}
                 {/* !sample -- end */}
              </Overlay> 
            </Transition>
: null}
          </View>
          <Transition>
          {
            isDataLoad && 
           <Overlay key="chat"> 
            {
              chats.map((item) => {
                let chatService = new ChatService(userConnectionProfiles,chats)
                const profile = chatService.getOtherUserProfile(item.id)
                let connection = profile ? connections.connections.find(conn => conn.user == profile.uid) : null
                if(!connection) return null
                let matchedPlaces = connection.matchedPlaces.map( place => place.formatted_address)
                console.log('matchedPlaces',matchedPlaces)
                // !last message may or may not exist
                const lastMessage = item.messages.length  ? item.messages.sort((a, b) => new Date(String(b.at.toDate())).getTime() - new Date(String(a.at.toDate())).getTime())[0] : null
                const sentByMe =  lastMessage ? chatService.sentByMe(lastMessage) : false;
               return <UserChat key={item.id}  onDelete={()=>onDelete(profile.name,profile.uid)} sentByMe={sentByMe} onSelect={()=>{ onUserChat(item.id,profile)}} userName={profile.name} userImage={profile.images[0].uri} message={lastMessage} matchedPlaces={matchedPlaces}/>  
              })
            }
           </Overlay>
           }
          </Transition> 
         <View style={styles.chatBottomMessageWapper}>
          <Text style={styles.chatBottomText}>Hold and slide on a chat for more options</Text>
         </View>
       </ScrollView>
       
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}>
          <View style={styles.modalContainer} onStartShouldSetResponder={() => setModalVisible(false)}>
           <StatusBar backgroundColor="#2200001C" barStyle="dark-content" />
           <Transition animateOnMount={true} enterPose="enter" exitPose="exit">
            <DeleteButtonView key="delete" style={{backgroundColor : colors.white,paddingTop : 20}}>
              <View style={styles.modalWrapper}>
                <Text style={styles.warning}>{`Are you sure, Do you want to unmatch with ${name}`}</Text>
              </View>
              <View style={styles.actionWrapper}>
                <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.actionText,{color : colors.darkGrey}]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={unmatch} style={styles.actionButton}>
                <Text style={[styles.actionText,{color : 'tomato'}]}>Delete</Text>
                </TouchableOpacity>
              </View>
             </DeleteButtonView> 
            </Transition>
          </View>
        </Modal> 
      </View>  
    ) 
}

const styles = StyleSheet.create({
    container : {
       flex : 1,
       backgroundColor : colors.white,  
       marginBottom : 70  
    },
    statusContainer : {
        justifyContent : 'space-around',
    },
    chatBottomMessageWapper : {
      paddingBottom:120,
      paddingTop:5,
      alignItems : 'center',
      justifyContent: "flex-start",
    },
    chatBottomText : {
      fontSize : fontSizes.verySmall,
      fontFamily : fonts.Medium,
    },
    modalContainer : {
      backgroundColor : '#2200001C',
      flex : 1,
      justifyContent : 'flex-end'
    },
    modalWrapper : {
      paddingHorizontal : 30 ,
      paddingVertical : 10
    },
    warning : {
      fontSize : fontSizes.medium,
      fontFamily : fonts.Medium,
      textAlign : 'center'
    },
    actionWrapper : {
      flexDirection : 'row',
    },
    actionButton : {
      width : '50%',
      padding : 20,
      justifyContent : 'center',
      alignItems : 'center'
    },
    actionText : {
      fontSize : fontSizes.medium,
      fontFamily : fonts.Medium
    }
 
   
})

export default Chat