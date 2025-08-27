import users from "../models/user.js";
import Auth from '../common/auth.js';
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bcrypt from 'bcrypt';

dotenv.config();

// Create User
const create = async (req, res) => {
  try {
    let user = await users.findOne({ email: req.body.email, isDelete: false });
    if (!user) {
      req.body.password = await Auth.hashPassword(req.body.password);
      await users.create({
        ...req.body,
        isDelete: false,
        isActive: true
      });
      res.status(201).send({ message: "User Created Successfully" });
    } else {
      res.status(400).send({ message: `User with ${req.body.email} already exists` });
    }
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

// Login User
const login = async (req, res) => {
  try {
    let user = await users.findOne({ email: req.body.email, isDelete: false });
    if (user) {
      let hashCompare = await Auth.hashCompare(req.body.password, user.password);

      if (hashCompare) {
        let token = await Auth.createToken({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        });

        let userData = await users.findOne(
          { email: req.body.email, isDelete: false },
          { _id: 0, password: 0, createdAt: 0, email: 0 }
        );

        res.status(200).send({ message: "Login Successful", token, userData });
      } else {
        res.status(400).send({ message: "Invalid Password" });
      }
    } else {
      res.status(400).send({ message: `Account with ${req.body.email} does not exist!` });
    }
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

// Register User
const registerUser = async (req, res) => {
  const { name, email, status, mobile, add, desc, password } = req.body;

  try {
    if (!name || !email || !password || !mobile || !add || !desc || !status) {
      return res.status(400).json({ message: "Please fill in all the required fields." });
    }

    const hashedPassword = await Auth.hashPassword(password);
    const preUser = await users.findOne({ email, isDelete: false });
    const prenumber = await users.findOne({ mobile, isDelete: false });

    if (preUser) return res.status(400).send({ message: `${email} is already present.` });
    if (prenumber) return res.status(400).send({ message: `${mobile} is already present.` });

    const newUser = new users({
      name, email, status, mobile, add, desc,
      password: hashedPassword,
      isDelete: false,
      isActive: true
    });

    await newUser.save();

    res.status(201).json({ message: "User Created Successfully", newUser });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get All Users (exclude soft deleted)
const getUserData = async (req, res) => {
  try {
    const userData = await users.find({ isDelete: false });
    const totalUsers = await users.countDocuments({ role: 'user', isDelete: false });
    const activeUsers = await users.countDocuments({ status: 'Active', isDelete: false });
    const inactiveUsers = await users.countDocuments({ status: 'InActive', isDelete: false });

    res.status(200).json({ userData, totalUsers, activeUsers, inactiveUsers });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get Individual User (not deleted)
const getIndividualUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userIndividual = await users.findOne({ _id: id, isDelete: false });

    if (!userIndividual) return res.status(404).json("User not found");

    res.status(200).json(userIndividual);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Update User (not deleted)
const updateUserData = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.body.password) {
      req.body.password = await Auth.hashPassword(req.body.password);
    }

    const updatedUser = await users.findOneAndUpdate(
      { _id: id, isDelete: false },
      req.body,
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(201).json(updatedUser);
  } catch (error) {
    res.status(400).json(error);
  }
};

// Soft Delete User
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await users.findById(id);
    if (!user || user.isDelete) return res.status(404).json("User not found");

    user.isDelete = true;
    user.isActive = false;
    await user.save();

    res.status(200).json({ message: "User deleted successfully (soft delete)" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Reset Password (unchanged except excludes deleted users)
const resetpassword = async (req, res) => {
  const { email } = req.body;
  try {
    let user = await users.findOne({ email, isDelete: false });
    if (!user) return res.status(404).send({ message: "User not found" });

    const generateOTP = () => {
      const characters = "0123456789";
      return Array.from({ length: 6 }, () =>
        characters[Math.floor(Math.random() * characters.length)]
      ).join("");
    };

    const token = generateOTP();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 300000; // 5 minutes
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_MAILER,
        pass: process.env.PASS_MAILER,
      },
    });

    const resetUrl = `https://customer-relationship-management-mern.netlify.app/user/resetpassword`;

    const mailOptions = {
      from: "noreply@example.com",
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <p>Dear ${user.name},</p>
        <p>We received a request to reset your password. Here is your One-Time Password (OTP): <strong>${token}</strong></p>
        <p>This OTP expires in 5 minutes.</p>
        <a href=${resetUrl}>Reset Password</a>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        res.status(500).json({ message: "Something Went Wrong, try Again!" });
      } else {
        res.status(200).json({ message: "Password Reset Email sent" });
      }
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

// Verify Token & Reset Password
const passwordtoken = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await users.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
      isDelete: false
    });

    if (!user) return res.status(404).json({ message: "Invalid OTP" });

    if (user.resetPasswordExpires < Date.now()) {
      return res.status(401).json({ message: "OTP Expired" });
    }

    user.password = await Auth.hashPassword(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

export default {
  login,
  create,
  registerUser,
  getUserData,
  getIndividualUser,
  updateUserData,
  deleteUser,
  resetpassword,
  passwordtoken
};
