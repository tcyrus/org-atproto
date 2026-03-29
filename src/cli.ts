import { Crust } from "@crustjs/core";
import { helpPlugin } from "@crustjs/plugins";
import pkg from "../package.json";

import { makeAtprotoRecord, readOrg } from "./helpers/orgmode";
import {
  makeAtpAgent,
  makePost,
  makeValidAtprotoRecord,
} from "./helpers/atproto";

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

    const tmpRecord = makeAtprotoRecord(orgData);

    const agent = await makeAtpAgent(username, service, password);

    const tmp2Record = await makeValidAtprotoRecord(tmpRecord, agent, orgUrl);

    console.dir(tmp2Record, { depth: null });

    // TODO: add a user check over here

    if (false) {
      const post = await makePost(tmp2Record, agent);
      console.dir(post, { depth: null });
    }
  });

await cli.execute();
