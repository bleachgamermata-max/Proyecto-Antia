import { PrismaClient, UserRole, UserStatus, BillingType, BillingPeriod, HouseMethod, HouseStatus, ReferralEventType, ReferralEventSource } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.apiKey.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.config.deleteMany();
  await prisma.webhookLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.platformFeeTier.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.referralEvent.deleteMany();
  await prisma.referralLink.deleteMany();
  await prisma.house.deleteMany();
  await prisma.channelAccessGrant.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.tipsterProfile.deleteMany();
  await prisma.user.deleteMany();

  // Create SuperAdmin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@antia.com',
      phone: '+34600000000',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Created SuperAdmin:', superAdmin.email);

  // Create Approved Tipster
  const tipsterUser = await prisma.user.create({
    data: {
      email: 'fausto.perez@antia.com',
      phone: '+34611111111',
      passwordHash: await bcrypt.hash('Tipster123!', 10),
      role: UserRole.TIPSTER,
      status: UserStatus.ACTIVE,
      tipsterProfile: {
        create: {
          publicName: 'Fausto Perez',
          telegramUsername: '@faustoperez',
          payoutMethod: 'IBAN',
          payoutFields: {
            iban: 'ES1234567890123456789012',
            bankName: 'Banco Santander',
          },
        },
      },
    },
  });
  console.log('✅ Created Tipster:', tipsterUser.email);

  const tipsterProfile = await prisma.tipsterProfile.findUnique({
    where: { userId: tipsterUser.id },
  });

  // Create Client
  const clientUser = await prisma.user.create({
    data: {
      email: 'cliente@example.com',
      phone: '+34622222222',
      passwordHash: await bcrypt.hash('Client123!', 10),
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      clientProfile: {
        create: {
          countryIso: 'ES',
          consent18: true,
          consentTerms: true,
          consentPrivacy: true,
        },
      },
    },
  });
  console.log('✅ Created Client:', clientUser.email);

  // Create Products
  const productOneTime = await prisma.product.create({
    data: {
      tipsterId: tipsterProfile!.id,
      title: 'Pronóstico VIP - Partido del Sábado',
      description: 'Pronóstico exclusivo para el partido del fin de semana',
      priceCents: 2000, // 20 EUR
      currency: 'EUR',
      billingType: BillingType.ONE_TIME,
      validityDays: 7,
      telegramChannelId: '@antia_vip_channel',
      active: true,
    },
  });
  console.log('✅ Created ONE_TIME Product:', productOneTime.title);

  const productSubscription = await prisma.product.create({
    data: {
      tipsterId: tipsterProfile!.id,
      title: 'Suscripción Mensual VIP',
      description: 'Acceso completo a todos los pronósticos del mes',
      priceCents: 9900, // 99 EUR
      currency: 'EUR',
      billingType: BillingType.SUBSCRIPTION,
      billingPeriod: BillingPeriod.MONTH,
      telegramChannelId: '@antia_premium_channel',
      active: true,
    },
  });
  console.log('✅ Created SUBSCRIPTION Product:', productSubscription.title);

  // Create Demo Houses
  const houseBwin = await prisma.house.create({
    data: {
      name: 'Bwin',
      method: HouseMethod.API,
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      apiBaseUrl: 'https://api.bwin.com/v1',
      credentials: {
        apiKey: 'bwin_demo_key',
        apiSecret: 'bwin_demo_secret',
      },
      commissionRules: {
        cpa: { register: 5000, ftd: 15000 }, // 50 EUR register, 150 EUR FTD
        revshare: { percentage: 25 },
        type: 'HYBRID',
      },
      validationWindowDays: 30,
      status: HouseStatus.ACTIVE,
    },
  });
  console.log('✅ Created House:', houseBwin.name);

  const houseBet365 = await prisma.house.create({
    data: {
      name: 'Bet365',
      method: HouseMethod.CSV,
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      commissionRules: {
        cpa: { register: 3000, ftd: 10000 },
        type: 'CPA',
      },
      validationWindowDays: 30,
      status: HouseStatus.ACTIVE,
    },
  });
  console.log('✅ Created House:', houseBet365.name);

  // Create Referral Links
  const refLinkBwin = await prisma.referralLink.create({
    data: {
      tipsterId: tipsterProfile!.id,
      houseId: houseBwin.id,
      urlTemplate: 'https://bwin.com/register?aff={SUBID}',
      subidParamName: 'aff',
      status: HouseStatus.ACTIVE,
    },
  });
  console.log('✅ Created Referral Link for Bwin');

  // Create Demo Referral Events
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const eventDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const types: ReferralEventType[] = ['CLICK', 'REGISTER', 'FTD', 'DEPOSIT'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    await prisma.referralEvent.create({
      data: {
        houseId: houseBwin.id,
        tipsterId: tipsterProfile!.id,
        subid: `subid_${i}`,
        userExtId: `user_ext_${i}`,
        type,
        amountCents: type === 'DEPOSIT' ? Math.floor(Math.random() * 50000) : type === 'FTD' ? 10000 : undefined,
        currency: 'EUR',
        eventAt: eventDate,
        source: ReferralEventSource.API,
        status: 'VALID',
        rawPayload: {
          event_id: `evt_${i}`,
          timestamp: eventDate.toISOString(),
        },
      },
    });
  }
  console.log('✅ Created 10 Demo Referral Events');

  // Create Platform Fee Tiers
  await prisma.platformFeeTier.createMany({
    data: [
      { thresholdGrossCents: 0, feeBps: 1000 }, // 0-X: 10%
      { thresholdGrossCents: 500000, feeBps: 700 }, // 5000+ EUR: 7%
      { thresholdGrossCents: 1000000, feeBps: 500 }, // 10000+ EUR: 5%
    ],
  });
  console.log('✅ Created Platform Fee Tiers');

  // Create Config
  await prisma.config.create({
    data: {
      key: 'PLATFORM_NAME',
      valueJson: { value: 'Antia' },
    },
  });
  await prisma.config.create({
    data: {
      key: 'DEFAULT_CURRENCY',
      valueJson: { value: 'EUR' },
    },
  });
  console.log('✅ Created Configs');

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
