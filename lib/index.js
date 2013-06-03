var Emitter = require('emitter');

/**
 * Exports the constructor.
 */

module.exports = function(Socket) {
  return ReliableSocket;
  /**
   * Reliable socket constructor.
   *
   * @api public.
   */


  function ReliableSocket(uri) {
    if (!(this instanceof ReliableSocket)) return new ReliableSocket(uri, opts);

    this.socket = new Socket(uri);

    this.reconnectTimeout = opts.timeout || 5000;
    this.retryTimeout = 1000;
    this.seenObj = {};
    this.lastSeen = 0;
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
    var firstOpen = true;
    var firstClosed = true;

    this.socket
      .on('open', function () {
        if (firstOpen) {
          self.emit('open');
          firstOpen = false;
          self.readyState = 'open';
        }
        else {
          // new underlying socket
          socket.send('getMissed:' + '&session=' + self.sid + '&last=' + self.lastSeen);
          self.seenObj = {};
          self.lastSeen = 0;
        }
      })
      .on('close', function (reason, desc) {
        setTimeout(tryToReopen, self.retryTimeout);
        setTimeout(checkStillClosed, self.reconnectTimeout);
      })
      .on('error', function (err) {
        self.emit('error', err);
        setTimeout(tryToReopen, self.retryTimeout);
        setTimeout(checkStillClosed, self.reconnectTimeout);
      })
      .on('data', function (data) {
        handleData('data', data);
      })
      .on('message', function (msg) {
        handleData('msg', msg)
      })

    function tryToReopen() {
      if (self.readyState !== 'closed') {
        if (self.socket.readyState === 'closed') self.socket.open();
        setTimeout(tryToReopen, self.retryTimeout);
      }
    }

    function checkStillClosed() {
      if (self.socket.readyState === 'closed') {
        self.readyState = 'closed';
        if (firstClosed) {
          self.emit('close');
          firstClosed = false;
        }
      }
    }

    function handleData(tag, data) {
      var array = data.split(':')
      var key = array.shift();
      var value = array.join(':');
      if (key === 'sessionID') {
        self.sid = value;
      }
      else if (key === 'missed') {
        var array = value.split(',')
        var key = parseInt(array.shift(), 10);
        var value = array.join(',');
        if (tag === 'data') self.emit('data', value);
        if (tag === 'msg') self.emit('message', value);
      }
      else {
        var array = data.split(',')
        var key = parseInt(array.shift(), 10);
        var value = array.join(',');
        self.lastSeen = key;


        if (!self.seenObj[key]) {
          self.seenObj[key] = true;
          self.socket.send('ack:' + key);
          // console.log('key: ', key);
          
          self.emit('data', value);
          self.emit('message', value);
        }
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

}

