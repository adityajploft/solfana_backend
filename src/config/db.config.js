import dotenv from 'dotenv';
dotenv.config();
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

import { PrismaPg } from "@prisma/adapter-pg";
import pkgPg from "pg";
const { Pool } = pkgPg;

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  max: 10, // important for workers
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({ adapter });

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {

        const softDeleteModels = [
          "Category",
          "AudioLibrary",
          "Customer",
          "User",
          "Album",
          "Track"
          // add all models that contain deletedAt column
        ];

        if (!softDeleteModels.includes(model)) {
          return query(args);
        }

        // ONLY modify read operations
        if (["findMany", "findFirst", "findUnique", "count", "groupBy"].includes(operation)) {
          args = args || {};
          args.where = args.where || {};

          const withTrash = args.withTrash;
          const onlyTrash = args.onlyTrash;

          delete args.withTrash;
          delete args.onlyTrash;

          if (!withTrash && !onlyTrash) {
            if (args.where.deletedAt === undefined) {
              args.where.deletedAt = null;
            }
          }

          if (onlyTrash) {
            args.where.deletedAt = { not: null };
          }

          // convert findUnique → findFirst
          if (operation === "findUnique") {
            return basePrisma[model.toLowerCase()].findFirst({
              ...args,         
              where: args.where
            });
          }
        }

        // 🔥 Soft delete
        if (operation === "delete") {
          return basePrisma[model.toLowerCase()].update({
            where: args.where,
            data: { deletedAt: new Date() },
          });
        }

        if (operation === "deleteMany") {
          return basePrisma[model.toLowerCase()].updateMany({
            where: args?.where,
            data: { deletedAt: new Date() },
          });
        }

        // 🚀 DO NOT MODIFY create/update/upsert
        return query(args);
      },
    },
  },
});

export default prisma;