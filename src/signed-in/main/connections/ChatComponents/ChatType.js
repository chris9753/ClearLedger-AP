import React from 'react'
import {View,Text,StyleSheet,Image} from 'react-native'
import {colors} from '../res/style/colors'
import {fontSizes} from '../res/style/fontSize'
import {fonts} from '../res/style/fonts'
import MaterialIcon from '../Shared/MaterialIcon'

export const MoneyChat = () => {
    return(
      <View style={styles.moneyContainer}>
        <View style={styles.rupeeIconContainer}>
          <Text style={styles.rupeeIcon}>₹</Text>
          <MaterialIcon name="arrow-up" style={{marginTop:4}} size={10} color={colors.primary} />
        </View>
        <Text style={styles.moneyText}>500</Text>
        <MaterialIcon name="arrow-left" style={{marginLeft:6,alignSelf :'flex-start',marginTop:6}} size={24} color={colors.primary} />
      </View>
    )
  }
  
export const GalleryChat = ({uri,text}) => {
     return(
       <View>
         <Image style={styles.galleryPhotoImg} source={{uri}}/>
         <Text style={styles.galleryPhotoText}>{text}</Text>
       </View>
     )
}

const styles = StyleSheet.create({
    moneyContainer : {
        flexDirection : 'row',
        alignItems : 'center',
        borderWidth : .8,
        borderColor : '#EAEAEA',
        paddingVertical : 6,
        paddingHorizontal : 10,
        borderRadius : 5,
    },
    moneyText : {
        fontSize : fontSizes.xbig,
        fontFamily : fonts.Medium,
        color : colors.primary,
    },
    rupeeIconContainer : {
        padding : 2,
        flexDirection : 'row',
        alignItems : 'center',
    },
    rupeeIcon : {
        color : colors.primary,
        fontSize : 14
    },
    galleryPhotoImg : {
        width : 200,
        height : 200
    },
        galleryPhotoText : {
        fontSize : 14,
        fontFamily : fonts.Regular,
        color : colors.white,
        marginTop : 6
    }
})