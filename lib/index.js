var Emitter = require('emitter');

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
    this.socket = new Socket(uri);
    this.reconnectTimeout = opts.reconnectTimeout || 5000;
    this.retryTimeout = opts.retryTimeout || 1000;
    this.seenObj = {};
    this.lastSeen = 0;
    this.setupSocketListeners();
    this.firstOpen = true;
    this.firstClosed = true;
    this.sid = null;
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
          firstOpen = false;
          self.readyState = 'open';
          self.socket.send('getSID:');
        }
        else {
          // new underlying socket
          self.socket.send('getMissed:' + '&session=' + self.sid + '&last=' + self.lastSeen);
          self.seenObj = {};
          self.lastSeen = 0;
        }
      })
      .on('close', function (reason, desc) {
        setTimeout(self.tryToReopen, self.retryTimeout);
        setTimeout(self.checkStillClosed, self.reconnectTimeout);
      })
      .on('error', function (err) {
        self.emit('error', err);
        setTimeout(self.tryToReopen, self.retryTimeout);
        setTimeout(self.checkStillClosed, self.reconnectTimeout);
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
    if (this.readyState !== 'closed') {
      if (this.socket.readyState === 'closed') {
        this.socket = new Socket(this.uri);
        this.setupSocketListeners();
      }
      setTimeout(this.tryToReopen, this.retryTimeout);
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
  }



  /**
   * Parses incoming data to the socket
   * Removing internal protocol and updating packets seen
   *
   * @api private
   */

  ReliableSocket.prototype.handleData = function(eventName, data) {
    var array = data.split(':')
    var key = array.shift();
    var value = array.join(':');
    if (key === 'sessionID') {
      if (!this.sid) this.sid = value;
    }
    else if (key === 'missed') {
      var array = value.split(',')
      var key = parseInt(array.shift(), 10);
      var value = array.join(',');
      if (eventName === 'data') self.emit('data', value);
      if (eventName === 'msg') self.emit('message', value);
    }
    else {
      var array = data.split(',')
      var key = parseInt(array.shift(), 10);
      var value = array.join(',');
      this.lastSeen = key;


      if (!this.seenObj[key]) {
        this.seenObj[key] = true;
        this.socket.send('ack:' + key);
        // console.log('key: ', key);
        
        this.emit('data', value);
        this.emit('message', value);
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
    this.socket.send(msg, fn);
    return this;
  }

  return ReliableSocket;
}

