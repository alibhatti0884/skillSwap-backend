const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const SwapRequest = require('../models/SwapRequest');

/**
 * FR7: Real-Time Communication via Socket.io
 *
 * Room strategy: each accepted SwapRequest._id is used as a Socket.io "room".
 * Both matched users join the same room (join_room) and any message emitted
 * by either client (send_message) is broadcast to everyone in that room and
 * persisted to MongoDB.
 */
module.exports = function initSocket(io) {
  // Authenticate the socket connection using the same JWT issued at login
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error: no token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.userId})`);

    // socket.on('join_room', ...) -> user joins the chat room for a specific accepted swap
    socket.on('join_room', async ({ swapId }) => {
      try {
        const swap = await SwapRequest.findById(swapId);
        if (!swap) return socket.emit('error_message', 'Swap request not found');

        const isParticipant =
          swap.sender.toString() === socket.userId || swap.receiver.toString() === socket.userId;
        if (!isParticipant || swap.status !== 'Accepted') {
          return socket.emit('error_message', 'Not authorized to join this chat room');
        }

        socket.join(swapId);
        socket.emit('joined_room', { swapId });
      } catch (err) {
        socket.emit('error_message', 'Failed to join room');
      }
    });

    // socket.emit('send_message', ...) from client -> persist + broadcast to room
    socket.on('send_message', async ({ swapId, text }) => {
      try {
        if (!text || !text.trim()) return;

        const swap = await SwapRequest.findById(swapId);
        if (!swap || swap.status !== 'Accepted') {
          return socket.emit('error_message', 'Chat is not available for this request');
        }

        const message = await Message.create({
          swapRequest: swapId,
          sender: socket.userId,
          text: text.trim()
        });

        const populated = await message.populate('sender', 'name avatarUrl');

        // Broadcast to everyone in the room, including the sender (keeps UI simple/consistent)
        io.to(swapId).emit('receive_message', populated);
      } catch (err) {
        socket.emit('error_message', 'Failed to send message');
      }
    });

    socket.on('typing', ({ swapId }) => {
      socket.to(swapId).emit('user_typing', { userId: socket.userId });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
