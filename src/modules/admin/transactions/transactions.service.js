import prisma from '../../../config/db.config.js';

class AdminTransactionService {

  async getTransactions(query) {
    let {
      page = 1,
      limit = 10,
      search,
      status,
      paymentGateway,
      fromDate,
      toDate
    } = query;

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(paymentGateway && { paymentGateway }),

      ...(fromDate && toDate && {
        createdAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate)
        }
      }),

      ...(search && {
        OR: [
          {
            transactionId: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            customer: {
              email: {
                contains: search,
                mode: "insensitive"
              }
            }
          }
        ]
      })
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: {
          id: true,
          transactionId: true,
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          paymentGateway: true,
          createdAt: true,
          paidAt: true,

          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profileImage: true
            }
          },

          plan: {
            select: {
              id: true,
              name: true,
              price: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),

      prisma.transaction.count({ where })
    ]);

    return {
      records: transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getTransactionById(id) {
    const tx = await prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        transactionId: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        paymentGateway: true,
        createdAt: true,
        paidAt: true,

        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileImage: true
          }
        },

        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            durationDays: true
          }
        },

        subscription: {
          select: {
            id: true,
            status: true,
            startsAt: true,
            endsAt: true
          }
        },

        rawResponse: true
      }
    });

    if (!tx) return null;

    const paymentDetails = tx.rawResponse
      ? {
          reference: tx.rawResponse.reference,
          status: tx.rawResponse.status,
          payment_url: tx.rawResponse.payment_url,
          created_at: tx.rawResponse.created_at
        }
      : null;

    return {
      ...tx,
      paymentDetails,
      rawResponse: undefined 
    };
  }
}

export default new AdminTransactionService();