export type userAt = { 'at':any,'user':string} 
export interface connection {
    at:any;
    user:string;
    chat:string;
}
export interface Connection {
    id?:string;
    chat?:string;
    connections:connection[];
    unmatched:userAt[];
    disliked:userAt[];

}



