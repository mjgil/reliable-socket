var Emitter = require('emitter'),
    json = require('json'),
    parser = require('../../reliable-socket-protocol');

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
          self.socket.send(parser.packets.open);
        }
        else {
          // new underlying socket
          self.socket.send(parser.packets.recon + '&session=' + self.sid + '&last=' + self.lastSeen);
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
    var type = parseInt(data.charAt(0),10);
    if (!isNaN(type)) {

      var data = data.substring(1),
          isSID = (type === parser.packets.sid),
          isPacket = (type === parser.packets.missed || 
                      type === parser.packets.message );


      if (isSID) {
        if (!this.sid) this.sid = data;
      }
      else if (isPacket) {
        var pData = parsePacket(data);
        this.lastSeen = pData.id;
        if (eventName === 'data') console.log(pData.id);


        if (!this.seenObj[pData.id]) {
          this.seenObj[pData.id] = true;
          this.socket.send(parser.packets.ack + '' + pData.id);
          
          this.emit('data', pData.data);
          this.emit('message', pData.data);
        }
      }

    }
    else {
      console.log('unknown packet');
    }

    function parsePacket(packet) {
      var array = packet.split(','),
          id = parseInt(array.shift(), 10),
          data = array.join(',');

      return {
        id: id,
        data: data
      };
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
    this.socket.send(msg, fn);
    return this;
  }

  return ReliableSocket;
}