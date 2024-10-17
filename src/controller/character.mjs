import { logger } from '../logger.mjs';

const character = async (socket, sockets, sql) => {
  // get user token from cookie
  let ip = socket.handshake.headers['x-real-ip'];
  const cookies = socket.handshake.headers['cookie'].split('; ');
  const hexToken = cookies.find(cookie => cookie.startsWith('hex_token='));

  // user verification via token
  const userInfo = await sql.getOne('SELECT id, username, BIN_TO_UUID(token) AS token, permissions, INET_NTOA(`lastip`) AS lastip FROM users WHERE token = UUID_TO_BIN(?)', hexToken.split('=')[1]);
  if (userInfo !== null) {
    if (userInfo.lastip === ip) {
      let loggedIn;
      Object.keys(sockets).filter(function(sock) {
        loggedIn = sockets[sock].username === userInfo.username;
      });
      if (loggedIn) {
        logger.warn(`${userInfo.username} already logged in!`);
        socket.emit('error', 'already logged in');
        socket.disconnect(true);
      } else {
        socket.userid = userInfo.id;
        socket.username = userInfo.username;
        socket.permissions = userInfo.permissions;
        sockets[socket.id] = socket;
        logger.http(`${socket.username}@${ip} connected. token: ${userInfo.token}`);
      }
    } else {
      logger.warn(`${userInfo.lastip} !== ${ip}`);
      socket.emit('error', 'ip address mismatch');
      socket.disconnect(true);
    }
    logger.verbose(`Database: username=${socket.username}, permissions=${socket.permissions}`);
  } else {
    logger.error(`${hexToken} not found!`);
    socket.emit('error', 'authentication failed');
    socket.disconnect(true);
  }

  // emit the welcome packet
  socket.emit('hello', { id: socket.userid, username: socket.username, perms: socket.permissions });

  const createHandler = async (data, callback) => {
    if (await sql.query(`INSERT INTO league_${socket.league} (uid, class, gender) VALUES (?, ?, ?)`, [socket.userid, data.class, data.gender > 1 ? 'male' : 'female'])) {
      // character created successfully
      const user = await sql.getOne(`SELECT * FROM league_${socket.league} WHERE uid = ?`, socket.userid);
      callback(user);
    } else {
      logger.error('Character creation failed!');
      socket.emit('error', 'character create failed');
      callback({});
    }
  };

  socket.on('create-character', async (data, callback) => {
    // TODO: add new character to database, data contains class number
    sql.queue.addToQueue(createHandler.bind(null, data, callback));
  });

  socket.on('get-character', async (callback) => {
    const character = await sql.getOne(`SELECT * FROM league_${socket.league} WHERE uid = ${socket.userid}`);
    if (character !== null) {
      // Login with character
      callback(character);
      logger.debug(`[Ack] { character: true } socket: ${socket.id}`);
    } else {
      // Reroute to character creation
      callback({});
      logger.debug(`[Ack] { character: false } socket: ${socket.id}`);
    }
  });
};

export { character };