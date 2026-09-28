import { getUserProfileImage } from "../../../common/utils/helper.js";

class PodcasterResource {
  constructor(podcaster) {
    this.podcaster = podcaster;
  }

  async card() {
    const podcasterProfileImage = await getUserProfileImage(this.podcaster);
    return {
      id: this.podcaster.id,
      name: this.podcaster.name,
      profille_image: podcasterProfileImage || null,
    };
  }

  async details() {
    const podcasterProfileImage = await getUserProfileImage(this.podcaster);
    return {
      id: this.podcaster.id,
      name: this.podcaster.name,
      slug: this.podcaster.slug,
      description: this.podcaster.description,
      bannerImage: this.podcaster.bannerImageUrl,
      thumbnail: this.podcaster.thumbnailUrl,
      isActive: this.podcaster.status === 'ACTIVE',
      createdAt: this.podcaster.createdAt,
      profille_image: podcasterProfileImage || null,
      audios: this.podcaster.audios
        ? this.podcaster.audios.map(audio => ({
            id: audio.id,
            title: audio.title,
            duration: audio.durationSeconds,
            thumbnail: audio.thumbnailUrl
          }))
        : []
    };
  }

  static async cardCollection(podcasters) {
    return await Promise.all(
      podcasters.map(podcaster =>
        new PodcasterResource(podcaster).card()
      )
    );
  }
}

export default PodcasterResource;