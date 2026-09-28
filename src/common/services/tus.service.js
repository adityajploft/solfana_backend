import { FileStore } from "@tus/file-store";
import path from "path";
import { addAudioJob } from "../queues/audio.queue.js";
import { Server, EVENTS } from "@tus/server";
import prisma from "../../config/db.config.js";
import jwt from 'jsonwebtoken';

const uploadPath = path.join(process.cwd(), "uploads/audio-temp");

export const tusServer = new Server({
  path: "/api/admin/audio-libraries/stores",
  datastore: new FileStore({
    directory: uploadPath
  }),
  baseUrl: process.env.APP_URL,
  relativeLocation: true,
});

tusServer.on(EVENTS.POST_FINISH, async (req, res, file) => {
  // uploadCounter--;

  // get login user
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader.split(' ')[1];

  let decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

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

  if (!user) {
    throw new HttpError(401, 'USER_NOT_FOUND', 'user_not_found', 'auth');
  }

  //Check active status
  if (!user.isActive) {
    throw new HttpError(403, 'ACCOUNT_INACTIVE', 'account_inactive', 'auth');
  }

  console.log("Upload finished:", file.id);

  const filePath = path.join(uploadPath, file.id);

  const metadata = file.metadata;

  const originalName = metadata.filename || "unknown.mp3";

  console.log("Original file:", originalName);

  // create DB record
  const audioRecord = await prisma.audioLibrary.create({
    data: {
      originalName: originalName,
      storedFileName: file.id,
      createdById: user.id
    }
  });

  await addAudioJob({filePath, originalName, audioId: audioRecord.id, currentUser: user});

  console.log("Job added to queue");

});