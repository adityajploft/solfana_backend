import jwt from 'jsonwebtoken';
import HttpError from '../errors/http.error.js';
import prisma from '../../config/db.config.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    //Check token exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'ACCESS_TOKEN_REQUIRED', 'access_token_required', 'auth');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw new HttpError(401, 'INVALID_TOKEN', 'invalid_token', 'auth');
    }

    // Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        roleId: true,
        isActive: true,
        tokenVersion: true,
        languageId: true
      },
    });

    // Token invalidated by logout
    if (decoded.tokenVersion !== user.tokenVersion) {
    throw new HttpError(401, 'SESSION_EXPIRED', 'session_expired', 'auth');
    }

    if (!user) {
      throw new HttpError(401, 'USER_NOT_FOUND', 'user_not_found', 'auth');
    }

    //Check active status
    if (!user.isActive) {
      throw new HttpError(403, 'ACCOUNT_INACTIVE', 'account_inactive', 'auth');
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
