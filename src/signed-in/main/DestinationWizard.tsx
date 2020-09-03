import React, { Fragment, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle, Animated, Alert, ScrollView, TextInput, Image, TouchableOpacity, Dimensions, DatePickerIOS } from 'react-native';
import { TapGestureHandler } from 'react-native-gesture-handler';
import { useCountRenders } from '../../util/performance';
import layout from '../../signed-out/layout';
// @ts-ignore
import PlacesInput from 'react-native-places-input'
import GlobalTheme from '../../theme'
import { Profile as ProfileType, Image as ProfileImageType, Location } from '../../entities/profiles/model'
import CustomButton from '../../components/CustomButton';
import Hero from '../../components/Hero'
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import moment from 'moment'
import DateTimePicker from '@react-native-community/datetimepicker';
// @ts-ignore
import DatePicker from 'react-native-modern-datepicker';
import { useProfile } from '../../util/helpers';
import { updateProfile } from '../../util/firebase';
enum stages {
    location,
    dates
}
interface Props {
    onClose: ()=> void
    type?:string;
}
const NAVSPACETOCENTER = 35
function DestinationWizard({onClose,type = 'going'}:Props) {

    const [currentProfile, updateCurrentProfile] = useState<ProfileType | null>(null)
    const [currentStage, updateCurrentStage] = useState(stages.location)
    const [goingDate, setGoingDate] = useState(new Date())
    let selectedPlace = useRef(null) as any
    const [selectedDestination,setSelectedDestination] = useState(false);
    const profile = useProfile()
    // get nearby cities 

    useEffect(()=> {
        if(profile){
            updateCurrentProfile(profile)
        }
    },[profile])

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

    const onChangePlacesGo = async (place: Location, top1: any) => {
        //create more top1's nearby.
        let result = await getNearbyCitiesFromApiAsync(place.location.lat, place.location.lng)
        let newTop1Index = [...new Set([...currentProfile!.top1, top1.long_name, ...result])]
        const old = currentProfile!.placesToGo ? currentProfile!.placesToGo : []
        selectedPlace.current = place
        let newProfile: ProfileType = { ...currentProfile!, placesToGo: [...old, selectedPlace.current], top1: newTop1Index }
        updateCurrentProfile(newProfile)
        setSelectedDestination(true);
    }
    const onChangePlacesBeen = async (place: Location, top1: any) => {
        //create more top1's nearby.
        let result = await getNearbyCitiesFromApiAsync(place.location.lat, place.location.lng)
        let newTop1Index = [...new Set([...currentProfile!.top1, top1.long_name, ...result])]
        const old = currentProfile!.placesBeen ? currentProfile!.placesBeen : []
        selectedPlace.current = place
        let newProfile: ProfileType = { ...currentProfile!, placesBeen: [...old, selectedPlace.current], top1: newTop1Index }
        console.log(newProfile.placesBeen)
        updateCurrentProfile(newProfile)
        setSelectedDestination(true);
    }
    const dates = () => {
        return <View style={[layout.main, styles.contentArea, { justifyContent: 'flex-start' }]}>
            <View style={[layout.row, layout.header, { marginBottom: 30 }]}>
                <View style={layout.column}>
                    <Text style={layout.heading}>
                    {type =='going' ? 'When are you going' : 'When were you there?'}
         </Text>
                </View>
            </View>
            <View style={[layout.full]}>
                <View style={[layout.column, { marginVertical: 20 }]}>

                </View>
                <View style={[layout.column, { marginVertical: 20 }]}>
                    <Text style={styles.hFour}>
                        Arrival
             </Text>
             <View style={[layout.row,{justifyContent:'center',alignItems:'center'}]}>
             <TouchableOpacity style={{ position: 'absolute', right: 30 }} onPress={() => { }}>
                <Icon name="times" color={'grey'} solid size={24} />
            </TouchableOpacity>
            <TextInput
                        onFocus={() => { }}
                        onBlur={() => { }}
                        style={[styles.input, { borderBottomColor: '#888888',width:'100%' }]}
                        // mode="outlined"
                        // label="Email Address"
                        placeholder={"July 13th, 2020"}
                        value={moment(goingDate).format('MMM Do YY')}
                        editable={false}
                        onChangeText={() => { }}
                        // theme={inputTheme}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
             </View>
                    
                </View>
                {/* <DateTimePicker
                    testID="dateTimePicker"
                    value={goingDate}
                    mode={'date'}
                    is24Hour={true}
                    display="default"
                    onChange={(ev,val) => setGoingDate(val as any)}
                /> */}
                <DatePicker
      onSelectedChange={(date: any) => {
          selectedPlace.current.meta = {arrival:date}
          setGoingDate(date)
    
    }}
    />
            </View>
            <LinearGradient colors={['rgba(255,255,255,1)', 'rgba(255,255,255,.55)', 'rgba(255,255,255,0.7189250700280112)']} style={styles.info}>
                <View style={[layout.full]}>
                    <CustomButton
                        textColor={'#fff'}
                        color={'#0A0F3D'}
                        solid={true}
                        loading={false}
                        onPress={async () => { await updateProfile({...currentProfile!}); onClose()}}
                        disabled={!goingDate}
                    >
                        {!goingDate ? 'select a date' : 'Complete'}
                    </CustomButton>
                </View>
            </LinearGradient>
        </View>
    }
    const locations = () => {
        return <View style={[layout.main, styles.contentArea, { justifyContent: 'flex-start' }]}>
            <View style={[layout.row, layout.header, { marginBottom: 30 }]}>
                <View style={layout.column}>
                    <Text style={layout.heading}>
                        {type =='going' ? 'Where are you going' : 'Where have you been?'}
         </Text>
                </View>
            </View>
            <View style={[layout.full]}>


                <View style={[layout.column, { marginVertical: 20 }]}>
                    <Text style={styles.hFour}>
                        Search the world
    </Text>
                    <View style={[layout.row, { marginTop: 0 }]}>
                        <PlacesInput
                            placeHolder={currentProfile?.homeLocation.formatted_address || 'Toronto,On'}
                            stylesInput={{
                                // backgroundColor:'grey'
                                paddingLeft: 0
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
                                marginLeft: -9,
                                marginTop: 0,
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
                                backgroundColor: 'white',
                                borderLeftWidth: 1,
                                borderRightWidth: 1,
                                borderBottomWidth: 1,
                                color: 'black',
                                left: -1,
                                right: -1
                            }}
                            queryFields={`formatted_address,geometry,name,address_components`}
                            googleApiKey={'AIzaSyDcRpn_oyQUNlR4Wy370jCbJ0S0uy3hxqk'}

                            onSelect={(place: any) => {
                                if(type == 'been') {
                                    onChangePlacesBeen({ formatted_address: place.result.name, location: place.result.geometry.location },
                                        place['result']['address_components'] ? place['result']['address_components'].find((comp: any) => comp['types'].includes('administrative_area_level_1')) : place['result']['name'])
                                } else {
                                onChangePlacesGo({ formatted_address: place.result.name, location: place.result.geometry.location },
                                    place['result']['address_components'] ? place['result']['address_components'].find((comp: any) => comp['types'].includes('administrative_area_level_1')) : place['result']['name'])
                            }
                        }
                            }

                        />
                    </View>
                </View>
            </View>
            {/* <View style={[layout.wordBox,{marginVertical:20}]}>
        
        
        <View style={layout.column}>
          <Text style={layout.info}>
        
            You will need to link your account with an email and password.
        
          </Text>
        </View>
        </View> */}

            <LinearGradient colors={['rgba(255,255,255,1)', 'rgba(255,255,255,.55)', 'rgba(255,255,255,0.7189250700280112)']} style={styles.info}>
                <View style={[layout.full]}>
                    <CustomButton
                        textColor={'#fff'}
                        color={'#0A0F3D'}
                        solid={true}
                        loading={false}
                        onPress={() => updateCurrentStage(stages.dates)}
                        disabled={!selectedDestination}
                    >
                        {!selectedDestination ? 'select a destination' : 'next'}
                    </CustomButton>
                </View>
            </LinearGradient>
        </View>
    }
    return <View style={[layout.container, { justifyContent: 'flex-start' }]}>

        <Hero colors={['#15212B', '#15212B']} style={{ zIndex: 9999, marginTop: NAVSPACETOCENTER }} centered>
            <TouchableOpacity style={{ position: 'absolute', left: 30 }} onPress={() => { onClose()}}>
                <Icon name="chevron-left" color={'grey'} solid size={24} />
            </TouchableOpacity>

            <View style={[layout.row, {}]}>

                <Text style={[styles.navText, currentStage == stages.location && styles.navTextActive]}>
                    Location
          </Text>
                <Text style={[styles.navText, currentStage == stages.dates && styles.navTextActive]}>
                    Dates
          </Text>


            </View>


            {/* <TouchableOpacity>
          <Icon name="comment-alt" color={GlobalTheme.colors.light.text.warning} solid size={24} />
        </TouchableOpacity> */}

        </Hero>
        {currentStage == stages.location ? locations() : dates()}
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
    main: {
        paddingTop: 0,
        flex: 1,
        position: 'relative',
        marginBottom: 125,

    },
    navText: {
        fontSize: 14,
        marginHorizontal: 20,
        fontFamily: 'Montserrat',
        color: 'grey'
    },
    navTextActive: {
        color: GlobalTheme.colors.light.accent
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
    sectionContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
})
export default DestinationWizard