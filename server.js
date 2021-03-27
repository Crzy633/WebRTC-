var express = require('express');
var app = express();
var server = require('http').createServer(app);

server.listen(4000);

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({server: server});

// 存储socket
var wsArray = [];
// 存储房间
var rooms = {};

// 循环给所有用户发送所有房间信息
setInterval(function(){
    for(let i = 0; i < wsArray.length; i++) {
        if(wsArray[i].readyState === 1) {
            wsArray[i].send(JSON.stringify({event:"roomsInfo", info: Object.keys(rooms)}));
        }
    }
}, 500);

setInterval(function(){
    for(let room in rooms) {
        let count = Object.keys(rooms[room].names).length + 1;
        rooms[room].ws.send(JSON.stringify({
            event:"count",
            count: count
        }));
        for(let name in rooms[room].names) {
            rooms[room].names[name].send(JSON.stringify({
                event:"count",
                count: count
            }));
        }
    }
}, 500);


// 有新的客户端socket连入
wss.on('connection', function(ws, req) {
    wsArray.push(ws);

    // 服务器接收客户端的websocket信息
    ws.on('message', function(message) {
        let json = JSON.parse(message);

        // 聊天
        if(json.event == "chatSend") {
            let name;
            let roomName = json.roomName;
            if(roomName) {
                let names = rooms[json.roomName].names;
                name = Object.keys(names).find(k => names[k] == ws);
            }else {
                name = Object.keys(rooms).find(k => rooms[k].ws == ws);
                roomName = name;
            }
            rooms[roomName].ws.send(JSON.stringify({
                event: "chat", 
                msg: json.msg,
                name: name
            }));
            for(let n in rooms[roomName].names) {
                rooms[roomName].names[n].send(JSON.stringify({
                    event: "chat", 
                    msg: json.msg,
                    name: name
                }));
            }
        }

        // 创建直播间
        if(json.event == "createRoom") {
            if(rooms[json.roomName] || !json.roomName.trim()) 
                ws.send(JSON.stringify({event: "createRoomFailed"}));
            else {
                rooms[json.roomName] = {ws : ws, names : {}};
                ws.send(JSON.stringify({event: "createRoomOk"}));
            }
        }

        // 关闭直播间
        if(json.event == "closeRoom") {
            let roomName = Object.keys(rooms).find(k => rooms[k].ws == ws);
            for(let name in rooms[roomName].names) {
                rooms[roomName].names[name].send(JSON.stringify({event: "roomClosed"}));
            }
            delete rooms[roomName];
        }

        // 加入直播间
        if(json.event == "joinRoom") {
            if(json.roomName == json.name || !rooms[json.roomName] ||
                rooms[json.roomName].names[json.name] || !json.name.trim())
                ws.send(JSON.stringify({event: "joinRoomFailed"}));
            else {
                for(let room in rooms) {
                    for(let name in rooms[room].names) {
                        if(rooms[room].names[name] == ws) {
                            rooms[room].ws.send(JSON.stringify({event: "quitHint", name: name}));
                            for(let name2 in rooms[room].names) {
                                if(rooms[room].names[name2] == ws) continue;
                                rooms[room].names[name2].send(JSON.stringify({event: "quitHint", name: name}));
                            }
                            delete rooms[room].names[name];
                            return;
                        }
                    }
                }
                rooms[json.roomName].names[json.name] = ws;
                rooms[json.roomName].ws.send(JSON.stringify({event: "joinRoom", name: json.name}));
                rooms[json.roomName].ws.send(JSON.stringify({
                    event: "joinHint", 
                    name: json.name
                }));
                for(let n in rooms[json.roomName].names) {
                    if(rooms[json.roomName].names[n] == ws) continue;
                    rooms[json.roomName].names[n].send(JSON.stringify({
                        event: "joinHint", 
                        name: json.name
                    }));
                }

            }
        }

        // rtc建立连接：房主(A)创建一个offer给加入者(B)
        if(json.event == "_offer") {
            json.data.nameA = Object.keys(rooms).find(k => rooms[k].ws == ws);
            rooms[json.data.nameA].names[json.data.nameB].send(JSON.stringify(json));
        }

        // rtc建立连接：加入者(B)创建一个answer给房主(A)
        if(json.event == "_answer") {
            let names = rooms[json.data.nameA].names;
            json.data.nameB = Object.keys(names).find(k => names[k] == ws);
            rooms[json.data.nameA].ws.send(JSON.stringify(json));
        }

        // rtc建立连接：From 向 To 发送 _ice_candidate
        if(json.event == "_ice_candidate") {
            if(!json.data.to) return;
            let from = Object.keys(rooms).find(k => rooms[k].ws == ws);
            if(from) {
                json.data.from = from;
                if(!rooms[from].names[json.data.to]) return;
                rooms[from].names[json.data.to].send(JSON.stringify(json));
            }else {
                let names = rooms[json.data.to].names;
                from = Object.keys(names).find(k => names[k] == ws);
                json.data.from = from;
                rooms[json.data.to].ws.send(JSON.stringify(json));
            }
        }
    });

    ws.on('close', function(event) {websocketCloseHandler(ws);});
    ws.on('error', function(event) {websocketCloseHandler(ws);});
});

// websocket断开处理
function websocketCloseHandler(ws) {
    wsArray.splice(wsArray.indexOf(ws), 1);
    let roomName = Object.keys(rooms).find(k => rooms[k].ws == ws);
    if(roomName) {
        for(let name in rooms[roomName].names) {
            rooms[roomName].names[name].send(JSON.stringify({event: "roomClosed"}));
        }
        delete rooms[roomName];
    }else {
        for(let room in rooms) {
            for(let name in rooms[room].names) {
                if(rooms[room].names[name] == ws) {
                    rooms[room].ws.send(JSON.stringify({event: "quitHint", name: name}));
                    for(let name2 in rooms[room].names) {
                        if(rooms[room].names[name2] == ws) continue;
                        rooms[room].names[name2].send(JSON.stringify({event: "quitHint", name: name}));
                    }
                    delete rooms[room].names[name];
                    return;
                }
            }
        }
    }
}