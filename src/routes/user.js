const express = require("express");
const router = express.Router();
const zod = require("zod");
const { User, Account } = require("../database/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { JWT_SECRET } = require("../config");
const { authMiddleware } = require("./authMiddleware");
const rateLimit = require("../middleware/rateLimiter");

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts
  message: 'Too many authentication attempts, please try again later.'
});

const signupBody = zod.object({
  username: zod.string().email(),
  firstName: zod.string().min(1),
  lastName: zod.string().min(1),
  password: zod.string().min(6),
});

//SIGN-UP
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const parsed = signupBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input format" });
    }

    const { username, firstName, lastName, password } = parsed.data;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Email already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      firstName,
      lastName,
    });

    await Account.create({
      userId: user._id,
      balance: 1 + Math.random() * 10000,
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(201).json({
      message: "User created successfully",
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//SIGN-IN
const signinBody = zod.object({
  username: zod.string().email(),
  password: zod.string().min(6),
});

router.post("/signin", authLimiter, async (req, res) => {
  try {
    const parsed = signinBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input format" });
    }

    const { username, password } = parsed.data;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.json({ token });
  } catch (err) {
    console.error("Signin error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET CURRENT USER INFO
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("firstName lastName username");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Fetch /me error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


//UPDATE DETAILS
const updateBody = zod.object({
  password: zod.string().min(6).optional(),
  firstName: zod.string().optional(),
  lastName: zod.string().optional(),
});

router.put("/", authMiddleware, async (req, res) => {
  try {
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(411)
        .json({ message: "Error while updating information" });
    }

    const updates = parsed.data;

    if (updates.password) {
      if (updates.password.length < 6) {
        return res
          .status(411)
          .json({ message: "Error while updating information" });
      }
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    await User.updateOne({ _id: req.userId }, { $set: updates });

    return res.status(200).json({ message: "Updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// TO GET USER FROM BACKEND
router.get("/bulk", authMiddleware, async (req, res) => {
  try {
    const filter = req.query.filter || "";

    const users = await User.find({
      $or: [
        { firstName: { $regex: filter, $options: "i" } },
        { lastName: { $regex: filter, $options: "i" } },
      ],
      _id: { $ne: req.userId },
    }).select("firstName lastName _id");

    res.status(200).json({ users });
  } catch (err) {
    console.error("User bulk fetch error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
