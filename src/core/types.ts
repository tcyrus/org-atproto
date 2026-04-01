interface OrgEmbedImage {
  $type: 'app.bsky.embed.images'
  alt: string
  mime?: string
  aspect?: { width: number, height: number }

  type: "file" | "cid"
  path: string
}

interface OrgEmbedRecord {
  $type: 'app.bsky.embed.record'
  // record is AT URI
  // Needs to be converted to com.atproto.repo.strongRef (cid)
  record: string
}

type OrgEmbed =
  | OrgEmbedImage
  | OrgEmbedRecord;

export interface OrgPost {
  $type: "app.bsky.feed.post"

  text: string
  // Annotations of text (mentions, URLs, hashtags, etc)
  facets: {
    byteStart: number
    byteEnd: number
    value: string
  }[]
  // AT URI from REPLY_TO
  reply?: string
  // List of items in the EMBED block
  embeds: OrgEmbed[]
  langs: string[]
  createdAt?: string
}

export type OrgRecord =
  | OrgPost;
