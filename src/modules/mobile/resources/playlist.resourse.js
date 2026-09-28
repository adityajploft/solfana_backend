import { getPlaylistThumbnailImage } from "../../../common/utils/helper.js";

class PlaylistResource {
  constructor(playlist) {
    this.playlist = playlist;
  }

  async card() {
    const playlistThumbnailImage = await getPlaylistThumbnailImage(this.playlist);
    return {
      id: this.playlist.id,
      title: this.playlist.title,
      tracks_count: this.playlist._count?.tracks || 0,
      thumbnail_image: playlistThumbnailImage || null,
      created_at: this.playlist.createdAt
    };
  }

  static async cardCollection(playlists) {
    return await Promise.all(
      playlists.map(playlist =>
        new PlaylistResource(playlist).card()
      )
    );
  }
}

export default PlaylistResource;