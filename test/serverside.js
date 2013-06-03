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
        server = websocket.Server({port: 8000});

    it('should have all of the correct parameters', function() {
      var socketInstance = reliableConstruct(uri);
      
    });

  });
});