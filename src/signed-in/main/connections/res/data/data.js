const chatUsers = [
    {
        id: 2,
        name: "Katharina",
        avatar: "http://tiny.cc/women2",
        chatId: 11,
        isOnline : true,
    },
    {
        id: 1,
        name: "Marcie",
        avatar: "http://tiny.cc/women4",
        chatId: 10,
        isOnline : true,
    },
    {
        id: 3,
        name: "Leon",
        avatar: "http://tiny.cc/men1",
        chatId: 12,
        isOnline : false,
    },
    {
        id: 4,
        name: "Tyron",
        avatar: "http://tiny.cc/men3",
        chatId: 13,
        isOnline : true,
    },
    {
        id: 5,
        name: "Gloria",
        avatar: "http://tiny.cc/women1",
        chatId: 14,
        isOnline : false,
    },
    {
        id: 6,
        name: "Nicky",
        avatar: "http://tiny.cc/men4",
        chatId: 15,
        isOnline : true,
    },
    
]

const chatDetails = [
    {
        id: 10,
        userId: 1,
        isOnline : true,
        messages: [
            {
                id: 1020,
                type:"RECIEVE",
                text: "Hi, I am Marcie",
                time: "11:23 am",
                messageType : 'TEXT'
            },
            {
                id: 1022,
                type:"SEND",
                text: "ohh!! Hi, long time",
                time: "1:18 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1023,
                type:"RECIEVE",
                text: "Yeah, I was busy with some work",
                time: "1:20 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1024,
                type:"SEND",
                text: "Nice 💪 ",
                time: "1:21 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1025,
                type:"SEND",
                text: "You working again?",
                time: "1:21 pm",
                messageType : 'TEXT'
            },
            {
                id: 1026,
                type:"RECIEVE",
                text: "Not really 😅",
                time: "1:21 pm",
                messageType : 'TEXT'
            },
            {
                id: 1027,
                type:"SEND",
                text: "500",
                time: "1:21 pm",
                messageType : 'MONEY'
            },
            {
                id: 1028,
                type:"SEND",
                text: "Hello my Image",
                time: "1:28 pm",
                messageType : 'GALLERY',
                uri : 'http://tiny.cc/women2'
            },
        ],
        
    },
    {
        id: 11,
        userId: 2,
        isOnline : true,
        messages: [
            {
                id: 1122,
                type:"SEND",
                text: "Hi",
                time: "8:21 am",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1123,
                type:"RECIEVE",
                text: "Hi? Who's this?",
                time: "11:34 am",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1124,
                type:"SEND",
                text: "I am Genius Coders.. 😃",
                time: "12:56 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1125,
                type:"SEND",
                text: "Do you code in React-Native, right?",
                time: "12:56 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1126,
                type:"RECIEVE",
                text: "Yess",
                time: "12:59 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1127,
                type:"RECIEVE",
                text: "I don't have much experiance though 😅",
                time: "1:00 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1128,
                type:"SEND",
                text: "I got work for you 😀",
                time: "2:35 pm",
                messageType : 'TEXT'
            }
        ]
    },
    {
        id: 12,
        userId: 3,
        isOnline : false,
        messages: [
            {
                id: 1220,
                type:"RECIEVE",
                text: "Hello leon here",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1222,
                type:"SEND",
                text: "Hi",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            
            {
                id: 1223,
                type:"RECIEVE",
                text: "How are you?",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            
            {
                id: 1224,
                type:"SEND",
                text: "I am fine :)",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            
            {
                id: 1225,
                type:"SEND",
                text: "What about you?",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            
            {
                id: 1226,
                type:"RECIEVE",
                text: "I am Good",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            
            {
                id: 1227,
                type:"RECIEVE",
                text: "Let's go for trip",
                time: "2:01 pm",
                messageType : 'TEXT'
            },
            {
                id: 1228,
                type:"SEND",
                text: "Sure ;)",
                time: "2:03 pm",
                messageType : 'TEXT'
            }
        ]
    },
    {
        id: 13,
        userId: 4,
        isOnline : true,
        messages: [
            {
                id: 1320,
                type:"SEND",
                text: "Hello!",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1322,
                type:"SEND",
                text: "What are you doing?",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1323,
                type:"RECIEVE",
                text: "Watching TV",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1324,
                type:"SEND",
                text: "ohh",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1325,
                type:"RECIEVE",
                text: "Hmmm",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
        ]
    },
    {
        id: 14,
        userId: 5,
        isOnline : false,
        messages: [
            {
                id: 1420,
                type:"SEND",
                text: "Hello Gloria",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1422,
                type:"RECIEVE",
                text: "Hi Genius Coders",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1423,
                type:"RECIEVE",
                text: "How are you?",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1424,
                type:"SEND",
                text: "I am fine :)",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1425,
                type:"SEND",
                text: "What are u doing this weekend",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1426,
                type:"RECIEVE",
                text: "Nothing",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1427,
                type:"SEND",
                text: "Let's hangout",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1428,
                type:"RECIEVE",
                text: "ok sure",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            
        ]
    },
    {
        id: 15,
        userId: 6,
        isOnline : true,
        messages: [
            {
                id: 1520,
                type:"RECIEVE",
                text: "Hello there!",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            {
                id: 1522,
                type:"SEND",
                text: "Hi",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1523,
                type:"RECIEVE",
                text: "How are you?",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1524,
                type:"SEND",
                text: "I am fine :)",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1525,
                type:"SEND",
                text: "What about you?",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1526,
                type:"RECIEVE",
                text: "I am Good",
                time: "2:00 pm",
                messageType : 'TEXT'
            },
            ,
            {
                id: 1527,
                type:"RECIEVE",
                text: "I just got Job here!!",
                time: "2:00 pm",
                messageType : 'TEXT'
            }
        ]
    },
    
]

const groupDetails = [
    {
        id: 30,
        name: "React Native Dev",
        avatar: "http://tiny.cc/group1",
        members: [
            {
                id: 7,
                name: "Nilesh",
                type: "USER"
            },
            {
                id: 8,
                name: "Shailesh",
                type: "ADMIN"
            }
        ],
        message : "Hi React Native Developers"
    },
    {
        id: 31,
        name: "Dev Portal",
        avatar: "http://tiny.cc/grp4",
        members: [
            {
                id: 7,
                name: "Nilesh",
                type: "ADMIN"
            },
            {
                id: 8,
                name: "Shailesh",
                type: "USER"
            }
        ],
        message : "I have question"
    },
    {
        id: 32,
        name: "Friends",
        avatar: "http://tiny.cc/grp3",
        members: [
            {
                id: 7,
                name: "Nilesh",
                type: "ADMIN"
            },
            {
                id: 8,
                name: "Shailesh",
                type: "USER"
            },
            {
                id: 9,
                name:"Kartik",
                type: "USER"
            }
        ],
        message : "whatsapp guys"
    }
]

const missedCall = [
    {
        id: 30,
        name: "Estell",
        avatar: "http://tiny.cc/profile4",
        time : 'Today 12:00pm',
        type : 'missed',
        typeCall :  'Call'
    },
    {
        id: 31,
        name: "Preston",
        avatar: "http://tiny.cc/profile3",
        time : 'Today 11:00pm',
        type : 'missed',
        typeCall :  'Video'
    },
    {
        id: 32,
        name: "Marcie",
        avatar: "http://tiny.cc/women4",
        time : 'Today 10:10pm',
        type : 'missed',
        typeCall :  'Call'
    },
]

const calls = [
    {
        id: 30,
        name: "Estell",
        avatar: "http://tiny.cc/profile4",
        time : 'Today 12:00pm',
        type : 'outgoing',
        typeCall :  'Call'
    },
    {
        id: 31,
        name: "Preston",
        avatar: "http://tiny.cc/profile3",
        time : 'Today 11:00pm',
        type : 'outgoing',
        typeCall :  'Call'
    },
    {
        id: 32,
        name: "Jenni",
        avatar: "http://tiny.cc/profile1",
        time : 'Today, 11:00PM',
        type : 'outgoing',
        typeCall :  'Call'
    },
    {
        id: 33,
        name: "Caryl",
        avatar: "http://tiny.cc/profile6",
        time : 'Yesterday, 8:00PM',
        type : 'outgoing',
        typeCall :  'Video'
    },
    {
        id: 34,
        name: "Zyan",
        avatar: "http://tiny.cc/profile5",
        time : 'Today 9:00PM',
        type : 'outgoing',
        typeCall :  'Call'
    },
]

const myContacts = [
    {
        id: 1,
        name: "Jenni",
        avatar: "http://tiny.cc/profile1",
        isOnline : false,
        status : 'At Work'
    },
    {
        id: 2,
        name: "Estell",
        avatar: "http://tiny.cc/profile4",
        isOnline : true,
        status : 'My Life, My Rules!'
    },
    {
        id: 3,
        name: "Preston",
        avatar: "http://tiny.cc/profile3",
        isOnline : true,
        status : '...'
    },
    {
        id: 4,
        name: "Zyan",
        avatar: "http://tiny.cc/profile5",
        isOnline : false,
        status : 'Urgent calls only'
    },
    {
        id: 5,
        name: "Caryl",
        avatar: "http://tiny.cc/profile6",
        isOnline : true,
        status : 'Busy'
    },
    {
        id: 6,
        name: "Hubert",
        avatar: "http://tiny.cc/profile",
        isOnline : true,
        status : "In a meeting"
    },
    {
        id: 7,
        name: "Melissa Jennings",
        avatar: "https://randomuser.me/api/portraits/women/70.jpg",
        isOnline : false,
        status : 'Busy'
    },
    {
        id: 8,
        name: "Kent James",
        avatar: "https://randomuser.me/api/portraits/men/3.jpg",
        isOnline : true,
        status : "Can't talk, WhatsApp only"
    },
    {
        id: 9,
        name: "Salvador Hayes",
        avatar: "https://randomuser.me/api/portraits/men/49.jpg",
        isOnline : false,
        status : 'Hey,there I am using WhatsApp'
    },
    {
        id: 10,
        name: "Alex Armstrong",
        avatar: "https://randomuser.me/api/portraits/men/11.jpg",
        isOnline : true,
        status : 'At the gym'
    },
    {
        id: 11,
        name: "Monica Rodriguez",
        avatar: "https://randomuser.me/api/portraits/women/10.jpg",
        isOnline : true,
        status : 'Sleeping'
    },
    {
        id: 12,
        name: "Edna Stone",
        avatar: "https://randomuser.me/api/portraits/women/54.jpg",
        isOnline : true,
        status : 'At the movies'
    },
    {
        id: 13,
        name: "Corey Robertson",
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        isOnline : false,
        status : 'At Work'
    },
    {
        id: 14,
        name: "Holly Jackson",
        avatar: "https://randomuser.me/api/portraits/women/51.jpg",
        isOnline : true,
        status : 'Available'
    },
    {
        id: 15,
        name: "Larry Patterson",
        avatar: "https://randomuser.me/api/portraits/men/76.jpg",
        isOnline : false,
        status : 'In a meeting'
    },
    {
        id: 16,
        name: "Juan Webb",
        avatar: "https://randomuser.me/api/portraits/men/45.jpg",
        isOnline : false,
        status : 'At Work'
    },
    {
        id: 17,
        name: "Mario Butler",
        avatar: "https://randomuser.me/api/portraits/men/28.jpg",
        isOnline : false,
        status : 'Urgent calls only'
    },
    {
        id: 18,
        name: "Juan Miller",
        avatar: "https://randomuser.me/api/portraits/men/59.jpg",
        isOnline : false,
        status : 'Available'
    },
    {
        id: 19,
        name: "Hannah Robertson",
        avatar: "https://randomuser.me/api/portraits/women/71.jpg",
        isOnline : false,
        status : 'Battery about to die'
    },
    {
        id: 20,
        name: "Darren Carlson",
        avatar: "https://randomuser.me/api/portraits/men/38.jpg",
        isOnline : true,
        status : 'Available'
    },
    {
        id: 21,
        name: "Felix Harper",
        avatar: "https://randomuser.me/api/portraits/men/33.jpg",
        isOnline : false,
        status : 'nothing'
    },
    {
        id: 22,
        name: "Alexis Reyes",
        avatar: "https://randomuser.me/api/portraits/women/30.jpg",
        isOnline : true,
        status : 'Bored AF'
    }    
]

export { chatUsers, chatDetails, groupDetails,missedCall,calls,myContacts };