// const mongoose = require('mongoose');

// const transactionSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     type: {
//       type: String,
//       enum: ['deposit', 'withdrawal', 'transfer_sent', 'transfer_received'],
//       required: true,
//     },
//     amount: {
//       type: Number,
//       required: true,
//       min: 1,
//     },
//     balanceBefore: {
//       type: Number,
//       required: true,
//     },
//     balanceAfter: {
//       type: Number,
//       required: true,
//     },
//     description: {
//       type: String,
//       default: '',
//     },
//     relatedUser: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       default: null,
//     },
//     relatedAccountNumber: {
//       type: String,
//       default: null,
//     },
//     status: {
//       type: String,
//       enum: ['success', 'failed'],
//       default: 'success',
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('Transaction', transactionSchema);

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer_sent', 'transfer_received']
  },

  amount: Number,
  description: String,

  balanceBefore: Number,
  balanceAfter: Number,

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'success'],
    default: 'pending'
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);