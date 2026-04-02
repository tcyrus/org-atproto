import type { Agent } from "@atproto/api";
import { AtpAgent, CredentialSession } from "@atproto/api";
import type { ComAtprotoRepoCreateRecord, AppBskyFeedPost } from "@atproto/api";

export async function makeCredSession(
  service: string,
  identifier: string,
  password?: string,
): Promise<CredentialSession> {
  const session = new CredentialSession(new URL(service));

  if (password) {
    await session.login({
      identifier: identifier,
      password: password,
    });
  }

  return session;
}

export async function makeAtpAgent(
  service: string,
  identifier: string,
  password?: string,
): Promise<AtpAgent> {
  const agent = new AtpAgent(
    await makeCredSession(service, identifier, password),
  );

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
