import type { OrgData, Section as OrgSection } from "uniorg";
import { parse } from "uniorg-parse/lib/parser";

import type { CreateRecord, EmbedOrgImage } from "./types";

export async function readOrg(file: Blob): Promise<OrgData> {
  // uniorg-parse doesn't support CRLF or Streams as of now
  const orgStr = (await file.text()).replaceAll("\r\n", "\n");

  return parse(orgStr);
}

export function makeAtprotoRecord(
  orgTree: OrgData | OrgSection,
): CreateRecord {
  // NOTE: This doesn't make a valid record because of embed files
  // there's a separate function that handles uploading embed files as blobs

  const rootProps = orgTree.children.find(
    (el) => el.type === "property-drawer",
  )?.children;

  const collection =
    rootProps?.find((el) => el.key.toUpperCase() === "COLLECTION")?.value ?? "";

  let record: Record<string, unknown> = {};

  switch (collection) {
    case "app.bsky.feed.post":
      record = makeBskyPostRecord(orgTree);
      break;
  }

  return {
    repo: "",
    collection,
    record,
  };
}

export function makeBskyPostRecord(
  orgTree: OrgData | OrgSection,
): Record<string, unknown> {
  const rootProps = orgTree.children.find(
    (el) => el.type === "property-drawer",
  )?.children;

  const record: Record<string, unknown> = {};

  record.createdAt =
    rootProps?.find((el) => el.key === "CreatedAt")?.value ??
    new Date().toISOString();

  // TODO: LANG

  // TODO: REPLY_TO
  // requires usage of the sdk to get the root post
  // https://atproto.com/blog/create-post#replies

  // TODO: handle facets (link, mention, tag)
  // This requires overhauling the current text process
  // Links shouldn't be hard, but embeds require extra logic
  // Mentions and Tags would require a new syntax

  record.text = orgTree.children
    .filter((el) => el.type === "paragraph")
    .map((el) => el.children)
    .flat()
    .filter((el) => el.type === "text")
    .map((el) => el.value)
    .join("")
    .trimEnd();

  const sections = orgTree.children.filter((el) => el.type === "section");

  const embedSection = sections.find((el) =>
    el.children
      .find((el) => el.type === "property-drawer")
      ?.children?.find((el) => el.key.toUpperCase() === "TYPE"),
  );

  if (embedSection !== undefined) {
    const embed: Record<string, unknown> = {};

    embed.$type =
      embedSection.children
        .find((el) => el.type === "property-drawer")
        ?.children?.find((el) => el.key.toUpperCase() === "TYPE")?.value ?? "";

    // TODO: handle more embed types
    switch (embed.$type) {
      case "app.bsky.embed.images":
        embed.images = makeImageEmbed(embedSection);
        break;
    }

    record.embed = embed;
  }

  return record;
}

function makeImageEmbed(embedSection: OrgSection): EmbedOrgImage[] {
  // TODO: support standard org mode image linking

  return embedSection.children
    .filter((el) => el.type === "section")
    .map((el) => el.children)
    .map((el) => {
      const img: EmbedOrgImage = { alt: "" };
      const properties = Object.fromEntries(
        el
          .find((el) => el.type === "property-drawer")
          ?.children?.map((el) => [el.key, el.value]) ?? [],
      );

      if (properties["Width"] && properties["Height"]) {
        const aspectRatio = {
          width: parseInt(properties["Width"]),
          height: parseInt(properties["Height"]),
        };

        if (!Object.values(aspectRatio).includes(Number.NaN)) {
          img.aspectRatio = aspectRatio;
        }
      }

      // TODO: switch to file links and cid links

      if (properties["File"]) {
        // NOTE: This not a valid record until the blob is uploaded
        // We're constructing a dummy field just so we can fill in the record
        img.blob = Object.assign(img.blob || {}, {
          name: properties["File"],
        });
      }

      if (properties["MimeType"]) {
        img.blob = Object.assign(img.blob || {}, {
          type: properties["MimeType"],
        });
      }

      // TODO: Use org mode CAPTION syntax

      // TODO: Use ALT Block (BEGIN_CAPTION isn't supported by org mode)

      img.alt = el
        .filter((el) => el.type === "paragraph")
        .map((el) => el.children)
        .flat()
        .filter((el) => el.type === "text")
        .map((el) => el.value)
        .join("")
        .trimEnd();

      return img;
    });
}
