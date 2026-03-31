# `org-atproto`

A hacky tool to create atproto records via org mode.

This was made to get around an issue with uploading images using the Bluesky App.

The schema is inspired by [org-social](https://github.com/tanrax/org-social).

## Notes

This uses ([`uniorg-parse`](https://github.com/rasendubi/uniorg/tree/main/packages/uniorg-parse)) to parse org files, so some things might not work as well as it does in Emacs.

The example post is in `sample`

## Development

```sh
# Run in dev mode
bun run dev

# Type-check
bun run check:types

# Build distribution output
bun run build
```

## Usage

```sh
# Run the CLI
org-atproto "post.org" -u "bsky.app" -p "password"
```
