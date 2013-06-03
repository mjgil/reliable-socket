var rsock = require('../index'),
  expect = require('expect.js'),
  websocket = require('ws');



describe('reliable-socket', function() {
  it('should be a function', function() {
    expect(rsock).to.be.a('function');
  });

  it ('should return reliable socket constructor', function() {
    var reliableConstruct = rsock(websocket);
    expect(reliableConstruct).to.be.a('function');
  });

  describe('reliable-socket-instance', function() {
    var reliableConstruct = rsock(websocket),
        uri = 'ws://localhost:8000',
        server = new websocket.Server({port: 8000});

    it('should have all of the correct parameters', function() {
      var socketInstance = reliableConstruct(uri);
      expect(socketInstance.uri).to.be(uri);
      expect(socketInstance.reconnectTimeout).to.be(5000);
      expect(socketInstance.retryTimeout).to.be(1000);
      expect(socketInstance.seenObj).to.be.an('object');
      expect(socketInstance.lastSeen).to.be(0);
      expect(socketInstance.firstOpen).to.be(true);
      expect(socketInstance.firstClosed).to.be(true);
      expect(socketInstance.sid).to.be(null);
      expect(socketInstance.send).to.be.a('function');
      expect(socketInstance.write).to.be.a('function');
      expect(socketInstance.setupSocketListeners).to.be.a('function');
      expect(socketInstance.tryToReopen).to.be.a('function');
      expect(socketInstance.checkStillClosed).to.be.a('function');
      expect(socketInstance.handleData).to.be.a('function');
    });

    describe('underlying socket listeners', function() {
      it('should open correctly', function(done) {
        var socketInstance = reliableConstruct(uri);
        setTimeout(function() {
          expect(socketInstance.readyState).to.be('open');
          done();
        }, 10)
      });

      it('should set session id correctly', function(done) {
        server.on('connection', function(socket) {
          socket.send('sessionID:123');
        });
        var socketInstance = reliableConstruct(uri);
        setTimeout(function() {
          expect(socketInstance.sid).to.be('123');
          done();
        }, 10)
      });
    });



  });
});