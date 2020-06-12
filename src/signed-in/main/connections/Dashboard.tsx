import React,{useState} from 'react'
import { Text, View,StyleSheet,Image,StatusBar,TouchableOpacity,Modal,Dimensions} from 'react-native'
import {colors} from './res/style/colors'
import {fontSizes} from './res/style/fontSize'
import {fonts} from './res/style/fonts'
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import Icon from 'react-native-vector-icons/Entypo'
import Feather from 'react-native-vector-icons/Feather'
import {OnlineOffline} from './Shared/Index'
import Animated from 'react-native-reanimated';
import { NavigationParams, withNavigation } from 'react-navigation'
import Chat from './Chat'
import Hero from '../../../components/Hero';
import IconAlt from 'react-native-vector-icons/FontAwesome5';
import GlobalTheme from '../../../theme'
import FloatingButton from '../../../components/FloatingButton'
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)
const { interpolate, Extrapolate } = Animated;
const AnimateIcon = Animated.createAnimatedComponent(MaterialIcon)
const AnimateCameraIcon = Animated.createAnimatedComponent(Icon)

const HEADER_HEIGHT = 70 //header height


interface Props {
  navigation: NavigationParams;
}

const Dashboard = ({navigation}:Props) => {
   
    const [modalVisible,setModalVisible] = useState(false)
    const [index,setIndex] = useState(1)
    const [routes,setRoutes] = useState([
      { key: 'camera', title: 'Camera' },
      { key: 'chat', title: 'Chat' },
      { key: 'groups', title: 'Groups' },
      { key: 'calls', title: 'Calls' },
    ],)

    //track position of tabs for animation
    const [position,setPosition] = useState(new Animated.Value(1))  
    
    const onOption = () => {
      requestAnimationFrame(() => {
       setModalVisible(true)
      })
    }

    const onSetting = () => {
      requestAnimationFrame(() => {
        setModalVisible(false)
        navigation.navigate('Setting')
      })
    }

    //change bottom icon based on tab
    const setBottomIconName = (screen:any) =>{
 
       return "sort"
  
     
    }

    const setOnPress = (screen:any) => {
 
      return onContact
   
  
    }

    const onContact = () => {
      requestAnimationFrame(() => {
       navigation.navigate('Contact',{
        showCallIcon : false
       })
      })
    }


  
  

    return (
      <View style={styles.container} onStartShouldSetResponder={() => { 
        setModalVisible(false) 
        return true
        } }>
        <Hero colors={['#15212B', '#15212B']} >
                <TouchableOpacity onPress={() => navigation.navigate('Wander')}>
                    <IconAlt name="dot-circle" color={GlobalTheme.colors.light.secondary} solid size={26} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onOption}>
                    <IconAlt name="ellipsis-v" color={GlobalTheme.colors.light.text.warning} solid size={24} />
                </TouchableOpacity>

            </Hero>
         <Animated.View style={[styles.headerWrapper]}>
           <Animated.View style={[styles.headerCol]}>
            <View style={[styles.profileImg,styles.imgWrapper]}>
             <Image style={styles.profileImg} source={{uri:'https://firebasestorage.googleapis.com/v0/b/wander-42195.appspot.com/o/IMG_20200329_135941.jpg?alt=media&token=0cd1f558-372b-4b74-87af-031f04e4d890'}}/>
            </View>
            <OnlineOffline userWrapperStyle={styles.userWrapperStyle} isOnline={true} />
            <Text style={styles.userNameText}>Hi, Chris!</Text>
           </Animated.View>
         </Animated.View>
         <Animated.View style={[styles.tabBarWrapper]}> 
        <Chat navigation={navigation}></Chat>
         </Animated.View>
          { index !==0 && (
              // <AnimatedTouchable activeOpacity={.8} onPress={setOnPress(index)}  style={[styles.messageIconWrapper]}>
              //   <AnimateIcon name={setBottomIconName(index)} color={colors.white} size={26}/>
              // </AnimatedTouchable>
              <FloatingButton style={styles.messageIconWrapper}></FloatingButton>
          )}
  
         <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}>
          <View style={styles.modalContainer} onStartShouldSetResponder={() => { 
            setModalVisible(false) 
            return true
            } }>
           <View style={styles.sideModalContainer}>
             <TouchableOpacity style={styles.optionContainer}>
               <Text style={styles.optionText}>Buy Credits</Text>
             </TouchableOpacity>
             
             <TouchableOpacity style={styles.optionContainer} onPress={onSetting}>
               <Text style={styles.optionText}>Message Settings</Text>
             </TouchableOpacity>
            </View> 
          </View>
        </Modal>
      </View>
    )
}

const styles = StyleSheet.create({
    container : {
        flex: 1,
        color : colors.white,
            backgroundColor: 'white',
    },
    tabBarWrapper : {
      backgroundColor: colors.white, 
      flex:1,
    },
    tabBar : {
      backgroundColor : colors.white,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 2,
    },
    tabBarLabel : {
      textAlign : 'center',
      fontFamily : fonts.Medium,
      textTransform : 'capitalize',
      fontSize : 14,
      marginBottom : 0
    },
    headerWrapper : {
        flexDirection : 'row',
        paddingVertical: 10,
        paddingHorizontal:10,
        alignItems : 'flex-end',
        justifyContent : 'space-between',
        width : '100%',
        position : 'relative',
        height : HEADER_HEIGHT,
        backgroundColor : colors.white,
    },
    headerCol : {
      flexDirection:'row',alignItems:'center'
    },
    userNameText : {
        fontFamily : fonts.SemiBold,
        fontSize : fontSizes.xmedium,
        color : colors.black,
        marginLeft : 10
    },
    imgWrapper : {
      justifyContent : 'center',
      alignItems : 'center',
      backgroundColor : colors.lightGrey
    },
    profileImg : {
        width : 50,
        height:50,
        borderRadius:50/2,
    },
    userWrapperStyle : {
      bottom:-4,
      left:20
    },
    icon : {
        margin : 10
    },
    modalContainer : {
      backgroundColor : '#00000000', //transparent color
      flex : 1,
      alignItems : 'flex-end',
      paddingTop : 8,
      paddingRight:6
    },
    sideModalContainer : {
      marginTop:75,
      paddingVertical : 4,
      paddingLeft : 10,
      paddingRight : 50,
      backgroundColor : colors.white,
      borderRadius : 4,
      elevation : 2,
    },
    optionContainer : {
     padding : 10
    },
    optionText : {
      fontSize : fontSizes.medium,
      fontFamily : fonts.Medium,
      color : colors.black,
    },
    messageIconWrapper : {
      backgroundColor : colors.primary,
      width : 60,
      height : 60,
      borderRadius : 60/2,
      justifyContent : 'center',
      alignItems : 'center',
      position : 'absolute',
      right : 20,
      elevation : 4,
      bottom : 20
    },
})

export default Dashboard