class AlbumResource {
  constructor(album) {
    this.album = album;
  }

  card() {
    return {
      id: this.album.id,
      name: this.album?.title || '',
      podcaster_name: this.album.podcaster?.name || '',
      cover_image: this.album.coverImage?.cdnUrl || '',
      isExplicit: this.album.isExplicit,
    };
  }

  details() {
    return {
      id: this.album.id,
      name: this.album.name,
      slug: this.album.slug,
      description: this.album.description,
      bannerImage: this.album.bannerImageUrl,
      thumbnail: this.album.thumbnailUrl,
      isActive: this.album.status === 'ACTIVE',
      createdAt: this.album.createdAt,
      isExplicit: this.album.isExplicit,
      audios: this.album.audios
        ? this.album.audios.map(audio => ({
            id: audio.id,
            title: audio.title,
            duration: audio.durationSeconds,
            thumbnail: audio.thumbnailUrl
          }))
        : []
    };
  }

  static cardCollection(categories) {
    return categories.map(album =>
      new AlbumResource(album).card()
    );
  }
}

export default AlbumResource;