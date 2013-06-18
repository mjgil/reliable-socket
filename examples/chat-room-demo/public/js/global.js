(function($) {
  var time = 0,
    // url = 'ws://localhost',
    url = 'ws://reliable-socket-demo.mjgil.com',
    socket = new socketConstructor(url),
    timeInterval = 500;

  var dataReceived = function(data) {
  }

  var socketClosed = function() {
    console.log("Socket closed.");
  }

  socket.on('open', function () {
    console.log('opened');
  });

  socket.on('message', dataReceived);
  socket.on('close', socketClosed);

  socket.on('error', function(error) {
      console.log('error');
      console.log(error);
  });

  $('#disconnectButton').click(function() {
    socket.socket.close();
  });

  function sendPacket (data) {
    var time = (new Date()).getTime();
    socket.send({time: time, data: data});
  }
})($);