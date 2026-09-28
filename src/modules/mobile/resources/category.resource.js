import { getCategoryImage } from "../../../common/utils/helper.js";

class CategoryResource {
  constructor(category) {
    this.category = category;
  }

  async card() {
    const categoryStaticImage = await getCategoryImage(this.category, "CATEGORY_IMAGE");
    const categoryFeaturedImage = await getCategoryImage(this.category, "CATEGORY_FEATURED_IMAGE");
    return {
      id: this.category.id,
      name: this.category.translations[0]?.name,

      bgColor1: this.category?.bgColor1,
      bgColor2: this.category?.bgColor2,
      gradientText: this.category?.gradientText,

      thumbnail: categoryFeaturedImage,
      staticImage: categoryStaticImage,
    };
  }

  async details() {
    const categoryStaticImage = await getCategoryImage(this.category, "CATEGORY_IMAGE");
    const categoryFeaturedImage = await getCategoryImage(this.category, "CATEGORY_FEATURED_IMAGE");
    return {
      id: this.category.id,
      name: this.category.translations[0]?.name,

      bgColor1: this.category?.bgColor1,
      bgColor2: this.category?.bgColor2,
      gradientText: this.category?.gradientText,

      slug: this.category.slug,
      description: this.category.description,
      bannerImage: this.category.bannerImageUrl,
      thumbnail: categoryFeaturedImage,
      staticImage: categoryStaticImage,
      isActive: this.category.status === 'ACTIVE',
      createdAt: this.category.createdAt,
      audios: this.category.audios ? this.category.audios.map(audio => ({
        id: audio.id,
        title: audio.title,
        duration: audio.durationSeconds,
        thumbnail: audio.thumbnailUrl
      })) : []
    };
  }

  static async cardCollection(categories) {
    return await Promise.all(
      categories.map(category =>
        new CategoryResource(category).card()
      )
    );
  }
}

export default CategoryResource;