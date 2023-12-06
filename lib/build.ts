import { existsSync } from "fs";
import { readdir, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { Extension } from "somod";
import { PATH_BUILD, PATH_FUNCTIONS, PATH_SERVERLESS } from "./constants";
import { readYamlFileStore } from "nodejs-file-utils";

export const build: Extension["build"] = async context => {
  const functionsDir = join(context.dir, PATH_SERVERLESS, PATH_FUNCTIONS);
  if (!existsSync(functionsDir)) {
    // don't do anything if functionsDir does not exist
    return;
  }
  const websocketYamlFiles = (await readdir(functionsDir)).filter(f =>
    f.endsWith(".websocket.yaml")
  );

  const functionsBuildDir = join(
    context.dir,
    PATH_BUILD,
    PATH_SERVERLESS,
    PATH_FUNCTIONS
  );

  await mkdir(functionsBuildDir, { recursive: true });
  for (const websocketYamlFile of websocketYamlFiles) {
    const content = await readYamlFileStore(
      join(functionsDir, websocketYamlFile)
    );
    await writeFile(
      join(
        functionsBuildDir,
        websocketYamlFile.substring(
          0,
          websocketYamlFile.length - ".yaml".length
        ) + ".json"
      ),
      JSON.stringify(content)
    );
  }
};
