var express = require('express');

// Require engine io from the symlinked project
// This guarantees on the server we will be using our
// development version.
var engineio = require('./node_modules/engine.io1/lib/reliable-engine.io.js');

var client = require('./node_modules/engine.io-client1');

var fs = require('fs');
// Create a new express app
var app = express();

// Create a new HTTP server listening on port 8000
var server = app.listen(8000);

// Create an Engine.IO instance on this server
var io = engineio.attach(server);

// Return the index.html file for the '/' path
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

// Return the engine io client javascript
// ** NOTE
// ** Notice how the actual file we're returning is the
// ** development version of the file inside the engine.io-client
// ** folder. This subfolder is really a symlink (linux/mac) or
// ** shortcut (windows)
app.get('/engine.io-client/engine.io.js', function (req, res) {
  res.sendfile(__dirname + '/node_modules/engine.io-client1/engine.io.js');
});

// Here's where the actual Engine.IO server code comes in.
// Here we tell it what to do.

io.on('connection', function (socket) {
    console.log('io: ', io);
    io.addSocket(socket);
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

