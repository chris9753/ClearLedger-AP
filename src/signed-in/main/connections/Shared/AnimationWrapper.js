import React from "react";
import { Animated } from "react-native";

const AnimationWrapper = ({scrollY,children}) => {
    
    return (
      <Animated.ScrollView  
       scrollEventThrottle={16}
       onScroll={Animated.event(
        [{ nativeEvent : { contentOffset : 
           { y : scrollY }}}],
           { useNativeDrive : true }
        )} style={{flex:1}}
       >
       { children }
      </Animated.ScrollView>
    );
}

export default AnimationWrapper