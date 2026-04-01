import type { Agent } from "@atproto/api";
import { AtpAgent } from "@atproto/api";
import type { ComAtprotoRepoCreateRecord, AppBskyFeedPost } from "@atproto/api";

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

export async function makePost(
  record: ComAtprotoRepoCreateRecord.InputSchema,
  agent: Agent,
) {
  if (record.collection === "app.bsky.feed.post") {
    return await agent.post(record.record as AppBskyFeedPost.Record);
  }
}
