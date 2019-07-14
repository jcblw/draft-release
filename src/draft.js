const path = require("path");
const fs = require("fs");
const fileType = require("file-type");
const { promisify } = require("util");

const read = promisify(fs.readFile);

const uploadURL = release => release.upload_url;
const getAsset = (release, name) =>
  release.assets
    ? release.assets.filter(asset => asset.name === name)[0]
    : null;

function draftFrom({ github }) {
  return {
    release: async ({ owner, repo, tag, author }) => {
      const name = `Release ${tag}`;
      const body = `drafted by @${author}`;
      let existing;
      try {
        existing = (await github.repos.listReleases({
          owner,
          repo
        })).data.filter(x => x.tag_name === tag)[0];
      } catch (e) {
        existing = null;
      }
      if (existing) {
        return existing.draft
          ? (await github.repos.updateRelease({
              owner,
              repo,
              release_id: existing.id,
              tag_name: tag,
              draft: true,
              name,
              body: `${body} (edited)`
            })).data
          : existing; // we only update drafts
      }
      return (await github.repos.createRelease({
        owner,
        repo,
        name,
        body,
        draft: true,
        tag_name: tag
      })).data;
    },
    binary: async ({ release, binarypath, sha }) => {
      if (!release.draft) {
        return; // we only update drafts
      }

      const file = await read(binarypath);
      const ext = path.extname(binarypath);
      const base = path.basename(binarypath, ext);
      const { mime } = fileType(file);
      const name = `${base}-${sha}${ext}`;
      const existing = getAsset(name);
      if (existing) return; // asset with sha already exist
      return github.repos.uploadReleaseAsset({
        url: uploadURL(release),
        headers: {
          "content-length": Buffer.byteLength(file),
          "content-type": mime
        },
        name,
        file
      });
    }
  };
}

module.exports = { draftFrom };
