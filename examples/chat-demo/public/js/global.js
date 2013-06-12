(function($) {
  var time = 0,
    socketConstructor = rsock(eio.Socket),
    socket = new socketConstructor('ws://localhost/'),
    randomName = Faker.Name.findName(),
    timeInterval = 200;

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
    var dataTime = $(data).text(),
        intTime = parseInt(dataTime, 10),
        userRegex = new RegExp(randomName),
        isUser = userRegex.test(data),
        pastTime = (intTime !== (time - timeInterval)),
        className = (isUser && pastTime) ? 'message missed' : 'message';

    if (intTime === 0) className = 'message'; // hack for first time
    if (isUser) data = data + ' <- You';
    $('ul#commentList').append('<li class="' + className + '">' + data + '</li>');
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

  $('#disconnectButton').click(function() {
    socket.socket.close();
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