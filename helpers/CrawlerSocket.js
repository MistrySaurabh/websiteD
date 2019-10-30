module.exports = function(socket) {

  console.log("Crawler Socket Connected")

  socket.on('identity', function(identity) {
    console.log('identity on socket identity ==',identity);
    socket.identity = identity
  });

}
