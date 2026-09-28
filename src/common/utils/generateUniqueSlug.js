import prisma from '../../config/db.config.js';
import slugify from 'slugify';

export const generateUniqueAlbumSlug = async (title) => {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true
  });

  const existingSlugs = await prisma.album.findMany({
    where: {
      slug: {
        startsWith: baseSlug
      }
    },
    select: {
      slug: true
    }
  });

  if (!existingSlugs.length) {
    return baseSlug;
  }

  const slugSet = new Set(existingSlugs.map(item => item.slug));

  let counter = 1;
  let newSlug = `${baseSlug}-${counter}`;

  while (slugSet.has(newSlug)) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }

  return newSlug;
};