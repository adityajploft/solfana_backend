export async function subscriptionPlanSeed(prisma) {
  const plans = [
    {
      name: 'FREE',
      code: 'FREE',
      price: 0,
      currency: 'XOF',
      durationDays: null,
      features: {
        ads: true,
        offlineDownload: false
      }
    },
    {
      name: '1 month',
      code: 'PREMIUM',
      price: 1000,
      currency: 'XOF',
      durationDays: 30,
      features: {
        ads: false,
        offlineDownload: true
      }
    },
    {
      name: '3 months',
      code: 'PREMIUM',
      price: 2500,
      currency: 'XOF',
      durationDays: 90,
      features: {
        ads: false,
        offlineDownload: true
      }
    },
    {
      name: '6 months',
      code: 'PREMIUM',
      price: 4500,
      currency: 'XOF',
      durationDays: 180,
      features: {
        ads: false,
        offlineDownload: true
      }
    }
  ];

  for (const plan of plans) {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        name: plan.name
      }
    });

    if (!existingPlan) {
      await prisma.subscriptionPlan.create({
        data: plan
      });
    }
  }

  console.log('Subscription plans seeded successfully');
}