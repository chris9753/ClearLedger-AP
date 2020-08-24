import {DefaultTheme} from 'react-native-paper';

export const colors = {
  "dark": {
    primary: '#FD6738',
    secondary:'#F11856',
    accent: '#4DD7C4',
    text: { 
      title: "#FD6738",
      heading: "#FFF",
      warning:"#C8C7C7"
    },
    background: '#110822',
  },
  "light": {
    primary: '#FD6738',
    secondary:'#F11856',
    accent: '#0F29AC',
    text: { 
      title: "#082246",
      heading: "#535353",
      warning:"#C8C7C7"
    },
    background: '#fff',
  }
}

export default {
  dark: false,
  roundness: 3,
  colors: colors
};

export const paperTheme  = {
  ...DefaultTheme,
  dark: false,
  roundness: 3,
  colors: {
    ...DefaultTheme.colors,
    primary: '#009688',
    accent: '#fff',
    background: '#fff',
  },
}