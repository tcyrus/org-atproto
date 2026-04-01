import type { OrgData } from "uniorg";
import { parse } from "uniorg-parse/lib/parser";

// NOTE: BunFile extends Blob
export async function readOrg(file: Blob): Promise<OrgData> {
  // uniorg-parse doesn't support CRLF line endings
  // See https://github.com/rasendubi/uniorg/issues/141
  const orgStr = (await file.text()).replaceAll("\r\n", "\n");

  return parse(orgStr);
}

// # -*- org-export-date-timestamp-format: 2 -*-
