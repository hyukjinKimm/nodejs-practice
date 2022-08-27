const SocketIO = require('socket.io');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cookie = require('cookie-signature'); // 쿠키를 서명해주는 모듈


module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, { path: '/socket.io' });
  app.set('io', io);

  const room = io.of('/room'); // room 네임스페이스를 만들자
  const chat = io.of('/chat'); 
  let max = new Map();
  app.set('max', max);
  io.use((socket, next) => { // socket.requrest.session 과  socket.request.cookies 를 사용하기 위함
    cookieParser(process.env.COOKIE_SECRET)(socket.request, socket.request.res || {}, next);
    sessionMiddleware(socket.request, socket.request.res || {}, next);
  });

  room.on('connection', (socket) => {

    console.log('room 네임스페이스에 접속');
    socket.on('disconnect', () => {
      console.log('room 네임스페이스 접속 해제');
    });
  });

  chat.on('connection', (socket) => {
    
    console.log('chat 네임스페이스에 접속');
    const req = socket.request;
    const { headers: { referer } } = req; // req.header.referer
    const roomId = referer
      .split('/')[referer.split('/').length - 1]
      .replace(/\?.+/, '');
   
    socket.join(roomId);  // chat 네임스페이스에서 roomId 방에 사용자를 집어넣는다
    max.set(req.session.color, socket.id);
    max.set(socket.id, req.session.color);
    const currentRoom = socket.adapter.rooms[roomId];  // socekt.adapter.rooms 에는 현재 네임스페이스의 방의 목록들이 나와있다.
    const userCount = currentRoom ? currentRoom.length : 0;

    socket.to(roomId).emit('join', { // roomId 방에 있는 사람들에게 메시지를 보낸다.
      user: 'system',
      chat: `${req.session.color}님이 입장하셨습니다.`,
      userCount: userCount
    });
    socket.on('initialize', (data) => {
      socket.emit('userCount', {userCount});
    })
    
    socket.on('disconnect',() => {
      const req = socket.request;
      const { headers: { referer } } = req; // req.header.referer
      const roomId = referer
        .split('/')[referer.split('/').length - 1]
        .replace(/\?.+/, '');
      const signedCookie = cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET);
      const connectSID = `${signedCookie}`; 
      max.delete(req.session.color);
      max.delete(socket.id);
      console.log('chat 네임스페이스 접속 해제');
      socket.leave(roomId);  // 사용자가 roomId 방을 떠나게 한다.
      axios.get(`http://localhost:8005/room/${roomId}/update`, {
        headers: {
          Cookie: `connect.sid=s%3A${connectSID}`  // 세션의 서명은 앞에 s%3A 를 붙여야 한다.
        } 
      })
      .then(() => {
 
        const currentRoom = socket.adapter.rooms[roomId];  // socekt.adapter.rooms 에는 현재 네임스페이스의 방의 목록들이 나와있다.
        const userCount = currentRoom ? currentRoom.length : 0;
  
        if (userCount === 0) { // 유저가 0명이면 방 삭제
  
          axios.delete(`http://localhost:8005/room/${roomId}`, {
            headers: {
              Cookie: `connect.sid=s%3A${connectSID}`  // 세션의 서명은 앞에 s%3A 를 붙여야 한다.
            } 
          })
            .then(() => {
              console.log('방 제거 요청 성공');
            })
            .catch((error) => {
              console.error(error);
            });
        } else {
          axios.get(`http://localhost:8005/room/${roomId}/owner`, {
            headers: {
              Cookie: `connect.sid=s%3A${connectSID}`  // 세션의 서명은 앞에 s%3A 를 붙여야 한다.
            } 
          })   
            .then((response) => {
             
              const owner = response.data.owner;
             
              socket.to(roomId).emit('exit', {
                user: 'system',
                chat: `${req.session.color}님이 퇴장하셨습니다.`,
                userCount: userCount,
                owner: owner
              })
            })   
            .catch((e) => {
              console.error(e)
            })
        }
      })
      .catch((err) => {
        console.error(err);
      });
    });

    socket.on('chat', (data) => {
      socket.to(data.room).emit(data);
    });
  });
};
