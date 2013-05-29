/**
 * Module requirements.
 */

var Socket = require('./socket')
  , Emitter = require('./emitter');

/**
 * Exports the constructor.
 */

module.exports = ReliableSocket;

/**
 * Reliable socket constructor.
 *
 * @api public.
 */

function ReliableSocket(uri, opts) {
  var self = this;
  if (!(this instanceof ReliableSocket)) return new ReliableSocket(uri, opts);

  this.socket = new Socket(uri, opts);
  opts = opts || {};

  if ('object' == typeof uri) {
    opts = uri;
  }

  this.reconnectTimeout = opts.timeout || 5000;
  this.setupSocketListeners();
}

/*
 * Mix in `Emitter`.
 */

Emitter(ReliableSocket.prototype);

/**
 * Protocol version.
 *
 * @api public
 */

ReliableSocket.protocol = Socket.protocol;

/**
 * Expose deps for legacy compatibility
 * and standalone browser access.
 */

ReliableSocket.Socket = ReliableSocket;
ReliableSocket.Emitter = Emitter;
ReliableSocket.Transport = require('./transport');
ReliableSocket.transports = require('./transports');
ReliableSocket.util = require('./util');
// ReliableSocket.parser = require('../../engine.io-protocol');

/**
 * Sets up listeners for underlying Socket events
 *
 * @api private
 */

ReliableSocket.prototype.setupSocketListeners = function() {
  var self = this;

  this.socket
    .on('open', function () {
      self.emit('open');
      if (!self.sid) self.sid = self.socket.id;
      var data = {};
      data.sid = self.sid;
      data.id = self.socket.id;
      var dataString = 'sessionID';
      dataString = dataString + JSON.stringify(data);
      self.socket.send(dataString, function(){});
    })
    .on('close', function (reason, desc) {
      self.emit('close', reason, desc);
      console.log(self.socket.id);
      setTimeout(function() {
        console.log(self.socket);
        self.socket.open();
      }, 2500);
      self.emit('close', reason, desc);
    })
    .on('error', function (err) {
      self.emit('error', err);
      // based on the type of error, we should try to reconnect
      // does the following work?
      setTimeout(function() {
        console.log('trying to re-open');
        // self.socket.open();
        self.socket.open();
        self.socket.emit('retry');
        self.write('hello, after trying to reopen');
      }, 2500);
    })
    .on('data', function (data) {
      console.log(self.socket.id);
      self.emit('data', data);
    })
    .on('message', function (msg) {
      self.emit('message', msg)
    })

  // this.on('open', function() {
  //   this.sid = this.socket.id;
  // })
  // .on('close', function(reason, desc) {

  // })
  // .on('error', function(reason, desc) {

  // })
  // .on('data', function(data) {

  // })
  // .on('message', function(message) {

  // })
}

ReliableSocket.prototype.reopenSocket = function() {
  this.socket.id = this.sid;
  this.socket.readyState = 'opening';
  var transport = this.socket.createTransport(this.transport);
  transport.open();
  this.setTransport(transport);
}

/**
 *
 * @param {String} message
 * @param {Function} callback function.
 * @return {Socket} for chaining.
 * @api public
 */

ReliableSocket.prototype.write =
ReliableSocket.prototype.send = function (msg, fn) {
  this.socket.send(msg, fn);
  return this;
}

ReliableSocket.prototype.filterUpgrades = function (upgrades) {
  return this.socket.filterUpgrades(upgrades);
};