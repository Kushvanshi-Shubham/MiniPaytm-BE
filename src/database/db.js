const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();
// console.log("MONGO_URL:", process.env.MONGO_URL)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

connectDB();

// User Schema ------------------
const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		lowercase: true,
		minLength: 3,
		maxLength: 30
	},
	password: {
		type: String,
		required: true,
		minLength: 6
	},
	firstName: {
		type: String,
		required: true,
		trim: true,
		maxLength: 50
	},
	lastName: {
		type: String,
		required: true,
		trim: true,
		maxLength: 50
	}
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Account Schema ------------------
const accountSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		unique: true
	},
	balance: {
		type: Number,  
		required: true,
		default: 0
	}
}, { timestamps: true });

const Account = mongoose.model('Account', accountSchema);

module.exports = {
	User,
	Account
};
