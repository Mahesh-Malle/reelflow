import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import connectDB from '../config/db';

dotenv.config();

const setAdmin = async () => {
  await connectDB();
  const mobile = '9898989898';
  
  try {
    const user = await User.findOneAndUpdate(
      { mobileNumber: mobile },
      { isAdmin: true },
      { new: true }
    );
    
    if (user) {
      console.log(`✅ User ${mobile} is now an ADMIN.`);
    } else {
      console.log(`❌ User with mobile ${mobile} not found.`);
      console.log(`Creating user ${mobile} as ADMIN...`);
      const newUser = new User({
        mobileNumber: mobile,
        password: 'password', // They should change this
        name: 'Admin',
        isAdmin: true
      });
      await newUser.save();
      console.log(`✅ Created user ${mobile} as ADMIN.`);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

setAdmin();
