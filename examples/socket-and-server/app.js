var express = require('express'),
    reliableServer = require('../../../reliable-socket-server')(),
    engineio = require('engine.io'),
    fs = require('fs'),
    app = express(),
    server = app.listen(8000),
    io = engineio.attach(server);


console.log(reliableServer);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});


app.get('/reliable-socket.js', function (req, res) {
  res.sendfile(__dirname + '../../reliable-socket.js');
});


io.on('connection', function (socket) {
    reliableServer.addSocket(socket);
    var stream = fs.createReadStream('bug2.txt');
    socket.on('close', function (reason, desc) {
        stream.destroy();
    });

    socket.on('error', function(error) {
        console.log(error);
    });

    socket.on('retry', function(err) {
      console.log('retry');
    });

    stream.on('data', sendData);

    socket.on('data', function(data) {
        console.log(data);
    });

    function sendData(data) {
        socket.send(data);
        setTimeout(function() {
            sendData(data);
        }, 2500);
        // var newStream = fs.createReadStream('bug_106.txt');
        // newStream.on('data', sendData);
    }
});

