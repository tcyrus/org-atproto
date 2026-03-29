import { AtpAgent } from "@atproto/api";
import type {
  Agent,
  ComAtprotoRepoCreateRecord,
  AppBskyFeedPost,
  AppBskyEmbedImages,
} from "@atproto/api";

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
  record: ComAtprotoRepoCreateRecord.InputSchema,
  agent: Agent,
  baseUrl?: URL,
): Promise<ComAtprotoRepoCreateRecord.InputSchema> {
  if (record.collection === "app.bsky.feed.post") {
    const postRecord = record.record as AppBskyFeedPost.Record;
    const postEmbed = postRecord.embed;
    if (postEmbed?.$type === "app.bsky.embed.images") {
      const postImages = (postEmbed as AppBskyEmbedImages.Main).images;
      (postEmbed as AppBskyEmbedImages.Main).images = await Promise.all(
        postImages.map(async (img) => {
          const blob = (img as any).blob as
            | { name: string; type?: string }
            | undefined;

          if (!img.image && blob) {
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
          return img;
        }),
      );
    }
  }

  return record;
}

export async function makePost(
  record: ComAtprotoRepoCreateRecord.InputSchema,
  agent: Agent,
) {
  if (record.collection === "app.bsky.feed.post") {
    return await agent.post(record.record as AppBskyFeedPost.Record);
  }
}
