import React, { Fragment, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle, Animated ,Alert, ScrollView, TextInput, Image} from 'react-native';
import { TouchableOpacity, TapGestureHandler, TouchableWithoutFeedback} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useCountRenders } from '../../util/performance';
import layout from '../../signed-out/layout';
// @ts-ignore
import PlacesInput from 'react-native-places-input'
import GlobalTheme from '../../theme'
import { Profile as ProfileType, Image as ProfileImageType, Location } from '../../entities/profiles/model'
import CustomButton from '../../components/CustomButton';
import {sample} from 'lodash'
import LinearGradient from 'react-native-linear-gradient';
import { useProfile } from '../../util/firebase';

interface Props {
    finished:(dataObject:any) => void
}

const INTERESTS = [
    {title:"cooking",image:""},
    {title:"movies",image:""},
    {title:"sports",image:""},
    {title:"gambling",image:""},
    {title:"adventure",image:""},
    {title:"hiking",image:""},
    {title:"sowing",image:""},
    {title:"eating",image:""},
    {title:"gluttony",image:""},
    {title:"Star Wars",image:""},
    {title:"Richard Gere",image:""},
    {title:"cars",image:""},
    {title:"fishing",image:""},
    {title:"camping",image:""},
    {title:"reading",image:""}
]
function Interests ({finished}:Props) {
    const [spinnerloading, setLoading] = useState<boolean>(false);
    const [selectedInterests,setSelectedInterests] = useState([]) as any
    const [currentProfile, updateCurrentProfile] = useState<ProfileType | null>(null)
    const {profile,loading,error} = useProfile()
    let colors  = ['#007551','#00BE80','#6026BC','#ABABAB','#A51B5E']

    useEffect(()=>{
        if(profile) {
            updateCurrentProfile(profile)
            setSelectedInterests(profile.interests)
        }
     },[loading])
     const submit =() =>{
         setLoading(true)
         finished({interests:selectedInterests})
     }
    const Tiles = () => {
        return <View style={styles.sectionContainer}>
            {INTERESTS.map(interest => {
              let selected = !!(selectedInterests.length && selectedInterests.find((x:any) => x.title == interest.title))
              console.log('selected',selected,selectedInterests)
                return <TouchableWithoutFeedback onPress={()=> {
                  if(!selected) setSelectedInterests([...new Set([...selectedInterests,interest])])
                  if(selected) setSelectedInterests(selectedInterests.filter((x:any) => x.title !== interest.title))
                } }  key={interest.title} style={[{width:100,height:150,backgroundColor:sample(colors),marginVertical:4,marginHorizontal:4,borderRadius:4,display:'flex',justifyContent:'center',alignContent:'center',alignItems:'center'}]}>
                    <View style={[layout.column,{alignItems:'center'}]}>
                    {selected ? <Icon name="check" color={"green"} size={20}></Icon> : null}
                    <Text style={{fontFamily:'Montserrat',fontSize:14,color:'white'}}>{interest.title}</Text>
                    </View>
                    </TouchableWithoutFeedback>
            })}
        </View>
    }
    return <View style={[layout.main, styles.contentArea,{justifyContent:'flex-start'}]}>
    <View style={[layout.row, layout.header,{marginBottom:30}]}>
<View style={layout.column}>
 <Text style={layout.heading}>
   Select your interests
 </Text>
</View>
</View>
<View style={[layout.wordBox,{marginVertical:20}]}>


<View style={layout.column}>
  <Text style={layout.info}>

    Select as many as you like. We'll use these to match with others who share your interests.

  </Text>
</View>
</View>
<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{overflow:'visible'}} keyboardShouldPersistTaps="always" style={[styles.main]}>
    {Tiles()}
    </ScrollView>
    <LinearGradient colors={['rgba(255,255,255,1)', 'rgba(255,255,255,.55)', 'rgba(255,255,255,0.7189250700280112)']} style={styles.info}>
    <View style={[layout.full]}>
    <CustomButton
      textColor={'#fff'}
      color={'#0A0F3D'}
      solid={true}
      loading={false}
      onPress={submit}
      disabled={selectedInterests.length < 3}
    >
      {selectedInterests.length < 3 ?  'Please select some interests' : 'Finish Adding'}
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
      main: {
        paddingTop: 0,
        flex: 1,
        position: 'relative',
        marginBottom: 125,

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
export default Interests
