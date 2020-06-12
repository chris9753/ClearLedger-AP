export interface message {
    at:any,
    "seen":boolean,
    "text":string,
    "author":string
}

export interface Chat {
    id?:string
    author:string;
    users:string[];
    opened?:boolean;
    messages:message[]
}