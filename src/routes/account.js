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

		// Validation
		if (!amount || !to) {
			await session.abortTransaction();
			return res.status(400).json({ message: "Amount and recipient are required" });
		}

		const numAmount = Number(amount);
		if (isNaN(numAmount) || numAmount <= 0) {
			await session.abortTransaction();
			return res.status(400).json({ message: "Invalid amount" });
		}

		// Check sender can't send to themselves
		if (req.userId === to) {
			await session.abortTransaction();
			return res.status(400).json({ message: "Cannot transfer to yourself" });
		}

		const fromAccount = await Account.findOne({ userId: req.userId }).session(session);

		if (!fromAccount) {
			await session.abortTransaction();
			return res.status(404).json({ message: "Sender account not found" });
		}

		if (fromAccount.balance < numAmount) {
			await session.abortTransaction();
			return res.status(400).json({ 
				message: "Insufficient balance",
				currentBalance: fromAccount.balance / 100
			});
		}

		const toAccount = await Account.findOne({ userId: to }).session(session);

		if (!toAccount) {
			await session.abortTransaction();
			return res.status(404).json({ message: "Recipient account not found" });
		}

		// Debit sender, credit receiver
		await Account.updateOne(
			{ userId: req.userId }, 
			{ $inc: { balance: -numAmount } }
		).session(session);
		
		await Account.updateOne(
			{ userId: to }, 
			{ $inc: { balance: numAmount } }
		).session(session);

		await session.commitTransaction();
		res.status(200).json({ 
			message: "Transfer successful",
			amount: numAmount / 100,
			newBalance: (fromAccount.balance - numAmount) / 100
		});
	} catch (err) {
		await session.abortTransaction();
		console.error("Transfer error:", err);
		res.status(500).json({ message: "Internal server error" });
	} finally {
		session.endSession();
	}
});

module.exports = router;
