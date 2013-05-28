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
  if (!(this instanceof ReliableSocket)) return new ReliableSocket(uri, opts);

  opts = opts || {};

  if ('object' == typeof uri) {
    opts = uri;
  }

  this.socket = new Socket(uri, opts);
  this.sessionId = 'asdf';
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

  // this.socket.transport
  //   .on('error', function(err) {
  //     console.log('triggering ours also');
  //     self.socket.emit('error', err);
  //   });

  this.socket.onError = function(err) {
    console.log('our own version of onError');
    self.socket.emit('error', err);
  }

  this.socket
    .on('open', function () {
      self.emit('open');
    })
    .on('close', function (reason, desc) {
      console.log('closed');
      self.emit('close', reason, desc);
    })
    .on('error', function (err) {
      // based on the type of error, we should try to reconnect
      // does the following work?
      console.log('intercepted error ' + err);
      setTimeout(function() {
        console.log('trying to re-open');
        // self.socket.open();
        self.socket.onOpen();
        self.write('hello, after trying to reopen');
      }, 2500);
    })
    .on('data', function (data) {
      self.emit('data', data);
    })
    .on('message', function (msg) {
      self.emit('message', msg)
    });
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
  this.socket.sendPacket('message', msg, fn);
  return this;
}

ReliableSocket.prototype.filterUpgrades = function (upgrades) {
  return this.socket.filterUpgrades(upgrades);
};