interface _OrgEmbedImage {
  $type: 'app.bsky.embed.images'
  alt: string
  type?: string
  width: number
  height: number
}

interface OrgEmbedLocalImage extends _OrgEmbedImage {
  file: string
}

interface OrgEmbedCidImage extends _OrgEmbedImage {
  cid: string
}

interface OrgEmbedRecord {
  $type: 'app.bsky.embed.record'
  // record is either AT URI or URL
  // Needs to be converted to com.atproto.repo.strongRef
  record: string
}

type OrgEmbedImage =
  | OrgEmbedLocalImage
  | OrgEmbedCidImage

type OrgEmbed =
  | OrgEmbedImage
  | OrgEmbedRecord;

interface OrgFacetMention {
  $type: 'app.bsky.richtext.facet#mention'
  // Needs to be looked up to convert to did
  handle: string
}

interface OrgFacetLink {
  $type: 'app.bsky.richtext.facet#link'
  uri: string
}

interface OrgFacetTag {
  $type: 'app.bsky.richtext.facet#tag'
  tag: string
}

type OrgFacet =
  | OrgFacetMention
  | OrgFacetLink
  | OrgFacetTag;

export interface OrgPost {
  text: string
  // Annotations of text (mentions, URLs, hashtags, etc)
  facets?: {
    byteStart: number
    byteEnd: number
    features: OrgFacet[]
  }[]
  // string from REPLY_TO (needs to be converted to ReplyRef)
  reply?: string
  // List of items from the EMBED block
  embeds?: OrgEmbed[]
  // May be empty list. set to undefined before posting
  langs?: string[]
  createdAt?: string
}

export type OrgRecord =
  | OrgPost;
