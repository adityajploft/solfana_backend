import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';

class CustomerService {

    async index({ page = 1, limit = 10, search }) {
        const skip = (page - 1) * limit;

        const where = {
            deletedAt: null,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const total = await prisma.customer.count({ where });

        const records = await prisma.customer.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profileImage: true,
                isActive: true,
                createdAt: true,

                subscriptions: {
                    where: {
                        status: 'ACTIVE'
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1,
                    select: {
                        status: true,
                        startsAt: true,
                        endsAt: true,
                        plan: {
                            select: {
                                name: true,
                                code: true,
                                price: true,
                                durationDays: true
                            }
                        }
                    }
                }
            },
        });

        const formattedRecords = records.map(customer => {
            const { subscriptions, ...rest } = customer;

            return {
                ...rest,
                subscription: subscriptions[0] || null
            };
        });

        return {
            records: formattedRecords,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async show(id, lang) {
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                language: true,
                interests: true,
                notificationSettings: true,
            },
        });

        if (!customer || customer.deletedAt) {
            throw new HttpError(
                404,
                'CUSTOMER_NOT_FOUND',
                'customer_not_found',
                'customer'
            );
        }

        return {
            id: customer.id,
            name: customer.name || "",
            email: customer.email || "",
            phone: customer.phone || "",
            profileImage: customer.profileImage ?? null,
            language: customer.language?.name || "",
            interests: customer.interests.map(i => i.name) || [],
            notificationSettings: customer.notificationSettings.map(n => n.notificationKey) || [],
            isActive: customer.isActive,
        };
    }

    async delete(id) {
        const customer = await prisma.customer.findUnique({ where: { id } });
        if (!customer) throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'customer_not_found', 'customer');
        
        await prisma.customer.update({
          where: { id: customer.id },
          data: { deletedAt: new Date() },
        });
    
        return {};
    }

    async toggleStatus(id) {
        const customer = await prisma.customer.findUnique({
            where: { id },
        });

        if (!customer || customer.deletedAt) {
            throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'customer_not_found', 'customer');
        }

        const updated = await prisma.customer.update({
            where: { id },
            data: { isActive: !customer.isActive },
        });

        return updated;
    }
}

export default new CustomerService();