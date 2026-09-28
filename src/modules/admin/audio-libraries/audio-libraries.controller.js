import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import AudioLibraryService from './audio-libraries.service.js';
import { tusServer } from '../../../common/services/tus.service.js';
import bunnyCDNService from '../../../common/services/bunnycdn.service.js';

class AudioLibraryController {

  create = async (req, res, next) => {
    try {
      let uploadCounter = 0;
      const MAX_SIZE = 150 * 1024 * 1024; // 150MB
      const MAX_FILES = 10;
      // Only validate when upload is created
      if (req.method === "POST") {
        const uploadLength = parseInt(req.headers["upload-length"] || "0");

        // file size validation
        if (uploadLength > MAX_SIZE) {
          return res.status(400).json({
            message: t(lang, 'audio-library', 'FILE_TOO_LARGE')
          });
        }

        // file count validation
        if (uploadCounter >= MAX_FILES) {
          return res.status(400).json({
            message: t(lang, 'audio-library', 'MAX_FILES_LIMIT')
          });
        }

        uploadCounter++;
      }
      await tusServer.handle(req, res);

    } catch (error) {
      next(error);
    }
  };


  index = async (req, res, next) => {
    try {
      const { page, limit, search, fetchType } = req.query;

      const result = await AudioLibraryService.index({
        page,
        limit,
        search,
        userId: req.user.id,
        role: req.user.roleId,
        fetchType: fetchType
      });

      res.json(
        successResponse(
          t(req.lang, 'audio-library', 'AUDIO_LIST'),
          {
            records: result.records,
            pagination: result.pagination
          }
        )
      );
    } catch (error) {
      next(error);
    }
  };

  show = async (req, res, next) => {
    try {
      const result = await AudioLibraryService.show(req.params.id);

      res.json(
        successResponse(
          t(req.lang, 'audio-library', 'AUDIO_DETAIL'),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };



  delete = async (req, res, next) => {
    try {
      const audio = await AudioLibraryService.destroy(req.params.id);

      // Remove Folder from CDN
      const cdnPath = audio.cdnPath;
      
      if(cdnPath){
        const folderPath = cdnPath.replace(/master\.m3u8$/, '');
        const result = await bunnyCDNService.deletePath(folderPath);
  
        if (!result.success) {
          console.warn("Bunny delete failed:", result.error);
          // optional: send to retry queue
        }      
      }

      res.json(
        successResponse(
          t(req.lang, 'audio-library', 'AUDIO_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new AudioLibraryController();
