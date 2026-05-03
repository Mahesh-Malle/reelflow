import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db';
import UserChannelAccess from '../models/UserChannelAccess';

dotenv.config();

const PERMISSION_LEVELS: Record<string, number> = {
  'VIEW_PLANNER': 1,
  'EDIT_PLANNER': 2,
  'VIEW_ANALYTICS': 3,
  'EDIT_ANALYTICS': 4,
  'ADMIN': 5,
};

const migrate = async () => {
  await connectDB();

  try {
    // Find all records using lean() to get raw objects (since schema changed)
    const records = await UserChannelAccess.find({}).lean();
    console.log(`Found ${records.length} records to migrate.`);

    for (const record of records) {
      const anyRecord = record as any;
      const perms = anyRecord.permissions || [];
      let highestRole = anyRecord.role;

      if (perms.length > 0) {
        // Sort by level descending and take the first one
        const sorted = [...perms].sort((a, b) => 
          (PERMISSION_LEVELS[b] || 0) - (PERMISSION_LEVELS[a] || 0)
        );
        highestRole = sorted[0];
      }

      if (!highestRole) {
        highestRole = 'VIEW_PLANNER';
      }

      await UserChannelAccess.updateOne(
        { _id: record._id }, 
        { 
          $set: { role: highestRole }, 
          $unset: { permissions: "" } 
        }
      );
      console.log(`Migrated user ${record.userId} on channel ${record.channelId} to role ${highestRole}`);
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
