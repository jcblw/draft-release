const path = require("path");
const { Toolkit } = require("actions-toolkit");
const { draftFrom } = require("./src/draft");

Toolkit.run(async tools => {
  const draft = draftFrom(tools);
  const author = process.env.GITHUB_ACTOR;
  const sha = process.env.GITHUB_SHA;
  const repository = process.env.GITHUB_REPOSITORY;
  const workspace = process.env.GITHUB_WORKSPACE;

  const pkg = require(`${workspace}/package.json`);
  const [owner, repo] = repository.split("/");
  const tag = `v${pkg.version}`;
  const binarypath = tools.arguments.binary
    ? path.resolve(workspace, tools.arguments.binary)
    : null;

  let release;
  try {
    release = await draft.release({ tag, owner, repo, sha, author });
  } catch (e) {
    tools.log.fatal(e);
    return tools.exit.failure("Failed to upsert release");
  }

  if (!release.draft) {
    return tools.exit.neutral(`No draft needed for "${tag}"`);
  }

  if (binarypath) {
    try {
      await draft.binary({ release, sha, binarypath });
    } catch (e) {
      tools.log.fatal(e);
      return tools.exit.failure("Failed to upload binary");
    }
  }

  return tools.exit.success(`Draft added for "${tag}"`);
});
