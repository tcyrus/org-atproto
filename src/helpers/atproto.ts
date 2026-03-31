import { AtpAgent } from "@atproto/api";
import type {
  Agent,
  AppBskyEmbedImages,
} from "@atproto/api";

import type { CreateRecord, EmbedImage, EmbedOrgImage, PostRecord } from "./types";

export async function makeAtpAgent(
  identifier: string,
  service: string,
  password?: string,
): Promise<AtpAgent> {
  const agent = new AtpAgent({
    service: service,
  });

  if (!password) {
    password =
      (await Bun.secrets.get({
        service: service,
        name: identifier,
      })) || undefined;
  }

  if (password) {
    await agent.login({
      identifier: identifier,
      password: password,
    });
  }

  return agent;
}

export async function makeValidAtprotoRecord(
  record: CreateRecord,
  agent: Agent,
  baseUrl?: URL,
): Promise<CreateRecord> {
  // This code is extremely hacky
  if (record.collection === "app.bsky.feed.post") {
    const postRecord = record.record as PostRecord;
    const postEmbed = postRecord.embed;
    if (postEmbed?.$type === "app.bsky.embed.images") {
      const postImages = (postEmbed as AppBskyEmbedImages.Main).images;
      (postEmbed as AppBskyEmbedImages.Main).images = await Promise.all(
        postImages.map((img) => makeValidBskyEmbedImage(img, agent, baseUrl)),
      );
    }
  }

  return record;
}

async function makeValidBskyEmbedImage(
  img: EmbedOrgImage,
  agent: Agent,
  baseUrl?: URL,
): Promise<EmbedImage> {
  const blob = img.blob

  if (!img.image && blob?.name) {
    const fileUrl = new URL(blob.name, baseUrl);
    const file = Bun.file(fileUrl, {
      type: blob.type,
    });

    const { data } = await agent.uploadBlob(
      file,
      file.type ? { encoding: file.type } : undefined,
    );

    img.image = data.blob;
  }

  return img as EmbedImage;
}

export async function makePost(
  record: CreateRecord,
  agent: Agent,
) {
  if (record.collection === "app.bsky.feed.post") {
    return await agent.post(record.record as PostRecord);
  }
}

// TODO: get root record for REPLY_TO

// TODO: get record (AT URI + CID) from url for Quotes and Replies
