import { Crust } from "@crustjs/core";
import { helpPlugin } from "@crustjs/plugins";
import pkg from "../package.json";

import { makeAtpAgent, readOrg, makePost } from "./helpers";
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
    const { service, username, password } = flags;

    const orgUrl = Bun.pathToFileURL(file);

    const orgFile = Bun.file(orgUrl);

    const orgData = await readOrg(orgFile);

    const orgRecord = makeOrgRecord(orgData);

    if (orgRecord === null) return;

    const agent = await makeAtpAgent(username, service, password);

    const atProtoRecord = await makeAtprotoRecord(orgRecord, agent, orgUrl);

    console.dir(atProtoRecord, { depth: null });

    // TODO: add a user check over here
    return;

    const post = await makePost(atProtoRecord, agent);
    console.dir(post, { depth: null });
  });

await cli.execute();
