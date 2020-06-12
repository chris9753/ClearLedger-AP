import React,{useEffect,useState} from 'react'
import { Text, View,StyleSheet, StatusBar,InteractionManager,ScrollView } from 'react-native'
import {colors} from './res/style/colors'
import {fontSizes} from './res/style/fontSize'
import {fonts} from './res/style/fonts'
import MaterialIcon from './Shared/MaterialIcon'
import Feather from 'react-native-vector-icons/Feather'
import ContactList from './ContactComponents/ContactList'
import posed,{Transition} from 'react-native-pose'

const Overlay = posed.ScrollView({
  enter: { x: 0,staggerChildren: 80,delayChildren: 100, 
    transition : {
      type : 'spring',
      useNativeDriver : true
    }

  },
  exit: { x:0 }
});

const Contact = (props) => {

    const showCallIcon  = true
    const [data,setData] = useState([])
    const [isDataLoad,setIsDataLoad] = useState(false)

    useEffect(() => {
      InteractionManager.runAfterInteractions(() => {
         const {myContacts} = require('./res/data/data')
         setData(myContacts)
         setIsDataLoad(true);
      });
    },[])

    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.white} barStyle="dark-content" />
        <View style={styles.headerContainer}>
         <View style={styles.firstRow}>
          <MaterialIcon style={styles.icon} onPress={() => {props.navigation.goBack()}} name="arrow-left" size={24} color={colors.primary} />
          <Text style={styles.searchText}>Select Contact</Text>
         </View>
         <View style={styles.secondRow}>
          <Feather style={styles.icon} name="search" size={22} color={colors.primary} />
          <MaterialIcon style={styles.icon} name="account-plus" size={24} color={colors.primary} />
          <MaterialIcon style={styles.icon} name="dots-horizontal-circle" size={24} color={colors.primary} />
         </View>
        </View>
        <ScrollView style={{flex:1}}>
        <Transition>
        { isDataLoad &&
         <Overlay key="contact">
          {
            data.map((item) => (
              <ContactList key={item.id} navigation={props.navigation} id={item.id} 
              uri={item.avatar} userName={item.name} isOnline={item.isOnline} 
              status={item.status} showCallIcon={showCallIcon}/>  
            ))
          }
         </Overlay>
         }
        </Transition>
        <View style={styles.bottomContainer}>
         <View style={styles.bottomMessageWrapper}>
          <MaterialIcon name="share-variant" size={22} color={colors.darkGrey}/>
          <Text style={styles.messageText}>Invite friends</Text>
         </View>
         <View style={styles.bottomMessageWrapper}>
          <MaterialIcon name="help-circle" size={22} color={colors.darkGrey}/>
          <Text style={styles.messageText}>Contacts help</Text>
         </View>
        </View>
        </ScrollView>
      </View>
    )
}

export default Contact

const styles = StyleSheet.create({
    container : {
        flex : 1,
        backgroundColor : colors.white,
    },
    headerContainer : {
      flexDirection : 'row',
      alignItems : 'center',
      padding : 14,
      justifyContent : 'space-between',
      borderBottomWidth : 1,
      borderBottomColor : colors.lightGrey
    },
    searchText : {
      fontSize : fontSizes.medium,
      color : colors.black,
      fontFamily : fonts.Medium,
      marginLeft : 20
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
    bottomContainer : {
      padding : 10,
    },
    bottomMessageWrapper : {
      flexDirection : 'row',
      paddingHorizontal : 10,
      paddingVertical : 14,
      alignItems : 'center'
    },
    messageText: {
      fontSize : fontSizes.medium,
      fontFamily : fonts.Medium,
      color : colors.black,
      marginLeft : 20
    }
})