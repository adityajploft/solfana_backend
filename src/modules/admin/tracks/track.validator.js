import { z } from 'zod';

export const CreateTrackSchema = z
  .object({
    uploadType: z.preprocess((v) => {
      if (typeof v === 'string') return v;
      return 'library_upload';
    },
      z.enum(['library_upload', 'simple_upload']).default('library_upload')
    ),
    albumId: z.string().uuid(),
    audioLibraryId: z.string().uuid().nullable().optional(),

    title: z.string().trim().min(1),

    description: z.string().trim().optional(),

    trackNumber: z.preprocess((v) => {
      if (typeof v === 'string' && v.trim() !== '') return parseInt(v, 10);
      return v;
    }, z.number().int().positive()),
    status: z
      .enum([
        'DRAFT',
        'PENDING_APPROVAL',
        'PUBLISHED',
        'REJECTED',
        'APPROVED',
        'ARCHIVED',
      ])
      .optional(),
    scheduledAt: z.string().datetime().optional(),

    coverImage: z.string().optional(),

    isExplicit: z.preprocess((v) => {
      if (typeof v === 'string') {
        return v === 'true';
      }

        return v;
      }, z.boolean().default(false))
    })
  .refine(
    (data) => {
      if (data.uploadType === 'library_upload') {
        return !!data.audioLibraryId;
      }
      return true;
    },
    {
      message: 'audioLibraryId is required when using library_upload',
      path: ['audioLibraryId'],
    }
  )
  .refine(
    (data) => {
      if (data.uploadType === 'simple_upload') {
        return !data.audioLibraryId;
      }
      return true;
    },
    {
      message: 'audioLibraryId must not be provided when using simple_upload',
      path: ['audioLibraryId'],
    }
  );

export const UpdateTrackSchema = z.object({
  audioLibraryId: z.string().uuid().optional(),

  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),

  trackNumber: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() !== '') {
      return parseInt(v, 10);
    }
      return v;
    },
      z.number().int().positive().optional()
  ),

  status: z
    .enum([
      'DRAFT',
      'PENDING_APPROVAL',
      'PUBLISHED',
      'REJECTED',
      'APPROVED',
      'ARCHIVED'
    ])
    .optional(),

  scheduledAt: z.string().datetime().optional(),
  publishedAt: z.string().datetime().optional(),

  coverImage: z.string().optional(),

  isExplicit: z.preprocess((v) => {
    if (typeof v === 'string') {
        return v === 'true';
    }

    return v;
  }, z.boolean().optional()),
});