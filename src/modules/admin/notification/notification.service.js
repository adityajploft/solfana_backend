import prisma from '../../../config/db.config.js';
import emailService from '../../../common/services/email.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import { getAdminData } from '../../../common/utils/helper.js';
import HttpError from '../../../common/errors/http.error.js';

class NotificationService {
  
  async index(customer, type, page){
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = {
      receiverId: customer.id
    };

    console.log("where: ", where);
    

    if(type === "read"){
      where.isRead = true;
    } else if(type === "unread"){
      where.isRead = false;
    }
    

    const total = await prisma.notification.count({ where });

    const notifications = await prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } });

    const formattedRecords = await Promise.all(
      notifications.map(async (record) => {
        
        const notificationResponse = {
            id: record.id,
            title: record.title,
            description: record.description,
            send_id: record.senderId,
            module_type: record.moduleType,
            module_id: record.moduleId,
            is_clickable: record.isClickable,
            click_action: record.clickAction,
            click_value: record.clickValue,
            extra_data: record.data,
            is_read: record.isRead || false
        };

        if(record.senderId){
          const sender = await prisma.customer.findUnique({
            where : {
              id: record.senderId
            }
          });
          const sendData = {
            id: sender.id,
            name: sender.name,
            profile_image: sender.profileImage
          }

          notificationResponse.sender = sendData;
        }
        return notificationResponse;
      })
    );

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

  async readNotification(id){
    // check notification
    const notification = await prisma.notification.findUnique({ where: { id: id } });

    if(!notification){
      throw new HttpError(400, 'TITLE_REQUIRED', 'title_required', 'playlist' );
    }
    const now = new Date(Date.now());
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: new Date(Date.now())
      }
    });

    return []
  }

  async markNotificationReadAll(){    
    const now = new Date(Date.now());
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        readAt: new Date(Date.now())
      }
    });

    return true
  }
}

export default new NotificationService();