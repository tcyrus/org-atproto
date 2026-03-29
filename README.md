# org-atproto

A hacky tool to create ATProto records via org mode.

This was made to get around an issue with uploading images using the Bluesky App.

I don't fully understand org mode, so there might be a better way to structure the document.

The schema is inspired by [org-social](https://github.com/tanrax/org-social).

## Notes

The type strictness for some parts of this project needs improvement. I wanted to get something working quickly instead of trying to wrangle with the types from the AT Proto SDK.

The project currently uses some bun-specific APIs. These are done for performance reasons and are written in such a way that they can be replaced if necessary.

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
