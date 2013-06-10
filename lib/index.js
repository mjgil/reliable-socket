var Emitter = require('emitter'),
    parser = require('../../reliable-socket-protocol'),
    debug = require('debug')('reliable:socket');

/**
 * Exports the constructor.
 */

module.exports = function(Socket) {
  /**
   * Reliable socket constructor.
   *
   * @api public.
   */


  function ReliableSocket(uri, opts) {
    if (!(this instanceof ReliableSocket)) return new ReliableSocket(uri);

    opts = opts || {};
    this.uri = uri;
    this.readyState = 'closed';
    this.socket = new Socket(uri);
    this.reconnectTimeout = opts.reconnectTimeout || 5000;
    this.retryTimeout = opts.retryTimeout || 1000;
    this.seenObj = {};
    this.lastSeen = 0;
    this.firstOpen = true;
    this.firstClosed = true;
    this.sid = null;
    this.timeouts = [];
    this.writeBuffer = [];
    this.packetCount = 0;
    this.setupSocketListeners();
  }

  /*
   * Mix in `Emitter`.
   */

  Emitter(ReliableSocket.prototype);



  /**
   * Sets up listeners for underlying Socket events
   *
   * @api private
   */
  ReliableSocket.prototype.setupSocketListeners = function() {
    var self = this;
    this.socket
      .on('open', function () {
        if (self.firstOpen) {
          self.emit('open');
          self.firstOpen = false;
          self.readyState = 'open';
          self.socket.send(parser.encodePacket({type: 'open'}));
        }
        else {
          // new underlying socket
          var qstring = '&session=' + self.sid + '&last=' + self.lastSeen;
          self.socket.send(parser.encodePacket({type: 'recon', data: qstring}));
          self.socket.send(parser.encodePacket({type: 'message', data: this.writeBuffer}));
          self.seenObj = {};
          self.lastSeen = 0;
        }
      })
      .on('close', function (reason, desc) {
        console.log('close');
        self.timeouts.push(setTimeout(function() {self.tryToReopen();}, self.retryTimeout));
        self.timeouts.push(setTimeout(function() {self.checkStillClosed();}, self.reconnectTimeout));
      })
      .on('error', function (err) {
        console.log('error');
        self.emit('error', err);
        self.timeouts.push(setTimeout(function() {self.tryToReopen();}, self.retryTimeout));
        self.timeouts.push(setTimeout(function() {self.checkStillClosed();}, self.reconnectTimeout));
      })
      .on('data', function (data) {
        self.handleData('data', data);
      })
      .on('message', function (msg) {
        self.handleData('msg', msg)
      })
  }



  /**
   * Tries to create a new underlying sockets to keep
   * data flowing. 
   *
   * @api private
   */
  ReliableSocket.prototype.tryToReopen = function() {
    var self = this;
    if (this.readyState !== 'closed') {
      if (this.socket.readyState === 'closed') {
        this.socket = new Socket(this.uri);
        this.setupSocketListeners();
        self.timeouts.push(setTimeout(function() {self.tryToReopen();}, self.retryTimeout));
      }
    }
  }



  /**
   * Checkes if the socket is still closed after a timeout
   * If socket is closed, closes the reliable socket
   * Otherwise, keep socket open
   *
   * @api private
   */
  ReliableSocket.prototype.checkStillClosed = function() {
    if (this.socket.readyState === 'closed') {
      this.readyState = 'closed';
      if (this.firstClosed) {
        this.emit('close');
        this.firstClosed = false;
      }
    }
    this.clearAllTimeouts();
  }



  /**
   * Clears all reconnect timeouts
   *
   *
   * @api private
   */
  ReliableSocket.prototype.clearAllTimeouts = function() {
    var l = this.timeouts.length;
    for (var x = 0; x < l; x++) {
      var timeout = this.timeouts[x];
      clearTimeout(timeout);
    }
    this.timeouts = [];
  }



  /**
   * Parses incoming data to the socket
   * Removing internal protocol and updating packets seen
   *
   * @api private
   */
  ReliableSocket.prototype.handleData = function(eventName, data) {
    var packet = parser.decodePacket(data);
    var fnName = 'on' + capFirstLetter(packet.type);

    try {
      this[fnName](packet.data);
    }
    catch (e) {
      debug('Caught exception %s', e);
    }

    function capFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  }



  /**
   * Sets the session id to the one sent by the server
   * @param  {String} eventName 
   * @param  {String} id      
   * @api private
   */
  ReliableSocket.prototype.onSid = function (eventName, id) {
    if (!this.sid) this.sid = id;
  }



  /**
   * Removes acknowledged packet from the write buffer
   * 
   * @param  {String} eventName
   * @param  {String} id
   * @api private
   */
  ReliableSocket.prototype.onAck = function (eventName, id) {
    var buffer = this.writeBuffer,
      sentID = parseInt(id, 10),
      l = buffer.length;

    if (!isNaN(sentID)) {
      // remove acknowledged packet from packet buffer
      for (var i = 0; i < l; i++) {
        var packet = buffer[i];
        var bufferID = packet[0];
        if (bufferID === sentID) {
          buffer.splice(i--, 1);
          break;
        }
      }
    }
  }



  /**
   * Handles an incoming message: marks it
   * as seen, and sends an acknowledgement to the server
   * 
   * @param  {String} eventName
   * @param  {Array} data [[<id>,<data>],[<id>,<data>]]
   * @api private
   */
  ReliableSocket.prototype.onMessage = function (eventName, data) {
    var l = data.length;
    for (var x = 0; x < l; x++) {
      var packet = data[x];
      var id = packet[0];
      var pData = packet[1];
      this.lastSeen = id;

      if (!this.seenObj[id]) {
        this.seenObj[id] = true;
        this.socket.send(parser.encodePacket({type: 'ack', data: id}));
        
        this.emit('data', pData);
        this.emit('message', pData);
      }
    }
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
    this.packetCount++;

    var packet = [this.packetCount, msg];
    var packetObj = {type: 'message', data: [msg]};

    this.socket.send(parser.encodePacket(packetObj), fn);
    return this;
  }

  return ReliableSocket;
}