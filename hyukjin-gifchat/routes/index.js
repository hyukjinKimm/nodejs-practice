const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Room = require('../schemas/room');
const Chat = require('../schemas/chat');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    
    const rooms = await Room.find({});
    res.render('main', { rooms, title: 'GIF 채팅방' });
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.get('/kick', (req, res, next) => {
  try {
    
    res.end('you are kicked by room owner');

  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.get('/room', (req, res) => {
  res.render('room', { title: 'GIF 채팅방 생성' });
});

router.post('/room', async (req, res, next) => {
  try {
    const newRoom = await Room.create({
      title: req.body.title,
      max: req.body.max,
      owner: req.session.color,
      password: req.body.password,
    });
    const io = req.app.get('io');
    io.of('/room').emit('newRoom', newRoom);  // room 네임 스페이스에 접속한 사람들에게 보내는 메시지
    res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/room/:id', async (req, res, next) => {
  try {
    const room = await Room.findOne({ _id: req.params.id });
    const io = req.app.get('io');
    if (!room) {
      return res.redirect('/?error=존재하지 않는 방입니다.');
    }
    if (room.password && room.password !== req.query.password) {
      return res.redirect('/?error=비밀번호가 틀렸습니다.');
    }
    const { rooms } = io.of('/chat').adapter;
    if (rooms && rooms[req.params.id] && room.max <= rooms[req.params.id].length) {
      return res.redirect('/?error=허용 인원이 초과하였습니다.');
    }
    const chats = await Chat.find({ room: room._id, whisperto: ""  }).sort('createdAt');

    return res.render('chat', {
      room,
      title: room.title,
      chats,
      user: req.session.color,
      owner: room.owner,
  
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});

router.get('/room/:id/update', async (req ,res, next) => {
  try{
    
    const max = req.app.get('max')
    const room = await Room.findOne({ _id: req.params.id });
    const io = req.app.get('io');
  
    const people = Object.keys( io.of('/chat').adapter.rooms[req.params.id].sockets);
    const gone = req.session.color;
    if (room.owner === gone){ // 방장이 방을 나감
      const newOnwer = max.get(people[0]);
      await Room.update({_id: req.params.id }, { owner: newOnwer });
  
      res.json({ newOnwer })
    } else { // 방장이 나간게 아님
      res.end('방장 업데이트 성공');
    }
    
  } catch (e) {
    console.error()
  }
})


router.post('/room/:id/forceDisconnet', async (req, res, next) => {
  try {
    const room = await Room.findOne({ _id: req.params.id });
    const max = req.app.get('max');
    if(room.owner === req.session.color ) {
      const io = req.app.get('io');
      const socketid = max.get(req.body.subject).slice(6);;
      console.log(socketid);
      io.to(socketid).emit('forceDisconnect', {'message': '너 강퇴'});
      res.end('ok')
    } else {
      res.end('당신은 방장이 아닙니다.')
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});


router.get('/room/:id/owner', async (req ,res, next) => {
  try{
    
   
    const room = await Room.findOne({ _id: req.params.id });
    console.log(room.owner)
    res.json({ owner : room.owner});
    
  } catch (e) {
    console.error()
  }
})

router.delete('/room/:id', async (req, res, next) => {
  try {
    await Room.remove({ _id: req.params.id });
    await Chat.remove({ room: req.params.id });
    res.send('ok');
    setTimeout(() => {
      req.app.get('io').of('/room').emit('removeRoom', req.params.id);
    }, 2000);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post('/room/:id/chat', async (req, res, next) => {
  try {
    const chat = await Chat.create({
      room: req.params.id,
      user: req.session.color,
      chat: req.body.chat,
    });

    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    // chat네임스페이스의 req.params.id 방에 들어있는 사람들에게 보내는 메시지
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post('/room/:id/whisperchat', async (req, res, next) => {
  try {
    //귓속말을 보낸다.
    //1. 방안에 그 사람이 있는지 확인한다 . // 프론트에서 처리 
    if(req.app.get('max').get(req.body.whisperto)){ // 방에 들어있음
      const chat = await Chat.create({
        room: req.params.id,
        user: req.session.color, // 보낸 사람
        chat: req.body.chat,
        whisperto: req.body.whisperto, // 보낼 사람
      });
      const io = req.app.get('io');
      const socketid1 = req.app.get('max').get(req.body.whisperto).slice(6);
      io.to(socketid1).emit('chat', chat);

      const socketid2 = req.app.get('max').get(req.session.color).slice(6);
      io.to(socketid2).emit('chat', chat);
      // 귓속말은 전역 스페이스 메시지로 보내짐
      res.send('ok');
    } else { // 방에 없음
      res.end('no current user')
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});
try {
  fs.readdirSync('uploads');
} catch (err) {
  console.error('uploads 폴더가 없어 uploads 폴더를 생성합니다.');
  fs.mkdirSync('uploads');
}
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, done) {
      done(null, 'uploads/');
    },
    filename(req, file, done) {
      const ext = path.extname(file.originalname);
      done(null, path.basename(file.originalname, ext) + Date.now() + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});
router.post('/room/:id/gif', upload.single('gif'), async (req, res, next) => {
  try {
    const chat = await Chat.create({
      room: req.params.id,
      user: req.session.color,
      gif: req.file.filename,
    });
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    // req.app.get('io').to(socket.id) 귓속말 보내기 기능
    // req.app.get('io').broadcast.emit  나를 제외한 모든 사람에게 보내는 것 
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;
