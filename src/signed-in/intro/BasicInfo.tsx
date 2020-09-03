import React, { Fragment, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle, Animated ,Alert, ScrollView, TextInput, Image} from 'react-native';
import { TouchableOpacity, TapGestureHandler} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useCountRenders } from '../../util/performance';
import layout from '../../signed-out/layout';
// @ts-ignore
import PlacesInput from 'react-native-places-input'
import GlobalTheme from '../../theme'
import { Profile as ProfileType, Image as ProfileImageType, Location } from '../../entities/profiles/model'
import CustomButton from '../../components/CustomButton';
import LinearGradient from 'react-native-linear-gradient';
import { useProfile } from '../../util/firebase';
import { searchPhoneNumbersInText } from 'libphonenumber-js';

interface Props {
    finished:(dataObject:any) => void;
}
function BasicInfo ({finished}:Props) {
    const [spinnerloading, setLoading] = useState<boolean>(false);
    const [description,setDescription] = useState('')
    const {profile,loading,error} = useProfile()
    const [currentProfile, updateCurrentProfile] = useState<ProfileType | null>(null)
    const [locationSet,updateLocationSet] = useState(false)
     // get nearby cities 

     useEffect(()=>{
        if(profile) {
            updateCurrentProfile(profile)
        }
     },[loading])
     async function getNearbyCitiesFromApiAsync(latitude: any, longitude: any) {
        let $responseStyle = 'short', // the length of the response
            $citySize = 'cities15000', // the minimal number of citizens a city must have
            $radius = 30, // the radius in KM
            $maxRows = 30, // the maximum number of rows to retrieve
            $username = 'venndii'; // the username of your GeoNames account
        try {
            let response = await fetch(
                `http://api.geonames.org/findNearbyPlaceNameJSON?lat=${latitude}&lng=${longitude}&style=${$responseStyle}&cities=${$citySize}&radius=${$radius}&maxRows=${$maxRows}&username=${$username}`
            );
            let json = (await response.json()).geonames.map((city: any) => city.name);
            return json
        } catch (error) {
            console.error(error);
        }
    }
    const submit = () => {
        //save info to user profile.
        // nextStep
        console.log("pressing?")
        setLoading(true)
        finished({...currentProfile,bio:description})
    }
    const onChangeHomeLocation = async (place: Location, top1: any) => {
        //create more top1's nearby.
        let result = await getNearbyCitiesFromApiAsync(place.location.lat, place.location.lng)
        console.log("should be more places here.", top1, result)
        let newTop1Index = [...new Set([top1.long_name, ...result])]
        let newProfile: ProfileType = { ...currentProfile!, homeLocation: place, top1: newTop1Index }
        updateCurrentProfile(newProfile)
        updateLocationSet(true);
    }
return <View style={[layout.main, styles.contentArea,{justifyContent:'flex-start'}]}>
         <View style={[layout.row, layout.header,{marginBottom:30}]}>
    <View style={layout.column}>
      <Text style={layout.heading}>
        Just a few details
      </Text>
    </View>
  </View>
  <View style={[layout.full]}>

    <View style={[layout.column,{marginVertical:20,alignSelf: "center" }]}>
    <View style={styles.profileImage}>
                        <Image source={{uri:'https://widgetwhats.com/app/uploads/2019/11/free-profile-photo-whatsapp-4.png'}} style={styles.image} resizeMode="center"></Image>
                    </View>
    <Text style={styles.actionText}>
      Change Profile Image
    </Text>

    </View>
    <View style={[layout.column,{marginVertical:20}]}>
    <Text style={styles.hFour}>
     Based In
    </Text>
    <View style={[layout.row, { marginTop: 0 }]}>
    <PlacesInput
                                    placeHolder={currentProfile?.homeLocation && currentProfile?.homeLocation.formatted_address || 'Toronto,On'}
                                    stylesInput={{
                                        // backgroundColor:'grey'
                                        paddingLeft:0
                                    }}
                                    stylesContainer={{
                                        position: 'relative',
                                        flex: 1,
                                        // zIndex:9999,
                                        alignSelf: 'stretch',
                                        //    width:'90%',
                                        //     margin: 0,
                                        top: 0,
                                        //     left: 0,
                                        //     right: 0,
                                        //     bottom: 0,
                                        marginLeft:-9,
                                        marginTop: 0,
                                        paddingLeft:0,
                                        shadowOpacity: 0,
                                        elevation: 0,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#dedede',
                                        //     borderColor: '#dedede',
                                        //     borderWidth: 1,
                                        //     marginBottom: 10
                                    }}
                                    stylesList={{
                                        top: 50,
                                        // zIndex:999,
                                        borderColor: '#dedede',
                                        backgroundColor:'white',
                                        borderLeftWidth: 1,
                                        borderRightWidth: 1,
                                        borderBottomWidth: 1,
                                        color:'black',
                                        left: -1,
                                        right: -1
                                    }}
                                    queryFields={`formatted_address,geometry,name,address_components`}
                                    googleApiKey={'AIzaSyDcRpn_oyQUNlR4Wy370jCbJ0S0uy3hxqk'}

                                    onSelect={(place: any) => { 
                                        onChangeHomeLocation({ formatted_address: place.result.name, location: place.result.geometry.location }, 
                                            place['result']['address_components'] ? place['result']['address_components'].find((comp: any) => comp['types'].includes('administrative_area_level_1')): place['result']['name']) }
                                        }
                                    
                                />
    </View>
    
    </View>
    <View style={[layout.column,{marginVertical:20}]}>
    <Text style={styles.hFour}>
      About me
    </Text>
    <TextInput
    //  onFocus={handleFocus}
    //  onBlur={handleBlur}
      style={[styles.inputBox,{borderBottomColor:'#888888'}]}
      // mode="outlined"
      // label="Email Address"
      placeholder={"I like to fish"}
      value={description}
      multiline={true}
      numberOfLines={5}
      onChangeText={setDescription}
      // theme={inputTheme}
      keyboardType="default"
      autoCapitalize="none"
      autoCorrect={true}
    />

    </View>
 
     
    </View>
    
    <LinearGradient colors={['rgba(255,255,255,1)', 'rgba(255,255,255,.55)', 'rgba(255,255,255,0.7189250700280112)']} style={styles.info}>
    <View style={[layout.full]}>
    <CustomButton
      textColor={'#fff'}
      color={'#0A0F3D'}
      solid={true}
      loading={spinnerloading}
      onPress={submit}
      disabled={!locationSet || !description.length}
    >
      {!locationSet || !description.length ? 'Fill out your information' : 'Continue'}
    </CustomButton>
    </View>
    </LinearGradient>

</View>
}

const styles = StyleSheet.create({
 contentArea: {
    marginTop: 30,
    // overflow: 'hidden',
    // marginBottom: 0,
    // position:'relative',
    flex: 1,
    // alignContent:'center',
    // alignItems:'center',
    // justifyContent: 'center'
    // justifySelf
    // flexDirection:'column',
    // alignSelf:'center',

  },
  hFour: {
    fontSize: 14,
    // marginHorizontal:28,
    fontFamily: 'Montserrat',
    color: 'grey'
  },
  actionText: {
      textAlign:'center',
    fontSize: 12,
    fontFamily: 'Montserrat',
    color: 'blue',
    textDecorationLine: 'underline'
  },
  info: {
    flex: 1,
    zIndex: 1,
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    height: 125,
    width: '100%',
    paddingTop: 30,
    paddingHorizontal: 20,
    // borderRadius: 8,




    // marginTop
},
  profileImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: "hidden",
    marginBottom:10
},
image: {
    flex: 1,
    height: undefined,
    width: undefined
},
  input: {
    borderTopColor: 'transparent',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    marginVertical: 20,
    fontSize: 14,
    padding: 10,
    paddingHorizontal: 5,
    fontFamily: 'Open Sans',
    // backgroundColor:'white',
    borderBottomColor: '#888888',
    borderBottomWidth: .3
    // overflow:'hidden'
  },
  inputBox : {
    // borderTopColor: 'transparent',
    // borderLeftWidth: 0,
    // borderRightWidth: 0,
    minHeight:100,
    marginVertical: 20,
    fontSize: 14,
    padding: 10,
    paddingHorizontal: 5,
    fontFamily: 'Open Sans',
    // backgroundColor:'white',
    borderColor: '#888888',
    borderWidth: .3,
    borderRadius:8,
    // overflow:'hidden'
  },
})

export default BasicInfo

