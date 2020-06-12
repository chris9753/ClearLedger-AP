import {StyleSheet} from 'react-native'
import {colors} from '../colors'
import {fontSizes} from '../fontSize'
import {fonts} from '../fonts'

export const styles = StyleSheet.create({
    
    chatContainer : {
        flexDirection : 'row',
        paddingLeft : 10,
        paddingVertical : 10,
        borderBottomWidth : .4,
        borderBottomColor : colors.grey,
    },
    imgWrapper : {
        justifyContent:'center',
        alignItems:'center',
        backgroundColor:colors.lightGrey
    },
    img : {
        width : 60,
        height:60,
        borderRadius:60/2,
    },
    chatUserDetailsWrapper : {
        justifyContent : 'center',
        flex:1,
        marginHorizontal : 20,
    },
    chatUserName : {
        color : colors.black, 
        fontSize : fontSizes.medium,
        fontFamily : fonts.SemiBold
    },
    chatUserNameTime : {
        fontSize : fontSizes.verySmall,
        fontFamily : fonts.Medium
    },
    chatWrapper : {
        flexDirection : 'row',
    },
    chatText : {
        fontSize : fontSizes.small,
        fontFamily : fonts.Medium,
        color : colors.darkGrey,
        marginLeft : 4
    },
    secondRow : {
        flexDirection : 'row',
        padding : 10,
    },
    topInfo: {
        flexDirection:'row',
        padding:10,
    },
    icon : {
        marginHorizontal : 8
    },
})