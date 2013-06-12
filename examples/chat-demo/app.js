var env = process.env.NODE_ENV || 'development',
  express = require('express'),
  http = require('http'),
  path = require('path'),
  stylus = require('stylus'),
  app = express(),
  server = http.createServer(app)
  reliableServer = require('../../../reliable-socket-server')(),
  engineio = require('engine.io'),
  io = engineio.attach(server);

app.configure(function(){
  app.set('root', __dirname);
  app.set('port', process.env.PORT || 3007);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});
  app.use(express.favicon());
  app.use(express.bodyParser());
  app.use(express.methodOverride()); // put/delete routes
  app.use(express.cookieParser());
  app.use(express.session({secret: 'reliable-socket'}));
  app.use(app.router);
  app.use(stylus.middleware({
    src: __dirname + "/public",
    compile: compile
  }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.configure('development', function() {
    app.use(express.errorHandler({dump: true, stack: true}));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});

function compile(str, path) {
  return stylus(str) 
    .set('filename', path)
    .set('compass', true)
}

// routes
app.get('/', function(req, res) {
  res.render('index');
});
app.get('/reliable-socket.js', function (req, res) {
  res.sendfile(__dirname + '/reliable-socket.js');
});

app.get('/engine.io-client/engine.io.js', function (req, res) {
  res.sendfile(__dirname + '/engine.io.js');
});

server.listen(app.get('port'));
console.log('server listening at port 3007');



// io
var clientList = [];
io.on('connection', function (socket) {
    socket.clientID = clientList.length;
    socket._sendCount = 0;
    reliableServer.addSocket(socket);

    socket.on('error', function(error) {
        console.log(error);
    });

    socket.on('data', function(data) {
        clientList.forEach(function(ioSocket) {
            ioSocket.send(data);
        });
    });

    clientList.push(socket);
});

