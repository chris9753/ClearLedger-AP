import { Dimensions,StyleSheet } from "react-native";
import theme from '../theme'
let deviceHeight = Dimensions.get('window').height
export default StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
  
    },
    cta: {
      marginTop:25
    },
    itemSection: {
      borderBottomColor:'#A6A6A6',
      borderBottomWidth:1, 
      padding:20,
    },
    firstItemSection:{
      borderBottomColor:'#A6A6A6',
      borderBottomWidth:1, 
      borderTopColor:'#A6A6A6',
      borderTopWidth:1,
      padding:20
    },

    row: {
        backgroundColor:"transparent",
      flexDirection: 'row'
    },
    full: {
      width:'100%'
    },
    warning: {
      fontSize:10,
      color:theme.colors.light.text.warning,
      fontFamily:'Montserrat',
      textAlign: 'center'
    },
    info: {
        fontSize:12,
        color:theme.colors.light.text.heading,
        fontFamily:'Montserrat',
        textAlign: 'center'
      },
    
    column: {
      flexDirection: 'column'
    },
    header: {
      marginBottom: 15
    },
    wordBox: {
        marginVertical:40
    },
    warningBox:{
        marginTop:10
    },
    heading: {
      fontFamily: 'Open Sans',
      fontSize: 24,
      textAlign: 'center',
      color: theme.colors.light.text.title
    },
    main: {
      overflow: 'visible',
      backgroundColor: 'white',
      alignItems: 'center',
      marginTop: (deviceHeight * .09) + 50,
      marginHorizontal: deviceHeight * .05,
      // marginBottom: deviceHeight * .7
    }
  });