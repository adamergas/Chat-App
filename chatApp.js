var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
//not working, something was missed --- again.
var redis = require('redis');
var redisClient = redis.createClient();

var messages = [];
var storeMessage = function(name, data){
  var message = JSON.stringify({name: name, data: data});
  redisClient.lpush("messages", message, function(err, response) {
    redisClient.ltrim("messages", 0, 9);
  });
}



io.on('connection', function(client) {

  client.on('join', function(name) {
    client.nickname = name;
    client.broadcast.emit("add chatter", name);
    console.log(name+" joined the chat");
    redisClient.sadd("chatters", name);
    redisClient.smembers('chatters', function(err, names) {
      names.forEach(function(name){
        client.emit('add chatter', name);
      });
    });

    redisClient.lrange("messages", 0, -1, function(err, messages) {
      messages = messages.reverse();
      messages.forEach(function(message){
        message = JSON.parse(message);
        client.emit("messages", message.name + ": " + message.data);
      });
    });

  });

  client.on('messages', function(message) {
    var nickname = client.nickname;
    console.log(nickname + ": " + message);
    client.broadcast.emit('messages', nickname + ": " + message);
    client.emit('messages', nickname + ": " + message);
    storeMessage(nickname, message);
  });

  client.on('disconnect', function(name) {
    //client.get('nickname', function(err, name) {
      var nickname = client.nickname;
      client.broadcast.emit("remove chatter", nickname);
      redisClient.srem("chatters", nickname);
    //});
  });

});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

server.listen(8080);
