import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { extractAudioMetadataFromCDN } from '../../../common/utils/audio-metadata.util.js';

class AudioLibraryService {

  async create(data) {
    const { audios, createdById } = data;

    if (!audios?.length) {
      throw new HttpError(
        400,
        "AT_LEAST_ONE_AUDIO_REQUIRED",
        "at_least_one_audio_required",
        "audio-library"
      );
    }

    const urls = audios.map((a) => a.cdn_url);
    const fileNames = audios.map((a) => a.cdn_file_name);
    const hashes = audios.map((a) => a.file_hash);

    const existingAudios = await prisma.audioLibrary.findMany({
      where: {
        deletedAt: null,
        OR: [
          { fileHash: { in: hashes } },
          { cdnUrl: { in: urls } },
          { storedFileName: { in: fileNames } },
        ],
      },
    });

    if (existingAudios.length > 0) {
      throw new HttpError(
        409,
        "AUDIO_ALREADY_EXISTS",
        "audio_already_exists",
        "audio-library"
      );
    }

    const createdAudios = await Promise.all(
      audios.map(async (audio) => {
        const safeUrl = audio.cdn_url.startsWith("http")
          ? audio.cdn_url
          : `https://${audio.cdn_url}`;

        const metadata = await extractAudioMetadataFromCDN(safeUrl);

        return prisma.audioLibrary.create({
          data: {
            originalName: audio.original_file_name?.trim(),
            storedFileName: audio.cdn_file_name?.trim(),
            cdnPath: audio.cdn_path?.trim(),
            cdnUrl: audio.cdn_url?.trim(),
            fileHash: audio.file_hash,
            fileSize: metadata.fileSize,
            durationSeconds: metadata.durationSeconds,
            mimeType: metadata.mimeType,
            bitrate: metadata.bitrate,
            sampleRate: metadata.sampleRate,
            status: "ACTIVE",
            createdById,
          },
        });
      })
    );

    return createdAudios;
  }

  /**
   * Try to locate an existing audio library entry by its SHA256 file hash.
   * Returns the record if found, or null otherwise.
   */
  async findByHash(hash) {
    if (!hash) return null;
    const audio = await prisma.audioLibrary.findFirst({
      where: { fileHash: hash, deletedAt: null },
    });
    return audio;
  }

  async index({ page = 1, limit = 10, search = '', fetchType ='table', userId, role }) {
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(role === 4 && {
        createdById: userId
      }),

      ...(search && {
        OR: [
          { originalName: { contains: search, mode: "insensitive" } },
          { storedFileName: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    if(fetchType === 'dropdown'){
      where.fileUploadStatus = "COMPLETED"
    }

    const [records, total] = await Promise.all([
      prisma.audioLibrary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              tracks: true
            }
          }
        }
      }),
      prisma.audioLibrary.count({ where }),
    ]);
    const formattedRecords = records.map(({ _count, createdBy, ...rest }) => ({
      ...rest,
      createdByName: createdBy?.name || null,
      usedIn:_count.tracks
    }));

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

  async show(id, userId, role) {
    const whereCondition = {
      id,
      deletedAt: null,
      ...(role === "PODCASTER" && { createdById: userId })
    };

    const audio = await prisma.audioLibrary.findFirst({
      where: whereCondition,
      include: {
        createdBy: {
          select: { name: true }
        }
      }
    });

    if (!audio) {
      throw new HttpError(404, "AUDIO_NOT_FOUND", 'audio_not_found', 'audio-library');
    }

    const { createdBy, ...rest } = audio;

    return {
      ...rest,
      createdByName: createdBy?.name || null
    };
  }
  async destroy(id) {
    const trackExist = await prisma.track.findFirst(
      {
        where: {
          audioLibraryId: id,
          deletedAt: null
        },
        include:{
          album: true
        }
      }
    );

    if(trackExist){
      throw new HttpError(404, "AUDIO_IN_USE", 'audio_in_use', 'audio-library');
    }

    const audio = await prisma.audioLibrary.findFirst({
      where: { id: id },
    });

    if (!audio || audio.deletedAt) {
      throw new HttpError(404, "AUDIO_NOT_FOUND", 'audio_not_found', 'audio-library');
    }

    // soft delete
    await prisma.audioLibrary.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
      },
    });

    return audio;
  }
}

export default new AudioLibraryService();