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
interface Props {
  theme: Theme;
  route: any;
  navigation: NavigationParams;
}


function publicProfile({ theme, route, navigation }: Props) {
  const { user } = route.params
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
        <View style={[layout.column]}>
          <Text style={styles.mainInfo}>{user.name}, {user.age}</Text>
          <View style={[layout.row, { marginTop: 10, alignItems: 'center' }]}>
            <Icon name="map-marker-alt" color={"#AEB5BC"} size={20}></Icon>
            <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginLeft: 8 }]}>Based In</Text>
            <Text style={[styles.text, { fontSize: 16, marginLeft: 8, color: "#52575D" }]}>
              {user.basedIn}
            </Text>
          </View>
        </View>
        <View style={[layout.row, { marginTop: 50 }]}>
          <View style={[layout.column]}>
            <Text style={[styles.text, { color: "#AEB5BC", fontSize: 16, marginBottom: 10 }]}>About Me</Text>
            <Text style={[styles.text, { fontSize: 14, color: "#52575D" }]}>
              {user.bio}
            </Text>
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