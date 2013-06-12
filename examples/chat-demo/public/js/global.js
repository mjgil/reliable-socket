(function($) {
  var time = 0,
    socketConstructor = rsock(eio.Socket),
    socket = new socketConstructor('ws://localhost/'),
    randomName = Faker.Name.findName(),
    timeInterval = 500;

  //console.log(socket);
  //console.log(socket.socket);
  // if ('WebSocket' in window) {

  //   //var webSock = new WebSocket('ws://localhost:8000');
  //   console.log(webSock);
  //   //var socketInstance = socketConstructor('ws://localhost');
  //   //.log(socketInstance);
  // }

  // var socket = new rsock('ws://localhost/');

  var dataReceived = function(data) {
    $('ul#commentList').append('<li class="message">' + data + '</li>');
  }

  var socketClosed = function() {
    console.log("Socket closed.");
  }

  socket.on('open', function () {
    console.log('opened');
    sendPacket();
  });

  socket.on('message', dataReceived);
  socket.on('close', socketClosed);

  socket.on('error', function(error) {
      console.log('error');
      console.log(error);
  });

  function sendPacket () {
    socket.send('<span class="bold">' +time+ ': </span>' +
      randomName + ' said hi everyone');
    time = time + timeInterval;
    setTimeout(function () {
      sendPacket();
    }, timeInterval);
  }
})($);