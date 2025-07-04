const express = require('express');
const { authMiddleware } = require('./authMiddleware');
const mongoose = require('mongoose');
const { Account } = require('../database/db');

const router = express.Router();

// Get Balance
router.get("/balance", authMiddleware, async (req, res) => {
	try {
		const account = await Account.findOne({ userId: req.userId });

		if (!account) {
			return res.status(404).json({ message: "Account not found" });
		}

		res.status(200).json({ balance: account.balance });
	} catch (err) {
		console.error("Balance fetch error:", err);
		res.status(500).json({ message: "Internal server error" });
	}
});

// Transfer Money 
router.post("/transfer", authMiddleware, async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const { amount, to } = req.body;

		if (!amount || !to || amount <= 0) {
			await session.abortTransaction();
			return res.status(400).json({ message: "Invalid input" });
		}

		const fromAccount = await Account.findOne({ userId: req.userId }).session(session);

		if (!fromAccount || fromAccount.balance < amount) {
			await session.abortTransaction();
			return res.status(400).json({ message: "Insufficient balance" });
		}

		const toAccount = await Account.findOne({ userId: to }).session(session);

		if (!toAccount) {
			await session.abortTransaction();
			return res.status(400).json({ message: "Invalid recipient account" });
		}

		// Debit sender, credit receiver
		await Account.updateOne({ userId: req.userId }, { $inc: { balance: -amount } }).session(session);
		await Account.updateOne({ userId: to }, { $inc: { balance: amount } }).session(session);

		await session.commitTransaction();
		res.status(200).json({ message: "Transfer successful" });
	} catch (err) {
		await session.abortTransaction();
		console.error("Transfer error:", err);
		res.status(500).json({ message: "Internal server error" });
	} finally {
		session.endSession();
	}
});

module.exports = router;
