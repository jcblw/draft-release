const { Toolkit } = require("actions-toolkit");
const path = require("path");

describe("draft-release", () => {
  let action, tools;

  // Mock Toolkit.run to define `action` so we can call it
  Toolkit.run = jest.fn(actionFn => {
    action = actionFn;
  });
  // Load up our entrypoint file
  require(".");

  beforeEach(() => {
    process.env.GITHUB_WORKSPACE = "";
    tools = new Toolkit();
    tools.exit.success = jest.fn();
    tools.exit.failure = jest.fn();
    tools.exit.neutral = jest.fn();
  });

  it("exits successfully if existing draft exist", async () => {
    process.env.GITHUB_WORKSPACE = path.resolve(
      __dirname,
      "./test/existing-draft"
    );
    await action(tools);
    expect(tools.exit.failure).not.toHaveBeenCalled();
    expect(tools.exit.success).toHaveBeenCalled();
    expect(tools.exit.success).toHaveBeenCalledWith('Draft added for "v1.1.1"');
  });

  it("exits successfully if no draft exist", async () => {
    process.env.GITHUB_WORKSPACE = path.resolve(__dirname, "./test/no-draft");
    await action(tools);

    const tag = "v1.1.2";

    const repository = process.env.GITHUB_REPOSITORY;
    const [owner, repo] = repository.split("/");
    const release = (await tools.github.repos.listReleases({
      owner,
      repo
    })).data.filter(x => x.tag_name === tag)[0];
    // cleanup before assertions
    await tools.github.repos.deleteRelease({
      owner,
      repo,
      release_id: release.id
    });

    expect(release.body).not.toMatch("edited");
    expect(tools.exit.failure).not.toHaveBeenCalled();
    expect(tools.exit.success).toHaveBeenCalled();
    expect(tools.exit.success).toHaveBeenCalledWith(`Draft added for "${tag}"`);
  });

  it("exits nuetral if no draft exist but release does", async () => {
    process.env.GITHUB_WORKSPACE = path.resolve(__dirname, "./test/existing");
    await action(tools);
    expect(tools.exit.failure).not.toHaveBeenCalled();
    expect(tools.exit.success).not.toHaveBeenCalled();
    expect(tools.exit.neutral).toHaveBeenCalled();
    expect(tools.exit.neutral).toHaveBeenCalledWith(
      'No draft needed for "v1.1.0"'
    );
  });

  it("exits successfully if existing draft exist", async () => {
    const tag = "v1.1.1";
    process.env.GITHUB_WORKSPACE = path.resolve(
      __dirname,
      "./test/existing-draft"
    );
    tools.arguments = { binary: "./test.zip" };
    await action(tools);

    const repository = process.env.GITHUB_REPOSITORY;
    const [owner, repo] = repository.split("/");
    const release = (await tools.github.repos.listReleases({
      owner,
      repo
    })).data.filter(x => x.tag_name === tag)[0];
    const assets = (await tools.github.repos.listAssetsForRelease({
      owner,
      repo,
      release_id: release.id
    })).data;
    // cleanup
    await Promise.all(
      assets.map(asset =>
        tools.github.repos.deleteReleaseAsset({
          owner,
          repo,
          asset_id: asset.id
        })
      )
    );
    // cleanup before assertions

    expect(tools.exit.failure).not.toHaveBeenCalled();
    expect(tools.exit.success).toHaveBeenCalled();
    expect(tools.exit.success).toHaveBeenCalledWith('Draft added for "v1.1.1"');
  });
});
