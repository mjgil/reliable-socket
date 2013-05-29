/**
 * Module requirements.
 */
 var qs = require('querystring')
  , parse = require('url').parse
  , readFileSync = require('fs').readFileSync
  , crypto = require('crypto')
  , base64id = require('base64id')
  , transports = require('./transports')
  , EventEmitter = require('events').EventEmitter
  , Socket = require('./socket')
  , WebSocketServer = require('ws').Server
  , debug = require('debug')('engine');

var Server = require('./server');

/**
 * Exports the constructor.
 */

module.exports = ReliableServer;

function ReliableServer(opts) {
  Server.call(this, opts);
  this.sessions = {};
}

ReliableServer.prototype.__proto__ = Server.prototype;

ReliableServer.prototype.tryCount = 0;

ReliableServer.prototype.handshake = function(transport, req) {
  var id = base64id.generateId();
  var transportName = transport;
  debug('handshaking client "%s"', id);

  try {
    var transport = new transports[transport](req);
  }
  catch (e) {
    sendErrorMessage(req.res, Server.errors.BAD_REQUEST);
    return;
  }
  var socket = new Socket(id, this, transport);
  var self = this;

  if (false !== this.cookie) {
    transport.on('headers', function(headers){
      headers['Set-Cookie'] = self.cookie + '=' + id;
    });
  }

  transport.onRequest(req);

  console.log(socket);

  socket.transportName = transportName;
  this.clients[id] = socket;
  this.clientsCount++;
  this.sessions[id] = {};
  this.sessions[id].client = socket;
  this.sessions[id].packetCount = 0;
  this.sessions[id].lastACK = 0;
  this.sessions[id].packetBuffer = [];

  this.emit('connection', socket);
  socket.on('close', function(one, two){
    // console.log("let's not delete stuff");
    // if client doesn't reconnect within 10 seconds,
    // we need to discard
    console.log('onClosedServer', one, two);
    var tryIntervalTimer = setInterval(function() {

      if (self.tryCount > 10) {
        clearInterval(tryIntervalTimer);
        delete self.clients[id];
        self.clientsCount--;
      } else {
        if (self.clients[id].readyState == 'closed') {
          self.tryCount++;
        } else {
          var oldSocket = self.clients[id];
          self.clients[id] = socket;
          self.tryCount = 0;
          clearInterval(tryIntervalTimer);
        }
      }
    }, 1000);
  });

  socket.on('packet', function(data) {
    console.log('sending: ', data);
  });

  socket.on('data', function(data) {
    if (data.length >= 8) {
      var firstPart = data.slice(0,9);
      if (firstPart === 'sessionID') {
        var endData = data.slice(9);
        var realData = (typeof data === 'Object') ? JSON.parse(endData) : endData;
        console.log(realData);

        console.log('got to sessionID');
      }
    }
  });
}