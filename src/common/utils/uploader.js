import multer from "multer";
import path from "path";
import fs from 'fs';

export const createUploader = ({
    folder, 
    allowedMimeTypes = [],
    maxSize = 5 * 1024 * 1024, // default 5MB
}) => {
    const uploadDir = path.join(process.cwd(), 'uploads', folder);

    if(!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

            cb(null, uniqueSuffix + path.extname(file.originalname));
        },
    });

    return multer({
        storage,
        limits: { fileSize : maxSize },
        fileFilter: (req, file, cb) => {
            if(allowedMimeTypes.length && !allowedMimeTypes.includes(file.mimetype)){
                return cb(new Error("INVALID_FILE_TYPE"));
            }

            cb(null, true);
        }
    });

};