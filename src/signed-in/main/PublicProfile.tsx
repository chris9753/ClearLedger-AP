import React, { Fragment, useMemo, useRef, useState, useEffect, useLayoutEffect, useReducer } from 'react';
import { Image, SafeAreaView, StyleSheet, View, ViewStyle, Platform, StatusBar, Animated, PanResponder, Dimensions, Text, UIManager, LayoutAnimation, TouchableOpacity, ScrollView } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import theme from '../../theme';
import { useCountRenders } from '../../util/performance';
import LinearGradient from 'react-native-linear-gradient';
import { withTheme, Theme } from 'react-native-paper';
import { NavigationParams } from 'react-navigation';
import { RouteProp } from '@react-navigation/core';
import Hero from '../../components/Hero'
import GlobalTheme from '../../theme'
import Icon from 'react-native-vector-icons/FontAwesome5';
import { FAB } from 'react-native-paper';
import layout from '../../signed-out/layout';
import ImageGallery from '../../components/ImageGallery';
import { Profile as ProfileType, Image as ProfileImageType, Location } from '../../entities/profiles/model'
import BubbleTag from '../../components/BubbleTag';
interface Props {
  theme: Theme;
  route: any;
  navigation: NavigationParams;
}


function publicProfile({ theme, route, navigation }: Props) {
  const { user } = route.params
  const profile:ProfileType = user
  function toFeet(cm: number) {
    let totalInches = (cm * 0.393700);
    let inches = Math.round(totalInches % 12);
    let feet = Math.floor(totalInches / 12);

    if (inches === 12) {
        feet += 1; inches = 0;
    }
    return { feet, inches };
}
  return <Fragment>
    <SafeAreaView style={styles.content}>
      <Animated.View style={styles.stage}>
        {/* <TouchableOpacity style={styles.fab}> */}
        <FAB
          style={styles.fab}
          icon="arrow-downward"
          onPress={() => navigation.goBack()}
        />
        {/* <Icon name="arrow-circle-down"  color={GlobalTheme.colors.light.secondary} size={32} /> */}
        {/* </TouchableOpacity> */}
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.5)']} style={styles.coverPhoto}></LinearGradient>
        <ImageGallery images={user.images}></ImageGallery>
      </Animated.View>
      <ScrollView showsVerticalScrollIndicator={false} style={[styles.main]}>
        <View style={[layout.column,layout.itemSection,{borderBottomWidth:0,paddingLeft:0}]}>
          <Text style={[styles.mainInfo,{marginBottom:10}]}>{user.preferredName ? user.preferredName :user.name}, {user.age}</Text>
          <View style={[layout.row, { marginTop: 10, alignItems: 'center' }]}>
            <Icon name="map-marker-alt" color={"#AEB5BC"} size={20}></Icon>
            <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginLeft: 8 }]}>Based In</Text>
            <Text style={[styles.text, { fontSize: 16, marginLeft: 8, color: "#52575D" }]}>
              {user.homeLocation.formatted_address}
            </Text>
          </View>
          <View style={[layout.row, { marginTop: 10, alignItems: 'center' }]}>
            <Icon name="briefcase" color={"#AEB5BC"} size={20}></Icon>
<Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginLeft: 8 }]}>{user.jobTitle} @</Text>
            <Text style={[styles.text, { fontSize: 16, marginLeft: 8, color: "#52575D" }]}>
              {user.company}
            </Text>
          </View>
        </View>
       {/* places I want to Go */}
       <View style={[layout.row, layout.itemSection,{borderBottomWidth:0,paddingLeft:0}]}>
                        <View style={[layout.column, { flex: 1 }]}>
                            <View style={[layout.row, { alignItems: 'center' }]}>
                                <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Planned trips</Text>
                              
                            </View>

                            {/* TAG CLOUD */}
                            <View style={[layout.row, { flex: 1, marginVertical: 10, flexWrap: 'wrap' }]}>


                                {profile.placesToGo!.map((e:any) => {
                                    return <BubbleTag onSelect={() => { }} heading={e.formatted_address} >
                                        <Text style={[styles.text, { color: 'white' }]}>Arrival: {e.meta.arrival}</Text>
                                    </BubbleTag>
                                })}

                            </View>


                        </View>

                    </View>
                    <View style={[layout.row, layout.itemSection,{borderBottomWidth:0,paddingLeft:0}]}>
                        <View style={[layout.column, { width: '85%' }]}>
                            <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginBottom: 10 }]}>About Me</Text>

     
                                <Text style={[styles.text, { fontSize: 14, color: "#52575D" }]}>
                                    {user.bio}
                                </Text>
                            



                        </View>

                    </View>
                     {/* places I want to Go */}
       <View style={[layout.row, layout.itemSection,{borderBottomWidth:0,paddingLeft:0}]}>
                        <View style={[layout.column, { flex: 1 }]}>
                            <View style={[layout.row, { alignItems: 'center' }]}>
                                <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Interests</Text>
                                <Icon name="walking" color={"#AEB5BC"} size={18}></Icon>
                            </View>

                            {/* TAG CLOUD */}
                            <View style={[layout.row, { flex: 1, marginVertical: 10, flexWrap: 'wrap' }]}>


                                {profile.interests!.map((e:any) => {
                                    return <BubbleTag onSelect={() => { }} heading={e.title} >

                                    </BubbleTag>
                                })}

                            </View>


                        </View>

                    </View>
                    {/*  */}
                    <View style={[layout.row, layout.itemSection,{borderBottomWidth:0,paddingLeft:0}]}>
                        <View style={[layout.column]}>
                            <View style={[layout.row, { marginBottom: 20, alignItems: 'center' }]}>

                                <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Languages</Text>
                                <Icon name="language" color={"#AEB5BC"} size={20}></Icon>

                            </View>
                            <View style={[layout.row]}>
                                {profile.languages.map((l: any) => {
                                        return <View style={{ padding: 5, borderRadius: 5, backgroundColor: 'rgba(166,166,166,0.8)', marginRight: 9, paddingHorizontal: 25 }}>
                                        <Text style={[styles.text, { color: 'white' }]}>{l}</Text>
                                    </View>
                                }) }
                               
                            </View>
                            
                        </View>
                    </View>
                    <View style={[layout.row, layout.itemSection,{borderBottomWidth:0,paddingLeft:0}]}>
                        <View style={[layout.column, { flex: 1 }]}>

                            <View style={[layout.row, { alignItems: 'center' }]}>
                                <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Places I've Been</Text>
                            </View>
                            {/* TAG CLOUD */}
                            <View style={[layout.row, { flex: 1, marginVertical: 10, flexWrap: 'wrap' }]}>

                                {profile.placesBeen && ["Gibraltar,Gibraltar", "Kansas,Texas", "Croatia,Zalgreb"].map((e) => {
                                    return <BubbleTag onSelect={() => { }} heading={e} >
                                        <Text style={[styles.text, { color: 'white' }]}>Dates usually show up here</Text>
                                    </BubbleTag>
                                })}

                                {profile.placesBeen.map((e:any) => {
                                    return <BubbleTag onSelect={() => { }} heading={e.formatted_address} >
                                        <Text style={[styles.text, { color: 'white' }]}>Arrival: {e.meta.arrival}</Text>
                                    </BubbleTag>
                                })}

                            </View>
                          

                        </View>

                    </View>


           
  
                {/* Height */}
                <View style={[layout.row, layout.itemSection,{borderBottomWidth:0,paddingLeft:0}]}>
                    <View style={[layout.column]}>
                        <View style={[layout.row, { marginBottom: 20, alignItems: 'center' }]}>

                            <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginRight: 10 }]}>Height</Text>
                            <Icon name="ruler" color={"#AEB5BC"} size={20}></Icon>
                        </View>
                        <View style={[layout.row, { marginBottom: 20 }]}>
                           
                                    <View style={{ padding: 5, borderRadius: 20, borderColor: '#0F29AC', borderWidth: 1, marginRight: 9, paddingHorizontal: 25 }}>
                                        <Text style={styles.text}>{profile && toFeet(profile.height).feet} Feet</Text>
                                    </View>
                                    <View style={{ padding: 5, borderRadius: 20, borderColor: '#4527B4', borderWidth: 1, paddingHorizontal: 25 }}>
                                        <Text style={styles.text}>{profile && toFeet(profile.height).inches} Inches</Text>
                                    </View>


                        </View>
                   



                    </View>
                    </View>
      </ScrollView>
    </SafeAreaView>

  </Fragment>


}
const styles = StyleSheet.create({
  content: {
    position: 'relative',
    flex: 1,
  },
  stage: {
    width: '100%',
    backgroundColor: 'transparent',
    height: '40%',
    // top:0,
    // overflow:'hidden'
  },
  main: {
    // marginTop:'-15%',
    paddingTop: 20,
    paddingHorizontal: 20,
    flex: 1,
    position: 'relative'

  },
  mainInfo: {
    color: "#52575D",
    fontFamily: 'Open Sans',
    fontSize: 28
  },
  text: {
    fontFamily: 'Open Sans',
  },
  coverPhoto: {
    flex: 1,
    zIndex: 1,
    position: 'absolute',
    // bottom:0,
    // left:10,
    // right:10,
    // left:0,
    // right:0,
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    overflow: 'hidden'
  },
  fab: {
    position: 'absolute',
    zIndex: 3,
    right: '10%',
    elevation: 1,
    opacity: 1,
    // top:'70%',
    bottom: -25,
    // backgroundColor:theme.colors.light.secondary
    backgroundColor: '#41444B'

  },
  image: {
    flex: 1,
    alignSelf: 'stretch',
    height: undefined,
    width: undefined,
    // borderRadius: 20,
    // top:'-20%',
    resizeMode: 'cover',
  }
})
export default withTheme(publicProfile)