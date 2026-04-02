import type { OrgData, Section, AffiliatedKeywords, ObjectType } from "uniorg";

import type { OrgPost, OrgRecord } from "./types";

export function makeOrgRecord(orgTree: OrgData | Section): OrgRecord | null {
  // NOTE: This doesn't make a valid record because of embed files
  // there's a separate function that handles uploading embed files as blobs

  const rootKeywords = orgTree.children.filter((el) => el.type === "keyword");

  const collection = rootKeywords
    .filter((el) => el.key === "PROPERTY")
    .find((el) => el.value.toUpperCase().startsWith("COLLECTION"))
    ?.value.slice("COLLECTION".length)
    .trim();

  switch (collection) {
    case "app.bsky.feed.post":
      return makeOrgPost(orgTree);
    default:
      return null;
  }
}

export function makeOrgPost(orgTree: OrgData | Section): OrgPost | null {
  const rootKeywords = orgTree.children.filter((el) => el.type === "keyword");

  // TODO: validate and convert to ISO String
  const createdAt = rootKeywords.find((el) => el.key === "DATE")?.value;

  const langs = (rootKeywords.find((el) => el.key === "LANGUAGE")?.value ?? "")
    .split(/\s+/)
    .filter((l) => l);

  const reply = rootKeywords
    .filter((el) => el.key === "PROPERTY")
    .find((el) => el.value.toUpperCase().startsWith("REPLY_TO"))
    ?.value.slice("REPLY_TO".length)
    .trim();

  const embedItems = orgTree.children
    .filter((el) => el.type === "special-block")
    .filter((el) => el.blockType === "EMBED")
    .flatMap((el) => el.children)
    .filter((el) => el.type === "paragraph")
    .filter((el) => el.children.length !== 0);

  const embeds = embedItems
    .map((el) => {
      const { affiliated } = el;

      const ATTR_ATPROTO = getAffiliatedAttrs(affiliated.ATTR_ATPROTO || []);
      const ATTR_HTML = getAffiliatedAttrs(affiliated.ATTR_HTML || []);
      const CAPTION = getAffiliatedCaption(affiliated.CAPTION || []);

      switch (ATTR_ATPROTO.type) {
        case "app.bsky.embed.images":
          return el.children
            .filter((el) => el.type === "link")
            .map((el) => {
              const { width, height } = {
                width: parseInt(ATTR_HTML?.width || ""),
                height: parseInt(ATTR_HTML?.height || ""),
              };

              const base = {
                $type: "app.bsky.embed.images",
                alt: CAPTION,
                mime: ATTR_ATPROTO.mime,
                aspect:
                  isNaN(width) || isNaN(height) ? undefined : { width, height },
              } as const;
              if (el.linkType === "attachment")
                return { path: el.path, type: "file", ...base } as const;
              else if (el.rawLink.startsWith("cid"))
                return {
                  path: el.rawLink.replace(/^cid:\s*/, ""),
                  type: "cid",
                  ...base,
                } as const;
              else return null;
            })
            .filter((el) => el !== null);
        case "app.bsky.embed.record":
          return el.children
            .filter((el) => el.type === "link")
            .map(
              (el) =>
                ({
                  $type: "app.bsky.embed.record",
                  record: el.rawLink,
                }) as const,
            );
        default:
          return null;
      }
    })
    .filter((el) => el !== null)
    .flat();

  const textEls = orgTree.children
    .filter((el) => el.type === "paragraph")
    .flatMap((el, i, arr) => {
      const tmp = el.children;
      const prevEnd = arr[i - 1]?.contentsEnd;
      if (prevEnd) {
        // NOTE: this may not work depending on how uniorg posts work
        tmp.unshift({
          type: "text",
          value: "\n".repeat(el.contentsBegin + 1 - prevEnd),
        });
      }
      return tmp;
    });

  const { text, facets } = getText(textEls);

  return {
    $type: "app.bsky.feed.post",
    text: text.trimEnd(),
    reply,
    facets,
    embeds,
    langs,
    createdAt,
  };
}

function getText(textEls: ObjectType[]): {
  text: string;
  facets: NonNullable<OrgPost["facets"]>;
} {
  return textEls.reduce(
    ({ text, facets }, el) => {
      if (el.type === "text") {
        return { text: text + el.value, facets };
      } else if (el.type === "link") {
        const _facet = {
          value: el.rawLink,
          byteStart: text.length,
        } as const;

        // Facets can not overlap
        const _text = el.children.length
          ? getText(el.children).text
          : el.rawLink;

        facets.push({
          ..._facet,
          byteEnd: _facet.byteStart + _text.length,
        });

        return { text: text + _text, facets };
      } else {
        return { text, facets };
      }
    },
    { text: "", facets: [] as any[] },
  );
}

function getAffiliatedCaption(attr: AffiliatedKeywords[string]): string {
  // TODO: figure out if text is the only type of attribute for CAPTION
  return (Array.isArray(attr) ? attr : [attr])
    .flat(2)
    .filter((el) => typeof el === "string" || el.type === "text")
    .map((el) => (typeof el === "string" ? el : el.value))
    .join("")
    .trimEnd();
}

// https://github.com/rasendubi/uniorg/blob/fc4e3b1105f052709c14f86d9e08d32cb17409a5/packages/uniorg-rehype/src/org-to-hast.ts#L610-L629
function getAffiliatedAttrs(
  attr: AffiliatedKeywords[string],
): Record<string, string> {
  const attrList = [attr]
    .flat()
    .filter((s) => typeof s === "string")
    .flatMap((s) =>
      s
        .split(/(?:[ \t]+|^):(?<x>[-a-zA-Z0-9_]+(?=[ \t]|$))/u)
        // first element is before the first key
        .slice(1),
    );

  /*
  const attrs: Record<string, string> = {};
  for (let i = 1; i < attr_list.length; i += 2) {
    const [key, value] = [ attr_list[i - 1]!, attr_list[i]! ];
    attrs[key] = value.trim();
  }

  return attrs;
  */

  const _attrs = function* <T>(list: T[]) {
    for (let i = 1; i < list.length; i += 2) {
      yield [list[i - 1]!, list[i]!] as const;
    }
  };

  return Object.fromEntries(
    _attrs(attrList).map(([key, value]) => [key, value.trim()]),
  );
}
