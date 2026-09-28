import prisma from '../../../config/db.config.js';

class InterestsService {
  async findAll({ lang = 'en', page = 1, limit = 10, search }) {
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      parentId: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          {
            translations: {
              some: { name: { contains: search, mode: 'insensitive' }, language: { lang } },
            },
          },
        ],
      }),
    };

    const total = await prisma.category.count({ where });

    const records = await prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { position: 'asc' },
      include: {
        translations: {
          where: { language: { lang } },
          select: { name: true },
        },
      },
    });

    const mappedRecords = records.map(c => ({
      id: c.id,
      name: c.translations[0]?.name || c.name,
    }));

    return {
      records: mappedRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new InterestsService();
