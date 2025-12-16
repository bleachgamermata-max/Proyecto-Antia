import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simple seed (MongoDB no replica set)...');

  // Generate IDs
  const generateId = () => Math.floor(Math.random() * 1000000000).toString().padStart(24, '0');
  
  const superAdminId = generateId();
  const tipsterUserId = generateId();
  const tipsterProfileId = generateId();
  const clientUserId = generateId();
  const clientProfileId = generateId();

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const tipsterPasswordHash = await bcrypt.hash('Tipster123!', 10);
  const clientPasswordHash = await bcrypt.hash('Client123!', 10);

  const now = new Date();

  // Create SuperAdmin using $runCommandRaw
  try {
    await prisma.$runCommandRaw({
      insert: 'User',
      documents: [{
        _id: superAdminId,
        email: 'admin@antia.com',
        phone: '+34600000000',
        password_hash: adminPasswordHash,
        role: 'SUPERADMIN',
        status: 'ACTIVE',
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created SuperAdmin: admin@antia.com');
  } catch (e) {
    console.log('⚠️  SuperAdmin might already exist');
  }

  // Create Tipster User
  try {
    await prisma.$runCommandRaw({
      insert: 'User',
      documents: [{
        _id: tipsterUserId,
        email: 'fausto.perez@antia.com',
        phone: '+34611111111',
        password_hash: tipsterPasswordHash,
        role: 'TIPSTER',
        status: 'ACTIVE',
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created Tipster: fausto.perez@antia.com');
  } catch (e) {
    console.log('⚠️  Tipster might already exist');
  }

  // Create Tipster Profile
  try {
    await prisma.$runCommandRaw({
      insert: 'TipsterProfile',
      documents: [{
        _id: tipsterProfileId,
        user_id: tipsterUserId,
        public_name: 'Fausto Perez',
        telegram_username: '@faustoperez',
        payout_method: 'IBAN',
        payout_fields: {
          iban: 'ES1234567890123456789012',
          bankName: 'Banco Santander',
        },
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created Tipster Profile');
  } catch (e) {
    console.log('⚠️  Tipster Profile might already exist');
  }

  // Create Client User
  try {
    await prisma.$runCommandRaw({
      insert: 'User',
      documents: [{
        _id: clientUserId,
        email: 'cliente@example.com',
        phone: '+34622222222',
        password_hash: clientPasswordHash,
        role: 'CLIENT',
        status: 'ACTIVE',
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created Client: cliente@example.com');
  } catch (e) {
    console.log('⚠️  Client might already exist');
  }

  // Create Client Profile
  try {
    await prisma.$runCommandRaw({
      insert: 'ClientProfile',
      documents: [{
        _id: clientProfileId,
        user_id: clientUserId,
        country_iso: 'ES',
        consent_18: true,
        consent_terms: true,
        consent_privacy: true,
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created Client Profile');
  } catch (e) {
    console.log('⚠️  Client Profile might already exist');
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Created accounts:');
  console.log('  SuperAdmin: admin@antia.com / Admin123!');
  console.log('  Tipster: fausto.perez@antia.com / Tipster123!');
  console.log('  Client: cliente@example.com / Client123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
