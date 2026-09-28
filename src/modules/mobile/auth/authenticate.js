import jwt from 'jsonwebtoken';
import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'INVALID_TOKEN', 'invalid_token', 'auth');
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'TEMP_SIGNUP') {
      req.user = decoded;
      next();
      return;
    }

    if (decoded.type === 'CUSTOMER') {
      // For customer tokens, check session in database
      
      if (!decoded.sessionId || !decoded.sub) {
        throw new HttpError(401, 'INVALID_TOKEN', 'invalid_token', 'auth');
      }

      const session = await prisma.customerSession.findUnique({
        where: { id: decoded.sessionId, isActive: true },
      });
      
      
      if (!session) {
        throw new HttpError(401, 'SESSION_EXPIRED', 'session_expired', 'auth');
      }

      req.user = await prisma.customer.findUnique({ 
        where: { id: decoded.sub } 
      });
      
      next();
      return;
    }

    console.log("Unknown token type:", decoded.type);
    throw new HttpError(401, 'INVALID_TOKEN', 'invalid_token', 'auth');
    
  } catch (e) {
    console.log("Authentication error:", e.message);
    
    if (e.name === 'JsonWebTokenError') {
      throw new HttpError(401, 'INVALID_TOKEN', 'invalid_token', 'auth');
    } else if (e.name === 'TokenExpiredError') {
      throw new HttpError(401, 'SESSION_EXPIRED', 'token_expired', 'auth');
    } else if (e instanceof HttpError) {
      throw e;
    } else {
      throw new HttpError(401, 'INVALID_TOKEN', 'invalid_token', 'auth');
    }
  }
}