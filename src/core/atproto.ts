import { openAsBlob } from "node:fs";

import type { Agent, AppBskyFeedPost } from "@atproto/api";
import type { ComAtprotoRepoCreateRecord } from "@atproto/api";

import { AtUri } from "@atproto/syntax";
import { parseCid } from "@atproto/lex-data";
import { BlobRef } from "@atproto/lexicon";

import type { OrgRecord, OrgPost } from "./types";

export async function makeAtprotoRecord(
  orgRecord: OrgRecord,
  agent: Agent,
  baseUrl?: URL,
): Promise<ComAtprotoRepoCreateRecord.InputSchema> {
  // TODO: get repo from agent
  const record = { repo: "", collection: orgRecord.$type, record: {} };

  if (record.collection === "app.bsky.feed.post") {
    record.record = await makeAtprotoPost(orgRecord, agent, baseUrl);
  }

  return record;
}

async function makeAtprotoPost(
  orgPost: OrgPost,
  agent: Agent,
  baseUrl?: URL,
): Promise<AppBskyFeedPost.Record> {
  const reply = orgPost.reply
    ? await getReplyRefs(agent, new AtUri(orgPost.reply))
    : undefined;

  const facets = orgPost.facets.map((facet) => {
    let feature;

    if (facet.value.startsWith("#")) {
      feature = {
        $type: "app.bsky.richtext.facet#tag" as const,
        tag: facet.value.replace(/^#/, ""),
      };
    } else if (facet.value.startsWith("@")) {
      feature = {
        $type: "app.bsky.richtext.facet#mention" as const,
        did: facet.value.replace(/^@/, ""),
      };
    } else {
      feature = {
        $type: "app.bsky.richtext.facet#link" as const,
        uri: facet.value,
      };
    }

    return {
      $type: "app.bsky.richtext.facet" as const,
      index: { byteStart: facet.byteStart, byteEnd: facet.byteEnd },
      features: feature ? [feature] : [],
    };
  });

  const recordEmbeds = orgPost.embeds.filter(
    (e) => e.$type === "app.bsky.embed.record",
  );

  if (recordEmbeds.length > 1) {
    throw Error("Post can't have more than one record embed");
  }

  const _recordEmbed = recordEmbeds[0]
    ? await getStrongRefs(agent, new AtUri(recordEmbeds[0].record))
    : undefined;

  const recordEmbed = _recordEmbed
    ? {
        $type: "app.bsky.embed.record" as const,
        record: _recordEmbed,
      }
    : undefined;

  const _orgImageEmbeds = orgPost.embeds.filter(
    (e) => e.$type === "app.bsky.embed.images",
  );

  const _images = await Promise.all(
    _orgImageEmbeds.map(async (e) => {
      if (e.type === "file") {
        return {
          ...e,
          type: "cid" as const,
          image: await uploadEmbedImage(agent, e.path, e.mime, baseUrl),
        };
      } else if (e.type === "cid") {
        return {
          ...e,
          type: "cid" as const,
          image: await getBlobRef(agent, e.path, e.mime),
        };
      }
    }),
  );

  const _imageEmbeds = _images
    .filter((e) => e !== undefined)
    .map((e) => ({
      image: e.image,
      alt: e.alt,
      aspectRatio: e.aspect,
    }));

  const imageEmbeds = {
    $type: "app.bsky.embed.images" as const,
    images: _imageEmbeds,
  };

  let embed;

  if (imageEmbeds.images.length && recordEmbed) {
    embed = {
      $type: "app.bsky.embed.recordWithMedia" as const,
      record: { ...recordEmbed },
      media: imageEmbeds,
    };
  } else if (imageEmbeds.images.length) {
    embed = imageEmbeds;
  } else if (recordEmbeds.length) {
    embed = recordEmbed;
  }

  return {
    $type: "app.bsky.feed.post",
    text: orgPost.text,
    facets,
    reply,
    embed,
    langs: orgPost.langs,
    createdAt: orgPost.createdAt ?? new Date().toISOString(),
  };
}

async function uploadEmbedImage(
  agent: Agent,
  path: string,
  mime?: string,
  baseUrl?: URL,
) {
  const fileUrl = new URL(path, baseUrl);

  const file = await openAsBlob(fileUrl, { type: mime });

  const { data } = await agent.uploadBlob(
    file,
    mime ? { encoding: mime } : undefined,
  );

  return data.blob;
}

function getRecordParams(atUri: AtUri) {
  return {
    repo: atUri.hostname,
    collection: atUri.collection,
    rkey: atUri.rkey,
  } as const;
}

async function getBlobRef(
  agent: Agent,
  cid: string,
  mime?: string,
): Promise<BlobRef> {
  // Working around typing issues with BlobRef

  // The only way to get the BlobRef data is by calling
  // com.atproto.sync.getBlob and using the headers.
  // Agent doesn't support HTTP HEAD requests
  // https://github.com/bluesky-social/atproto/issues/4199
  const blob = await agent.com.atproto.sync.getBlob({
    did: agent.assertDid,
    cid: cid,
  });

  // We still need to parse the CID
  const ref = parseCid(cid);

  const mimeType = mime ?? blob.headers["content-type"]!;
  const size = parseInt(blob.headers["content-length"]!);

  return new BlobRef(ref, mimeType, size);
}

async function getStrongRefs(agent: Agent, atUri: AtUri) {
  const { data } = await agent.com.atproto.repo.getRecord(
    getRecordParams(atUri),
  );

  return {
    cid: data.cid!,
    uri: data.uri,
  };
}

async function getReplyRefs(agent: Agent, atUri: AtUri) {
  const response = await agent.getPost(getRecordParams(atUri));

  type ReplyRef = NonNullable<typeof response.value.reply>;

  // Note: StrongRef doesn't use AtUri or Cid types
  const parent: ReplyRef["parent"] = { ...response };

  const replyRoot = response.value.reply?.root;

  const root = replyRoot ?? parent;

  // Example mentions one other call to getRecord, but I don't think it's necessary
  // https://atproto.com/blog/create-post#replies

  return { parent, root } as ReplyRef;
}

// NOTE: There's no easy endpoint to get an AtUri from a URL
// I found some logic that would help, but the better approach is
// to just use AtUri's
// https://tangled.org/pds.ls/pdsls/blob/main/src/lib/app-urls.ts
