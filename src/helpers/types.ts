import type { ComAtprotoRepoCreateRecord, AppBskyEmbedImages, AppBskyFeedPost } from "@atproto/api";

export type CreateRecord = ComAtprotoRepoCreateRecord.InputSchema;
export type PostRecord = AppBskyFeedPost.Record;

export type EmbedImage = AppBskyEmbedImages.Image;

type _Image = Partial<Pick<EmbedImage, "image">> & Omit<EmbedImage, "image">;

export interface EmbedOrgImage extends _Image {
  blob?: {
    name?: string
    type?: string
  }
}
