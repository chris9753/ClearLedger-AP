import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, SectionList, TextInput, Modal, StatusBar } from "react-native";
import { ScrollView, TouchableWithoutFeedback } from "react-native-gesture-handler";
import Hero from '../../components/Hero';
import React, { Fragment, useState, useEffect, useRef } from "react";
import { Image } from "react-native-expo-image-cache";
import Icon from "react-native-vector-icons/FontAwesome5";
// @ts-ignore
import PlacesInput from 'react-native-places-input'
import GlobalTheme from '../../theme'
import { withTheme, Theme } from "react-native-paper";
import { NavigationParams } from "react-navigation";
import ImageGallery from '../../components/ImageGallery';
import { addPhoto, updateProfile } from "../../util/firebase";
import LinearGradient from "react-native-linear-gradient";
import layout from "../../signed-out/layout";
import { useCountRenders } from "../../util/performance";
import ImageCarousel from "../../components/ImageCarousel";
import { sample } from 'lodash'
import { Profile as ProfileType, Image as ProfileImageType, Location } from '../../entities/profiles/model'
// @ts-ignore
import { ImageManipulator } from 'expo-image-crop'
import PictureTaker from "../../components/Camera";
import { optimizeHeavyScreen } from '../../util/OptimizeHeavyScreen'
import { useProfile } from "../../util/helpers";
import auth from '@react-native-firebase/auth'
import BubbleTag from "../../components/BubbleTag";
import Floater from 'react-native-modal';
import posed, { Transition } from 'react-native-pose'
// @ts-ignore
import Popup, { ModalContent } from 'react-native-modals';
import HeightSelector from "../../components/HeightSelector";
import DestinationWizard from "./DestinationWizard";
// @ts-ignore
import SearchableDropdown from 'react-native-searchable-dropdown';
import Interests from "../intro/Interests";
interface Props {
    theme: Theme;
    route: any;
    navigation: NavigationParams;
}

const items = [
    {
        id: 1,
        name: 'Chinese(Mandarin)',
    },
    {
        id: 2,
        name: 'Russian',
    },
    {
        id: 3,
        name: 'Farsi',
    },
    {
        id: 4,
        name: 'Hebrew',
    },
    {
        id: 5,
        name: 'English',
    },
    {
        id: 6,
        name: 'German',
    },
    {
        id: 7,
        name: 'Arabic',
    },
    {
        id: 8,
        name: 'Klingon',
    },
];
function Profile({ theme, route, navigation }: Props) {

    const profile = useProfile()
    const tappableImageGalleryRef = useRef(null)
    const imageCarouselRef = useRef(null)
    const [editingMode, setEditingMode] = useState(false)
    const [editingPhoto, setEditingPhoto] = useState(false)
    const [pickingPhoto, setPickingPhoto] = useState(false)
    const photoUri = useRef<ProfileImageType | null>(null)
    const [visible, setVisible] = useState(false)
    const [currentProfile, updateCurrentProfile] = useState<ProfileType | null>(null)
    const addingPhoto = useRef(false)
    const [addingInterests, setAddingInterests] = useState(false)
    const [selectedLanguages, setSelectedLanguages] = useState([]) as any
    const [addingDestination, setAddingDestination] = useState('')
    const [selectedLanguage, setSelectedLanguage] = useState('')
    const [removingLanguage, setRemovingLanguage] = useState(false)
    function toFeet(cm: number) {
        let totalInches = (cm * 0.393700);
        let inches = Math.round(totalInches % 12);
        let feet = Math.floor(totalInches / 12);

        if (inches === 12) {
            feet += 1; inches = 0;
        }
        return { feet, inches };
    }
    useCountRenders('profileView')
    const mapArrayToDataObject = (arr: any[]) => {
        const data = [arr.reduce((l: { [x: string]: any; }, n: any) => {
            l['data'].push(n);
            return l
        }, { data: [] })
        ]

        return data
    }
    //initialize inputs
    useEffect(() => {
        if (profile) {
            console.log('attempting parse', profile.homeLocation)

            updateCurrentProfile({ ...profile })
        }

    }, [profile])

    // get nearby cities 
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
    const carouselItem = ({ item, index }: any) => {
        if (item == 'placeholder') {
            return <View style={[styles.mediaImageContainer, styles.add]}>
                <TouchableOpacity style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }} onPress={() => requestAnimationFrame(() => { { setPickingPhoto(true) } })}>
                    <Icon name="plus" color={GlobalTheme.colors.light.text.warning} solid size={22} />
                </TouchableOpacity>

                {/* <Text style={[{marginLeft:10,fontSize:16},styles.text,]}>A</Text> */}


            </View>
        } else {

            if (imageCarouselRef.current) {
                return <Animated.View style={[styles.mediaImageContainer, index == (imageCarouselRef.current as any).selectedCarouselIndex ? styles.imageSelected : null]}>
                    <TouchableWithoutFeedback style={{ width: '100%', height: '100%' }} onPress={() => {
                        (imageCarouselRef.current as any).setCarouselIndex(index);
                        const ImageGalleryRef = tappableImageGalleryRef.current as any | null
                        if (ImageGalleryRef && index != 0) {
                            ImageGalleryRef.setGalleryIndex(index - 1)
                        }
                    }}>
                        <Image uri={item.uri} preview={item.preview ? item.preview : null} style={styles.image} />
                    </TouchableWithoutFeedback>

                </Animated.View>
            }
            return null
        }
    }
    const onPhotoRetrieved = (photo: any) => {
        if (photo) {
            photoUri.current = ({ preview: photo.base64, uri: photo.uri })
            console.log("broo")
            setEditingPhoto(true)
            setPickingPhoto(false)
        }
    }
    const saveProfile = async () => {
        setEditingMode(false)
        await updateProfile(currentProfile!)
    }
    const onChangeBio = (text: string) => {
        let newProfile: ProfileType = { ...currentProfile!, "bio": text }
        updateCurrentProfile(newProfile)
    }
    // const onChangePlacesGo = async (place: Location, top1: any) => {
    //     //create more top1's nearby.
    //     let result = await getNearbyCitiesFromApiAsync(place.location.lat, place.location.lng)
    //     let newTop1Index = [...new Set([...currentProfile!.top1, top1.long_name, ...result])]
    //     const old = currentProfile!.placesToGo ? currentProfile!.placesToGo : []

    //     let newProfile: ProfileType = { ...currentProfile!, placesToGo: [...old, place], top1: newTop1Index }
    //     updateCurrentProfile(newProfile)
    // }
    // const onChangePlacesBeen = async (place: Location, top1: any) => {
    //     //create more top1's nearby.
    //     let result = await getNearbyCitiesFromApiAsync(place.location.lat, place.location.lng)
    //     let newTop1Index = [...new Set([...currentProfile!.top1, top1.long_name, ...result])]
    //     const old = currentProfile!.placesBeen ? currentProfile!.placesBeen : []
    //     let newProfile: ProfileType = { ...currentProfile!, placesBeen: [...old, place], top1: newTop1Index }
    //     console.log(newProfile.placesBeen)
    //     updateCurrentProfile(newProfile)
    // }

    const addPictureToProfile = async (uri: string) => {
        if (!addingPhoto.current) {
            addPhoto(uri).then(res => {
                addingPhoto.current = false;
            })
        }

    }

    const onSelectNewHeight = (heightInCM: number) => {
        console.log('new height selected', heightInCM)
        updateCurrentProfile({ ...currentProfile!, height: heightInCM })
    }
    const removeLanguage = () => {
        let languages = currentProfile!.languages.filter(l => l != selectedLanguage)
        updateCurrentProfile({ ...currentProfile!, languages })
    }

    const onChangeHomeLocation = async (place: Location, top1: any) => {
        //create more top1's nearby.
        let result = await getNearbyCitiesFromApiAsync(place.location.lat, place.location.lng)
        console.log("should be more places here.", top1, result)
        let newTop1Index = [...new Set([...currentProfile!.top1, top1.long_name, ...result])]
        let newProfile: ProfileType = { ...currentProfile!, homeLocation: place, top1: newTop1Index }
        updateCurrentProfile(newProfile)
    }

    return (

        <View style={styles.container}>
            <Hero colors={['#15212B', '#15212B']} >
                <TouchableOpacity onPress={() => navigation.navigate('Wander')}>
                    <Icon name="dot-circle" color={GlobalTheme.colors.light.secondary} solid size={26} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { navigation.navigate('Settings')}}>
                    <Icon name="ellipsis-v" color={GlobalTheme.colors.light.text.warning} solid size={24} />
                </TouchableOpacity>

            </Hero>
            {/* MODAL PICKERS */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={addingDestination != ''}

            >
                <DestinationWizard type={addingDestination} onClose={() => setAddingDestination('')}></DestinationWizard>
            </Modal>
            <Modal
                animationType="slide"
                transparent={false}
                visible={addingInterests}

            >
                <Interests finished={(obj: any) => {
                    updateCurrentProfile({ ...currentProfile!, ...obj })
                    setAddingInterests(false)
                }}></Interests>
            </Modal>
            <Modal
                animationType="fade"
                transparent={true}
                visible={removingLanguage}>
                <View style={styles.modalContainer} onStartShouldSetResponder={() => {
                    setRemovingLanguage(true)
                    return true
                }}>
                    <StatusBar backgroundColor="#2200001C" barStyle="dark-content" />
                    <Transition animateOnMount={true} enterPose="enter" exitPose="exit">
                        <DeleteButtonView key="delete" style={{ backgroundColor: 'white', paddingTop: 20 }}>
                            <View style={styles.modalWrapper}>
                                <Text style={styles.warning}>{`Are you sure, you want to delete ${selectedLanguage}`}</Text>
                            </View>
                            <View style={styles.actionWrapper}>
                                <TouchableOpacity style={styles.actionButton} onPress={() => setRemovingLanguage(false)}>
                                    <Text style={[styles.actionText, { color: 'grey' }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={removeLanguage} style={styles.actionButton}>
                                    <Text style={[styles.actionText, { color: 'tomato' }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </DeleteButtonView>
                    </Transition>
                </View>
            </Modal>

            {/* image picker */}
            <ImageManipulator
                key={photoUri.current?.uri}
                photo={{ uri: (photoUri.current ? photoUri.current.uri : 'https://i.pinimg.com/originals/39/42/a1/3942a180299d5b9587c2aa8e09d91ecf.jpg') }}
                isVisible={editingPhoto}
                onPictureChoosed={({ uri }: any) => addPictureToProfile(uri)}
                onToggleModal={() => { setEditingPhoto(false) }}
            />
            <Modal
                animationType="slide"
                transparent={false}
                onRequestClose={() => setPickingPhoto(false)}
                visible={pickingPhoto}
            >
                <PictureTaker onPictureTaken={onPhotoRetrieved}></PictureTaker>
            </Modal>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always" style={[styles.main]}>

                <Animated.View style={[styles.stage, { justifyContent: 'center', alignContent: 'center' }]}>
                    <View style={styles.screen}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 20, paddingLeft: 20 }}>
                            <Icon name="eye" color={"#52575D"} solid size={22} />
                            <Text style={[{ marginLeft: 10, fontSize: 16 }, styles.text,]}>Preview</Text>
                        </View>
                    </View>
                    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.5)']} style={styles.info}>
                        {currentProfile ? <Text style={styles.infoText}>{currentProfile?.name}, {currentProfile?.age}</Text> : null}
                    </LinearGradient>

                    {/* <TouchableOpacity style={styles.fab}> */}
                    {/* <FAB
                            style={styles.fab}
                            icon="arrow-downward"
                            onPress={() => navigation.goBack()}
                        /> */}
                    {/* <Icon name="arrow-circle-down"  color={GlobalTheme.colors.light.secondary} size={32} /> */}
                    {/* </TouchableOpacity> */}

                    {true && currentProfile && imageCarouselRef && currentProfile.images!.length > 0 ? <ImageGallery imageStyle={{
                        flex: 1,
                        alignSelf: 'stretch',
                        height: undefined,
                        width: undefined,
                        // borderRadius: 8,
                        // overflow:'hidden',
                        resizeMode: 'cover'
                    }} ref={tappableImageGalleryRef} onIndexChange={(i: number) => (imageCarouselRef.current as any).setCarouselIndex(i + 1)} images={(currentProfile.images)!}></ImageGallery> :

                        <View style={[layout.row, layout.header, { alignItems: 'center', justifyContent: 'center', alignContent: 'center', alignSelf: 'center' }]}>
                            <View style={[layout.column]}>
                                <Text style={[layout.heading]}>
                                    You're beautiful add an image!
                            </Text>
                            </View>
                        </View>
                    }

                </Animated.View>


                {currentProfile ? <ImageCarousel ref={imageCarouselRef} sections={mapArrayToDataObject(['placeholder', ...currentProfile.images!]) as any} viewToRender={carouselItem} /> : null}



                {currentProfile ? <View style={styles.profileContent}>
                    <View style={[layout.column]}>
                        <View style={[layout.row, { marginTop: 10, marginBottom: 20, alignItems: 'center', padding: 20 }]}>
                            {!editingMode ?
                                <TouchableOpacity style={layout.row} onPress={() => setEditingMode(true)}>
                                    <Icon name="edit" color={'rgb(34, 167, 240)'} size={20}></Icon>
                                    <Text style={[styles.text, { fontSize: 16, marginLeft: 8, color: 'rgb(34, 167, 240)' }]}>Edit Profile</Text>
                                </TouchableOpacity>
                                :
                                <TouchableOpacity style={layout.row} onPress={() => saveProfile()}>
                                    <Icon name="circle-notch" color={'rgb(242, 38, 19)'} size={20}></Icon>
                                    <Text style={[styles.text, { fontSize: 16, marginLeft: 8, color: 'rgb(242, 38, 19)' }]}>Save Profile</Text>
                                </TouchableOpacity>
                            }

                        </View>
                        <View style={[layout.row, { marginTop: 10, alignItems: 'center' }, layout.firstItemSection]}>


                            {editingMode ? <>
                                <View style={{ flex: .3, flexDirection: 'row' }}>
                                    <Icon name="map-marker-alt" color={"#AEB5BC"} size={20}></Icon>
                                    <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginLeft: 8 }]}>Based In</Text>
                                </View>

                                <PlacesInput
                                    placeHolder={currentProfile?.homeLocation.formatted_address}
                                    stylesInput={{
                                        // backgroundColor:'grey'
                                    }}
                                    stylesContainer={{
                                        position: 'relative',
                                        flex: .7,
                                        alignSelf: 'stretch',
                                        //    width:'90%',
                                        //     margin: 0,
                                        top: 0,
                                        //     left: 0,
                                        //     right: 0,
                                        //     bottom: 0,

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
                                        borderColor: '#dedede',
                                        borderLeftWidth: 1,
                                        borderRightWidth: 1,
                                        borderBottomWidth: 1,
                                        left: -1,
                                        right: -1
                                    }}
                                    queryFields={`formatted_address,geometry,name,address_components`}
                                    googleApiKey={'AIzaSyDcRpn_oyQUNlR4Wy370jCbJ0S0uy3hxqk'}

                                    onSelect={(place: any) => {
                                        onChangeHomeLocation({ formatted_address: place.result.name, location: place.result.geometry.location },
                                            place['result']['address_components'] ? place['result']['address_components'].find((comp: any) => comp['types'].includes('administrative_area_level_1')) : place['result']['name'])
                                    }
                                    }

                                />
                            </>
                                : <>
                                    <View style={{ flex: .4, flexDirection: 'row' }}>
                                        <Icon name="map-marker-alt" color={"#AEB5BC"} size={20}></Icon>
                                        <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginLeft: 8 }]}>Based In</Text>
                                        <Text style={[styles.text, { fontSize: 16, marginLeft: 8, color: "#52575D" }]}>
                                            {currentProfile?.homeLocation.formatted_address}
                                        </Text>
                                    </View>

                                </>
                            }

                        </View>
                    </View>
                    {/* places I want to Go */}
                    <View style={[layout.row, layout.itemSection]}>
                        <View style={[layout.column, { flex: 1 }]}>
                            <View style={[layout.row, { alignItems: 'center' }]}>
                                <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Planned trips</Text>
                                {editingMode ?
                                    <TouchableOpacity onPress={() => setAddingDestination('going')}>
                                        <Icon name="plus" color={"#AEB5BC"} size={20}></Icon>
                                    </TouchableOpacity>
                                    : null}
                            </View>

                            {/* TAG CLOUD */}
                            <View style={[layout.row, { flex: 1, marginVertical: 10, flexWrap: 'wrap' }]}>


                                {currentProfile?.placesToGo && currentProfile!.placesToGo.map((e) => {
                                    return <BubbleTag onSelect={() => { }} heading={e.formatted_address} >
                                        <Text style={[styles.text, { color: 'white' }]}>Arrival: {e.meta.arrival}</Text>
                                    </BubbleTag>
                                })}

                            </View>


                        </View>

                    </View>

                    {/* interests */}
                    <View style={[layout.row, layout.itemSection]}>
                        <View style={[layout.column, { flex: 1 }]}>
                            <View style={[layout.row, { alignItems: 'center' }]}>
                                <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}> Interests </Text>
                                <Icon name="hiking" color={"#AEB5BC"} size={18}></Icon>
                                {editingMode ?
                                    <TouchableOpacity onPress={() => setAddingInterests(true)}>
                                        <Icon name="plus" color={"#AEB5BC"} size={20}></Icon>
                                    </TouchableOpacity>
                                    : null}
                            </View>

                            {/* TAG CLOUD */}
                            <View style={[layout.row, { flex: 1, marginVertical: 10, flexWrap: 'wrap' }]}>


                                {currentProfile?.interests && currentProfile!.interests.map((e) => {
                                    return <BubbleTag onSelect={() => { }} heading={e.title} >

                                    </BubbleTag>
                                })}

                            </View>


                        </View>

                    </View>
                    <View style={[layout.row, layout.itemSection]}>
                        <View style={[layout.column, { width: '85%' }]}>
                            <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginBottom: 10 }]}>About Me</Text>

                            {editingMode ? <TextInput
                                multiline
                                // numberOfLines={4}
                                value={currentProfile?.bio}
                                maxLength={256}
                                onChangeText={onChangeBio}
                                style={[styles.text, { fontSize: 14, color: "#52575D", borderBottomColor: 'grey', borderBottomWidth: 1 }, styles.inputBox]}>

                            </TextInput> :
                                <Text style={[styles.text, { fontSize: 14, color: "#52575D" }]}>
                                    {currentProfile?.bio}
                                </Text>
                            }



                        </View>

                    </View>
                    {/*  */}
                    <View style={[layout.row, layout.itemSection]}>
                        <View style={[layout.column]}>
                            <View style={[layout.row, { marginBottom: 20, alignItems: 'center' }]}>

                                <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Languages</Text>
                                <Icon name="language" color={"#AEB5BC"} size={20}></Icon>

                            </View>
                            <View style={[layout.row]}>
                                {currentProfile && currentProfile.languages.map(l => {
                                    return editingMode ? <TouchableOpacity onLongPress={() => {
                                        setSelectedLanguage(l)
                                        setRemovingLanguage(true)
                                    }}>
                                        <View style={{ padding: 5, borderRadius: 5, backgroundColor: 'rgba(166,166,166,0.8)', marginRight: 9, paddingHorizontal: 25 }}>
                                            <Text style={[styles.text, { color: 'white' }]}>{l}</Text>
                                        </View>
                                    </TouchableOpacity> : <View style={{ padding: 5, borderRadius: 5, backgroundColor: 'rgba(166,166,166,0.8)', marginRight: 9, paddingHorizontal: 25 }}>
                                            <Text style={[styles.text, { color: 'white' }]}>{l}</Text>
                                        </View>
                                })}

                            </View>
                            {editingMode ? <View style={[layout.row, layout.full]}>
                                {/* Single */}
                                <SearchableDropdown
                                    onItemSelect={(item: any) => {
                                        const items = selectedLanguages
                                        setSelectedLanguages([...items, item])
                                        updateCurrentProfile({ ...currentProfile, ...{ languages: [...new Set([...currentProfile.languages, item.name])] } })
                                    }}
                                    containerStyle={{ padding: 0, width: '100%', marginTop: 5 }}
                                    onRemoveItem={(item: { id: any; }, index: any) => {
                                        const items = selectedLanguages.filter((sitem: { id: any; }) => sitem.id !== item.id);
                                        setSelectedLanguages([...items])
                                    }}
                                    itemStyle={{
                                        padding: 10,
                                        marginTop: 2,
                                        backgroundColor: 'rgba(166,166,166,0.1)',
                                        borderBottomColor: '#bbb',
                                        borderBottomWidth: 1,
                                        borderRadius: 5,
                                    }}
                                    itemTextStyle={{ color: '#222' }}
                                    itemsContainerStyle={{ maxHeight: 140 }}
                                    items={items}
                                    defaultIndex={2}
                                    resetValue={false}
                                    textInputProps={
                                        {
                                            placeholder: "placeholder",
                                            underlineColorAndroid: "transparent",
                                            style: {
                                                padding: 12,
                                                borderWidth: 1,
                                                borderColor: '#ccc',
                                                borderRadius: 5,

                                            },
                                            onTextChange: (text: any) => { }
                                        }
                                    }
                                    listProps={
                                        {
                                            nestedScrollEnabled: true,
                                        }
                                    }
                                />
                            </View>
                                : null}

                        </View>
                    </View>
                    <View style={[layout.row, layout.itemSection]}>
                        <View style={[layout.column, { flex: 1 }]}>

                            <View style={[layout.row, { alignItems: 'center' }]}>
                                <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Places I've Been</Text>
                                {editingMode ?
                                    <TouchableOpacity onPress={() => setAddingDestination('been')}>
                                        <Icon name="plus" color={"#AEB5BC"} size={20}></Icon>
                                    </TouchableOpacity>
                                    : null}
                            </View>
                            {/* TAG CLOUD */}
                            <View style={[layout.row, { flex: 1, marginVertical: 10, flexWrap: 'wrap' }]}>

                                {currentProfile?.placesBeen && ["Gibraltar,Gibraltar", "Kansas,Texas", "Croatia,Zalgreb"].map((e) => {
                                    return <BubbleTag onSelect={() => { }} heading={e} >
                                        <Text style={[styles.text, { color: 'white' }]}>Dates usually show up here</Text>
                                    </BubbleTag>
                                })}

                                {currentProfile?.placesToGo && currentProfile!.placesBeen.map((e) => {
                                    return <BubbleTag onSelect={() => { }} heading={e.formatted_address} >
                                        <Text style={[styles.text, { color: 'white' }]}>Arrival: {e.meta.arrival}</Text>
                                    </BubbleTag>
                                })}

                            </View>
                            {editingMode ?
                                <View style={[layout.row]}>
                                    {/* plus button */}
                                </View>

                                :
                                null
                            }

                        </View>

                    </View>


                </View>
                    : null
                }
                {/* Height */}
                <View style={[layout.row, layout.itemSection]}>
                    <View style={[layout.column]}>
                        <View style={[layout.row, { marginBottom: 20, alignItems: 'center' }]}>

                            <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Height</Text>
                            <Icon name="ruler" color={"#AEB5BC"} size={20}></Icon>
                        </View>
                        <View style={[layout.row, { marginBottom: 20 }]}>
                            {editingMode ? <>
                                <TouchableOpacity onPress={() => setVisible(true)}>
                                    <View style={{ padding: 5, borderRadius: 20, borderColor: '#0F29AC', borderWidth: 1, marginRight: 9, paddingHorizontal: 25 }}>
                                        <Text style={styles.text}>{currentProfile && `${toFeet(currentProfile.height).feet}'${toFeet(currentProfile!.height).inches}"`}</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setVisible(true)}>
                                    <View style={{ padding: 5, borderRadius: 20, borderColor: '#4527B4', borderWidth: 1, paddingHorizontal: 25 }}>
                                        <Text style={styles.text}>{currentProfile && currentProfile.height} CM</Text>
                                    </View>
                                </TouchableOpacity>
                            </>
                                : <>
                                    <View style={{ padding: 5, borderRadius: 20, borderColor: '#0F29AC', borderWidth: 1, marginRight: 9, paddingHorizontal: 25 }}>
                                        <Text style={styles.text}>{currentProfile && `${toFeet(currentProfile.height).feet}'${toFeet(currentProfile!.height).inches}"`}</Text>
                                    </View>
                                    <View style={{ padding: 5, borderRadius: 20, borderColor: '#4527B4', borderWidth: 1, paddingHorizontal: 25 }}>
                                        <Text style={styles.text}>{currentProfile && currentProfile.height} CM</Text>
                                    </View>
                                </>
                            }


                        </View>
                        <Floater
                            isVisible={visible}
                            onBackdropPress={() => setVisible(false)}
                            style={{
                                flex: 1,
                                flexDirection: 'column',
                                // alignItems: 'flex-end'
                            }}
                        >
                            <View style={[layout.row, { justifyContent: 'center', alignContent: 'center', alignItems: 'center' }]}>
                                <HeightSelector onSelect={onSelectNewHeight}></HeightSelector>
                            </View>


                        </Floater>



                    </View>
                </View>
                {/* Preferred Name */}
                <View style={[layout.row, layout.itemSection]}>
                    <View style={[layout.column,]}>
                        <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Preferred Name</Text>

                      {editingMode ?  
                      <TextInput
                            //  onFocus={handleFocus}
                            //  onBlur={handleBlur}
                            style={[styles.input, { borderBottomColor: '#888888' }]}
                            // mode="outlined"
                            // label="Email Address"
                            placeholder={"Johnny Cash"}
                            value={currentProfile ? currentProfile!.preferredName : ''}

                            onChangeText={(txt: string) => updateCurrentProfile({ ...currentProfile!, preferredName: txt })}
                            // theme={inputTheme}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                      /> :

                      <Text style={[styles.text, { color: "black", fontSize: 16, marginRight: 10,marginTop:10, }]}>{currentProfile && currentProfile!.preferredName}</Text>
                      }
                    </View>
                </View>
                      {/* Preferred Name */}
                      <View style={[layout.row, layout.itemSection]}>
                    <View style={[layout.column,]}>
                        <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Job Title</Text>

                      {editingMode ?  
                      <TextInput
                            //  onFocus={handleFocus}
                            //  onBlur={handleBlur}
                            style={[styles.input, { borderBottomColor: '#888888' }]}
                            // mode="outlined"
                            // label="Email Address"
                            placeholder={"CEO"}
                            value={currentProfile ? currentProfile!.jobTitle : ''}

                            onChangeText={(txt: string) => updateCurrentProfile({ ...currentProfile!, jobTitle: txt })}
                            // theme={inputTheme}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                      /> :

                      <Text style={[styles.text, { color: "black", fontSize: 16, marginRight: 10,marginTop:10, }]}>{currentProfile && currentProfile!.jobTitle}</Text>
                      }
                    </View>
                </View>
                      {/* Preferred Name */}
                      <View style={[layout.row, layout.itemSection]}>
                    <View style={[layout.column,]}>
                        <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Company</Text>

                      {editingMode ?  
                      <TextInput
                            //  onFocus={handleFocus}
                            //  onBlur={handleBlur}
                            style={[styles.input, { borderBottomColor: '#888888' }]}
                            // mode="outlined"
                            // label="Email Address"
                            placeholder={"Facebook"}
                            value={currentProfile ? currentProfile!.company : ''}

                            onChangeText={(txt: string) => updateCurrentProfile({ ...currentProfile!, company: txt })}
                            // theme={inputTheme}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                      /> :

                      <Text style={[styles.text, { color: "black", fontSize: 16, marginRight: 10,marginTop:10, }]}>{currentProfile && currentProfile!.company}</Text>
                      }
                    </View>
                </View>
                      {/* Preferred Name */}
                      <View style={[layout.row, layout.itemSection]}>
                    <View style={[layout.column,]}>
                        <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>School</Text>

                      {editingMode ?  
                      <TextInput
                            //  onFocus={handleFocus}
                            //  onBlur={handleBlur}
                            style={[styles.input, { borderBottomColor: '#888888' }]}
                            // mode="outlined"
                            // label="Email Address"
                            placeholder={"Yale"}
                            value={currentProfile ? currentProfile!.school : ''}

                            onChangeText={(txt: string) => updateCurrentProfile({ ...currentProfile!, school: txt })}
                            // theme={inputTheme}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                      /> :

                      <Text style={[styles.text, { color: "black", fontSize: 16, marginRight: 10,marginTop:10, }]}>{currentProfile && currentProfile!.school}</Text>
                      }
                    </View>
                </View>
            </ScrollView>



        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF"
    },
    text: {
        fontFamily: "Open Sans",
        color: "#52575D"
    },
    main: {
        paddingTop: 0,
        flex: 1,
        position: 'relative',
        marginBottom: 25,

    },
    bio: {
        flexDirection: 'row',
        textAlign: 'center',
        marginTop: 32,
        alignSelf: 'center',
        paddingHorizontal: 20,
    },
    profileContent: {
        flex: 1,
        flexDirection: 'column',
        // paddingHorizontal: 20,
        paddingTop: 20,
        marginTop: 10
    },
    info: {
        flex: 0,
        zIndex: 1,
        position: 'absolute',
        bottom: 0,
        flexDirection: 'column',
        height: 75,
        width: '100%',
        alignItems: 'flex-start',
        // paddingTop: 30,
        paddingLeft: 20,
        // borderRadius: 8,s




        // marginTop
    },
    infoText: {
        color: 'white',
        fontFamily: 'Open Sans',
        fontSize: 24
    },

    image: {
        flex: 1,
        height: undefined,
        width: undefined,
        resizeMode: 'cover'
    },
    titleBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 24,
        marginHorizontal: 16
    },
    inputBox: {
        // borderTopColor: 'transparent',
        // borderLeftWidth: 0,
        // borderRightWidth: 0,
        minHeight: 100,
        marginVertical: 20,
        fontSize: 14,
        padding: 10,
        paddingHorizontal: 5,
        fontFamily: 'Open Sans',
        // backgroundColor:'white',
        borderColor: '#888888',
        borderWidth: .3,
        borderRadius: 8,
        // overflow:'hidden'
    },
    mainInfo: {
        color: "#52575D",
        fontFamily: 'Open Sans',
        fontSize: 28
    },
    subText: {
        fontSize: 12,
        color: "#AEB5BC",
        textTransform: "uppercase",
        fontWeight: "500"
    },
    profileImage: {
        width: 200,
        height: 200,
        borderRadius: 100,
        overflow: "hidden"
    },
    dm: {
        backgroundColor: "#41444B",
        position: "absolute",
        top: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center"
    },
    stage: {
        width: '100%',
        backgroundColor: 'transparent',
        height: Dimensions.get('screen').width * .75,
        // top:0,
        // overflow:'hidden'
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
    screen: {
        width: '100%',
        backgroundColor: 'transparent',
        height: '100%',
        zIndex: 1,
        flexDirection: 'column',
        position: 'absolute'
    },
    active: {
        backgroundColor: "#34FFB9",
        position: "absolute",
        bottom: 28,
        left: 10,
        padding: 4,
        height: 20,
        width: 20,
        borderRadius: 10
    },
    infoContainer: {
        alignSelf: "center",
        alignItems: "center",
        marginTop: 16
    },
    statsContainer: {
        flexDirection: "row",
        alignSelf: "center",
        marginTop: 32
    },
    statsBox: {
        alignItems: "center",
        flex: 1
    },
    mediaImageContainer: {
        width: 96,
        height: 96,
        borderRadius: 1,
        overflow: "hidden",
        zIndex: 0,


    },
    add: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageSelected: {
        overflow: "visible",
        zIndex: 9,
        borderWidth: 1,
        borderColor: 'black',
        borderStyle: 'solid',
        shadowColor: "black",
        // borderRadius: 6,
        // backgroundColor: 'white',
        shadowOpacity: .15,
        shadowRadius: 30,

        elevation: 4,
        shadowOffset: {
            height: 10,
            width: 10
        }
    },

    mediaCount: {
        backgroundColor: "#41444B",
        position: "absolute",
        top: "50%",
        marginTop: -50,
        marginLeft: 30,
        width: 100,
        height: 100,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        shadowColor: "rgba(0, 0, 0, 0.38)",
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        shadowOpacity: 1
    },
    recent: {
        marginLeft: 78,
        marginTop: 32,
        marginBottom: 6,
        fontSize: 10
    },
    recentItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16
    },
    activityIndicator: {
        backgroundColor: "#CABFAB",
        padding: 4,
        height: 12,
        width: 12,
        borderRadius: 6,
        marginTop: 3,
        marginRight: 20
    },
    modalContainer: {
        backgroundColor: '#2200001C',
        flex: 1,
        justifyContent: 'flex-end'
    },
    modalWrapper: {
        paddingHorizontal: 30,
        paddingVertical: 10
    },
    warning: {
        fontSize: 12,
        fontFamily: 'Open Sans',
        textAlign: 'center'
    },
    actionWrapper: {
        flexDirection: 'row',
    },
    actionButton: {
        width: '50%',
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    actionText: {
        fontSize: 14,
        fontFamily: 'Open Sans'
    }
});


const DeleteButtonView = posed.View({
    enter: {
        y: 0, opacity: 1,
        transition: {
            type: 'spring',
            useNativeDriver: true
        }
    },
    exit: { y: 380, opacity: 0 }
});

export default Profile