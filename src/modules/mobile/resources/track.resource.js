import { getUserProfileImage } from "../../../common/utils/helper.js";

class TrackResource {
  constructor(track, lang) {
    this.track = track;
    this.lang = lang;


    // cover image
    const coverImage = track.coverImage ? track.coverImage : track.album.coverImage.cdnUrl;    
    console.log("coverImage: ", coverImage);
    
    this.track.coverImageUrl = coverImage.startsWith('http') ? coverImage : `https://${coverImage}`;

    // audio url
    this.track.audioUrl = track.audioLibrary?.cdnUrl ? track.audioLibrary.cdnUrl.startsWith('http') ? track.audioLibrary.cdnUrl : `https://${track.audioLibrary.cdnUrl}` : null;
  }

  card() {    
    return {
      id: this.track.id,
      title: this.track?.title,
      description: this.track?.description,
      coverImage: this.track.coverImageUrl || null,
      trackNumber: this.track.trackNumber,
      playsCount: this.track._count?.recentlyPlayed || 0,
      createdAt: this.track.createdAt,
      durationMinutes: Math.ceil(this.track.audioLibrary?.durationSeconds / 60),
      durationSeconds: this.track.durationSeconds,
      isExplicit: this.track.isExplicit,
      audioUrl: this.track.audioUrl || null,
      album : { 
        id: this.track.album.id,
        name: this.track.album?.title,
      },

      podcaster: {
        id: this.track.album?.podcaster?.id,
        name: this.track.album?.podcaster?.name
      }
    };
  }

  async details(extra = {}) {
    const podcasterProfileImage = await getUserProfileImage(this.track.album.podcaster);

    return {
      id: this.track.id,

      title: this.track?.title,
      description: this.track?.description,

      trackNumber: this.track.trackNumber,

      durationSeconds: this.track.durationSeconds,
      isExplicit: this.track.isExplicit,
      durationMinutes: Math.ceil(this.track.durationSeconds / 60),

      audioUrl: this.track.audioUrl || null,

      createdAt: this.track.createdAt,

      coverImage: this.track.coverImageUrl || null,

      likeDislike: {
          likesCount: extra.likesCount || 0,
          dislikesCount: extra.dislikesCount || 0,
          isLiked: extra.isLiked || false,
          isDisliked: extra.isDisliked || false
      },

      isDownloaded: false,

      isAddedToFavourite: extra.isAddedToFavourite || false,

      is_added_library: extra.is_added_library || false,

      // podcaster name
      podcaster : { 
        id: this.track.album.podcaster.id,
        name: this.track.album.podcaster.name,
        profile_image: podcasterProfileImage
      }, 
      album : { 
        id: this.track.album.id,
        name: this.track.album?.title,
      }
    };
  }

  static cardCollection(tracks, lang) {
    return tracks.map(track =>
      new TrackResource(track, lang).card()
    );
  }
}

export default TrackResource;