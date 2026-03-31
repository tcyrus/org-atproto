import type { OrgData, Section as OrgSection, WithAffiliatedKeywords } from "uniorg";
import { parse } from "uniorg-parse/lib/parser";

import type { OrgPost, OrgRecord } from "./types";

export async function readOrg(file: Blob): Promise<OrgData> {
  // uniorg-parse doesn't support CRLF or Streams as of now
  const orgStr = (await file.text()).replaceAll("\r\n", "\n");

  return parse(orgStr);
}

export function makeOrgRecord(
  orgTree: OrgData | OrgSection,
): OrgRecord | null {
  // NOTE: This doesn't make a valid record because of embed files
  // there's a separate function that handles uploading embed files as blobs

  const rootProps = orgTree.children.find(
    (el) => el.type === "property-drawer",
  )?.children;

  const collection =
    rootProps?.find((el) => el.key.toUpperCase() === "COLLECTION")?.value ?? "";

  switch (collection) {
    case "app.bsky.feed.post":
      return makeOrgPost(orgTree);
    default:
      return null;
  }
}

export function makeOrgPost(
  orgTree: OrgData | OrgSection,
): OrgPost | null {
  const rootProps = orgTree.children.find(
    (el) => el.type === "property-drawer",
  )?.children;

  const createdAt =
    rootProps?.find((el) => el.key.toUpperCase() === "CREATED_AT")?.value;

  const langs =
    (rootProps?.find((el) => el.key.toUpperCase() === "LANG")?.value || "").split(/\s+/);

  const reply =
    rootProps?.find((el) => el.key.toUpperCase() === "REPLY_TO")?.value;

  const embedItems = orgTree.children.filter((el) => el.type === "special-block")
    .filter(el => el.blockType === "EMBED")
    .flatMap(el => el.children)
    .filter(el => el.type === "paragraph")
    .filter(el => el.children.length !== 0);

  const embeds = embedItems.map(el => {
    // TODO: figure out why typing is bad here
    const affiliated = (el as Partial<WithAffiliatedKeywords>).affiliated;
    const _ATTR_ATPROTO = affiliated?.ATTR_ATPROTO || [];
    const ATTR_ATPROTO = parseAffiliatedPlist(_ATTR_ATPROTO as string[]);

    switch (ATTR_ATPROTO.type) {
      case "app.bsky.embed.images":
        // TODO
      case "app.bsky.embed.record":
        // TODO
      default:
        return null;
    }
  }).filter(el => el !== null);

  // TODO: handle facets (link, mention, tag)
  // This requires overhauling the current text process
  // Links shouldn't be hard, but embeds require extra logic
  // Mentions and Tags would require an overhaul

  const text = orgTree.children
    .filter((el) => el.type === "paragraph")
    .map((el) => el.children)
    .flat()
    .filter((el) => el.type === "text")
    .map((el) => el.value)
    .join("")
    .trimEnd();

  const facets = [];

  return {
    text,
    reply,
    facets: facets.length ? [] : undefined,
    embeds: embeds.length ? embeds : undefined,
    langs: langs.length ? langs : undefined,
    createdAt
  };
}

function parseAffiliatedPlist(avals: string[]): Record<string, string> {
  // Parser.parseAffiliatedKeywords doesn't handle org mode 8.0 plists
  // This is a hacky solution and will not work for all situations.
  // The reference implementation is org-export-read-attribute
  return Object.fromEntries(
    avals.map(aval => aval.split(/\s+(?=:)/)).flat().map(aval => aval.replace(/^:/, "").split(" ", 1))
  )
}
