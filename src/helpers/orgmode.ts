import type { OrgData, Section as OrgSection } from "uniorg";
import { parse } from "uniorg-parse/lib/parser";
import type { ComAtprotoRepoCreateRecord } from "@atproto/api";

export async function readOrg(file: Blob): Promise<OrgData> {
  // uniorg-parse doesn't support CRLF or Streams as of now
  const orgStr = (await file.text()).replaceAll("\r\n", "\n");

  return parse(orgStr);
}

export function makeAtprotoRecord(
  orgTree: OrgData,
): ComAtprotoRepoCreateRecord.InputSchema {
  // NOTE: there's a separate function handle blobs
  const baseRecord: ComAtprotoRepoCreateRecord.InputSchema = {
    repo: "",
    collection: "",
    record: {},
  };

  const rootProps = orgTree.children.find(
    (el) => el.type === "property-drawer",
  )?.children;

  baseRecord.collection =
    rootProps?.find((el) => el.key === "Collection")?.value ?? "";

  baseRecord.record.createdAt =
    rootProps?.find((el) => el.key === "CreatedAt")?.value ??
    new Date().toISOString();

  baseRecord.record.text = orgTree.children
    .filter((el) => el.type === "paragraph")
    .map((el) => el.children)
    .flat()
    .filter((el) => el.type === "text")
    .map((el) => el.value)
    .join("")
    .trimEnd();

  const sections = orgTree.children.filter((el) => el.type === "section");

  if (baseRecord.collection === "app.bsky.feed.post") {
    const embedSection = sections.find((el) =>
      el.children
        .find((el) => el.type === "property-drawer")
        ?.children?.find((el) => el.key === "Type"),
    );

    if (embedSection !== undefined) {
      const embed: any = {};

      embed.$type =
        embedSection.children
          .find((el) => el.type === "property-drawer")
          ?.children?.find((el) => el.key === "Type")?.value ?? "";

      // TODO: handle more embed types
      if (embed.$type === "app.bsky.embed.images") {
        embed.images = makeImageEmbed(embedSection);
      }

      baseRecord.record.embed = embed;
    }
  }

  return baseRecord;
}

function makeImageEmbed(embedSection: OrgSection): any[] {
  return embedSection.children
    .filter((el) => el.type === "section")
    .map((el) => el.children)
    .map((el) => {
      const img: any = {};
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

      // TODO: handle existing blobs
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
