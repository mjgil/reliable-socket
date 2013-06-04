;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
  }

  if (require.aliases.hasOwnProperty(index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  fn._off = on;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var i = index(callbacks, fn._off || fn);
  if (~i) callbacks.splice(i, 1);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("component-indexof/index.js", function(exports, require, module){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
});
require.register("visionmedia-debug/index.js", function(exports, require, module){
if ('undefined' == typeof window) {
  module.exports = require('./lib/debug');
} else {
  module.exports = require('./debug');
}

});
require.register("visionmedia-debug/debug.js", function(exports, require, module){

/**
 * Expose `debug()` as the module.
 */

module.exports = debug;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    fmt = coerce(fmt);

    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

// persist

if (window.localStorage) debug.enable(localStorage.debug);

});
require.register("reliable-socket/lib/index.js", function(exports, require, module){
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
    this.readyState = 'closed';
    this.socket = new Socket(uri);
    this.reconnectTimeout = opts.reconnectTimeout || 5000;
    this.retryTimeout = opts.retryTimeout || 1000;
    this.seenObj = {};
    this.lastSeen = 0;
    this.firstOpen = true;
    this.firstClosed = true;
    this.sid = null;
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
        console.log('close');
        setTimeout(function() {self.tryToReopen();}, self.retryTimeout);
        setTimeout(function() {self.checkStillClosed();}, self.reconnectTimeout);
      })
      .on('error', function (err) {
        console.log('error');
        self.emit('error', err);
        setTimeout(function() {self.tryToReopen();}, self.retryTimeout);
        setTimeout(function() {self.checkStillClosed();}, self.reconnectTimeout);
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
        setTimeout(function() {self.tryToReopen();}, self.retryTimeout);
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

      // if (eventName === 'data') console.log('missed: ', key);
      if (!this.seenObj[key]) {
        this.seenObj[key] = true;
        this.socket.send('ack:' + key);
        // console.log('key: ', key);
        
        this.emit('data', value);
        this.emit('message', value);
      }
    }
    else {
      var array = data.split(',')
      var key = parseInt(array.shift(), 10);
      var value = array.join(',');
      this.lastSeen = key;
      // if (eventName === 'data') console.log(key);


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


});
require.alias("component-emitter/index.js", "reliable-socket/deps/emitter/index.js");
require.alias("component-emitter/index.js", "emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-indexof/index.js", "reliable-socket/deps/indexof/index.js");
require.alias("component-indexof/index.js", "indexof/index.js");

require.alias("visionmedia-debug/index.js", "reliable-socket/deps/debug/index.js");
require.alias("visionmedia-debug/debug.js", "reliable-socket/deps/debug/debug.js");
require.alias("visionmedia-debug/index.js", "debug/index.js");

require.alias("reliable-socket/lib/index.js", "reliable-socket/index.js");

if (typeof exports == "object") {
  module.exports = require("reliable-socket");
} else if (typeof define == "function" && define.amd) {
  define(function(){ return require("reliable-socket"); });
} else {
  this["rsock"] = require("reliable-socket");
}})();