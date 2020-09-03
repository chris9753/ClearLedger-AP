import { Profile } from "../profiles/model";
import { firebase } from '@react-native-firebase/functions';
import auth from '@react-native-firebase/auth'
export class ProfileService {
    profile:Profile | null

    constructor(profile = null){
        this.profile = profile
    }

    profileSetupStage () {
        let currentStage = 1;
        if(this.profile && auth().currentUser?.emailVerified){
            if(this.profile.homeLocation) currentStage = 2
        } else { 
            return 0
        }
    
    return currentStage

}
}
