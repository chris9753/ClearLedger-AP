import { Profile } from "../profiles/model";
import { Chat,message } from "./model";
import auth from '@react-native-firebase/auth'
import { firebase } from '@react-native-firebase/functions';
export class ChatService {
    public getMessagesFor(id: string): any {
      return this.chats.find(chat => chat.id == id)?.messages
    }
    public async sendMessage(id: string,text:string) {
        try {
               let result = await firebase.functions().httpsCallable('sendMessage')({
                    id,
                    text,
                  });
                return result
            } catch (e) {
                throw(e)
            }
    }
    profiles:Profile[]
    chats:Chat[]
  
    constructor(profiles:Profile[] = [],chats:Chat[]){
        this.profiles = profiles;
        this.chats = chats;
    }
    public findChatFromUser (id:string) {
        return this.chats.find(chat => chat.users.includes(id))
    }
    public getOtherUserProfile(id:string) {
        const me = auth().currentUser?.uid
        let otherUID = this.chats.find(chat => chat.id == id)?.users.find( user => user != me)
        if(otherUID) {
            return this.profiles.find(profile => profile.uid == otherUID)
        }
        return null
    }
    public sentByMe(message:message) {
        const me = auth().currentUser?.uid
        return message.author == me
    }
}