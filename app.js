var mumble = require('mumble');
var fs = require('fs');
var lame = require('lame');
// var scream = fs.createReadStream('scream.wav');
//fs.readFileSync('scream.wav');
var options = {
    key: fs.readFileSync( 'key.pem' ),
    cert: fs.readFileSync( 'crt.pem' )
}

/*
To generate certificates:
key: openssl pkcs12 -in MumbleCertificate.p12 -out key.pem -nocerts -nodes
cert: openssl pkcs12 -in MumbleCertificate.p12 -out crt.pem -clcerts -nokeys
*/

var serverURL = '{serverURL}'; //Server URL
var username = '{username}'; //Username from the keys generated

//mumble://localhost
mumble.connect(serverURL, options, function ( error, connection ) {
    if( error ) { throw new Error( error ); }

    console.log( 'Connected' );

    connection.authenticate( username );

    connection.on( 'initialized', function() {
        //gotta add that parameter
        onInit(connection);
    });
    connection.on( 'message', function(message, actor) {
        if (actor && processBan(connection, actor.name)) {
            onMessage(connection, message, actor);
        }

    });
    connection.on('user-connect', function(user) {
        sendMessage('Hello ' + user.name + '!');
    });
    // connection.on( 'voice', onVoice );
});

var lastCheckTime = new Date().getTime();
var numComments = {};
var banned = {}
var whiteList = []; //List of users ignored for spam detection
var ignoreList = [];
var processBan = function(connection, name) {
    if (ignoreList.indexOf(name.toLowerCase()) >= 0) {
        return false;
    }

    if (banned[name]) {
        if (new Date().getTime() - banned[name] > 60000) {
            delete banned[name];
            sendMessage(connection, "<p style='color:red;font-size: 15px;'>" 
                + name.toUpperCase() + " has been unbanned</p>");
        } else {
            return false;
        }
    }

    if (new Date().getTime() - lastCheckTime > 3000) {
        numComments = {};
        lastCheckTime = new Date().getTime();
    } else {
        if (numComments[name]) {
            numComments[name]++;
        } else {
            numComments[name] = 1;
        }

        if (numComments[name] > 3 && whiteList.indexOf(name) === -1) {
            banned[name] = new Date().getTime();
            sendMessage(connection, "<p style='color:red;font-size: 30px;'>" 
                + name.toUpperCase() + " HAS BEEN BANNED FOR 1 MINUTE</p>");
        }
    }

    return true;
}

var onInit = function(connection) {
    console.log( 'Connection initialized' );
    // Connection is authenticated and usable.

    //Print out a list of users (you can comment this out)
    var users = connection.users();
    console.log(JSON.stringify(users[0].name));
    for (var i = 0; i < users.length; i++) {
        console.log('Hi ' + users[i].name + '!');
    }

    //Connect to Elliptical Madness if it exists
    //I added timeouts to account for connection delays
    //There is probably a better way, but whatever
    setTimeout(function() {
        //look for channel
        sendMessage(connection, "Autoconnected. Hi!");
        playSound(connection, 'intro.mp3');
    }, 500);
};

var playing = false;

var onMessage = function(connection, message, actor) {
    if (actor.name === 'e') {
        //don't respond to yourself
        return;
    }

    //Ignore message if it doesn't contain "!"
    if (message.indexOf("!") === -1)
        return;

    //Take away all html elements - from this:
    //http://stackoverflow.com/questions/17164335/how-to-remove-only-html-tags-in-a-string-using-javascript
    var messageText = message.replace(/<\/?(p|i|b|br)\b[^<>]*>/g, '');
    messageArray = messageText.split(' ');
    for (var i = 0; i < messageArray.length; i++) {
        //convert to lower case to make easier to parse
        messageArray[i] = messageArray[i].toLowerCase();
    };

    //ignore message if it doesn't meet certain criteria
    if (!messageArray || messageArray.length === 0 
        || messageArray[0].length === 1 || messageArray[0].substring(0, 1) !== '!') return;

    //first word is the keyword (after the '!')
    var keyWord = messageArray[0].substring(1);
    if (messageArray.length > 0) {
        //take away command from beginning to make easier to parse
        messageText = messageText.substring(messageArray[0].length+1);
    }
    messageArray.shift(); //remove first element (e.g. '!hi')

    performCommand(connection, keyWord, messageText, messageArray, actor)
    
};

var onVoice = function( event ) {
    console.log( 'Mixed voice' );

    var pcmData = voice.data;
}

var sendMessage = function(connection, message, actor) {
    //if you include a user, send it to him
    if (actor) {
        actor.sendMessage(message);
    } else {
        if (connection.user) {
            connection.user.channel.sendMessage(message);
        }
    }
}

var performCommand = function(connection, keyWord, commandText, commandArray, actor) {

    var foundCommand = false;
    for (var i = 0; i < oneWordCommands.length; i++) {
        if (oneWordCommands[i][0] === keyWord) {
            console.log('Received command: ' + oneWordCommands[i][0]);
            sendMessage(connection, oneWordCommands[i][1]);

            foundCommand = true;
            break;
        }
    }
    if (!foundCommand) {
        for (var i = 0; i < commands.length; i++) {
            var command = commands[i];
            //TODO: array identifiers
            //This looks for a command with a matching keyword
            if (command.identifier === keyWord) {
                console.log('Received command: ' + command.identifier);
                //execute if found
                command.action(connection, commandText, commandArray, actor);
                foundCommand = true;
                break;
            }
        }
    }

    if (!foundCommand) {
        sendMessage(connection, 'Command not found');
    }
}

var sounds = [
    'musicyeah',
    'ohmygod',
    'scream',
    'nope',
    'over9000'
];
var volume = 25;
var playSound = function(connection, sound) {
    if (playing) {
        sendMessage(connection, "Already playing sound");
        return;
    }
    // scream.pipe(connection.inputStream());

    // scream = fs.readFileSync(sound);
    console.log('playing ' + sound);
    var sound = fs.createReadStream(sound);
    
    var stream;
    var decoder = new lame.Decoder();
    decoder.on('format', function(format) {
        
        stream.pipe(connection.inputStream({
            channels: format.channels,
            sampleRate: format.sampleRate,
            gain: volume/100
        }));

    });

    stream = sound.pipe(decoder);
    playing = true;
    stream.on('end', function() {
        playing = false;
    })
}


var oneWordCommands = [
    ['hi', 'Hello!'],
    ['lenny', '( ͡° ͜ʖ ͡°)'],
    ['dong', 'ヽ༼ຈل͜ຈ༽ﾉ raise your dongers ヽ༼ຈل͜ຈ༽ﾉ'],
    ['hecomes', 'Ḫ̵͇Ẹ ̢̥̰̥̻̘̙̠C̺̙̠͠O̠̗M̺̭E̵S͖͓͜'],
    ['meh', '¯\\_(ツ)_/¯'],
    ['flipthetable', '(╯°□°）╯︵ ┻━┻'],
    ['putitdown', '┬─┬ノ( º _ ºノ) chill out bro']
];

var commands = [{
    identifier: 'doge',
    minLength: 0, //how much additional information you need 
    action: function(connection) {
        var words = ['amaze', 'wow', 'such mumble', 'so bot', 'such auto'];
        sendMessage(connection, words[Math.floor(Math.random()*words.length)]);
    }
}, {
    identifier: 'help',
    minLength: 1, //how much additional information you need 
    action: function(connection, keyString, keyArray, actor) {
        sendMessage(connection, 'Here is a list of all commands:', actor);

        var text = '';
        for (var i = 0; i < commands.length; i++) {
            text += commands[i].identifier + ', ';
        }

        for (var i = 0; i < oneWordCommands.length; i++) {
            text += oneWordCommands[i][0] + ', ';
        };

        sendMessage(connection, text);
        playSound(connection, 'intro.mp3');
    }
}, {
    identifier: 'move',
    minLength: 1, //how much additional information you need 
    action: function(connection, keyString) {
        //get rest of command without '!move '
        var newChannel = keyString;
        if (newChannel === 'root') {
            connection.rootChannel.join();
            console.log("Moved to Channel: root");
        } else {
            var channel = connection.channelByName(newChannel);
            if (channel) {
                channel.join();
                console.log("Moved to Channel: " + newChannel);
            } else {
                sendMessage(connection, 'Channel ' + newChannel + ' not found');
            }
        }
    }
}, {
    identifier: 'printuserlist',
    minLength: 0, //how much additional information you need 
    action: function(connection) {
        sendMessage(connection, "User List Requested");

        var users = connection.users();
        var text = "";

        for (var i = 0; i < users.length; i++) {
            text += users[i].name + ', ';
        }

        sendMessage(connection, text);
    }
}, {
    identifier: 'msg',
    minLength: 1, //how much additional information you need 
    action: function(connection, keyString, keyArray, actor) {
        console.log("sending message to " + actor.name);
        sendMessage(connection, "Thanks for your request, " + actor.name, actor);
        sendMessage(connection, keyString);
    }
}, {
    identifier: 'play',
    minLength: 1, //how much additional information you need 
    action: function(connection, keyString, keyArray) {
        if (keyArray[0] === 'help') {
            var text = 'Sounds I can play: ';
            for (var i = 0; i < sounds.length; i++) {
                text += sounds[i] + ', ';
            }
            sendMessage(connection, text);
        } else if (keyArray[0] === 'stop') {
            //insert dis
        } else {
            for (var i = 0; i < sounds.length; i++) {
                if (keyArray[0] === sounds[i]) {
                    playSound(connection, 'audio/' + keyArray[0]+'.mp3');
                }
            };
        }
        // playSound(connection, 'weedeveryday.mp3');
    }
}, {
    identifier: 'volume',
    minLength: 1, //how much additional information you need 
    action: function(connection, keyString, keyArray) {
        if (keyArray[0] === 'up' && volume < 0.40) {
            volume += 5;
            sendMessage(connection, "Volume up to " + volume);
        } else if (keyArray[0] === 'down' && volume > 0.05) {
            volume -= 5;
            sendMessage(connection, "Volume down to " +  + volume);
        }
        // playSound(connection, 'weedeveryday.mp3');
    }
}, {
    identifier: 'pretty',
    minLength: 1, //how much additional information you need 
    action: function(connection, keyString, keyArray) {
        var colors = ['red', 'orange', 'yellow', 'green',
            'blue', 'purple'];

        var text = '';
        for (var i = 0; i < keyString.length; i++) {
            text += '<span style="color:' + colors[i%colors.length]
                + '; background-color: ' + colors[(i+3)%colors.length] + '">' 
                + keyString.substring(i, i+1) + '</span>';
        };

        sendMessage(connection, text);
    }
}, {
    identifier: 'mod',
    minLength: 1, //how much additional information you need 
    action: function(connection, keyString, keyArray, actor) {

        var modWhiteList = ['ed', 'benhen'];
        if (modWhiteList.indexOf(actor.name.toLowerCase()) === -1) {
            sendMessage(connection, "<span style='color:red'>You are not authorized to perform this command. BANNED for 1 MINUTE</span>");
            if (actor)
                banned[actor.name] = new Date().getTime();
            return;
        }

        if (keyArray[0] === 'ignore' && keyArray.length >= 2) {
            if (ignoreList.indexOf(keyArray[1]) == -1)
                ignoreList.push(keyArray[1].toLowerCase());
            sendMessage(connection, "<span style='color:red'>Now ignoring " 
                + keyArray[1] + "</span>")
        } else if (keyArray[0] === 'unignore' && keyArray.length >= 2) {
            var index = ignoreList.indexOf(keyArray[1].toLowerCase());
            if (index >= 0) {
                ignoreList.splice(index, 1);
                sendMessage(connection, "<span style='color:red'>No longer ignoring " 
                + keyArray[1] + "</span>");
            }
            
        } else if (keyArray[0] === 'unignoreall') {
            for (var i = 0; i < ignoreList.length; i++) {
                sendMessage(connection, "<span style='color:red'>No longer ignoring " 
                + ignoreList[i] + "</span>");
            }
        }
    }
}];


