import React, { Component } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {colors} from '../res/style/colors'
import Icon from './Icon'
//Swipe example..if you want to use this just warp up with <SwipeList>{children}</SwipeList>
export default class SwipeList extends Component {
  
  renderRightAction = (name, color, x, size, progress,onPress) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [x, 0],
    });
   
    return (
      <Animated.View style={[styles.iconWrapper,{ transform: [{ translateX: trans }] }]}>
        <TouchableOpacity activeOpacity={.8}
          style={[styles.rightAction, {borderWidth : 1, borderColor : color }]}>
          <Icon name={name} onPress={onPress} color={color} size={size} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  renderRightActions = progress => (
    
    <View style={{ width: 261, flexDirection: 'row' }}>
      {this.renderRightAction('delete', '#ED5252',  261, 20,progress,this.props.onDelete)}
      {this.renderRightAction('call', colors.primary, 174,20, progress,this.props.onCall)}
      {this.renderRightAction('video', colors.primary, 87,14, progress,this.props.onVideoCall)}
    </View>
  );

  updateRef = ref => {
    this._swipeableRow = ref;
  };
  close = () => {
    this._swipeableRow.close();
  };
  render() {
    const { children } = this.props;
  
    return (
      <Swipeable
        ref={this.updateRef}
        friction={2}
        rightThreshold={60}
        renderRightActions={this.renderRightActions}>
        {children}
      </Swipeable>
    );
  }
}

const ICON_BACK_SIZE = 50

const styles = StyleSheet.create({
  iconWrapper : { 
    backgroundColor:'#F8F8F8',
    borderRightWidth : .4,
    borderRightColor : colors.grey,
    borderBottomColor : colors.grey,
    borderBottomWidth : .4,
    justifyContent : 'center',
    alignItems : 'center',
    padding : 20
  },
  rightAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width : ICON_BACK_SIZE,
    height : ICON_BACK_SIZE,
    borderRadius : ICON_BACK_SIZE/2,
    borderStyle : 'dashed',
  },
});