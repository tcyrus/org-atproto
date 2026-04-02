import { pathToFileURL } from "node:url";
import { openAsBlob } from "node:fs";

import { Crust } from "@crustjs/core";
import { helpPlugin } from "@crustjs/plugins";
import { confirm } from "@clack/prompts";

import pkg from "../package.json";

import { makeAtpAgent, readOrg, makePost, getPassword } from "./helpers";
import { makeAtprotoRecord } from "./core/atproto";
import { makeOrgRecord } from "./core/uniorg";

const cli = new Crust("org-atproto")
  .meta({ description: pkg.description })
  .use(helpPlugin())
  .args([
    {
      name: "file",
      type: "string",
      description: "Org mode file",
      required: true,
    },
  ])
  .flags({
    username: {
      type: "string",
      short: "u",
      required: true,
    },
    password: {
      type: "string",
      short: "p",
    },
    service: {
      type: "string",
      default: "https://bsky.social",
      short: "s",
    },
  })
  .run(async ({ args, flags }) => {
    const { file } = args;
    const { service, username } = flags;

    const orgUrl = pathToFileURL(file);

    const orgFile = await openAsBlob(orgUrl);

    const orgData = await readOrg(orgFile);

    const orgRecord = makeOrgRecord(orgData);

    console.dir(orgRecord, { depth: null });

    if (orgRecord === null) return;

    const shouldProceed = await confirm({
      message: "Do you want to continue?",
    });

    if (shouldProceed !== true) return;

    let { password } = flags;

    if (!password) {
      password = await getPassword(service, username);
    }

    const agent = await makeAtpAgent(service, username, password);

    const atProtoRecord = await makeAtprotoRecord(orgRecord, agent, orgUrl);

    console.dir(atProtoRecord, { depth: null });

    const shouldPost = await confirm({
      message: "Do you want to create this record?",
    });

    if (shouldPost !== true) return;

    const post = await makePost(atProtoRecord, agent);
    console.dir(post, { depth: null });
  });

await cli.execute();
