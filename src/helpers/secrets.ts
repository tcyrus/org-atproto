import { password } from "@clack/prompts";

export async function getPassword(
  service: string,
  name: string,
): Promise<string | undefined> {
  let secret: string | undefined;

  if (process.versions.bun) {
    // this code will only run when the file is run with Bun
    secret = await Bun.secrets
      .get({ service, name })
      .then((p) => p || undefined);
  }

  // There is no real equivalent to Bun.secrets in any other runtime

  if (!secret) {
    secret = await password({
      message: "What is your password?",
      mask: "*",
    }).then((p) => (typeof p === "string" ? p : undefined));
  }

  return secret;
}
